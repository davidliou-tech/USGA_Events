code = File.read('clean_Code.gs')
target = "  if (typeStr.includes('short answer') || typeStr.includes('text') || typeStr.includes('number')) {"

# The replacement was injected at the first occurrence of `target` in the original file.
# The original file was: prefix + target + suffix.
# After the mangled sub!: code = prefix + "Chicago O" + suffix + "Hare..." + "\n" + target + suffix.

# Let's find "Chicago O"
idx_chicago = code.index("'ORD': 'Chicago O")
# Wait, 'ORD': 'Chicago O is actually preceded by the FIRST PART of `airport_logic`!
# `airport_logic` started with `  if (field.name === 'Arrival City/Airport'`
idx_injection_start = code.index("  if (field.name === 'Arrival City/Airport' || field.name === 'Departure City/Airport') {\n    const airportFullNames = {")

if idx_injection_start && idx_chicago
  prefix = code[0...idx_injection_start]
  
  # The original suffix is everything after `\n` + target in the mangled file!
  # But target might appear multiple times in the suffix? No, target is pretty unique.
  # Let's find the FIRST occurrence of target AFTER the injected `airport_logic`'s "Hare..."
  # The injected logic ends with `return item;\n  }`
  idx_return_item = code.index("    return item;\n  }", idx_chicago)
  
  if idx_return_item
    # The target should be right after this
    idx_target = code.index(target, idx_return_item)
    if idx_target
      suffix = code[idx_target + target.length..-1]
      
      pristine_code = prefix + target + suffix
      File.write('Code.gs', pristine_code)
      puts "Pristine code reconstructed! Length: #{pristine_code.length}"
    else
      puts "Target not found after return item"
    end
  else
    puts "return item not found"
  end
else
  puts "Injection start or Chicago O not found"
end

