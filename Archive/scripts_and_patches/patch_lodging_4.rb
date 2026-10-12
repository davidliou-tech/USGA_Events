code = File.read('Code.gs')

lodging_block = <<-BLOCK
  const cLodgingMatch = (mode) => {
     if (mode === "Yes") {
         return `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("I will be staying*", 'Form Responses 1'!1:1, 0)), "Yes"), IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("*住宿*", 'Form Responses 1'!1:1, 0)), "*host church*"), COUNTIF('Form Responses 1'!1:1000, "*host church*")))`;
     } else {
         return `=IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("I will be staying*", 'Form Responses 1'!1:1, 0)), "No"), IFERROR(COUNTIF(INDEX('Form Responses 1'!A:ZZ, 0, MATCH("*住宿*", 'Form Responses 1'!1:1, 0)), "*self*"), COUNTIF('Form Responses 1'!1:1000, "*self-arranged*")))`;
     }
  };
BLOCK

code = code.gsub(/const cLodgingMatch = \(mode\) => \{.*?\};\n/m, lodging_block.strip + "\n")

File.write('Code.gs', code)
puts 'Success!'
