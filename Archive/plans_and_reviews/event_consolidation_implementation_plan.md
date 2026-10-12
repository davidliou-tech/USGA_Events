# Regional Events Template Consolidation

The goal is to analyze the feasibility of consolidating the templates for SSC, YASC, SMC, and CYSC into a single "Regional Event" template and linking the dynamic Form Title logic (Season, Region, Year) to it.

## User Review Required

Please review the field comparisons below. Because these events serve different demographics (e.g., minors vs. adults, full camps vs. simple events), combining them into **one single template** will mean that all attendees (from an adult at YASC to a minor at SSC) will see the exact same form. 

Before we merge them, we need to decide if we want to combine **all** of them into one master template, or if it makes more sense to group them into two templates (e.g., one for Minors/Youth, one for Adults).

## Open Questions

> [!WARNING]
> Combining these into a single template means YASC/Adult attendees would be required to fill out fields like "Parent/Guardian Email", "Grade", and "Liability Consent", while simple SMC attendees would be forced to answer 20+ flight/logistics questions.

1. **Do you want to proceed with a single master template?** If yes, I will merge all fields from all 6 templates into one massive template.
2. **Alternative: Consolidate by Demographic?** We could consolidate the 3 YASC templates and CYSC into a single **"Young Adult / College Convocation (YASC/CYSC)"** template, keep **SSC** separate because of the extensive minor/parent fields, and keep **SMC** separate because it is extremely short and has no travel fields.
3. **Regardless of how we consolidate, I will apply the dynamic `[Season] [Year] [Region]` Form Title logic to ALL of these regional templates.** Does that sound good?

---

## Comparison of Current Templates

### 1. Sacred Music Camp (SMC) - (8 fields)
Very basic registration. No logistics.
* **Fields:** First Name, Last Name, Email, Phone, Gender, Local Church, Baptized, Holy Spirit.

### 2. YASC & CYSC Templates - (24 to 26 fields)
Standard young adult registrations. They all share the same base (Name, Email, Phone, Gender, Church, Baptized, Holy Spirit, Help with, Travel Logistics, Food/Medicine Restrictions).
* **Northwest YASC**: Base fields only.
* **West CYSC**: Base + *Sleep Preferences & Habits*.
* **Southwest YASC**: Base + *Sleep Preferences* + *Staying at Church*.
* **East YASC**: Base + *Are you in: College/Working*.

### 3. Student Spiritual Convocation (SSC) - (42 fields)
Extremely extensive because attendees are minors.
* **Unique Fields not in YASC/SMC**: Class to attend, Grade, Birth Year, Age, Parent Email, Interpret in class?, Sleeping Bag/Pillow, Emergency Contacts (Person, Relationship, Phone, Evening Phone), Lodging before/after, Dress Code Agreement, Media Release, Medical/Liability Consent, Name of Parent, Digital Signature.

---

## Proposed Changes

If you approve **Alternative #2** (Consolidate by Demographic), I will:
1. Delete the redundant regional YASC templates.
2. Create a new unified **"Young Adult / College Spiritual Convocation (YASC/CYSC)"** template that merges the slight variations from the regions.
3. Keep **SSC** and **SMC** as distinct templates.
4. Update `sidebar.html` so that the Region/Season auto-title logic applies to *all three* of these templates (SSC, YASC/CYSC, and SMC).
