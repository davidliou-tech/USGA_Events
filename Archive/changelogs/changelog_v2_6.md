# USGA Event Registration Form Generator - Changelog V2.6

## Overview
Version 2.6 introduces native support for Train and Bus travel logistics, refines the V2.5 upgrade tool's data formulas, automates NCC-specific eligibility text, and reverts the date/time selectors back to standard `datetime-local` inputs. 

## Frontend Updates (`sidebar.html`)
- **Automated NCC Eligibility Text:**
  - Added new smart logic to `onTemplateChange()` for the National Church Conference (NCC).
  - When the NCC template is selected, the Eligibility field automatically turns on and pre-fills with: *"This is not an open conference and pertains only to elected delegates and invited observers."*
- **Reverted Date/Time Selectors:**
  - The experimental split Date and Time inputs from V2.5 have been rolled back. 
  - Both Event Dates and Registration Windows now use standard `<input type="datetime-local">` inputs for a unified UI.

## Backend Updates (`code.gs`)
- **Train/Bus Travel Logistics Added to Dictionary & Templates:**
  - Expanded the 'Field Dictionary' to natively support Train/Bus details.
  - New fields added under `Arrival Train/Bus Details`: *Arrival Train/Bus Station*, *Arrival Carrier*, *Arrival Train/Bus Number*.
  - New fields added under `Departure Train/Bus Details`: *Departure Train/Bus Station*, *Departure Carrier*, *Departure Train/Bus Number*.
  - These new fields have been proactively injected into all 17 master templates (SSC, YASC, NATS, etc.) to ensure complete travel tracking.
- **Refined the Summary Dashboard formulas (V2 Upgrade Tool):**
  - Removed the hardcoded logic that conditionally displayed "Needs Ride to NCC" only if the sheet name included "Ministers Workshop".
  - Refactored the `Lodging Before Event` and `Lodging After Event` summary formulas to use the more robust `cCountIfs` function, dropping the older `IFERROR(COUNTIF...)` format for better reliability when migrating legacy data.
- **Translation & Text Tweaks:**
  - Changed the translation map for "Night owl" back to "Late sleeper".
  - Cleaned up the event description header from `𝗛𝗼𝘀𝘁 𝗖𝗵𝘂𝗿𝗰𝗵 / 𝗟𝗼𝗰𝗮𝘁𝗶𝗼𝗻:` to just `𝗛𝗼𝘀𝘁 𝗖𝗵𝘂𝗿𝗰𝗵:`.

> **Note:** The `sidebar.html` script provided appeared to be slightly truncated at the end due to copy-pasting size limits, but all major structural changes in the available script were successfully analyzed.
