# Manage Active Events - Feature Implementation Walkthrough

The "Manage Active Events" feature has been successfully implemented and integrated into the USGA Events Form Generator project.

## Changes Made
1. **Cleaned up duplicates**: Safely deleted the errant `clean_Code.gs` file which was causing a conflict by duplicating functions. 
2. **Added new Google Sheets Menu Item**: Inserted a "Manage Active Events" option into the `USGA Events` dropdown menu in the spreadsheet.
3. **Created `ManageEventsSidebar.html`**: A new, lightweight UI component that opens on the right side of the spreadsheet.
   - It automatically fetches and populates a dropdown with all currently monitored events by cross-referencing the `FormsToMonitor` script property with the `System Log` sheet.
   - Users can now visually edit Registration Start Date, End Date, Max Participants, and Contact Email in a form layout.
4. **Added Backend Handlers in `Code.gs`**:
   - `showManageEventsSidebar()`: Bootstraps the HTML sidebar.
   - `getMonitoredEvents()`: Gathers active form configurations and joins them with the `System Log` data for human-readable titles.
   - `updateMonitoredEvent()`: Safely merges and saves updated configurations back to the script properties, and immediately triggers the `masterFormLifecycleCron()` function to enforce any immediate date changes.

## How to Test
1. Open the USGA Events Google Spreadsheet.
2. In the top navigation bar, click **USGA Events > Manage Active Events**.
3. A sidebar should appear. Wait a moment for it to load your active events.
4. Select one of the events from the dropdown. 
5. The form will populate with the current internal settings (like Max Participants and Dates).
6. Change the "Max Participants" limit and click **Save Changes**.
7. You should see a success message, and the new waitlist cap is now instantly active for that form!

## Follow-up Fixes
- Updated `getMonitoredEvents()` to directly use `FormApp.openById(formId).getTitle()` to fetch the real, readable event names instead of relying on the system log, resolving the issue where IDs were displayed instead of event names.
