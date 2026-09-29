code = File.read('Code.gs')

search_str = 'sumData.push(["Arriving by Car", cTravelMatch("Arrival", "car"), ""]);'
replace_str = search_str + "\n  sumData.push([\"Does Not Need Pickup\", cCountIfs(\"Arrival\", \"*need pickup*\"), \"\"]);"
code = code.gsub(search_str, replace_str)

search_str2 = 'sumData.push(["Departing by Car", cTravelMatch("Departure", "car"), ""]);'
replace_str2 = search_str2 + "\n  sumData.push([\"Does Not Need Drop-off\", cCountIfs(\"Departure\", \"*need drop*\"), \"\"]);"
code = code.gsub(search_str2, replace_str2)

File.write('Code.gs', code)
puts 'Success!'
