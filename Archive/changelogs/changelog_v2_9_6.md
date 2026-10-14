# USGA Event Registration Form Generator - Changelog V2.9.6

## Overview
Version 2.9.6 addresses runtime critical blockers, operational edge cases, and concurrency bottlenecks identified during code audit. It eliminates fatal runtime exceptions in form generation, restores corrupted UI arithmetic and template literals in HTML sidebars, corrects dead-code field type evaluations, hardens rejection and waitlist isolation on operational rosters, prevents multi-child edit link collisions, resolves archived event resurrection, protects against ScriptProperties 9KB quota limits, adds automatic 20-trigger quota reclamation, accelerates upgrade/sync tools via batch writes, enforces 22-column transportation schema validation, adds Web App authentication guards, and renders active browser timezone indicators.

---

## 1. Critical Runtime Blockers & Syntax Bug Fixes
* **Missing Variable Declarations in `generateForm()`:**
  * Fixed `ReferenceError: hasBefore is not defined` by explicitly declaring `hasBefore` and `hasAfter` before checking lodging selection fields.
* **Corrupted JavaScript Syntax in HTML Sidebars:**
  * Restored arithmetic subtraction operators (`-`) in date calculations and capacity countdowns (`m - 1`, `idxA - idxB`, `max - count`) and corrected multiline string formatting in `Sidebar.html` and `ManageEventsSidebar.html`.
* **Field Type Hierarchy Ordering in `addFieldToForm()`:**
  * Reordered specific field handlers (`Food/Medicine Restrictions`, `Interpretation Language`, and `Other Special Needs/Accommodations`) above generic `short answer`, `paragraph`, and `dropdown` checks so their custom help texts and configurations are applied.

---

## 2. High-Priority Operational Logic & Privacy
* **Early Evaluation of Medical Consent Rejection & Waitlist:**
  * In `masterRespondToRegistration(e)`, evaluations for `isRejected` (`Medical Consent = No`) and `isWaitlisted` now run prior to any operational roster sync.
  * Rejected applicants are prevented from consuming room inventory or entering active driver queues. Switching consent to "No" on edit automatically cancels existing rows across all sheets.
  * Waitlisted attendees receive `WAITLISTED` status across `Pickup`, `Drop-Off`, `Lodging`, and `Logistics` and are excluded from public volunteer driver signup rosters until promoted.
* **Multi-Child `editResponseUrl` Disambiguation:**
  * In `masterRespondToRegistration(e)`, the reverse response lookup checks both `First Name` (and `Last Name`) via `matchesParticipantRecord()` alongside parent email, ensuring siblings sharing a parent email receive their own unique edit link.
* **Archived Events Resurrection Prevention:**
  * `syncActiveEventsFromSystemLog()` skips rows marked `"Archived"` in `System Log` and checks `ArchivedFormIds`. `getMonitoredEvents()` only triggers automatic synchronization when `FormsToMonitor` is completely empty.
* **ScriptProperties 9KB Quota Protection:**
  * Stores compact file IDs (`sheetId`, `pubTransId`) rather than long Google Docs URLs in `FormsToMonitor`, reducing JSON property size by ~65% and preventing quota exhaustion.
* **Apps Script 20-Trigger Hard Limit Management:**
  * `masterFormLifecycleCron()` auto-deletes spreadsheet-level `masterRespondToRegistration` triggers 14 days after registration closes, reclaiming project trigger quota without deleting event records.
* **Public Form Description Privacy:**
  * Removed unlinked `"Attendees: View Here"` text from the public form description to prevent attendee roster disclosure.

---

## 3. Concurrency, Data Integrity & Performance
* **Atomic `LockService` with Fast Release in `masterRespondToRegistration(e)`:**
  * Status evaluation and sheet updates are protected with `LockService.getScriptLock()` (30s timeout).
  * Writes preliminary statuses (`"Confirmed - Sending..."`, `"Waitlist - Sending..."`, `"Rejected - Sending..."`), updates operational sheets, flushes changes, and **releases the lock before invoking FormApp and GmailApp/MailApp**, eliminating lock contention during network delivery.
* **Batch `setValues()` in Migration & Sync Tools:**
  * Replaced sequential `appendRow()` loops in `upgradeExistingSheet()` and `syncLodgingAndRoomsForSheet()` with batch `.setValues()` writes, eliminating 6-minute script execution timeouts on large events.
* **Preserved Dynamic Building Lookup Formulas:**
  * `upgradeExistingSheet()` guarantees `getBuildingLookupFormula()` is written into the `Building` column, ensuring live `Room Inventory` lookups remain dynamic.
* **Full 22-Column Schema Initialization for Transportation:**
  * Implemented `buildFullTransportationRow()`, guaranteeing new records on `Pickup` and `Drop-Off` populate all 22 columns with `Coordinator Status` defaulted to `"Unassigned"` to satisfy strict data validation rules.
* **Web App Security & Timezone Clarity:**
  * `doPost(e)` validates that `coordinatorEmail` ends with the authorized domain (`@tjc.org` or configured `ALLOWED_EMAIL_DOMAIN`) and checks optional `WEB_APP_SECRET_TOKEN`. `generateForm()` forwards `secretToken` during delegated execution.
  * Added live timezone labels (`Intl.DateTimeFormat().resolvedOptions().timeZone`) next to date/time pickers in both sidebars to prevent cross-timezone confusion.
