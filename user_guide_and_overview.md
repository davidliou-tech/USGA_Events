# USGA Event Registration System: Overview & User Guide

This guide provides event coordinators with an overview and practical instructions for creating, launching, and managing event registration forms using the USGA Event Registration System.

---

## What the System Does

The USGA Event Registration System automates the setup and logistical tracking for church events (such as Student Spiritual Convocations, National Seminars, and Fellowship Conferences). In just a few clicks, it creates:

1. **A Custom Google Form:** Tailored with your event title, dates, descriptions, and required registration questions (with optional bilingual English/Traditional Chinese translations).
2. **A Linked Response Spreadsheet:** A pre-configured tracking workbook featuring automated rosters for transportation, lodging, dietary needs, and real-time summary dashboards.
3. **A Dedicated Google Drive Folder:** Automatically created inside the official USGA Drive root and shared with you as an Editor.
4. **Automated Confirmation Emails:** Sends branded registration confirmations to attendees upon submission.

---

## Key Features for Event Coordinators

* **Dual Interface Modes:** Launch the generator as a side-panel sidebar or as a wide popup window for a spacious view of all questions.
* **Instant Field Search & Batch Selection:** Quickly find fields using the search bar (e.g., search *"T-shirt"*, *"Airport"*, or *"Lodging"*) and use **Select All** or **Clear** buttons on any category.
* **Multi-Child / Sibling Support:** Parents can register multiple children using the same contact email address. Each child automatically gets their own dedicated row across the transportation and lodging sheets.
* **Automated Drive Organization & Access:** The system automatically places your event files into a dedicated event folder within the official USGA Shared Drive and grants you Editor access.
* **Live Event Monitoring & Capacity Management:** Use the **Manage Active Events** tool to view registration counts, monitor remaining spots, change deadlines, or manually open/close forms.
* **Volunteer Driver & Rooming Worksheets:** Flight, train, and bus arrivals/departures are automatically grouped chronologically. You can assign volunteer drivers and room numbers directly in the spreadsheet without breaking automated sorting.
* **Public Driver Signup Sheet (Optional, V2.9.5):** Generate a separate, privacy-safe Google Sheet where church volunteers claim airport rides. It shows masked passenger names only (no phone numbers or emails), splits large arrivals into cars of up to 4, keeps families together, and combines flights landing within 30 minutes. Claims sync back to your private `Pickup` / `Drop-Off` tabs.

---

## How to Use the System

The operational workflow is divided into three key areas: generating a new form, managing an active event, and tracking event logistics.

### 1. Generating an Event Registration Form

Follow these five steps in the Form Generator to create a complete registration form and tracking spreadsheet:

* **Step 1: Open the Form Generator**
  1. Open the Master USGA Form Generator Google Sheet.
  2. In the top navigation menu, click **USGA Events > Open Form Generator (Sidebar)** (or **Open Form Generator (Wide Window)**).

* **Step 2: Configure Event Information**
  * **Event Template:** Select your event type (e.g., *Student Spiritual Convocation (SSC)*, *National Youth Ministry Conference (NYMC)*, or *General Event*).
  * **Region, Season & Year:** Selecting these will automatically generate the official event title.
  * **Classes (SSC only):** Check the specific student levels attending (e.g., E2, J1, J2, S1).
  * **Includes Minors:** Switch this toggle to **ON** if your event includes attendees under 18. This automatically includes youth safeguarding policies, parental consent, and emergency contact fields.
  * **Contact Email:** Enter your official coordinator email or group alias (e.g., `us.events@tjc.org`).

* **Step 3: Set Dates and Capacity**
  * **Event Dates:** Enter the official Start and End dates for the event.
  * **Registration Window:** Set the dates and times when registration should automatically open and close.
  * **Max Attendees:** Enter the maximum capacity limit for your event.

* **Step 4: Choose Form Questions**
  * The generator pre-selects recommended fields based on your chosen template.
  * **Search / Filter:** Type in the **🔍 Filter fields** search box to quickly locate specific fields.
  * **Customize:** Use category **Select All** or **Clear** links, or check/uncheck individual questions to match your event's exact needs.

* **Step 5: Generate Form & Sheet**
  1. Click the green **Generate Form & Sheet** button.
  2. A progress indicator will display while the system creates your files (~10–15 seconds).
  3. Once complete, a success window provides one-click links to your new assets:
     * 🌐 **Responder Link (Live Form):** The link you share with participants to register.
     * ✏️ **Edit Form:** Opens Google Forms to customize the theme color, banner image, or question wording.
     * 📊 **View Response Sheet:** Opens the response tracking spreadsheet.
     * 📁 **View Event Drive Folder:** Opens your dedicated event folder in Google Drive where all your event files are stored.

### 2. Managing Active Events

You can manage your event at any time after generation by clicking **USGA Events > Manage Active Events** in the top menu.

* **Check Live Status & Capacity:** Select your event from the dropdown to see real-time registration counts, remaining spots, and current status:
  * 🟢 **OPEN:** Registration is live and accepting submissions.
  * 🟡 **SCHEDULED:** Registration is configured and will open automatically on your scheduled start date.
  * 🔴 **CLOSED:** Registration has closed or reached maximum capacity.
* **Sync Missing Events:** If an event previously created does not appear in your dropdown list, click **🔄 Sync Events** at the top of the sidebar (or run **USGA Events > Advanced Maintenance > Sync Active Events from System Log**).
* **Quick Links:** Open the Live Form, Edit Form, or Response Sheet with a single click.
* **Update Deadlines or Capacity Caps:** Modify the event dates, registration window, or attendee limit, then click **Save Changes**.
* **Manually Open or Close:** Click **Open Form Now** to open registration early, or **Force Close Form** to stop accepting submissions immediately.
* **Archive Completed Events:** When an event is finished, click **Archive Event**. This safely closes the form and unregisters it from the live monitoring system while keeping all your forms, spreadsheets, and registration records completely safe.

### 3. Managing Event Logistics (Spreadsheet Overview)

When attendees register, their data automatically populates the specialized tabs in your event response spreadsheet:

* **Pickup & Drop-Off Sheets (Transportation):**
  * Inbound and outbound travel records are added automatically and sorted chronologically by **Date then Time**.
  * **Assigning Drivers:** Enter volunteer driver names directly into the *Driver Full Name* and *Driver Phone Number* columns next to the passenger, or let volunteers claim rides on the public driver sheet (below). Assignments stay linked to the passenger even as new attendees register and the list updates.
  * **V2.9.5 columns:** `Trip Sub-ID`, `Vehicle Slot`, `Driver Vehicle / Notes`, `Coordinator Status` (dropdown for your tracking), and `One-Click Dispatch SMS Text`.
  * **Manual communication only:** The system does **not** send assignment emails or texts to drivers or passengers. Copy the dispatch text from the last column and send it yourself via SMS, WhatsApp, LINE, or WeChat, then mark the row `Confirmed / Contacted`.

* **Public Driver Signup Sheet & Driver Roster (Optional):**
  * In **Manage Active Events**, select the event and use the **🚗 Transportation & Drivers** card: **📋 Setup Public Sheet** creates the sheet (in the event's Drive folder) and **🔄 Sync Drivers** refreshes it. A link to the public sheet appears once created.
  * Volunteers can edit only the driver name, phone, vehicle, and notes columns. Share only this link with volunteers, never the master spreadsheet.
  * A **Driver Roster** tab groups each driver's runs, passengers, and phone for easy review.
  * **Opt-in per event:** Nothing changes on existing or live events until you set up the public sheet for that event. To enable an older event, use **USGA Events > Transportation & Drivers > Enable Public Transportation for Event (by Sheet URL)**.
  * Late flight changes or cancellations update the public sheet on the next sync, but drivers are not notified automatically, so check `Driver Roster` and contact them.

* **Logistics Sheet (General Roster, Medical/Dietary & Group Assignments):**
  * Lists all participants for on-site registration check-in, dietary restrictions (`Food/Medicine Restrictions`), mobility needs, and parental/emergency contacts.
  * **Staying at Host Church? Column:** Clear visual badges highlight on-site attendees (soft green) vs. commuters/hotel attendees (soft gray).
  * **Team/Group Assignment:** Assign discussion, workshop, or fellowship teams in the *Group/Team* and *Notes* columns.

* **Lodging Sheet (Dedicated Host Church Rooming):**
  * Automatically filters to **only participants staying at the host church** (keeping the lodging view clean and uncluttered by non-lodging registrants).
  * Consolidates all lodging-specific questions: arrival/departure lodging dates, sleeping bag/pillow requests, sleep preferences & habits, and special accommodations.
  * **Room Assignment Dropdown:** Linked directly to the *Room Inventory* sheet. Selecting a room automatically displays the building and updates room capacity counts. If a participant later changes their response to self-arranged lodging, their row is marked `CANCELLED` with a strikethrough so their room spot is freed up immediately.
  * **Manual Columns:** Assign *Room Assignment*, *Building*, *Bed / Spot*, and *Lodging Notes* without interfering with automated registration sorting.

* **Room Inventory Sheet (Host Church Building & Sleeping Arrangements Planner):**
  * A dedicated sheet where host church logistics teams define their physical facility: *Building Name*, *Room Name / #*, *Gender / Designation* (Male, Female, Family, Staff, Any), *Max Capacity*, and *Room Notes*.
  * **Live Capacity Tracking:** Pre-built formulas automatically calculate *Assigned Count* and *Remaining Capacity* (green when spots are open, yellow when full, and bold red if over-capacity).
  * **Live Room Rosters:** Column I (*Assigned Occupants*) automatically lists every person assigned to each room in real time.
  * **Importing Existing Room Lists:** Host churches can either copy-paste their room lists directly into Columns A–E of *Room Inventory*, or coordinators can use the **Import Host Church Rooms** tool in **Manage Active Events** (or **USGA Events > Advanced Maintenance**) to import from an external Google Sheet URL in seconds.

* **Summary Dashboard & Airport Summary:**
  * **Summary Dashboard:** Provides at-a-glance charts and counts for gender breakdowns, meals, church lodging requests, total room capacity vs. assigned occupants, and dietary needs.
  * **Airport Summary:** Summarizes passenger arrival and departure volumes by airport code so you can schedule shuttles efficiently.

---

## Event Coordinator Launch Checklist

Before sharing your registration link with members:

- [ ] **Contact Mailbox:** Confirm you are authorized to send from the Contact Email alias in Gmail so automated confirmation emails send without interruption.
- [ ] **Registration Dates:** Double-check that registration start and end times accurately match your announcements.
- [ ] **Includes Minors Setting:** Verify that parental consent and emergency contact questions are included if minors are attending.
- [ ] **Form Branding & Welcome Text:** Open the **Edit Form** link to adjust the header theme color, add your local church welcome message, or upload a promotional banner image.
- [ ] **Attendee List Publishing (Optional):** If attendees should be able to see who else is registered:
  1. Open the response spreadsheet.
  2. Click **File > Share > Publish to web**.
  3. Select the `Participants` sheet and click **Publish**.
  4. Paste the published link into the Google Form description.
  *(If registration is confidential, leave the link out of the description).*
- [ ] **Bilingual Forms Proofread:** For events with Traditional Chinese enabled, review the translated questions to ensure local dialect preferences are met.
