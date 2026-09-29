code = File.read('Code.gs')
idx1 = code.index("function onOpen()")
idx2 = code.index("function onOpen()", idx1 + 10)
if idx2
  puts "Found duplicate onOpen at \#{idx2}. Truncating..."
  File.write('Code.gs', code[0...idx2])
else
  puts "No duplicate found"
end
