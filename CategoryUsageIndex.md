# Category Usage Index

## Overview
This index categorizes all 77 unique fields defined in the Master Field Dictionary of the USGA Event Registration Form Generator. It documents each category's functional role, the fields it encompasses, and which event templates utilize those categories.

---

## Master Category Overview

| # | Category Name | Field Count | Primary Purpose | Key Workflows / Special Behaviors |
|---|---|:---:|---|---|
| 1 | **Personal & Contact Info** | 23 | Participant identity, church affiliation, contact info, minor safeguards | Auto-injects minor email/parent info on minor events; integer validation on Age (1-99) |
| 2 | **Event-Specific Participation** | 29 | Event attendance format, volunteer roles, workshop electives, ministry experience | Dynamic class filtering (SSC); conditional role questions |
| 3 | **Arrival Arrangements** | 3 | Arrival travel mode, arrival date, arrival time | Multiple choice routing to Flight, Train/Bus, or Non-travel sections |
| 4 | **Arrival Flight Details** | 5 | Inbound flight airline, flight number, arrival airport | Automatically populated on `Pickup` sheet; aggregated on `Airport Summary` |
| 5 | **Departure Arrangements** | 3 | Departure travel mode, departure date, departure time | Multiple choice routing to Flight, Train/Bus, or Non-travel sections |
| 6 | **Departure Flight Details** | 5 | Outbound flight airline, flight number, departure airport | Automatically populated on `Drop-Off` sheet; aggregated on `Airport Summary` |
| 7 | **Arrival Train/Bus Details** | 3 | Arrival train/bus station, carrier, train/bus number | Automatically populated on `Pickup` sheet with dynamic column indexing |
| 8 | **Departure Train/Bus Details** | 3 | Departure train/bus station, carrier, train/bus number | Automatically populated on `Drop-Off` sheet with dynamic column indexing |
| 9 | **Other Travel Logistics** | 2 | Custom transportation notes, self-arranged rides | Captured on Form Responses 1 |
| 10 | **Lodging & Accommodation** | 10 | Church lodging, pre/post event stay, sleep preferences, dietary restrictions | Populates `Logistics` sheet and `Summary Dashboard` |
| 11 | **Releases & Feedback** | 3 | Medical release, general media consent, electronic signature | Strict legal waivers; "No" on Medical Consent routes to automatic rejection |

---

## Detailed Category Breakdown

### 1. Personal & Contact Info
Contains core identity and demographic questions. Required across virtually all templates.
* **Fields:**
  * `First Name` *(Short Answer Text, Required)*
  * `Last Name` *(Short Answer Text, Required)*
  * `Other Name / Chinese Name` *(Short Answer Text, Optional)*
  * `Email` *(Short Answer Text, Required)*
  * `Phone` *(Short Answer Text, Required)*
  * `Gender` *(Radio: Male, Female; Required)*
  * `Birth year` *(Short Answer Text, Required)*
  * `Age` *(Short Answer Text, Required - enforced 1-99 integer validation)*
  * `My current age group` *(Radio: 12-14, 15-18, 19-25, 26-35, 36-50, 51+; Required)*
  * `Local Church` *(Short Answer Text, Required)*
  * `Primary Language` *(Radio: 23 Languages; Required)*
  * `Secondary Language` *(Dropdown: 23 Languages + None; Optional)*
  * `My language preference` *(Checkboxes: 23 Languages; Required)*
  * `I am a baptized member of the True Jesus Church` *(Radio: Yes, No; Required)*
  * `I have received the Holy Spirit` *(Radio: Yes, No; Required)*
  * `Class to attend` *(Radio: E2, J1, J2; Required - dynamically filtered by sidebar for SSC)*
  * `Grade (As of September)` *(Short Answer Text, Required)*
  * `Minor's Email (at least 13 years of age)` *(Short Answer Text, Optional - auto-injected for youth events)*
  * `Name of Parent/Guardian (if Participant is under 18)` *(Short Answer Text, Required for youth events)*
  * `Emergency Contact Person` *(Short Answer Text, Required)*
  * `Emergency Contact Relationship` *(Short Answer Text, Required)*
  * `Emergency Contact Phone` *(Short Answer Text, Required)*
  * `Emergency Contact Evening Phone` *(Short Answer Text, Optional)*

### 2. Event-Specific Participation
Captures attendance commitments, spiritual roles, class preferences, and choir/instrument details.
* **Fields:**
  * `Dress Code Agreement` *(Radio: Yes, I agree; Required)*
  * `I will attend...` *(Dropdown: In Person, Online, Attendance tentatively unsure; Required)*
  * `Attendance commitment` *(Radio: Full time, Part time; Required)*
  * `Dates I will attend` *(Checkboxes: Sunday–Saturday; Required)*
  * `Are you in: College/Working` *(Checkboxes: College, Working, Other; Required)*
  * `What year are you in college?` *(Dropdown: Freshman–Senior, Grad, Other; Required)*
  * `What is your current work status?` *(Checkboxes: Full-time, Part-time, etc.; Required)*
  * `Participant can help with the following` *(Checkboxes: Audio/Visual, Cooking, Pianist, etc.; Optional)*
  * `Do you need someone to interpret for you in class?` *(Radio: Yes, No; Optional)*
  * `Interpretation Language` *(Dropdown: 23 Languages; Optional)*
  * `Have you led Bible study before?` *(Radio: Yes, No; Optional)*
  * `Share a testimony` *(Radio: Yes, No; Optional)*
  * `Project/Elective selection` *(Checkboxes; Required)*
  * `Second project choice` *(Radio; Optional)*
  * `Explain your choices / Essay` *(Paragraph; Required)*
  * `Indicate any relevant skills you may have` *(Paragraph; Optional)*
  * `Share an experience in servitude` *(Paragraph; Optional)*
  * `Voice part(s)` *(Checkboxes: Soprano, Alto, Tenor, Bass; Optional)*
  * `List instrument you will bring` *(Short Answer Text; Optional)*
  * `T-shirt size` *(Radio: XS–XXL; Required)*
  * `I am familiar with Zoom` *(Radio: Yes, No; Required)*
  * `I would like to attend Zoom training` *(Radio: Yes, No; Optional)*
  * `I can help with Zoom holy work` *(Checkboxes: Host, Co-Host, Translation; Optional)*
  * `Is this your first time attending?` *(Radio: Yes, No; Required)*
  * `What fellowship are you representing?` *(Short Answer Text; Required)*
  * `Current/future role in youth ministry` *(Checkboxes: RE Teacher, Counselor, etc.; Required)*
  * `I'm a (Delegate/Observer)` *(Dropdown: Delegate, Observer; Required)*
  * `Completed ___ years of NATS` *(Dropdown: 0, 1, 2, 3, 4+; Required)*
  * `Class A/B preference` *(Radio: Class A, Class B; Required)*

### 3 & 4. Arrival Travel & Flight Details
Routes participants based on travel method and tracks inbound flights.
* **Fields:**
  * `Arrival Details` *(Multiple Choice: Car, Flight, Train/Bus, No pickup needed; Required)*
  * `Arrival Date` *(Date; Required)*
  * `Arrival Time` *(Time; Required)*
  * `Departing City/Airport` *(Short Answer Text; Required)*
  * `Arrival City/Airport` *(Short Answer Text; Required - auto-suggests mapped airports)*
  * `Arrival Airline` *(Short Answer Text; Required)*
  * `Arrival Flight Number` *(Short Answer Text; Required)*
  * `The individuals will be arriving on the same flight` *(Paragraph; Optional)*

### 5 & 6. Departure Travel & Flight Details
Routes participants based on departure method and tracks outbound flights.
* **Fields:**
  * `Departure Details` *(Multiple Choice: Car, Flight, Train/Bus, No dropoff needed; Required)*
  * `Departure Date` *(Date; Required)*
  * `Departure Time` *(Time; Required)*
  * `Departure City/Airport` *(Short Answer Text; Required - auto-suggests mapped airports)*
  * `Destination City/Airport` *(Short Answer Text; Required)*
  * `Departure Airline` *(Short Answer Text; Required)*
  * `Departure Flight Number` *(Short Answer Text; Required)*
  * `The individuals will be departing on the same flight` *(Paragraph; Optional)*

### 7 & 8. Arrival & Departure Train/Bus Details
Tracks passenger train and intercity bus routes (Amtrak, Greyhound, regional transit).
* **Fields:**
  * `Arrival Train/Bus Station` *(Short Answer Text; Required)*
  * `Arrival Carrier` *(Short Answer Text; Required - e.g. Amtrak, Megabus)*
  * `Arrival Train/Bus Number` *(Short Answer Text; Required)*
  * `Departure Train/Bus Station` *(Short Answer Text; Required)*
  * `Departure Carrier` *(Short Answer Text; Required)*
  * `Departure Train/Bus Number` *(Short Answer Text; Required)*

### 9. Other Travel Logistics
* **Fields:**
  * `My train/bus information` *(Paragraph; Optional)*
  * `I will arrange my own ride (additional notes)` *(Paragraph; Optional)*

### 10. Lodging & Accommodation
Captures lodging requirements, sleeping habits, and medical/dietary restrictions.
* **Fields:**
  * `I will be staying at the hosting church.` *(Radio: Yes, No; Required)*
  * `Specify exact dates of arrival/departure for lodging` *(Paragraph; Optional)*
  * `I need lodging before the event` *(Radio: Yes, No; Required)*
  * `I need lodging after the event` *(Radio: Yes, No; Required)*
  * `Sleeping Bag/Pillow` *(Radio: Bring own, Borrow; Optional)*
  * `Sleep Preferences & Habits (select all that apply)` *(Checkboxes: Light sleeper, Heavy sleeper, Early riser, Late sleeper, Snorer; Optional)*
  * `Food/Medicine Restrictions` *(Paragraph; Optional)*
  * `Information of accompanying family member` *(Paragraph; Optional)*
  * `If your need for lodging is not related to an event at the host church` *(Paragraph; Optional)*
  * `Other Special Needs/Accommodations (e.g., mobility assistance)` *(Paragraph; Optional)*

### 11. Releases & Feedback
Legal waivers and electronic authorizations. Locked to prevent unchecking.
* **Fields:**
  * `Medical Consent and Liability Release Consent` *(Radio: Yes, No; Required)*
  * `General Media Release Consent` *(Radio: Yes, No; Required)*
  * `Signature by Participant/Authorized Signatory` *(Short Answer Text; Required)*

---

## Category Usage Across Event Templates

| Event Template | Personal | Event-Spec. | Arr. Flight | Dep. Flight | Train/Bus | Lodging | Releases |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Student Spiritual Convocation (SSC)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Young Adult Spiritual Convocation (YASC)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **College Youth Spiritual Convocation (CYSC)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **National Youth Theological Seminar (NYTS)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **National Adult Theological Seminar (NATS)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **National Evangelical Workers' Workshop (NEWW)**| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **National Marriage Coordinators' Workshop (NMCW)**| ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Sacred Music Camp (SMC)** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Southwest Region Music Ministry Program (MMP)**| ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Ministry Volunteer Program (MVP) Workshop** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Pioneer Volunteer Ministry Program (PMVP)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **National Youth Servitude Training (NYST)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **National Youth Fellowship (NYF)** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **USGA Ministers Workshop** | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **National Church Conference (NCC)** | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Online National Sacred Music Workshop** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Online National Adult Theological Seminar (OATS)**| ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
