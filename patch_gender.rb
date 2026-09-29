code = File.read('Code.gs')
code = code.gsub(/const hasGender = selectedNames\.some\(n => n === "Gender"\);/, 'const hasGender = selectedNames.some(n => n.toLowerCase().includes("gender"));')
File.write('Code.gs', code)
puts 'Success!'
