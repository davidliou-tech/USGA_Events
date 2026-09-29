# Changelog: USGA Form Generator V2.2

This release introduces a critical bug fix for automated email routing, corrects page navigation logic for travel arrangements, and reorganizes the master dictionary for better logical flow.

## 🐛 Critical Bug Fixes (`code.gs`)

### Email Automation Routing Fix
- **The Issue**: In V2.1, because the "Minor's Email" field was forcibly moved to the top of the form, the `masterRespondToRegistration` trigger would sometimes erroneously grab the minor's email as the primary contact, sending the confirmation and edit links to the child instead of the parent registering them.
- **The Fix**: Rewrote the email extraction logic. The script now strictly attempts to grab the native Google Forms `"Email Address"` field first. If it must fall back to searching headers, it now explicitly ignores any field containing the word `"minor"`.

### Form Navigation & Branching Fix
- **The Issue**: Forms that included "Departure Arrangements" but omitted "Departure Flight Details" would sometimes fail to properly link the user to the final "Consent and Waivers" section, causing a dead end in form navigation.
- **The Fix**: Updated the logical OR conditions in `generateForm()` when setting the `postTravelSection` target. It now correctly bridges the user from general departure questions directly to the waivers section if flight details are not required.

## 🗂 Dictionary & Template Reorganization

### Master Dictionary Updates
- **Emergency Contacts Relocated**: Moved all emergency contact fields (`Emergency Contact Person`, `Emergency Contact Relationship`, `Emergency Contact Phone`, `Emergency Contact Evening Phone`) out of the 'Releases & Feedback' category and into the 'Personal & Contact Info' category.
- **Dress Code**: Moved `Dress Code Agreement` to the 'Event-Specific Participation' category.

### Template Standardization
- **Reordered Templates**: Updated all 17 event templates (SSC, YASC, NYTS, etc.) to reflect the new dictionary structure. Emergency contact information is now logically grouped and presented immediately following the participant's primary contact details, rather than at the very end of the form.

## 🌐 UI & Translation Tweaks
- **UI Label**: Changed "Hosting Church" to "Host Church / Location" in both the Sidebar UI (`sidebar.html`) and the generated form description header.
- **Translation Updates**: Added explicit hardcoded translation overrides for "Yes" (`是`) and "No" (`否`) in Traditional Chinese to ensure strict consistency across automatically translated fields.
