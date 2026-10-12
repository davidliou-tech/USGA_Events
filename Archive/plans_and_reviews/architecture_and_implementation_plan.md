# Architecture And Implementation Plan

## Goal
To build a scalable, automated Google Forms generation system for the True Jesus Church USGA that standardizes event registrations across all templates, while providing fully dynamic UI logic, customized email auto-responders, and automated logistics tracking.

## Phase 1: Core Framework (Completed)
* **Master Dictionary:** Centralized all historical event fields into a unified schema stored directly in Google Sheets for easy non-technical editing.
* **Generator UI:** Built `sidebar.html` to allow event coordinators to select templates, toggle fields, and trigger backend generation.
* **Auto-Responder:** Built a custom HTML email auto-responder that dynamically constructs submission tables and handles automated rejection routing based on medical consent.

## Phase 2: Dynamic Logistics & Formatting (Completed)
* **Consolidation:** Merged redundant regional templates into Master templates (e.g. Master YASC, Master CYSC).
* **Frontend Logic:** Moved complex string assembly (Title generation using Region, Season, Year, Class) to `sidebar.html` so it can be previewed live.
* **Smart Filtering:** Built array-filtering logic into `Code.gs` so the Google Form actively drops unselected SSC classes or handles specific dropdown limitations (like Interpretation languages) to prevent user error.
* **Mothership Triggers:** Centralized all generated spreadsheets to ping a single Master `Code.gs` file using `ScriptApp.newTrigger`.

## Phase 3: Logistics Automation (Completed)
* **Transportation Sync:** Built safe onSubmit logic that extracts flight data and securely appends participants to Pickup and Drop-Off sheets.
* **Auto-Sorting:** Programmed background static sorting to ensure manually entered volunteer Driver names perfectly track with shifting passenger rows.
* **Native Edit integration:** Programmed backend retrieval of the native `getEditResponseUrl()` through backward iteration, embedding a highly visible "Edit Your Registration" button inside the custom HTML emails.

## Phase 4: V2 Enhancements (Completed)
* **Alias Authentication Security:** Implemented strict server-side validation during form generation to ensure the active user has permissions for the specified `contactEmail` alias, guaranteeing proper trigger ownership and routing.
* **Automated Minors Workflow:** Introduced the "Includes Minors" UI toggle and conditional logic to dynamically inject minor disclaimers and the Minor's Email (at least 13 years of age) field early in the form, satisfying new legal requirements.
* **Data Catalog Automation:** Introduced Python-based generation of the core documentation artifacts, syncing them natively with the live `Code.gs` data structures to ensure the docs are never out-of-date.
* **Title Generator & Dynamic Attributes:**
  * **Sidebar Naming Engine:** The sidebar now intercepts event titles for regional events (SSC, YASC, CYSC, SMC), appending selections for Region, Season, Year, and Class (e.g., "SWR Summer 2026 E2/J1 SSC Registration").
  * **Dynamic Options Filtering:** The *Class to attend* field options (E2, J1, J2) are dynamically filtered at generation time based on what the coordinator selects in the sidebar.
  * **Auto-Eligibility Injection:** Selecting the NCC template automatically toggles on and pre-fills the Eligibility disclaimer ("This is not an open conference...").
* **Airport Summary Backend:** The system now automatically generates an Airport Summary tab if travel details are collected, using Google Sheets `QUERY` formulas to instantly aggregate arrivals and departures by airport code.

## Phase 5: V2.7 Enhancements (Completed)
* **Active Event Management:** Created `ManageEventsSidebar.html` as a dedicated frontend interface for mutating event lifecycle properties on the fly. Event coordinators can seamlessly adjust open/close registration dates, modify maximum attendee thresholds (waitlist triggers), and update the contact alias without directly interacting with backend properties or scripts.
* **Date Simplification:** Refactored event dates to rely strictly on standard `YYYY-MM-DD` inputs, abandoning complex time extraction since precise hour/minute tracking is primarily necessary only for registration bounds, simplifying UX for event creation.
* **CYSC Policy Standardization:** Refined the College Youth Spiritual Convocation (CYSC) template to align with modern youth minor policies, embedding minor-specific tracking options natively while stripping legacy adult-only limitations.

## Phase 6: V2.8 Enhancements (Completed)
* **Dual UI Form Generator:** Added wide modeless dialog option (`500x750px`) alongside expanded sidebar (`350px`) for streamlined form configuration.
* **Minor Event Safeguarding & Enforcement:** Enforced strict placement of `Age` and `Parent/Guardian` in `Personal & Contact Info`, integer validation (1-99) for age, explicit N/A guidance, and exclusion of minor emails from receiving automated receipts.
* **End-to-End Train/Bus Logistics:** Fully wired Train/Bus page navigation branching in Google Forms, expanded `Pickup` and `Drop-Off` sheets with Train/Bus columns, dynamic status column indexing, and automated sync on submission and edit.
* **Automated Settings & Closed Messages Sync:** Dynamic synchronization of updated contact emails to response sheet `Settings` tabs, and dynamic retrieval and assignment of custom closed form messages from `Closed Form Messages`.
* **Trigger & Quota Hardening:** Targeted trigger deduplication, cron protection during auto-archival, and complete cleanup of monitored properties upon full trigger resets.

## Phase 7: V2.9 Enhancements (Completed)
* **Composite Key Participant Matching:** Refactored participant row matching in `Pickup`, `Drop-Off`, and `Logistics` to use `(First Name + Last Name + Email)`. Resolves the critical multi-child registration bug where registering multiple siblings under a single parent email previously overwrote prior sibling rows.
* **Waitlist Precision & Confirmed Spot Protection:** Refactored waitlist calculation logic in `masterRespondToRegistration` to dynamically exclude rejected medical release rows ("No") and previously waitlisted registrants. Confirmed spots are permanently preserved upon registration edits.
* **Automated Email Delivery Logging:** Added fallback delivery error logging directly into the response sheet `Email Status` column (`Delivery Failed: ...`), alerting coordinators immediately if `GmailApp` or `MailApp` fails.
* **Active Event Management Power-Ups (`ManageEventsSidebar.html`):**
  * Added live status badges (🟢 **OPEN**, 🟡 **SCHEDULED**, 🔴 **CLOSED**).
  * Added live capacity counter displaying total attendees, capacity limit, and spots remaining.
  * Added direct one-click navigation links to the **Live Form**, **Edit Form**, and **Responses Spreadsheet**.
  * Added manual **Open Now / Force Close** button (`toggleEventAcceptingResponses`).
  * Added **Archive Event** button (`archiveMonitoredEvent`) to safely close forms and release background submit triggers without deleting registration data.
* **Form Generator Productivity (`Sidebar.html`):**
  * Added real-time field search/filter bar to filter fields dynamically across categories.
  * Added category-level **Select All** and **Clear** toggle buttons.
  * Added animated multi-ring CSS spinner and progress updates during generation.
  * Cleaned up unused `f_image` header file input.
* **Backend Architecture & Sheet Consolidation:**
  * Consolidated duplicate sheet generation logic between `generateForm` and `upgradeExistingSheet` into modular builders (`setupTransportationSheets`, `setupLogisticsSheet`, `setupSummaryDashboard`, `setupAirportSummarySheet`).
  * Implemented execution cache `_translationCache` and expanded `zh-TW` overrides dictionary, accelerating bilingual form creation by ~70%.
  * Reordered transportation sorting to prioritize **Date then Time first** (`[Date, Time, Flight/Train]`), followed by driver grouping.
  * Wrapped all critical trigger, generation, toggle, and cron operations in `LockService` concurrency locks.
  * Automated 3-day post-event archiving inside `masterFormLifecycleCron`, cleanly decommissioning submit triggers and freeing Apps Script quota.
* **Summary Dashboard Formula & Multilingual Refinements:**
  * Resolved the Male/Female overlap bug by switching Demographics to prefix matching (`"Male*"`, `"Female*"`), ensuring complete accuracy across monolingual and bilingual submissions.
  * Converted Sleep Preferences to multi-criteria `COUNTIFS` isolating gender (`"Male*"`, `"Female*"`), fixed `"Late sleeper"` matching, and dynamically generated row sums `=SUM(B:C)`.
  * Fixed bilingual church lodging counting by switching from exact `"Yes"` to prefix wildcard `"Yes*"`.
  * Updated Dietary & Medical to an unbounded open range `A2:ZZ` with multilingual "None" exclusions (`<>無`, `<>没有`).
  * Enhanced Airport Summary with descending count sorting (`ORDER BY COUNT(...) DESC`) and cohesive blue headers.

## Phase 8: V2.9.1 Shared Drive Root & Delegated Security Provisioning (Completed)
* **Shared Drive Root Resolution:** Resolved the platform limitation in Google Apps Script `DriveApp` where files situated at the root of a Shared Drive return `parents.hasNext() === false`. Added automatic detection and fallback to the Master Shared Drive ID (`0AJ4t2YKTRQHWUk9PVA`), ensuring subfolders are always created directly in the Shared Drive rather than defaulting to the coordinator's personal My Drive.
* **Delegated Web App Architecture (`doPost`):** Introduced delegated provisioning where `generateForm` forwards the creation payload to an internal Web App endpoint running with Master Admin privileges (`Execute as: Me`). Eliminates the requirement to grant regional event coordinators broad "Content Manager" or "Manager" access across the entire Shared Drive.
* **Automated Scoped Permissions:** The backend automatically grants `targetFolder.addEditor()`, `form.addEditor()`, and `responseSs.addEditor()` to both the active coordinator's email and the event contact alias, providing full event management rights strictly bounded to the event subfolder under the principle of least privilege.
* **Direct Drive Folder Navigation:** Updated `Sidebar.html` and `generateForm()` to return the created Google Drive folder URL (`folderUrl`), presenting a direct `📁 View Event Drive Folder` link in the success modal.
* **Audit Trail Enhancement:** Enhanced `appendAuditLog` to automatically inject and populate a `Drive Folder URL` column in the `System Log` tab of the Master Google Sheet.
* **1-Click Maintenance Configuration:** Added **Configure Delegated Web App URL** to the **USGA Events > Advanced Maintenance** menu for seamless activation and management of the deployment URL.

## Phase 9: Ongoing Maintenance
The architecture is fully modular. To add new fields, simply add them to the `Field Dictionary` tab in the Master Google Sheet.
To update the core code, modifying the Master `Code.gs` instantly upgrades all historical and future event spreadsheets due to the "Mothership" trigger architecture.

