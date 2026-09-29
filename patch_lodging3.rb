code = File.read('Code.gs')

lodging_block = <<-BLOCK
  const cLodgingMatch = (mode) => {
     if (mode === "Yes") {
         return `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("I will be staying*", 'Form Responses 1'!1:1, 0)), "Yes"), IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("*Arrange*", 'Form Responses 1'!1:1, 0)), "*host church*"), COUNTIF('Form Responses 1'!1:1000, "*host church*")))`;
     } else {
         return `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("I will be staying*", 'Form Responses 1'!1:1, 0)), "No"), IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("*Arrange*", 'Form Responses 1'!1:1, 0)), "*self-arranged*"), COUNTIF('Form Responses 1'!1:1000, "*self-arranged*")))`;
     }
  };
BLOCK

code = code.gsub(/const cLodgingMatch = \(mode\) => \{.*?\};\n/m, lodging_block.strip + "\n")

# Let's also fix Lodging Before and After to fallback to full sheet scan just in case
lb_old = 'sumData.push(["Lodging Before Event", cCountIfs("*lodging before*", "*Yes*"), "", ""]);'
lb_new = 'sumData.push(["Lodging Before Event", `=IFERROR(COUNTIF(INDEX(\\\'Form Responses 1\\\'!A:ZZ, 0, MATCH("*lodging before*", \\\'Form Responses 1\\\'!1:1, 0)), "*Yes*"), COUNTIF(\\\'Form Responses 1\\\'!1:1000, "*lodging before*Yes*"))`, "", ""]);'
code = code.gsub(lb_old, lb_new)

la_old = 'sumData.push(["Lodging After Event", cCountIfs("*lodging after*", "*Yes*"), "", ""]);'
la_new = 'sumData.push(["Lodging After Event", `=IFERROR(COUNTIF(INDEX(\\\'Form Responses 1\\\'!A:ZZ, 0, MATCH("*lodging after*", \\\'Form Responses 1\\\'!1:1, 0)), "*Yes*"), COUNTIF(\\\'Form Responses 1\\\'!1:1000, "*lodging after*Yes*"))`, "", ""]);'
code = code.gsub(la_old, la_new)

File.write('Code.gs', code)
puts 'Success!'
