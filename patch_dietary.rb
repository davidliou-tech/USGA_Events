code = File.read('Code.gs')

dietary_block = <<-BLOCK
  const cNeedsMatch = (matcher) => {
      const idx = `INDEX('Form Responses 1'!A2:ZZ1000, 0, MATCH("${matcher}", 'Form Responses 1'!1:1, 0))`;
      return `=IFERROR(COUNTIFS(${idx}, "<>", ${idx}, "<>None", ${idx}, "<>No", ${idx}, "<>N/A", ${idx}, "<>NA", ${idx}, "<>None."), 0)`;
  };
BLOCK

# We need to replace the two sumData.push lines for dietary & medical
old_food = 'sumData.push(["Has Food/Medicine Restrictions", `=IFERROR(COUNTIFS(INDEX(\\\'Form Responses 1\\\'!A:ZZ, 0, MATCH("Food/Medicine*", \\\'Form Responses 1\\\'!1:1, 0)), "<>", INDEX(\\\'Form Responses 1\\\'!A:ZZ, 0, MATCH("Food/Medicine*", \\\'Form Responses 1\\\'!1:1, 0)), "<>Food/Medicine Restrictions"), 0)`, "", ""]);'
old_special = 'sumData.push(["Has Other Special Needs", `=IFERROR(COUNTIFS(INDEX(\\\'Form Responses 1\\\'!A:ZZ, 0, MATCH("Other Special Needs*", \\\'Form Responses 1\\\'!1:1, 0)), "<>", INDEX(\\\'Form Responses 1\\\'!A:ZZ, 0, MATCH("Other Special Needs*", \\\'Form Responses 1\\\'!1:1, 0)), "<>Other Special Needs/Accommodations (e.g., mobility assistance)"), 0)`, "", ""]);'

# We'll use regex to make it safer since escaping quotes can be tricky
code = code.gsub(/sumData\.push\(\["Has Food\/Medicine Restrictions".*?\);/, 
                 dietary_block.strip + "\n  sumData.push([\"Has Food/Medicine Restrictions\", cNeedsMatch(\"Food/Medicine*\"), \"\", \"\"]);")

code = code.gsub(/sumData\.push\(\["Has Other Special Needs".*?\);/, 
                 "sumData.push([\"Has Other Special Needs\", cNeedsMatch(\"Other Special Needs*\"), \"\", \"\"]);")

File.write('Code.gs', code)
puts 'Success!'
