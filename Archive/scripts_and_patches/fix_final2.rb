code = File.read('clean_Code.gs')
target = "  if (typeStr.includes('short answer') || typeStr.includes('text') || typeStr.includes('number')) {"

idx_injection_start = code.index("if (field.name === 'Arrival City/Airport' || field.name === 'Departure City/Airport') {")
idx_chicago = code.index("'ORD': \"Chicago O")
if !idx_chicago
  idx_chicago = code.index("'ORD': 'Chicago O")
end

if idx_injection_start && idx_chicago
  prefix = code[0...idx_injection_start]
  idx_return_item = code.index("return item;\n  }", idx_chicago)
  if !idx_return_item
    idx_return_item = code.index("return item;\n}", idx_chicago)
  end
  
  if idx_return_item
    idx_target = code.index(target, idx_return_item)
    if idx_target
      suffix = code[idx_target + target.length..-1]
      pristine_code = prefix + target + suffix
      File.write('Code.gs', pristine_code)
      puts "Pristine code reconstructed! Lines: #{pristine_code.lines.count}"
    else
      puts "target not found"
    end
  else
    puts "return item not found"
  end
else
  puts "start not found"
end
