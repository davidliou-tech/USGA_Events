/**
 * Configuration for generating a new Event Registration Form.
 * You can modify these variables for future events.
 */
const EVENT_CONFIG = {
  eventName: "National Youth Fellowship 2026",
  theme: "Arise and Shine",
  hostingChurch: "First Church of XYZ",
  eligibility: "High school and college students (ages 14-22).",
  fees: "$50 Early Bird / $75 Regular",
  registrationDeadline: "July 31, 2026",
  
  // Define all your form fields here. You can add, remove, or reorder these easily.
  // Supported types: 'SECTION', 'TEXT', 'PARAGRAPH', 'MULTIPLE_CHOICE', 'CHECKBOX', 'DATE'
  fields: [
    { type: "SECTION", title: "Personal Information" },
    { type: "TEXT", title: "First Name", required: true },
    { type: "TEXT", title: "Last Name", required: true },
    { type: "TEXT", title: "Phone Number", required: true },
    { type: "TEXT", title: "Which local church do you attend?", required: true },
    { 
      type: "MULTIPLE_CHOICE", 
      title: "Attendee Type / Role", 
      choices: ["Student", "Counselor", "Pastor", "Parent", "Other"],
      required: true 
    },
    
    // Example of a new custom field you can add easily:
    { 
      type: "CHECKBOX", 
      title: "Dietary Restrictions", 
      choices: ["None", "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Nut Allergy"],
      required: false 
    },
    
    { type: "SECTION", title: "Emergency Contact Information" },
    { type: "TEXT", title: "Emergency Contact Name", required: true },
    { type: "TEXT", title: "Emergency Contact Phone Number", required: true }
  ]
};

/**
 * Main function to generate the Event Registration Form.
 */
function generateEventRegistrationForm() {
  const formTitle = `${EVENT_CONFIG.eventName} Registration Form`;
  const form = FormApp.create(formTitle);
  
  const formDescription = `
Welcome to the registration for ${EVENT_CONFIG.eventName}!
Theme: ${EVENT_CONFIG.theme}
Hosted by: ${EVENT_CONFIG.hostingChurch}

Eligibility: ${EVENT_CONFIG.eligibility}
Registration Fees: ${EVENT_CONFIG.fees}
Registration Deadline: ${EVENT_CONFIG.registrationDeadline}
  `.trim();
  
  form.setDescription(formDescription);
  form.setCollectEmail(true);
  
  // Automatically generate fields based on the EVENT_CONFIG.fields array
  EVENT_CONFIG.fields.forEach(field => {
    let item;
    
    switch (field.type) {
      case "SECTION":
        item = form.addSectionHeaderItem().setTitle(field.title);
        if (field.helpText) item.setHelpText(field.helpText);
        break;
      case "TEXT":
        item = form.addTextItem().setTitle(field.title);
        break;
      case "PARAGRAPH":
        item = form.addParagraphTextItem().setTitle(field.title);
        break;
      case "MULTIPLE_CHOICE":
        item = form.addMultipleChoiceItem().setTitle(field.title).setChoiceValues(field.choices);
        break;
      case "CHECKBOX":
        item = form.addCheckboxItem().setTitle(field.title).setChoiceValues(field.choices);
        break;
      case "DATE":
        item = form.addDateItem().setTitle(field.title);
        break;
      default:
        Logger.log(`Warning: Unsupported field type ${field.type}`);
    }
    
    // Apply required status to interactive fields
    if (item && field.type !== "SECTION" && field.required !== undefined) {
      item.setRequired(field.required);
    }
  });
  
  Logger.log("Form created successfully!");
  Logger.log("Edit URL: " + form.getEditUrl());
  Logger.log("Published URL: " + form.getPublishedUrl());
}
