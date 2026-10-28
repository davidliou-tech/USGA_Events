# USGA Event Registration Form Generator - Comprehensive Release Notes

This document provides a complete, unified historical record of all versions, feature additions, architecture enhancements, and bug fixes for the **USGA Event Registration Form Generator** suite (`Code.gs`, `Sidebar.html`, `ManageEventsSidebar.html`, and related templates/dictionaries).

---

## Table of Contents
- [Version 2.10.0 (Current) - System Log Linked Event Resolver & Zero-Copy Maintenance Workflows](#version-2100)
- [Version 2.9.9 - Printable Check-In Sheet, Registration Change Log & Automatic Room Release](#version-299)
- [Version 2.9.8 - Summary Dashboard Resilience, Dynamic Ingestion & Multilingual Formula Hardening](#version-298)
- [Version 2.9.7 - Confirmation Email Title Deduplication Fix](#version-297)
- [Version 2.9.6 - Runtime Blocker Fixes, Operational Integrity & Performance Optimization](#version-296)
- [Version 2.9.5 - Dual-Sheet Transportation & Multi-Driver Sync Engine](#version-295)
- [Version 2.9.4 - Dedicated Lodging Sheet, Room Inventory & Host Church Room Import](#version-294)
- [Version 2.9.3 - Host Church Logistics, Lodging Standardization & International Phone Fix](#version-293)
- [Version 2.9.2 - Maintenance & Lifecycle Optimization](#version-292)
- [Version 2.9.1 - Active Events Performance & System Log Auto-Sync](#version-291)
- [Version 2.9.0 - Multi-Child Composite Key Fix & Translation Engine Optimization](#version-290)
- [Version 2.8.0 - Dual Window UI, Settings Tabs & End-to-End Transit Logistics](#version-280)
- [Version 2.7.0 - Active Events Management Sidebar & Date Normalization](#version-270)
- [Version 2.6.0 - Native Train & Bus Support, NCC Text Automation](#version-260)
- [Version 2.5.0 - Legacy Spreadsheet Upgrade & Migration Tool](#version-250)
- [Version 2.4.0 - Registration Windows, Waitlist Capacity & Description Auditing](#version-240)
- [Version 2.3.0 - In-Place Transportation Sync & Cancellation Tracking](#version-230)
- [Version 2.2.0 - Email Routing Disambiguation & Template Reorganization](#version-220)
- [Version 2.1.0 - Minor Compliance, Parental Consent & Sender Verification](#version-210)
- [Version 2.0.0 - Full V2 System Architecture Ground-Up Rewrite](#version-200)

---

<a name="version-2100"></a>
## Version 2.10.0
*October 2026*

### System Log Linked Event Resolver & Zero-Copy Maintenance Workflows
- **Centralized Hybrid Event Resolver (`resolveTargetEventSpreadsheet`)**:
  - Replaces tedious manual copying and pasting of spreadsheet URLs across all menu maintenance tools and transportation scripts with an intelligent, multi-tier resolver.
  - **Context-Aware Active Row Detection**:
    - When viewing the **`System Log`** tab (e.g. reviewing active events on rows 2–6), the script automatically inspects the currently highlighted cell/row (`selectedRow >= 2`).
    - Detects the event's title, template, coordinator, and `Response Sheet URL` (Column H) from that row and displays a fast confirmation prompt:
      > *Target Event Detected (System Log Row 4):*  
      > *• Event: West Region Winter 2026 College Youth Spiritual Convocation (CYSC)*  
      > *• Template: College Youth Spiritual Convocation (CYSC)*  
      > *• Coordinator: west.cysc@tjc.org*  
      > *Proceed with "[Action Name]" on this event's response sheet?*  
      > **[YES]** &nbsp;&nbsp; **[NO]** &nbsp;&nbsp; **[CANCEL]**
    - Clicking **YES** immediately opens and executes the script on that spreadsheet (1-click action, zero copying).
  - **Smart Chip & Rich Link Extraction Engine (`fetchSmartChipUrlsFromSheetsApi` & `resolveUrlFromRowData`)**:
    - Addressed a core Google Sheets Apps Script platform limitation where modern Google Drive Smart Chips (e.g., green file pills in Column H) return `null` from `getRichTextValue().getLinkUrl()` and only display text from `getValue()`, which previously caused the resolver to fall back to a manual URL prompt.
    - Implemented a resilient 4-tier resolution engine:
      1. **Sheets REST API via `UrlFetchApp` (`chipRuns.richLinkProperties.uri`)**: Directly parses the underlying URI from the cell's `chipRuns` metadata in a single fast batch call across Column H.
      2. **Drive File Search (`DriveApp.getFilesByName`)**: Searches Google Drive for spreadsheet files matching the Smart Chip's label text.
      3. **Folder Inspection (Column I)**: Inspects the registration folder in Column I (supporting both raw folder URLs and Drive folder chips) and locates the response workbook inside it.
      4. **Properties Service Cache (`FormsToMonitor`)**: Cross-references cached event titles and templates to retrieve previously registered sheet IDs.
  - **Active Event Synchronization Hardening (`syncActiveEventsFromSystemLog`)**:
    - Updated `syncActiveEventsFromSystemLog` to utilize the Smart Chip resolution engine, ensuring events with Smart Chips in Column H and Column I are seamlessly indexed and monitored rather than skipped.
  - **Smart Event Picker Fallback (`getEventsFromSystemLog`)**:
    - If invoked while on another tab (e.g., *Templates*, *Field Dictionary*), on the header row (row 1), or if the user clicks **NO** on the active row prompt, the system dynamically parses the **`System Log`** and presents a clean, numbered list of active events:
      > *Choose an event by entering its number (1–5), or paste any Google Sheet URL:*  
      > *1. [Row 2] 2026 USGA Ministers Workshop [2026]*  
      > *2. [Row 3] 51st National Church Conference (NCC) [2026]*  
      > *3. [Row 4] West Region Winter 2026 CYSC [2026]*  
      > *...*  
      > *Enter number (1–5) or paste URL:*
    - Simply typing a number (e.g. `3`) executes on that event; pasting an external sheet URL or standalone Sheet ID remains fully supported for backward compatibility.
  - **Direct Response Sheet Execution**:
    - When running directly inside an event response workbook (e.g., containing `Form Responses 1`), detects this immediately and runs locally without prompting.
- **Upgraded Maintenance Menu Scripts in `Code.gs`**:
  - `upgradeExistingSheet` (*Upgrade Existing Sheet (Full Sync)*)
  - `rebuildSummaryDashboardMenu` (*Rebuild Summary Dashboard for Event Sheet*)
  - `syncLodgingAndRoomsMenu` (*Setup / Sync Lodging & Room Inventory Tabs*)
  - `syncCheckInAndChangeLogMenu` (*Setup / Sync Printable Check-In & Change Log Tabs*)
  - `importHostChurchRoomsMenu` (*Import Host Church Rooms into Event Sheet - Step 1*)
  - `syncLogisticsStayingAtChurchMenu` (*Sync Logistics "Staying at Church" Column*)
- **Upgraded Transportation Scripts in `TransportationSync.gs`**:
  - `resolveTargetEventSpreadsheetForMenu` delegates directly to `resolveTargetEventSpreadsheet`, enabling active row detection and the numbered event picker for:
    - *Setup / Sync Public Driver Signup Sheet*
    - *Sync Transportation & Drivers Now*
    - *Generate Driver Summary Roster*
- **Sidebar Integration (`ManageEventsSidebar.html` & `rebuildSummaryDashboardByFormId`)**:
  - Added a **"📊 Rebuild Summary Dashboard"** button under Lodging in the *Manage Active Events* sidebar.
  - Added `rebuildSummaryDashboardByFormId(formId)` backend handler so coordinators can refresh live summary dashboard formulas with 1 click directly from the active event manager.

---

<a name="version-299"></a>
## Version 2.9.9
*October 2026*

### Printable `Check-In` Sheet, Registration `Change Log` & Automatic Room Release
- **Dedicated Printable `Check-In` Tab (`setupCheckInSheet` & `buildArrivalSummaryText`)**:
  - Added a print-formatted **`Check-In`** worksheet (`28px` row height, compact columns for 8.5" × 11" printing or tablet check-in) to every newly generated event sheet and existing sheets via one-click sync.
  - **Interactive Checkboxes**: `Checked In` (Column A) and `Welcome Gift` (Column B) checkboxes, preserved across re-sorts and syncs.
  - **Consolidated `Arrival Date & Mode` (Column F)**: Automatically combines flight/train arrival date + time, lodging arrival dates, or pre-event arrival status alongside travel mode (`Flight`, `Train/Bus`, `Car`, `Own Transit`).
  - **Live Sort-Safe Lookups (`getCheckInRoomLookupFormula` & `getCheckInGroupLookupFormula`)**:
    - Column G (`Lodging / Room Assignment`) dynamically looks up the participant's assigned room and bed spot from the `Lodging` tab, displaying a **Green** badge when assigned, a **Bold Red** alert (`⚠️ Unassigned (Needs Room)`) if they requested church lodging but have no room assigned yet, or a **Gray** badge (`Self / Hotel`) if not staying at church.
    - Column H (`Group / Team`) dynamically looks up the participant's fellowship group from `Logistics`.
- **Automatic Room Release & Audit Trail on Cancellation (Enhancement B)**:
  - When a participant edits their registration to switch from *Host Church Lodging* to *Self-Arranged* (or cancels):
    - Automatically clears their `Room Assignment` and `Bed / Spot` on `Lodging` so the room dropdown is clean and the bed is freed immediately.
    - Prepends `[Cancelled Church Lodging on MM/DD — Previously assigned to: Room X (Bed Y)]` into **`Lodging Notes`** so the hospitality team knows which physical room/bed had already been prepared for them.
  - Added a **`Status` dropdown** (`Active`, `UPDATED`, `CANCELLED`, `WAITLISTED`) on `Lodging` and updated `Summary Dashboard`'s `Staying at Hosting Church` formula to count active `Lodging` rows rather than raw `Form Responses 1` rows—allowing host church coordinators to cancel a participant's church stay directly on `Lodging` when notified offline.
  - Highlighted blank `Room Assignment` cells on `Lodging` in soft yellow (`#fef7e0`) for active lodgers and added an **`Awaiting Room Assignment (Unassigned on Lodging)`** KPI on `Summary Dashboard`.
- **Dedicated `Change Log` Sheet & Unreviewed Change Counter (Enhancement C)**:
  - Added a **`Change Log`** tab (`setupChangeLogSheet` & `logRegistrationChanges`) that automatically records a timestamped entry whenever a registrant modifies or cancels their lodging or transit plans (`Lodging Cancelled`, `Lodging Updated`, `Lodging Added`, `Pickup Updated/Cancelled`, `Drop-Off Updated/Cancelled`).
  - Captures exact **Before → After** diffs alongside **`Previous Room / Driver Impacted`** (e.g., `⚠️ Room Released: Main Church - Room 102` or `⚠️ Driver Assigned: Bro. John`).
  - Includes a **`Reviewed?` checkbox** (Column A): unreviewed rows highlight in soft red (`#fce8e6`) and increment the **`Unreviewed Registration Changes (Change Log)`** alert counter at the top of `Summary Dashboard`; checking the box turns the row soft green (`#e6f4ea`) and clears the dashboard alert.
- **One-Click Maintenance Sync (`syncCheckInAndChangeLogMenu` & Sidebar)**:
  - Added **USGA Events > Advanced Maintenance > Setup / Sync Printable Check-In & Change Log Tabs** and integrated Check-In + Change Log provisioning into `syncLodgingAndRoomsForSheet` and `upgradeExistingSheet`.

---

<a name="version-298"></a>
## Version 2.9.8
*October 2026*

### Summary Dashboard Formula Resilience & Dynamic Ingestion
- **Demographics Gender Isolation (Eliminated Female/Male Overlap)**:
  - Fixed legacy wildcard formulas (`*Male*`) where `Female` was incorrectly matched and counted as Male.
  - Enforced strict prefix matching (`"Male*"` / `"Female*"`) paired with bilingual and Chinese character fallbacks (`"男"`, `"女"`).
  - Eliminates inflated male headcounts and ensures that male + female counts equal total registrants exactly.
- **Sleep Preferences Multi-Criteria Hardening & Multilingual Support**:
  - Upgraded multi-criteria `COUNTIFS` in `setupSummaryDashboard()` to search using flexible substring wildcards (`*Light sleeper*`, `*Heavy sleeper*`, `*Early riser*`, `*Late sleeper*`, `*Snorer*`) while seamlessly recognizing legacy aliases (`*Night owl*`) and Traditional Chinese translations (`*淺眠*`, `*深眠*`, `*早起者*`, `*夜貓子*`, `*打呼*`).
  - Embedded `"Male*"` and `"Female*"` prefix matching within sleep preference formulas to prevent cross-gender contamination.
  - Dynamically calculates row totals using `=SUM(B{row}:C{row})` rather than running standalone column queries.
- **Dynamic Field Ingestion & Misleading Zero Elimination**:
  - `setupSummaryDashboard()` now dynamically checks `selectedFieldNames` and response headers before generating metrics:
    - If `"Staying at Host Church?"` was not included in the form (e.g. CYSC or youth events where all participants stay at church by default), displays `"N/A (Not in form)"` instead of evaluating `#N/A` into a confusing `0`.
    - Conditionally includes Travel Logistics, Pre/Post-Event Lodging, and Sleep Preferences tables only when relevant questions exist.
    - Updated Pre/Post Event Lodging formulas with bilingual support (`*活動前需要住宿*` / `*活動後需要住宿*`).
- **Dietary & Special Needs Multilingual Exclusions**:
  - Enhanced `cNeedsMatch()` to match Chinese headers (`飲食/藥物`, `特殊需求`) and properly exclude Chinese equivalents of None (`無`, `没有`, `無特殊需求`).
- **1-Click Summary Dashboard Rebuilder (`rebuildSummaryDashboardMenu`)**:
  - Added **USGA Events > Advanced Maintenance > Rebuild Summary Dashboard for Event Sheet** to quickly regenerate the `Summary Dashboard` tab on any active event spreadsheet without affecting manual assignments or other operational tabs.

---

<a name="version-297"></a>
## Version 2.9.7
*October 2026*

### Confirmation Email Subject & Body Title Deduplication
- **Resolved Duplicate "Registration Registration" in Subject Lines**:
  - In `masterRespondToRegistration(e)` and `testEmailVersions()`, normalized `settings.EventName` to strip trailing `"Registration"` or `"Registration Form"` suffixes before constructing email subject lines.
  - Ensures `"Registration"` is appended exactly once, preventing double suffixing (`"... Registration Registration"`) on initial confirmation, updated registration confirmation, waitlist, and waitlist update emails.
- **Cleaned Grammatical Phrasing in Email Body Content**:
  - Updated success confirmation, waitlist, and rejection notification email templates in `masterRespondToRegistration(e)` and `testEmailVersions()` to interpolate `cleanEventName` instead of raw `settings.EventName`.
  - Eliminates redundant wording such as *"received your registration for the [Event Title] Registration"*, producing natural, grammatically correct phrasing (*"received your registration for the [Event Title]"*).

---

<a name="version-296"></a>
## Version 2.9.6
*October 2026*

### Critical Runtime Blockers & Syntax Bug Fixes
- **Declared Missing Variables in `generateForm()`**:
  - Resolved fatal `ReferenceError: hasBefore is not defined` by explicitly declaring `hasBefore` and `hasAfter` before checking lodging selection fields.
- **Corrupted JavaScript Syntax Repaired across HTML Sidebars**:
  - Restored proper arithmetic subtraction operators (`-`) in date calculations and capacity countdowns (`m - 1`, `idxA - idxB`, `max - count`) and fixed multiline template literals across `Sidebar.html` and `ManageEventsSidebar.html`.
- **Reordered Specific vs. Generic Field Types in `addFieldToForm()`**:
  - Restructured field type evaluation order so custom handlers for `Food/Medicine Restrictions`, `Interpretation Language`, and `Other Special Needs/Accommodations` are evaluated before generic `short answer`, `paragraph`, or `dropdown` matches, restoring custom help texts and configurations.

### High-Priority Operational Logic & Privacy
- **Early Evaluation of Rejection & Waitlist**:
  - In `masterRespondToRegistration(e)`, evaluations for `isRejected` (`Medical Consent = No`) and `isWaitlisted` now execute **before** any operational tabs are modified.
  - Registrants declining liability release are immediately blocked from consuming room inventory or entering active driver queues. If an existing registrant switches consent to "No", their rows are set to `CANCELLED` and room/driver slots are released.
  - Waitlisted attendees are marked `WAITLISTED` across `Pickup`, `Drop-Off`, `Lodging`, and `Logistics`, holding them off public volunteer driver rosters until officially promoted.
- **Multi-Child `editResponseUrl` Disambiguation**:
  - The reverse response lookup in `masterRespondToRegistration(e)` now checks `First Name` (and `Last Name`) via `matchesParticipantRecord()` alongside parent email, ensuring siblings sharing a parent email receive their own unique edit link rather than colliding.
- **Archived Events Resurrection Fix**:
  - `syncActiveEventsFromSystemLog()` now skips rows marked `"Archived"` in `System Log` and respects `ArchivedFormIds`. `getMonitoredEvents()` only triggers automatic synchronization when `FormsToMonitor` is completely empty.
- **ScriptProperties 9KB Quota Protection**:
  - Compacted `FormsToMonitor` properties by storing compact file IDs (`sheetId`, `pubTransId`) instead of full Google Docs URLs, slashing JSON size by ~65% and preventing quota exhaustion as event history accumulates. Full URLs are resolved dynamically.
- **Apps Script 20-Trigger Hard Limit Management**:
  - Added trigger quota auto-cleanup in `masterFormLifecycleCron()`: when registration ended >14 days ago, the script automatically deletes the spreadsheet-level `masterRespondToRegistration` trigger via `ScriptApp.deleteTrigger(trig)` and sets `config.triggerReleased = true`.
- **Attendee Privacy Protection**:
  - Removed unlinked `"Attendees: View Here"` text from the public form description to prevent attendee roster disclosure.

### Concurrency, Data Integrity & Performance
- **Atomic `LockService` with Fast Release in `masterRespondToRegistration(e)`**:
  - Wrapped status evaluation and sheet updates with `LockService.getScriptLock()` (30s timeout).
  - Wrote preliminary statuses (`"Confirmed - Sending..."`, `"Waitlist - Sending..."`, `"Rejected - Sending..."`), updated operational sheets, called `SpreadsheetApp.flush()`, and **released the lock before invoking FormApp and GmailApp/MailApp**, eliminating lock contention during network delivery.
- **Batch `setValues()` in Migration & Sync Tools**:
  - Replaced sequential `appendRow()` loops in `upgradeExistingSheet()` and `syncLodgingAndRoomsForSheet()` with batch `.setValues()` writes, eliminating 6-minute script execution timeouts on large events.
- **Preserved Dynamic Building Lookup Formulas**:
  - `upgradeExistingSheet()` now guarantees `getBuildingLookupFormula()` is written into the `Building` column, ensuring live `Room Inventory` lookups remain dynamic.
- **Full 22-Column Schema Initialization for Transportation**:
  - Implemented `buildFullTransportationRow()`, guaranteeing new records on `Pickup` and `Drop-Off` populate all 22 columns with `Coordinator Status` defaulted to `"Unassigned"` to satisfy strict data validation rules.
- **Web App Security & Timezone Clarity**:
  - `doPost(e)` validates that `coordinatorEmail` ends with the authorized domain (`@tjc.org` or configured `ALLOWED_EMAIL_DOMAIN`) and checks optional `WEB_APP_SECRET_TOKEN`. `generateForm()` forwards `secretToken` during delegated execution.
  - Added live timezone labels (`Intl.DateTimeFormat().resolvedOptions().timeZone`) next to date/time pickers in both sidebars to prevent cross-timezone confusion.

---

<a name="version-295"></a>
## Version 2.9.5
*October 2026*

### Dual-Sheet Transportation & Multi-Driver Sync Engine (`TransportationSync.gs`)
- **Strict Separation of Concerns & Zero Attendee PII**:
  - Decoupled internal coordinator logistics from congregation volunteer signups via a physically separate **Public Driver Signup Workbook**.
  - **Zero Contact PII**: Attendee phone numbers and emails are completely withheld from the public sheet.
  - **Masked Passenger Names**: Displays masked names (e.g., `David L.`, `Grace C.`) alongside passenger counts to preserve attendee privacy while giving drivers necessary pickup identification.
- **Deterministic `Trip Sub-ID` Architecture**:
  - Introduced canonical reference IDs formatted as `[TYPE]-[HUB]-[IDENTIFIER]-[MMDD]-[HHMM]-[SLOT]` (e.g., `PU-SFO-UA1234-1025-1430-A`).
  - Completely eliminates the classic Google Sheets row-shift / formula-desync bug where sorting or filtering misaligns driver names from passenger flights.
- **Family & Minor Co-location Protection**:
  - Passengers detected as one family (same email, or same last name + phone, on the same date and hub) are treated as one unit and packed into vehicles with first-fit-decreasing, so they are never split.
  - Limits: grouping relies on shared email or last name + phone, so relatives registered with different contact details are not recognized as a family. A family larger than `MaxPassengersPerCar` stays together in one slot, flagged `Large group (van needed)`, rather than being split. If new registrations change the packing, slot letters can shift, so recheck claimed slots after late changes.
- **Arrival/Departure Window Clustering**:
  - Implemented configurable time-window clustering (`ArrivalClusterWindowMinutes`, default: 30 minutes) to combine flights landing closely at the same airport into a unified airport pickup run, optimizing volunteer driver trips.
- **Manual Host Church Communication Tooling**:
  - **No Automated Email Dispatches**: Excluded automated system emails to respect church operational preferences for direct volunteer communication.
  - **One-Click Dispatch SMS Text Generator**: Auto-generates a personalized, copy-ready SMS/WhatsApp dispatch message in Column 22 of the Master sheet, complete with exact passenger names, phone numbers, flight details, luggage estimates, and church coordinator contacts.
  - **Interactive Coordinator Status Tracking**: Added dropdown tracking in Column 21 (`Unassigned`, `Driver Claimed`, `Confirmed / Contacted`, `Reassign Needed`, `Completed`).
- **Protected Public Workbook & Automated Provisioning**:
  - **Automatic Provisioning on New Event Creation (`generateForm`)**: Generating a new event now automatically creates the Google Form, the Master Response Spreadsheet, and the `[Event Title] - Volunteer Driver Signups (Public)` workbook inside the event's registration folder, pre-linked with 15-minute auto-sync enabled and returned directly in the creation summary links (`🚗 View Public Driver Signup Sheet`).
  - **Unified Menu & Duplicate-Prevention Guard (`Setup / Sync Public Driver Signup Sheet`)**: Consolidated the menu into `USGA Events > Transportation & Drivers > Setup / Sync Public Driver Signup Sheet` and added an idempotency guard in `createPublicTransportationWorkbook()` that checks both `Settings` (`PublicTransportSheetId`) and the event's registration Drive folder for an existing, non-trashed Public Sheet — reusing and syncing it rather than creating duplicate files.
  - **Shared-Drive-Compatible Event Folder Placement (`resolveEventRegistrationFolder` & `File.moveTo`)**: Automatically places the `[Event Title] - Volunteer Driver Signups (Public)` spreadsheet directly inside that event's registration Drive folder using `newFile.moveTo(parentFolder)` (compatible with Google Shared Drives), with a secondary fallback lookup against the `Drive Folder URL` column in `System Log`.
  - **Smart Menu Target Resolution (`resolveTargetEventSpreadsheetForMenu`)**: When top-level transportation menu actions are invoked from the Master Form Generator workbook rather than an individual event response sheet, automatically prompts for the target Event Response Spreadsheet URL so actions always target the intended event and its folder.
  - **Protected Ranges**: Locks schedule, flight, and passenger columns against public tampering while unprotecting only the Driver Input columns (`Columns H:K`).
- **Dedicated Driver Roster & Concurrency Safety**:
  - **Driver Summary Roster**: Adds an automated `Driver Roster` tab in Master grouping all assignments chronologically by volunteer driver.
  - **Zero-Touch Auto-Sync Activation (`ensureTransportationSyncTrigger` & `backgroundTransportationSync`)**: Creating a Public Driver Signup Sheet automatically installs/verifies the 15-minute background trigger and registers the event in `PublicTransportEventSheetIds` (alongside `FormsToMonitor`), ensuring hands-free bidirectional synchronization without requiring manual trigger setup.
  - **LockService Concurrency & Form Submission Fast-Path**: Prevents race conditions during simultaneous public edits using script-level locking and atomic batch writing. During form submissions (`masterRespondToRegistration`), automatically filters for transit attendees and executes an ultra-fast lightweight sync (bypassing redundant range protection calls and driver roster recalculation with a 3-second lock timeout and fail-silent fallback to the 15-minute background cron), completely eliminating confirmation email latency during registration surges.
- **Active Events Sidebar Integration**:
  - Added a dedicated **🚗 Transportation & Drivers** card inside `ManageEventsSidebar.html` with real-time status display and one-click sync / setup buttons.

---

<a name="version-294"></a>
## Version 2.9.4
*October 2026*

### Dedicated `Lodging` Sheet & Streamlined `Logistics` Roster
- **Separation of Concerns Between `Logistics` and `Lodging`**:
  - **Streamlined `Logistics` Sheet (`setupLogisticsSheet`)**: Decluttered the general `Logistics` roster by removing lodging-only planning columns (`Lodging Before`, `Lodging After`, `Sleep Preferences & Habits`, and `Room Assignment`). `Logistics` now focuses cleanly on registration check-in, demographics, `Staying at Host Church?` status badges, `Food/Medicine Restrictions`, `Other Special Needs`, emergency contacts, and `Group/Team` + `Notes`.
  - **Dedicated `Lodging` Sheet (`setupLodgingSheet`)**: Created a dedicated `Lodging` tab that automatically filters to **only participants staying at the host church** (mirroring the `Pickup` and `Drop-Off` pattern).
  - **Comprehensive Lodging Columns**: Includes `First Name`, `Last Name`, `Email`, `Phone`, `Gender`, `Age`, `Age Group`, `Grade`, `Parent/Guardian`, `Local Church/Place of Worship`, `Staying at Host Church?`, `Lodging Before`, `Lodging After`, **`Exact Lodging Dates`** (`Specify exact dates of arrival/departure for lodging`), **`Sleeping Bag/Pillow`**, `Sleep Preferences & Habits`, `Other Special Needs`, and `Status` (`Active` / `UPDATED` / `CANCELLED`), followed by manual/formula rooming columns: **`Room Assignment`**, **`Building`**, **`Bed / Spot`**, and **`Lodging Notes`**.
  - **Live Cancellation & Update Tracking**: In `masterRespondToRegistration()`, if a registrant switches from host-church lodging to self-arranged lodging, their row on `Lodging` is marked `CANCELLED` with a red strikethrough (`#f4cccc`) and automatically excluded from room capacity counts. If they update their lodging dates or sleep preferences, their status highlights as `UPDATED` (`#fff2cc`).
  - **Sort-Safe Building Auto-Lookup**: Added `getBuildingLookupFormula()` using relative `INDIRECT("RC[-1]", FALSE)` VLOOKUP so that selecting a `Room Assignment` automatically populates the `Building` column and remains intact even when the `Lodging` sheet re-sorts alphabetically by `Last Name`.

### Built-In `Room Inventory` Tab & Host Church Room Importer
- **Structured `Room Inventory` Sheet (`setupRoomInventorySheet`)**:
  - **Host Church Input Columns (Columns A–E)**: `Building Name`, `Room Name / #`, `Gender / Designation` (dropdown: `Male / Brothers`, `Female / Sisters`, `Family / Couples`, `Counselors / Staff`, `Flexible / Any`), `Max Capacity`, and `Room Features / Notes`.
  - **Beginner-Friendly Hover Notes (Comment Boxes)**: Added Google Sheets cell notes (`.setNotes()`) to every header on `Room Inventory` (Columns A–I) and to the yellow manual columns on `Lodging` (`Room Assignment`, `Building`, `Bed / Spot`, `Lodging Notes`) with clear instructions and examples for non-technical church volunteers.
  - **Automated Live Tracking Columns (Columns F–I)**:
    - `Room Assignment Key` (`Building - Room` composite label used by the `Lodging` dropdown).
    - `Assigned Count` (live `COUNTIFS` against active assignments on `Lodging`).
    - `Remaining Capacity` (`Max Capacity - Assigned Count`, with conditional formatting: **Green** when spots remain, **Yellow** when full `= 0`, and **Bold Red** if over-capacity `< 0`).
    - `Assigned Occupants (Live Roster)` (live `FILTER` + `TEXTJOIN` listing every occupant assigned to that room).
- **One-Click Host Church Room Importer (`importHostChurchRoomsMenu` & Sidebar)**:
  - Added **USGA Events > Advanced Maintenance > Import Host Church Rooms into Event Sheet** and an interactive **🏨 Lodging & Room Inventory** panel inside `ManageEventsSidebar.html`.
  - Automatically detects `Building`, `Room Name / #`, `Gender / Type`, `Capacity`, and `Notes` columns (in English or Traditional Chinese) from an external Host Church Google Sheet URL or a copied tab, populates `Room Inventory`, and binds the `Room Assignment` dropdown on `Lodging`.
- **Non-Destructive Lodging & Room Syncer (`syncLodgingAndRoomsMenu` & Sidebar)**:
  - Added **USGA Events > Advanced Maintenance > Setup / Sync Lodging & Room Inventory Tabs** (and sidebar button) to upgrade active event spreadsheets in place, migrating any existing `Room Assignment` entries from `Logistics` into `Lodging` while preserving existing `Room Inventory` definitions.
- **Summary Dashboard Room Capacity Metrics**:
  - Added `Total Room Capacity (Room Inventory)`, `Assigned to Rooms`, and `Remaining Room Capacity` to `Summary Dashboard`.

---

<a name="version-293"></a>
## Version 2.9.3
*October 2026*

### Host Church Logistics & Lodging Standardization
- **Guaranteed "Staying at Host Church?" Column in Logistics Tab**:
  - Implemented `isStayingAtChurchField()` helper supporting all phrasing variations (`"staying at the hosting church"`, `"staying at church"`, `"staying at host church"`, `"lodging arrangement"`, `"住宿安排"`, `"我將住在主辦教會"`, `"church lodging"`).
  - Updated `setupLogisticsSheet()` to ensure `"Staying at Host Church?"` is always included on the Logistics tab whenever any church stay or lodging question is asked.
  - Added automated conditional formatting on the `"Staying at Host Church?"` column: highlights on-site stays in soft green (`#e6f4ea`, font `#137333`) and self-arranged lodging in subtle gray (`#f1f3f4`, font `#5f6368`) for instantaneous visual scanning by host church planning teams.
- **Targeted Lodging Arrangement Optionality (NCC & Ministers Workshop)**:
  - Standardized the `National Church Conference (NCC)` and `USGA Ministers Workshop` templates to specifically present the official bilingual lodging optionality:
    - **Question**: `Lodging Arrangement 住宿安排` (Required `*`)
    - **Options**:
      - `Lodging at host church / 主辦教會安排住宿`
      - `Self-arranged lodging & transit / 自行安排住行`
  - Added `'Lodging Arrangement 住宿安排'` to the Master Field Dictionary with predefined bilingual choices.
  - Updated `generateForm()` and `addFieldToForm()` to automatically enforce this exact question title and options for NCC and Ministers Workshop, while keeping other youth convocations, camps, and seminars free from unneeded lodging arrangement optionality.
  - Updated `Sidebar.html` to automatically check `'Lodging Arrangement 住宿安排'` only when NCC or Ministers Workshop templates are selected.
- **Real-Time & Historical Synchronization**:
  - Updated `masterRespondToRegistration()` and `upgradeExistingSheet()` with `isStayingAtChurchField()` to reliably map responses into `"Staying at Host Church?"`.
  - Upgraded `upgradeExistingSheet()` to automatically preserve any existing manual entries (`Room Assignment`, `Group/Team`, `Notes`) from `Logistics_Old`.
- **New Non-Destructive Logistics Syncer (`syncLogisticsStayingAtChurchMenu`)**:
  - Added `USGA Events -> Advanced Maintenance -> Sync Logistics "Staying at Church" Column` to safely insert and backfill the `"Staying at Host Church?"` column into already-shared event spreadsheets in place without disturbing existing coordinator assignments or notes.

### International Phone Number `#ERROR!` Prevention & Auto-Repair
- **Root Cause Resolution (`formatSheetTextValue`)**:
  - **Issue**: When Google Forms writes an international phone number starting with `+` (e.g., `+54 1166513382`) into `Form Responses 1`, it prepends a hidden text-escape apostrophe (`'`). When `getDisplayValues()` read those strings and wrote them to `Logistics`, `Pickup`, and `Drop-Off` via `appendRow()` / `setValues()`, the leading apostrophe was stripped, causing Google Sheets to parse `+54 1166513382` as a broken arithmetic formula (`#ERROR!`).
  - **Fix**: Added `formatSheetTextValue(val, isPhoneField)` to automatically prefix phone numbers and any text values starting with `+`, `-`, or `=` with a leading apostrophe (`'`), forcing Google Sheets to store them as literal text and preserving leading zeros.
- **Plain Text Column Formatting (`@`)**:
  - Updated `setupTransportationSheets()` and `setupLogisticsSheet()` to explicitly set `.setNumberFormat("@")` on `Phone`, `Phone Number`, `Emergency Contact Phone`, and `Driver Phone Number` columns.
- **Automated In-Place `#ERROR!` Repair**:
  - Updated `masterRespondToRegistration()`, `upgradeExistingSheet()`, and `syncLogisticsStayingAtChurchColumn()` so that both live submissions/edits and maintenance syncs automatically restore and format `Phone` and `Emergency Contact Phone` values as Plain Text across `Logistics`, `Pickup`, and `Drop-Off` tabs without overwriting manual coordinator notes or room assignments.

---

<a name="version-292"></a>
## Version 2.9.2
*October 2026*

### Enhancements & Refinements
- **Parent/Guardian Guidance**:
  - Updated help text across all templates and generated forms for the `Name of Parent/Guardian` field to explicitly clarify: *"If participant is 18 or above, enter 'N/A'."*
  - Synchronized bilingual Traditional Chinese translation string (`若參與者年滿 18 歲以上，請填寫「N/A」`).
- **Delegated Web App Resiliency, Coordinator Access (Model B) & Direct Fallback**:
  - **Master Admin Direct Execution Priority**: When initiating form generation from the Master Admin / Shared Drive owner account (`us.events@tjc.org`), the system automatically executes directly, ensuring all generated Google Drive folders, forms, and spreadsheets are stamped with `us.events@tjc.org` without network latency.
  - **Model B Coordinator Provisioning**: When an event coordinator initiates generation from their personal TJc account, the request automatically routes through the Delegated Web App to execute under Master Admin service privileges.
  - **Unconditional Closed Form Message Initialization**: The Google Form is now always initialized with custom bilingual closed messages upon creation (setting pre-registration notice if scheduled or post-registration closure text if open), eliminating Google's factory default placeholder (*"This form is no longer accepting responses"*).
  - **Direct Execution Safety**: Direct execution mode (when no Web App is configured) continues to enforce `us.events@tjc.org` authorization to ensure automated confirmation receipts are routed through the official mailbox.
  - **Graceful Fallback**: Added graceful fallback to direct execution when generating forms under the Master Admin / Shared Drive owner account (`us.events@tjc.org`) if the delegated Web App URL is invalid, returns 404, or encounters connection errors, preventing generation blocking.
  - **Lifecycle Indexing Fix (`ReferenceError`)**: Resolved `ReferenceError: eventTitle is not defined` bug during registration lifecycle indexing in `generateForm()`.
  - **Enhanced Diagnostics**: Replaced raw HTTP 404 HTML exceptions with actionable troubleshooting guidance for administrators and event coordinators.
  - **Manifest Configuration**: Updated `appsscript.json` manifest with explicit `webapp` configuration (`executeAs: USER_DEPLOYING`, `access: DOMAIN`) to ensure clasp deployments preserve Web App deployment capabilities.
- **Lodging Formula & Header Compatibility (Summary Dashboard & Logistics)**:
  - **Summary Dashboard Lodging Formulas**: Enhanced `cLodgingMatch` in `setupSummaryDashboard()` to dynamically support both modern standard questions (`I will be staying at the hosting church.` / `Yes*`/`No*`) and legacy/historical event questions (e.g. `Lodging Arrangement 住宿安排` / `*host church*` vs. `*self*`, plus Traditional Chinese variants `*主辦教會*` / `*自行安排*`). Eliminates zero-counts when analyzing events created prior to recent schema standardizations.
  - **Logistics Sheet Mapping**: Added `Lodging Arrangement` and `住宿安排` to `optionalHeadersMap` in `setupLogisticsSheet()` and automated synchronization handlers (`masterRespondToRegistration` and `upgradeExistingSheet()`), ensuring legacy lodging answers correctly flow into the `Staying at Host Church?` column.
- **Train/Bus Travel Logistics Auto-Inclusion & Form Branching Restoration**:
  - **Automated Train Section Inclusion**: Whenever `Arrival Details` or `Departure Details` is included in an event form, the system automatically injects the corresponding Train/Bus logistics fields (`Arrival Train/Bus Station`, `Arrival Carrier`, `Arrival Train/Bus Number`, and departure equivalents) even if they were unchecked or absent from older spreadsheet templates.
  - **Guaranteed Travel Branching**: Restored `"I am arriving by train/bus"` and `"I am departing by train/bus"` choices with guaranteed navigation to the `Arrival Train/Bus Details` and `Departure Train/Bus Details` sections to collect transit station, carrier, and train/bus route number information before proceeding to Lodging or Releases.
  - **Canonical Form Section Ordering**: Standardized section ordering so travel sections (`Arrival Arrangements`, `Arrival Flight Details`, `Arrival Train/Bus Details`, `Departure Arrangements`, `Departure Flight Details`, `Departure Train/Bus Details`) always precede `Lodging & Accommodation` and legal waivers.
  - **Sidebar & Translation Alignment**: Added train logistics auto-selection and dictionary fallbacks to `Sidebar.html` and expanded bilingual translations for all train travel questions and section titles.
- **Trigger Decommissioning Safeguards**:
  - Enhanced background cleanup routines to ensure orphaned spreadsheet submit triggers are removed safely when forms are manually archived or deleted from Google Drive.

---

<a name="version-291"></a>
## Version 2.9.1
*October 2026*

### Performance & Synchronization
- **Active Events Sidebar Optimization**:
  - Re-architected `getMonitoredEvents()` to fetch metadata in parallel, reducing sidebar open latency by over 80%.
  - Added smart auto-synchronization: newly generated events or historical forms recorded in the `System Log` automatically sync with script properties without requiring manual registration.
- **System Log Auto-Discovery**:
  - Added menu item **USGA Events > Advanced Maintenance > Sync Active Events from System Log** to instantly rebuild monitored event lists.

---

<a name="version-290"></a>
## Version 2.9.0
*September 2026*

### Critical Integrity Fixes
- **Multi-Child / Family Shared Email Disambiguation**:
  - **Issue**: In prior versions, `masterRespondToRegistration` matched participant rows on `Pickup`, `Drop-Off`, and `Logistics` solely by `emailRecipient`. When parents registered multiple siblings (or spouses registered together) under one shared email address, subsequent registrations overwrote earlier entries.
  - **Resolution**: Created `matchesParticipantRecord(rowFirst, rowLast, rowEmail, targetFirst, targetLast, targetEmail)` matching on a composite key `(First Name + Last Name + Email)`. Siblings and family members sharing an email now each maintain their own independent row across all response tabs.

### Performance & Architectural Enhancements
- **Translation Engine Acceleration (~70% Faster Generation)**:
  - Replaced repetitive synchronous `LanguageApp.translate()` calls with an in-memory dictionary cache (`translationCache`), dramatically decreasing Google Form creation time.
- **Modular Sheet Architecture**:
  - Consolidated duplicate sheet-building routines into shared, reusable functions (`setupTransportationSheets`, `setupLogisticsSheet`, `setupSummaryDashboard`, `setupAirportSummarySheet`) utilized across both initial form creation and the legacy upgrade utility.
- **Automated Event Archiving**:
  - The hourly lifecycle monitor now automatically closes registration and decommissions triggers 3 days after the event end date (`eventEndDate + 3 days`), keeping the active trigger list clean.
- **Summary Dashboard Bilingual Formula Hardening**:
  - Replaced hardcoded string comparisons in `Summary Dashboard` formulas with wildcard/multilingual pattern matching (e.g., `COUNTIFS` supporting both English and Traditional Chinese values).

---

<a name="version-280"></a>
## Version 2.8.0
*September 2026*

### Major Features & UI Enhancements
- **Dual Interface Access (Sidebar & Wide Modal Dialog)**:
  - Added **USGA Events > Open Form Generator (Wide Window)** opening a `500x750px` modeless dialog for easier viewing of long field names and complex templates.
  - Expanded standard sidebar width from `300px` to `350px`.
- **End-to-End Train & Bus Logistics**:
  - Full integration of train and bus travel tracking across `Pickup`, `Drop-Off`, and `Summary Dashboard` sheets.
  - Injected dedicated columns: *Arrival/Departure Station*, *Carrier*, and *Train/Bus Number*.
- **Response Spreadsheet Settings Tab**:
  - Injected a dedicated `Settings` sheet into every newly generated response workbook storing `EventName`, `OrgName`, and `ContactEmail` for resilient cross-environment automation.
- **Refined Date/Time Presentation**:
  - Standardized user-facing confirmation emails and sheet headers to format dates cleanly as `MM/DD/YYYY` and times in standard 12-hour format with AM/PM.

---

<a name="version-270"></a>
## Version 2.7.0
*September 2026*

### Form Lifecycle Management
- **Manage Active Events Sidebar (`ManageEventsSidebar.html`)**:
  - Created a dedicated management sidebar allowing coordinators to adjust registration open/close dates, modify max capacity limits, update contact emails, or toggle manual form status on the fly.
- **Date Input Simplification**:
  - Converted event start and end dates to standard date-only pickers (`<input type="date">`) for simplified event configuration.
- **CYSC Template Alignment**:
  - Updated the College Youth Spiritual Convocation template to enforce standard minor compliance safeguards.

---

<a name="version-260"></a>
## Version 2.6.0
*September 2026*

### Travel & Eligibility Automation
- **Automated National Church Conference (NCC) Eligibility Notice**:
  - Selecting the NCC template automatically enables the Eligibility field with pre-filled restricted attendance text (*"This is not an open conference and pertains only to elected delegates and invited observers."*).
- **Train/Bus Travel Logistics Initial Rollout**:
  - Added Master Dictionary entries for *My train/bus information* and *I will arrange my own ride (additional notes)*.
- **Unified Datetime Controls**:
  - Normalized registration window selectors back to standard HTML5 `datetime-local` elements.

---

<a name="version-250"></a>
## Version 2.5.0
*September 2026*

### Retrofit & Migration Tools
- **V2 Spreadsheet Upgrade Tool (`upgradeExistingSheet`)**:
  - Added a one-click migration utility under **USGA Events > Advanced Maintenance > Upgrade Existing Sheet (Full Sync)**.
  - Safely backs up legacy sheets to `_Old` tabs and rebuilds modern `Logistics`, `Pickup`, `Drop-Off`, and `Summary Dashboard` tabs directly from raw form responses.
- **Split Date/Time Selector Experimentation**:
  - Introduced side-by-side date and time inputs with automatic 12:00 AM / 11:59 PM defaults for registration windows.

---

<a name="version-240"></a>
## Version 2.4.0
*September 2026*

### Registration Limits & Auditing
- **Registration Time Windows**:
  - Added support for explicit registration open and close date/time boundaries.
- **Capacity & Waitlist Management**:
  - Added `Maximum Attendees` capacity thresholds. Submissions exceeding the limit automatically receive customized waitlist confirmation notifications.
- **Historical Forms Description Audit**:
  - Added audit tools to extract and catalog descriptions from historical Google Forms for brand consistency and template archiving.

---

<a name="version-230"></a>
## Version 2.3.0
*September 2026*

### Transportation Tracking Overhaul
- **In-Place Modification Sync**:
  - Replaced naive append operations with in-place updates on `Pickup` and `Drop-Off` sheets when participants edit flight details.
- **Cancellation Detection & Visual Formatting**:
  - Participants switching from flight to self-arranged rides have their transportation rows marked as `CANCELLED` with a light red background (`#f4cccc`) and strikethrough styling to alert dispatchers without breaking coordinator formulas.
  - Automatic status restoration to `Active` if a participant re-adds travel details.

---

<a name="version-220"></a>
## Version 2.2.0
*September 2026*

### Bug Fixes & Reorganization
- **Email Extraction Disambiguation**:
  - Fixed a routing bug where `masterRespondToRegistration` occasionally sent confirmations to a minor's email instead of the primary contact. The script now prioritizes system-collected emails and explicitly ignores headers containing `"minor"`.
- **Form Navigation Target Bridging**:
  - Resolved page branching deadlocks for forms that requested departure arrangements but omitted flight detail questionnaires.
- **Master Dictionary & Template Restructuring**:
  - Reorganized emergency contact fields to appear immediately after participant contact details across all 17 templates.

---

<a name="version-210"></a>
## Version 2.1.0
*September 2026*

### Compliance & Security
- **Minors Compliance Toggle**:
  - Added an explicit toggle in the generator UI: *"Will this event include participants who are minors (under 18)?"*
  - Automatically hoisted the *Minor's Email* field to the top section of the form with mandatory parental consent legal text.
- **Strict Send-As Verification**:
  - Implemented pre-flight account verification ensuring coordinators generate forms only from accounts authorized to send as official group mailboxes (e.g., `us.events@tjc.org`), preventing personal email leakage.

---

<a name="version-200"></a>
## Version 2.0.0
*August 2026*

### Complete V2 Ground-Up Architecture Rewrite
- **Dynamic Field Dictionary**:
  - Centralized field definitions in a spreadsheet tab (`Field Dictionary`) supporting dynamic field types (Text, Paragraph, Radio, Checkbox, Dropdown, Date, Time, Scale).
- **Standardized Event Templates**:
  - Created 17 master event templates across national and regional youth camps, seminars, ministry programs, and conferences.
- **Bilingual Translation Engine**:
  - Built automated English-to-Traditional Chinese translation for form titles, section headers, field prompts, and option values.
- **Automated Regional Airport Intelligence**:
  - Added database of over 100 North American airports with automated proximity lookup based on host church selection.
- **Live Transportation & Accommodations Sync**:
  - Automated generation of `Pickup`, `Drop-Off`, and `Logistics` tabs linked via installable form submission triggers.
- **Real-Time Summary Dashboard**:
  - Built live formula-driven dashboard summarizing flight arrivals, lodging needs, dietary restrictions, and sleep preferences.
- **System Audit Logging**:
  - Implemented centralized `System Log` tracking form creation metadata, destination spreadsheets, form URLs, and edit URLs.
