# USGA Event Registration Form Generator - Comprehensive Release Notes

This document provides a complete, unified historical record of all versions, feature additions, architecture enhancements, and bug fixes for the **USGA Event Registration Form Generator** suite (`Code.gs`, `Sidebar.html`, `ManageEventsSidebar.html`, and related templates/dictionaries).

---

## Table of Contents
- [Version 2.9.2 (Current) - Maintenance & Lifecycle Optimization](#version-292)
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

<a name="version-292"></a>
## Version 2.9.2
*October 2026*

### Enhancements & Refinements
- **Parent/Guardian Guidance**:
  - Updated help text across all templates and generated forms for the `Name of Parent/Guardian` field to explicitly clarify: *"If participant is 18 or above, enter 'N/A'."*
  - Synchronized bilingual Traditional Chinese translation string (`若參與者年滿 18 歲以上，請填寫「N/A」`).
- **Lodging Formula & Header Compatibility (Summary Dashboard & Logistics)**:
  - **Summary Dashboard Lodging Formulas**: Enhanced `cLodgingMatch` in `setupSummaryDashboard()` to dynamically support both modern standard questions (`I will be staying at the hosting church.` / `Yes*`/`No*`) and legacy/historical event questions (e.g. `Lodging Arrangement 住宿安排` / `*host church*` vs. `*self*`, plus Traditional Chinese variants `*主辦教會*` / `*自行安排*`). Eliminates zero-counts when analyzing events created prior to recent schema standardizations.
  - **Logistics Sheet Mapping**: Added `Lodging Arrangement` and `住宿安排` to `optionalHeadersMap` in `setupLogisticsSheet()` and automated synchronization handlers (`masterRespondToRegistration` and `upgradeExistingSheet()`), ensuring legacy lodging answers correctly flow into the `Staying at Host Church?` column.
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
