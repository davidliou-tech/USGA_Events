code = File.read('Code.gs')

# Fix Gender: search for *Male* and *Female* instead of exact match
code = code.gsub(/cCountIfs\("Gender", "Male"\)/, 'cCountIfs("Gender", "*Male*")')
code = code.gsub(/cCountIfs\("Gender", "Female"\)/, 'cCountIfs("Gender", "*Female*")')

# Fix Sleep Preferences Gender matching:
# old: return \`=IFERROR(COUNTIFS(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("Sleep Preferences*", 'Form Responses 1'!1:1, 0)), "*\${pref}*", INDEX('Form Responses 1'!A:ZZ, 0, MATCH("Gender*", 'Form Responses 1'!1:1, 0)), "\${gender}"), 0)\`;
# new: "\${gender}" -> "*\${gender}*"
code = code.gsub(/MATCH\("Gender\*", 'Form Responses 1'!1:1, 0\)\), "\$\{gender\}"\)/, 'MATCH("Gender*", \'Form Responses 1\'!1:1, 0)), "*${gender}*")')

# Fix Lodging:
lodging_block = <<-BLOCK
  const cLodgingMatch = (mode) => {
     if (mode === "Yes") {
         return `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("I will be staying*", 'Form Responses 1'!1:1, 0)), "Yes"), IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("Lodging*", 'Form Responses 1'!1:1, 0)), "*host church*"), 0))`;
     } else {
         return `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("I will be staying*", 'Form Responses 1'!1:1, 0)), "No"), IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("Lodging*", 'Form Responses 1'!1:1, 0)), "*self-arranged*"), 0))`;
     }
  };
BLOCK

code = code.gsub('sumData.push(["Staying at Hosting Church", cCountIfs("I will be staying at the hosting church", "Yes"), "", ""]);',
                 lodging_block + "\n  sumData.push([\"Staying at Hosting Church\", cLodgingMatch(\"Yes\"), \"\", \"\"]);")
                 
code = code.gsub('sumData.push(["Not Staying at Hosting Church", cCountIfs("I will be staying at the hosting church", "No"), "", ""]);',
                 'sumData.push(["Not Staying at Hosting Church", cLodgingMatch("No"), "", ""]);')

File.write('Code.gs', code)
puts 'Success!'
