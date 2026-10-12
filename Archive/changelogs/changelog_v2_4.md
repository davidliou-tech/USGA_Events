# USGA Event Registration Form Generator - Changelog V2.4

## Overview
Version 2.4 introduces major enhancements for controlling registration limits, managing waitlists, and auditing historical forms. It upgrades the simple "Registration Deadline" into a comprehensive "Registration Information" section that supports precise start/end times and capacity limits.

## Frontend Updates (`sidebar.html`)
- **Advanced Registration Information Section:**
  - Removed the legacy "Registration Deadline" (`date` input).
  - Added "Registration Start Date" and "Registration End Date" using `datetime-local` inputs for precise time control.
  - Added "Maximum Attendees" number input to set capacity limits.
- **Dynamic Date Validation:**
  - Added Javascript event listeners to ensure the "Registration End Date" cannot be set to a time before the "Registration Start Date".
- **Payload Updates:**
  - The `generateForm` payload now properly maps and sends `regStartDate`, `regEndDate`, and `maxAttendees` to the backend script.

## Backend Updates (`code.gs`)
- **Waitlist Automation:**
  - Upgraded `masterRespondToRegistration` to monitor capacity limits.
  - Automatically compares the number of received responses against the `maxAttendees` property stored for that form.
  - If capacity is exceeded, the automated confirmation email changes its subject to **Waitlist** and sends a custom message informing the user that they are on the waitlist.
- **Precise Registration Time Support:**
  - Rewrote `parseLocalDate` to properly parse `YYYY-MM-DDTHH:MM` strings from the new `datetime-local` inputs.
  - The form description generator now accurately formats and renders specific registration opening and closing times (in both English and Traditional Chinese).
- **Form Lifecycle Cron Enhancements:**
  - `masterFormLifecycleCron` was refactored to support exact cutoff times (`isExactEnd`), turning off the form's "Accepting responses" toggle exactly at the specified deadline, while maintaining backward compatibility for legacy date-only forms.
- **Historical Forms Audit Tool [NEW FEATURE]:**
  - Added a new **Audit Tools** section to the custom spreadsheet menu.
  - `setupAuditSheet()` creates a new "Historical Forms Audit" tab where coordinators can paste historical form URLs and expected baseline descriptions.
  - `runAudit()` analyzes the pasted form URLs, extracts their descriptions, and uses `computeDiffRichText()` to highlight any custom or non-standard text in red by comparing it against the expected baseline.
