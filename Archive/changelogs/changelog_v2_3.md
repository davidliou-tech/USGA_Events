# Changelog: USGA Form Generator V2.3

This release introduces a major overhaul to how the backend handles transportation logistics (Pickup and Drop-Off sheets), explicitly supporting post-submission edits and cancellations.

## 🚗 Smart Transportation Sync (`code.gs`)

### Intelligent Row Updating (Duplicate Prevention)
- **The Issue**: Previously, if a participant edited their form to update their flight details, the `masterRespondToRegistration` trigger would blindly append a new row to the "Pickup" or "Drop-Off" sheets, creating duplicates for the coordinators to manually resolve.
- **The Fix**: The script now searches the transportation sheets for the participant's email. If they already exist on the sheet, it performs an in-place update of their flight details instead of appending a new row. 

### Cancellation Handling
- **The Issue**: If a participant originally registered needing an airport pickup/drop-off, but later edited their form to say "I do not need pickup/drop-off," their stale flight information remained on the transportation sheets, potentially stranding drivers.
- **The Fix**: The script now detects when a participant removes their need for a flight. Instead of deleting the row (which might break coordinator formulas), it:
  - Adds a "Status" column (newly injected during form generation).
  - Marks the status as **CANCELLED**.
  - Applies a visual strikethrough to the entire row.
  - Colors the row background light red (`#f4cccc`) to immediately alert the coordinator.
  - If the participant edits the form again to re-add a flight, the system updates their details, changes their status back to "Active", and removes the red/strikethrough formatting.

### Sheet Structure Updates
- **New "Status" Column**: A new "Status" column has been added to the generated "Pickup" and "Drop-Off" sheets, situated right before the driver assignment columns, to support the new cancellation logic.
