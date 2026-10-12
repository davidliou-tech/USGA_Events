code = File.read('Code.gs')
idx1 = code.index("function appendAuditLog")
idx2 = code.index("function appendAuditLog", idx1 + 10)
if idx2
  idx_f = code.rindex("} \n\nf", idx2)
  if idx_f
    puts "Found } \\n\\nf at #{idx_f}. Truncating."
  else
    puts "Not found..."
  end
end
