code = File.read('Code.gs')

lodging_block = <<-BLOCK
  const cLodgingMatch = (mode) => {
     if (mode === "Yes") {
         return `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("I will be staying*", 'Form Responses 1'!1:1, 0)), "Yes"), IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("*Lodging Arrange*", 'Form Responses 1'!1:1, 0)), "*host church*"), 0))`;
     } else {
         return `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("I will be staying*", 'Form Responses 1'!1:1, 0)), "No"), IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("*Lodging Arrange*", 'Form Responses 1'!1:1, 0)), "*self*"), 0))`;
     }
  };
BLOCK

# Find the start of the old cLodgingMatch block
code = code.gsub(/const cLodgingMatch = \(mode\) => \{.*?\};\n/m, lodging_block.strip + "\n")

File.write('Code.gs', code)
puts 'Success!'
