# Host Church Google Sheets Navigation & Logistics Guide

This guide is designed for **Host Church Coordinators, Hospitality Teams, and Logistics Volunteers** managing an event created with the **USGA Event Registration System**. 

The Event Response Spreadsheet is an automated, real-time command center that connects directly to the live Google Registration Form. When members register or update their information, their responses automatically populate and update the appropriate worksheets.

---

## Quick Navigation: Workbook Sheet Overview

Your event spreadsheet contains several specialized tabs. Each tab serves a dedicated logistical purpose:

| Sheet Tab | Purpose & Workflow | Who Uses It |
| :--- | :--- | :--- |
| **`Room Inventory`** | **Facility & Sleeping Arrangements Planner:** Enter your building names, room names, gender designations, and max capacities. Automatically tracks assigned occupants and remaining capacity. | Host Church Lodging Coordinator |
| **`Lodging`** | **Dedicated Church Lodging Roster:** Filtered to *only* participants staying at the host church. Contains sleep habits, lodging dates, bedding requests, and room assignment dropdowns. | Host Church Lodging Team |
| **`Logistics`** | **General On-Site Roster & Grouping:** Master list of all attendees for event check-in, dietary restrictions, special needs, emergency contacts, and discussion `Group/Team` assignments. | General Coordinator, Food / Kitchen Team, Program Leads |
| **`Pickup`** | **Inbound Airport & Transit Roster (private):** Flight, train, and bus arrivals sorted chronologically. Shows driver claims synced from the public signup sheet, a `Coordinator Status` dropdown, and a copy-ready dispatch text per run. | Transportation Coordinator |
| **`Drop-Off`** | **Outbound Airport & Transit Roster (private):** Same layout as `Pickup` for departures. | Transportation Coordinator |
| **`Driver Roster`** | **Volunteer Driver Summary:** Created by the transportation sync. Groups every run by driver name, with phone, run count, passenger count, and schedule. | Transportation Coordinator |
| **`Summary Dashboard`** | **Real-Time Event Statistics:** Instant counts of total registrants, meal counts, dietary restrictions, airport shuttle volumes, and room capacity vs. assigned occupants. | Lead Event Coordinators & Pastors |
| **`Airport Summary`** | **Airport Breakdown:** Counts arrivals and departures grouped by airport code to plan large van/bus shuttle runs. | Transportation Team |
| **`Participants`** | **Public Attendee List:** Simple roster of registered participants (safe to publish to web so members know who is attending). | Registrants / Public |
| **`Form Responses 1`** | **Raw Data Vault:** Unedited form submissions directly from Google Forms. *(Do not edit or delete).* | System / Archive |

---

## 1. Facility & Sleeping Arrangements: `Room Inventory`

The **`Room Inventory`** tab is where the host church defines its physical facilities. It acts as the master directory for all dorms, classrooms, and hotel rooms.

```
+-----------------------------------------------------+-------------------------------------------------------+
|        HOST CHURCH INPUT (Columns A - E)            |          AUTOMATED TRACKING (Columns F - I)           |
| (Forest Green Headers #137333 with Hover Tooltips)  |          (Blue Headers #4a86e8 - Do Not Edit)         |
+-----------------------------------------------------+-------------------------------------------------------+
| Building | Room Name | Gender / Type | Cap | Notes  | Room Key | Assigned | Remaining | Assigned Occupants   |
+-----------------------------------------------------+-------------------------------------------------------+
```

### Columns A – E: Host Church Input (Forest Green Headers)
Each header has a **hover comment box (cell note)** with plain-language guidance:

* **Column A (`Building Name`):** The facility or wing where the room is located (e.g., `Main Church`, `Education Annex`, `Fellowship Hall`, `Hotel`). *If your church only has one building, you can enter "Main Church" or leave it blank.*
* **Column B (`Room Name / #` - Required):** The specific room number or name (e.g., `Room 101`, `Classroom 2B`, `Brothers Dorm A`, `Nursery / Cry Room`). Once typed here, this room immediately appears in the dropdown on the `Lodging` sheet!
* **Column C (`Gender / Designation`):** Select who the room is reserved for from the dropdown:
  * `Male / Brothers` (Men & boys)
  * `Female / Sisters` (Women & girls)
  * `Family / Couples` (Families or parents with infants)
  * `Counselors / Staff` (Ministers, teachers, or event staff)
  * `Flexible / Any` (Can be assigned dynamically as needed)
* **Column D (`Max Capacity` - Numbers Only):** The maximum number of people who can sleep in this room. Include all beds, bunks, cots, and available floor mattress spots (e.g., `4`, `8`, `12`).
* **Column E (`Room Features / Notes`):** Any special features (e.g., `1st Floor (wheelchair accessible)`, `Private bathroom`, `2 bunks + 2 floor mattresses`, `Quiet room`).

### Columns F – I: Automated Live Tracking (Blue Headers)
Do not edit these columns—they calculate in real time as rooms are assigned on the `Lodging` sheet:

* **Column F (`Room Assignment Key`):** Automatically combines `Building Name - Room Name / #`. This exact text is what appears in the `Room Assignment` dropdown on the `Lodging` tab.
* **Column G (`Assigned Count`):** Automatically counts active participants assigned to this room on the `Lodging` tab.
* **Column H (`Remaining Capacity`):** Calculates remaining open sleeping spots (`Max Capacity - Assigned Count`) with instant color warnings:
  * 🟢 **Green Background:** Open spots available (`> 0`).
  * 🟡 **Yellow Background:** Room is full (`0` spots left).
  * 🔴 **Bold Red Background:** Room is over capacity! More people have been assigned than the room can hold.
* **Column I (`Assigned Occupants (Live Roster)`):** Automatically displays a comma-separated list of the full names of everyone assigned to that room in real time.

### How to Import an Existing Host Church Room Sheet
If your church already has a Google Sheet listing your rooms:
1. **Option 1 (Copy-Paste):** Simply copy your room list and paste it into Columns A–E of `Room Inventory`. The automated tracking columns (F–I) will activate immediately.
2. **Option 2 (One-Click Import Tool):**
   * Open the Master USGA Form Generator sheet.
   * Click **USGA Events > Manage Active Events**, select your event, and scroll to **🏨 Lodging & Room Inventory**.
   * Paste your Host Church Room Sheet URL and click **📥 Import**.
   * The script will automatically parse your buildings, rooms, and capacities, populate `Room Inventory`, and link the dropdowns on `Lodging`.

---

## 2. Managing Rooming: `Lodging` Sheet

The **`Lodging`** tab is dedicated exclusively to rooming management. 

### Key Behaviors:
1. **Clean & Filtered:** Only participants who requested host church lodging are listed here. Registrants arranging their own hotel or transit do not appear on this sheet, keeping your list short and focused.
2. **Cancellation Tracking:** If a registrant previously staying at the church edits their form to self-arranged lodging, their row is marked `CANCELLED` with a strikethrough (`#f4cccc`). Their spot is immediately released on `Room Inventory`.
3. **Update Highlighting:** If a participant changes their arrival dates or sleep preferences, their status highlights in soft yellow as `UPDATED`.

### How to Assign Rooms on `Lodging`:
At the right side of the sheet are the **Yellow Header manual columns**:

1. **`Room Assignment` (Dropdown):** Click the small dropdown arrow in the cell to select a room from your `Room Inventory` tab. (You can also type a custom room name if needed).
2. **`Building` (Auto-Filled):** Automatically displays the Building Name from `Room Inventory` as soon as you choose a room.
3. **`Bed / Spot` (Optional):** Enter a specific bed number (e.g., `Bed 1`, `Top Bunk`, `Floor Mattress`) if you track individual spots.
4. **`Lodging Notes` (Optional):** Enter private notes for the hospitality team (e.g., `Arriving late Friday`, `Sensitive to dust`, `Requested to room with church group`).

> [!TIP]
> **Safe Sorting:** Even though the `Lodging` sheet automatically sorts participants alphabetically by Last Name when new registrations arrive, your `Room Assignment`, `Building`, `Bed / Spot`, and `Lodging Notes` entries are locked to the participant's name and will never be misaligned!

---

## 3. General Event Management: `Logistics` Sheet

The **`Logistics`** tab is the general roster for on-site registration check-in, dining coordination, and workshop group assignments.

### What is on `Logistics`?
* **Contact & Demographics:** First Name, Last Name, Email, Phone, Gender, Age, Age Group, Grade, Parent/Guardian, Local Church.
* **`Staying at Host Church?` Badge:** Soft green badge for attendees staying on-site, soft gray badge for commuters/hotel attendees.
* **Dietary & Medical Accommodations:** `Food/Medicine Restrictions` (vegetarian, gluten-free, peanut allergy, medications) and `Other Special Needs` (mobility/ground-floor access).
* **Emergency Contacts:** Emergency contact person, relationship, and phone number.
* **Yellow Manual Columns:**
  * **`Group/Team`:** Enter the discussion group, fellowship team, or table number for each attendee.
  * **`Notes`:** General coordinator notes (e.g., `Checked in at 4pm`, `Paid cash on arrival`).

---

## 4. Airport & Transit Logistics: `Pickup` and `Drop-Off` Sheets

The **`Pickup`** and **`Drop-Off`** tabs organize arrival and departure travel details for participants flying or taking trains/buses. These tabs contain full attendee contact info and must stay **private** to the coordination team.

### Key Behaviors:
* **Chronological Sorting:** Rows are automatically sorted chronologically by **Date then Time**, grouping attendees who arrive on the same flight or around the same time together.
* **Flight/Train Details:** Lists date, time, airport/station, airline, flight number, carrier, and transit status (`Active`, `Updated`, `CANCELLED`).
* **Phone Number Formatting:** International numbers (e.g., `+1...`, `+54...`) are automatically formatted as Plain Text to prevent `#ERROR!` spreadsheet formula errors.

### Transportation Columns (V2.9.5)
Columns 16–22 on both tabs:

| Col | Header | Filled By |
| :--- | :--- | :--- |
| 16 | `Driver Full Name` | Synced from the public signup sheet (or typed manually) |
| 17 | `Driver Phone Number` | Synced from the public signup sheet (or typed manually) |
| 18 | `Trip Sub-ID` | System, e.g. `PU-SFO-UA1234-1025-1430-A`. Links each passenger to a vehicle slot. Do not edit. |
| 19 | `Vehicle Slot` | System, e.g. `Car 1 of 2 (Slot A)` |
| 20 | `Driver Vehicle / Notes` | Synced from the public sheet (vehicle model + driver notes) |
| 21 | `Coordinator Status` | **You** (dropdown): `Unassigned`, `Driver Claimed`, `Confirmed / Contacted`, `Reassign Needed`, `Completed` |
| 22 | `One-Click Dispatch SMS Text` | System. Copy-ready message with passenger names/phones, flight, and luggage estimate |

### Public Driver Signup Sheet (Optional, V2.9.5)
To let congregation volunteers claim rides without seeing attendee contact info, generate a separate public sheet:

1. **Create it:** **USGA Events > Manage Active Events** > select event > **🚗 Transportation & Drivers** > **📋 Setup Public Sheet**. (Or **USGA Events > Transportation & Drivers > Generate Public Driver Signup Sheet**.)
2. **What volunteers see:** One row per vehicle slot with date/time, airport, flight, and masked passenger names (e.g., `David L.`). **No phone numbers or emails.** Large arrivals are split into cars of up to 4 passengers; families sharing an email are kept together; flights landing within 30 minutes at the same airport are combined into one run.
3. **What volunteers can edit:** Only `Driver Full Name`, `Driver Phone Number`, `Vehicle Model / Seats`, and `Driver Notes` (Columns H–K). Everything else is protected.
4. **Sync:** Click **Sync Drivers** in the sidebar (or **USGA Events > Transportation & Drivers > Sync Transportation & Drivers Now**). Sync also runs on each new registration or edit, and optionally every 15 minutes via **Install Auto-Sync Trigger**. Claims are matched by `Trip Sub-ID`, so sorting either sheet is safe.
5. **Optional Settings tab entries** (add rows to `Settings` as `Setting | Value`): `MaxPassengersPerCar` (default 4), `ArrivalClusterWindowMinutes` and `DepartureClusterWindowMinutes` (default 30; `0` = one run per flight), `CoordinatorName`, `CoordinatorPhone` (included in dispatch texts).

### Contacting Drivers (Manual, No Automatic Emails)
The system **never emails or texts drivers or passengers about assignments**. Your team stays in control:
1. Review the claim on `Pickup` / `Drop-Off` (check vehicle size vs. passengers and luggage).
2. Click the cell in **`One-Click Dispatch SMS Text`**, copy it, and paste into your own text, WhatsApp, LINE, or WeChat message to the driver.
3. Set **`Coordinator Status`** to `Confirmed / Contacted`.
4. If a driver cannot do it, set `Reassign Needed` and clear their name on the **public** sheet so the slot reopens.

### Handling Changes
* **Passenger cancels:** Row is marked `CANCELLED`; the public slot count shrinks, and an empty run drops off the public list on the next sync.
* **Flight time changes:** The passenger moves to a new slot/Trip Sub-ID on the next sync. A driver who claimed the old slot is **not** moved automatically. Check `Driver Roster` and contact them.
* **Two drivers type in the same slot:** The last entry on the public sheet is what syncs. Confirm with the driver before texting.

> [!NOTE]
> The public sheet is shared as *anyone with the link can edit*. Only post the link to trusted volunteer channels. The `Driver Roster` tab is generated on sync and lists each driver's runs.

---

## 5. High-Level Metrics: `Summary Dashboard`

The **`Summary Dashboard`** tab gives pastors, lead coordinators, and head chefs an instantaneous overview without manual counting:

* **Attendance:** Total registered attendees.
* **Travel Logistics:** Total arriving and departing by flight, train/bus, or personal car.
* **Lodging Needs & Room Capacity:**
  * Number of participants staying at church vs. self-arranged.
  * Total room sleeping capacity defined in `Room Inventory`.
  * Total occupants assigned to rooms.
  * Total remaining room capacity across the entire church.
  * Requests for lodging before or after the official event dates.
* **Dining & Dietary Requirements:** Total participants reporting food or medical allergies.
* **Demographics & Sleep Habits:** Gender breakdown, age group counts, and a matrix of sleep habits (light sleepers, snorers, early risers, late sleepers) to assist with rooming decisions.

---

## Golden Rules for Host Church Volunteers

1. **Only Edit Yellow Columns (and Green Columns on Room Inventory):**
   * **Yellow Headers:** Manual coordinator fields (`Room Assignment`, `Building`, `Bed / Spot`, `Lodging Notes`, `Group/Team`, `Driver Full Name`, `Driver Phone Number`, `Coordinator Status`).
   * **Green Headers:** `Room Inventory` facility input fields (Columns A–E).
   * **Blue Headers:** Automated fields populated by Google Forms or the transportation sync (including `Trip Sub-ID`, `Vehicle Slot`, and `One-Click Dispatch SMS Text`). Do not type over blue headers.
2. **Never Rename the Sheet Tabs:**
   * Keep tab names as `Room Inventory`, `Lodging`, `Logistics`, `Pickup`, `Drop-Off`, `Driver Roster`, `Settings`, `Summary Dashboard`, and `Form Responses 1` so automated sync scripts continue running seamlessly. On the public driver sheet, keep `Pickup Signups` and `Drop-Off Signups` as named.
   * Never share the master event spreadsheet with volunteer drivers. Share only the public driver signup sheet.
3. **Never Delete Rows on `Form Responses 1`:**
   * If an attendee cancels, either change their status in the Form or mark them `CANCELLED` on the sheet. Deleting rows from `Form Responses 1` disrupts Google Forms row numbering.
4. **Need to Re-Sync or Add Rooms?**
   * From the Master Google Sheet menu, you can always click **USGA Events > Advanced Maintenance > Setup / Sync Lodging & Room Inventory Tabs** to refresh formulas or migrate data without losing existing work!
