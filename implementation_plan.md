# Add "Manage Active Events" Component

Implement a new UI tool to allow users to update hidden configuration parameters for generated events, such as maximum participant limits and registration lifecycle dates.

## Proposed Changes

### `Code.gs` and `clean_Code.gs`
- **Menu Update:** Add a new menu item under `USGA Events` called `Manage Active Events`.
- **Sidebar Loader:** Create `showManageEventsSidebar()` to render a new `ManageEvents.html` sidebar.
- **Backend Fetcher:** Create `getMonitoredEvents()` function to retrieve all forms currently stored in the `FormsToMonitor` ScriptProperties. It will read the **System Log** sheet to match Form IDs (extracted from the Form URL column) to their human-readable **Event Title** and **Event Year**, ensuring a fast, API-quota-friendly dropdown menu without needing to open every form via `FormApp`.
- **Backend Saver:** Create `updateMonitoredEvent(formId, config)` function to validate and update the specific form's settings within `FormsToMonitor` securely.

### `ManageEvents.html` [NEW]
- Create a new HTML file for the sidebar UI.
- Add a `<select>` dropdown populated with active forms retrieved from the backend.
- Display form fields for:
  - **Registration Start Date** (`datetime-local`)
  - **Registration End Date** (`datetime-local`)
  - **Max Participants** (`number`)
  - **Contact Email** (`email`)
- Add a **Save Changes** button that sends the updated values to the backend and displays a success/error status message.

## Verification Plan

### Manual Verification
1. Open the Google Spreadsheet and click **USGA Events > Manage Active Events**.
2. Verify the sidebar opens and populates with a list of currently monitored forms.
3. Select a form and verify its current settings (e.g. Max Participants) are loaded correctly into the inputs.
4. Update a value, click **Save Changes**, and verify the success message appears.
5. Reload the sidebar (or use the test script) to verify the updated limit actually saved in the backend properties.
