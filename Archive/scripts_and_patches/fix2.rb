code = File.read('Code.gs')

airport_summary_logic = <<~'INNER'
  
  // ----------------------------------------------------
  // Add Airport Summary Sheet
  // ----------------------------------------------------
  if (arrivalDetailsItem || departureSection) {
    const airportSummarySheet = responseSs.insertSheet("Airport Summary");
    airportSummarySheet.getRange("A1").setValue("Event Airport Summary").setFontWeight("bold").setFontSize(14);
    
    airportSummarySheet.getRange("A3").setValue("Arrivals by Airport").setFontWeight("bold").setBackground("#4a86e8").setFontColor("white");
    const arrCol = `MATCH("Arrival City/Airport*", 'Form Responses 1'!1:1, 0)`;
    airportSummarySheet.getRange("A4").setFormula(`=IFERROR(QUERY('Form Responses 1'!A:ZZ, "SELECT Col" & ${arrCol} & ", COUNT(Col" & ${arrCol} & ") WHERE Col" & ${arrCol} & " IS NOT NULL GROUP BY Col" & ${arrCol} & " LABEL COUNT(Col" & ${arrCol} & ") ''", -1), {"No arrivals data", ""})`);
    
    airportSummarySheet.getRange("D3").setValue("Departures by Airport").setFontWeight("bold").setBackground("#4a86e8").setFontColor("white");
    const depCol = `MATCH("Departure City/Airport*", 'Form Responses 1'!1:1, 0)`;
    airportSummarySheet.getRange("D4").setFormula(`=IFERROR(QUERY('Form Responses 1'!A:ZZ, "SELECT Col" & ${depCol} & ", COUNT(Col" & ${depCol} & ") WHERE Col" & ${depCol} & " IS NOT NULL GROUP BY Col" & ${depCol} & " LABEL COUNT(Col" & ${depCol} & ") ''", -1), {"No departures data", ""})`);
    
    airportSummarySheet.setColumnWidth(1, 300);
    airportSummarySheet.setColumnWidth(2, 100);
    airportSummarySheet.setColumnWidth(3, 50);
    airportSummarySheet.setColumnWidth(4, 300);
    airportSummarySheet.setColumnWidth(5, 100);
  }
INNER

target = "  // Clean up the initial default blank sheet (e.g. \"Sheet1\")"
if code.include?(target)
  code.sub!(target) { airport_summary_logic + "\n" + target }
  File.write('Code.gs', code)
  puts "Patch 2 applied"
else
  puts "Target not found!"
end
