/**
 * @fileoverview Main backend logic for the USGA Event Registration Form Generator V2
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('USGA Events')
      .addItem('Open Form Generator', 'showSidebar')
      .addItem('Manage Active Events', 'showManageEventsSidebar')
      .addSeparator()
      .addItem('Setup Initial Configuration (Run Once)', 'runSetup')
      .addSeparator()
      .addSubMenu(ui.createMenu('Audit Tools')
          .addItem('Run Field Audit (Discover Custom Fields)', 'runFieldAudit')
          .addSeparator()
          .addItem('Setup Historical Forms Description Audit Sheet', 'setupAuditSheet')
          .addItem('Run Historical Forms Description Audit', 'runAudit'))
      .addSeparator()
      .addSubMenu(ui.createMenu('Advanced Maintenance')
          .addItem('Upgrade Existing Sheet (Full Sync)', 'upgradeExistingSheet')
          .addItem('Clean Up Dead Triggers', 'cleanupDeadTriggers')
          .addItem('Delete ALL Triggers (Reset)', 'deleteAllTriggers'))
      .addToUi();
}

function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setTitle('USGA Event Form Generator')
      .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

function showManageEventsSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('ManageEventsSidebar')
      .setTitle('Manage Active Events')
      .setWidth(350);
  SpreadsheetApp.getUi().showSidebar(html);
}

function getMonitoredEvents() {
  const props = PropertiesService.getScriptProperties();
  const formsToMonitor = JSON.parse(props.getProperty('FormsToMonitor') || '{}');
  
  const results = [];
  
  for (const formId in formsToMonitor) {
    const config = formsToMonitor[formId];
    let title = "";
    
    try {
      const form = FormApp.openById(formId);
      title = String(form.getTitle() || "");
      if (!title || title.trim() === "") {
        // Fallback to the file name in Google Drive
        title = String(DriveApp.getFileById(formId).getName() || "");
      }
    } catch(e) {
      title = "Deleted/Inaccessible Form";
    }
    
    if (!title || title.trim() === "") {
      title = "Unknown Event (ID: " + formId.substring(0,8) + "...)";
    }
    
    results.push({
      formId: formId,
      title: title,
      config: config
    });
  }
  
  return results;
}

function updateMonitoredEvent(formId, updatedConfig) {
  const props = PropertiesService.getScriptProperties();
  const formsToMonitor = JSON.parse(props.getProperty('FormsToMonitor') || '{}');
  
  if (!formsToMonitor[formId]) {
    throw new Error("Form ID is no longer being monitored.");
  }
  
  formsToMonitor[formId] = {
    ...formsToMonitor[formId],
    ...updatedConfig
  };
  
  props.setProperty('FormsToMonitor', JSON.stringify(formsToMonitor));
  
  // Re-run the lifecycle cron immediately to apply any date changes instantly
  masterFormLifecycleCron();
  
  return true;
}


function getConfigData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const dictSheet = ss.getSheetByName('Field Dictionary');
  let dictionary = [];
  if (dictSheet) {
    const data = dictSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1]) {
        let options = [];
        for (let k = 4; k < data[i].length; k++) {
           if (data[i][k] && String(data[i][k]).trim() !== '') {
              options.push(String(data[i][k]).trim());
           }
        }
        dictionary.push({
          category: data[i][0],
          name: data[i][1],
          type: data[i][2],
          required: data[i][3] === true || data[i][3] === 'TRUE' || data[i][3] === 'Yes',
          options: options
        });
      }
    }
  }

  const templateSheet = ss.getSheetByName('Templates');
  let templates = [];
  if (templateSheet) {
    const data = templateSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        let templateFields = [];
        for (let j = 1; j < data[i].length; j++) {
          if (data[i][j]) templateFields.push(data[i][j]);
        }
        templates.push({
          name: data[i][0],
          fields: templateFields
        });
      }
    }
  }

  // Alphabetize templates by name
  templates.sort((a, b) => a.name.localeCompare(b.name));

  const airportSheet = ss.getSheetByName('Airport Mapping');
  let airportMapping = {};
  if (airportSheet) {
    const data = airportSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        let mapped = [];
        for (let j = 1; j <= 5; j++) {
           if (data[i][j]) mapped.push(String(data[i][j]).trim());
        }
        airportMapping[data[i][0].trim()] = mapped;
      }
    }
  }

  return { dictionary: dictionary, templates: templates, airportMapping: airportMapping };
}

function generateForm(payload) { try {
  // 0. Verify Email Authorization
  const requiredEmail = (payload.eventDetails.contactEmail || "us.events@tjc.org").toLowerCase();
  const activeEmail = Session.getActiveUser().getEmail().toLowerCase();
  
  const aliases = GmailApp.getAliases().map(alias => alias.toLowerCase());
  
  if (activeEmail !== requiredEmail && !aliases.includes(requiredEmail)) {
    throw new Error(`Authentication Error: You are logged in as ${activeEmail || "a different account"}. You must log into the ${requiredEmail} account (or have it set as an authorized alias) to generate this form, ensuring automated receipts are sent from the correct mailbox.`);
  }

  // 1. Create the new Form
  let formTitle = payload.eventDetails.title || 'Untitled USGA Event';
  
  const form = FormApp.create(formTitle);
  
  // Form Settings based on requirements
  form.setCollectEmail(true); 
  form.setRequireLogin(false); 
  form.setLimitOneResponsePerUser(false); 
  form.setAllowResponseEdits(true);
  
  const t = (text) => translateText(text, payload.languages);
  
  const hasLang = payload.languages && payload.languages.length > 0;
  const isZh = payload.languages && payload.languages.includes('zh-TW');
  
  const t_only = (text) => {
     let full = t(text);
     if (full === text) return "";
     return full.substring(text.length).trim();
  };
  
  let descLines = [];
  
  if (payload.eventDetails.description) {
    descLines.push(t(payload.eventDetails.description));
  }
  
  if (payload.eventDetails.theme) {
    let base = `𝗧𝗵𝗲𝗺𝗲: ${payload.eventDetails.theme}`;
    if (hasLang) base += `\n主題: ${t_only(payload.eventDetails.theme) || payload.eventDetails.theme}`;
    descLines.push(base);
  }
  
  if (payload.eventDetails.host) {
    const encodedHost = encodeURIComponent(payload.eventDetails.host);
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodedHost}`;
    let base = `𝗛𝗼𝘀𝘁 𝗖𝗵𝘂𝗿𝗰𝗵: ${payload.eventDetails.host}\n(𝗠𝗮𝗽: ${mapsLink})`;
    if (hasLang) base += `\n舉辦教會 / 地點: ${t_only(payload.eventDetails.host) || payload.eventDetails.host}\n(地圖: ${mapsLink})`;
    descLines.push(base);
  }
  
  const start = payload.eventDetails.startDate;
  const end = payload.eventDetails.endDate;
  const formatDt = (dt) => {
    if (!dt) return '';
    const [y, m, d] = dt.split('-');
    const dateObj = new Date(y, m - 1, d);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${m}/${d}/${y} (${days[dateObj.getDay()]})`;
  };
  
  const formatDtZh = (dt) => {
    if (!dt) return "";
    const [y, m, d] = dt.split("-");
    const dateObj = new Date(y, m - 1, d);
    const days = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    return `${m}/${d}/${y} (${days[dateObj.getDay()]})`;
  };

  const formatRegDt = (dtStr) => {
    if (!dtStr) return "";
    const d = parseLocalDate(dtStr);
    if (!d) return "";
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };
  
  const formatRegDtZh = (dtStr) => {
    if (!dtStr) return "";
    const d = parseLocalDate(dtStr);
    if (!d) return "";
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  
  if (start && end) {
    let base = `𝗘𝘃𝗲𝗻𝘁 𝗗𝗮𝘁𝗲𝘀: ${formatDt(start)} - ${formatDt(end)}`;
    if (hasLang) base += `\n活動日期: ${isZh ? formatDtZh(start) : formatDt(start)} - ${isZh ? formatDtZh(end) : formatDt(end)}`;
    descLines.push(base);
  } else if (start || end) {
    let base = `𝗘𝘃𝗲𝗻𝘁 𝗗𝗮𝘁𝗲: ${formatDt(start || end)}`;
    if (hasLang) base += `\n活動日期: ${isZh ? formatDtZh(start || end) : formatDt(start || end)}`;
    descLines.push(base);
  }
  
  const regStart = payload.eventDetails.regStartDate;
  const regEnd = payload.eventDetails.regEndDate;
  if (regStart || regEnd) {
    let base = `𝗥𝗲𝗴𝗶𝘀𝘁𝗿𝗮𝘁𝗶𝗼𝗻: `;
    let baseZh = `報名期間: `;
    if (regStart && regEnd) {
       base += `${formatRegDt(regStart)} - ${formatRegDt(regEnd)}`;
       baseZh += `${formatRegDtZh(regStart)} - ${formatRegDtZh(regEnd)}`;
    } else if (regStart) {
       base += `Opens ${formatRegDt(regStart)}`;
       baseZh += `開放於 ${formatRegDtZh(regStart)}`;
    } else if (regEnd) {
       base += `Closes ${formatRegDt(regEnd)}`;
       baseZh += `截止於 ${formatRegDtZh(regEnd)}`;
    }
    if (hasLang && isZh) {
       base += `\n${baseZh}`;
    }
    descLines.push(base);
  }

  if (payload.eventDetails.airports) {
    let base = `𝗣𝗿𝗲𝗳𝗲𝗿𝗿𝗲𝗱 𝗔𝗶𝗿𝗽𝗼𝗿𝘁: ${payload.eventDetails.airports}`;
    if (hasLang) base += `\n首選機場: ${t_only(payload.eventDetails.airports) || payload.eventDetails.airports}`;
    descLines.push(base);
  }
  
  if (payload.eventDetails.eligibility) {
    let base = `𝗘𝗹𝗶𝗴𝗶𝗯𝗶𝗹𝗶𝘁𝘆: ${payload.eventDetails.eligibility}`;
    if (hasLang) {
       const trLabel = t_only('Eligibility');
       const trValue = t_only(payload.eventDetails.eligibility);
       base += `\n${trLabel || 'Eligibility'}: ${trValue || payload.eventDetails.eligibility}`;
    }
    descLines.push(base);
  }
  
  if (payload.eventDetails.fees) {
    let base = `𝗙𝗲𝗲𝘀: ${payload.eventDetails.fees}`;
    if (hasLang) base += `\n費用: ${payload.eventDetails.fees}`;
    descLines.push(base);
  }
  

  if (payload.eventDetails.maxAttendees) {
    let base = `𝗠𝗮𝘅𝗶𝗺𝘂𝗺 𝗔𝘁𝘁𝗲𝗻𝗱𝗲𝗲𝘀: ${payload.eventDetails.maxAttendees}`;
    if (hasLang) {
       const trLabel = t_only('Maximum Attendees') || 'Maximum Attendees';
       base += `\n${trLabel}: ${payload.eventDetails.maxAttendees}`;
    }
    descLines.push(base);
  }

  let attendeesLine = `𝗔𝘁𝘁𝗲𝗻𝗱𝗲𝗲𝘀: View Here`;
  if (hasLang) {
    attendeesLine += `\n${t_only('Attendees') || 'Attendees'}: ${t_only('View Here') || 'View Here'}`;
  }
  descLines.push(attendeesLine);
  
  let isMinorEvent = false;
  
  if (payload.eventDetails.includesMinors !== undefined) {
    isMinorEvent = payload.eventDetails.includesMinors;
  } else {
    const minorTemplates = ['SSC', 'CYSC', 'YASC', 'SMC', 'MMP', 'NYTS', 'MVP Workshop'];
    const templateName = (payload.eventDetails && payload.eventDetails.templateName) ? payload.eventDetails.templateName : formTitle;
    isMinorEvent = minorTemplates.some(t => templateName.includes(t));
  }
  
  if (isMinorEvent) {
    const minorDisclaimer = "𝗜𝗳 𝘁𝗵𝗲 𝗲𝘃𝗲𝗻𝘁 𝗽𝗮𝗿𝘁𝗶𝗰𝗶𝗽𝗮𝗻𝘁 𝗶𝘀 𝗮 𝗺𝗶𝗻𝗼𝗿 𝘂𝗻𝗱𝗲𝗿 𝘁𝗵𝗲 𝗮𝗴𝗲 𝗼𝗳 𝟭𝟴, 𝗿𝗲𝗴𝗶𝘀𝘁𝗿𝗮𝘁𝗶𝗼𝗻 𝗺𝘂𝘀𝘁 𝗯𝗲 𝗰𝗼𝗺𝗽𝗹𝗲𝘁𝗲𝗱 𝗯𝘆 𝗮 𝗽𝗮𝗿𝗲𝗻𝘁/𝗴𝘂𝗮𝗿𝗱𝗶𝗮𝗻. 𝗧𝗵𝗲 𝗿𝗲𝗴𝗶𝘀𝘁𝗿𝗮𝗻𝘁’𝘀 𝗲𝗺𝗮𝗶𝗹 𝗮𝗱𝗱𝗿𝗲𝘀𝘀 (𝗯𝗲𝗹𝗼𝘄) 𝗺𝘂𝘀𝘁 𝗯𝗲 𝘁𝗵𝗮𝘁 𝗼𝗳 𝘁𝗵𝗲 𝗺𝗶𝗻𝗼𝗿 𝗽𝗮𝗿𝘁𝗶𝗰𝗶𝗽𝗮𝗻𝘁’𝘀 𝗽𝗮𝗿𝗲𝗻𝘁/𝗴𝘂𝗮𝗿𝗱𝗶𝗮𝗻.";
    let base = minorDisclaimer;
    if (hasLang) {
       base += `\n${t_only(minorDisclaimer) || minorDisclaimer}`; 
    }
    descLines.push(base);
  }
  
  form.setDescription(descLines.join('\n\n'));

  // Enforce Parent/Guardian field visibility: safely remove if NOT a minor event
  if (!isMinorEvent) {
     payload.selectedFields = payload.selectedFields.filter(f => !f.name.includes('Parent/Guardian'));
  }
  
  // Enforce Sleep Preferences & Habits to always be optional
  payload.selectedFields.forEach(f => {
     if (f.name.includes("Sleep Preferences & Habits")) {
         f.required = false;
     }
  });

  // Pluck out Minor's Email so we can force it into Section 1
  const minorEmailFieldIndex = payload.selectedFields.findIndex(f => f.name === 'Minor\'s Email (at least 13 years of age)');
  let minorEmailField = null;
  if (minorEmailFieldIndex !== -1) {
    minorEmailField = payload.selectedFields.splice(minorEmailFieldIndex, 1)[0];
  }

  if (isMinorEvent) {
     const fieldDef = minorEmailField || {
         name: 'Minor\'s Email (at least 13 years of age)',
         type: 'Short Answer Text',
         required: false
     };
     addFieldToForm(form, fieldDef, payload);
  }

  // 3. Add Global Data Privacy Consent
  form.addMultipleChoiceItem()
    .setTitle(t("I hereby give consent to the General Assembly of the True Jesus Church in the USA, related True Jesus Church local churches and houses of prayer, and their authorized officers, employees, volunteers, and agents (collectively, “TJC”) to collect, maintain, store and use my personal information from this form for the purposes of this event for which I'm registering and/or any related activities."))
    .setChoiceValues([
      t("Yes, I consent."),
      t("No, I do not consent.")
    ])
    .setRequired(true);

  // Force Lodging Fields to ALWAYS be present across all templates
  const hasBefore = payload.selectedFields.some(f => f.name === 'I need lodging before the event');
  const hasAfter = payload.selectedFields.some(f => f.name === 'I need lodging after the event');
  
  if (!hasBefore) {
     payload.selectedFields.push({
         name: 'I need lodging before the event',
         category: 'Lodging & Accommodation',
         type: 'Radio',
         required: true,
         options: ['Yes', 'No']
     });
  } else {
     payload.selectedFields.find(f => f.name === 'I need lodging before the event').required = true;
  }
  
  if (!hasAfter) {
     payload.selectedFields.push({
         name: 'I need lodging after the event',
         category: 'Lodging & Accommodation',
         type: 'Radio',
         required: true,
         options: ['Yes', 'No']
     });
  } else {
     payload.selectedFields.find(f => f.name === 'I need lodging after the event').required = true;
  }

  const hasFood = payload.selectedFields.some(f => f.name === 'Food/Medicine Restrictions');
  const hasSpecial = payload.selectedFields.some(f => f.name === 'Other Special Needs/Accommodations (e.g., mobility assistance)');

  if (!hasFood) {
     payload.selectedFields.push({
         name: 'Food/Medicine Restrictions',
         category: 'Lodging & Accommodation',
         type: 'Paragraph',
         required: false
     });
  }
  
  if (!hasSpecial) {
     payload.selectedFields.push({
         name: 'Other Special Needs/Accommodations (e.g., mobility assistance)',
         category: 'Lodging & Accommodation',
         type: 'Paragraph',
         required: false
     });
  }

  // 4. Group selected fields by Category
  const fieldsByCategory = {};
  payload.selectedFields.forEach(field => {
    if (field.name.toLowerCase() === 'email') return;
    
    let cat = field.category || "General";
    if (cat === "Releases & Feedback") {
       cat = "_FINAL_RELEASES_"; 
    }
    if (!fieldsByCategory[cat]) {
      fieldsByCategory[cat] = [];
    }
    fieldsByCategory[cat].push(field);
  });

  const categories = Object.keys(fieldsByCategory).filter(c => c !== "_FINAL_RELEASES_");

  let arrivalDetailsItem = null;
  let departureDetailsItem = null;
  let arrivalFlightSection = null;
  let departureSection = null;
  let departureFlightSection = null;
  let postTravelSection = null;
  let arrivalTrainSection = null;
  let departureTrainSection = null;

  categories.forEach(category => {
    const pb = form.addPageBreakItem().setTitle(t(category));
    if (category === 'Arrival Flight Details') arrivalFlightSection = pb;
    if (category === 'Departure Arrangements') departureSection = pb;
    if (category === 'Departure Flight Details') departureFlightSection = pb;
    if (category === 'Arrival Train/Bus Details') arrivalTrainSection = pb;
    if (category === 'Departure Train/Bus Details') departureTrainSection = pb;
    
    if ((departureFlightSection || departureSection) && !postTravelSection && category !== 'Departure Flight Details' && category !== 'Departure Arrangements') {
       postTravelSection = pb;
    }

    fieldsByCategory[category].forEach(field => {
      const item = addFieldToForm(form, field, payload);
      if (item && field.name === 'Arrival Details' && item.getType() === FormApp.ItemType.MULTIPLE_CHOICE) arrivalDetailsItem = item;
      if (item && field.name === 'Departure Details' && item.getType() === FormApp.ItemType.MULTIPLE_CHOICE) departureDetailsItem = item;
    });
  });

  // 5. Strict enforcement: Always append Releases & Feedback last
  if (fieldsByCategory["_FINAL_RELEASES_"]) {
    const pb = form.addPageBreakItem().setTitle(t("CONSENT AND WAIVERS"))
        .setHelpText(t("IMPORTANT: I (or my child) will not be permitted to participate in the event and/or any related activities if I do not grant the \"Medical Consent and Liability Release\" for myself (or my child) for this event."));
    if ((departureFlightSection || departureSection) && !postTravelSection) postTravelSection = pb;
        
    fieldsByCategory["_FINAL_RELEASES_"].forEach(field => {
      addFieldToForm(form, field, payload);
    });
  }

  // 6. Link Travel Logistics Page Navigation
  if (arrivalDetailsItem) {
    const choices = [];
    const defaultNext = departureSection ? departureSection : (postTravelSection ? postTravelSection : FormApp.PageNavigationType.CONTINUE);
    choices.push(arrivalDetailsItem.createChoice(t('I am arriving by car'), defaultNext));
    if (arrivalFlightSection) {
      choices.push(arrivalDetailsItem.createChoice(t('I am arriving by flight'), arrivalFlightSection));
    } else {
      choices.push(arrivalDetailsItem.createChoice(t('I am arriving by flight'), defaultNext));
    }
    choices.push(arrivalDetailsItem.createChoice(t('I do not need pickup'), defaultNext));
    arrivalDetailsItem.setChoices(choices);
  }

  if (departureDetailsItem) {
    const target = postTravelSection ? postTravelSection : FormApp.PageNavigationType.SUBMIT;
    const choices = [];
    choices.push(departureDetailsItem.createChoice(t('I am departing by car'), target));
    if (departureFlightSection) {
      choices.push(departureDetailsItem.createChoice(t('I am departing by flight'), departureFlightSection));
    } else {
      choices.push(departureDetailsItem.createChoice(t('I am departing by flight'), target));
    }
    choices.push(departureDetailsItem.createChoice(t('I do not need dropoff'), target));
    
    // Custom option for USGA Ministers Workshop
    if (payload.eventDetails.templateName === 'USGA Ministers Workshop' || formTitle.toLowerCase().includes('ministers workshop')) {
      choices.push(departureDetailsItem.createChoice(t('I need a ride to the National Church Conference (NCC).'), target));
    }
    
    departureDetailsItem.setChoices(choices);
  }

  // -------------------------------------------------------------
  // V2 FEATURES: SUBFOLDER, RESPONSE SHEET, SETTINGS, & TRIGGERS
  // -------------------------------------------------------------
  
  let targetFolder = null;
  const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
  const masterSheetFile = DriveApp.getFileById(ssId);
  const parents = masterSheetFile.getParents();
  
  if (parents.hasNext()) {
    const parentFolder = parents.next();
    targetFolder = parentFolder.createFolder(formTitle); 
  }
  
  const responseSs = SpreadsheetApp.create(formTitle + " Responses");
  const defaultSheet = responseSs.getSheets()[0];
  form.setDestination(FormApp.DestinationType.SPREADSHEET, responseSs.getId());
  
  const settingsSheet = responseSs.insertSheet("Settings");
  settingsSheet.getRange("A1:B1").setValues([["Setting", "Value"]]).setFontWeight("bold");
  settingsSheet.getRange("A2:B4").setValues([
    ["EventName", formTitle],
    ["OrgName", payload.eventDetails.orgName || "USGA"],
    ["ContactEmail", payload.eventDetails.contactEmail || "us.events@tjc.org"]
  ]);
  settingsSheet.autoResizeColumns(1, 2);
  
  const closedMsgSheet = responseSs.insertSheet("Closed Form Messages");
  
  const regStartStr = payload.eventDetails.regStartDate ? formatRegDt(payload.eventDetails.regStartDate) : '';
  const regStartStrZh = payload.eventDetails.regStartDate ? formatRegDtZh(payload.eventDetails.regStartDate) : '';
  const emailStr = payload.eventDetails.contactEmail || "us.events@tjc.org";
  
  let dateStringSheet = "";
  let dateStringZhSheet = "";
  if (start && end) {
     dateStringSheet = `Event Dates: ${formatDt(start)} - ${formatDt(end)}`;
     dateStringZhSheet = `活動日期: ${formatDtZh(start)} - ${formatDtZh(end)}`;
  } else if (start || end) {
     dateStringSheet = `Event Date: ${formatDt(start || end)}`;
     dateStringZhSheet = `活動日期: ${formatDtZh(start || end)}`;
  }

  let preMsgSheet = regStartStr ? `Registration for ${formTitle} will open on ${regStartStr}. ${dateStringSheet}\n\nIf you have any questions, please contact ${emailStr}.` : `Registration for ${formTitle} is not yet open. ${dateStringSheet}\n\nIf you have any questions, please contact ${emailStr}.`;
  let postMsgSheet = `Registration for ${formTitle} is now closed. ${dateStringSheet}\n\nIf you have any questions or require assistance, please contact ${emailStr}.`;

  if (payload.languages && payload.languages.includes('zh-TW')) {
     const preZh = regStartStrZh ? `${formTitle} 的報名將於 ${regStartStrZh} 開放。` : `${formTitle} 的報名尚未開放。`;
     preMsgSheet += `\n\n${preZh} ${dateStringZhSheet}\n\n如果您有任何問題，請聯繫 ${emailStr}。`;
     postMsgSheet += `\n\n${formTitle} 的報名現已截止。 ${dateStringZhSheet}\n\n如果您有任何問題或需要協助，請聯繫 ${emailStr}。`;
  }

  closedMsgSheet.getRange("A1:B1").setValues([["Message Type", "Message Text"]]).setFontWeight("bold").setBackground("#d9ead3");
  closedMsgSheet.getRange("A2:B2").setValues([["Pre-Registration (Opens soon)", preMsgSheet]]);
  closedMsgSheet.getRange("A3:B3").setValues([["Post-Registration (Closed)", postMsgSheet]]);
  closedMsgSheet.setColumnWidth(1, 250);
  closedMsgSheet.setColumnWidth(2, 600);
  closedMsgSheet.getRange("B2:B3").setWrap(true);
  closedMsgSheet.getRange("A1:B3").setVerticalAlignment("top");

  
  const participantsSheet = responseSs.insertSheet("Participants");
  const fnMatch = `MATCH("First Name*", 'Form Responses 1'!1:1, 0)`;
  const lnMatch = `MATCH("Last Name*", 'Form Responses 1'!1:1, 0)`;
  const lcMatch = `IFERROR(MATCH("Local Church*", 'Form Responses 1'!1:1, 0), MATCH("What fellowship*", 'Form Responses 1'!1:1, 0))`;
  const queryFormula = `={"First Name", "Last Name", "Local Church/Place of Worship"; IFERROR(UNIQUE(QUERY({'Form Responses 1'!A:ZZ}, "SELECT Col" & ${fnMatch} & ", Col" & ${lnMatch} & ", Col" & ${lcMatch} & " WHERE Col" & ${fnMatch} & " IS NOT NULL AND NOT Col" & ${fnMatch} & " starts with 'First Name' ORDER BY Col" & ${lnMatch} & " ASC", 0)), {"No responses yet", "", ""})}`;
  
  participantsSheet.getRange("A1").setFormula(queryFormula);
  participantsSheet.getRange("D1").setFormula(`="Total Participants: " & IF(A2="No responses yet", 0, COUNTA(A2:A))`);
  participantsSheet.getRange("A1:C1").setFontWeight("bold").setBackground("#4a86e8").setFontColor("white"); 
  participantsSheet.setFrozenRows(1);
  participantsSheet.getRange("D1").setFontWeight("bold").setBackground("#d9d9d9").setFontColor("black"); 
  participantsSheet.setColumnWidth(1, 150);
  participantsSheet.setColumnWidth(2, 150);
  participantsSheet.setColumnWidth(3, 250);
  participantsSheet.setColumnWidth(4, 200);
  
  const pickupSheet = responseSs.insertSheet("Pickup");
  pickupSheet.appendRow([
    "First Name", "Last Name", "Email", "Phone Number", 
    "Arrival Details", "Arrival Date", "Arrival Time", 
    "Departing City/Airport", "Arrival City/Airport", "Arrival Airline", "Arrival Flight Number", "Arrival Train/Bus Station", "Arrival Carrier", "Arrival Train/Bus Number", 
    "Status", "Driver Full Name", "Driver Phone Number"
  ]);
  pickupSheet.getRange("A1:N1").setFontWeight("bold").setBackground("#4a86e8").setFontColor("white");
  pickupSheet.setFrozenRows(1);
  pickupSheet.getRange(1, 1, pickupSheet.getMaxRows(), pickupSheet.getLastColumn()).createFilter();
  
  const dropoffSheet = responseSs.insertSheet("Drop-Off");
  dropoffSheet.appendRow([
    "First Name", "Last Name", "Email", "Phone Number", 
    "Departure Details", "Departure Date", "Departure Time", 
    "Departure City/Airport", "Departure Airline", "Departure Flight Number", "Destination City/Airport", "Departure Train/Bus Station", "Departure Carrier", "Departure Train/Bus Number", 
    "Status", "Driver Full Name", "Driver Phone Number"
  ]);
  dropoffSheet.getRange("A1:N1").setFontWeight("bold").setBackground("#4a86e8").setFontColor("white");
  dropoffSheet.setFrozenRows(1);
  dropoffSheet.getRange(1, 1, dropoffSheet.getMaxRows(), dropoffSheet.getLastColumn()).createFilter();
  
  // ----------------------------------------------------
  // Add Logistics & Accommodations Sheet (Static)
  // ----------------------------------------------------
  const logisticsSheet = responseSs.insertSheet("Logistics");
  
  let logHeaders = ["First Name", "Last Name", "Email", "Phone"];
  
  const optionalHeadersMap = {
    "Gender": "Gender",
    "Age": "Age",
    "Grade (As of September)": "Grade",
    "My current age group": "Age Group",
    "Local Church": "Local Church/Place of Worship",
    "What fellowship": "Local Church/Place of Worship",
    "I will be staying at the hosting church.": "Staying at Host Church?",
    "I need lodging before the event": "Lodging Before",
    "I need lodging after the event": "Lodging After",
    "Food/Medicine Restrictions": "Food/Medicine Restrictions",
    "Sleep Preferences & Habits (select all that apply)": "Sleep Preferences & Habits",
    "Other Special Needs/Accommodations (e.g., mobility assistance)": "Other Special Needs",
    "Emergency Contact Person": "Emergency Contact Person",
    "Emergency Contact Relationship": "Emergency Contact Relationship",
    "Emergency Contact Phone": "Emergency Contact Phone"
  };

  const selectedNames = payload.selectedFields.map(f => f.name);

  if (selectedNames.some(n => n.includes("Local Church") || n.includes("What fellowship"))) {
     logHeaders.push("Local Church/Place of Worship");
  }
  
  for (const [key, headerStr] of Object.entries(optionalHeadersMap)) {
    if (key.includes("Local Church") || key.includes("What fellowship")) continue;
    if (selectedNames.some(n => n.includes(key))) {
      if (!logHeaders.includes(headerStr)) {
         logHeaders.push(headerStr);
      }
    }
  }

  if (selectedNames.some(n => n === "I need lodging before the event") && !logHeaders.includes("Lodging Before")) {
      logHeaders.push("Lodging Before");
  }
  if (selectedNames.some(n => n === "I need lodging after the event") && !logHeaders.includes("Lodging After")) {
      logHeaders.push("Lodging After");
  }
  if (selectedNames.some(n => n === "Food/Medicine Restrictions") && !logHeaders.includes("Food/Medicine Restrictions")) {
      logHeaders.push("Food/Medicine Restrictions");
  }
  if (selectedNames.some(n => n === "Other Special Needs/Accommodations (e.g., mobility assistance)") && !logHeaders.includes("Other Special Needs")) {
      logHeaders.push("Other Special Needs");
  }

  logHeaders.push("Room Assignment", "Group/Team", "Notes");

  logisticsSheet.appendRow(logHeaders);
  
  const autoColCount = logHeaders.length - 3;
  logisticsSheet.getRange(1, 1, 1, autoColCount).setFontWeight("bold").setBackground("#4a86e8").setFontColor("white");
  logisticsSheet.getRange(1, autoColCount + 1, 1, 3).setFontWeight("bold").setBackground("#ffd966").setFontColor("black");
  
  logisticsSheet.setFrozenRows(1);
  logisticsSheet.setColumnWidth(1, 150);
  logisticsSheet.setColumnWidth(2, 150);
  for (let i = 3; i <= logHeaders.length; i++) {
     logisticsSheet.setColumnWidth(i, 200);
  }
  logisticsSheet.getRange(1, 1, logisticsSheet.getMaxRows(), logHeaders.length).createFilter();

  // ----------------------------------------------------
  // Add Summary Dashboard Sheet
  // ----------------------------------------------------
  const summarySheet = responseSs.insertSheet("Summary Dashboard");
  summarySheet.getRange("A1").setValue("Event Summary Dashboard").setFontWeight("bold").setFontSize(14);
  
      const sumData = [];
  
  // Helper for single match
  const cCountIfs = (name, val) => {
     return `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("${name}*", 'Form Responses 1'!1:1, 0)), "${val}"), 0)`;
  };

  // Helper for wildcard arrival/departure matching
  const cTravelMatch = (type, mode) => {
     return `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("${type}*", 'Form Responses 1'!1:1, 0)), "*${mode}*"), COUNTIF('Form Responses 1'!1:1000, "*${type === 'Arrival' ? 'arriving' : 'departing'} by ${mode}*"))`;
  };

  sumData.push(["Total Registrants", `="Total: " & IF(Participants!A2="No responses yet", 0, COUNTA(Participants!A2:A))`, "", ""]);
  sumData.push(["", "", "", ""]);
  
  sumData.push(["Travel Logistics", "", "", ""]);
  sumData.push(["Arriving by Flight", cTravelMatch("Arrival", "flight"), "", ""]);
  sumData.push(["Arriving by Car", cTravelMatch("Arrival", "car"), "", ""]);
  sumData.push(["Does Not Need Pickup", cCountIfs("Arrival", "*need pickup*"), "", ""]);
  sumData.push(["Departing by Flight", cTravelMatch("Departure", "flight"), "", ""]);
  sumData.push(["Departing by Car", cTravelMatch("Departure", "car"), "", ""]);
  sumData.push(["Does Not Need Drop-off", cCountIfs("Departure", "*need drop*"), "", ""]);
  sumData.push(["", "", "", ""]);

  sumData.push(["Lodging Needs", "", "", ""]);
    const cLodgingMatch = (mode) => {
     if (mode === "Yes") {
         return `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("I will be staying*", 'Form Responses 1'!1:1, 0)), "Yes"), IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("*住宿*", 'Form Responses 1'!1:1, 0)), "*host church*"), COUNTIF('Form Responses 1'!1:1000, "*host church*")))`;
     } else {
         return `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("I will be staying*", 'Form Responses 1'!1:1, 0)), "No"), IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("*住宿*", 'Form Responses 1'!1:1, 0)), "*self*"), COUNTIF('Form Responses 1'!1:1000, "*self-arranged*")))`;
     }
  };

  sumData.push(["Staying at Hosting Church", cLodgingMatch("Yes"), "", ""]);
  sumData.push(["Not Staying at Hosting Church", cLodgingMatch("No"), "", ""]);
  sumData.push(["", "", "", ""]);

  sumData.push(["Dietary & Medical", "", "", ""]);
  const cNeedsMatch = (matcher) => {
      const idx = `INDEX('Form Responses 1'!A2:ZZ1000, 0, MATCH("${matcher}", 'Form Responses 1'!1:1, 0))`;
      return `=IFERROR(COUNTIFS(${idx}, "<>", ${idx}, "<>None", ${idx}, "<>None ", ${idx}, "<> None", ${idx}, "<>No", ${idx}, "<>N/A", ${idx}, "<>NA", ${idx}, "<>None.", ${idx}, "<>Thank you!", ${idx}, "<>Thank you", ${idx}, "<>*don*t need lodging*"), 0)`;
  };
  sumData.push(["Has Food/Medicine Restrictions", cNeedsMatch("Food/Medicine*"), "", ""]);
  sumData.push(["Has Other Special Needs", cNeedsMatch("Other Special Needs*"), "", ""]);
  sumData.push(["", "", "", ""]);

  sumData.push(["Demographics", "", "", ""]);
  sumData.push(["Males", cCountIfs("Gender", "*Male*"), "", ""]);
  sumData.push(["Females", cCountIfs("Gender", "*Female*"), "", ""]);
  
  if (selectedNames.some(n => n.includes("My current age group"))) {
      sumData.push(["", "", "", ""]);
      sumData.push(["Age Groups", "", "", ""]);
      const ageGroups = ['12-14', '15-18', '19-25', '26-35', '36-50', '51+'];
      ageGroups.forEach(ag => {
         sumData.push([ag, cCountIfs("My current age group", ag), "", ""]);
      });
  }

  sumData.push(["", "", "", ""]);
  
  const prefs = ['Light sleeper (sensitive to noise/light)', 'Heavy sleeper', 'Early riser', 'Late sleeper', 'Snorer'];
  const prefCountIfs = (pref, gender) => {
     if (gender) {
        return `=IFERROR(COUNTIFS(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("Sleep Preferences*", 'Form Responses 1'!1:1, 0)), "*${pref}*", INDEX('Form Responses 1'!A:ZZ, 0, MATCH("Gender*", 'Form Responses 1'!1:1, 0)), "*${gender}*"), 0)`;
     } else {
        return `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("Sleep Preferences*", 'Form Responses 1'!1:1, 0)), "*${pref}*"), 0)`;
     }
  };
  
  sumData.push(["Sleep Preferences", "Males", "Females", "Total"]);
  prefs.forEach(p => {
     sumData.push([p, prefCountIfs(p, "Male"), prefCountIfs(p, "Female"), prefCountIfs(p, null)]);
  });

  summarySheet.getRange(3, 1, sumData.length, 4).setValues(sumData);
  summarySheet.getRange(3, 1, sumData.length, 1).setFontWeight("bold");
  summarySheet.setColumnWidth(1, 300);
  summarySheet.setColumnWidth(2, 100);
  summarySheet.setColumnWidth(3, 100);
  summarySheet.setColumnWidth(4, 100);
  
  for(let i=0; i<sumData.length; i++) {
     if(sumData[i][0] && sumData[i][1] === "" && sumData[i][2] === "") {
        summarySheet.getRange(3+i, 1, 1, 4).setBackground("#f3f3f3").setFontColor("#333333");
     } else if (sumData[i][0] === "Sleep Preferences") {
        summarySheet.getRange(3+i, 1, 1, 4).setBackground("#f3f3f3").setFontColor("#333333").setFontWeight("bold");
     }
  }

// ----------------------------------------------------
// Add Airport Summary Sheet
// ----------------------------------------------------
if (arrivalDetailsItem || departureSection) {
  const airportSummarySheet = responseSs.insertSheet("Airport Summary");
  airportSummarySheet.getRange("A1").setValue("Event Airport Summary").setFontWeight("bold").setFontSize(14);
  
  airportSummarySheet.getRange("A3").setValue("Arrivals by Airport").setFontWeight("bold").setBackground("#4a86e8").setFontColor("white");
  const arrCol = `MATCH("Arrival City/Airport*", 'Form Responses 1'!1:1, 0)`;
  airportSummarySheet.getRange("A4").setFormula(`=IFERROR(QUERY('Form Responses 1'!A:ZZ, "SELECT Col" & ${arrCol} & ", COUNT(Col" & ${arrCol} & ") WHERE Col" & ${arrCol} & " IS NOT NULL GROUP BY Col" & ${arrCol} & " LABEL COUNT(Col" & ${arrCol} & ") ''", -1), {"No arrivals data", ""})`);
  
  airportSummarySheet.getRange("D3").setValue("Departures by Airport").setFontWeight("bold").setBackground("#4a86e8").setFontColor("white");
  const depCol = `MATCH("Departure City/Airport*", 'Form Responses 1'!1:1, 0)`;
  airportSummarySheet.getRange("D4").setFormula(`=IFERROR(QUERY('Form Responses 1'!A:ZZ, "SELECT Col" & ${depCol} & ", COUNT(Col" & ${depCol} & ") WHERE Col" & ${depCol} & " IS NOT NULL GROUP BY Col" & ${depCol} & " LABEL COUNT(Col" & ${depCol} & ") ''", -1), {"No departures data", ""})`);
  
  airportSummarySheet.setColumnWidth(1, 300);
  airportSummarySheet.setColumnWidth(2, 100);
  airportSummarySheet.setColumnWidth(3, 50);
  airportSummarySheet.setColumnWidth(4, 300);
  airportSummarySheet.setColumnWidth(5, 100);
}


// ----------------------------------------------------
// Add Airport Summary Sheet
// ----------------------------------------------------
if (arrivalDetailsItem || departureSection) {
  const airportSummarySheet = responseSs.insertSheet("Airport Summary");
  airportSummarySheet.getRange("A1").setValue("Event Airport Summary").setFontWeight("bold").setFontSize(14);
  
  airportSummarySheet.getRange("A3").setValue("Arrivals by Airport").setFontWeight("bold").setBackground("#4a86e8").setFontColor("white");
  const arrCol = `MATCH("Arrival City/Airport*", 'Form Responses 1'!1:1, 0)`;
  airportSummarySheet.getRange("A4").setFormula(`=IFERROR(QUERY('Form Responses 1'!A:ZZ, "SELECT Col" & ${arrCol} & ", COUNT(Col" & ${arrCol} & ") WHERE Col" & ${arrCol} & " IS NOT NULL GROUP BY Col" & ${arrCol} & " LABEL COUNT(Col" & ${arrCol} & ") ''", -1), {"No arrivals data", ""})`);
  
  airportSummarySheet.getRange("D3").setValue("Departures by Airport").setFontWeight("bold").setBackground("#4a86e8").setFontColor("white");
  const depCol = `MATCH("Departure City/Airport*", 'Form Responses 1'!1:1, 0)`;
  airportSummarySheet.getRange("D4").setFormula(`=IFERROR(QUERY('Form Responses 1'!A:ZZ, "SELECT Col" & ${depCol} & ", COUNT(Col" & ${depCol} & ") WHERE Col" & ${depCol} & " IS NOT NULL GROUP BY Col" & ${depCol} & " LABEL COUNT(Col" & ${depCol} & ") ''", -1), {"No departures data", ""})`);
  
  airportSummarySheet.setColumnWidth(1, 300);
  airportSummarySheet.setColumnWidth(2, 100);
  airportSummarySheet.setColumnWidth(3, 50);
  airportSummarySheet.setColumnWidth(4, 300);
  airportSummarySheet.setColumnWidth(5, 100);
}

  // Clean up the initial default blank sheet (e.g. "Sheet1")
  try {
    if (defaultSheet) {
      responseSs.deleteSheet(defaultSheet);
    }
  } catch(e) {
    // Ignore if it fails or doesn't exist
  }
  
  if (targetFolder) {
    DriveApp.getFileById(form.getId()).moveTo(targetFolder);
    DriveApp.getFileById(responseSs.getId()).moveTo(targetFolder);
  }
  
  try {
    const triggers = ScriptApp.getProjectTriggers();
    if (triggers.length >= 19) {
      const excess = triggers.length - 18;
      for (let i = 0; i < excess; i++) {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
  } catch (e) {
    Logger.log("Auto-archiver failed: " + e.message);
  }
  
  ScriptApp.newTrigger('masterRespondToRegistration')
      .forSpreadsheet(responseSs.getId())
      .onFormSubmit()
      .create();

  // Save Registration Lifecycle config
  if (payload.eventDetails.regStartDate || payload.eventDetails.regEndDate || payload.eventDetails.maxAttendees) {
    const props = PropertiesService.getScriptProperties();
    let monitor = JSON.parse(props.getProperty('FormsToMonitor') || '{}');
    monitor[form.getId()] = {
      start: payload.eventDetails.regStartDate ? parseLocalDate(payload.eventDetails.regStartDate).getTime() : null,
      end: payload.eventDetails.regEndDate ? parseLocalDate(payload.eventDetails.regEndDate).getTime() : null,
      isExactEnd: payload.eventDetails.regEndDate ? payload.eventDetails.regEndDate.includes('T') : false,
      max: payload.eventDetails.maxAttendees ? parseInt(payload.eventDetails.maxAttendees, 10) : null,
      contactEmail: payload.eventDetails.contactEmail || "us.events@tjc.org",
      isZh: isZh
    };
    props.setProperty('FormsToMonitor', JSON.stringify(monitor));
    
    // Ensure cron trigger exists
    const triggers = ScriptApp.getProjectTriggers();
    let hasCron = false;
    for (let i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'masterFormLifecycleCron') {
        hasCron = true;
        break;
      }
    }
    if (!hasCron) {
      ScriptApp.newTrigger('masterFormLifecycleCron').timeBased().everyHours(1).create();
    }
    
    // Evaluate initial state right now on the active form
    const now = new Date().getTime();
    let shouldAccept = true;
    if (monitor[form.getId()].start && now < monitor[form.getId()].start) {
      shouldAccept = false;
    }
    const endThreshold1 = monitor[form.getId()].isExactEnd ? monitor[form.getId()].end : (monitor[form.getId()].end + 24*60*60*1000);
    if (monitor[form.getId()].end && now > endThreshold1) {
      shouldAccept = false;
    }
    
    if (!shouldAccept) {
      form.setAcceptingResponses(false);
    }
  }

  const masterSs = SpreadsheetApp.getActiveSpreadsheet();
  appendAuditLog(masterSs, payload, form, responseSs);



  return {
    editUrl: form.getEditUrl(),
    sheetUrl: responseSs.getUrl(),
    publishedUrl: form.getPublishedUrl()
  };
  } catch (err) {
    throw new Error(err.message + "\nStack: " + err.stack);
  }
}

/**
 * Helper to map our dictionary types to FormApp methods.
 */
function addFieldToForm(form, field, payload) {
  // Hard override for Sleep Preferences
  if (field.name.includes("Sleep Preferences & Habits")) {
     field.required = false;
  }
  let item;
  const typeStr = field.type.toLowerCase();
  const languages = payload.languages || [];
  const airports = (payload.eventDetails && payload.eventDetails.airports) ? payload.eventDetails.airports : null;
  const t = (text) => translateText(text, languages);
  const isZh = languages.includes('zh-TW');

  if (field.name === 'I need lodging before the event' || field.name === 'I need lodging after the event') {
    const isBefore = field.name.includes('before');
    const targetDate = isBefore ? (payload.eventDetails && payload.eventDetails.startDate) : (payload.eventDetails && payload.eventDetails.endDate);
    
    let baseEn = field.name;
    let baseZh = isBefore ? '活動開始前我需要住宿' : '活動結束後我需要住宿';
    
    let translatedTitle = t(field.name);
    
    if (targetDate) {
      const d = parseLocalDate(targetDate);
      if (d) {
         d.setDate(d.getDate() + (isBefore ? -1 : 1));
         const formattedDate = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
         const englishStr = `(i.e. ${isBefore ? 'before' : 'after'} ${formattedDate})`;
         const chineseStr = `(即 ${formattedDate} 之${isBefore ? '前' : '後'})`;
         
         if (isZh) {
             translatedTitle = `${baseEn} ${englishStr}\n${baseZh} ${chineseStr}`;
         } else {
             translatedTitle = `${translatedTitle} ${englishStr}`;
         }
      }
    }
    
    item = form.addMultipleChoiceItem().setTitle(translatedTitle);
    item.setChoiceValues([t('Yes'), t('No')]);
    item.setRequired(true);
    return item;
  }

  if (field.name === 'Minor\'s Email (at least 13 years of age)') {
    item = form.addTextItem().setTitle(t(field.name));
    item.setHelpText(t('If the event participant is a minor and at least 13 years of age, designated church personnel may communicate directly with the minor. By providing the minor’s email (below), the parent/guardian consents to the direct communication with the minor participant regarding essential event logistics, schedules, event updates, and planning details.'));
    if (field.required) item.setRequired(true);
    return item;
  }
  
  if (field.name === 'Medical Consent and Liability Release Consent') {
    const hostName = (payload.eventDetails && payload.eventDetails.host) ? payload.eventDetails.host : "______________________ (name(s) of hosting church(es) of the event)";
    const hostNameZh = (payload.eventDetails && payload.eventDetails.host) ? payload.eventDetails.host : "________________（舉辦教會名稱）";
    
    let enTitle = 'Medical Consent and Liability Release';
    let zhTitle = '醫療同意與免責聲明';
    
    let enHelp = `IMPORTANT: I (or my child) will not be permitted to participate in the event and/or any related activities if I do not grant the medical consent and sign the liability release for myself (or my child) for this event.\n\nIn case of a medical emergency involving me (or my child) during the course of the event and/or any activities related to my (or my child’s) participation in the event, including without limitations, any activities during the course of my (or my child’s) lodging arranged by the hosting church of the event, whether before or after the event, I authorize designated church personnel to provide or administer reasonably necessary medications, first-aid, and basic life-saving measures, unless I have provided written notice of specific restrictions. In addition, I hereby give permission to church personnel to arrange for me (or my child) to seek medical care and attention. I also authorize medical personnel to administer any necessary and appropriate care. I fully understand and acknowledge that participation in this event and/or any related activities is voluntary and at my (or my child’s) own risk.\n\nIn consideration for being permitted to participate, I, on behalf of myself (or my child), and our next of kin, heirs, and legal representatives, promise to waive, release, discharge, hold harmless, indemnify, and forever defend the General Assembly of the True Jesus Church in the USA, the True Jesus Church in [${hostName}], and all its/their authorized officers, employees, volunteers, and agents (collectively “TJC”), from and against any and all known or unknown, foreseen or unforeseen bodily or personal injuries, death or permanent injury, illnesses, property damage, or other losses, including all resulting consequences, expenses, costs, and attorney’s fees, arising out of or in any way associated with participation in the event and/or any related activities, whether caused by negligence or not, to the fullest extent permitted by law.\n\nI accept full personal and legal responsibility for any risks associated with participation and understand this release is binding and perpetual.\n\nI further acknowledge and agree that in the event medical costs are not fully covered by my (or my child’s) insurance, I shall bear full financial responsibility for all such uncovered expenses.`;
    
    let zhHelp = `重要聲明：本人知悉並理解，倘本人（或本人子女）未就本次活動提供醫療同意並簽署本責任免除聲明，則本人（或本人子女）將不得參與本活動及／或任何相關活動。\n\n如本人（或本人子女）在活動期間及／或參與本活動相關之任何活動中（包括但不限於活動前後，由主辦教會所安排之住宿期間所進行之任何活動）發生緊急醫療情況時，本人特此授權指定之教會人員，在未收到本人書面通知限制之情形下，提供或施行合理且必要之藥物、急救措施及基本生命維持措施。本人並進一步授權教會人員協助安排本人（或本人子女）接受醫療照護與治療，並同意授權相關醫療專業人員施行任何必要且適當之醫療處置。本人充分理解並確認，參與本活動及／或任何相關活動均屬自願，並由本人（或本人子女）自行承擔一切風險。\n\n作為允許本人（或本人子女）參與本活動之對價與條件，本人代表本人（或本人子女），以及本人及其近親、繼承人與法律代表人，特此同意放棄、免除、解除、使其不受損害，並賠償及永久為真耶穌教會美國總會、【${hostNameZh}】及其各該授權之負責人、員工、志工與代理人（以下統稱「真耶穌教會」）抗辯，使其免於承擔因本人（或本人子女）參與本活動及／或任何相關活動而產生或與之相關之一切已知或未知、可預見或不可預見之人身傷害、疾病、永久傷害、死亡、財產損失或其他任何損害或損失，以及因此所生之一切後果、費用、支出及律師費用，無論是否因過失所致，均於法律允許之最大範圍內適用。\n\n本人確認並同意，本人（或本人子女）自行承擔參與本活動之一切風險，且本免責與放棄責任之聲明具有永久效力，並對本人及相關繼受人具有法律約束力。\n\n本人並進一步確認，倘本人（或本人子女）之醫療費用未能由現有保險全額支付，本人同意自行承擔所有未獲保險理賠之醫療費用及相關支出。`;
    
    const otherLangs = languages.filter(l => l !== 'zh-TW');
    let finalTitle = translateText(enTitle, otherLangs);
    let finalHelp = translateText(enHelp, otherLangs);
    
    if (isZh) {
      finalTitle += '\n' + zhTitle;
      finalHelp += '\n\n' + zhHelp;
    }
    
    form.addSectionHeaderItem().setTitle(finalTitle).setHelpText(finalHelp);
        
    item = form.addMultipleChoiceItem().setTitle(finalTitle);
    
    let opt1En = 'Yes, I consent.';
    let opt2En = 'No, I do not grant medical consent and/or liability release for myself (or my child).';
    
    let finalOpt1 = translateText(opt1En, otherLangs);
    let finalOpt2 = translateText(opt2En, otherLangs);
    
    if (isZh) {
      finalOpt1 += ' / 是，本人同意。';
      finalOpt2 += ' / 否，本人不同意。';
    }
    
    item.setChoiceValues([finalOpt1, finalOpt2]);
    if (field.required) item.setRequired(true);
    return item;
  }
  
  if (field.name === 'General Media Release Consent') {
    let enTitle = 'General Media Release';
    let zhTitle = '媒體發布同意書';
    
    let enHelp = `Unless I expressly opt out below, I hereby grant the General Assembly of the True Jesus Church in the USA, related True Jesus Church local churches and houses of prayer, and their authorized officers, employees, volunteers, and agents (collectively, “TJC”), the absolute right and permission to copy, exhibit, use, take, alter, distribute, and/or publish my (or my child’s) likeness, name, voice, and/or image, in whole or in part, whether in composite form and/or in conjunction with my (or my child’s) name and other identifying information, in photographs, videos, or other media formats, whether now known or hereafter invented, for any lawful purpose whatsoever.\n\nI also grant TJC the same rights and permission to use any written or verbal statements or testimonies (in whole or in part) made by me (or my child) for the same lawful purposes.\n\nI hereby waive all rights, interests, claims for payment or other compensation in connection with TJC’s exercise of its rights set forth here. Additionally, I hereby release, indemnify, and agree to hold harmless TJC from any and all liability in connection with TJC’s exercise of its rights set forth herein.`;
    
    let zhHelp = `除非本人於下方明確勾選選擇退出（Opt out），本人特此同意並授權真耶穌教會美國總會（General Assembly of the True Jesus Church in the USA）、其相關之真耶穌教會地方教會及祈禱所，以及其經正式授權之幹部、員工、志工（統稱為「真耶穌教會」），享有絕對之權利與許可，就本人（或本人子女）之肖像、姓名、聲音及／或影像之全部或部分內容，不論是否以合成形式，及／或是否與本人（或本人子女）之姓名或其他可識別身分資料一併使用，得以拍攝、複製、展示、使用、修改、散布及／或發佈於照片、影片或其他任何媒體形式中，不論該媒體係現有或將來發明的，並得為任何合法目的使用。\n\n本人亦同意並授權真耶穌教會享有相同之權利與許可，得為相同之合法目的，使用本人（或本人子女）所作之任何書面或口頭陳述或見證（不論全部或部分）。\n\n本人特此放棄就真耶穌教會行使本同意書所載權利之一切權利、利益、報酬請求或任何形式之補償。此外，本人並同意免責、賠償並使真耶穌教會免於承擔任何及所有因真耶穌教會行使本同意書所載權利而產生或相關之一切責任。`;
    
    const otherLangs = languages.filter(l => l !== 'zh-TW');
    let finalTitle = translateText(enTitle, otherLangs);
    let finalHelp = translateText(enHelp, otherLangs);
    
    if (isZh) {
      finalTitle += '\n' + zhTitle;
      finalHelp += '\n\n' + zhHelp;
    }

    form.addSectionHeaderItem().setTitle(finalTitle).setHelpText(finalHelp);
        
    item = form.addMultipleChoiceItem().setTitle(finalTitle);
    
    let opt1En = 'Yes, I consent.';
    let opt2En = 'No, I choose to opt out and do not grant any General Media Release permissions as stated above. This may exclude me (or my child) from official photos, recordings, and/or media (including presentations) collected, produced or published by TJC in connection with this event. I understand this may limit my (or my child’s) participation in certain event activities where media is captured.';
    
    let finalOpt1 = translateText(opt1En, otherLangs);
    let finalOpt2 = translateText(opt2En, otherLangs);
    
    if (isZh) {
      finalOpt1 += ' / 是，本人同意。';
      finalOpt2 += ' / 本人選擇退出（Opt out），不同意提供上述任何一般媒體授權。此一選擇可能導致本人（或本人子女）不被納入真耶穌教會就本次活動所拍攝、錄製、製作或發布之官方照片、錄音、影像及／或其他媒體作品（包括影片展示）中。本人了解，此決定可能限制本人（或本人子女）參與部分涉及影像或音訊拍攝、錄製之活動。';
    }

    item.setChoiceValues([finalOpt1, finalOpt2]);
    if (field.required) item.setRequired(true);
    return item;
  }
  
  if (field.name === 'Signature by Participant/Authorized Signatory') {
    item = form.addTextItem().setTitle(t('Signature by Participant/Authorized Signatory (Parent/Guardian if Participant is under 18)'));
    item.setHelpText(t('Please type your full legal name to electronically sign this Registration Form. By placing your digital/electronic signature and/or mark below, you agree that this Registration Form may be signed electronically and that you are bound by all the terms of this Registration Form:'));
    if (field.required) item.setRequired(true);
    return item;
  }
  
  if (field.name === 'Dress Code Agreement') {
    form.addSectionHeaderItem()
        .setTitle(t('Dress Code Agreement'))
        .setHelpText(t('Dress code is conservative church attire.\n\nThe following will be inappropriate: wild hairstyles, unnatural hair color, sleeveless/see-through/low-neckline tops, pants/skirts falling above the knee, low-risers, clothing with inappropriate/offensive pictures/words, ripped jeans, tight-fitting clothes, nail polish, and backless sandals.\n\nBy signing below, I have read and agree to the above statements.'));
        
    item = form.addMultipleChoiceItem().setTitle(t(field.name));
    item.setChoiceValues([
      t('Yes, I agree')
    ]);
    if (field.required) item.setRequired(true);
    return item;
  }  
if (field.name === 'Arrival City/Airport' || field.name === 'Departure City/Airport') {
  const airportFullNames = {
    'ATL': 'Hartsfield-Jackson Atlanta International Airport (ATL)',
    'AUS': 'Austin-Bergstrom International Airport (AUS)',
    'BOS': 'Boston Logan International Airport (BOS)',
    'BUR': 'Hollywood Burbank Airport (BUR)',
    'BWI': 'Baltimore/Washington International Airport (BWI)',
    'DAL': 'Dallas Love Field (DAL)',
    'DCA': 'Ronald Reagan Washington National Airport (DCA)',
    'DEN': 'Denver International Airport (DEN)',
    'DFW': 'Dallas/Fort Worth International Airport (DFW)',
    'EWR': 'Newark Liberty International Airport (EWR)',
    'FLL': 'Fort Lauderdale-Hollywood International Airport (FLL)',
    'HNL': 'Daniel K. Inouye International Airport (HNL)',
    'HOU': 'William P. Hobby Airport (HOU)',
    'IAD': 'Washington Dulles International Airport (IAD)',
    'IAH': 'George Bush Intercontinental Airport (IAH)',
    'JFK': 'John F. Kennedy International Airport (JFK)',
    'LAS': 'Harry Reid International Airport (LAS)',
    'LAX': 'Los Angeles International Airport (LAX)',
    'LGB': 'Long Beach Airport (LGB)',
    'LGA': 'LaGuardia Airport (LGA)',
    'MCO': 'Orlando International Airport (MCO)',
    'MDW': 'Chicago Midway International Airport (MDW)',
    'MIA': 'Miami International Airport (MIA)',
    'OAK': 'Oakland International Airport (OAK)',
    'ONT': 'Ontario International Airport (ONT)',
    'ORD': "Chicago O'Hare International Airport (ORD)",
    'PDX': 'Portland International Airport (PDX)',
    'PHL': 'Philadelphia International Airport (PHL)',
    'PHX': 'Phoenix Sky Harbor International Airport (PHX)',
    'RDU': 'Raleigh-Durham International Airport (RDU)',
    'SAN': 'San Diego International Airport (SAN)',
    'SEA': 'Seattle-Tacoma International Airport (SEA)',
    'SFB': 'Orlando Sanford International Airport (SFB)',
    'SFO': 'San Francisco International Airport (SFO)',
    'SJC': 'Norman Y. Mineta San Jose International Airport (SJC)',
    'SMF': 'Sacramento International Airport (SMF)',
    'SNA': 'John Wayne Airport (SNA)',
    'TPA': 'Tampa International Airport (TPA)',
    'TTN': 'Trenton-Mercer Airport (TTN)'
  };

  let mappedCodes = [];
  const host = (payload.eventDetails && payload.eventDetails.host) ? payload.eventDetails.host : "";
  
  try {
    const airportSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Airport Mapping');
    if (airportSheet) {
      const data = airportSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] && host.toLowerCase().includes(String(data[i][0]).toLowerCase())) {
          for (let j = 1; j <= 5; j++) {
             if (data[i][j]) mappedCodes.push(String(data[i][j]).trim());
          }
          break;
        }
      }
    }
  } catch(e) {}

  let mappedFullNames = mappedCodes.map(code => airportFullNames[code] || code);
  const preferredArr = airports ? airports.split(',').map(s => s.trim()).filter(s => s !== '') : [];
  
  let finalChoices = [];

  preferredArr.forEach(pref => {
     finalChoices.push(`⭐ ${pref}`);
  });

  mappedFullNames.forEach(mapped => {
     const isPref = preferredArr.some(p => p.toLowerCase() === mapped.toLowerCase());
     if (!isPref) {
        finalChoices.push(mapped);
     }
  });

  if (finalChoices.length > 0) {
      item = form.addMultipleChoiceItem().setTitle(t(field.name));
      item.setChoiceValues(finalChoices.map(c => t(c)));
      item.showOtherOption(true);
  } else {
      item = form.addTextItem().setTitle(t(field.name));
  }
  
  if (field.required) item.setRequired(true);
  
  if (field.name === 'Arrival City/Airport') {
     item.setHelpText(t('Please select or enter the airport for your arrival flight.'));
  } else {
     item.setHelpText(t('Please select or enter the airport for your departure flight.'));
  }
  return item;
}

  if (typeStr.includes('short answer') || typeStr.includes('text') || typeStr.includes('number')) {
    item = form.addTextItem().setTitle(t(field.name));
  } 
  else if (typeStr.includes('paragraph')) {
    item = form.addParagraphTextItem().setTitle(t(field.name));
  }
  else if (typeStr.includes('dropdown')) {
    item = form.addListItem().setTitle(t(field.name));
    if (field.options && field.options.length > 0) {
      item.setChoiceValues(field.options.map(o => t(o)));
    } else {
      item.setChoiceValues([t('Option 1'), t('Option 2'), t('Option 3')]);
    }
  }
  else if (field.name === 'Food/Medicine Restrictions') {
    item = form.addParagraphTextItem().setTitle(t(field.name));
    item.setHelpText(t('Please share any dietary restrictions, allergies, or medicines, including any special dietary needs.'));
    if (field.required) item.setRequired(true);
    return item;
  }
  else if (field.name === 'Interpretation Language') {
    item = form.addListItem().setTitle(t(field.name));
    item.setHelpText(t('If you answered Yes above, please select the language you need interpretation for.'));
    if (field.options && field.options.length > 0) {
      item.setChoiceValues(field.options.map(o => t(o)));
    }
    if (field.required) item.setRequired(true);
    return item;
  }
  else if (field.name === 'Other Special Needs/Accommodations (e.g., mobility assistance)') {
    item = form.addParagraphTextItem().setTitle(t(field.name));
    item.setHelpText(t('Please share any other special needs or accommodations required.'));
    if (field.required) item.setRequired(true);
    return item;
  }
  
  else if (typeStr.includes('radio') || typeStr.includes('multiple choice')) {
    item = form.addMultipleChoiceItem().setTitle(t(field.name));
    
    const nameLower = field.name.toLowerCase();
    
    if (nameLower === 'arrival details' || nameLower === 'departure details') {
       item.setChoiceValues([t('I am arriving by car'), t('I am arriving by flight'), t('I am arriving by train/bus'), t('I do not need pickup')]);
       // These will be overwritten by navigation logic if applicable
    } else if (field.options && field.options.length > 0) {
       let finalOptions = field.options;
       if (field.name === 'Class to attend' && payload.eventDetails && payload.eventDetails.classes && payload.eventDetails.classes.length > 0) {
          finalOptions = finalOptions.filter(opt => payload.eventDetails.classes.some(c => opt.includes(c)));
       }
       const cleanOpts = finalOptions.filter(o => o !== 'Other');
       if (cleanOpts.length > 0) {
          item.setChoiceValues(cleanOpts.map(o => t(o)));
       } else {
          item.setChoiceValues([t('Option 1')]); // Fallback if somehow empty
       }
       if (field.options.includes('Other')) item.showOtherOption(true);
    } else if (nameLower.includes('yes/no') || nameLower.includes('consent') || nameLower.includes('release') || nameLower.includes('pick up') || nameLower.includes('drop off')) {
       item.setChoiceValues([t('Yes'), t('No')]);
    } else if (nameLower.includes('gender')) {
       item.setChoiceValues([t('Male'), t('Female')]);
    } else {
       item.setChoiceValues([t('Option 1'), t('Option 2'), t('Option 3')]);
       item.showOtherOption(true);
    }
  }
  else if (typeStr.includes('checkbox')) {
    item = form.addCheckboxItem().setTitle(t(field.name));
    if (field.options && field.options.length > 0) {
       const cleanOpts = field.options.filter(o => o !== 'Other');
       if (cleanOpts.length > 0) {
          item.setChoiceValues(cleanOpts.map(o => t(o)));
       } else {
          item.setChoiceValues([t('Option 1')]);
       }
       if (field.options.includes('Other')) item.showOtherOption(true);
    } else if (field.name.includes('Sleep Preferences')) {
      item.setChoiceValues([
        t('Light sleeper (sensitive to noise/light)'),
        t('Heavy sleeper'),
        t('Early riser'),
        t('Late sleeper'),
        t('Snorer')
      ]);
    } else {
      item.setChoiceValues([t('Option 1'), t('Option 2'), t('Option 3')]);
      item.showOtherOption(true);
    }
  }
  else if (typeStr.includes('date/time')) {
    item = form.addDateTimeItem().setTitle(t(field.name));
  }
  else if (typeStr.includes('date')) {
    item = form.addDateItem().setTitle(t(field.name));
  }
  else if (typeStr.includes('time')) {
    item = form.addTimeItem().setTitle(t(field.name));
  }
  else {
    item = form.addTextItem().setTitle(t(field.name));
  }

  if (item && typeof item.setRequired === 'function') {
    item.setRequired(field.required === true);
  }

  if (item && typeof item.setHelpText === 'function') {
    const t_only = (text) => {
       let full = t(text);
       if (full === text) return "";
       return full.substring(text.length).trim();
    };
    
    const getPreferredHelpText = () => {
      if (!airports) return '';
      const baseLabel = 'Preferred Airport(s) for this event';
      const translatedLabel = t_only(baseLabel);
      if (translatedLabel) {
        return `\n\n${baseLabel} ${translatedLabel}: ${airports}`;
      } else {
        return `\n\n${t(baseLabel)}: ${airports}`;
      }
    };

    if (field.name === 'Departing City/Airport') {
      const baseHelp = 'Please enter the airport name and code where your flight originates.';
      item.setHelpText(t(baseHelp));
    } else if (field.name === 'Arrival City/Airport') {
      const baseHelp = 'Please enter the airport name and code for your arrival flight.';
      item.setHelpText(t(baseHelp) + getPreferredHelpText());
    } else if (field.name === 'Departure City/Airport') {
      const baseHelp = 'Please enter the airport name and code for your departure flight.';
      item.setHelpText(t(baseHelp) + getPreferredHelpText());
    } else if (field.name === 'Arrival Airline') {
      item.setHelpText(t('e.g.: American Airlines'));
    } else if (field.name === 'Arrival Flight Number') {
      item.setHelpText(t('e.g.: AA909'));
    }
  }
  return item;
}

/**
 * Centralized email handler triggered whenever ANY generated form is submitted.
 */
function masterRespondToRegistration(e) {
  try {
    const sheet = e.range.getSheet();
    const responseSs = sheet.getParent();
    
    // GOOGLE FORMS EDIT BUG FIX:
    // e.namedValues drops unmodified fields during an edit.
    // Instead, we build the exact same object using the live spreadsheet row to guarantee 100% of the data is present.
    const rowNum = e.range.getRow();
    const headersRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    const rowData = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    
    const responses = {};
    for (let i = 0; i < headersRow.length; i++) {
        responses[String(headersRow[i])] = [String(rowData[i])];
    }
    
    let emailRecipient = "";
    let firstName = "Registrant";
    let medicalConsent = "";
    
    if (responses["Email Address"] && responses["Email Address"][0]) {
      emailRecipient = responses["Email Address"][0];
    }
    
    for (let header in responses) {
      if (!emailRecipient && header.toLowerCase().includes("email") && !header.toLowerCase().includes("minor")) {
        emailRecipient = responses[header][0];
      }
      if (header.toLowerCase().includes("first name")) {
        if (responses[header][0]) {
          firstName = responses[header][0];
        }
      }
      if (header.toLowerCase().includes("medical consent") || header.toLowerCase().includes("liability release")) {
        medicalConsent = responses[header][0];
      }
    }
    
    // FALLBACK: Google Forms sometimes omits system-collected emails on EDIT events.
    // If we still don't have an email, pull it directly from the spreadsheet row.
    if (!emailRecipient) {
      const rowNum = e.range.getRow();
      const headersRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      let emailColIdx = -1;
      for (let i = 0; i < headersRow.length; i++) {
        if (String(headersRow[i]).toLowerCase().includes("email") && !String(headersRow[i]).toLowerCase().includes("minor")) {
           emailColIdx = i + 1;
           break;
        }
      }
      if (emailColIdx !== -1) {
         emailRecipient = sheet.getRange(rowNum, emailColIdx).getValue();
      }
    }
    
    if (!emailRecipient) return;

    let settings = {
      EventName: "USGA Event",
      OrgName: "USGA",
      ContactEmail: "us.events@tjc.org"
    };
    const settingsSheet = responseSs.getSheetByName("Settings");
    if (settingsSheet) {
      const settingsData = settingsSheet.getRange("A2:B4").getValues();
      settingsData.forEach(row => { settings[row[0]] = row[1]; });
    } else {
      // Backward compatibility for older forms without a Settings tab
      try {
         const formUrl = responseSs.getFormUrl();
         if (formUrl) {
            settings.EventName = FormApp.openByUrl(formUrl).getTitle();
         }
      } catch(e) {}
    }

    const isRejected = medicalConsent.toLowerCase().startsWith("no");
    const commonStyles = `style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #2c3e50;"`;
    const signature = `<p ${commonStyles}>In Christ,<br><span style="color: #2980b9; font-weight: bold;">${settings.OrgName}</span></p>`;

    let logoBlob = null;
    let logoHtml = "";
    try {
      logoBlob = DriveApp.getFileById("1KltAMA0tXmJeeam2pg_omUjMvD5_un-d").getBlob();
      logoHtml = `<img src="cid:usgaLogo" alt="${settings.OrgName} Logo" style="max-width: 150px; height: auto; margin-bottom: 20px;">`;
    } catch (err) {
      Logger.log("Could not load logo: " + err.message);
    }

    try {
      let lastName = "", phone = "", arrDetails = "", arrDate = "", arrTime = "", depCity = "", arrCity = "", arrAirline = "", arrFlight = "";
      let depDetails = "", depDate = "", depTime = "", depCityOut = "", depAirline = "", depFlight = "", destCity = "";

      for (let header in responses) {
        let hLower = header.toLowerCase();
        let val = responses[header][0];
        
        if (hLower.includes("last name")) lastName = val;
        else if (hLower.includes("phone") && !hLower.includes("emergency")) phone = val;
        else if (hLower.includes("arrival details") || hLower.includes("arrival arrangements") || hLower.includes("arriving by")) arrDetails = val;
        else if (hLower.includes("arrival date")) arrDate = val;
        else if (hLower.includes("arrival time")) arrTime = val;
        else if (hLower.includes("departing city")) depCity = val;
        else if (hLower.includes("arrival city")) arrCity = val;
        else if (hLower.includes("arrival airline")) arrAirline = val;
        else if (hLower.includes("arrival flight number")) arrFlight = val;
        else if (hLower.includes("departure details") || hLower.includes("departure arrangements") || hLower.includes("departing by")) depDetails = val;
        else if (hLower.includes("departure date")) depDate = val;
        else if (hLower.includes("departure time")) depTime = val;
        else if (hLower.includes("departure city") && !hLower.includes("departing")) depCityOut = val;
        else if (hLower.includes("departure airline")) depAirline = val;
        else if (hLower.includes("departure flight number")) depFlight = val;
        else if (hLower.includes("destination city")) destCity = val;
      }

      // ----------------------------------------------------
      // Update Pickup Sheet Logic
      // ----------------------------------------------------
      const pickupSheet = responseSs.getSheetByName("Pickup");
      if (pickupSheet) {
        const data = pickupSheet.getDataRange().getValues();
        let foundRowIndex = -1;
        for (let i = 1; i < data.length; i++) {
          if (data[i][2] && String(data[i][2]).toLowerCase() === emailRecipient.toLowerCase()) {
            foundRowIndex = i + 1; // 1-indexed for Sheets
            break;
          }
        }

        if (arrDetails && arrDetails.toLowerCase().includes("arriving by flight")) {
          // They are arriving by flight - either update or append
          let flightStatus = "Active";
          let hasArrDetails = data[0][4] && String(data[0][4]).toLowerCase().includes("details");
          if (foundRowIndex !== -1) {
             const oldRow = data[foundRowIndex - 1];
             const changed = hasArrDetails 
                 ? (oldRow[4] !== arrDetails || String(oldRow[5]) !== String(arrDate) || String(oldRow[6]) !== String(arrTime) || oldRow[7] !== depCity || oldRow[8] !== arrCity || oldRow[9] !== arrAirline || oldRow[10] !== arrFlight)
                 : (String(oldRow[4]) !== String(arrDate) || String(oldRow[5]) !== String(arrTime) || oldRow[6] !== depCity || oldRow[7] !== arrCity || oldRow[8] !== arrAirline || oldRow[9] !== arrFlight);
             let oldStatusIdx = hasArrDetails ? 11 : 10;
             if (oldRow[oldStatusIdx] === "CANCELLED") {
                flightStatus = "Active"; // Restored
             } else if (changed) {
                flightStatus = "UPDATED"; // Highlight that flight info changed
             } else {
                flightStatus = oldRow[11] || "Active"; // Retain whatever it was
             }
          }
          
          const newRowData = [firstName, lastName, emailRecipient, phone, arrDetails, arrDate, arrTime, depCity, arrCity, arrAirline, arrFlight, flightStatus];
          
          if (foundRowIndex !== -1) {
            pickupSheet.getRange(foundRowIndex, 1, 1, 12).setValues([newRowData]);
            // Reset formatting if they were cancelled, or apply warning color if UPDATED
            if (data[foundRowIndex - 1][11] === "CANCELLED" || flightStatus === "UPDATED") {
              pickupSheet.getRange(foundRowIndex, 1, 1, pickupSheet.getLastColumn())
                         .setFontLine("none")
                         .setBackground(flightStatus === "UPDATED" ? "#fff2cc" : null) // light yellow if updated
                         .setFontColor(flightStatus === "UPDATED" ? "#b45f06" : null);
            }
          } else {
            pickupSheet.appendRow([...newRowData, "", ""]);
          }
        } else if (foundRowIndex !== -1 && data[foundRowIndex - 1][11] !== "CANCELLED") {
          // They exist on the sheet, but no longer need a flight (or deleted their answer). Mark as CANCELLED.
          pickupSheet.getRange(foundRowIndex, 12).setValue("CANCELLED");
          pickupSheet.getRange(foundRowIndex, 1, 1, pickupSheet.getLastColumn())
                     .setFontLine("line-through")
                     .setBackground("#f4cccc") // light red background
                     .setFontColor("#666666"); // dark gray text
        }

        if (pickupSheet.getLastRow() > 1) {
           pickupSheet.getRange(2, 1, pickupSheet.getLastRow() - 1, pickupSheet.getLastColumn())
                      .sort([{column: 9, ascending: true}, {column: 6, ascending: true}, {column: 7, ascending: true}]);
        }
      }

      // ----------------------------------------------------
      // Update Drop-Off Sheet Logic
      // ----------------------------------------------------
      const dropoffSheet = responseSs.getSheetByName("Drop-Off");
      if (dropoffSheet) {
        const data = dropoffSheet.getDataRange().getValues();
        let foundRowIndex = -1;
        for (let i = 1; i < data.length; i++) {
          if (data[i][2] && String(data[i][2]).toLowerCase() === emailRecipient.toLowerCase()) {
            foundRowIndex = i + 1;
            break;
          }
        }

        if (depDetails && depDetails.toLowerCase().includes("departing by flight")) {
          let flightStatus = "Active";
          let hasDepDetails = data[0][4] && String(data[0][4]).toLowerCase().includes("details");
          if (foundRowIndex !== -1) {
             const oldRow = data[foundRowIndex - 1];
             const changed = hasDepDetails
                 ? (oldRow[4] !== depDetails || String(oldRow[5]) !== String(depDate) || String(oldRow[6]) !== String(depTime) || oldRow[7] !== depCityOut || oldRow[8] !== depAirline || oldRow[9] !== depFlight || oldRow[10] !== destCity)
                 : (String(oldRow[4]) !== String(depDate) || String(oldRow[5]) !== String(depTime) || oldRow[6] !== depCityOut || oldRow[7] !== depAirline || oldRow[8] !== depFlight || oldRow[9] !== destCity);
             let oldStatusIdx = hasDepDetails ? 11 : 10;
             if (oldRow[oldStatusIdx] === "CANCELLED") {
                flightStatus = "Active";
             } else if (changed) {
                let ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/dd/yy h:mm a");
                flightStatus = "Updated " + ts;
             } else {
                flightStatus = oldRow[oldStatusIdx] || "Active";
             }
          }

          let updateData = hasDepDetails ? 
              [firstName, lastName, emailRecipient, phone, depDetails, depDate, depTime, depCityOut, depAirline, depFlight, destCity, flightStatus] :
              [firstName, lastName, emailRecipient, phone, depDate, depTime, depCityOut, depAirline, depFlight, destCity, flightStatus];
              
          if (foundRowIndex !== -1) {
            dropoffSheet.getRange(foundRowIndex, 1, 1, updateData.length).setValues([updateData]);
            
            let oldStatusIdx = hasDepDetails ? 11 : 10;
            let isUpdated = String(flightStatus).startsWith("Updated");
            if (data[foundRowIndex - 1][oldStatusIdx] === "CANCELLED" || isUpdated) {
              dropoffSheet.getRange(foundRowIndex, 1, 1, dropoffSheet.getLastColumn())
                         .setFontLine("none")
                         .setBackground(isUpdated ? "#fff2cc" : null) // light yellow
                         .setFontColor(isUpdated ? "#b45f06" : null);
            }
          } else {
            dropoffSheet.appendRow([...updateData, "", ""]);
          }
        } else if (foundRowIndex !== -1 && data[foundRowIndex - 1][11] !== "CANCELLED") {
          // They exist on the sheet, but no longer need a flight. Mark as CANCELLED.
          dropoffSheet.getRange(foundRowIndex, 12).setValue("CANCELLED");
          dropoffSheet.getRange(foundRowIndex, 1, 1, dropoffSheet.getLastColumn())
                     .setFontLine("line-through")
                     .setBackground("#f4cccc") 
                     .setFontColor("#666666"); 
        }

        if (dropoffSheet.getLastRow() > 1) {
           dropoffSheet.getRange(2, 1, dropoffSheet.getLastRow() - 1, dropoffSheet.getLastColumn())
                      .sort([{column: 8, ascending: true}, {column: 6, ascending: true}, {column: 7, ascending: true}]);
        }
      }

      // ----------------------------------------------------
      // Update Logistics Sheet Logic
      // ----------------------------------------------------
      const logisticsSheet = responseSs.getSheetByName("Logistics");
      if (logisticsSheet) {
        const logData = logisticsSheet.getDataRange().getValues();
        const logHeaders = logData[0];
        
        let foundRowIndex = -1;
        let emailColIdx = -1;
        for(let j = 0; j < logHeaders.length; j++) {
           if(logHeaders[j] === "Email") {
              emailColIdx = j;
              break;
           }
        }
        
        if (emailColIdx !== -1) {
           for (let i = 1; i < logData.length; i++) {
             if (logData[i][emailColIdx] && String(logData[i][emailColIdx]).toLowerCase() === emailRecipient.toLowerCase()) {
               foundRowIndex = i + 1;
               break;
             }
           }
        }

        const newRowData = [];
        let autoColCount = logHeaders.length;
        if (logHeaders.includes("Room Assignment")) {
           autoColCount = logHeaders.indexOf("Room Assignment");
        }

        for (let i = 0; i < autoColCount; i++) {
           const logHeader = logHeaders[i];
           let mappedValue = "";
           
           if (logHeader === "First Name") mappedValue = firstName;
           else if (logHeader === "Last Name") mappedValue = lastName;
           else if (logHeader === "Email") mappedValue = emailRecipient;
           else if (logHeader === "Phone") mappedValue = phone;
           else {
               for (const respHeader in responses) {
                   let hLower = respHeader.toLowerCase();
                   let val = responses[respHeader][0] || "";
                   if (logHeader === "Gender" && hLower.startsWith("gender")) mappedValue = val;
                   else if (logHeader === "Age" && hLower === "age") mappedValue = val;
                   else if (logHeader === "Grade" && hLower.startsWith("grade")) mappedValue = val;
                   else if (logHeader === "Age Group" && hLower.includes("age group")) mappedValue = val;
                   else if (logHeader === "Local Church/Place of Worship" && (hLower.includes("local church") || hLower.includes("fellowship"))) mappedValue = val;
                   else if (logHeader === "Staying at Host Church?" && hLower.includes("staying at the hosting church")) mappedValue = val;
                   else if (logHeader === "Lodging Before" && hLower.includes("lodging before")) mappedValue = val;
                   else if (logHeader === "Lodging After" && hLower.includes("lodging after")) mappedValue = val;
                   else if (logHeader === "Food/Medicine Restrictions" && hLower.includes("food/medicine")) mappedValue = val;
                   else if (logHeader === "Sleep Preferences & Habits" && hLower.includes("sleep preferences")) mappedValue = val;
                   else if (logHeader === "Other Special Needs" && hLower.includes("other special needs")) mappedValue = val;
                   else if (logHeader === "Emergency Contact Person" && hLower.includes("emergency contact person")) mappedValue = val;
                   else if (logHeader === "Emergency Contact Relationship" && hLower.includes("emergency contact relationship")) mappedValue = val;
                   else if (logHeader === "Emergency Contact Phone" && hLower.includes("emergency contact phone")) mappedValue = val;
               }
           }
           newRowData.push(mappedValue);
        }

        if (foundRowIndex !== -1) {
           logisticsSheet.getRange(foundRowIndex, 1, 1, autoColCount).setValues([newRowData]);
        } else {
           const blankPadding = new Array(logHeaders.length - autoColCount).fill("");
           logisticsSheet.appendRow([...newRowData, ...blankPadding]);
        }

        if (logisticsSheet.getLastRow() > 1) {
           logisticsSheet.getRange(2, 1, logisticsSheet.getLastRow() - 1, logisticsSheet.getLastColumn())
                         .sort([{column: 2, ascending: true}]);
        }
      }

    } catch(err) {
      Logger.log("Error processing transportation/logistics sync: " + err.message);
    }

    let isWaitlisted = false;
    let maxAttendees = null;
    try {
      const props = PropertiesService.getScriptProperties();
      const formsToMonitor = JSON.parse(props.getProperty('FormsToMonitor') || '{}');
      const formUrl = sheet.getFormUrl();
      if (formUrl) {
        const formId = FormApp.openByUrl(formUrl).getId();
        if (formsToMonitor[formId] && formsToMonitor[formId].max) {
          maxAttendees = formsToMonitor[formId].max;
          // Row index - 1 (header). 
          const currentRow = e.range.getRow();
          if ((currentRow - 1) > maxAttendees) {
             isWaitlisted = true;
          }
        }
      }
    } catch(err) {
       Logger.log("Error checking waitlist: " + err.message);
    }

    const row = e.range.getRow();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    let statusColIndex = headers.indexOf("Email Status") + 1;
    let isEdit = false;
    
    if (statusColIndex > 0) {
      const existingStatus = sheet.getRange(row, statusColIndex).getValue();
      if (existingStatus && existingStatus !== "") {
        isEdit = true;
      }
    }
    
    let subject = isEdit ? `Update Confirmation: ${settings.EventName} Registration` : `Confirmation: ${settings.EventName} Registration`;
    if (isRejected) {
      subject = `Registration Not Accepted for ${settings.EventName}`;
    } else if (isWaitlisted) {
      subject = isEdit ? `Update Waitlist: ${settings.EventName} Registration` : `Waitlist: ${settings.EventName} Registration`;
    }
    
    const rejectionContent = `
      <h2 style="color: #c0392b;">Registration Not Accepted</h2>
      <p>Thank you for your interest in the <strong>${settings.EventName}</strong>.</p>
      <p>However, because you selected <strong>'No'</strong> for the <em>Medical Consent and Liability Release</em>, we cannot process your registration at this time.</p>
      <p>Participation requires a signed release for safety and insurance purposes. If this was a mistake, please resubmit the form or contact the coordinators.</p>`;

    const editNotice = isEdit ? `<p><em style="color: #e67e22;"><strong>Note:</strong> This is an update to your existing registration.</em></p>` : "";
    const successContent = `
      ${editNotice}
      <p>Hallelujah! This email confirms that we have successfully received your registration for the <strong>${settings.EventName}</strong>.</p>
      <p>We look forward to seeing you! Keep an eye on your inbox for further updates regarding schedules and logistics.</p>`;

    const waitlistContent = `
      <h2 style="color: #e67e22;">You're on the Waitlist</h2>
      <p>Thank you for your interest in the <strong>${settings.EventName}</strong>.</p>
      <p>At this time, we have reached the maximum capacity of <strong>${maxAttendees}</strong> attendees for this event, so your registration has been placed on the waitlist.</p>
      <p>If a spot opens up, the coordinators will contact you directly to confirm your attendance. Thank you for your patience and understanding!</p>`;

    let bodyContent = successContent;
    if (isRejected) bodyContent = rejectionContent;
    else if (isWaitlisted) bodyContent = waitlistContent;

    let form;
    let editResponseUrl = "";
    try {
      const formUrl = responseSs.getFormUrl();
      form = FormApp.openByUrl(formUrl);
      
      const formResponses = form.getResponses();
      for (let i = formResponses.length - 1; i >= 0; i--) {
        const formResponse = formResponses[i];
        const formEmail = formResponse.getRespondentEmail() || "";
        let typedEmail = "";
        
        const itemResponses = formResponse.getItemResponses();
        for (let j = 0; j < itemResponses.length; j++) {
          if (itemResponses[j].getItem().getTitle().toLowerCase().includes("email")) {
            typedEmail = itemResponses[j].getResponse();
          }
        }
        
        if ((formEmail && formEmail.toLowerCase() === emailRecipient.toLowerCase()) || 
            (typedEmail && typedEmail.toLowerCase() === emailRecipient.toLowerCase())) {
          editResponseUrl = formResponse.getEditResponseUrl();
          break; 
        }
      }
    } catch (e) {
      Logger.log("Could not open form or fetch edit URL: " + e);
    }
    
    let editButtonHtml = "";
    if (editResponseUrl && !isRejected) {
       editButtonHtml = `
         <div style="margin: 25px 0; text-align: center;">
           <a href="${editResponseUrl}" style="background-color: #2980b9; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
             Edit Your Registration
           </a>
         </div>
       `;
    }

    let responseSummaryHtml = editButtonHtml + `
      <div style="margin-top: 30px; padding: 20px; background-color: #f9f9f9; border-left: 4px solid #2980b9; border-radius: 4px;">
        <h3 style="margin-top: 0; color: #2c3e50; font-size: 16px;">Your Submission Details:</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    `;

    if (form) {
      if (responses["Email Address"] && responses["Email Address"][0]) {
        responseSummaryHtml += `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; width: 45%; color: #7f8c8d; vertical-align: top; padding-right: 15px;"><strong>Email Address</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; color: #2c3e50; vertical-align: top;">${responses["Email Address"][0]}</td>
            </tr>
        `;
      }

      const items = form.getItems();
      let currentSectionTitle = "";
      let currentSectionHelpText = "";

      items.forEach(item => {
        const type = item.getType();
        const title = item.getTitle();
        
        if (type === FormApp.ItemType.SECTION_HEADER || type === FormApp.ItemType.PAGE_BREAK) {
          currentSectionTitle = title;
          currentSectionHelpText = item.getHelpText();
          return; 
        }
        
        if (responses[title] && responses[title][0]) {
          const answer = responses[title][0];
          const safeHeader = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const safeAnswer = String(answer).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
          
          if (title.includes("Consent") && (currentSectionTitle.includes("Medical Consent") || currentSectionTitle.includes("Media Release"))) {
              const safeHelpText = currentSectionHelpText.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
              responseSummaryHtml += `
                <tr>
                  <td colspan="2" style="padding: 15px 0 5px 0; border-bottom: none; color: #2c3e50; font-size: 12px; font-style: italic;">
                    <strong>${currentSectionTitle}</strong><br>
                    ${safeHelpText}
                  </td>
                </tr>
              `;
          }

          responseSummaryHtml += `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; width: 45%; color: #7f8c8d; vertical-align: top; padding-right: 15px;"><strong>${safeHeader}</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; color: #2c3e50; vertical-align: top;">${safeAnswer}</td>
            </tr>
          `;
        }
      });
    } else {
      const ignoredHeaders = ["Timestamp", "Email Address"];
      for (let header in responses) {
        if (ignoredHeaders.includes(header)) continue;
        const answer = responses[header][0];
        if (answer) {
          const safeHeader = header.replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const safeAnswer = String(answer).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
          responseSummaryHtml += `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; width: 45%; color: #7f8c8d; vertical-align: top; padding-right: 15px;"><strong>${safeHeader}</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; color: #2c3e50; vertical-align: top;">${safeAnswer}</td>
            </tr>
          `;
        }
      }
    }
    
    responseSummaryHtml += `</table></div>`;

    const htmlBody = `
      <div ${commonStyles}>
        ${logoHtml}
        <p>Hi ${firstName},</p>
        ${bodyContent}
        ${responseSummaryHtml}
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        ${signature}
      </div>`;

    let statusText = "";
    const timestamp = Utilities.formatDate(new Date(), "GMT-7", "MM/dd/yyyy HH:mm:ss");
    
    try {
      let gmailOptions = {
        from: settings.ContactEmail,
        name: settings.OrgName,
        replyTo: settings.ContactEmail,
        htmlBody: htmlBody
      };
      if (logoBlob) gmailOptions.inlineImages = { usgaLogo: logoBlob };
      
      GmailApp.sendEmail(emailRecipient, subject, "", gmailOptions);
      statusText = isRejected ? `Rejected Sent (${timestamp})` : (isWaitlisted ? `Waitlist Sent (${timestamp})` : `Confirmation Sent (${timestamp})`);
      
    } catch (err) {
      let mailOptions = {
        to: emailRecipient,
        subject: subject,
        htmlBody: htmlBody,
        name: settings.OrgName,
        replyTo: settings.ContactEmail
      };
      if (logoBlob) mailOptions.inlineImages = { usgaLogo: logoBlob };
      
      MailApp.sendEmail(mailOptions);
      statusText = isRejected ? `Rejected Sent [Fallback MailApp] (${timestamp})` : (isWaitlisted ? `Waitlist Sent [Fallback MailApp] (${timestamp})` : `Confirmation Sent [Fallback MailApp] (${timestamp})`);
    }

    if (statusColIndex === 0) {
      statusColIndex = headers.length + 1;
      sheet.getRange(1, statusColIndex).setValue("Email Status").setFontWeight("bold");
    }

    sheet.getRange(row, statusColIndex).setValue(statusText);
    
  } catch (error) {
    Logger.log("Email Error: " + error.message);
  }
}

function testEmailVersions() {
  const testEmail = "david.liou@tjc.org";
  const testName = "Test User";

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName("Settings");
  if (!settingsSheet) throw new Error("Settings tab missing!");

  const settingsData = settingsSheet.getRange("A2:B4").getValues();
  const settings = {};
  settingsData.forEach(row => { settings[row[0]] = row[1]; });

  let logoBlob = null;
  let logoHtml = "";
  try {
    logoBlob = DriveApp.getFileById("1KltAMA0tXmJeeam2pg_omUjMvD5_un-d").getBlob();
    logoHtml = `<img src="cid:usgaLogo" alt="${settings.OrgName} Logo" style="max-width: 150px; height: auto; margin-bottom: 20px;">`;
  } catch (e) {
    Logger.log("Could not load logo: " + e.message);
  }

  const commonStyles = `style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #2c3e50;"`;
  const signature = `<p ${commonStyles}>In Christ,<br><span style="color: #2980b9; font-weight: bold;">${settings.OrgName}</span></p>`;

  const rejectionContent = `
    <h2 style="color: #c0392b;">Registration Not Processed</h2>
    <p>Thank you for your interest in the <strong>${settings.EventName}</strong>.</p>
    <p>However, because you selected <strong>'No'</strong> for the <u>Medical Consent and Liability Release</u>, we are unable to process your registration at this time.</p>
    <p>For safety and insurance purposes, participation requires this signed release. If this was a mistake, please resubmit the form or contact the coordinators.</p>`;

  const successContent = `
    <p>Hallelujah! This email confirms that we have successfully received your registration for the <strong>${settings.EventName}</strong>.</p>
    <p>We look forward to seeing you! Keep an eye on your inbox for further updates regarding schedules and travel.</p>`;

  const waitlistContent = `
    <h2 style="color: #e67e22;">You're on the Waitlist</h2>
    <p>Thank you for your interest in the <strong>${settings.EventName}</strong>.</p>
    <p>At this time, we have reached the maximum capacity of attendees for this event, so your registration has been placed on the waitlist.</p>
    <p>If a spot opens up, the coordinators will contact you directly to confirm your attendance. Thank you for your patience and understanding!</p>`;

  let successOptions = {
    name: settings.OrgName,
    htmlBody: `<div ${commonStyles}>${logoHtml}<p>Hi ${testName},</p>${successContent}<hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">${signature}</div>`
  };
  
  if (logoBlob) successOptions.inlineImages = { usgaLogo: logoBlob };
  
  try {
    successOptions.from = "us.events@tjc.org";
    GmailApp.sendEmail(testEmail, `TEST: Confirmation for ${settings.EventName}`, "", successOptions);
  } catch (err) {
    delete successOptions.from;
    successOptions.to = testEmail;
    successOptions.subject = `TEST: Confirmation for ${settings.EventName}`;
    MailApp.sendEmail(successOptions);
  }

  let rejectionOptions = {
    name: settings.OrgName,
    htmlBody: `<div ${commonStyles}>${logoHtml}<p>Hi ${testName},</p>${rejectionContent}<hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">${signature}</div>`
  };
  
  if (logoBlob) rejectionOptions.inlineImages = { usgaLogo: logoBlob };
  
  try {
    rejectionOptions.from = "us.events@tjc.org";
    GmailApp.sendEmail(testEmail, `TEST: Registration Not Processed for ${settings.EventName}`, "", rejectionOptions);
  } catch (err) {
    delete rejectionOptions.from;
    rejectionOptions.to = testEmail;
    rejectionOptions.subject = `TEST: Registration Not Processed for ${settings.EventName}`;
    MailApp.sendEmail(rejectionOptions);
  }

  Logger.log("Test emails sent to " + testEmail);
}

function appendAuditLog(ss, payload, form, responseSs) {
  try {
    let logSheet = ss.getSheetByName("System Log");
    let headers = [];
    if (!logSheet) {
      logSheet = ss.insertSheet("System Log");
      headers = ["Timestamp", "Template Name", "Event Year", "Coordinator", "Event Title", "Send-As Mailbox", "Form URL", "Response Sheet URL", "Fields Included"];
      logSheet.appendRow(headers);
      logSheet.getRange("A1:I1").setFontWeight("bold").setBackground("#f3f3f3");
      logSheet.setFrozenRows(1);
    } else {
      headers = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0];
      if (headers.indexOf("Template Name") === -1) {
        logSheet.insertColumnAfter(1);
        logSheet.getRange("B1").setValue("Template Name");
        headers = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0];
      }
      if (headers.indexOf("Event Year") === -1) {
        logSheet.insertColumnAfter(2); 
        logSheet.getRange("C1").setValue("Event Year");
        headers = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0];
      }
    }

    const timestamp = Utilities.formatDate(new Date(), "GMT-7", "MM/dd/yyyy HH:mm:ss");
    const coordinator = Session.getActiveUser().getEmail();
    const templateName = payload.eventDetails.templateName || "Unknown Template";
    const eventYear = payload.eventDetails.year || "";
    const eventTitle = payload.eventDetails.title;
    const sendAs = payload.eventDetails.contactEmail;
    const fieldNames = payload.selectedFields.map(f => f.name).join(", ");

    const rowData = new Array(headers.length).fill("");
    rowData[headers.indexOf("Timestamp")] = timestamp;
    rowData[headers.indexOf("Template Name")] = templateName;
    rowData[headers.indexOf("Event Year")] = eventYear;
    rowData[headers.indexOf("Coordinator")] = coordinator;
    rowData[headers.indexOf("Event Title")] = eventTitle;
    rowData[headers.indexOf("Send-As Mailbox")] = sendAs;
    rowData[headers.indexOf("Form URL")] = form.getPublishedUrl();
    rowData[headers.indexOf("Response Sheet URL")] = responseSs.getUrl();
    rowData[headers.indexOf("Fields Included")] = fieldNames;

    logSheet.appendRow(rowData);
  } catch(e) {
    Logger.log("Failed to write to System Log: " + e.message);
  }
}

// =======================================================================
// SYSTEM MAINTENANCE
// =======================================================================

function cleanupDeadTriggers() {
  const ui = SpreadsheetApp.getUi();
  const triggers = ScriptApp.getProjectTriggers();
  let deletedCount = 0;
  let activeCount = 0;
  
  for (let i = 0; i < triggers.length; i++) {
    const trigger = triggers[i];
    const sourceId = trigger.getTriggerSourceId();
    if (sourceId) {
      try {
        SpreadsheetApp.openById(sourceId);
        activeCount++;
      } catch (e) {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
      }
    }
  }
  
  ui.alert('Trigger Cleanup Complete', 
    `Deleted ${deletedCount} dead triggers attached to deleted sheets.\nThere are ${activeCount} active triggers remaining.`, 
    ui.ButtonSet.OK);
}

function deleteAllTriggers() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('WARNING: Delete ALL Triggers?', 
    'This will delete ALL email automation triggers for EVERY form you have generated so far. Only do this if you are testing and want a fresh start. Continue?', 
    ui.ButtonSet.YES_NO);
    
  if (response !== ui.Button.YES) return;

  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  
  ui.alert('Success', `Deleted all ${triggers.length} triggers. You can now generate new forms.`, ui.ButtonSet.OK);
}

// =======================================================================
// INITIAL SETUP FUNCTIONS
// =======================================================================

function runSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert('Setup USGA Configuration', 
    'This will create/overwrite the "Field Dictionary" and "Templates" tabs in this Google Sheet. Continue?', 
    ui.ButtonSet.YES_NO);
    
  if (response !== ui.Button.YES) return;

  setupFieldDictionary(ss);
  setupTemplates(ss);
  setupAirportMapping(ss);
  
  ui.alert('Success', 'Configuration sheets have been successfully created!', ui.ButtonSet.OK);
}

function setupAirportMapping(ss) {
  let sheet = ss.getSheetByName('Airport Mapping');
  if (!sheet) {
    sheet = ss.insertSheet('Airport Mapping');
  }
  sheet.clear();

  const data = [
    ['Hosting Church', 'Airport 1', 'Airport 2', 'Airport 3', 'Airport 4', 'Airport 5', 'Region'],
    ['Atlanta', 'ATL', '', '', '', '', 'East'],
    ['Austin', 'AUS', '', '', '', '', 'Central'],
    ['Baldwin Park', 'ONT', 'LAX', 'BUR', 'SNA', 'LGB', 'SWR'],
    ['Boston', 'BOS', '', '', '', '', 'East'],
    ['Brooklyn', 'JFK', 'LGA', 'EWR', '', '', 'East'],
    ['Canoga Park', 'BUR', 'LAX', '', '', '', 'SWR'],
    ['Cerritos', 'LAX', 'BUR', 'LGB', 'SNA', 'ONT', 'SWR'],
    ['Chicago', 'ORD', 'MDW', '', '', '', 'Central'],
    ['Dallas', 'DFW', 'DAL', '', '', '', 'Central'],
    ['Denver', 'DEN', '', '', '', '', 'SWR'],
    ['East Bay', 'OAK', 'SFO', 'SJC', '', '', 'NWR'],
    ['Elizabeth', 'EWR', 'LGA', 'JFK', '', '', 'East'],
    ['Flushing', 'JFK', 'LGA', 'EWR', '', '', 'East'],
    ['Garden Grove', 'SNA', 'LGB', 'LAX', 'ONT', '', 'SWR'],
    ['Glendale', 'BUR', 'LAX', '', '', '', 'SWR'],
    ['Hillsborough', 'EWR', 'TTN', 'PHL', 'JFK', 'LGA', 'East'],
    ['Honolulu', 'HNL', '', '', '', '', 'HI'],
    ['Houston', 'IAH', 'HOU', '', '', '', 'Central'],
    ['Irvine', 'SNA', 'LAX', 'LGB', 'ONT', '', 'SWR'],
    ['Manhattan', 'JFK', 'LGA', 'EWR', '', '', 'East'],
    ['Miami', 'MIA', 'FLL', '', '', '', 'East'],
    ['Ontario', 'ONT', 'LAX', 'SNA', '', '', 'SWR'],
    ['Orlando', 'MCO', 'SFB', '', '', '', 'East'],
    ['Philadelphia', 'PHL', 'EWR', '', '', '', 'East'],
    ['Phoenix', 'PHX', '', '', '', '', 'SWR'],
    ['Portland', 'PDX', '', '', '', '', 'NWR'],
    ['Queens', 'JFK', 'LGA', 'EWR', '', '', 'East'],
    ['Raleigh', 'RDU', '', '', '', '', 'East'],
    ['Sacramento', 'SMF', 'SFO', 'OAK', '', '', 'NWR'],
    ['San Diego', 'SAN', '', '', '', '', 'SWR'],
    ['Pacifica', 'SFO', 'OAK', 'SJC', '', '', 'NWR'],
    ['San Jose', 'SJC', 'SFO', 'OAK', '', '', 'NWR'],
    ['Seattle', 'SEA', '', '', '', '', 'NWR'],
    ['Tampa', 'TPA', '', '', '', '', 'East'],
    ['Washington DC', 'IAD', 'DCA', 'BWI', '', '', 'East']
  ];

  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#d9ead3");
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 7);
}

function setupFieldDictionary(ss) {
  let sheet = ss.getSheetByName('Field Dictionary');
  if (!sheet) {
    sheet = ss.insertSheet('Field Dictionary');
  }
  sheet.clear();
  
  const data = [
    ['Category', 'Field Name', 'Input Type', 'Required']
  ];
  
  const dictionary = [
    ['Personal & Contact Info', 'First Name', 'Short Answer Text', true],
    ['Personal & Contact Info', 'Last Name', 'Short Answer Text', true],
    ['Personal & Contact Info', 'Other Name / Chinese Name', 'Short Answer Text', false],
    ['Personal & Contact Info', 'Email', 'Short Answer Text', true],
    ['Personal & Contact Info', 'Phone', 'Short Answer Text', true],
    ['Personal & Contact Info', 'Gender', 'Radio', true, 'Male', 'Female'],
    ['Personal & Contact Info', 'Birth year', 'Short Answer Text', true],
    ['Personal & Contact Info', 'Age', 'Short Answer Text', true],
    ['Personal & Contact Info', 'My current age group', 'Radio', true, '12-14', '15-18', '19-25', '26-35', '36-50', '51+'],
    ['Personal & Contact Info', 'Local Church', 'Short Answer Text', true],
    ['Personal & Contact Info', 'Primary Language', 'Radio', true, 'English', 'Mandarin', 'Cantonese', 'Spanish', 'Japanese', 'Korean', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Arabic', 'Hindi', 'Bengali', 'Thai', 'Vietnamese', 'Indonesian', 'Tagalog', 'Dutch', 'Polish', 'Turkish', 'Greek', 'Other'],
    ['Personal & Contact Info', 'Secondary Language', 'Dropdown', false, 'None', 'English', 'Mandarin', 'Cantonese', 'Spanish', 'Japanese', 'Korean', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Arabic', 'Hindi', 'Bengali', 'Thai', 'Vietnamese', 'Indonesian', 'Tagalog', 'Dutch', 'Polish', 'Turkish', 'Greek', 'Other'],
    ['Personal & Contact Info', 'My language preference', 'Checkboxes', true, 'English', 'Mandarin', 'Cantonese', 'Spanish', 'Japanese', 'Korean', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Arabic', 'Hindi', 'Bengali', 'Thai', 'Vietnamese', 'Indonesian', 'Tagalog', 'Dutch', 'Polish', 'Turkish', 'Greek', 'Other'],
    ['Personal & Contact Info', 'I am a baptized member of the True Jesus Church', 'Radio', true, 'Yes', 'No'],
    ['Personal & Contact Info', 'I have received the Holy Spirit', 'Radio', true, 'Yes', 'No'],

    ['Personal & Contact Info', 'Class to attend', 'Radio', true, 'E2 (Grades 4 to 6)', 'J1 (Grades 7 to 9)', 'J2 (Grades 10 to 12)'],
    ['Personal & Contact Info', 'Grade (As of September)', 'Short Answer Text', true],
    ['Personal & Contact Info', 'Minor\'s Email (at least 13 years of age)', 'Short Answer Text', false],
    
    ['Personal & Contact Info', 'Emergency Contact Evening Phone', 'Short Answer Text', false],
    
    ['Event-Specific Participation', 'Dress Code Agreement', 'Radio', true, 'Yes, I agree'],
    ['Personal & Contact Info', 'Name of Parent/Guardian (if Participant is under 18)', 'Short Answer Text', true],
    
    ['Event-Specific Participation', 'I will attend...', 'Dropdown', true, 'In Person', 'Online', 'Attendance tentatively unsure'],
    ['Event-Specific Participation', 'Attendance commitment', 'Radio', true, 'Full time', 'Part time'],
    ['Event-Specific Participation', 'Dates I will attend', 'Checkboxes', true, 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    ['Event-Specific Participation', 'Are you in: College/Working', 'Checkboxes', true, 'College', 'Working', 'Other'],
    ['Event-Specific Participation', 'What year are you in college?', 'Dropdown', true, 'Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate Student', 'Other'],
    ['Event-Specific Participation', 'What is your current work status?', 'Checkboxes', true, 'Full-time', 'Part-time', 'Self-employed', 'Unemployed', 'Student'],
    ['Event-Specific Participation', 'Participant can help with the following', 'Checkboxes', false, 'Audio/Visual', 'Cleaning', 'Cooking', 'Hymn Leading', 'Interpretation', 'Pianist', 'Testimony', 'Other'],
    ['Event-Specific Participation', 'Do you need someone to interpret for you in class?', 'Radio', false, 'Yes', 'No'],
    ['Event-Specific Participation', 'Interpretation Language', 'Dropdown', false, 'English', 'Mandarin', 'Cantonese', 'Spanish', 'Japanese', 'Korean', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Arabic', 'Hindi', 'Bengali', 'Thai', 'Vietnamese', 'Indonesian', 'Tagalog', 'Dutch', 'Polish', 'Turkish', 'Greek', 'Other'],
    ['Event-Specific Participation', 'Have you led Bible study before?', 'Radio', false, 'Yes', 'No'],
    ['Event-Specific Participation', 'Share a testimony', 'Radio', false, 'Yes', 'No'],
    ['Event-Specific Participation', 'Project/Elective selection', 'Checkboxes', true, 'Elective A', 'Elective B', 'Elective C'],
    ['Event-Specific Participation', 'Second project choice', 'Radio', false, 'Elective A', 'Elective B', 'Elective C'],
    ['Event-Specific Participation', 'Explain your choices / Essay', 'Paragraph', true],
    ['Event-Specific Participation', 'Indicate any relevant skills you may have', 'Paragraph', false],
    ['Event-Specific Participation', 'Share an experience in servitude', 'Paragraph', false],
    ['Event-Specific Participation', 'Voice part(s)', 'Checkboxes', false, 'Soprano', 'Alto', 'Tenor', 'Bass'],
    ['Event-Specific Participation', 'List instrument you will bring', 'Short Answer Text', false],
    ['Event-Specific Participation', 'T-shirt size', 'Radio', true, 'XS', 'S', 'M', 'L', 'XL', 'XXL'],
    ['Event-Specific Participation', 'I am familiar with Zoom', 'Radio', true, 'Yes', 'No'],
    ['Event-Specific Participation', 'I would like to attend Zoom training', 'Radio', false, 'Yes', 'No'],
    ['Event-Specific Participation', 'I can help with Zoom holy work', 'Checkboxes', false, 'Host', 'Co-Host', 'Translation'],
    ['Event-Specific Participation', 'Is this your first time attending?', 'Radio', true, 'Yes', 'No'],
    ['Event-Specific Participation', 'What fellowship are you representing?', 'Short Answer Text', true],
    ['Event-Specific Participation', 'Current/future role in youth ministry', 'Checkboxes', true, 'Religious Education Teacher', 'Youth Coordinator', 'Counselor', 'Other'],
    ['Event-Specific Participation', 'I\'m a (Delegate/Observer)', 'Dropdown', true, 'Delegate', 'Observer'],
    ['Event-Specific Participation', 'Completed ___ years of NATS', 'Dropdown', true, '0', '1', '2', '3', '4+'],
    ['Event-Specific Participation', 'Class A/B preference', 'Radio', true, 'Class A', 'Class B'],

    ['Arrival Arrangements', 'Arrival Details', 'Multiple choice', true, 'I am arriving by car', 'I am arriving by flight', 'I do not need pickup'],
    ['Arrival Arrangements', 'Arrival Date', 'Date', true],
    ['Arrival Arrangements', 'Arrival Time', 'Time', true],

    ['Arrival Flight Details', 'Departing City/Airport', 'Short Answer Text', true],
    ['Arrival Flight Details', 'Arrival City/Airport', 'Short Answer Text', true],
    ['Arrival Flight Details', 'Arrival Airline', 'Short Answer Text', true],
    ['Arrival Flight Details', 'Arrival Flight Number', 'Short Answer Text', true],
    ['Arrival Flight Details', 'The individuals will be arriving on the same flight', 'Paragraph', false],

    ['Departure Arrangements', 'Departure Details', 'Multiple choice', true, 'I am departing by car', 'I am departing by flight', 'I do not need dropoff'],
    ['Departure Arrangements', 'Departure Date', 'Date', true],
    ['Departure Arrangements', 'Departure Time', 'Time', true],

    ['Departure Flight Details', 'Departure City/Airport', 'Short Answer Text', true],
    ['Departure Flight Details', 'Destination City/Airport', 'Short Answer Text', true],
    ['Departure Flight Details', 'Departure Airline', 'Short Answer Text', true],
    ['Departure Flight Details', 'Departure Flight Number', 'Short Answer Text', true],
['Departure Flight Details', 'The individuals will be departing on the same flight', 'Paragraph', false],
['Arrival Train/Bus Details', 'Arrival Train/Bus Station', 'Short Answer Text', true],
['Arrival Train/Bus Details', 'Arrival Carrier', 'Short Answer Text', true],
['Arrival Train/Bus Details', 'Arrival Train/Bus Number', 'Short Answer Text', true],
['Departure Train/Bus Details', 'Departure Train/Bus Station', 'Short Answer Text', true],
['Departure Train/Bus Details', 'Departure Carrier', 'Short Answer Text', true],
['Departure Train/Bus Details', 'Departure Train/Bus Number', 'Short Answer Text', true],
    
    ['Other Travel Logistics', 'My train/bus information', 'Paragraph', false],
    ['Other Travel Logistics', 'I will arrange my own ride (additional notes)', 'Paragraph', false],

    ['Lodging & Accommodation', 'I will be staying at the hosting church.', 'Radio', true, 'Yes', 'No'],
    ['Lodging & Accommodation', 'Specify exact dates of arrival/departure for lodging', 'Paragraph', false],
    ['Lodging & Accommodation', 'I need lodging before the event', 'Radio', true, 'Yes', 'No'],
    ['Lodging & Accommodation', 'I need lodging after the event', 'Radio', true, 'Yes', 'No'],
    ['Lodging & Accommodation', 'Sleeping Bag/Pillow', 'Radio', false, 'I will bring my own.', 'I need to borrow from the hosting church.'],
    ['Lodging & Accommodation', 'Sleep Preferences & Habits (select all that apply)', 'Checkboxes', false, 'Light sleeper (sensitive to noise/light)', 'Heavy sleeper', 'Early riser', 'Late sleeper', 'Snorer'],
    ['Lodging & Accommodation', 'Food/Medicine Restrictions', 'Paragraph', false],
    ['Lodging & Accommodation', 'Information of accompanying family member', 'Paragraph', false],
    ['Lodging & Accommodation', 'If your need for lodging is not related to an event at the host church', 'Paragraph', false],
    ['Lodging & Accommodation', 'Other Special Needs/Accommodations (e.g., mobility assistance)', 'Paragraph', false],

    ['Releases & Feedback', 'Medical Consent and Liability Release Consent', 'Radio', true, 'Yes', 'No'],
    ['Releases & Feedback', 'General Media Release Consent', 'Radio', true, 'Yes', 'No'],
    ['Releases & Feedback', 'Signature by Participant/Authorized Signatory', 'Short Answer Text', true],
    ['Personal & Contact Info', 'Emergency Contact Person', 'Short Answer Text', true],
    ['Personal & Contact Info', 'Emergency Contact Relationship', 'Short Answer Text', true],
    ['Personal & Contact Info', 'Emergency Contact Phone', 'Short Answer Text', true]
  ];
  
  const maxCols = Math.max(data[0].length, ...dictionary.map(row => row.length));
  
  while (data[0].length < maxCols) {
    data[0].push("Choice " + (data[0].length - 3));
  }
  
  dictionary.forEach(row => {
    const paddedRow = [...row];
    while (paddedRow.length < maxCols) {
      paddedRow.push("");
    }
    data.push(paddedRow);
  });
  
  sheet.getRange(1, 1, data.length, maxCols).setValues(data);
  sheet.getRange(1, 1, 1, maxCols).setFontWeight("bold").setBackground("#f3f3f3");
  sheet.autoResizeColumns(1, 4);
}

function setupTemplates(ss) {
  let sheet = ss.getSheetByName('Templates');
  if (!sheet) {
    sheet = ss.insertSheet('Templates');
  }
  sheet.clear();
  
  const data = [
    ['Event Name', 'Field 1', 'Field 2', 'Field 3', 'Field 4', 'Field 5', 'Field 6', 'Field 7', 'Field 8', 'Field 9', 'Field 10', 'Field 11', 'Field 12', 'Field 13', 'Field 14', 'Field 15', 'Field 16', 'Field 17', 'Field 18', 'Field 19', 'Field 20', 'Field 21', 'Field 22', 'Field 23', 'Field 24', 'Field 25']
  ];
  
  const templates = [
    ['Online National Sacred Music Workshop', 'First Name', 'Last Name', 'Email', 'Local Church', 'I am a baptized member of the True Jesus Church', 'I have received the Holy Spirit', 'Emergency Contact Person', 'Emergency Contact Relationship', 'Emergency Contact Phone', 'I need lodging before the event', 'Sleep Preferences & Habits (select all that apply)', 'Food/Medicine Restrictions', 'Other Special Needs/Accommodations (e.g., mobility assistance)', 'I need lodging after the event'],
    ['National Evangelical Workers\' Workshop (NEWW)', 'First Name', 'Last Name', 'Email', 'Phone', 'Gender', 'Local Church', 'Emergency Contact Person', 'Emergency Contact Relationship', 'Emergency Contact Phone', 'I will attend...', 'Participant can help with the following', 'Arrival Details', 'Arrival Date', 'Arrival Time', 'Departing City/Airport', 'Arrival City/Airport', 'Arrival Airline', 'Arrival Flight Number', 'Arrival Train/Bus Station', 'Arrival Carrier', 'Arrival Train/Bus Number', 'Departure Details', 'Departure Date', 'Departure Time', 'Departure City/Airport', 'Destination City/Airport', 'Departure Airline', 'Departure Flight Number', 'Departure Train/Bus Station', 'Departure Carrier', 'Departure Train/Bus Number', 'I need lodging before the event', 'Sleep Preferences & Habits (select all that apply)', 'Food/Medicine Restrictions', 'Other Special Needs/Accommodations (e.g., mobility assistance)', 'I need lodging after the event'],
    ['Online National Adult Theological Seminar (OATS)', 'First Name', 'Last Name', 'Email', 'Birth year', 'I am a baptized member of the True Jesus Church', 'I have received the Holy Spirit', 'Emergency Contact Person', 'Emergency Contact Relationship', 'Emergency Contact Phone', 'I will attend...', 'I need lodging before the event', 'Sleep Preferences & Habits (select all that apply)', 'Food/Medicine Restrictions', 'Other Special Needs/Accommodations (e.g., mobility assistance)', 'I need lodging after the event'],
    ['National Marriage Coordinators\' Workshop (NMCW)', 'First Name', 'Last Name', 'Local Church', 'Phone', 'Email', 'Gender', 'I am a baptized member of the True Jesus Church', 'I have received the Holy Spirit', 'Emergency Contact Person', 'Emergency Contact Relationship', 'Emergency Contact Phone', 'Arrival Details', 'Arrival Date', 'Arrival Time', 'Departing City/Airport', 'Arrival City/Airport', 'Arrival Airline', 'Arrival Flight Number', 'Arrival Train/Bus Station', 'Arrival Carrier', 'Arrival Train/Bus Number', 'Departure Details', 'Departure Date', 'Departure Time', 'Departure City/Airport', 'Destination City/Airport', 'Departure Airline', 'Departure Flight Number', 'Departure Train/Bus Station', 'Departure Carrier', 'Departure Train/Bus Number', 'I need lodging before the event', 'Sleep Preferences & Habits (select all that apply)', 'Food/Medicine Restrictions', 'Other Special Needs/Accommodations (e.g., mobility assistance)', 'I need lodging after the event'],
    ['Sacred Music Camp (SMC)', 'First Name', 'Last Name', 'Email', 'Minor\'s Email (at least 13 years of age)', 'Phone', 'Gender', 'Local Church', 'I am a baptized member of the True Jesus Church', 'I have received the Holy Spirit', 'Emergency Contact Person', 'Emergency Contact Relationship', 'Emergency Contact Phone', 'I need lodging before the event', 'Sleep Preferences & Habits (select all that apply)', 'Food/Medicine Restrictions', 'Other Special Needs/Accommodations (e.g., mobility assistance)', 'I need lodging after the event', 'Dress Code Agreement', 'Name of Parent/Guardian (if Participant is under 18)'],
    ['Southwest Region Music Ministry Program (MMP)', 'First Name', 'Last Name', 'Email', 'Minor\'s Email (at least 13 years of age)', 'Phone', 'Gender', 'I am a baptized member of the True Jesus Church', 'I have received the Holy Spirit', 'Emergency Contact Person', 'Emergency Contact Relationship', 'Emergency Contact Phone', 'Participant can help with the following', 'Arrival Details', 'Departure Details', 'I need lodging before the event', 'Sleep Preferences & Habits (select all that apply)', 'Food/Medicine Restrictions', 'Other Special Needs/Accommodations (e.g., mobility assistance)', 'I need lodging after the event', 'Dress Code Agreement', 'Name of Parent/Guardian (if Participant is under 18)'],
    ['Ministry Volunteer Program (MVP) Workshop', 'First Name', 'Last Name', 'Birth year', 'Gender', 'Email', 'Minor\'s Email (at least 13 years of age)', 'Phone', 'Local Church', 'I am a baptized member of the True Jesus Church', 'I have received the Holy Spirit', 'Emergency Contact Person', 'Emergency Contact Relationship', 'Emergency Contact Phone', 'Arrival Details', 'Arrival Date', 'Arrival Time', 'Departing City/Airport', 'Arrival City/Airport', 'Arrival Airline', 'Arrival Flight Number', 'Arrival Train/Bus Station', 'Arrival Carrier', 'Arrival Train/Bus Number', 'Departure Details', 'Departure Date', 'Departure Time', 'Departure City/Airport', 'Destination City/Airport', 'Departure Airline', 'Departure Flight Number', 'Departure Train/Bus Station', 'Departure Carrier', 'Departure Train/Bus Number', 'I need lodging before the event', 'Sleep Preferences & Habits (select all that apply)', 'Food/Medicine Restrictions', 'Other Special Needs/Accommodations (e.g., mobility assistance)', 'I need lodging after the event', 'Dress Code Agreement', 'Name of Parent/Guardian (if Participant is under 18)'],
    ['National Youth Theological Seminar (NYTS) - All Years', 'First Name', 'Last Name', 'Email', 'Minor\'s Email (at least 13 years of age)', 'Phone', 'Gender', 'Local Church', 'Birth year', 'I am a baptized member of the True Jesus Church', 'I have received the Holy Spirit', 'Emergency Contact Person', 'Emergency Contact Relationship', 'Emergency Contact Phone', 'Participant can help with the following', 'Arrival Details', 'Arrival Date', 'Arrival Time', 'Departing City/Airport', 'Arrival City/Airport', 'Arrival Airline', 'Arrival Flight Number', 'Arrival Train/Bus Station', 'Arrival Carrier', 'Arrival Train/Bus Number', 'Departure Details', 'Departure Date', 'Departure Time', 'Departure City/Airport', 'Destination City/Airport', 'Departure Airline', 'Departure Flight Number', 'Departure Train/Bus Station', 'Departure Carrier', 'Departure Train/Bus Number', 'I need lodging before the event', 'Sleep Preferences & Habits (select all that apply)', 'Food/Medicine Restrictions', 'Other Special Needs/Accommodations (e.g., mobility assistance)', 'I need lodging after the event', 'I will be staying at the hosting church.', 'Dress Code Agreement', 'Name of Parent/Guardian (if Participant is under 18)'],
    ['Pioneer Volunteer Ministry Program (PMVP)', 'First Name', 'Last Name', 'Email', 'Phone', 'Gender', 'Local Church', 'Birth year', 'I am a baptized member of the True Jesus Church', 'I have received the Holy Spirit', 'Emergency Contact Person', 'Emergency Contact Relationship', 'Emergency Contact Phone', 'Participant can help with the following', 'Arrival Details', 'Arrival Date', 'Arrival Time', 'Departing City/Airport', 'Arrival City/Airport', 'Arrival Airline', 'Arrival Flight Number', 'Arrival Train/Bus Station', 'Arrival Carrier', 'Arrival Train/Bus Number', 'Departure Details', 'Departure Date', 'Departure Time', 'Departure City/Airport', 'Destination City/Airport', 'Departure Airline', 'Departure Flight Number', 'Departure Train/Bus Station', 'Departure Carrier', 'Departure Train/Bus Number', 'I need lodging before the event', 'Sleep Preferences & Habits (select all that apply)', 'Food/Medicine Restrictions', 'Other Special Needs/Accommodations (e.g., mobility assistance)', 'I need lodging after the event', 'I will be staying at the hosting church.'],
    ['National Youth Servitude Training (NYST)', 'First Name', 'Last Name', 'Email', 'Phone', 'Gender', 'Local Church', 'I am a baptized member of the True Jesus Church', 'I have received the Holy Spirit', 'Emergency Contact Person', 'Emergency Contact Relationship', 'Emergency Contact Phone', 'Participant can help with the following', 'Arrival Details', 'Arrival Date', 'Arrival Time', 'Departing City/Airport', 'Arrival City/Airport', 'Arrival Airline', 'Arrival Flight Number', 'Arrival Train/Bus Station', 'Arrival Carrier', 'Arrival Train/Bus Number', 'Departure Details', 'Departure Date', 'Departure Time', 'Departure City/Airport', 'Destination City/Airport', 'Departure Airline', 'Departure Flight Number', 'Departure Train/Bus Station', 'Departure Carrier', 'Departure Train/Bus Number', 'I need lodging before the event', 'Sleep Preferences & Habits (select all that apply)', 'Food/Medicine Restrictions', 'Other Special Needs/Accommodations (e.g., mobility assistance)', 'I need lodging after the event'],
    ['National Youth Fellowship (NYF)', 'First Name', 'Last Name', 'Email', 'Gender', 'Local Church', 'I am a baptized member of the True Jesus Church', 'Emergency Contact Person', 'Emergency Contact Relationship', 'Emergency Contact Phone', 'Are you in: College/Working', 'Participant can help with the following', 'I need lodging before the event', 'Sleep Preferences & Habits (select all that apply)', 'Food/Medicine Restrictions', 'Other Special Needs/Accommodations (e.g., mobility assistance)', 'I need lodging after the event', 'Medical Consent and Liability Release Consent', 'Departing City/Airport', 'Arrival City/Airport', 'Arrival Date', 'Arrival Time', 'Arrival Airline', 'Arrival Flight Number', 'Departure Date', 'Departure Time', 'Departure City/Airport', 'Destination City/Airport', 'Departure Airline', 'Departure Flight Number'],
    ['USGA Ministers Workshop', 'First Name', 'Last Name', 'Email', 'Phone', 'Gender', 'Local Church', 'Emergency Contact Person', 'Emergency Contact Relationship', 'Emergency Contact Phone', 'Arrival Details', 'Arrival Date', 'Arrival Time', 'Departing City/Airport', 'Arrival City/Airport', 'Arrival Airline', 'Arrival Flight Number', 'Arrival Train/Bus Station', 'Arrival Carrier', 'Arrival Train/Bus Number', 'Departure Details', 'Departure Date', 'Departure Time', 'Departure City/Airport', 'Destination City/Airport', 'Departure Airline', 'Departure Flight Number', 'Departure Train/Bus Station', 'Departure Carrier', 'Departure Train/Bus Number', 'I need lodging before the event', 'Sleep Preferences & Habits (select all that apply)', 'Food/Medicine Restrictions', 'Other Special Needs/Accommodations (e.g., mobility assistance)', 'I need lodging after the event'],
    ['National Adult Theological Seminar (NATS)', 'First Name', 'Last Name', 'Email', 'Birth year', 'Gender', 'Local Church', 'I am a baptized member of the True Jesus Church', 'I have received the Holy Spirit', 'Emergency Contact Person', 'Emergency Contact Relationship', 'Emergency Contact Phone', 'Participant can help with the following', 'Arrival Details', 'Arrival Date', 'Arrival Time', 'Departing City/Airport', 'Arrival City/Airport', 'Arrival Airline', 'Arrival Flight Number', 'Arrival Train/Bus Station', 'Arrival Carrier', 'Arrival Train/Bus Number', 'Departure Details', 'Departure Date', 'Departure Time', 'Departure City/Airport', 'Destination City/Airport', 'Departure Airline', 'Departure Flight Number', 'Departure Train/Bus Station', 'Departure Carrier', 'Departure Train/Bus Number', 'I need lodging before the event', 'Sleep Preferences & Habits (select all that apply)', 'Food/Medicine Restrictions', 'Other Special Needs/Accommodations (e.g., mobility assistance)', 'I need lodging after the event', 'I will be staying at the hosting church.'],
    ['National Church Conference (NCC)', 'First Name', 'Last Name', 'Local Church', 'Email', 'Phone', 'Gender', 'Emergency Contact Person', 'Emergency Contact Relationship', 'Emergency Contact Phone', 'Arrival Details', 'Arrival Date', 'Arrival Time', 'Departing City/Airport', 'Arrival City/Airport', 'Arrival Airline', 'Arrival Flight Number', 'Arrival Train/Bus Station', 'Arrival Carrier', 'Arrival Train/Bus Number', 'Departure Details', 'Departure Date', 'Departure Time', 'Departure City/Airport', 'Destination City/Airport', 'Departure Airline', 'Departure Flight Number', 'Departure Train/Bus Station', 'Departure Carrier', 'Departure Train/Bus Number', 'I need lodging before the event', 'Sleep Preferences & Habits (select all that apply)', 'Food/Medicine Restrictions', 'Other Special Needs/Accommodations (e.g., mobility assistance)', 'I need lodging after the event'],
    ['Student Spiritual Convocation (SSC)', 'First Name', 'Last Name', 'Class to attend', 'Grade (As of September)', 'Gender', 'Local Church', 'Birth year', 'Age', 'Email', 'Minor\'s Email (at least 13 years of age)', 'I am a baptized member of the True Jesus Church', 'I have received the Holy Spirit', 'Emergency Contact Person', 'Emergency Contact Relationship', 'Emergency Contact Phone', 'Emergency Contact Evening Phone', 'Participant can help with the following', 'Do you need someone to interpret for you in class?', 'Interpretation Language', 'Sleeping Bag/Pillow', 'Arrival Details', 'Arrival Date', 'Arrival Time', 'Departing City/Airport', 'Arrival City/Airport', 'Arrival Airline', 'Arrival Flight Number', 'Arrival Train/Bus Station', 'Arrival Carrier', 'Arrival Train/Bus Number', 'Departure Details', 'Departure Date', 'Departure Time', 'Departure City/Airport', 'Destination City/Airport', 'Departure Airline', 'Departure Flight Number', 'Departure Train/Bus Station', 'Departure Carrier', 'Departure Train/Bus Number', 'I need lodging before the event', 'Sleep Preferences & Habits (select all that apply)', 'Food/Medicine Restrictions', 'Other Special Needs/Accommodations (e.g., mobility assistance)', 'I need lodging after the event', 'Dress Code Agreement', 'Name of Parent/Guardian (if Participant is under 18)', 'General Media Release Consent', 'Medical Consent and Liability Release Consent', 'Signature by Participant/Authorized Signatory'],
    ['Young Adult Spiritual Convocation (YASC)', 'First Name', 'Last Name', 'Email', 'Minor\'s Email (at least 13 years of age)', 'Phone', 'Gender', 'Local Church', 'I am a baptized member of the True Jesus Church', 'I have received the Holy Spirit', 'Emergency Contact Person', 'Emergency Contact Relationship', 'Emergency Contact Phone', 'Are you in: College/Working', 'Participant can help with the following', 'Arrival Details', 'Arrival Date', 'Arrival Time', 'Departing City/Airport', 'Arrival City/Airport', 'Arrival Airline', 'Arrival Flight Number', 'Arrival Train/Bus Station', 'Arrival Carrier', 'Arrival Train/Bus Number', 'Departure Details', 'Departure Date', 'Departure Time', 'Departure City/Airport', 'Destination City/Airport', 'Departure Airline', 'Departure Flight Number', 'Departure Train/Bus Station', 'Departure Carrier', 'Departure Train/Bus Number', 'I need lodging before the event', 'Sleep Preferences & Habits (select all that apply)', 'Food/Medicine Restrictions', 'Other Special Needs/Accommodations (e.g., mobility assistance)', 'I need lodging after the event', 'I will be staying at the hosting church.', 'Dress Code Agreement', 'Name of Parent/Guardian (if Participant is under 18)'],
    ['College Youth Spiritual Convocation (CYSC)', 'First Name', 'Last Name', 'Email', 'Minor\'s Email (at least 13 years of age)', 'Phone', 'Gender', 'Local Church', 'I am a baptized member of the True Jesus Church', 'I have received the Holy Spirit', 'Emergency Contact Person', 'Emergency Contact Relationship', 'Emergency Contact Phone', 'Participant can help with the following', 'Arrival Details', 'Arrival Date', 'Arrival Time', 'Departing City/Airport', 'Arrival City/Airport', 'Arrival Airline', 'Arrival Flight Number', 'Arrival Train/Bus Station', 'Arrival Carrier', 'Arrival Train/Bus Number', 'Departure Details', 'Departure Date', 'Departure Time', 'Departure City/Airport', 'Destination City/Airport', 'Departure Airline', 'Departure Flight Number', 'Departure Train/Bus Station', 'Departure Carrier', 'Departure Train/Bus Number', 'I need lodging before the event', 'Sleep Preferences & Habits (select all that apply)', 'Food/Medicine Restrictions', 'Other Special Needs/Accommodations (e.g., mobility assistance)', 'I need lodging after the event', 'Dress Code Agreement', 'Name of Parent/Guardian (if Participant is under 18)']
  ];;
  
  let maxCols = data[0].length;
  templates.forEach(t => {
    if (t.length > maxCols) maxCols = t.length;
  });
  
  while (data[0].length < maxCols) {
    data[0].push(`Field ${data[0].length}`);
  }
  
  templates.forEach(t => {
    while (t.length < maxCols) t.push('');
    data.push(t);
  });
  
  sheet.getRange(1, 1, data.length, maxCols).setValues(data);
  sheet.getRange(1, 1, 1, maxCols).setFontWeight("bold").setBackground("#f3f3f3");
  sheet.autoResizeColumns(1, maxCols);
}

function translateText(text, targetLanguages) {
  if (!targetLanguages || targetLanguages.length === 0 || !text) return text;
  
  const overrides = {
    'zh-TW': {
      'Registration Deadline': '報名截止',
      'Eligibility': '參與者',
      'Ordained ministers and spouses.': '聖職人員及其配偶',
      'Ordained ministers and spouses': '聖職人員及其配偶',
      'I do not need pickup': '我不需被接送',
      'I do not need pick up': '我不需被接送',
      'I do not need dropoff': '我不需被接送',
      'I do not need drop off': '我不需被接送',
      'National Church Conference (NCC)': '全國代表大會(NCC)',
      'NCC': '全國代表大會',
      'Snorer': '會打呼',
      'Late sleeper': '夜貓子',
      'Late sleeper ': '夜貓子',
      'Local Church': '所屬教會',
      'Arrival Arrangements': '抵達安排',
      'Departure Arrangements': '出發安排',
      'Come and See': '你們來看',
      'Other Special Needs/Accommodations (e.g., mobility assistance)': '其他活動期間之特殊需求或協助事項 (例如：行動輔助)',
      'Yes': '是',
      'No': '否'
    }
  };
  
  let result = text;
  for (let i = 0; i < targetLanguages.length; i++) {
    try {
      const lang = targetLanguages[i];
      let translated = '';
      
      const cleanText = text.trim();
      if (overrides[lang] && overrides[lang][cleanText]) {
         translated = overrides[lang][cleanText];
      } else {
         if (cleanText === '𝗜𝗳 𝘁𝗵𝗲 𝗲𝘃𝗲𝗻𝘁 𝗽𝗮𝗿𝘁𝗶𝗰𝗶𝗽𝗮𝗻𝘁 𝗶𝘀 𝗮 𝗺𝗶𝗻𝗼𝗿 𝘂𝗻𝗱𝗲𝗿 𝘁𝗵𝗲 𝗮𝗴𝗲 𝗼𝗳 𝟭𝟴, 𝗿𝗲𝗴𝗶𝘀𝘁𝗿𝗮𝘁𝗶𝗼𝗻 𝗺𝘂𝘀𝘁 𝗯𝗲 𝗰𝗼𝗺𝗽𝗹𝗲𝘁𝗲𝗱 𝗯𝘆 𝗮 𝗽𝗮𝗿𝗲𝗻𝘁/𝗴𝘂𝗮𝗿𝗱𝗶𝗮𝗻. 𝗧𝗵𝗲 𝗿𝗲𝗴𝗶𝘀𝘁𝗿𝗮𝗻𝘁’𝘀 𝗲𝗺𝗮𝗶𝗹 𝗮𝗱𝗱𝗿𝗲𝘀𝘀 (𝗯𝗲𝗹𝗼𝘄) 𝗺𝘂𝘀𝘁 𝗯𝗲 𝘁𝗵𝗮𝘁 𝗼𝗳 𝘁𝗵𝗲 𝗺𝗶𝗻𝗼𝗿 𝗽𝗮𝗿𝘁𝗶𝗰𝗶𝗽𝗮𝗻𝘁’𝘀 𝗽𝗮𝗿𝗲𝗻𝘁/𝗴𝘂𝗮𝗿𝗱𝗶𝗮𝗻.') {
             const plainText = 'If the event participant is a minor under the age of 18, registration must be completed by a parent/guardian. The registrant’s email address (below) must be that of the minor participant’s parent/guardian.';
             translated = LanguageApp.translate(plainText, 'en', lang);
         } else {
             translated = LanguageApp.translate(text, 'en', lang);
         }
         
         if (lang === 'zh-TW') {
            translated = translated.replace(/National Church Conference \\(NCC\\)/gi, '全國代表大會(NCC)');
            translated = translated.replace(/National Church Conference/gi, '全國代表大會');
            translated = translated.replace(/NCC/g, '全國代表大會');
            translated = translated.replace(/Snorer/gi, '會打呼');
            translated = translated.replace(/Late sleeper/gi, '夜貓子');
            translated = translated.replace(/I do not need pickup/gi, '我不需被接送');
            translated = translated.replace(/I do not need dropoff/gi, '我不需被接送');
         }
      }
      
      if (translated && translated !== text) {
        result += " " + translated;
      }
    } catch (e) {
      Logger.log("Translation failed for " + targetLanguages[i] + ": " + e.message);
    }
  }
  return result;
}

function runFieldAudit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dictSheet = ss.getSheetByName('Field Dictionary');
  const logSheet = ss.getSheetByName('System Log');
  
  if (!dictSheet || !logSheet) {
    SpreadsheetApp.getUi().alert("Error: Missing 'Field Dictionary' or 'System Log' tabs.");
    return;
  }
  
  const dictData = dictSheet.getDataRange().getValues();
  const knownFields = new Set();
  
  for (let i = 1; i < dictData.length; i++) {
    const fieldName = dictData[i][1];
    if (fieldName) {
      knownFields.add(fieldName.toString().toLowerCase().trim());
    }
  }
  
  knownFields.add("i hereby give consent to the general assembly");
  knownFields.add("medical consent and liability release consent");
  knownFields.add("medical consent and liability release");
  knownFields.add("general media release consent");
  knownFields.add("general media release");
  knownFields.add("signature by participant");
  knownFields.add("other special needs/accommodations (e.g., mobility assistance)");
  knownFields.add("consent and waivers");
  
  const logData = logSheet.getDataRange().getValues();
  const formUrls = [];
  const headers = logData[0];
  let formUrlIndex = -1;
  let eventTitleIndex = -1;
  for (let j = 0; j < headers.length; j++) {
    if (headers[j] === "Form URL") formUrlIndex = j;
    if (headers[j] === "Event Title") eventTitleIndex = j;
  }
  
  if (formUrlIndex === -1) {
    SpreadsheetApp.getUi().alert("Error: 'Form URL' column not found in System Log.");
    return;
  }
  
  for (let i = 1; i < logData.length; i++) {
    const url = logData[i][formUrlIndex];
    if (url && url.toString().includes('docs.google.com/forms')) {
      formUrls.push({
        url: url,
        title: eventTitleIndex !== -1 ? logData[i][eventTitleIndex] : "Unknown Event"
      });
    }
  }
  
  if (formUrls.length === 0) {
    SpreadsheetApp.getUi().alert("No generated forms found in the System Log.");
    return;
  }
  
  SpreadsheetApp.getActiveSpreadsheet().toast("Scanning " + formUrls.length + " forms. This may take a minute...", "Field Audit Started");
  
  const newFieldsMap = {}; 
  
  formUrls.forEach(formObj => {
    try {
      const form = FormApp.openByUrl(formObj.url);
      const items = form.getItems();
      
      items.forEach(item => {
        const type = item.getType();
        if (type === FormApp.ItemType.PAGE_BREAK || type === FormApp.ItemType.SECTION_HEADER || type === FormApp.ItemType.IMAGE || type === FormApp.ItemType.VIDEO) {
           return;
        }
        
        const title = item.getTitle();
        if (!title) return;
        
        const lowerTitle = title.toLowerCase().trim();
        
        let isKnown = false;
        for (let knownField of knownFields) {
          if (lowerTitle.startsWith(knownField) || lowerTitle.includes(knownField)) {
            isKnown = true;
            break;
          }
        }
        
        if (!isKnown) {
          if (!newFieldsMap[lowerTitle]) {
            newFieldsMap[lowerTitle] = {
              originalTitle: title,
              type: type.toString(),
              forms: new Set()
            };
          }
          newFieldsMap[lowerTitle].forms.add(formObj.url);
        }
      });
    } catch (e) {
      Logger.log("Failed to open form: " + formObj.url + " Error: " + e.message);
    }
  });
  
  const newFieldKeys = Object.keys(newFieldsMap);
  if (newFieldKeys.length === 0) {
    SpreadsheetApp.getUi().alert("Audit Complete!\n\nNo new custom fields were found across your forms.");
    return;
  }
  
  let pendingSheet = ss.getSheetByName("Pending Fields");
  if (!pendingSheet) {
    pendingSheet = ss.insertSheet("Pending Fields");
    pendingSheet.appendRow(["Date Discovered", "Question Title", "Question Type", "Found In Form URLs"]);
    pendingSheet.getRange("A1:D1").setFontWeight("bold").setBackground("#f3f3f3");
    pendingSheet.setFrozenRows(1);
    pendingSheet.setColumnWidth(2, 300);
    pendingSheet.setColumnWidth(4, 400);
  }
  
  const today = new Date();
  const formattedDate = (today.getMonth() + 1) + "/" + today.getDate() + "/" + today.getFullYear();
  
  const rowsToAppend = [];
  newFieldKeys.forEach(key => {
    const data = newFieldsMap[key];
    const urlsArray = Array.from(data.forms);
    const urlsString = urlsArray.join("\n");
    rowsToAppend.push([
      formattedDate,
      data.originalTitle,
      data.type,
      urlsString
    ]);
  });
  
  if (rowsToAppend.length > 0) {
    pendingSheet.getRange(pendingSheet.getLastRow() + 1, 1, rowsToAppend.length, 4).setValues(rowsToAppend);
  }
  
  SpreadsheetApp.getUi().alert(`Field Audit Complete!\n\nDiscovered ${newFieldKeys.length} new custom fields.\nThey have been logged in the "Pending Fields" tab for your review.`);
}


/**
 * Cron job that runs every hour to open/close forms based on Registration Start/End dates.
 */
function masterFormLifecycleCron() {
  const props = PropertiesService.getScriptProperties();
  const formsToMonitor = JSON.parse(props.getProperty('FormsToMonitor') || '{}');
  const now = new Date().getTime();
  let changed = false;

  for (const formId in formsToMonitor) {
    const config = formsToMonitor[formId];
    try {
      const form = FormApp.openById(formId);
      const isAccepting = form.isAcceptingResponses();
      
      let shouldAccept = true;
      
      // If today is strictly BEFORE the start date
      if (config.start && now < config.start) {
        shouldAccept = false;
      }
      
      // If today is strictly AFTER the end date (we add 24 hours for legacy date-only forms, but use exact time if provided)
      const endThreshold = config.isExactEnd ? config.end : (config.end + 24*60*60*1000);
      if (config.end && now > endThreshold) {
        shouldAccept = false;
      }
      
      if (isAccepting !== shouldAccept) {
        form.setAcceptingResponses(shouldAccept);
      }
      
      // If it's way past the end date, stop monitoring it to save quota
      if (config.end && now > (config.end + 7*24*60*60*1000)) {
        delete formsToMonitor[formId];
        changed = true;
      }
    } catch (e) {
      // Form was deleted or inaccessible, stop monitoring
      delete formsToMonitor[formId];
      changed = true;
    }
  }
  
  if (changed) {
    props.setProperty('FormsToMonitor', JSON.stringify(formsToMonitor));
  }
}

function parseLocalDate(dtString) {
  if (!dtString) return null;
  
  if (dtString.includes('T')) {
    const [datePart, timePart] = dtString.split('T');
    const [y, m, d] = datePart.split('-');
    const [hr, min] = timePart.split(':');
    return new Date(y, m - 1, d, hr, min);
  } else if (dtString.includes('-')) {
    const parts = dtString.split("-");
    if (parts.length === 3) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }
  
  // Fallback for native formats like "9/1/2026"
  const fallback = new Date(dtString);
  if (!isNaN(fallback.getTime())) {
     return fallback;
  }
  return null;
}


// ==========================================
// HISTORICAL FORMS AUDIT TOOL
// ==========================================

function setupAuditSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Historical Forms Audit');
  if (!sheet) {
    sheet = ss.insertSheet('Historical Forms Audit');
    const headers = [
      'Form URL (Paste Here)', 
      'Form Title (Auto)', 
      'Baseline Template Description (Paste expected baseline here)', 
      'Extracted Description (Auto)', 
      'Differences (Red = Custom/Unique)'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#d9ead3');
    sheet.setColumnWidth(1, 250);
    sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(3, 350);
    sheet.setColumnWidth(4, 350);
    sheet.setColumnWidth(5, 400);
    sheet.getRange(2, 3).setValue("Theme: [Theme]\nDates: [Dates]\n\n[Add your generic baseline template text here to compare against]");
  }
  ss.setActiveSheet(sheet);
}

function runAudit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Historical Forms Audit');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Audit sheet not found. Please run Setup Audit Sheet first.');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const formUrl = data[i][0];
    const baselineDesc = data[i][2] || "";
    
    if (!formUrl || !formUrl.includes('forms.google.com')) continue;
    
    try {
      const form = FormApp.openByUrl(formUrl);
      const title = form.getTitle();
      const extractedDesc = form.getDescription() || "";
      
      // Update Title and Extracted Desc
      sheet.getRange(i + 1, 2).setValue(title);
      sheet.getRange(i + 1, 4).setValue(extractedDesc);
      
      // Compute Differences
      if (baselineDesc) {
        const richText = computeDiffRichText(baselineDesc, extractedDesc);
        sheet.getRange(i + 1, 5).setRichTextValue(richText);
      } else {
        sheet.getRange(i + 1, 5).setValue(extractedDesc); // No baseline to compare
      }
      
    } catch (e) {
      sheet.getRange(i + 1, 2).setValue("Error: " + e.message);
    }
  }
}

function computeDiffRichText(baselineStr, extractedStr) {
  const builder = SpreadsheetApp.newRichTextValue();
  builder.setText(extractedStr);
  
  const defaultStyle = SpreadsheetApp.newTextStyle().setForegroundColor("#000000").build();
  const highlightStyle = SpreadsheetApp.newTextStyle().setForegroundColor("#FF0000").setBold(true).build();
  
  builder.setTextStyle(0, extractedStr.length, defaultStyle);
  
  // Split into lines for comparison
  const extractedLines = extractedStr.split('\n');
  const baselineLines = baselineStr.split('\n');
  
  let currentIndex = 0;
  for (let i = 0; i < extractedLines.length; i++) {
    const line = extractedLines[i];
    const lineLength = line.length;
    const trimmedLine = line.trim();
    
    if (trimmedLine.length > 0) {
      let found = false;
      // Simple heuristic: if the line exists in baseline, or baseline contains this line
      for (let j = 0; j < baselineLines.length; j++) {
        const bTrimmed = baselineLines[j].trim();
        // Allow partial matches for things like "Theme: " where the extracted has "Theme: 2026 NCC"
        if (bTrimmed && (trimmedLine.includes(bTrimmed) || bTrimmed.includes(trimmedLine))) {
          found = true;
          break;
        }
      }
      
      if (!found) {
        builder.setTextStyle(currentIndex, currentIndex + lineLength, highlightStyle);
      }
    }
    
    currentIndex += lineLength + 1; // +1 for the \n
  }
  
  return builder.build();
}

// ==========================================
// V2 UPGRADE TOOL
// ==========================================

function upgradeExistingSheet() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Upgrade Existing Sheet', 'Paste the URL of the existing Event Responses Spreadsheet:', ui.ButtonSet.OK_CANCEL);
  
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const url = response.getResponseText().trim();
  
  if (!url) return;
  
  let ss;
  try {
    ss = SpreadsheetApp.openByUrl(url);
  } catch (e) {
    ui.alert('Error', 'Could not open the spreadsheet. Please make sure the URL is correct and you have access.', ui.ButtonSet.OK);
    return;
  }
  
  const responsesSheet = ss.getSheetByName('Form Responses 1');
  if (!responsesSheet) {
    ui.alert('Error', 'Could not find "Form Responses 1" tab. Is this a valid Google Forms response sheet?', ui.ButtonSet.OK);
    return;
  }
  
  const confirm = ui.alert('Confirm Upgrade', `Found spreadsheet: "${ss.getName()}".\n\nThis will backup the old Logistics/Pickup/Drop-Off sheets, generate a new Summary Dashboard, and fully resync all historical data. Continue?`, ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  
  // 1. Rename Old Sheets
  const oldNames = ['Logistics', 'Pickup', 'Drop-Off', 'Summary Dashboard'];
  oldNames.forEach(name => {
    const s = ss.getSheetByName(name);
    if (s) {
       let backupName = name + '_Old';
       let counter = 1;
       while (ss.getSheetByName(backupName)) {
         backupName = name + '_Old_' + counter;
         counter++;
       }
       s.setName(backupName);
    }
  });
  
  // 2. Read headers to determine what questions were asked
  const headers = responsesSheet.getRange(1, 1, 1, responsesSheet.getLastColumn()).getDisplayValues()[0];
  const selectedNames = [];
  headers.forEach(h => {
     if (h) selectedNames.push(h);
  });
  
  // 3. Create Summary Dashboard
  const summarySheet = ss.insertSheet("Summary Dashboard");
  summarySheet.getRange("A1").setValue("Event Summary Dashboard").setFontWeight("bold").setFontSize(14);
  
      const sumData = [];
  
  // Helper for single match
  const cCountIfs = (name, val) => {
     return `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("${name}*", 'Form Responses 1'!1:1, 0)), "${val}"), 0)`;
  };

  // Helper for wildcard arrival/departure matching
  const cTravelMatch = (type, mode) => {
     return `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("${type}*", 'Form Responses 1'!1:1, 0)), "*${mode}*"), COUNTIF('Form Responses 1'!1:1000, "*${type === 'Arrival' ? 'arriving' : 'departing'} by ${mode}*"))`;
  };

  sumData.push(["Total Registrants", `="Total: " & COUNTA('Form Responses 1'!A2:A)`, "", ""]);
  sumData.push(["", "", "", ""]);
  
  sumData.push(["Travel Logistics", "", "", ""]);
  sumData.push(["Arriving by Flight", cTravelMatch("Arrival", "flight"), "", ""]);
  sumData.push(["Arriving by Car", cTravelMatch("Arrival", "car"), "", ""]);
  sumData.push(["Does Not Need Pickup", cCountIfs("Arrival", "*need pickup*"), "", ""]);
  sumData.push(["Departing by Flight", cTravelMatch("Departure", "flight"), "", ""]);
  sumData.push(["Departing by Car", cTravelMatch("Departure", "car"), "", ""]);
  sumData.push(["Does Not Need Drop-off", cCountIfs("Departure", "*need drop*"), "", ""]);
  sumData.push(["", "", "", ""]);

  sumData.push(["Lodging Needs", "", "", ""]);
    const cLodgingMatch = (mode) => {
     if (mode === "Yes") {
         return `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("I will be staying*", 'Form Responses 1'!1:1, 0)), "Yes"), IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("*住宿*", 'Form Responses 1'!1:1, 0)), "*host church*"), COUNTIF('Form Responses 1'!1:1000, "*host church*")))`;
     } else {
         return `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("I will be staying*", 'Form Responses 1'!1:1, 0)), "No"), IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("*住宿*", 'Form Responses 1'!1:1, 0)), "*self*"), COUNTIF('Form Responses 1'!1:1000, "*self-arranged*")))`;
     }
  };

  sumData.push(["Staying at Hosting Church", cLodgingMatch("Yes"), "", ""]);
  sumData.push(["Not Staying at Hosting Church", cLodgingMatch("No"), "", ""]);
  sumData.push(["Lodging Before Event", cCountIfs("*lodging before*", "*Yes*"), "", ""]);
  sumData.push(["Lodging After Event", cCountIfs("*lodging after*", "*Yes*"), "", ""]);
  sumData.push(["", "", "", ""]);

  sumData.push(["Dietary & Medical", "", "", ""]);
  const cNeedsMatch = (matcher) => {
      const idx = `INDEX('Form Responses 1'!A2:ZZ1000, 0, MATCH("${matcher}", 'Form Responses 1'!1:1, 0))`;
      return `=IFERROR(COUNTIFS(${idx}, "<>", ${idx}, "<>None", ${idx}, "<>None ", ${idx}, "<> None", ${idx}, "<>No", ${idx}, "<>N/A", ${idx}, "<>NA", ${idx}, "<>None.", ${idx}, "<>Thank you!", ${idx}, "<>Thank you", ${idx}, "<>*don*t need lodging*"), 0)`;
  };
  sumData.push(["Has Food/Medicine Restrictions", cNeedsMatch("Food/Medicine*"), "", ""]);
  sumData.push(["Has Other Special Needs", cNeedsMatch("Other Special Needs*"), "", ""]);
  sumData.push(["", "", "", ""]);

  sumData.push(["Demographics", "", "", ""]);
  sumData.push(["Males", cCountIfs("Gender", "*Male*"), "", ""]);
  sumData.push(["Females", cCountIfs("Gender", "*Female*"), "", ""]);
  
  if (selectedNames.some(n => n.includes("My current age group"))) {
      sumData.push(["", "", "", ""]);
      sumData.push(["Age Groups", "", "", ""]);
      const ageGroups = ['12-14', '15-18', '19-25', '26-35', '36-50', '51+'];
      ageGroups.forEach(ag => {
         sumData.push([ag, cCountIfs("My current age group", ag), "", ""]);
      });
  }

  sumData.push(["", "", "", ""]);
  
  const prefs = ['Light sleeper (sensitive to noise/light)', 'Heavy sleeper', 'Early riser', 'Late sleeper', 'Snorer'];
  const prefCountIfs = (pref, gender) => {
     if (gender) {
        return `=IFERROR(COUNTIFS(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("Sleep Preferences*", 'Form Responses 1'!1:1, 0)), "*${pref}*", INDEX('Form Responses 1'!A:ZZ, 0, MATCH("Gender*", 'Form Responses 1'!1:1, 0)), "*${gender}*"), 0)`;
     } else {
        return `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("Sleep Preferences*", 'Form Responses 1'!1:1, 0)), "*${pref}*"), 0)`;
     }
  };
  
  sumData.push(["Sleep Preferences", "Males", "Females", "Total"]);
  prefs.forEach(p => {
     sumData.push([p, prefCountIfs(p, "Male"), prefCountIfs(p, "Female"), prefCountIfs(p, null)]);
  });

  summarySheet.getRange(3, 1, sumData.length, 4).setValues(sumData);
  summarySheet.getRange(3, 1, sumData.length, 1).setFontWeight("bold");
  summarySheet.setColumnWidth(1, 300);
  summarySheet.setColumnWidth(2, 100);
  summarySheet.setColumnWidth(3, 100);
  summarySheet.setColumnWidth(4, 100);
  
  for(let i=0; i<sumData.length; i++) {
     if(sumData[i][0] && sumData[i][1] === "" && sumData[i][2] === "") {
        summarySheet.getRange(3+i, 1, 1, 4).setBackground("#f3f3f3").setFontColor("#333333");
     } else if (sumData[i][0] === "Sleep Preferences") {
        summarySheet.getRange(3+i, 1, 1, 4).setBackground("#f3f3f3").setFontColor("#333333").setFontWeight("bold");
     }
  }
  // 4. Create Pickup Sheet
  const pickupSheet = ss.insertSheet("Pickup");
  pickupSheet.appendRow([
    "First Name", "Last Name", "Email", "Phone Number", 
    "Arrival Details", "Arrival Date", "Arrival Time", 
    "Departing City/Airport", "Arrival City/Airport", "Arrival Airline", "Arrival Flight Number", 
    "Status", "Driver Full Name", "Driver Phone Number"
  ]);
  pickupSheet.getRange("A1:N1").setFontWeight("bold").setBackground("#4a86e8").setFontColor("white");
  pickupSheet.setFrozenRows(1);
  pickupSheet.getRange(1, 1, pickupSheet.getMaxRows(), pickupSheet.getLastColumn()).createFilter();
  
  // 5. Create Drop-Off Sheet
  const dropoffSheet = ss.insertSheet("Drop-Off");
  dropoffSheet.appendRow([
    "First Name", "Last Name", "Email", "Phone Number", 
    "Departure Details", "Departure Date", "Departure Time", 
    "Departure City/Airport", "Departure Airline", "Departure Flight Number", "Destination City/Airport", 
    "Status", "Driver Full Name", "Driver Phone Number"
  ]);
  dropoffSheet.getRange("A1:N1").setFontWeight("bold").setBackground("#4a86e8").setFontColor("white");
  dropoffSheet.setFrozenRows(1);
  dropoffSheet.getRange(1, 1, dropoffSheet.getMaxRows(), dropoffSheet.getLastColumn()).createFilter();

  // 6. Create Logistics Sheet
  const logisticsSheet = ss.insertSheet("Logistics");
  
  let logHeaders = ["First Name", "Last Name", "Email", "Phone"];
  const optionalHeadersMap = {
    "Gender": "Gender",
    "Age": "Age",
    "Grade (As of September)": "Grade",
    "My current age group": "Age Group",
    "Local Church": "Local Church/Place of Worship",
    "What fellowship": "Local Church/Place of Worship",
    "I will be staying at the hosting church.": "Staying at Host Church?",
    "I need lodging before the event": "Lodging Before",
    "I need lodging after the event": "Lodging After",
    "Food/Medicine Restrictions": "Food/Medicine Restrictions",
    "Sleep Preferences & Habits (select all that apply)": "Sleep Preferences & Habits",
    "Other Special Needs/Accommodations (e.g., mobility assistance)": "Other Special Needs",
    "Emergency Contact Person": "Emergency Contact Person",
    "Emergency Contact Relationship": "Emergency Contact Relationship",
    "Emergency Contact Phone": "Emergency Contact Phone"
  };

  if (selectedNames.some(n => n.includes("Local Church") || n.includes("What fellowship"))) {
     logHeaders.push("Local Church/Place of Worship");
  }
  
  for (const [key, headerStr] of Object.entries(optionalHeadersMap)) {
    if (key.includes("Local Church") || key.includes("What fellowship")) continue;
    if (selectedNames.some(n => n.includes(key))) {
      if (!logHeaders.includes(headerStr)) {
         logHeaders.push(headerStr);
      }
    }
  }
  if (selectedNames.some(n => n === "I need lodging before the event") && !logHeaders.includes("Lodging Before")) {
      logHeaders.push("Lodging Before");
  }
  if (selectedNames.some(n => n === "I need lodging after the event") && !logHeaders.includes("Lodging After")) {
      logHeaders.push("Lodging After");
  }
  if (selectedNames.some(n => n === "Food/Medicine Restrictions") && !logHeaders.includes("Food/Medicine Restrictions")) {
      logHeaders.push("Food/Medicine Restrictions");
  }
  if (selectedNames.some(n => n === "Other Special Needs/Accommodations (e.g., mobility assistance)") && !logHeaders.includes("Other Special Needs")) {
      logHeaders.push("Other Special Needs");
  }
  logHeaders.push("Room Assignment", "Group/Team", "Notes");
  logisticsSheet.appendRow(logHeaders);
  
  const autoColCount = logHeaders.length - 3;
  logisticsSheet.getRange(1, 1, 1, autoColCount).setFontWeight("bold").setBackground("#4a86e8").setFontColor("white");
  logisticsSheet.getRange(1, autoColCount + 1, 1, 3).setFontWeight("bold").setBackground("#ffd966").setFontColor("black");
  logisticsSheet.setFrozenRows(1);
  logisticsSheet.setColumnWidth(1, 150);
  logisticsSheet.setColumnWidth(2, 150);
  for (let i = 3; i <= logHeaders.length; i++) {
     logisticsSheet.setColumnWidth(i, 200);
  }
  logisticsSheet.getRange(1, 1, logisticsSheet.getMaxRows(), logHeaders.length).createFilter();

  // 7. Loop through all responses and run masterRespondToRegistration-style logic
  const responseData = responsesSheet.getDataRange().getDisplayValues();
  
  const syncResponses = (headersRow, rowData) => {
      const responses = {};
      for (let i = 0; i < headersRow.length; i++) {
          responses[String(headersRow[i])] = [String(rowData[i])];
      }
      
      let emailRecipient = "";
      let firstName = "Registrant";
      let lastName = "", phone = "", arrDetails = "", arrDate = "", arrTime = "", depCity = "", arrCity = "", arrAirline = "", arrFlight = "";
      let depDetails = "", depDate = "", depTime = "", depCityOut = "", depAirline = "", depFlight = "", destCity = "";

      if (responses["Email Address"] && responses["Email Address"][0]) {
        emailRecipient = responses["Email Address"][0];
      }
      for (let header in responses) {
        let hLower = header.toLowerCase();
        let val = responses[header][0];
        
        if (!emailRecipient && hLower.includes("email") && !hLower.includes("minor")) {
           emailRecipient = val;
        }
        if (hLower.includes("first name")) { if (val) firstName = val; }
        else if (hLower.includes("last name")) lastName = val;
        else if (hLower.includes("phone") && !hLower.includes("emergency")) phone = val;
        else if (hLower.includes("arrival details") || hLower.includes("arrival arrangements") || hLower.includes("arriving by")) arrDetails = val;
        else if (hLower.includes("arrival date")) arrDate = val;
        else if (hLower.includes("arrival time")) arrTime = val;
        else if (hLower.includes("departing city")) depCity = val;
        else if (hLower.includes("arrival city")) arrCity = val;
        else if (hLower.includes("arrival airline")) arrAirline = val;
        else if (hLower.includes("arrival flight number")) arrFlight = val;
        else if (hLower.includes("departure details") || hLower.includes("departure arrangements") || hLower.includes("departing by")) depDetails = val;
        else if (hLower.includes("departure date")) depDate = val;
        else if (hLower.includes("departure time")) depTime = val;
        else if (hLower.includes("departure city") && !hLower.includes("departing")) depCityOut = val;
        else if (hLower.includes("departure airline")) depAirline = val;
        else if (hLower.includes("departure flight number")) depFlight = val;
        else if (hLower.includes("destination city")) destCity = val;
      }
      
      if (!emailRecipient) return;
      
      // Pickup Sync
      if (arrDetails && arrDetails.toLowerCase().includes("arriving by flight")) {
          const newRowData = [firstName, lastName, emailRecipient, phone, arrDetails, arrDate, arrTime, depCity, arrCity, arrAirline, arrFlight, "Active", "", ""];
          pickupSheet.appendRow(newRowData);
      }
      
      // Drop-Off Sync
      if (depDetails && depDetails.toLowerCase().includes("departing by flight")) {
          const updateData = [firstName, lastName, emailRecipient, phone, depDetails, depDate, depTime, depCityOut, depAirline, depFlight, destCity, "Active", "", ""];
          dropoffSheet.appendRow(updateData);
      }
      
      // Logistics Sync
      const newLogRowData = [];
      for (let i = 0; i < autoColCount; i++) {
           const logHeader = logHeaders[i];
           let mappedValue = "";
           if (logHeader === "First Name") mappedValue = firstName;
           else if (logHeader === "Last Name") mappedValue = lastName;
           else if (logHeader === "Email") mappedValue = emailRecipient;
           else if (logHeader === "Phone") mappedValue = phone;
           else {
               for (const respHeader in responses) {
                   let hLower = respHeader.toLowerCase();
                   let val = responses[respHeader][0] || "";
                   if (logHeader === "Gender" && hLower.startsWith("gender")) mappedValue = val;
                   else if (logHeader === "Age" && hLower === "age") mappedValue = val;
                   else if (logHeader === "Grade" && hLower.startsWith("grade")) mappedValue = val;
                   else if (logHeader === "Age Group" && hLower.includes("age group")) mappedValue = val;
                   else if (logHeader === "Local Church/Place of Worship" && (hLower.includes("local church") || hLower.includes("fellowship"))) mappedValue = val;
                   else if (logHeader === "Staying at Host Church?" && hLower.includes("staying at the hosting church")) mappedValue = val;
                   else if (logHeader === "Lodging Before" && hLower.includes("lodging before")) mappedValue = val;
                   else if (logHeader === "Lodging After" && hLower.includes("lodging after")) mappedValue = val;
                   else if (logHeader === "Food/Medicine Restrictions" && hLower.includes("food/medicine")) mappedValue = val;
                   else if (logHeader === "Sleep Preferences & Habits" && hLower.includes("sleep preferences")) mappedValue = val;
                   else if (logHeader === "Other Special Needs" && hLower.includes("other special needs")) mappedValue = val;
                   else if (logHeader === "Emergency Contact Person" && hLower.includes("emergency contact person")) mappedValue = val;
                   else if (logHeader === "Emergency Contact Relationship" && hLower.includes("emergency contact relationship")) mappedValue = val;
                   else if (logHeader === "Emergency Contact Phone" && hLower.includes("emergency contact phone")) mappedValue = val;
               }
           }
           newLogRowData.push(mappedValue);
      }
      const blankPadding = new Array(logHeaders.length - autoColCount).fill("");
      logisticsSheet.appendRow([...newLogRowData, ...blankPadding]);
  };
  
  if (responseData.length > 1) {
    const hRow = responseData[0];
    for (let i = 1; i < responseData.length; i++) {
       syncResponses(hRow, responseData[i]);
    }
  }
  
  // Sort
  if (pickupSheet.getLastRow() > 1) {
     pickupSheet.getRange(2, 1, pickupSheet.getLastRow() - 1, pickupSheet.getLastColumn()).sort([{column: 9, ascending: true}, {column: 6, ascending: true}, {column: 7, ascending: true}]);
  }
  if (dropoffSheet.getLastRow() > 1) {
     dropoffSheet.getRange(2, 1, dropoffSheet.getLastRow() - 1, dropoffSheet.getLastColumn()).sort([{column: 8, ascending: true}, {column: 6, ascending: true}, {column: 7, ascending: true}]);
  }
  if (logisticsSheet.getLastRow() > 1) {
     logisticsSheet.getRange(2, 1, logisticsSheet.getLastRow() - 1, logisticsSheet.getLastColumn()).sort([{column: 2, ascending: true}]);
  }

  ui.alert('Success', 'Spreadsheet successfully upgraded to the new V2 format!', ui.ButtonSet.OK);
}
