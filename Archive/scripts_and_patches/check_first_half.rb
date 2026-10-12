code = File.read('clean_Code.gs')
idx1 = code.index("function appendAuditLog")
idx2 = code.index("function appendAuditLog", idx1 + 10)
if idx2
  str = "\n}\n\nf"
  idx_f = code.rindex(str, idx2)
  first_half = code[0..idx_f+2]
  puts "First half length: #{first_half.length}"
  puts "Has ORD mangling? #{first_half.include?("Chicago O\n    item =")}"
else
  puts "No dupe found"
end
