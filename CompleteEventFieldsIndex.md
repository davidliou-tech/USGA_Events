# Complete Event Fields Index

## Overview
This document provides an exhaustive, alphabetical catalog of all **77 unique fields** supported by the USGA Event Registration Form Generator. Each entry outlines its Category, Input Type, Default Required status, and special automation logic.

---

## Master Fields Alphabetical Index

| # | Field Name | Category | Input Type | Required | Options / Special Validation |
|---|---|---|---|:---:|---|
| 1 | **Age** | Personal & Contact Info | Short Answer Text | Yes | Validated as integer between 1 and 99; auto-injected for youth events. |
| 2 | **Are you in: College/Working** | Event-Specific Participation | Checkboxes | Yes | `College`, `Working`, `Other` |
| 3 | **Arrival Airline** | Arrival Flight Details | Short Answer Text | Yes | Inbound flight airline name or IATA code. |
| 4 | **Arrival Carrier** | Arrival Train/Bus Details | Short Answer Text | Yes | Transit operator (e.g., Amtrak, Greyhound, Megabus). |
| 5 | **Arrival City/Airport** | Arrival Flight Details | Short Answer Text | Yes | Pre-populated with mapped host church airports. |
| 6 | **Arrival Date** | Arrival Arrangements | Date | Yes | Standard calendar date picker. |
| 7 | **Arrival Details** | Arrival Arrangements | Multiple choice | Yes | Branching options: Car, Flight, Train/Bus, No pickup needed. |
| 8 | **Arrival Flight Number** | Arrival Flight Details | Short Answer Text | Yes | Inbound flight number. |
| 9 | **Arrival Time** | Arrival Arrangements | Time | Yes | Estimated time of arrival. |
| 10 | **Arrival Train/Bus Number** | Arrival Train/Bus Details | Short Answer Text | Yes | Train route number or bus schedule identifier. |
| 11 | **Arrival Train/Bus Station** | Arrival Train/Bus Details | Short Answer Text | Yes | Inbound arrival terminal or station name. |
| 12 | **Attendance commitment** | Event-Specific Participation | Radio | Yes | `Full time`, `Part time` |
| 13 | **Birth year** | Personal & Contact Info | Short Answer Text | Yes | 4-digit birth year (e.g. 1998). |
| 14 | **Class to attend** | Personal & Contact Info | Radio | Yes | `E2 (Grades 4 to 6)`, `J1 (Grades 7 to 9)`, `J2 (Grades 10 to 12)`; filtered dynamically by sidebar for SSC. |
| 15 | **Class A/B preference** | Event-Specific Participation | Radio | Yes | `Class A`, `Class B` |
| 16 | **Completed ___ years of NATS** | Event-Specific Participation | Dropdown | Yes | `0`, `1`, `2`, `3`, `4+` |
| 17 | **Current/future role in youth ministry** | Event-Specific Participation | Checkboxes | Yes | `Religious Education Teacher`, `Youth Coordinator`, `Counselor`, `Other` |
| 18 | **Dates I will attend** | Event-Specific Participation | Checkboxes | Yes | `Sunday` through `Saturday` |
| 19 | **Departing City/Airport** | Arrival Flight Details | Short Answer Text | Yes | Origin airport code or city name. |
| 20 | **Departure Airline** | Departure Flight Details | Short Answer Text | Yes | Outbound flight airline name. |
| 21 | **Departure Carrier** | Departure Train/Bus Details | Short Answer Text | Yes | Transit operator for departure. |
| 22 | **Departure City/Airport** | Departure Flight Details | Short Answer Text | Yes | Pre-populated with mapped host church airports. |
| 23 | **Departure Date** | Departure Arrangements | Date | Yes | Standard calendar date picker. |
| 24 | **Departure Details** | Departure Arrangements | Multiple choice | Yes | Branching options: Car, Flight, Train/Bus, No dropoff needed. |
| 25 | **Departure Flight Number** | Departure Flight Details | Short Answer Text | Yes | Outbound flight number. |
| 26 | **Departure Time** | Departure Arrangements | Time | Yes | Scheduled departure time. |
| 27 | **Departure Train/Bus Number** | Departure Train/Bus Details | Short Answer Text | Yes | Outbound train route or bus number. |
| 28 | **Departure Train/Bus Station** | Departure Train/Bus Details | Short Answer Text | Yes | Outbound station or departure depot. |
| 29 | **Destination City/Airport** | Departure Flight Details | Short Answer Text | Yes | Final travel destination. |
| 30 | **Do you need someone to interpret for you in class?** | Event-Specific Participation | Radio | No | `Yes`, `No` |
| 31 | **Dress Code Agreement** | Event-Specific Participation | Radio | Yes | `Yes, I agree` (with conservative attire policy preamble). |
| 32 | **Email** | Personal & Contact Info | Short Answer Text | Yes | Primary email recipient for confirmation receipts and edit links. |
| 33 | **Emergency Contact Evening Phone** | Personal & Contact Info | Short Answer Text | No | Secondary contact number; auto-purged on minor events. |
| 34 | **Emergency Contact Person** | Personal & Contact Info | Short Answer Text | Yes | Full legal name of emergency contact. |
| 35 | **Emergency Contact Phone** | Personal & Contact Info | Short Answer Text | Yes | Primary phone number for emergency contact. |
| 36 | **Emergency Contact Relationship** | Personal & Contact Info | Short Answer Text | Yes | Relationship to participant (Parent, Spouse, Sibling, etc.). |
| 37 | **Explain your choices / Essay** | Event-Specific Participation | Paragraph | Yes | Detailed personal statement or elective reasoning. |
| 38 | **First Name** | Personal & Contact Info | Short Answer Text | Yes | Participant legal first name; part of composite matching key. |
| 39 | **Food/Medicine Restrictions** | Lodging & Accommodation | Paragraph | No | Allergies, chronic conditions, or dietary restrictions. |
| 40 | **Gender** | Personal & Contact Info | Radio | Yes | `Male`, `Female` (Prefix matched in Summary Dashboard). |
| 41 | **General Media Release Consent** | Releases & Feedback | Radio | Yes | `Yes, I consent.` / Opt-out statement. Locked. |
| 42 | **Grade (As of September)** | Personal & Contact Info | Short Answer Text | Yes | School grade for student placement. |
| 43 | **Have you led Bible study before?** | Event-Specific Participation | Radio | No | `Yes`, `No` |
| 44 | **I am a baptized member of the True Jesus Church** | Personal & Contact Info | Radio | Yes | `Yes`, `No` |
| 45 | **I am familiar with Zoom** | Event-Specific Participation | Radio | Yes | `Yes`, `No` |
| 46 | **I can help with Zoom holy work** | Event-Specific Participation | Checkboxes | No | `Host`, `Co-Host`, `Translation` |
| 47 | **I have received the Holy Spirit** | Personal & Contact Info | Radio | Yes | `Yes`, `No` |
| 48 | **I need lodging after the event** | Lodging & Accommodation | Radio | Yes | `Yes`, `No` (Calculates exact target date context). |
| 49 | **I need lodging before the event** | Lodging & Accommodation | Radio | Yes | `Yes`, `No` (Calculates exact target date context). |
| 50 | **I will arrange my own ride (additional notes)** | Other Travel Logistics | Paragraph | No | Custom logistics notes for coordinators. |
| 51 | **I will attend...** | Event-Specific Participation | Dropdown | Yes | `In Person`, `Online`, `Attendance tentatively unsure` |
| 52 | **I will be staying at the hosting church.** | Lodging & Accommodation | Radio | Yes | `Yes`, `No` (Prefix matched as `Yes*` / `No*` in dashboard). |
| 53 | **I would like to attend Zoom training** | Event-Specific Participation | Radio | No | `Yes`, `No` |
| 54 | **I'm a (Delegate/Observer)** | Event-Specific Participation | Dropdown | Yes | `Delegate`, `Observer` |
| 55 | **If your need for lodging is not related to an event at the host church** | Lodging & Accommodation | Paragraph | No | Explanatory field for outside lodging requests. |
| 56 | **Indicate any relevant skills you may have** | Event-Specific Participation | Paragraph | No | Open-ended servitude skills (media, cooking, music). |
| 57 | **Information of accompanying family member** | Lodging & Accommodation | Paragraph | No | Accompanying spouse or child details. |
| 58 | **Interpretation Language** | Event-Specific Participation | Dropdown | No | 23 supported world languages. |
| 59 | **Is this your first time attending?** | Event-Specific Participation | Radio | Yes | `Yes`, `No` |
| 60 | **Last Name** | Personal & Contact Info | Short Answer Text | Yes | Participant legal last name; part of composite matching key. |
| 61 | **List instrument you will bring** | Event-Specific Participation | Short Answer Text | No | Musical instrument for camp orchestra/worship. |
| 62 | **Local Church** | Personal & Contact Info | Short Answer Text | Yes | Home church affiliation. |
| 63 | **Medical Consent and Liability Release Consent** | Releases & Feedback | Radio | Yes | Strict legal release; "No" triggers auto-rejection. |
| 64 | **Minor's Email (at least 13 years of age)** | Personal & Contact Info | Short Answer Text | No | Direct youth contact; excluded from receipts. |
| 65 | **My current age group** | Personal & Contact Info | Radio | Yes | `12-14`, `15-18`, `19-25`, `26-35`, `36-50`, `51+` |
| 66 | **My language preference** | Personal & Contact Info | Checkboxes | Yes | 23 languages (multi-select). |
| 67 | **My train/bus information** | Other Travel Logistics | Paragraph | No | Auxiliary route/schedule notes. |
| 68 | **Name of Parent/Guardian (if Participant is under 18)** | Personal & Contact Info | Short Answer Text | Yes | Required on youth forms; includes N/A instruction. |
| 69 | **Other Name / Chinese Name** | Personal & Contact Info | Short Answer Text | No | Optional alias or Chinese legal name. |
| 70 | **Other Special Needs/Accommodations (e.g., mobility assistance)** | Lodging & Accommodation | Paragraph | No | Physical accommodations, handicap accessibility, etc. |
| 71 | **Participant can help with the following** | Event-Specific Participation | Checkboxes | No | `Audio/Visual`, `Cleaning`, `Cooking`, `Hymn Leading`, `Interpretation`, `Pianist`, `Testimony`, `Other` |
| 72 | **Phone** | Personal & Contact Info | Short Answer Text | Yes | Participant mobile phone. |
| 73 | **Primary Language** | Personal & Contact Info | Radio | Yes | 23 languages. |
| 74 | **Project/Elective selection** | Event-Specific Participation | Checkboxes | Yes | `Elective A`, `Elective B`, `Elective C` |
| 75 | **Second project choice** | Event-Specific Participation | Radio | No | Alternate workshop preference. |
| 76 | **Secondary Language** | Personal & Contact Info | Dropdown | No | `None` + 23 languages. |
| 77 | **Share a testimony** | Event-Specific Participation | Radio | No | `Yes`, `No` |
| 78 | **Share an experience in servitude** | Event-Specific Participation | Paragraph | No | Reflection on past ministry. |
| 79 | **Signature by Participant/Authorized Signatory** | Releases & Feedback | Short Answer Text | Yes | Electronic legal signature. |
| 80 | **Sleep Preferences & Habits (select all that apply)** | Lodging & Accommodation | Checkboxes | No | `Light sleeper (sensitive to noise/light)`, `Heavy sleeper`, `Early riser`, `Late sleeper`, `Snorer`. Multi-select. |
| 81 | **Sleeping Bag/Pillow** | Lodging & Accommodation | Radio | No | `I will bring my own.`, `I need to borrow from the hosting church.` |
| 82 | **Specify exact dates of arrival/departure for lodging** | Lodging & Accommodation | Paragraph | No | Custom lodging dates. |
| 83 | **T-shirt size** | Event-Specific Participation | Radio | Yes | `XS`, `S`, `M`, `L`, `XL`, `XXL` |
| 84 | **The individuals will be arriving on the same flight** | Arrival Flight Details | Paragraph | No | Group flight coordination notes. |
| 85 | **The individuals will be departing on the same flight** | Departure Flight Details | Paragraph | No | Group flight coordination notes. |
| 86 | **Voice part(s)** | Event-Specific Participation | Checkboxes | No | `Soprano`, `Alto`, `Tenor`, `Bass` |
| 87 | **What fellowship are you representing?** | Event-Specific Participation | Short Answer Text | Yes | Local church youth fellowship/group name. |
| 88 | **What is your current work status?** | Event-Specific Participation | Checkboxes | Yes | `Full-time`, `Part-time`, `Self-employed`, `Unemployed`, `Student` |
| 89 | **What year are you in college?** | Event-Specific Participation | Dropdown | Yes | `Freshman`, `Sophomore`, `Junior`, `Senior`, `Graduate Student`, `Other` |
