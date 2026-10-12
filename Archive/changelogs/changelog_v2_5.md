# USGA Event Registration Form Generator - Changelog V2.5

## Overview
Version 2.5 introduces a powerful new Migration/Upgrade tool that allows coordinators to retrofit legacy (V1/V2.0) response spreadsheets with the latest V2 features (like the auto-syncing Logistics sheets and Summary Dashboards). It also features UX improvements to the registration time selectors on the frontend.

## Frontend Updates (`sidebar.html`)
- **Improved Registration Date/Time Selectors:**
  - Removed the unified `datetime-local` inputs (which could be clunky on some browsers) for the Registration Start and End windows.
  - Replaced them with separate, side-by-side `<input type="date">` and `<input type="time">` fields for a cleaner user experience.
  - Added smart defaults: if a date is selected but no time is specified, the Start Time defaults to **12:00 AM** (`00:00`), and the End Time defaults to **11:59 PM** (`23:59`).
- **Payload Construction:**
  - Updated the frontend `generateForm` Javascript to seamlessly combine the separate date and time fields back into the `YYYY-MM-DDTHH:mm` string format expected by the backend parser.

## Backend Updates (`code.gs`)
- **New Feature: V2 Spreadsheet Upgrade Tool:**
  - Added **"Upgrade Existing Sheet (Full Sync)"** to the "Advanced Maintenance" menu.
  - Coordinators can now paste the URL of an older form's response spreadsheet to retroactively upgrade it to the latest V2 standards.
  - **`upgradeExistingSheet()` functionality:**
    - Safely backs up any existing 'Logistics', 'Pickup', 'Drop-Off', or 'Summary Dashboard' sheets by renaming them (e.g., `Logistics_Old`).
    - Dynamically reads the legacy form's headers to determine exactly what questions were asked.
    - Generates brand new V2 versions of the Summary Dashboard, Pickup, Drop-Off, and Logistics sheets.
    - Runs a **Full Historical Sync**, looping through all existing form submissions in the legacy sheet and meticulously mapping every registrant's data into the newly generated Logistics and Transportation sheets.
    - Automatically applies V2 sorting rules to the retrofitted sheets.
