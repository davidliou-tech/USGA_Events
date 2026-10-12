code = File.read('Code.gs')
puts "Summary Dashboard found: #{code.include?('Summary Dashboard')}"
puts "Total Registrants found: #{code.include?('Total Registrants')}"
puts "sumData found: #{code.include?('sumData')}"
