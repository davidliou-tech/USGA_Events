code = File.read('clean_Code.gs')
idx1 = code.index("function appendAuditLog")
idx2 = code.index("function appendAuditLog", idx1 + 10)
# Look what's right before idx2
puts code[idx2-200..idx2]
