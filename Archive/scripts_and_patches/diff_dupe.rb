code = File.readlines('clean_Code.gs')
line1 = 1768 - 1
line2 = 3686 - 1
matches = 0
while line2 < code.length
  if code[line1] == code[line2]
    matches += 1
  else
    puts "Difference at offset #{matches}: #{code[line1].strip} != #{code[line2].strip}"
    break
  end
  line1 += 1
  line2 += 1
end
puts "Matched #{matches} lines"
