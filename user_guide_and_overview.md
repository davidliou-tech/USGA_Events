# USGA Event Registration System: Overview & User Guide

This document serves as both an overview and a practical manual for event coordinators using the new USGA Event Registration Form Generator.

## Key Features
* **Dynamic Form Generation (Sidebar or Wide Window) [NEW in V2.8]:** Choose between an expanded sidebar UI (350px) or a wide modeless dialog window (500x750px) to select templates, configure details, and generate forms.
* **Smart Regional Logic & Titles:** The sidebar includes smart dropdowns for Region (East, West, etc.) and Season (Winter, Summer, etc.). These dynamically generate the Form's title (e.g., East Region Summer 2026 Student Spiritual Convocation) in real-time.
* **Automated Minors Registration Logic & Safeguards [UPDATED in V2.8]:** The system includes a toggle to designate if an event includes participants under 18. For minor-inclusive events, it automatically injects a minor disclaimer into the form description, mandates `Age` with 1-99 whole number validation, positions `Parent/Guardian` directly beneath Age with N/A guidance, and includes `Minor's Email (at least 13 years of age)`. Receipts are safeguarded to route only to parents/guardians.
* **Dynamic Class Filtering:** For Student Spiritual Convocations (SSC), event coordinators can select the specific classes they are hosting (e.g., J1, J2) in the sidebar. The backend automatically strips out unselected classes from the Google Form's multiple-choice options to prevent incorrect registrations.
* **Active Event Management:** Event registration windows (open and close dates), maximum attendee limits (waitlisting), and contact emails can be edited natively via the "Manage Active Events" sidebar at any time, with live synchronization to the response spreadsheet Settings tab [V2.8].
* **Automated Logistics Sync (Flight & Train/Bus) [UPDATED in V2.8]:** The system automatically creates Pickup, Drop-Off, and Logistics tabs. As participants register, background automation extracts both flight and train/bus details (stations, carriers, train numbers), safely appends them, auto-sorts them chronologically, and highlights live updates.
* **Custom Email Auto-Responder with Alias Security:** Every registration automatically triggers a highly polished, branded confirmation email sent from your designated mailbox alias (e.g., us.events@tjc.org). The form generation enforces strict authentication, ensuring the logged-in user matches the intended contact email to guarantee automated receipts are sent from the correct mailbox.
* **Built-In "Edit Registration" Button:** The custom email now automatically hunts down the participant's unique Edit URL and embeds a highly visible "Edit Your Registration" button directly into the HTML confirmation email.

## How to Use It

### Generating a New Event
1. Open the Master USGA Form Generator Google Sheet.
2. Click the **USGA Events** menu at the top, then choose either **Open Form Generator (Sidebar)** or **Open Form Generator (Wide Window)**.
3. In the generator interface:
   * Select your Template (e.g., Young Adult Spiritual Convocation (YASC)).
   * Toggle your Region and Season to instantly generate the title.
   * If generating an SSC, select the Classes you are hosting.
   * Toggle the *Includes Minors* switch appropriately for your event.
   * Input your standard Event Dates (start and end). *Note: As of V2.7/V2.8, these support clean date inputs with optional time indicators, while Registration Windows enforce 12:01 AM start and 11:59 PM end defaults.*
   * Review and check/uncheck any specific fields you want included.
4. Click **Generate Google Form**. *(Note: Make sure you are logged into the correct Google account matching the 'Send-As' email alias!)*

### Managing Active Events (Registration Windows & Waitlists)
1. Click the **USGA Events** menu at the top, then **Manage Active Events**.
2. Select your event from the dropdown menu.
3. Update your **Registration Start Date**, **Registration End Date**, **Max Attendees**, or **Contact Email**.
4. Click **Save Changes**. The backend automatically syncs these settings with the form lifecycle cron trigger.

### Managing Event Logistics (Transportation, Lodging & Special Arrangements)
* Open the response spreadsheet that was automatically created for your event.
* You will see three automated tabs: `Participants`, `Pickup`, and `Drop-Off`.
* As people register, the Pickup and Drop-Off sheets will automatically populate and sort themselves chronologically by Airport and Time.
* **Assigning Drivers:** You can safely type the names of volunteer drivers directly into the blank "Driver Full Name" columns. As new registrations flow in and the sheet re-sorts, your driver assignments will seamlessly move alongside the passenger's row!

## Event Coordinator Checklist
After generating a form, coordinators should review the following critical items:
* **Mailbox Access:** Ensure you have logged in to and authenticated with the correct group mailbox (or alias) so that automated confirmation emails are sent from the proper "Send-As" address.
* **Publishing the Participants List:**
   1. Publish the "Participants" tab in the Google Sheet to the web.
   2. Link that published URL to the "View Here" text in the form description.
   *Note: If you do not want to publish the attendee list for privacy reasons, you must manually remove the "Attendees: View Here" text from the form's description.*
* **Theming:** Manually update the Google Form's banner image and color scheme to match your event's branding.
* **Translations Check:** If the event requires other translated languages, meticulously proofread all auto-generated translations in the form to ensure accuracy and appropriate context.
* **Minors Awareness:** When creating the form, be strictly aware of whether participants will include minors, and ensure the "Includes Minors" toggle is set correctly to enforce parental consent and minor email capture. *(Note: As of V2.7, the CYSC template defaults to capturing minors' emails).*

## System Maintenance
* **Updating Fields:** The entire field dictionary is stored in the `Field Dictionary` tab. You can add new fields, change options (like Interpretation Languages), or adjust "Required" status directly in the sheet.
* **Run Setup:** If you ever mess up the dictionary or templates, simply click **USGA Events > Setup Initial Configuration (Run Once)** to restore the master defaults!
