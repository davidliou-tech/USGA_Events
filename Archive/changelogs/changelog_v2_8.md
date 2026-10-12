# USGA Event Registration Form Generator - Changelog V2.8

## Overview
Version 2.8 represents a major release focusing on child protection workflows, end-to-end Train/Bus travel logistics support, dual-window user interfaces, automated settings synchronization across response spreadsheets, enhanced date/time display, and hardened trigger and lifecycle management.

---

## 1. Dual Interface Access (Sidebar & Wide Modal Dialog)
- **Menu Additions (`onOpen`):**
  - Updated the default generator menu item to **Open Form Generator (Sidebar)**.
  - Added a new menu action **Open Form Generator (Wide Window)**, enabling users to launch the generator in an expanded popup.
- **Sidebar Dimensions (`showSidebar`):**
  - Expanded sidebar width from `300px` to `350px` for improved readability of long template and field names.
- **New Modeless Dialog Window (`showDialog`):**
  - Added `showDialog()` which opens `Sidebar.html` inside a `500x750px` modeless dialog, giving coordinators a spacious canvas to review fields and options.

---

## 2. Response Sheet Settings Synchronization (`updateMonitoredEvent`)
- **Real-Time Response Sheet Sync:**
  - When an event's configuration (such as Contact Email) is updated via the **Manage Active Events** sidebar, `updateMonitoredEvent()` now retrieves the form's destination spreadsheet (`form.getDestinationId()`).
  - If a destination sheet exists, it automatically updates cell `B4` on the `Settings` tab with the updated `ContactEmail`, ensuring outgoing email receipts and coordinator contacts remain synchronized without manual spreadsheet edits.

---

## 3. Date, Time & Registration Window Enhancements
- **Automated Default Registration Times:**
  - Added fallback rules in `generateForm`: if no specific time is provided or if the input ends with `T00:00`, registration start defaults to `T00:01` (12:01 AM) and registration close defaults to `T23:59` (11:59 PM).
- **Time-Aware Event Date Formatting (`formatDt` / `formatDtZh`):**
  - Refactored `formatDt` and `formatDtZh` to parse dates via `parseLocalDate()`.
  - Added dynamic time extraction: if time is present (`T`), it formats the hour/minute with 12-hour AM/PM notation (English: `Day, MM/DD/YYYY, H:MM AM/PM`; Chinese: `MM/DD/YYYY (星期X) 上午/下午 H:MM`).
- **Day-of-Week in Registration Windows (`formatRegDt` / `formatRegDtZh`):**
  - Registration window dates now display the day of the week in both English (`Sunday, MM/DD/YYYY`) and Traditional Chinese (`MM/DD/YYYY (星期日)`).
- **Timezone Awareness & Timestamp Precision:**
  - Saved event configurations in `FormsToMonitor` now track the coordinator's timezone (`payload.eventDetails.userTimeZone || Session.getScriptTimeZone()`).
  - Added support for explicit epoch millisecond timestamps (`regStartTimestamp`, `regEndTimestamp`).
- **Dynamic Script Timezone:**
  - Replaced hardcoded `"GMT-7"` timezone strings in `masterRespondToRegistration` and `appendAuditLog` with `Session.getScriptTimeZone()`.

---

## 4. Minor Events & Child Protection Workflow Overhaul
- **Strict Minor / Adult Field Segregation:**
  - Non-minor events: Any field referencing `Parent/Guardian` is automatically stripped from the form.
  - Minor events: Redundant `Emergency Contact Evening Phone` is purged to simplify emergency contact info.
- **Automated Age & Parent/Guardian Placement:**
  - Automatically identifies or injects the `Age` field, sets it to required under `Personal & Contact Info`, and positions it right before `Class to attend` or `Grade (As of September)`.
  - Automatically positions `Name of Parent/Guardian (if Participant is under 18)` directly beneath `Age` in `Personal & Contact Info` (required).
  - Automatically updates the `Personal & Contact Info` section header to `"Event Participant’s Information"`.
  - Enforces `Sleeping Bag/Pillow` and `Parent/Guardian` as required fields, while making `Train/Bus` fields optional for youth events.
- **Dedicated Field Renderers in `addFieldToForm`:**
  - **Age Validation:** Added integer number validation (`requireNumberBetween(1, 99).requireWholeNumber()`) with instructional prompt: *"Please enter a whole number between 1 and 99."*.
  - **Parent/Guardian Guidance:** Attached explanatory help text: *"If participant is over 18, enter 'N/A'."*.
  - **Minor's Email Consent:** Added dedicated help text clarifying that providing a minor participant's email (ages 13+) authorizes church coordinators to send essential event logistics.
- **Email Recipient Safety:**
  - In `masterRespondToRegistration`, checks that typed email questions do not contain `"minor"`, ensuring confirmation receipts and edit links are delivered to parents/guardians rather than minor attendees.

---

## 5. End-to-End Train & Bus Travel Logistics
- **Form Page Navigation Branching:**
  - Added form page breaks for `Arrival Train/Bus Details` (`arrivalTrainSection`) and `Departure Train/Bus Details` (`departureTrainSection`).
  - `Arrival Details` multiple choice options dynamically route:
    - *"I am arriving by train/bus"* &rarr; `arrivalTrainSection`
    - *"I am arriving by flight"* &rarr; `arrivalFlightSection`
    - *"I am arriving by car"* / *"I do not need pickup"* &rarr; next non-travel section
  - `Departure Details` multiple choice options dynamically route:
    - *"I am departing by train/bus"* &rarr; `departureTrainSection`
    - *"I am departing by flight"* &rarr; `departureFlightSection`
    - *"I am departing by car"* / *"I do not need dropoff"* &rarr; consent & waivers section
- **Transportation Sheets Architecture (`Pickup` & `Drop-Off`):**
  - Added dedicated columns for `Station`, `Carrier`, and `Train/Bus Number` on both sheets.
  - Implemented dynamic status column indexing (`hasTrainBusCols`), seamlessly accommodating both legacy 12-column and new 15-column schemas.
- **Automated Sync & Row Styling:**
  - `masterRespondToRegistration` processes both flight and train/bus arrivals/departures (`isFlightArr || isTrainArr`, `isFlightDep || isTrainDep`).
  - Detects changes across train/bus data fields on edits, applying light yellow highlighting (`#fff2cc`) with amber font (`#b45f06`) for updated records, and light red background (`#f4cccc`) with strikethrough for cancellations.

---

## 6. Response Sheets, Summaries & Upgrade Tool
- **Summary Dashboard:**
  - Added tracking metrics for `Arriving by Train/Bus` and `Departing by Train/Bus`.
  - Added `Lodging Before Event` and `Lodging After Event` summary formula rows.
- **Airport Summary Formula Optimization:**
  - Refactored `QUERY` formula to use bounded array syntax `{'Form Responses 1'!A2:ZZ}` with header count `0`, resolving empty/corrupted query output on fresh sheets.
  - Removed duplicate Airport Summary creation block from `generateForm`.
  - Airport Summary sheet creation now triggers whenever any airport or travel logistics field is selected.
- **Upgrade Existing Sheet Tool (`upgradeExistingSheet`):**
  - Added `Airport Summary` to the list of backed-up tabs (`Airport Summary_Old`).
  - Upgrades historical spreadsheets to include train/bus tracking columns, parent/guardian headers, and the optimized airport summary formulas.

---

## 7. Lifecycle Cron & Closed Message Automation
- **Dynamic Closed Form Messages:**
  - In `masterFormLifecycleCron`, when a form opens or closes, it dynamically reads the custom pre-registration (`B2`) or post-registration (`B3`) message from the linked `Closed Form Messages` tab and sets `form.setCustomClosedFormMessage()`.
  - In `generateForm`, if an event is generated outside its registration window, it immediately marks the form as not accepting responses and sets the custom closed message.

---

## 8. Quota & Trigger Safety
- **Targeted Auto-Archiver Cleanup:**
  - The 18-trigger safety check in `generateForm` now specifically targets `masterRespondToRegistration` triggers, preventing accidental deletion of the hourly `masterFormLifecycleCron` trigger.
- **Cron Trigger Deduplication (`cleanupDeadTriggers`):**
  - Identifies and deletes duplicate `masterFormLifecycleCron` triggers so only one hourly cron remains active.
- **Complete Reset (`deleteAllTriggers`):**
  - Now deletes the `FormsToMonitor` script property alongside trigger removal, preventing ghost monitoring after resets.

---

## 9. Master Templates, Field Dictionary & Localization
- **Template Adjustments:**
  - **Ministry Volunteer Program (MVP) Workshop:** Removed `Birth year` from the template.
  - **Student Spiritual Convocation (SSC):** Replaced `Name of Parent/Guardian` immediately after `Age`.
  - Fixed trailing double semicolon typo (`];;`) in `setupTemplates`.
- **Field Dictionary:**
  - Updated default multiple-choice options for `Arrival Details` and `Departure Details` to include Train/Bus options.
- **Chinese Translations (`translateText`):**
  - Added translations for Train/Bus travel choices, stations, carriers, and train numbers.
  - Added translations for `Age` ('年齡'), `Parent/Guardian` ('家長/監護人姓名（若參加者未滿18歲）'), N/A guidance ('若參加者年滿 18 歲以上，請填寫「N/A」。'), and age range validation prompts.
- **Plural vs. Singular Preferred Airport(s):**
  - Form description dynamically displays `𝗣𝗿𝗲𝗳𝗲𝗿𝗿𝗲𝗱 𝗔𝗶𝗿𝗽𝗼𝗿𝘁𝘀:` if multiple airports are configured, or `𝗣𝗿𝗲𝗳𝗲𝗿𝗿𝗲𝗱 𝗔𝗶𝗿𝗽𝗼𝗿𝘁:` if only one.
