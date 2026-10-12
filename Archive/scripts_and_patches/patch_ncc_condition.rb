code = File.read('Code.gs')

old_condition = 'if (ss.getName().toLowerCase().includes("ncc") || ss.getName().toLowerCase().includes("ministers workshop") || ss.getName().toLowerCase().includes("nats") || ss.getName().toLowerCase().includes("national church conference")) {'
new_condition = 'if (ss.getName().toLowerCase().includes("ministers workshop")) {'

code = code.gsub(old_condition, new_condition)

File.write('Code.gs', code)
puts "Success!"
