# USGA Event Registration Form Generator - Changelog V2.7

## Overview
Version 2.7 introduces a new Active Events Management interface, simplifies Event Date inputs, and updates the College Youth Spiritual Convocation (CYSC) template to align with standard minor policies.

## New Feature: Manage Active Events (`ManageEventsSidebar.html` & `Code.gs`)
- **Event Management Sidebar:**
  - Introduced `ManageEventsSidebar.html`, a new sidebar interface that allows event coordinators to modify active form lifecycle settings on the fly.
  - Added the ability to update the **Registration Open/Close Dates**, **Max Attendees (Waitlist trigger)**, and **Contact Email** for any generated form without needing to manually edit backend script properties.
  - Added new backend functions `showManageEventsSidebar`, `getMonitoredEvents`, and `updateMonitoredEvent` to interface with the Form Lifecycle Cron trigger.
  - Placed "Manage Active Events" in the main USGA Events dropdown menu.

## Frontend Updates (`Sidebar.html`)
- **Event Dates Simplified to Date-Only:**
  - Changed the input types for Event Start Date and Event End Date from `<input type="datetime-local">` to `<input type="date">`.
  - This streamlines the UI since specific start and end times for multi-day events are often unnecessary. (Registration windows, however, retain `datetime-local` for exact open/close triggering).

## Backend Updates (`Code.gs`)
- **Date Formatting Refactor:**
  - Rewrote the `formatDt` and `formatDtZh` string parser functions to handle standard `YYYY-MM-DD` date inputs, completely removing the time extraction logic.
- **CYSC Template Changes:**
  - Removed the hardcoded description disclaimer for the College Youth Spiritual Convocation (CYSC) template which previously stated that attendees must be 18 years or older.
  - Added the "Minor's Email (at least 13 years of age)" field to the default CYSC template selection, aligning it with other youth events that permit minors.
  - Removed "Have you led Bible study before?", "Are you in: College/Working", and "What year are you in college?" from the default CYSC template options.
