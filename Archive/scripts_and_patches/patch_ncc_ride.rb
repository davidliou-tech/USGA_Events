code = File.read('Code.gs')

insert_str = <<-BLOCK
  if (ss.getName().toLowerCase().includes("ncc") || ss.getName().toLowerCase().includes("ministers workshop") || ss.getName().toLowerCase().includes("nats") || ss.getName().toLowerCase().includes("national church conference")) {
      sumData.push(["Needs Ride to NCC", cCountIfs("Departure", "*National Church*"), "", ""]);
  }
BLOCK

code = code.gsub('sumData.push(["Does Not Need Drop-off", cCountIfs("Departure", "*need drop*"), "", ""]);',
                 "sumData.push([\"Does Not Need Drop-off\", cCountIfs(\"Departure\", \"*need drop*\"), \"\", \"\"]);\n" + insert_str)

File.write('Code.gs', code)
puts "Success!"
