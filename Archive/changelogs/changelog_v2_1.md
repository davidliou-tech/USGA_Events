# Changelog: USGA Form Generator V2.1

This minor release focuses on critical security enhancements for email automation and improved compliance handling for registrations involving minors.

## Security & Authentication (`code.gs`)
- **Strict Email Authorization Verification**: Implemented a pre-flight check in `generateForm()` that verifies the active Google account generating the form. 
  - The script now requires the user to be logged in as (or possess Gmail alias access to) the designated Send-As email address (e.g., `us.events@tjc.org`). 
  - This effectively prevents coordinators from accidentally generating forms from their personal Google accounts, which previously caused automated confirmation emails to be sent from their personal inboxes instead of the official group mailbox.

## UI/UX Enhancements (`sidebar.html`)
- **Minors Participation Toggle**: Added a new dropdown field explicitly asking: *"Will this event include participants who are minors (under 18)?"*.
- **Smart Template Defaults**: The toggle intelligently defaults to "Yes" if a known youth-oriented template is selected (e.g., SSC, CYSC, YASC, SMC, MMP, NYTS, MVP Workshop) and "No" otherwise.
- **Payload Integration**: The frontend now captures this toggle and packages the `includesMinors` boolean into the payload sent to the backend generator.

## Legal, Compliance & Field Logic (`code.gs`)
- **Dynamic Field Hoisting**: If the `includesMinors` flag is true, the backend generator now actively intercepts the "Minor's Email" field from the selected fields array and forces it into the very first section of the form (right below the description and before the global privacy consent), ensuring it is highly visible to the parent registering the child.
- **Parental Consent Help Text**: Substantially updated the help text for the *"Minor's Email (at least 13 years of age)"* field. It now legally establishes that by providing the email, the parent/guardian consents to designated church personnel communicating directly with the minor regarding essential event logistics and planning details.
- **Dictionary Expansion**: The *"Minor's Email (at least 13 years of age)"* field was officially added to the Master Field Dictionary under the 'Personal & Contact Info' category.
