# Master Field Dictionary

## Overview
This document represents the definitive **Master Field Dictionary** of the USGA Event Registration Form Generator, corresponding directly to the data structures initialized in `setupFieldDictionary(ss)` in `Code.gs`.

---

## 1. Personal & Contact Info

| Field Name | Input Type | Required | Options / Details |
|---|---|:---:|---|
| **First Name** | Short Answer Text | Yes | Legal first name. |
| **Last Name** | Short Answer Text | Yes | Legal last name. |
| **Other Name / Chinese Name** | Short Answer Text | No | Alternative name, baptismal name, or Chinese characters. |
| **Email** | Short Answer Text | Yes | Primary confirmation and edit recipient. |
| **Phone** | Short Answer Text | Yes | Primary mobile contact. |
| **Gender** | Radio | Yes | `Male`, `Female` |
| **Birth year** | Short Answer Text | Yes | 4-digit birth year (e.g. 2004). |
| **Age** | Short Answer Text | Yes | Validated as whole integer 1–99. |
| **My current age group** | Radio | Yes | `12-14`, `15-18`, `19-25`, `26-35`, `36-50`, `51+` |
| **Local Church** | Short Answer Text | Yes | Home church or house of prayer. |
| **Primary Language** | Radio | Yes | 23 supported languages + `Other`. |
| **Secondary Language** | Dropdown | No | `None` + 23 supported languages + `Other`. |
| **My language preference** | Checkboxes | Yes | 23 supported languages + `Other` (multi-select). |
| **I am a baptized member of the True Jesus Church** | Radio | Yes | `Yes`, `No` |
| **I have received the Holy Spirit** | Radio | Yes | `Yes`, `No` |
| **Class to attend** | Radio | Yes | `E2 (Grades 4 to 6)`, `J1 (Grades 7 to 9)`, `J2 (Grades 10 to 12)` |
| **Grade (As of September)** | Short Answer Text | Yes | Academic grade as of incoming school year. |
| **Minor's Email (at least 13 years of age)** | Short Answer Text | No | Youth contact email (ages 13+); excluded from automated receipts. |
| **Name of Parent/Guardian (if Participant is under 18)** | Short Answer Text | Yes | Parent/guardian legal name; includes N/A instruction. |
| **Emergency Contact Person** | Short Answer Text | Yes | Primary emergency contact name. |
| **Emergency Contact Relationship** | Short Answer Text | Yes | Relationship to participant. |
| **Emergency Contact Phone** | Short Answer Text | Yes | Primary emergency phone number. |
| **Emergency Contact Evening Phone** | Short Answer Text | No | Secondary contact number (auto-purged for minor events). |

---

## 2. Event-Specific Participation

| Field Name | Input Type | Required | Options / Details |
|---|---|:---:|---|
| **Dress Code Agreement** | Radio | Yes | `Yes, I agree` (with preamble). |
| **I will attend...** | Dropdown | Yes | `In Person`, `Online`, `Attendance tentatively unsure` |
| **Attendance commitment** | Radio | Yes | `Full time`, `Part time` |
| **Dates I will attend** | Checkboxes | Yes | `Sunday`, `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, `Saturday` |
| **Are you in: College/Working** | Checkboxes | Yes | `College`, `Working`, `Other` |
| **What year are you in college?** | Dropdown | Yes | `Freshman`, `Sophomore`, `Junior`, `Senior`, `Graduate Student`, `Other` |
| **What is your current work status?** | Checkboxes | Yes | `Full-time`, `Part-time`, `Self-employed`, `Unemployed`, `Student` |
| **Participant can help with the following** | Checkboxes | No | `Audio/Visual`, `Cleaning`, `Cooking`, `Hymn Leading`, `Interpretation`, `Pianist`, `Testimony`, `Other` |
| **Do you need someone to interpret for you in class?** | Radio | No | `Yes`, `No` |
| **Interpretation Language** | Dropdown | No | 23 supported languages + `Other`. |
| **Have you led Bible study before?** | Radio | No | `Yes`, `No` |
| **Share a testimony** | Radio | No | `Yes`, `No` |
| **Project/Elective selection** | Checkboxes | Yes | `Elective A`, `Elective B`, `Elective C` |
| **Second project choice** | Radio | No | `Elective A`, `Elective B`, `Elective C` |
| **Explain your choices / Essay** | Paragraph | Yes | Detailed personal statement. |
| **Indicate any relevant skills you may have** | Paragraph | No | Skills inventory. |
| **Share an experience in servitude** | Paragraph | No | Past servitude reflection. |
| **Voice part(s)** | Checkboxes | No | `Soprano`, `Alto`, `Tenor`, `Bass` |
| **List instrument you will bring** | Short Answer Text | No | Camp instrument. |
| **T-shirt size** | Radio | Yes | `XS`, `S`, `M`, `L`, `XL`, `XXL` |
| **I am familiar with Zoom** | Radio | Yes | `Yes`, `No` |
| **I would like to attend Zoom training** | Radio | No | `Yes`, `No` |
| **I can help with Zoom holy work** | Checkboxes | No | `Host`, `Co-Host`, `Translation` |
| **Is this your first time attending?** | Radio | Yes | `Yes`, `No` |
| **What fellowship are you representing?** | Short Answer Text | Yes | Church fellowship name. |
| **Current/future role in youth ministry** | Checkboxes | Yes | `Religious Education Teacher`, `Youth Coordinator`, `Counselor`, `Other` |
| **I'm a (Delegate/Observer)** | Dropdown | Yes | `Delegate`, `Observer` |
| **Completed ___ years of NATS** | Dropdown | Yes | `0`, `1`, `2`, `3`, `4+` |
| **Class A/B preference** | Radio | Yes | `Class A`, `Class B` |

---

## 3. Arrival Travel & Logistics

| Field Name | Category | Input Type | Required | Options / Details |
|---|---|---|:---:|---|
| **Arrival Details** | Arrival Arrangements | Multiple choice | Yes | Branching: `I am arriving by car`, `I am arriving by flight`, `I am arriving by train/bus`, `I do not need pickup` |
| **Arrival Date** | Arrival Arrangements | Date | Yes | Inbound arrival date. |
| **Arrival Time** | Arrival Arrangements | Time | Yes | Inbound arrival time. |
| **Departing City/Airport** | Arrival Flight Details | Short Answer Text | Yes | Inbound origin city/airport code. |
| **Arrival City/Airport** | Arrival Flight Details | Short Answer Text | Yes | Host church airport code (auto-suggests mapped airports). |
| **Arrival Airline** | Arrival Flight Details | Short Answer Text | Yes | Inbound airline. |
| **Arrival Flight Number** | Arrival Flight Details | Short Answer Text | Yes | Inbound flight number. |
| **The individuals will be arriving on the same flight** | Arrival Flight Details | Paragraph | No | Group coordination notes. |
| **Arrival Train/Bus Station** | Arrival Train/Bus Details | Short Answer Text | Yes | Inbound terminal or train station. |
| **Arrival Carrier** | Arrival Train/Bus Details | Short Answer Text | Yes | Inbound carrier (Amtrak, Greyhound, etc.). |
| **Arrival Train/Bus Number** | Arrival Train/Bus Details | Short Answer Text | Yes | Inbound train or bus route number. |

---

## 4. Departure Travel & Logistics

| Field Name | Category | Input Type | Required | Options / Details |
|---|---|---|:---:|---|
| **Departure Details** | Departure Arrangements | Multiple choice | Yes | Branching: `I am departing by car`, `I am departing by flight`, `I am departing by train/bus`, `I do not need dropoff` |
| **Departure Date** | Departure Arrangements | Date | Yes | Outbound departure date. |
| **Departure Time** | Departure Arrangements | Time | Yes | Outbound departure time. |
| **Departure City/Airport** | Departure Flight Details | Short Answer Text | Yes | Departure origin airport. |
| **Destination City/Airport** | Departure Flight Details | Short Answer Text | Yes | Destination airport code. |
| **Departure Airline** | Departure Flight Details | Short Answer Text | Yes | Outbound airline. |
| **Departure Flight Number** | Departure Flight Details | Short Answer Text | Yes | Outbound flight number. |
| **The individuals will be departing on the same flight** | Departure Flight Details | Paragraph | No | Group coordination notes. |
| **Departure Train/Bus Station** | Departure Train/Bus Details | Short Answer Text | Yes | Outbound train station or bus depot. |
| **Departure Carrier** | Departure Train/Bus Details | Short Answer Text | Yes | Outbound carrier. |
| **Departure Train/Bus Number** | Departure Train/Bus Details | Short Answer Text | Yes | Outbound train or bus route number. |

---

## 5. Other Travel Logistics

| Field Name | Input Type | Required | Details |
|---|---|:---:|---|
| **My train/bus information** | Paragraph | No | Additional travel route or ticket details. |
| **I will arrange my own ride (additional notes)** | Paragraph | No | Coordinator logistics notes for self-arranged rides. |

---

## 6. Lodging & Accommodation

| Field Name | Input Type | Required | Options / Details |
|---|---|:---:|---|
| **Lodging Arrangement 住宿安排** | Radio | Yes | `Lodging at host church / 主辦教會安排住宿`, `Self-arranged lodging & transit / 自行安排住行` (Standard for NCC & Ministers Workshop) |
| **I will be staying at the hosting church.** | Radio | Yes | `Yes`, `No` |
| **Specify exact dates of arrival/departure for lodging** | Paragraph | No | Custom arrival/departure dates. |
| **I need lodging before the event** | Radio | Yes | `Yes`, `No` (Appends target date context). |
| **I need lodging after the event** | Radio | Yes | `Yes`, `No` (Appends target date context). |
| **Sleeping Bag/Pillow** | Radio | No | `I will bring my own.`, `I need to borrow from the hosting church.` |
| **Sleep Preferences & Habits (select all that apply)** | Checkboxes | No | `Light sleeper (sensitive to noise/light)`, `Heavy sleeper`, `Early riser`, `Late sleeper`, `Snorer` |
| **Food/Medicine Restrictions** | Paragraph | No | Dietary, medication, and allergy details. |
| **Information of accompanying family member** | Paragraph | No | Accompanying family info. |
| **If your need for lodging is not related to an event at the host church** | Paragraph | No | Explanatory note. |
| **Other Special Needs/Accommodations (e.g., mobility assistance)** | Paragraph | No | Special accessibility accommodations. |

---

## 7. Releases & Feedback

| Field Name | Input Type | Required | Options / Details |
|---|---|:---:|---|
| **Medical Consent and Liability Release Consent** | Radio | Yes | Full legal preamble. "No" triggers auto-rejection. |
| **General Media Release Consent** | Radio | Yes | Full legal preamble. Supports opt-out choice. |
| **Signature by Participant/Authorized Signatory** | Short Answer Text | Yes | Electronic signature verification. |
