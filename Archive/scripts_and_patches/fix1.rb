code = File.read('Code.gs')

airport_logic = <<~'INNER'
  if (field.name === 'Arrival City/Airport' || field.name === 'Departure City/Airport') {
    const airportFullNames = {
      'ATL': 'Hartsfield-Jackson Atlanta International Airport (ATL)',
      'AUS': 'Austin-Bergstrom International Airport (AUS)',
      'BOS': 'Boston Logan International Airport (BOS)',
      'BUR': 'Hollywood Burbank Airport (BUR)',
      'BWI': 'Baltimore/Washington International Airport (BWI)',
      'DAL': 'Dallas Love Field (DAL)',
      'DCA': 'Ronald Reagan Washington National Airport (DCA)',
      'DEN': 'Denver International Airport (DEN)',
      'DFW': 'Dallas/Fort Worth International Airport (DFW)',
      'EWR': 'Newark Liberty International Airport (EWR)',
      'FLL': 'Fort Lauderdale-Hollywood International Airport (FLL)',
      'HNL': 'Daniel K. Inouye International Airport (HNL)',
      'HOU': 'William P. Hobby Airport (HOU)',
      'IAD': 'Washington Dulles International Airport (IAD)',
      'IAH': 'George Bush Intercontinental Airport (IAH)',
      'JFK': 'John F. Kennedy International Airport (JFK)',
      'LAS': 'Harry Reid International Airport (LAS)',
      'LAX': 'Los Angeles International Airport (LAX)',
      'LGB': 'Long Beach Airport (LGB)',
      'LGA': 'LaGuardia Airport (LGA)',
      'MCO': 'Orlando International Airport (MCO)',
      'MDW': 'Chicago Midway International Airport (MDW)',
      'MIA': 'Miami International Airport (MIA)',
      'OAK': 'Oakland International Airport (OAK)',
      'ONT': 'Ontario International Airport (ONT)',
      'ORD': "Chicago O'Hare International Airport (ORD)",
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
INNER

target = "  if (typeStr.includes('short answer') || typeStr.includes('text') || typeStr.includes('number')) {"
if code.include?(target)
  code.sub!(target) { airport_logic + "\n" + target }
  File.write('Code.gs', code)
  puts "Patch 1 applied"
else
  puts "Target not found!"
end
