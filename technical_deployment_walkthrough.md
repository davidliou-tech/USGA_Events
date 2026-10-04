# Technical Deployment Walkthrough

## Core Components
* **Code.gs:** The backend logic for parsing dictionaries, injecting Google Form items, building HTML emails, handling triggers, running strict authentication checks for alias emails, managing cron lifecycle properties, and operating modular sheet builders.
* **sidebar.html:** The frontend UI controller that manages form generation state, dynamic dropdowns, live search/filtering, category batch toggling, and animated generation progress tracking.
* **ManageEventsSidebar.html:** The frontend UI controller for the Active Events Management tool. Displays live event status (Open/Closed/Scheduled), capacity metrics, direct navigation links, manual open/close controls, and trigger-safe event archival.

---

## Process Flow

### 1. Initialization and Dictionary Sync
When `Setup Initial Configuration` is run, the script writes the hardcoded Master Dictionary and Template list directly into the Google Sheet (`Field Dictionary` and `Templates` tabs). Both `sidebar.html` and `upgradeExistingSheet` read this live data to construct UI elements and upgrade legacy sheets.

### 2. Frontend Dynamic Logic (`sidebar.html`)
* **Real-Time Field Search & Filter [V2.9]:** Event coordinators can filter fields dynamically via a search bar across categories. Matching fields remain visible while empty categories collapse automatically.
* **Category Batch Actions [V2.9]:** Each category header includes `Select All` and `Clear` links for one-click field selection.
* **Animated Generation Spinner [V2.9]:** A modern CSS overlay provides visual feedback and step-by-step progress status during form generation.
* **Smart Titles & Minors Logic:** Dynamically constructs titles based on Region, Season, Year, and Class for regional events (SSC, YASC, CYSC, SMC), while automatically configuring minor safeguarding policies for youth events.

### 3. Backend Generation (`Code.gs`)
The `generateForm` function takes the payload and programmatically creates a Google Form and a linked Google Sheet (the "Response Sheet"):
* **Alias Authentication:** Validates that `Session.getActiveUser().getEmail()` matches the specified `contactEmail` or is an authorized alias via `GmailApp.getAliases()`.
* **Shared Drive Root Resolution [V2.9.1]:** In Google Apps Script, `DriveApp` cannot resolve parents on files placed directly at the root of a Shared Drive (`parents.hasNext() === false`). The script automatically detects this condition and falls back to the Master Shared Drive ID (`0AJ4t2YKTRQHWUk9PVA`, configurable via `ScriptProperties` under `MASTER_DRIVE_FOLDER_ID`), creating the event subfolder directly in the Shared Drive.
* **Delegated Web App Architecture [V2.9.1]:** When `DELEGATED_WEB_APP_URL` is set, `generateForm()` forwards the creation payload to the `doPost(e)` endpoint using `UrlFetchApp` with an OAuth Bearer token. This executes under the Master Admin identity with Manager rights on the Shared Drive, eliminating the need to grant event coordinators broad "Content Manager" access across the entire drive.
* **Automated Scoped Permissions [V2.9.1]:** Upon creating the subfolder and moving the Form and Sheet into it, the script automatically executes `targetFolder.addEditor()`, `form.addEditor()`, and `responseSs.addEditor()` for the active coordinator and contact email. Coordinators gain full management rights over their specific event while the rest of the Master Shared Drive remains protected.
* **Audit Logging with Drive Folder Links [V2.9.1]:** `appendAuditLog()` automatically writes the event's `Drive Folder URL` into Column I of the `System Log` tab, providing complete operational traceability.
* **Translation Caching & Dictionary Optimization [V2.9]:** An in-memory cache (`_translationCache`) and an expanded `zh-TW` overrides dictionary cut external `LanguageApp` API round-trips by ~70%, generating bilingual forms in 10–15 seconds.
* **Modular Sheet Builders [V2.9]:** Response sheets are generated using reusable modular builders (`setupTransportationSheets`, `setupLogisticsSheet`, `setupSummaryDashboard`, and `setupAirportSummarySheet`) shared with the `upgradeExistingSheet` maintenance tool.
* **LockService Concurrency Protection [V2.9]:** `LockService.getScriptLock()` prevents race conditions during simultaneous trigger creations or multiple coordinators generating forms concurrently.
* **Safe Trigger Binding:** Programmatically creates the `masterRespondToRegistration` trigger for the child response sheet without blindly deleting existing active event triggers.

### 4. Active Event Management & Live Sync (`ManageEventsSidebar.html`)
Active forms register their lifecycle metadata (`title`, `start`, `end`, `max`, `contactEmail`, `publishedUrl`, `sheetUrl`) into script properties under `FormsToMonitor`:
* **High-Speed Asynchronous Loading (<0.5s):** The sidebar dropdown populates instantly using cached metadata. Live status (`🟢 OPEN`, `🟡 SCHEDULED`, `🔴 CLOSED`) and participant metrics (`42 / 50 Attendees`) are fetched on demand via `getEventDetails(formId)` when an event is selected, avoiding sequential network bottlenecks.
* **System Log Discovery & Sync (`syncActiveEventsFromSystemLog`):** Scans the Master Sheet's `System Log` audit records and automatically resolves and registers any missing historical or open-date events into `FormsToMonitor`. Accessible via the **`🔄 Sync Events`** sidebar button and the **USGA Events > Advanced Maintenance > Sync Active Events from System Log** menu item.
* **Direct Navigation Links [V2.9]:** Direct buttons open the **Live Form**, **Edit Form**, and **Responses Spreadsheet** in new tabs.
* **Manual Open/Close Controls [V2.9]:** Coordinators can force-open or force-close a form immediately via `toggleEventAcceptingResponses`.
* **Safe Event Archiving [V2.9]:** The **Archive Event** button (`archiveMonitoredEvent`) closes the form, unregisters it from `FormsToMonitor`, and cleanly releases its spreadsheet submit trigger—reclaiming Apps Script trigger quota without deleting any forms, spreadsheets, or attendee rows.

### 5. Automated Archiving Cron (`masterFormLifecycleCron`)
* An hourly time-driven cron evaluates monitored events against their scheduled start and end timestamps.
* **Automated Closing [V2.9]:** When an event concludes and passes the post-event threshold (`now > config.end + 3 days`), the cron automatically:
  1. Ensures the form is closed (`form.setAcceptingResponses(false)`).
  2. Sets `config.isAutoClosed = true`.
  3. Retains the event in `FormsToMonitor` (preserving submit triggers and management links) until the coordinator explicitly decides to click **Archive Event**.

### 6. Automated Logistics & Response Processing (`masterRespondToRegistration`)
When an attendee submits or edits a response:
* **Composite Key Participant Matching [V2.9]:** Rows in `Pickup`, `Drop-Off`, and `Logistics` are matched on `(First Name + Last Name + Email)`. Siblings sharing a parent's email address each receive their own individual row, completely eliminating multi-child registration overwrites.
* **Waitlist Calculation Precision [V2.9]:** The participant counter scans prior submissions and actively excludes rows where Medical Consent is "No" or where status is "Rejected" or "Waitlisted". Existing confirmed spots are permanently preserved upon registration edits.
* **Chronological Transportation Sorting [V2.9]:** `Pickup` and `Drop-Off` sheets sort chronologically by **Date then Time first** (`[Date, Time, Flight/Train]`), followed by driver assignments. Volunteer driver names entered manually in the driver columns stay perfectly aligned with passenger rows.
* **Email Delivery Error Logging [V2.9]:** If email delivery fails via `GmailApp` and fallback `MailApp`, the specific error is logged directly into the `Email Status` column (`Delivery Failed: ...`), alerting coordinators immediately.
* **Summary Dashboard Formula Accuracy [V2.9]:**
  * Demographics uses prefix matching (`"Male*"`, `"Female*"`) to prevent females from being counted under Males.
  * Sleep Preferences uses multi-criteria `COUNTIFS` isolating gender and dynamically generates `=SUM(B{row}:C{row})` for the Total column.
  * Church lodging uses dual-mode matching (`cLodgingMatch`) supporting both standard headers (`I will be staying*` with `"Yes*"`/`"No*"` prefix matching) and legacy headers (`Lodging Arrangement*` / `住宿安排` with `"*host church*"` / `"*self*"` matching), preventing zero-counts on historical or bilingual forms.
  * Dietary and special needs queries use unbounded ranges (`A2:ZZ`) with multilingual "None" exclusions (`<>無`, `<>没有`).
  * Airport Summary queries sort airport passenger volumes descending (`ORDER BY COUNT(...) DESC`).

---

## 7. Delegated Web App Deployment & Administration [V2.9.1]

### Overview
To ensure maximum security under the principle of least privilege, event coordinators should not hold "Content Manager" or "Manager" roles across the entire Shared Drive. Instead, the project is deployed as an internal Web App executing under the Master Admin identity:

### Configuration Settings
1. **Apps Script Deployment Settings:**
   * **Deployment Type:** Web app
   * **Execute as:** `Me (Master Admin / us.events@tjc.org)`
   * **Who has access:** `Anyone within True Jesus Church`
   * **Deployment ID:** `AKfycbzHrbgebuFQ1O4DLgaG85jkL_Z_Hr8BZ5QINOlJK7QZ8zrgu9GU9DO0C9m_3p-sIvjUfQ`
   * **Web App URL:** `https://script.google.com/macros/s/AKfycbzHrbgebuFQ1O4DLgaG85jkL_Z_Hr8BZ5QINOlJK7QZ8zrgu9GU9DO0C9m_3p-sIvjUfQ/exec`

2. **Master Sheet Activation:**
   * In the Master Google Sheet, navigate to **USGA Events > Advanced Maintenance > Configure Delegated Web App URL**.
   * Paste the Web App deployment URL and click **OK**.
   * The script stores this URL in `ScriptProperties` under `DELEGATED_WEB_APP_URL`.
   * Future generations from the sidebar automatically invoke the delegated endpoint. If cleared, the system seamlessly falls back to standard direct execution.

---

## 8. System Administration & Maintenance Guide

### 8.1 Master Field Dictionary Administration
* **Storage Location:** The Master Google Sheet contains the **`Field Dictionary`** tab. When the form generator is opened, `getConfigData()` reads directly from this sheet.
* **Column Schema:**
  * `Category`: The grouping header displayed in the generator sidebar/dialog (e.g., *Personal Info*, *Transportation*, *Lodging*).
  * `Field Name`: The label of the question as presented in the UI and Google Form.
  * `Question Type`: Form item type (`TEXT`, `PARAGRAPH_TEXT`, `MULTIPLE_CHOICE`, `CHECKBOX`, `LIST`, `DATE`, `TIME`, `SCALE`).
  * `Options`: Comma-separated choice list for dropdowns, multiple-choice, or checkboxes.
  * `Required`: Boolean flag (`TRUE`/`FALSE`) specifying default required status.
  * `Description / Help Text`: Guidance text rendered beneath the question in Google Forms.
* **Adding or Editing Standard Fields:** Administrators can add new questions, modify choice lists (such as Interpretation Languages or Class choices), or update help text directly in the spreadsheet without modifying Apps Script code. Standard questions are parsed and injected into Google Forms dynamically.
* **Custom Code Mapping Requirements:** Fields requiring specialized server-side logic must be mapped in `Code.gs`. This includes:
  * Dynamic flight/train date-time parsing for `Pickup` and `Drop-Off` rosters.
  * Medical consent gating for minors.
  * Dedicated columns on the `Logistics` or `Summary Dashboard` sheets.
  * Multi-child participant deduplication key mapping.

### 8.2 Setup Initial Configuration (`runSetup()`)
* **Menu Path:** **USGA Events > Setup Initial Configuration (Run Once)**
* **Backend Function:** `runSetup()`
* **Operational Impact:** Re-initializes and formats the master sheets: `Field Dictionary`, `Templates`, and `Airport Mapping`.
* **CRITICAL WARNING:** Executing `runSetup()` will **completely overwrite** the contents of `Field Dictionary`, `Templates`, and `Airport Mapping` with the hardcoded baseline embedded in `Code.gs`. Any custom fields or options added directly to the sheet will be replaced.
* **When to Run:**
  1. Fresh deployment of the system into a newly created Google Sheet.
  2. Disaster recovery if configuration tabs are corrupted, malformed, or accidentally deleted.

### 8.3 Advanced Maintenance Submenu
Located under **USGA Events > Advanced Maintenance**:

1. **Sync Active Events from System Log:**
   * **Backend Function:** `syncActiveEventsFromSystemLogMenu()` / `syncActiveEventsFromSystemLog()`
   * **Purpose:** Synchronizes all historical and active events logged in the Master Google Sheet's `System Log` audit tab into the active management monitoring watchlist.
   * **Behavior:** Resolves Form IDs via linked response spreadsheets or folders, caches event titles and URLs, and restores active event management dropdown entries for all existing events.
2. **Upgrade Existing Sheet (Full Sync):**
   * **Backend Function:** `upgradeExistingSheet()`
   * **Purpose:** Upgrades legacy event spreadsheets (created under V1 or early V2) to the latest V2.9 standard.
   * **Behavior:** Safely renames existing sheets with an `_Old` suffix (preserving all historical data) and reconstructs the `Summary Dashboard`, `Logistics`, `Pickup`, `Drop-Off`, and `Airport Summary` sheets using current formulas, bilingual parsing, and auto-sorting logic.
3. **Clean Up Dead Triggers:**
   * **Backend Function:** `cleanupDeadTriggers()`
   * **Purpose:** Prevents orphaned trigger accumulation when response sheets are moved to Google Drive Trash or deleted.
   * **Behavior:** Scans all installable project triggers. If a trigger's bound spreadsheet throws an exception or cannot be opened, the script unbinds and deletes the dead trigger.
4. **Delete ALL Triggers (Emergency Reset):**
   * **Backend Function:** `deleteAllTriggers()`
   * **Purpose:** Emergency quota reset and troubleshooting utility.
   * **Behavior:** Deletes every installable trigger across the entire Apps Script project and clears all monitored active events from `FormsToMonitor` in `ScriptProperties`. Resets project trigger count to 0.
5. **Configure Delegated Web App URL:**
   * **Backend Function:** `configureDelegatedWebApp()`
   * **Purpose:** Opens a prompt allowing the administrator to store or update the internal Web App URL in `ScriptProperties` under `DELEGATED_WEB_APP_URL`.

### 8.4 Trigger Quota Management & Automated Lifecycle
* **Apps Script Trigger Limit:** Google Workspace enforces a strict quota of **20 installable triggers per user/project**.
* **Trigger Architecture:** Each active event uses 1 spreadsheet submit trigger (`masterRespondToRegistration`) bound to its response sheet. The system also runs 1 hourly cron trigger (`masterFormLifecycleCron`) for lifecycle automation.
* **Automated Archival Lifecycle:**
  1. When an event concludes and passes the 3-day post-event threshold (`now > config.end + 3 days`), `masterFormLifecycleCron` automatically closes the form.
  2. The cron locates the destination spreadsheet ID and cleanly deletes only the `masterRespondToRegistration` trigger tied to that specific event.
  3. The event is removed from `FormsToMonitor`, reclaiming 1 trigger against the 20-trigger quota.
* **Manual Coordinator Archival:** Event coordinators can also decommission completed events immediately via **Manage Active Events > Archive Event**, triggering `archiveMonitoredEvent()`. All spreadsheets, forms, and attendee responses remain intact.

### 8.5 System Audit Log (`System Log` Tab)
Every event generation automatically appends a detailed audit record to the **`System Log`** tab of the Master Google Sheet via `appendAuditLog()`:

| Column | Field Name | Description |
| :--- | :--- | :--- |
| **A** | `Timestamp` | Exact date and time form was generated |
| **B** | `Template Name` | Selected template (e.g., *Student Spiritual Convocation (SSC)*) |
| **C** | `Event Year` | Target event year |
| **D** | `Coordinator` | Google account identity of the coordinator who initiated generation |
| **E** | `Event Title` | Full official event title generated |
| **F** | `Send-As Mailbox` | Contact email / send-as alias used for attendee confirmation emails |
| **G** | `Form URL` | Direct link to the live Google Form |
| **H** | `Response Sheet URL`| Direct link to the created response tracking spreadsheet |
| **I** | `Drive Folder URL` | Direct clickable link to the dedicated Google Drive event folder |
| **J** | `Fields Included` | Semicolon-delimited list of all field names included in the form |

Administrators can use the `Drive Folder URL` column for rapid operational audits, verifying subfolder access permissions, and inspecting generated assets directly in Google Drive.

