code = File.read('Code.gs')

# Find the mangled ORD
idx_ord = code.index("'ORD': \"Chicago O\n    item = form.addTextItem()")
if !idx_ord
  idx_ord = code.index("'ORD': 'Chicago O\n    item = form.addTextItem()")
end

if idx_ord
  puts "Found mangled ORD at #{idx_ord}"
  
  # Find the target string that should have come AFTER my injected logic
  target = "  if (typeStr.includes('short answer') || typeStr.includes('text') || typeStr.includes('number')) {"
  idx_target = code.index(target, idx_ord + 10)
  
  if idx_target
    puts "Found target at #{idx_target}"
    # Delete everything from idx_ord up to idx_target!
    # Wait, the injected logic was:
    # 'ORD': 'Chicago O'Hare International Airport (ORD)',
    # 'PDX': 'Portland International Airport (PDX)',
    # ...
    # return item;
    # }
    
    # Actually, the injected logic after ORD was:
    correct_tail = <<~'TAIL'
      'PDX': 'Portland International Airport (PDX)',
      'PHL': 'Philadelphia International Airport (PHL)',
      'PHX': 'Phoenix Sky Harbor International Airport (PHX)',
      'RDU': 'Raleigh-Durham International Airport (RDU)',
      'SAN': 'San Diego International Airport (SAN)',
      'SEA': 'Seattle-Tacoma International Airport (SEA)',
      'SFB': 'Orlando Sanford International Airport (SFB)',
      'SFO': 'San Francisco International Airport (SFO)',
      'SJC': 'Norman Y. Mineta San Jose International Airport (SJC)',
      'SMF': 'Sacramento International Airport (SMF)',
      'SNA': 'John Wayne Airport (SNA)',
      'TPA': 'Tampa International Airport (TPA)',
      'TTN': 'Trenton-Mercer Airport (TTN)'
    };

    let mappedCodes = [];
    const host = (payload.eventDetails && payload.eventDetails.host) ? payload.eventDetails.host : "";
    
    try {
      const airportSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Airport Mapping');
      if (airportSheet) {
        const data = airportSheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] && host.toLowerCase().includes(String(data[i][0]).toLowerCase())) {
            for (let j = 1; j <= 5; j++) {
               if (data[i][j]) mappedCodes.push(String(data[i][j]).trim());
            }
            break;
          }
        }
      }
    } catch(e) {}

    let mappedFullNames = mappedCodes.map(code => airportFullNames[code] || code);
    const preferredArr = airports ? airports.split(',').map(s => s.trim()).filter(s => s !== '') : [];
    
    let finalChoices = [];

    preferredArr.forEach(pref => {
       finalChoices.push(`⭐ ${pref}`);
    });

    mappedFullNames.forEach(mapped => {
       const isPref = preferredArr.some(p => p.toLowerCase() === mapped.toLowerCase());
       if (!isPref) {
          finalChoices.push(mapped);
       }
    });

    if (finalChoices.length > 0) {
        item = form.addMultipleChoiceItem().setTitle(t(field.name));
        item.setChoiceValues(finalChoices.map(c => t(c)));
        item.showOtherOption(true);
    } else {
        item = form.addTextItem().setTitle(t(field.name));
    }
    
    if (field.required) item.setRequired(true);
    
    if (field.name === 'Arrival City/Airport') {
       item.setHelpText(t('Please select or enter the airport for your arrival flight.'));
    } else {
       item.setHelpText(t('Please select or enter the airport for your departure flight.'));
    }
    return item;
  }
TAIL

    new_code = code[0...idx_ord] + "'ORD': \"Chicago O'Hare International Airport (ORD)\",\n" + correct_tail + "\n" + code[idx_target..-1]
    File.write('Code.gs', new_code)
    puts "Fixed mangling!"
  else
    puts "Target not found after ORD!"
  end
else
  puts "Mangled ORD not found!"
end
