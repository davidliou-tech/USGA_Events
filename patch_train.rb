code = File.read('Code.gs')

# 1. Update addFieldToForm initial choices
target1 = "       item.setChoiceValues([t('I am arriving by car'), t('I am arriving by flight'), t('I do not need pickup')]);"
replacement1 = "       item.setChoiceValues([t('I am arriving by car'), t('I am arriving by flight'), t('I am arriving by train/bus'), t('I do not need pickup')]);"
code.sub!(target1, replacement1) if code.include?(target1)

# 2. Update generateForm section variables
target2 = "  let postTravelSection = null;"
replacement2 = "  let postTravelSection = null;\n  let arrivalTrainSection = null;\n  let departureTrainSection = null;"
code.sub!(target2, replacement2) if code.include?(target2)

# 3. Update category loop
target3 = "    if (category === 'Departure Flight Details') departureFlightSection = pb;"
replacement3 = "    if (category === 'Departure Flight Details') departureFlightSection = pb;\n    if (category === 'Arrival Train/Bus Details') arrivalTrainSection = pb;\n    if (category === 'Departure Train/Bus Details') departureTrainSection = pb;"
code.sub!(target3, replacement3) if code.include?(target3)

# 4. Update Navigation logic - Arrival
target4 = <<~'T4'
    if (arrivalFlightSection) {
      choices.push(arrivalDetailsItem.createChoice(t('I am arriving by flight'), arrivalFlightSection));
    } else {
      choices.push(arrivalDetailsItem.createChoice(t('I am arriving by flight'), defaultNext));
    }
    choices.push(arrivalDetailsItem.createChoice(t('I do not need pickup'), defaultNext));
T4
replacement4 = <<~'R4'
    if (arrivalFlightSection) {
      choices.push(arrivalDetailsItem.createChoice(t('I am arriving by flight'), arrivalFlightSection));
    } else {
      choices.push(arrivalDetailsItem.createChoice(t('I am arriving by flight'), defaultNext));
    }
    if (arrivalTrainSection) {
      choices.push(arrivalDetailsItem.createChoice(t('I am arriving by train/bus'), arrivalTrainSection));
    } else {
      choices.push(arrivalDetailsItem.createChoice(t('I am arriving by train/bus'), defaultNext));
    }
    choices.push(arrivalDetailsItem.createChoice(t('I do not need pickup'), defaultNext));
R4
code.sub!(target4, replacement4) if code.include?(target4)

# 5. Update Navigation logic - Departure
target5 = <<~'T5'
    if (departureFlightSection) {
      choices.push(departureDetailsItem.createChoice(t('I am departing by flight'), departureFlightSection));
    } else {
      choices.push(departureDetailsItem.createChoice(t('I am departing by flight'), target));
    }
    choices.push(departureDetailsItem.createChoice(t('I do not need dropoff'), target));
T5
replacement5 = <<~'R5'
    if (departureFlightSection) {
      choices.push(departureDetailsItem.createChoice(t('I am departing by flight'), departureFlightSection));
    } else {
      choices.push(departureDetailsItem.createChoice(t('I am departing by flight'), target));
    }
    if (departureTrainSection) {
      choices.push(departureDetailsItem.createChoice(t('I am departing by train/bus'), departureTrainSection));
    } else {
      choices.push(departureDetailsItem.createChoice(t('I am departing by train/bus'), target));
    }
    choices.push(departureDetailsItem.createChoice(t('I do not need dropoff'), target));
R5
code.sub!(target5, replacement5) if code.include?(target5)

# 6. Update setupFieldDictionary
target6 = "    ['Departure Flight Details', 'The individuals will be departing on the same flight', 'Paragraph', false],"
replacement6 = <<~'R6'
    ['Departure Flight Details', 'The individuals will be departing on the same flight', 'Paragraph', false],
    ['Arrival Train/Bus Details', 'Arrival Train/Bus Station', 'Short Answer Text', true],
    ['Arrival Train/Bus Details', 'Arrival Carrier', 'Short Answer Text', true],
    ['Arrival Train/Bus Details', 'Arrival Train/Bus Number', 'Short Answer Text', true],
    ['Departure Train/Bus Details', 'Departure Train/Bus Station', 'Short Answer Text', true],
    ['Departure Train/Bus Details', 'Departure Carrier', 'Short Answer Text', true],
    ['Departure Train/Bus Details', 'Departure Train/Bus Number', 'Short Answer Text', true],
R6
code.sub!(target6, replacement6.chomp) if code.include?(target6)

# 7. Update setupTemplates (add fields to templates that have Arrival Flight Number)
# We can just do a regex replace to append these fields
# e.g., 'Arrival Flight Number', 'Departure Details' -> 'Arrival Flight Number', 'Arrival Train/Bus Station', 'Arrival Carrier', 'Arrival Train/Bus Number', 'Departure Details'
target7_arr = "'Arrival Flight Number', 'Departure Details'"
replacement7_arr = "'Arrival Flight Number', 'Arrival Train/Bus Station', 'Arrival Carrier', 'Arrival Train/Bus Number', 'Departure Details'"
code.gsub!(target7_arr, replacement7_arr) if code.include?(target7_arr)

target7_dep = "'Departure Flight Number', 'I need lodging before the event'"
replacement7_dep = "'Departure Flight Number', 'Departure Train/Bus Station', 'Departure Carrier', 'Departure Train/Bus Number', 'I need lodging before the event'"
code.gsub!(target7_dep, replacement7_dep) if code.include?(target7_dep)

# Also need to handle NATS/YASC/CYSC which might have slightly different next fields
# Let's just use generic regex:
# /(Arrival Flight Number', )/ -> "\1'Arrival Train/Bus Station', 'Arrival Carrier', 'Arrival Train/Bus Number', "
code.gsub!(/('Arrival Flight Number', )/, "\\1'Arrival Train/Bus Station', 'Arrival Carrier', 'Arrival Train/Bus Number', ") unless code.include?(replacement7_arr)
code.gsub!(/('Departure Flight Number', )/, "\\1'Departure Train/Bus Station', 'Departure Carrier', 'Departure Train/Bus Number', ") unless code.include?(replacement7_dep)


# 8. Update Pickup Sheet columns
target8 = "    \"Departing City/Airport\", \"Arrival City/Airport\", \"Arrival Airline\", \"Arrival Flight Number\", "
replacement8 = "    \"Departing City/Airport\", \"Arrival City/Airport\", \"Arrival Airline\", \"Arrival Flight Number\", \"Arrival Train/Bus Station\", \"Arrival Carrier\", \"Arrival Train/Bus Number\", "
code.sub!(target8, replacement8) if code.include?(target8)

# 9. Update Drop-off Sheet columns
target9 = "    \"Departure City/Airport\", \"Departure Airline\", \"Departure Flight Number\", \"Destination City/Airport\", "
replacement9 = "    \"Departure City/Airport\", \"Departure Airline\", \"Departure Flight Number\", \"Destination City/Airport\", \"Departure Train/Bus Station\", \"Departure Carrier\", \"Departure Train/Bus Number\", "
code.sub!(target9, replacement9) if code.include?(target9)

File.write('Code.gs', code)
puts "Patch applied"
