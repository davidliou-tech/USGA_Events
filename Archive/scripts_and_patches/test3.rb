code = File.read('Code.gs')
puts "upgradeExistingSheet found: #{code.include?('upgradeExistingSheet')}"
puts "generateForm found: #{code.include?('generateForm')}"
