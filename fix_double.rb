code = File.read('Code.gs')
idx1 = code.index("function appendAuditLog")
idx2 = code.index("function appendAuditLog", idx1 + 10)
puts "Idx1: #{idx1}, Idx2: #{idx2}"
