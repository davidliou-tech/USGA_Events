# USGA Event Registration Form Generator - Changelog V2.9

## Overview
Version 2.9 is a major reliability, productivity, and optimization release. It resolves critical multi-child registration overwrites through composite key matching, hardens waitlist calculations, introduces full active event lifecycle controls (live status, capacity tracking, manual toggles, and safe trigger decommissioning), accelerates bilingual form generation by ~70% via translation caching, modularizes sheet-building architecture, adds automated 3-day post-event archiving, and refines Summary Dashboard formulas for flawless bilingual and monolingual execution.

---

## 1. Multi-Child Registration Bug Fix (Composite Key Matching)
* **Root Cause in V2.8:** In previous versions, participant rows on the `Pickup`, `Drop-Off`, and `Logistics` sheets were matched solely on `emailRecipient`. When a parent registered multiple siblings under the same email address, each subsequent registration overwrote the earlier child's row.
* **V2.9 Fix:**
  * Created helper function [`matchesParticipantRecord(rowFirst, rowLast, rowEmail, targetFirst, targetLast, targetEmail)`](file:///Users/mbpliou5/Documents/USGA%20Projects/Code.gs#L1660) in `Code.gs`.
  * Updated sync logic across `Pickup`, `Drop-Off`, and `Logistics` to match on a composite key: `(First Name + Last Name + Email)`.
  * Siblings sharing a parent's email address now each receive their own individual row across all sheets without data loss or row corruption.

---

## 2. Waitlist Calculation Hardening & Spot Preservation
* **Waitlist Calculation Logic:**
  * In V2.8, the waitlist check counted `(currentRow - 1) >= maxAttendees` blindly.
  * In V2.9, the counter dynamically inspects prior submissions in `Form Responses 1` and excludes any row where:
    1. Medical Consent starts with `"No"` (declined liability waiver).
    2. `Email Status` starts with `"Rejected"`.
    3. `Email Status` is already marked as `"Waitlist"`.
* **Confirmed Spot Preservation on Edit:**
  * When a confirmed participant edits their travel or lodging details via the edit link, the system checks their existing status in `Email Status`. Confirmed participants retain their spot and are never demoted to the waitlist.

---

## 3. Automated Email Delivery Error Logging
* **Delivery Status Visibility:**
  * In V2.8, if both `GmailApp` and fallback `MailApp` failed to deliver an email, the script caught the exception but left the spreadsheet status blank or failed silently.
  * In V2.9, the failure message is captured and logged directly into the `Email Status` column (e.g., `Delivery Failed: Invalid recipient (9/28/2026, 8:00:00 PM)`), giving coordinators instant diagnostic visibility.

---

## 4. Active Event Management Power-Ups (`ManageEventsSidebar.html`)
* **Live Status Badge:**
  * Added visual status banners dynamically reflecting form state:
    * 🟢 **OPEN** (Accepting responses)
    * 🟡 **SCHEDULED** (Awaiting scheduled start timestamp)
    * 🔴 **CLOSED** (Not accepting responses)
* **Live Capacity Tracker:**
  * Added real-time attendee counter displaying current confirmed registrants against the capacity cap (e.g., `👥 42 / 50 Registrants (8 spots remaining)`).
* **Direct Navigation Links:**
  * Added one-click quick launch buttons to open the **🌐 Live Form**, **✏️ Edit Form**, and **📊 Response Sheet** in new browser tabs.
* **Manual Open/Close Controls (`toggleEventAcceptingResponses`):**
  * Added an `Open Form Now` / `Force Close Form` button allowing coordinators to override scheduled timers on demand.
* **Safe Event Archiving (`archiveMonitoredEvent`):**
  * Added an `Archive Event` button that safely closes the form, deletes its specific `masterRespondToRegistration` trigger tied to its destination spreadsheet, and removes the form from `FormsToMonitor`.
  * **Quota Safety:** Reclaims Google Apps Script installable trigger quota without deleting forms, spreadsheets, or attendee data.

---

## 5. Form Generator Productivity (`Sidebar.html`)
* **Real-Time Field Search Bar:**
  * Added `#fieldSearch` input allowing coordinators to filter fields instantly across all categories. Matching items stay visible while empty categories collapse automatically.
* **Category Batch Selection:**
  * Added `Select All` and `Clear` links to every category header for one-click toggling of all checkboxes within that category.
* **Animated Generation Spinner:**
  * Added a modern CSS multi-ring animated spinner overlay displaying step-by-step progress status during form generation.
* **Header File Clean-up:**
  * Removed unused `f_image` file input and label from `Sidebar.html`.

---

## 6. Backend Refactoring & Optimization (`Code.gs`)
* **Modular Sheet Builders:**
  * Consolidated duplicated sheet-creation logic between `generateForm` and `upgradeExistingSheet` into modular, reusable functions:
    * `setupTransportationSheets(ss)`
    * `setupLogisticsSheet(ss, selectedFieldNames)`
    * `setupSummaryDashboard(ss, selectedFieldNames)`
    * `setupAirportSummarySheet(ss, hasAirportFields)`
* **Translation Caching & Dictionary Expansion:**
  * Implemented an in-memory execution cache `_translationCache` in `translateText()`.
  * Expanded the `zh-TW` overrides dictionary with standard terms across travel, lodging, emergency contact, and releases.
  * Cuts external `LanguageApp.translate` API calls by ~70%, reducing bilingual form generation time from ~45s to ~10–15s.
* **Chronological Transportation Sorting:**
  * `Pickup` sheet sorts chronologically by **Date (Col 6), Time (Col 7), Flight/Airport (Col 9)**.
  * `Drop-Off` sheet sorts chronologically by **Date (Col 6), Time (Col 7), Flight/Airport (Col 8)**.
  * Groups passengers chronologically first so volunteer drivers can plan airport runs efficiently.
* **LockService Concurrency Protection:**
  * Wrapped critical trigger creation, event toggling, submission processing, and archiving routines in `LockService.getScriptLock()` to prevent race conditions.
* **Elimination of Blind Trigger Deletion:**
  * Removed legacy code that blindly deleted triggers when `triggers.length > 18`, ensuring existing active events never lose their submit triggers.
* **Automated Archiving via Hourly Cron:**
  * `masterFormLifecycleCron` now automatically checks if an event is 3 days past its scheduled conclusion (`now > config.end + 3 days`).
  * If expired, it closes the form, deletes only the submit trigger for that form's destination spreadsheet, and removes the form from `FormsToMonitor`.

---

## 7. Summary Dashboard & Airport Summary Hardening
* **Demographics Isolation:**
  * Replaced `cCountIfs("Gender", "*Male*")` with prefix matching `cCountIfs("Gender", "Male*")` and `"Female*"`.
  * Eliminates the bug where `"Female"` was matched by `*Male*`, guaranteeing accurate male and female counts across English and bilingual forms.
* **Sleep Preferences Breakdown:**
  * Converted single-criterion formulas to multi-criteria `COUNTIFS` isolating gender (`"Male*"`, `"Female*"`).
  * Updated search string to `*Late sleeper*`, resolving 0-count errors caused by legacy references to "Night owl".
  * Replaced redundant Column D `COUNTIF` queries with dynamically calculated row sums (`=SUM(B{row}:C{row})`).
* **Church Lodging Bilingual Support:**
  * Changed church lodging matching from exact `"Yes"` / `"No"` to prefix wildcards `"Yes*"` and `"No*"`, properly counting bilingual `"Yes 是"` / `"No 否"` responses.
* **Dietary & Medical Restrictions Scale:**
  * Converted fixed range `A2:ZZ1000` to unbounded open range `A2:ZZ`, scaling beyond 1,000 attendees.
  * Added Traditional and Simplified Chinese exclusions for "None" (`<>無`, `<>没有`).
* **Airport Summary Auto-Sorting & Visual Headers:**
  * Added `ORDER BY COUNT(...) DESC` to arrival and departure `QUERY` formulas. Busiest airports automatically appear at the top.
  * Styled `A3:B3` and `D3:E3` with unified `#4a86e8` blue headers.
* **Summary Dashboard Alignment:**
  * Added horizontal center alignment to count columns B, C, and D for clean tabular presentation.

---

## 8. Shared Drive Root Resolution & Delegated Security Provisioning (V2.9.1)
* **Shared Drive Root Fallback (`0AJ4t2YKTRQHWUk9PVA`):**
  * Fixed an issue where the Master Spreadsheet residing directly at the root of a Shared Drive caused `DriveApp.getFileById(ssId).getParents()` to return an empty iterator (`parents.hasNext() === false`).
  * The backend now automatically falls back to the Master Shared Drive ID (`0AJ4t2YKTRQHWUk9PVA`, configurable via `ScriptProperties.getProperty('MASTER_DRIVE_FOLDER_ID')`), guaranteeing that subfolders are created directly in the Shared Drive rather than defaulting to the coordinator's personal "My Drive".
* **Delegated Web App Architecture (`doPost`):**
  * Implemented an internal Web App endpoint (`doPost(e)`) configured with `Execute as: Me` (Master Admin) and `Who has access: Anyone within True Jesus Church`.
  * `generateForm()` automatically dispatches creation requests via `UrlFetchApp` with an OAuth Bearer token when `DELEGATED_WEB_APP_URL` is set, executing folder and file generation under full Master Admin privileges.
  * Coordinators can remain standard **Viewers** or **Contributors** on the Shared Drive without requiring elevated "Content Manager" access.
* **Automated Scoped Permissions:**
  * The backend executes `targetFolder.addEditor()`, `form.addEditor()`, and `responseSs.addEditor()` for the coordinator's email and contact alias.
  * Coordinators receive full management access to their specific event subfolder while the rest of the Master Shared Drive remains protected against accidental edits or deletions.
* **Direct Event Drive Folder Navigation:**
  * Added `folderUrl` to `generateForm()`'s return object and updated `Sidebar.html` to render a direct `📁 View Event Drive Folder` link in the success modal.
* **Audit Trail Enhancement (`Drive Folder URL`):**
  * `appendAuditLog()` automatically injects and populates a new `Drive Folder URL` column (Column I) in the `System Log` sheet.
* **1-Click Menu Configuration:**
  * Added **USGA Events > Advanced Maintenance > Configure Delegated Web App URL** to easily manage and activate the deployment URL from the Google Sheets UI.

---

## Comparison: V2.8 vs. V2.9 / V2.9.1

| Feature / Area | Version 2.8 | Version 2.9 / V2.9.1 |
|---|---|---|
| **Multi-Child Registration** | Overwrote earlier sibling rows | **Composite key matching `(First + Last + Email)` creates separate rows** |
| **Waitlist Calculation** | Simple row index comparison | **Dynamically ignores rejected and waitlisted rows; preserves spots on edit** |
| **Email Failure Logging** | Silent failure / blank status | **Writes exact error to `Email Status` (`Delivery Failed: ...`)** |
| **Shared Drive Subfolder Placement** | Failed silently if sheet was at root of Shared Drive | **Automatic fallback to Shared Drive root ID (`0AJ4t2YKTRQHWUk9PVA`)** |
| **Coordinator Permission Model** | Required manual "Content Manager" role on entire Shared Drive | **Delegated Web App execution: automatic Editor access scoped strictly to event folder** |
| **Event Drive Folder Navigation** | Required hunting through Google Drive folders | **Clickable `📁 View Event Drive Folder` in UI and `System Log`** |
| **Active Events Sidebar** | Basic input form | **Live status badge, capacity tracker, quick links, force open/close, archive** |
| **Trigger Decommissioning** | Manual deletion in script editor | **One-click "Archive Event" & automated 3-day post-event cron release** |
| **Field Selection UX** | Manual scrolling through 77 fields | **Real-time search bar & category-level "Select All" / "Clear"** |
| **Generation Speed** | ~45–60 seconds | **~10–15 seconds (~70% speedup via `_translationCache` & expanded dict)** |
| **Sheet Builder Code** | Duplicated in generator and upgrade tool | **Consolidated into modular, reusable builder functions** |
| **Transportation Sort** | Flight/airline grouping first | **Chronological first: Date (Col 6) then Time (Col 7)** |
| **Demographics Formula** | `*Male*` matched both males and females | **Prefix `"Male*"` and `"Female*"` accurately isolates genders** |
| **Sleep Preferences** | Mirrored total; searched "Night owl" | **Multi-criteria `COUNTIFS`, searches `"Late sleeper"`, dynamic `=SUM(B:C)`** |
| **Bilingual Church Lodging** | Checked exact `"Yes"` (returned 0) | **Prefix `"Yes*"` / `"No*"` accurately counts `"Yes 是"` / `"No 否"`** |
| **Airport Summary** | Arbitrary output order | **Sorted descending by passenger count (`ORDER BY COUNT(...) DESC`)** |
| **Concurrency Protection** | None | **`LockService` on trigger setup, submission sync, toggles, and cron** |

