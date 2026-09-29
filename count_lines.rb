code = File.read('clean_Code.gs')
idx1 = code.index("function appendAuditLog")
idx2 = code.index("function appendAuditLog", idx1 + 10)
str = "\n}\n\nf"
idx_f = code.rindex(str, idx2)
first_half = code[0..idx_f+2]
puts "First half lines: #{first_half.lines.count}"
