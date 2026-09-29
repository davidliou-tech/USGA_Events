code = File.read('Code.gs')

dietary_block = <<-BLOCK
  const cNeedsMatch = (matcher) => {
      const idx = `INDEX('Form Responses 1'!A2:ZZ1000, 0, MATCH("${matcher}", 'Form Responses 1'!1:1, 0))`;
      return `=IFERROR(COUNTIFS(${idx}, "<>", ${idx}, "<>None", ${idx}, "<>None ", ${idx}, "<> None", ${idx}, "<>No", ${idx}, "<>N/A", ${idx}, "<>NA", ${idx}, "<>None.", ${idx}, "<>Thank you!", ${idx}, "<>Thank you", ${idx}, "<>*don*t need lodging*"), 0)`;
  };
BLOCK

code = code.gsub(/const cNeedsMatch = \(matcher\) => \{.*?\};\n/m, dietary_block.strip + "\n")

File.write('Code.gs', code)
puts 'Success!'
