code = File.read('Code.gs')
idx1 = code.index("function appendAuditLog")
idx2 = code.index("function appendAuditLog", idx1 + 10)
if idx2
  puts "Found duplicate appendAuditLog at #{idx2}."
  # let's see what's before it
  puts code[idx2-500..idx2]
end
