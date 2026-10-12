code = File.read('clean_Code.gs')

# 1. Update the second block
code = code.gsub('sumData.push(["Lodging Before Event", cCountIfs("*lodging before*", "*Yes*"), "", ""]);',
                 'sumData.push(["Lodging Before Event", `=IFERROR(COUNTIF(INDEX(\'Form Responses 1\'!A:ZZ, 0, MATCH("*lodging before*", \'Form Responses 1\'!1:1, 0)), "*Yes*"), COUNTIF(\'Form Responses 1\'!1:1000, "*lodging before*Yes*"))`, "", ""]);')

code = code.gsub('sumData.push(["Lodging After Event", cCountIfs("*lodging after*", "*Yes*"), "", ""]);',
                 'sumData.push(["Lodging After Event", `=IFERROR(COUNTIF(INDEX(\'Form Responses 1\'!A:ZZ, 0, MATCH("*lodging after*", \'Form Responses 1\'!1:1, 0)), "*Yes*"), COUNTIF(\'Form Responses 1\'!1:1000, "*lodging after*Yes*"))`, "", ""]);')

# 2. Insert into the first block
insert_str = <<-BLOCK
  sumData.push(["Lodging Before Event", `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("*lodging before*", 'Form Responses 1'!1:1, 0)), "*Yes*"), COUNTIF('Form Responses 1'!1:1000, "*lodging before*Yes*"))`, "", ""]);
  sumData.push(["Lodging After Event", `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("*lodging after*", 'Form Responses 1'!1:1, 0)), "*Yes*"), COUNTIF('Form Responses 1'!1:1000, "*lodging after*Yes*"))`, "", ""]);
BLOCK

code = code.gsub(/sumData\.push\(\["Not Staying at Hosting Church", cLodgingMatch\("No"\), "", ""\]\);\n  sumData\.push\(\["", "", "", ""\]\);/,
                 "sumData.push([\"Not Staying at Hosting Church\", cLodgingMatch(\"No\"), \"\", \"\"]);\n" + insert_str + "  sumData.push([\"\", \"\", \"\", \"\"]);")

File.write('Code.gs', code)
puts "Success!"
