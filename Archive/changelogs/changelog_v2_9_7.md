# USGA Event Registration Form Generator - Changelog V2.9.7

## Overview
Version 2.9.7 resolves an issue where participant confirmation emails contained duplicate wording (`"... Registration Registration"`) in their subject lines for both initial and updated registration confirmations. It also cleans redundant event naming in the confirmation, waitlist, and rejection email body templates.

---

## 1. Confirmation Email Subject & Body Title Deduplication
* **Eliminated Duplicate "Registration Registration" in Email Subjects:**
  * In `masterRespondToRegistration(e)` and `testEmailVersions()`, normalized `settings.EventName` to strip trailing `"Registration"` or `"Registration Form"` suffixes before building subject lines.
  * Formatted confirmation, update confirmation, waitlist, and waitlist update subjects with a unified `eventRegTitle` to guarantee `"Registration"` appears exactly once.
* **Refined Email Body Grammar:**
  * Updated email body templates across success confirmation, waitlist, and rejection notifications to use `cleanEventName` instead of `settings.EventName`.
  * Removed redundant wording such as *"received your registration for the [Event Title] Registration"*, making participant communications natural and grammatically sound (*"received your registration for the [Event Title]"*).
