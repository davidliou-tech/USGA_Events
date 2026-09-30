# Field Options Review & Option Catalogs

## Overview
This document catalogs all fields in the Master Field Dictionary that contain predefined options (Multiple Choice, Radio, Checkboxes, and Dropdowns). It details the choice text, "Other" write-in enablement, and how options are localized in bilingual forms.

---

## Master Option Catalogs

### 1. Gender (`Gender`)
* **Category:** Personal & Contact Info
* **Type:** Radio
* **Choices:**
  1. `Male` (Bilingual zh-TW: `Male 男`)
  2. `Female` (Bilingual zh-TW: `Female 女`)
* **Technical Note:** In `Summary Dashboard` formulas, prefix matching (`"Male*"` / `"Female*"`) is strictly enforced so that `Female` is never matched by `*Male*`.

---

### 2. Class to Attend (`Class to attend`)
* **Category:** Personal & Contact Info
* **Type:** Radio
* **Master Choices:**
  1. `E2 (Grades 4 to 6)`
  2. `J1 (Grades 7 to 9)`
  3. `J2 (Grades 10 to 12)`
* **Dynamic Behavior:** Filtered dynamically during form generation based on the classes checked by the coordinator in the sidebar.

---

### 3. Age Group (`My current age group`)
* **Category:** Personal & Contact Info
* **Type:** Radio
* **Choices:**
  1. `12-14`
  2. `15-18`
  3. `19-25`
  4. `26-35`
  5. `36-50`
  6. `51+`

---

### 4. Language Selection Fields
* **Primary Language (Radio):** `English`, `Mandarin`, `Cantonese`, `Spanish`, `Japanese`, `Korean`, `French`, `German`, `Italian`, `Portuguese`, `Russian`, `Arabic`, `Hindi`, `Bengali`, `Thai`, `Vietnamese`, `Indonesian`, `Tagalog`, `Dutch`, `Polish`, `Turkish`, `Greek`, `Other`.
* **Secondary Language (Dropdown):** `None` + 23 supported languages + `Other`.
* **Language Preference (Checkboxes):** 23 supported languages + `Other` (multi-select).
* **Interpretation Language (Dropdown):** 23 supported languages + `Other`.

---

### 5. Church Affiliation & Sacrament Questions
* **`I am a baptized member of the True Jesus Church` (Radio):** `Yes`, `No`
* **`I have received the Holy Spirit` (Radio):** `Yes`, `No`

---

### 6. Travel Branching Questions
* **`Arrival Details` (Multiple Choice):**
  1. `I am arriving by car` (Bilingual: `I am arriving by car 我搭車/自行開車抵達`)
  2. `I am arriving by flight` (Bilingual: `I am arriving by flight 我搭乘飛機抵達`)
  3. `I am arriving by train/bus` (Bilingual: `I am arriving by train/bus 我搭乘火車/巴士抵達`)
  4. `I do not need pickup` (Bilingual: `I do not need pickup 我不需被接送`)
* **`Departure Details` (Multiple Choice):**
  1. `I am departing by car` (Bilingual: `I am departing by car 我搭車/自行開車出發`)
  2. `I am departing by flight` (Bilingual: `I am departing by flight 我搭乘飛機出發`)
  3. `I am departing by train/bus` (Bilingual: `I am departing by train/bus 我搭乘火車/巴士出發`)
  4. `I do not need dropoff` (Bilingual: `I do not need dropoff 我不需被接送`)

---

### 7. Lodging & Sleep Preferences
* **`I will be staying at the hosting church.` (Radio):**
  * `Yes` (Bilingual zh-TW: `Yes 是`)
  * `No` (Bilingual zh-TW: `No 否`)
  * *Note:* Counted in `Summary Dashboard` via prefix matching `Yes*` and `No*`.
* **`I need lodging before the event` / `after the event` (Radio):**
  * `Yes` / `No` (Dynamic target date string appended).
* **`Sleeping Bag/Pillow` (Radio):**
  1. `I will bring my own.`
  2. `I need to borrow from the hosting church.`
* **`Sleep Preferences & Habits (select all that apply)` (Checkboxes):**
  1. `Light sleeper (sensitive to noise/light)`
  2. `Heavy sleeper`
  3. `Early riser`
  4. `Late sleeper`
  5. `Snorer`
  * *Note:* Multi-select. Summarized via `COUNTIFS` isolating gender and wildcard search `*${preference}*`.

---

### 8. Event Attendance & Servitude
* **`I will attend...` (Dropdown):** `In Person`, `Online`, `Attendance tentatively unsure`
* **`Attendance commitment` (Radio):** `Full time`, `Part time`
* **`Dates I will attend` (Checkboxes):** `Sunday`, `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, `Saturday`
* **`Are you in: College/Working` (Checkboxes):** `College`, `Working`, `Other`
* **`What year are you in college?` (Dropdown):** `Freshman`, `Sophomore`, `Junior`, `Senior`, `Graduate Student`, `Other`
* **`What is your current work status?` (Checkboxes):** `Full-time`, `Part-time`, `Self-employed`, `Unemployed`, `Student`
* **`Participant can help with the following` (Checkboxes):** `Audio/Visual`, `Cleaning`, `Cooking`, `Hymn Leading`, `Interpretation`, `Pianist`, `Testimony`, `Other`
* **`T-shirt size` (Radio):** `XS`, `S`, `M`, `L`, `XL`, `XXL`
* **`Voice part(s)` (Checkboxes):** `Soprano`, `Alto`, `Tenor`, `Bass`
* **`Completed ___ years of NATS` (Dropdown):** `0`, `1`, `2`, `3`, `4+`
* **`I'm a (Delegate/Observer)` (Dropdown):** `Delegate`, `Observer`
* **`Class A/B preference` (Radio):** `Class A`, `Class B`

---

### 9. Legal Releases & Agreements
* **`Dress Code Agreement` (Radio):** `Yes, I agree`
* **`Medical Consent and Liability Release Consent` (Radio):**
  1. `Yes, I consent.` / `是，本人同意。`
  2. `No, I do not grant medical consent and/or liability release for myself (or my child).` / `否，本人不同意。`
* **`General Media Release Consent` (Radio):**
  1. `Yes, I consent.` / `是，本人同意。`
  2. `No, I choose to opt out and do not grant any General Media Release permissions as stated above...` / `本人選擇退出（Opt out）...`
