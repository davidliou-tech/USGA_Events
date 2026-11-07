# USGA Event Registration Form Generator

Comprehensive Google Apps Script suite powering automated event registration, Google Forms generation, live dual-sheet transportation dispatching, lodging and room inventory management, printable check-in rosters, and registration lifecycle automation for True Jesus Church (USGA) events.

---

## Key Capabilities

- **Automated Google Form Generation**:
  - Dynamically builds bilingual (English / Traditional Chinese) Google Forms from standardized templates (*CYSC*, *SSC*, *YASC*, *NCC*, *Ministers Workshop*, *NEWW*, *NMCW*).
  - Handles complex conditional branching (Flight vs. Train/Bus vs. Car arrival/departure), minors compliance consent flows, and legal liability waivers.
- **Dedicated Response Workbooks**:
  - Automatically provisions linked response spreadsheets with pre-configured sheets:
    - `Summary Dashboard`: Real-time KPI summaries, demographics, sleep habits, dietary needs, and room capacities.
    - `Logistics`: Check-in demographics, local church affiliation, and host church stay status.
    - `Lodging`: Dedicated rooming roster filtering for participants staying at the host church with live cancellation and modification tracking.
    - `Room Inventory`: Building/room capacity tracking, dynamic remaining spots, and live occupant rosters.
    - `Check-In`: Print-ready (8.5" × 11" / tablet) attendance sheet with interactive check-in and welcome gift checkboxes.
    - `Change Log`: Audit trail recording timestamped before-and-after diffs for lodging and transit updates.
    - `Pickup` & `Drop-Off`: Internal coordinator transit master sheets with one-click copy-ready dispatch SMS generation.
- **Dual-Sheet Transportation Sync**:
  - Decouples coordinator logistics from public volunteer drivers via a dedicated Public Driver Signup Workbook.
  - Masks attendee names and withholds contact PII while dynamically packing families and arrival clusters into vehicle slots using First-Fit-Decreasing bin packing.
- **Registration Lifecycle & Capacity Automation**:
  - Scheduled registration windows (`regStartDate` to `regEndDate`) with automatic opening and closing.
  - Automatic form closure as soon as the event itself begins (`eventStart`).
  - Active event management via sidebar (`Manage Active Events`) with live attendee capacity tracking and waitlist routing.
  - Automatic background quota cleanup releasing Apps Script submit triggers for closed/ended events.

---

## File Structure

- `Code.gs`: Core backend engine covering form generation, lifecycle crons, audit tools, response spreadsheet setup, and menu actions.
- `Sidebar.html`: Main event creation UI sidebar (and wide modal dialog).
- `ManageEventsSidebar.html`: Active event management interface for adjusting windows, capacities, coordinator emails, lodging, and driver sheets.
- `TransportationSync.gs`: Bidirectional dual-sheet sync engine for volunteer driver rosters and vehicle slot assignments.
- `RELEASE_NOTES.md`: Comprehensive historical changelog across all versions.

---

## Recent Updates

See [`RELEASE_NOTES.md`](file:///Users/mbpliou5/Documents/USGA%20Projects/RELEASE_NOTES.md) for complete version history and details on the latest releases (v2.10.1 and v2.10.0).
