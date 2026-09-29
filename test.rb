code = File.read('Code.gs')
idx = code.index("Summary Dashboard")
if idx
  puts code[idx..idx+1000]
else
  puts "Not found!"
end
