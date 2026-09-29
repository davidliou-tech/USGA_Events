# Changelog: USGA Form Generator V2

This release introduces significant enhancements to both the frontend UI and backend generation logic, focusing on multi-language support, intelligent UI behaviors, advanced metadata tracking, automated transportation logistics, and improved system stability.

## Frontend Updates (`sidebar.html`)

### 🏷️ Dynamic Event Categorization & Title Generation
- **Conditional Selectors**: Added new dropdowns for **Season**, **Region**, and **Class** (multi-select). These fields intelligently appear only when a regional event template is selected (e.g., SSC, YASC, CYSC, SMC).
- **Advanced Title Auto-generation**: The script now constructs complex form titles on the fly based on the selected metadata (e.g., automatically generating `"East Region Summer 2026 E2/J1 SSC Registration"`).
- **Smart Editing**: Added an event listener to pause auto-title generation if the user manually types a custom title, preventing their work from being overwritten.

### 🌐 Form Translation UI
- **Translation Settings Panel**: Added a new section to configure form translations.
- **Language Selection Grid**: Includes a toggle that reveals a grid of 21 supported target languages (e.g., Traditional/Simplified Chinese, Spanish, Korean, French, etc.).
- **Payload Integration**: Automatically compiles selected languages into the payload for the backend generator to process.

### ✈️ Smart Airport Mapping
- **Dynamic UI**: The "Hosting Church" input now monitors keystrokes.
- **Region-Specific Suggestions**: When a recognized church is entered (e.g., typing "Irvine"), the generic airport text input is dynamically replaced with specific checkboxes for the closest preferred airports for that region (e.g., SNA, LAX, LGB, ONT).
- **Custom Fallback**: Retains a "Custom Airport" text input for unlisted options.
- **Data Aggregation**: Added `getSelectedAirports()` to neatly compile checkbox selections and custom text into a single string for the backend.

### 🛠 UI/UX Enhancements
- **Event Year**: Added a new `f_year` number input at the top that automatically populates with the current calendar year on load.
- **Updated Defaults**: Changed default Organization Name to "USGA" and default Send-As email to "us.events@tjc.org".

### 🔧 Data Handling & Stability Fixes
- **Safer Checkbox Values**: Field checkboxes now store sanitized field names instead of stringified JSON objects, preventing parsing errors from special characters.
- **Dictionary Lookup**: The generation script reconstructs field objects by looking up sanitized names against the `masterDictionary`, rather than parsing raw UI values.
- **Custom Field Fallback**: Added fallback logic to safely process custom fields dynamically added to the UI that don't exist in the master dictionary.

---

## Backend Updates (`code.gs`)

### 🚗 Automated Transportation Logistics (New)
- **Logistics Worksheets**: `generateForm()` now automatically provisions formatted "Pickup" and "Drop-Off" sheets inside the generated Response Spreadsheet.
- **Live Transportation Sync**: The `masterRespondToRegistration` trigger now actively listens for travel details. If a respondent indicates they are arriving/departing by flight, the script instantly extracts their itinerary and routes their data to the respective "Pickup" or "Drop-Off" sheet.
- **Intelligent Auto-Sorting**: Upon every new entry, the script automatically sorts the logistics sheets chronologically (by City, then Date, then Time) to ensure driver schedules remain perfectly organized.

### 📧 Email Automation Enhancements
- **"Edit Registration" Button Integration**: Because forms are now generated with editing enabled (`setAllowResponseEdits(true)`), the email confirmation script now cross-references the live form submissions, retrieves the respondent's unique Edit URL, and injects a prominent "Edit Your Registration" button directly into their confirmation email.

### 🌍 Advanced Multi-Language Generation
- **Translation Helper**: Introduced `translateText()` leveraging `LanguageApp.translate`.
- **Manual Translation Overrides**: Added a hardcoded `overrides` dictionary specifically for Traditional Chinese (`zh-TW`) to ensure critical, nuanced phrases (like "Registration Deadline" or "Eligibility") are translated accurately. Included inline `.replace()` logic for specific terminology (e.g., NCC).
- **Dual-Language Formatting**: Heavily upgraded the form description builder to format dual-language strings elegantly. Added specific date formatters (`formatDtZh`) for localized date displays.

### 📝 Form Generation Enhancements
- **Response Editing Enabled**: Forms are now generated with `setAllowResponseEdits(true)`, allowing respondents to update their answers after submission.
- **Dynamic Custom Options**: `addFieldToForm()` now parses additional columns from the 'Field Dictionary' to populate dropdowns, radios, and checkboxes with actual, dynamic options.
- **Conditional Option Filtering**: Added logic to dynamically filter the choices for the "Class to attend" field based on what was selected in the frontend UI's class multi-select.
- **"Other" Translation Fixes**: Improved handling of dynamic options by filtering out the literal "Other" choice before translation, relying strictly on Google Form's native `showOtherOption(true)` feature.
- **New Custom Field Layouts**: Added specific layout handlers, section headers, and help text for the "Dress Code Agreement", "Food/Medicine Restrictions", and "Interpretation Language" fields.
- **Robust Participant Query**: Updated the SQL query in the 'Participants' sheet to use `NOT ColX starts with 'First Name'` to ensure the header row is successfully filtered out even if Google Forms automatically translates the header text.

### ⚙️ System Maintenance & Trigger Management
- **Auto-Archiver for Triggers**: Google Apps Script limits users to 20 triggers. V2 introduces a safety mechanism in `generateForm()` that automatically deletes the oldest triggers when approaching the cap (19 triggers).
- **New Maintenance Menu**: Added an 'Advanced Maintenance' sub-menu to the Google Sheets UI.
- **`cleanupDeadTriggers()`**: New utility function to scan and delete orphaned triggers attached to response sheets that have been deleted.
- **`deleteAllTriggers()`**: New utility function to reset the environment by wiping all triggers for the current user.

### 📋 Configuration & Auditing Updates
- **Airport Mapping Initialization**: Added `setupAirportMapping()` to automatically create and populate the regional airport database tab.
- **Expanded Dictionary Setup**: Expanded `setupFieldDictionary()` to include new fields (e.g., 'Dress Code Agreement', 'Parent/Guardian Email', 'Age', 'Interpretation Language').
- **Standardized Templates**: Updated `setupTemplates()` to replace specific regional templates with generic templates (e.g., SSC, YASC, CYSC) designed to work in tandem with the new frontend Region/Season selectors.
- **System Log Updates**: Updated `appendAuditLog()` to capture and log the "Event Year". Included backward-compatibility logic for older System Logs.

### 🔍 Field Audit Tool (New Feature)
- **`runFieldAudit()`**: A major new feature accessible via the main menu. It scans all previously generated forms found in the System Log, compares their questions against the known 'Field Dictionary', and identifies any custom questions coordinators manually added.
- **Pending Fields**: Any undiscovered custom fields found during the audit are automatically logged into a newly created "Pending Fields" tab for review.
