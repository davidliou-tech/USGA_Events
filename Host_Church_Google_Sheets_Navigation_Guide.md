# Host Church Google Sheets Navigation & Logistics Guide

This guide is designed for **Host Church Coordinators, Hospitality Teams, and Logistics Volunteers** managing an event created with the **USGA Event Registration System**. 

The Event Response Spreadsheet is an automated, real-time command center that connects directly to the live Google Registration Form. When members register or update their information, their responses automatically populate and update the appropriate worksheets.

---

## Quick Navigation: Workbook Sheet Overview

Your event spreadsheet contains several specialized tabs. Each tab serves a dedicated logistical purpose:

| Sheet Tab | Purpose & Workflow | Who Uses It |
| :--- | :--- | :--- |
| **`Room Inventory`** | **Facility & Bed Capacity Planner:** Enter your building names, room names, gender designations, and max capacities. Automatically tracks assigned occupants and remaining capacity. | Host Church Lodging Coordinator |
| **`Lodging`** | **Dedicated Church Lodging Roster:** Filtered to *only* participants staying at the host church. Contains sleep habits, lodging dates, bedding requests, and room assignment dropdowns. | Host Church Lodging Team |
| **`Logistics`** | **General On-Site Roster & Grouping:** Master list of all attendees for event check-in, dietary restrictions, special needs, emergency contacts, and discussion `Group/Team` assignments. | General Coordinator, Food / Kitchen Team, Program Leads |
| **`Pickup`** | **Inbound Airport & Transit Roster:** Flight, train, and bus arrivals sorted chronologically by date/time. Assign volunteer drivers directly in the sheet. | Transportation Team / Shuttle Drivers |
| **`Drop-Off`** | **Outbound Airport & Transit Roster:** Outbound travel details sorted chronologically. Assign volunteer return drivers. | Transportation Team / Shuttle Drivers |
| **`Summary Dashboard`** | **Real-Time Event Statistics:** Instant counts of total registrants, meal counts, dietary restrictions, airport shuttle volumes, and room capacity vs. assigned beds. | Lead Event Coordinators & Pastors |
| **`Airport Summary`** | **Airport Breakdown:** Counts arrivals and departures grouped by airport code to plan large van/bus shuttle runs. | Transportation Team |
| **`Participants`** | **Public Attendee List:** Simple roster of registered participants (safe to publish to web so members know who is attending). | Registrants / Public |
| **`Form Responses 1`** | **Raw Data Vault:** Unedited form submissions directly from Google Forms. *(Do not edit or delete).* | System / Archive |

---

## 1. Facility & Bed Planning: `Room Inventory`

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
* **Column H (`Remaining Capacity`):** Calculates remaining open beds (`Max Capacity - Assigned Count`) with instant color warnings:
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

The **`Pickup`** and **`Drop-Off`** tabs organize arrival and departure travel details for participants flying or taking trains/buses.

### Key Behaviors:
* **Chronological Sorting:** Rows are automatically sorted chronologically by **Date then Time**, grouping attendees who arrive on the same flight or around the same time together.
* **Flight/Train Details:** Lists date, time, airport/station, airline, flight number, carrier, and transit status (`Active`, `Updated`, `CANCELLED`).
* **Assigning Volunteer Drivers:**
  * Enter the driver's name in **`Driver Full Name`** and their mobile number in **`Driver Phone Number`**.
  * Driver assignments stay permanently linked to the passenger, even when new registrations arrive and the list re-sorts.
* **Phone Number Formatting:** International numbers (e.g., `+1...`, `+54...`) are automatically formatted as Plain Text to prevent `#ERROR!` spreadsheet formula errors.

---

## 5. High-Level Metrics: `Summary Dashboard`

The **`Summary Dashboard`** tab gives pastors, lead coordinators, and head chefs an instantaneous overview without manual counting:

* **Attendance:** Total registered attendees.
* **Travel Logistics:** Total arriving and departing by flight, train/bus, or personal car.
* **Lodging Needs & Room Capacity:**
  * Number of participants staying at church vs. self-arranged.
  * Total bed capacity defined in `Room Inventory`.
  * Total occupants assigned to rooms.
  * Total remaining room capacity across the entire church.
  * Requests for lodging before or after the official event dates.
* **Dining & Dietary Requirements:** Total participants reporting food or medical allergies.
* **Demographics & Sleep Habits:** Gender breakdown, age group counts, and a matrix of sleep habits (light sleepers, snorers, early risers, late sleepers) to assist with rooming decisions.

---

## Golden Rules for Host Church Volunteers

1. **Only Edit Yellow Columns (and Green Columns on Room Inventory):**
   * **Yellow Headers:** Manual coordinator fields (`Room Assignment`, `Building`, `Bed / Spot`, `Lodging Notes`, `Group/Team`, `Driver Full Name`, `Driver Phone Number`).
   * **Green Headers:** `Room Inventory` facility input fields (Columns A–E).
   * **Blue Headers:** Automated fields populated by Google Forms. Do not type over blue headers.
2. **Never Rename the Sheet Tabs:**
   * Keep tab names as `Room Inventory`, `Lodging`, `Logistics`, `Pickup`, `Drop-Off`, `Summary Dashboard`, and `Form Responses 1` so automated sync scripts continue running seamlessly.
3. **Never Delete Rows on `Form Responses 1`:**
   * If an attendee cancels, either change their status in the Form or mark them `CANCELLED` on the sheet. Deleting rows from `Form Responses 1` disrupts Google Forms row numbering.
4. **Need to Re-Sync or Add Rooms?**
   * From the Master Google Sheet menu, you can always click **USGA Events > Advanced Maintenance > Setup / Sync Lodging & Room Inventory Tabs** to refresh formulas or migrate data without losing existing work!
