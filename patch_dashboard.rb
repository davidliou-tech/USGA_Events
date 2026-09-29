code = File.read('Code.gs')

target_string = <<~'TARGET'
  sumData.push(["Departing by Car", cTravelMatch("Departure", "car"), "", ""]);
  sumData.push(["Does Not Need Drop-off", cCountIfs("Departure", "*need drop*"), "", ""]);
  if (ss.getName().toLowerCase().includes("ministers workshop")) {
      sumData.push(["Needs Ride to NCC", cCountIfs("Departure", "*National Church*"), "", ""]);
  }

  sumData.push(["", "", "", ""]);

  sumData.push(["Lodging Needs", "", "", ""]);
TARGET

replacement_string = <<~'REPLACEMENT'
  sumData.push(["Departing by Car", cTravelMatch("Departure", "car"), "", ""]);
  sumData.push(["Does Not Need Drop-off", cCountIfs("Departure", "*need drop*"), "", ""]);
  if (ss.getName().toLowerCase().includes("ministers workshop")) {
      sumData.push(["Needs Ride to NCC", cCountIfs("Departure", "*National Church*"), "", ""]);
  }

  sumData.push(["", "", "", ""]);
  sumData.push(["Arrivals by Airport", "", "", ""]);
  sumData.push([`=IFERROR(QUERY('Form Responses 1'!A:ZZ, "SELECT Col" & MATCH("Arrival City/Airport*", 'Form Responses 1'!1:1, 0) & ", COUNT(Col" & MATCH("Arrival City/Airport*", 'Form Responses 1'!1:1, 0) & ") WHERE Col" & MATCH("Arrival City/Airport*", 'Form Responses 1'!1:1, 0) & " IS NOT NULL GROUP BY Col" & MATCH("Arrival City/Airport*", 'Form Responses 1'!1:1, 0) & " LABEL COUNT(Col" & MATCH("Arrival City/Airport*", 'Form Responses 1'!1:1, 0) & ") ''", -1), {"No data", ""})`, "", "", ""]);
  
  sumData.push(["", "", "", ""]);
  sumData.push(["Departures by Airport", "", "", ""]);
  sumData.push([`=IFERROR(QUERY('Form Responses 1'!A:ZZ, "SELECT Col" & MATCH("Departure City/Airport*", 'Form Responses 1'!1:1, 0) & ", COUNT(Col" & MATCH("Departure City/Airport*", 'Form Responses 1'!1:1, 0) & ") WHERE Col" & MATCH("Departure City/Airport*", 'Form Responses 1'!1:1, 0) & " IS NOT NULL GROUP BY Col" & MATCH("Departure City/Airport*", 'Form Responses 1'!1:1, 0) & " LABEL COUNT(Col" & MATCH("Departure City/Airport*", 'Form Responses 1'!1:1, 0) & ") ''", -1), {"No data", ""})`, "", "", ""]);

  sumData.push(["", "", "", ""]);

  sumData.push(["Lodging Needs", "", "", ""]);
REPLACEMENT

if code.include?(target_string)
  code.gsub!(target_string, replacement_string)
  File.write('Code.gs', code)
  puts "Patch applied to Code.gs"
else
  puts "Target string not found in Code.gs! Maybe it doesn't have the ministers workshop check?"
end
