code = File.read('Code.gs')
idx1 = code.index("function appendAuditLog")
idx2 = code.index("function appendAuditLog", idx1 + 10)
if idx2
  str = "\n}\n\nf"
  idx_f = code.rindex(str, idx2)
  if idx_f
    puts "Truncating at #{idx_f}"
    File.write('Code.gs', code[0..idx_f+2])
  else
    # fallback
    File.write('Code.gs', code[0..idx2-2])
  end
end
