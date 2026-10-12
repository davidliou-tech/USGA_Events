const fs = require('fs');
let code = fs.readFileSync('Code.gs', 'utf8');

const newSumDataStr = `
  const sumData = [];
  sumData.push(["Total Registrants", "Total: " + '=" & COUNTA(\\'Form Responses 1\\'!A2:A)"', ""]);
  // We'll replace the hardcoded string with the proper formula format below.

  // Helper for single match
  const cCountIfs = (name, val) => {
     return \`=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("\${name}*", 'Form Responses 1'!1:1, 0)), "\${val}"), 0)\`;
  };

  // Helper for wildcard arrival/departure matching to catch variations like "Arrival Details" or "Arrival Arrangements"
  const cTravelMatch = (type, mode) => {
     return \`=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("\${type}*", 'Form Responses 1'!1:1, 0)), "*\${mode}*"), COUNTIF('Form Responses 1'!1:1000, "*\${type === 'Arrival' ? 'arriving' : 'departing'} by \${mode}*"))\`;
  };

  sumData.push(["Total Registrants", \`="Total: " & COUNTA('Form Responses 1'!A2:A)\`, ""]);
  sumData.push(["", "", ""]);
  
  sumData.push(["Travel Logistics", "", ""]);
  sumData.push(["Arriving by Flight", cTravelMatch("Arrival", "flight"), ""]);
  sumData.push(["Arriving by Car", cTravelMatch("Arrival", "car"), ""]);
  sumData.push(["Departing by Flight", cTravelMatch("Departure", "flight"), ""]);
  sumData.push(["Departing by Car", cTravelMatch("Departure", "car"), ""]);
  sumData.push(["", "", ""]);

  sumData.push(["Lodging Needs", "", ""]);
  sumData.push(["Staying at Hosting Church", cCountIfs("I will be staying at the hosting church", "Yes"), ""]);
  sumData.push(["Not Staying at Hosting Church", cCountIfs("I will be staying at the hosting church", "No"), ""]);
  sumData.push(["Lodging Before Event", cCountIfs("I need lodging before the event", "Yes"), ""]);
  sumData.push(["Lodging After Event", cCountIfs("I need lodging after the event", "Yes"), ""]);
  sumData.push(["", "", ""]);

  sumData.push(["Dietary & Medical", "", ""]);
  sumData.push(["Has Food/Medicine Restrictions", \`=IFERROR(COUNTIFS(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("Food/Medicine*", 'Form Responses 1'!1:1, 0)), "<>", INDEX('Form Responses 1'!A:ZZ, 0, MATCH("Food/Medicine*", 'Form Responses 1'!1:1, 0)), "<>Food/Medicine Restrictions"), 0)\`, ""]);
  sumData.push(["Has Other Special Needs", \`=IFERROR(COUNTIFS(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("Other Special Needs*", 'Form Responses 1'!1:1, 0)), "<>", INDEX('Form Responses 1'!A:ZZ, 0, MATCH("Other Special Needs*", 'Form Responses 1'!1:1, 0)), "<>Other Special Needs/Accommodations (e.g., mobility assistance)"), 0)\`, ""]);
  sumData.push(["", "", ""]);

  sumData.push(["Demographics", "", ""]);
  sumData.push(["Males", cCountIfs("Gender", "Male"), ""]);
  sumData.push(["Females", cCountIfs("Gender", "Female"), ""]);
  
  if (selectedNames.some(n => n.includes("My current age group"))) {
      sumData.push(["", "", ""]);
      sumData.push(["Age Groups", "", ""]);
      const ageGroups = ['12-14', '15-18', '19-25', '26-35', '36-50', '51+'];
      ageGroups.forEach(ag => {
         sumData.push([ag, cCountIfs("My current age group", ag), ""]);
      });
  }

  sumData.push(["", "", ""]);
  
  const prefs = ['Light sleeper (sensitive to noise/light)', 'Heavy sleeper', 'Early riser', 'Night owl', 'Snorer'];
  const prefCountIfs = (pref, gender) => {
     if (gender) {
        return \`=IFERROR(COUNTIFS(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("Sleep Preferences*", 'Form Responses 1'!1:1, 0)), "*\${pref}*", INDEX('Form Responses 1'!A:ZZ, 0, MATCH("Gender*", 'Form Responses 1'!1:1, 0)), "\${gender}"), 0)\`;
     } else {
        return \`=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("Sleep Preferences*", 'Form Responses 1'!1:1, 0)), "*\${pref}*"), 0)\`;
     }
  };
  
  const hasGender = selectedNames.some(n => n === "Gender");
  
  if (hasGender) {
      sumData.push(["Sleep Preferences", "Males", "Females"]);
      prefs.forEach(p => {
         sumData.push([p, prefCountIfs(p, "Male"), prefCountIfs(p, "Female")]);
      });
  } else {
      sumData.push(["Sleep Preferences", "Count", ""]);
      prefs.forEach(p => {
         sumData.push([p, prefCountIfs(p, null), ""]);
      });
  }

  summarySheet.getRange(3, 1, sumData.length, 3).setValues(sumData);
  summarySheet.getRange(3, 1, sumData.length, 1).setFontWeight("bold");
  summarySheet.setColumnWidth(1, 300);
  summarySheet.setColumnWidth(2, 100);
  summarySheet.setColumnWidth(3, 100);
  
  for(let i=0; i<sumData.length; i++) {
     if(sumData[i][0] && sumData[i][1] === "" && sumData[i][2] === "") {
        summarySheet.getRange(3+i, 1, 1, 3).setBackground("#f3f3f3").setFontColor("#333333");
     } else if (sumData[i][0] === "Sleep Preferences") {
        summarySheet.getRange(3+i, 1, 1, 3).setBackground("#f3f3f3").setFontColor("#333333").setFontWeight("bold");
     }
  }
`;

function replaceBlock(sourceCode, startMarkerStr, endMarkerStr, isUpgrade) {
  // Find the start of the block
  let startIndex = sourceCode.indexOf('const sumData = [];');
  if (isUpgrade) {
    // find the second occurrence
    startIndex = sourceCode.indexOf('const sumData = [];', startIndex + 10);
  }
  
  if (startIndex === -1) return sourceCode;
  
  let endIndex = sourceCode.indexOf('// Clean up the initial default blank sheet', startIndex);
  if (isUpgrade) {
     endIndex = sourceCode.indexOf('// 4. Create Pickup Sheet', startIndex);
  }
  
  if (endIndex === -1) return sourceCode;
  
  let before = sourceCode.substring(0, startIndex);
  let after = sourceCode.substring(endIndex);
  
  // To handle the first line in generateForm (Total Registrants logic is slightly different)
  let block = newSumDataStr;
  if (!isUpgrade) {
      block = block.replace("sumData.push([\"Total Registrants\", `=\"Total: \" & COUNTA('Form Responses 1'!A2:A)`, \"\"]);", 
                            "sumData.push([\"Total Registrants\", `=\"Total: \" & IF(Participants!A2=\"No responses yet\", 0, COUNTA(Participants!A2:A))`, \"\"]);");
  }
  // Remove the initial dummy line
  block = block.replace(`  sumData.push(["Total Registrants", "Total: " + '=" & COUNTA(\\'Form Responses 1\\'!A2:A)"', ""]);\n  // We'll replace the hardcoded string with the proper formula format below.\n`, "");

  return before + block + "\n  " + after;
}

code = replaceBlock(code, '', '', false); // generateForm
code = replaceBlock(code, '', '', true); // upgradeExistingSheet

fs.writeFileSync('Code.gs', code);
console.log('Code.gs patched successfully.');
