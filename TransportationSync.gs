/**
 * @fileoverview TransportationSync.gs - Dual-Sheet Transportation & Multi-Driver Sync Engine
 * 
 * Part of the USGA Event Registration Form Generator V2 suite.
 * Synchronizes attendee transportation records between the restricted Master Event Spreadsheet
 * and an external, public-facing Driver Signup Spreadsheet shared with church volunteers.
 * 
 * Key Architectural Guarantees:
 * 1. ZERO ATTENDEE PII on Public Sheet: Attendee phone numbers and emails are never exposed publicly.
 *    Names are masked (e.g. "David L.", "Grace C.").
 * 2. Deterministic Trip Sub-IDs: Format `[TYPE]-[HUB]-[CARRIER]-[MMDD]-[HHMM]-[SLOT]` prevents row desyncs.
 * 3. Family Protection: Passengers detected as one family (same email, or same last name + phone, same date/hub)
 *    are packed as one unit and never split across vehicles. Families over the car limit ride together in one flagged slot.
 * 4. Arrival Window Clustering: Configurable time window (default 30 min) clusters nearby arrivals at the same hub.
 * 5. Manual Host Church Communications: Zero automated emails sent to volunteers/attendees.
 *    Generates copy-ready, formatted SMS/WhatsApp dispatch messages directly in Master sheet for coordinators.
 * 6. Concurrency Safety: Atomic script lock (LockService) and batch reading/writing prevents race conditions.
 */

// ============================================================================
// CONFIGURATION & SETTINGS HELPERS
// ============================================================================

/**
 * Retrieves transportation configuration from the Master spreadsheet's Settings sheet.
 * Fallbacks to sensible defaults if specific keys are missing.
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} masterSs - The Master response spreadsheet.
 * @returns {Object} Configuration object.
 */
function getTransportationSettings(masterSs) {
  const config = {
    eventName: "USGA Event",
    orgName: "True Jesus Church",
    contactEmail: "us.events@tjc.org",
    publicTransportSheetId: "",
    publicTransportSheetUrl: "",
    maxPassengersPerCar: 4,
    arrivalClusterWindowMinutes: 30,
    departureClusterWindowMinutes: 30,
    coordinatorPhone: "",
    coordinatorName: "Transportation Team"
  };

  if (!masterSs) return config;

  const settingsSheet = masterSs.getSheetByName("Settings");
  if (!settingsSheet) return config;

  const data = settingsSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const key = data[i][0] ? String(data[i][0]).trim() : "";
    const val = data[i][1];
    if (!key) continue;

    if (key === "EventName" && val) config.eventName = String(val).trim();
    if (key === "OrgName" && val) config.orgName = String(val).trim();
    if (key === "ContactEmail" && val) config.contactEmail = String(val).trim();
    if (key === "PublicTransportSheetId" && val) config.publicTransportSheetId = String(val).trim();
    if (key === "PublicTransportSheetUrl" && val) config.publicTransportSheetUrl = String(val).trim();
    if (key === "MaxPassengersPerCar" && !isNaN(Number(val))) config.maxPassengersPerCar = parseInt(val, 10) || 4;
    if (key === "ArrivalClusterWindowMinutes" && !isNaN(Number(val))) config.arrivalClusterWindowMinutes = parseInt(val, 10);
    if (key === "DepartureClusterWindowMinutes" && !isNaN(Number(val))) config.departureClusterWindowMinutes = parseInt(val, 10);
    if ((key === "CoordinatorPhone" || key === "HostChurchContact") && val) config.coordinatorPhone = String(val).trim();
    if (key === "CoordinatorName" && val) config.coordinatorName = String(val).trim();
  }

  // Extract ID from URL if only URL was saved
  if (!config.publicTransportSheetId && config.publicTransportSheetUrl) {
    const match = config.publicTransportSheetUrl.match(/[-\w]{25,}/);
    if (match) config.publicTransportSheetId = match[0];
  }

  return config;
}

/**
 * Persists a key-value setting into the Master spreadsheet's Settings sheet.
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} masterSs
 * @param {string} key
 * @param {string|number} value
 */
function setTransportationSetting(masterSs, key, value) {
  if (!masterSs || !key) return;
  let settingsSheet = masterSs.getSheetByName("Settings");
  if (!settingsSheet) {
    settingsSheet = masterSs.insertSheet("Settings");
    settingsSheet.getRange("A1:B1").setValues([["Setting", "Value"]]).setFontWeight("bold");
  }

  const data = settingsSheet.getDataRange().getValues();
  let foundRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === key.toLowerCase()) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow !== -1) {
    settingsSheet.getRange(foundRow, 2).setValue(value);
  } else {
    settingsSheet.appendRow([key, value]);
  }
}

// ============================================================================
// FORMATTING & NORMALIZATION UTILITIES
// ============================================================================

/**
 * Masks participant name for public display to protect attendee privacy.
 * Example: "David", "Liou" -> "David L."
 * 
 * @param {string} first - First name.
 * @param {string} last - Last name.
 * @returns {string} Masked name.
 */
function maskPassengerName(first, last) {
  const f = first ? String(first).trim() : "";
  const l = last ? String(last).trim() : "";
  if (f && l) {
    return f + " " + l.charAt(0).toUpperCase() + ".";
  } else if (f) {
    return f;
  } else if (l) {
    return l.charAt(0).toUpperCase() + ".";
  }
  return "Participant";
}

/**
 * Normalizes phone numbers for safe display and prevents formula parse errors (#ERROR!).
 * Prefixes strings starting with +, -, or = with a leading apostrophe.
 * 
 * @param {*} val - Phone or text value.
 * @returns {string} Sanitized text string.
 */
function formatTransportPhone(val) {
  if (val === null || val === undefined || val === "") return "";
  const str = String(val).trim();
  if (/^[+=\-]/.test(str)) {
    return "'" + str;
  }
  return str;
}

/**
 * Parses diverse date inputs (Date objects, strings) into structured representations.
 * 
 * @param {*} rawDate
 * @returns {{ dateObj: Date|null, isoDate: string, mmdd: string, displayDate: string }}
 */
function normalizeDate(rawDate) {
  if (!rawDate) {
    return { dateObj: null, isoDate: "", mmdd: "0000", displayDate: "Date TBA" };
  }

  let d = null;
  if (rawDate instanceof Date) {
    d = rawDate;
  } else {
    const parsed = Date.parse(String(rawDate));
    if (!isNaN(parsed)) d = new Date(parsed);
  }

  if (d && !isNaN(d.getTime())) {
    const tz = Session.getScriptTimeZone();
    const mmdd = Utilities.formatDate(d, tz, "MMdd");
    const isoDate = Utilities.formatDate(d, tz, "yyyy-MM-dd");
    const displayDate = Utilities.formatDate(d, tz, "EEE MM/dd");
    return { dateObj: d, isoDate: isoDate, mmdd: mmdd, displayDate: displayDate };
  }

  // Fallback for custom string patterns like "10/25/2026"
  const str = String(rawDate).trim();
  const match = str.match(/(\d{1,2})\/(\d{1,2})/);
  if (match) {
    const m = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    return { dateObj: null, isoDate: `${m}-${day}`, mmdd: `${m}${day}`, displayDate: `${m}/${day}` };
  }

  return { dateObj: null, isoDate: str, mmdd: "0000", displayDate: str };
}

/**
 * Parses time inputs (Date objects, "2:30 PM", "14:30") into minutes from midnight and display strings.
 * 
 * @param {*} rawTime
 * @returns {{ minutes: number, hhmm: string, displayTime: string }}
 */
function normalizeTime(rawTime) {
  if (!rawTime) {
    return { minutes: 9999, hhmm: "0000", displayTime: "Time TBA" };
  }

  if (rawTime instanceof Date) {
    const tz = Session.getScriptTimeZone();
    const minutes = rawTime.getHours() * 60 + rawTime.getMinutes();
    const hhmm = Utilities.formatDate(rawTime, tz, "HHmm");
    const displayTime = Utilities.formatDate(rawTime, tz, "h:mm a");
    return { minutes: minutes, hhmm: hhmm, displayTime: displayTime };
  }

  const str = String(rawTime).trim().toLowerCase();
  let hours = 0;
  let mins = 0;

  const matchAmPm = str.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
  if (matchAmPm) {
    hours = parseInt(matchAmPm[1], 10);
    mins = matchAmPm[2] ? parseInt(matchAmPm[2], 10) : 0;
    const isPm = matchAmPm[3].toLowerCase() === 'pm';
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
  } else {
    const match24 = str.match(/(\d{1,2}):(\d{2})/);
    if (match24) {
      hours = parseInt(match24[1], 10);
      mins = parseInt(match24[2], 10);
    } else {
      return { minutes: 9999, hhmm: "0000", displayTime: String(rawTime).trim() };
    }
  }

  const totalMins = hours * 60 + mins;
  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const displayHours = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayTime = `${displayHours}:${mm} ${ampm}`;

  return { minutes: totalMins, hhmm: `${hh}${mm}`, displayTime: displayTime };
}

/**
 * Generates a deterministic Trip Sub-ID.
 * Format: `[TYPE]-[HUB]-[CARRIER]-[MMDD]-[HHMM]-[SLOT]`
 * Example: `PU-SFO-UA1234-1025-1430-A`
 * 
 * @param {string} type - 'PU' (Pickup) or 'DO' (Drop-Off).
 * @param {string} hub - Standardized airport or station code (e.g. SFO, LAX).
 * @param {string} carrier - Airline & flight number or transit line (e.g. UA1234).
 * @param {string} mmdd - 4-digit date string.
 * @param {string} hhmm - 4-digit time string.
 * @param {string} slotLetter - Single letter slot identifier ('A', 'B', 'C').
 * @returns {string} Deterministic Sub-ID.
 */
function generateTripSubId(type, hub, carrier, mmdd, hhmm, slotLetter) {
  const cleanType = (type || "PU").toUpperCase();
  const cleanHub = (hub || "AIRPORT").replace(/[^A-Za-z0-9]/g, "").substring(0, 5).toUpperCase() || "AIRPORT";
  const cleanCarrier = (carrier || "FLIGHT").replace(/[^A-Za-z0-9]/g, "").substring(0, 8).toUpperCase() || "FLIGHT";
  const cleanMmdd = (mmdd || "0000").replace(/[^0-9]/g, "").padStart(4, "0").substring(0, 4);
  const cleanHhmm = (hhmm || "0000").replace(/[^0-9]/g, "").padStart(4, "0").substring(0, 4);
  const cleanSlot = (slotLetter || "A").toUpperCase();

  return `${cleanType}-${cleanHub}-${cleanCarrier}-${cleanMmdd}-${cleanHhmm}-${cleanSlot}`;
}

// ============================================================================
// CLUSTERING & VEHICLE CHUNKING ENGINE
// ============================================================================

/**
 * Extracts and clusters active transportation participants into vehicle slots.
 * Enforces family/minor co-location and configurable time-window grouping.
 * 
 * @param {Array<Array>} data - Raw 2D sheet data from Pickup or Drop-Off.
 * @param {string} travelType - 'PICKUP' or 'DROPOFF'.
 * @param {number} maxPerCar - Maximum passengers per vehicle (default 4).
 * @param {number} windowMinutes - Threshold in minutes to combine flights (default 30).
 * @returns {Array<Object>} List of clustered vehicle slot runs.
 */
function clusterAndChunkTransportation(data, travelType, maxPerCar, windowMinutes) {
  if (!data || data.length <= 1) return [];

  const headers = data[0].map(h => String(h || "").trim());
  const isPickup = travelType.toUpperCase() === "PICKUP";

  // Map header indices
  const firstIdx = headers.indexOf("First Name");
  const lastIdx = headers.indexOf("Last Name");
  const emailIdx = headers.indexOf("Email");
  const phoneIdx = headers.indexOf("Phone Number");
  const statusIdx = headers.indexOf("Status");

  const dateIdx = headers.indexOf(isPickup ? "Arrival Date" : "Departure Date");
  const timeIdx = headers.indexOf(isPickup ? "Arrival Time" : "Departure Time");
  const hubIdx = headers.indexOf(isPickup ? "Arrival City/Airport" : "Departure City/Airport");
  const airlineIdx = headers.indexOf(isPickup ? "Arrival Airline" : "Departure Airline");
  const flightIdx = headers.indexOf(isPickup ? "Arrival Flight Number" : "Departure Flight Number");
  const stationIdx = headers.indexOf(isPickup ? "Arrival Train/Bus Station" : "Departure Train/Bus Station");
  const carrierIdx = headers.indexOf(isPickup ? "Arrival Carrier" : "Departure Carrier");
  const routeIdx = headers.indexOf(isPickup ? "Arrival Train/Bus Number" : "Departure Train/Bus Number");

  // Step 1: Collect active passengers
  const activePassengers = [];
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const status = statusIdx !== -1 ? String(row[statusIdx] || "").trim() : "Active";
    if (status.toUpperCase() === "CANCELLED") continue;

    const first = firstIdx !== -1 ? String(row[firstIdx] || "").trim() : "";
    const last = lastIdx !== -1 ? String(row[lastIdx] || "").trim() : "";
    const email = emailIdx !== -1 ? String(row[emailIdx] || "").trim().toLowerCase() : "";
    const phone = phoneIdx !== -1 ? String(row[phoneIdx] || "").trim() : "";

    // Determine travel details
    const rawDate = dateIdx !== -1 ? row[dateIdx] : "";
    const rawTime = timeIdx !== -1 ? row[timeIdx] : "";
    const airport = hubIdx !== -1 ? String(row[hubIdx] || "").trim() : "";
    const airline = airlineIdx !== -1 ? String(row[airlineIdx] || "").trim() : "";
    const flight = flightIdx !== -1 ? String(row[flightIdx] || "").trim() : "";
    const station = stationIdx !== -1 ? String(row[stationIdx] || "").trim() : "";
    const carrier = carrierIdx !== -1 ? String(row[carrierIdx] || "").trim() : "";
    const trainNumber = routeIdx !== -1 ? String(row[routeIdx] || "").trim() : "";

    const isFlight = !!(airport || airline || flight);
    const isTrain = !isFlight && !!(station || carrier || trainNumber);
    if (!isFlight && !isTrain) continue; // No transit info

    const hubName = isFlight ? (airport || "Airport") : (station || "Train Station");
    const carrierName = isFlight 
      ? ((airline ? airline + " " : "") + (flight || "")).trim() 
      : ((carrier ? carrier + " " : "") + (trainNumber || "")).trim();

    const normDate = normalizeDate(rawDate);
    const normTime = normalizeTime(rawTime);

    activePassengers.push({
      rowIndex: r + 1, // 1-indexed sheet row
      first: first,
      last: last,
      email: email,
      phone: phone,
      maskedName: maskPassengerName(first, last),
      normDate: normDate,
      normTime: normTime,
      hubName: hubName,
      carrierName: carrierName || "Transit",
      flightOnly: flight || trainNumber || "TBD",
      airlineOnly: airline || carrier || "Transit",
      status: status
    });
  }

  if (activePassengers.length === 0) return [];

  // Step 2: Group into Atomic Family/Guardian clusters (shared email or matching last name + phone)
  const familyClusters = [];
  const visited = new Set();

  for (let i = 0; i < activePassengers.length; i++) {
    if (visited.has(i)) continue;
    const p = activePassengers[i];
    const cluster = [p];
    visited.add(i);

    // Group siblings/family members on the exact same date & hub
    for (let j = i + 1; j < activePassengers.length; j++) {
      if (visited.has(j)) continue;
      const other = activePassengers[j];
      const sameDate = p.normDate.isoDate === other.normDate.isoDate;
      const sameHub = p.hubName.toLowerCase() === other.hubName.toLowerCase();
      const sameEmail = p.email && other.email && p.email === other.email;
      const sameFamily = sameEmail || (p.last && other.last && p.last.toLowerCase() === other.last.toLowerCase() && p.phone === other.phone);

      if (sameDate && sameHub && sameFamily) {
        cluster.push(other);
        visited.add(j);
      }
    }
    familyClusters.push(cluster);
  }

  // Step 3: Cluster family groups by Airport & Time Window
  // Sort clusters chronologically by Date, then Time minutes
  familyClusters.sort((a, b) => {
    const dateComp = (a[0].normDate.isoDate || "").localeCompare(b[0].normDate.isoDate || "");
    if (dateComp !== 0) return dateComp;
    return a[0].normTime.minutes - b[0].normTime.minutes;
  });

  // Each run keeps its family clusters as indivisible units (array of clusters).
  const transitRuns = [];
  const clusterUsed = new Set();

  for (let i = 0; i < familyClusters.length; i++) {
    if (clusterUsed.has(i)) continue;
    const baseCluster = familyClusters[i];
    const baseP = baseCluster[0];
    const runClusters = [baseCluster];
    clusterUsed.add(i);

    // Check subsequent clusters for window matching
    for (let j = i + 1; j < familyClusters.length; j++) {
      if (clusterUsed.has(j)) continue;
      const candidateCluster = familyClusters[j];
      const candP = candidateCluster[0];

      const sameDate = baseP.normDate.isoDate === candP.normDate.isoDate;
      const sameHub = baseP.hubName.toLowerCase() === candP.hubName.toLowerCase();
      
      let withinWindow = false;
      if (windowMinutes > 0) {
        withinWindow = Math.abs(candP.normTime.minutes - baseP.normTime.minutes) <= windowMinutes;
      } else {
        // Strict matching: exact carrier/flight number
        withinWindow = baseP.carrierName.toLowerCase() === candP.carrierName.toLowerCase();
      }

      if (sameDate && sameHub && withinWindow) {
        runClusters.push(candidateCluster);
        clusterUsed.add(j);
      }
    }

    transitRuns.push(runClusters);
  }

  // Step 4: Chunk each Transit Run into vehicle slots (Max capacity: maxPerCar)
  const vehicleSlots = [];

  transitRuns.forEach(runClusters => {
    const runPassengers = [].concat(...runClusters);

    // First-fit-decreasing bin packing on whole family clusters, so a family is never split.
    // Ties are broken by name to keep slot assignment deterministic between syncs.
    const ordered = runClusters.slice().sort((a, b) => {
      if (b.length !== a.length) return b.length - a.length;
      const ka = ((a[0].last || "") + "|" + (a[0].first || "")).toLowerCase();
      const kb = ((b[0].last || "") + "|" + (b[0].first || "")).toLowerCase();
      return ka.localeCompare(kb);
    });

    const slots = [];
    ordered.forEach(cluster => {
      // A family larger than maxPerCar cannot fit a standard car; it still rides together in one slot.
      let target = slots.find(s => s.length + cluster.length <= maxPerCar);
      if (!target) {
        target = [];
        slots.push(target);
      }
      cluster.forEach(p => target.push(p));
    });

    const numSlotsNeeded = Math.max(1, slots.length);

    // Consolidate slot metadata
    const firstP = runPassengers[0];
    const hubCode = firstP.hubName.substring(0, 4).toUpperCase();
    
    // Determine carrier label for run
    const carriers = [...new Set(runPassengers.map(p => p.carrierName))];
    const carrierLabel = carriers.length > 1 ? `Window Run (${carriers.join(" & ")})` : carriers[0];
    const carrierCode = carriers.length > 1 ? "WIN" : firstP.flightOnly;

    slots.forEach((slotPassengers, slotIndex) => {
      if (slotPassengers.length === 0) return;

      const slotLetter = String.fromCharCode(65 + slotIndex); // A, B, C...
      const slotLabel = numSlotsNeeded > 1 
        ? `Car ${slotIndex + 1} of ${numSlotsNeeded} (Slot ${slotLetter})`
        : `Car 1 of 1 (Slot A)`;

      const subId = generateTripSubId(
        isPickup ? "PU" : "DO",
        hubCode,
        carrierCode,
        firstP.normDate.mmdd,
        firstP.normTime.hhmm,
        slotLetter
      );

      const maskedNamesList = slotPassengers.map(p => p.maskedName).join(", ");
      const maskedSummary = `${slotPassengers.length} Pass: ${maskedNamesList}`;
      const luggageCount = slotPassengers.length; // Default estimate 1-2 bags per person
      let luggageSummary = `🧳 ~${luggageCount} Checked Bags`;
      if (slotPassengers.length > maxPerCar) {
        luggageSummary += ` | 🚐 Large group of ${slotPassengers.length} (van needed)`;
      }

      vehicleSlots.push({
        tripSubId: subId,
        slotLabel: slotLabel,
        isPickup: isPickup,
        dateDisplay: firstP.normDate.displayDate,
        timeDisplay: firstP.normTime.displayTime,
        hubName: firstP.hubName,
        carrierLabel: carrierLabel,
        maskedSummary: maskedSummary,
        passengerCount: slotPassengers.length,
        luggageSummary: luggageSummary,
        passengers: slotPassengers
      });
    });
  });

  return vehicleSlots;
}

// ============================================================================
// PUBLIC SPREADSHEET BUILDER & PROTECTIONS
// ============================================================================

/**
 * Initializes and formats the external Public Driver Signup Spreadsheet.
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} publicSs - The Public spreadsheet.
 * @param {Object} config - Event settings object.
 */
function setupPublicTransportWorkbook(publicSs, config) {
  if (!publicSs) throw new Error("Invalid Public Spreadsheet.");

  const eventName = config.eventName || "USGA Event";

  // 1. Setup Instructions tab
  let instrSheet = publicSs.getSheetByName("Instructions");
  if (!instrSheet) {
    instrSheet = publicSs.insertSheet("Instructions", 0);
  }
  instrSheet.clear();
  instrSheet.getRange("A1").setValue(`🚗 ${eventName} - Volunteer Driver Guide`).setFontSize(14).setFontWeight("bold");
  instrSheet.getRange("A3:B10").setValues([
    ["How to Volunteer:", "Review the 'Pickup Signups' and 'Drop-Off Signups' tabs below."],
    ["Claiming a Ride:", "Enter your Full Name, Mobile Phone, Vehicle Model, and any Notes in the white editable columns."],
    ["Passenger Privacy:", "To protect attendee privacy, passenger contact numbers are withheld on this public sheet."],
    ["Coordinator Contact:", "The Host Church Transportation Team will text/call you directly with exact passenger contacts prior to arrival."],
    ["Vehicle Capacity:", "Each slot is budgeted for standard vehicle capacity (up to 4 passengers with trunk luggage)."],
    ["Need to Cancel?:", "If your schedule changes, please contact the Host Church Coordinator immediately so rides can be reassigned."],
    ["Questions?:", `Contact: ${config.coordinatorName} (${config.coordinatorPhone || config.contactEmail})`],
    ["God Bless:", "Thank you for your warm hospitality and dedicated service in Christ!"]
  ]);
  instrSheet.getRange("A3:A10").setFontWeight("bold").setFontColor("#1a73e8");
  instrSheet.setColumnWidth(1, 160);
  instrSheet.setColumnWidth(2, 600);

  // 2. Setup Pickup Signups & Drop-Off Signups tabs
  ["Pickup Signups", "Drop-Off Signups"].forEach((sheetName, idx) => {
    let sheet = publicSs.getSheetByName(sheetName);
    if (!sheet) {
      sheet = publicSs.insertSheet(sheetName, idx + 1);
    }

    // Set frozen headers
    sheet.setFrozenRows(2);

    // Banner row
    sheet.getRange("A1:L1").merge()
      .setValue(`🚗 ${eventName} - ${sheetName.toUpperCase()} (Please enter your name & phone in Columns H & I to claim a run)`)
      .setFontWeight("bold")
      .setBackground("#1a73e8")
      .setFontColor("white")
      .setHorizontalAlignment("center");

    // Header columns
    const headers = [
      "Trip Sub-ID", "Date & Time", "Airport / Station", "Flight / Carrier", "Vehicle Slot",
      "Passengers", "Luggage & Needs", "Driver Full Name", "Driver Phone Number",
      "Vehicle Model / Seats", "Driver Notes", "Status"
    ];

    sheet.getRange(2, 1, 1, headers.length).setValues([headers])
      .setFontWeight("bold")
      .setBackground("#4a86e8")
      .setFontColor("white")
      .setHorizontalAlignment("center");

    // Column widths
    sheet.setColumnWidth(1, 180); // Trip Sub-ID
    sheet.setColumnWidth(2, 120); // Date & Time
    sheet.setColumnWidth(3, 140); // Hub
    sheet.setColumnWidth(4, 140); // Flight
    sheet.setColumnWidth(5, 120); // Slot
    sheet.setColumnWidth(6, 220); // Passengers
    sheet.setColumnWidth(7, 160); // Luggage
    sheet.setColumnWidth(8, 150); // Driver Name (Editable)
    sheet.setColumnWidth(9, 140); // Driver Phone (Editable)
    sheet.setColumnWidth(10, 150); // Vehicle (Editable)
    sheet.setColumnWidth(11, 180); // Driver Notes (Editable)
    sheet.setColumnWidth(12, 110); // Status

    // Formatting: enforce plain text on phone & Sub-ID
    if (sheet.getMaxRows() > 2) {
      sheet.getRange(3, 1, sheet.getMaxRows() - 2, 1).setNumberFormat("@");
      sheet.getRange(3, 9, sheet.getMaxRows() - 2, 1).setNumberFormat("@");
    }

    // Apply protected ranges
    applyPublicSheetProtections(sheet);
  });

  // Remove default "Sheet1" if present
  const defaultSheet = publicSs.getSheetByName("Sheet1");
  if (defaultSheet && publicSs.getSheets().length > 1) {
    try { publicSs.deleteSheet(defaultSheet); } catch (e) {}
  }
}

/**
 * Protects the Public Sheet so volunteers can ONLY edit Columns H through K (Driver inputs).
 * Columns A through G and L are locked against unauthorized modification.
 * 
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The target public sheet.
 */
function applyPublicSheetProtections(sheet) {
  if (!sheet) return;

  try {
    // Remove existing protections created by this script
    const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    for (let p = 0; p < protections.length; p++) {
      if (protections[p].canEdit()) {
        protections[p].remove();
      }
    }

    const protection = sheet.protect().setDescription("Protected Public Flight Schedule");
    // Ensure the current script executor / owner can edit
    protection.setWarningOnly(false);

    // Unprotect Columns H to K (Driver Name, Phone, Vehicle, Notes) from row 3 downwards
    const maxRows = Math.max(sheet.getMaxRows(), 100);
    const driverInputRange = sheet.getRange(3, 8, maxRows - 2, 4); // Cols 8-11: H, I, J, K
    protection.setUnprotectedRanges([driverInputRange]);
  } catch (err) {
    Logger.log("Warning: Could not apply sheet protection: " + err.message);
  }
}

// ============================================================================
// ONE-CLICK DISPATCH SMS GENERATOR
// ============================================================================

/**
 * Constructs a ready-to-copy SMS/WhatsApp dispatch message for the Host Church coordinator.
 * 
 * @param {Object} slot - The vehicle slot object.
 * @param {Array<Object>} passengers - Array of assigned passenger records.
 * @param {string} coordinatorContact - Host church lead contact phone/name.
 * @param {string} eventName - Name of the event.
 * @returns {string} Formatted dispatch text.
 */
function buildDispatchSmsText(slot, passengers, coordinatorContact, eventName) {
  const driverName = slot.driverName || "Volunteer Driver";
  const typeStr = slot.isPickup ? "Arrival Pickup" : "Departure Drop-Off";

  let msg = `Hallelujah ${driverName}!\nHere are the details for your ${eventName} ${typeStr} run:\n\n`;
  msg += `📅 Date: ${slot.dateDisplay}\n`;
  msg += `⏰ Time: ${slot.timeDisplay}\n`;
  msg += `✈️ Location: ${slot.hubName} (${slot.carrierLabel})\n`;
  msg += `🚗 Assignment: ${slot.slotLabel}\n\n`;
  msg += `👥 Passengers & Contacts:\n`;

  passengers.forEach((p, idx) => {
    const pPhone = p.phone || "No mobile listed";
    msg += `${idx + 1}. ${p.first} ${p.last}: ${pPhone}\n`;
  });

  msg += `\nLuggage Estimate: ${slot.luggageSummary}\n`;
  if (coordinatorContact) {
    msg += `Host Church Dispatch Lead: ${coordinatorContact}\n`;
  }
  msg += `\nThank you for your loving service in Christ!`;

  return msg;
}

// ============================================================================
// BIDIRECTIONAL SYNC ENGINE: PUSH & PULL
// ============================================================================

/**
 * PULL SYNC: Reads volunteer driver claims from the Public Sheet and backfills
 * them into the Master Spreadsheet's Pickup and Drop-Off tabs.
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} publicSs
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} masterSs
 * @returns {Object} Report of updated records.
 */
function pullDriversFromPublic(publicSs, masterSs) {
  const report = { pickupUpdated: 0, dropoffUpdated: 0, newClaims: [] };
  if (!publicSs || !masterSs) return report;

  const publicTabs = [
    { publicName: "Pickup Signups", masterName: "Pickup", isPickup: true },
    { publicName: "Drop-Off Signups", masterName: "Drop-Off", isPickup: false }
  ];

  publicTabs.forEach(tab => {
    const pubSheet = publicSs.getSheetByName(tab.publicName);
    const mSheet = masterSs.getSheetByName(tab.masterName);
    if (!pubSheet || !mSheet) return;

    // Read Public claims: Col A (Sub-ID), Col H (Name), Col I (Phone), Col J (Vehicle), Col K (Notes)
    const pubData = pubSheet.getDataRange().getValues();
    if (pubData.length <= 2) return;

    const claimsMap = new Map();
    for (let r = 2; r < pubData.length; r++) {
      const subId = String(pubData[r][0] || "").trim();
      const driverName = String(pubData[r][7] || "").trim();
      const driverPhone = formatTransportPhone(pubData[r][8]);
      const driverVehicle = String(pubData[r][9] || "").trim();
      const driverNotes = String(pubData[r][10] || "").trim();

      if (subId && driverName) {
        claimsMap.set(subId, {
          driverName: driverName,
          driverPhone: driverPhone,
          driverVehicle: driverVehicle,
          driverNotes: driverNotes
        });
      }
    }

    if (claimsMap.size === 0) return;

    // Backfill into Master
    ensureTransportationHeaders(mSheet, tab.isPickup ? "PICKUP" : "DROPOFF");
    const mData = mSheet.getDataRange().getValues();
    if (mData.length <= 1) return;

    const mHeaders = mData[0].map(h => String(h || "").trim());
    const subIdIdx = mHeaders.indexOf("Trip Sub-ID");
    const dNameIdx = mHeaders.indexOf("Driver Full Name");
    const dPhoneIdx = mHeaders.indexOf("Driver Phone Number");
    const dNotesIdx = mHeaders.indexOf("Driver Vehicle / Notes");
    const statusIdx = mHeaders.indexOf("Coordinator Status");

    if (subIdIdx === -1) return;

    for (let r = 1; r < mData.length; r++) {
      const rowSubId = String(mData[r][subIdIdx] || "").trim();
      if (!rowSubId || !claimsMap.has(rowSubId)) continue;

      const claim = claimsMap.get(rowSubId);
      const currentDriver = dNameIdx !== -1 ? String(mData[r][dNameIdx] || "").trim() : "";

      // Update if driver info differs or is new
      if (currentDriver !== claim.driverName) {
        if (dNameIdx !== -1) mSheet.getRange(r + 1, dNameIdx + 1).setValue(claim.driverName);
        if (dPhoneIdx !== -1) mSheet.getRange(r + 1, dPhoneIdx + 1).setValue(claim.driverPhone);
        if (dNotesIdx !== -1) {
          const notesCombined = (claim.driverVehicle ? `[${claim.driverVehicle}] ` : "") + claim.driverNotes;
          mSheet.getRange(r + 1, dNotesIdx + 1).setValue(notesCombined.trim());
        }
        if (statusIdx !== -1) {
          const curStatus = String(mData[r][statusIdx] || "").trim();
          if (!curStatus || curStatus === "Unassigned") {
            mSheet.getRange(r + 1, statusIdx + 1).setValue("Driver Claimed");
          }
        }

        if (tab.isPickup) report.pickupUpdated++;
        else report.dropoffUpdated++;
        report.newClaims.push(`${claim.driverName} -> ${rowSubId}`);
      }
    }
  });

  return report;
}

/**
 * PUSH SYNC: Takes active passenger records from Master, clusters them into vehicle runs,
 * and publishes the sanitized, masked roster to the Public Sheet.
 * Preserves any existing volunteer driver claims by matching Trip Sub-IDs in-memory.
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} masterSs
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} publicSs
 * @param {Object} options
 * @returns {Object} Report of pushed slots.
 */
function pushTransportationToPublic(masterSs, publicSs, options) {
  options = options || {};
  const config = getTransportationSettings(masterSs);
  const report = { pickupSlots: 0, dropoffSlots: 0, preservedClaims: 0 };

  const tabs = [
    { masterName: "Pickup", publicName: "Pickup Signups", travelType: "PICKUP" },
    { masterName: "Drop-Off", publicName: "Drop-Off Signups", travelType: "DROPOFF" }
  ];

  tabs.forEach(tab => {
    const mSheet = masterSs.getSheetByName(tab.masterName);
    let pubSheet = publicSs.getSheetByName(tab.publicName);
    if (!mSheet) return;

    if (!pubSheet) {
      setupPublicTransportWorkbook(publicSs, config);
      pubSheet = publicSs.getSheetByName(tab.publicName);
    }

    // Step A: Read existing driver claims from Public sheet to preserve in-memory
    const existingClaims = new Map();
    const pubData = pubSheet.getDataRange().getValues();
    if (pubData.length > 2) {
      for (let r = 2; r < pubData.length; r++) {
        const subId = String(pubData[r][0] || "").trim();
        const dName = String(pubData[r][7] || "").trim();
        const dPhone = formatTransportPhone(pubData[r][8]);
        const dVehicle = String(pubData[r][9] || "").trim();
        const dNotes = String(pubData[r][10] || "").trim();
        if (subId && dName) {
          existingClaims.set(subId, {
            name: dName,
            phone: dPhone,
            vehicle: dVehicle,
            notes: dNotes
          });
        }
      }
    }

    // Step B: Cluster and Chunk Master passengers
    const mData = mSheet.getDataRange().getValues();
    const windowMins = tab.travelType === "PICKUP" 
      ? config.arrivalClusterWindowMinutes 
      : config.departureClusterWindowMinutes;
    
    const slots = clusterAndChunkTransportation(mData, tab.travelType, config.maxPassengersPerCar, windowMins);

    // Step C: Build monolithic 2D array for Public sheet
    const publicRows = [];
    slots.forEach(slot => {
      // Check if driver previously claimed this Sub-ID
      let dName = "";
      let dPhone = "";
      let dVehicle = "";
      let dNotes = "";
      let statusBadge = "🟢 OPEN";

      if (existingClaims.has(slot.tripSubId)) {
        const claim = existingClaims.get(slot.tripSubId);
        dName = claim.name;
        dPhone = claim.phone;
        dVehicle = claim.vehicle;
        dNotes = claim.notes;
        statusBadge = "🟡 CLAIMED";
        report.preservedClaims++;
        slot.driverName = dName;
      }

      publicRows.push([
        slot.tripSubId,
        `${slot.dateDisplay} ${slot.timeDisplay}`,
        slot.hubName,
        slot.carrierLabel,
        slot.slotLabel,
        slot.maskedSummary,
        slot.luggageSummary,
        dName,
        dPhone,
        dVehicle,
        dNotes,
        statusBadge
      ]);
    });

    // Step D: Write atomic matrix to Public sheet
    if (pubSheet.getLastRow() > 2) {
      pubSheet.getRange(3, 1, Math.max(1, pubSheet.getLastRow() - 2), 12).clearContent();
    }

    if (publicRows.length > 0) {
      pubSheet.getRange(3, 1, publicRows.length, 12).setValues(publicRows);
      // Format phone column as plain text
      pubSheet.getRange(3, 9, publicRows.length, 1).setNumberFormat("@");
      pubSheet.getRange(3, 1, publicRows.length, 1).setNumberFormat("@");

      // Apply row styling based on status
      for (let r = 0; r < publicRows.length; r++) {
        const isClaimed = publicRows[r][11] === "🟡 CLAIMED";
        const rowRange = pubSheet.getRange(r + 3, 1, 1, 12);
        rowRange.setBackground(isClaimed ? "#fce8e6" : "#ffffff"); // Soft tint if claimed
      }
    }

    if (tab.travelType === "PICKUP") report.pickupSlots = slots.length;
    else report.dropoffSlots = slots.length;

    // Step E: Update Master sheet columns 18–22 (Sub-ID, Slot, Dispatch SMS)
    ensureTransportationHeaders(mSheet, tab.travelType);
    const mHeaders = mSheet.getRange(1, 1, 1, mSheet.getLastColumn()).getValues()[0];
    const subIdCol = mHeaders.indexOf("Trip Sub-ID") + 1;
    const slotCol = mHeaders.indexOf("Vehicle Slot") + 1;
    const smsCol = mHeaders.indexOf("One-Click Dispatch SMS Text") + 1;

    slots.forEach(slot => {
      const smsText = buildDispatchSmsText(
        slot,
        slot.passengers,
        config.coordinatorPhone,
        config.eventName
      );

      slot.passengers.forEach(p => {
        if (subIdCol > 0) mSheet.getRange(p.rowIndex, subIdCol).setValue(slot.tripSubId);
        if (slotCol > 0) mSheet.getRange(p.rowIndex, slotCol).setValue(slot.slotLabel);
        if (smsCol > 0) mSheet.getRange(p.rowIndex, smsCol).setValue(smsText);
      });
    });

    // Reapply protected ranges to Public sheet (skip in lightweight mode to avoid remote API latency on form submission)
    if (!options.isLightweight && !options.skipProtections) {
      applyPublicSheetProtections(pubSheet);
    }
  });

  return report;
}

/**
 * Full Bi-Directional Synchronization:
 * 1. Pulls fresh volunteer claims from Public sheet into Master.
 * 2. Pushes updated passenger rosters and clustering from Master out to Public.
 * Wrapped in LockService to prevent concurrent collisions.
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} masterSs
 * @param {Object} [options]
 * @param {boolean} [options.isLightweight=false] - If true, skips sheet protection rebuild and driver roster recalculation.
 * @param {number} [options.lockTimeoutMs=30000] - Lock timeout duration in milliseconds.
 * @param {boolean} [options.failSilentlyOnLock=false] - If true, logs warning and returns without throwing if lock is held.
 * @returns {Object} Comprehensive sync summary.
 */
function syncTransportation(masterSs, options) {
  options = options || {};
  if (!masterSs) throw new Error("No active Master Spreadsheet provided.");

  const timeoutMs = typeof options.lockTimeoutMs === "number" ? options.lockTimeoutMs : 30000;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(timeoutMs)) {
    if (options.failSilentlyOnLock) {
      Logger.log(`syncTransportation: Script lock timed out after ${timeoutMs}ms. Deferring live sync to background trigger.`);
      return { success: false, skipped: true, reason: `Lock acquisition timed out after ${timeoutMs}ms` };
    }
    throw new Error("Another transportation sync is currently in progress. Please wait 30 seconds and retry.");
  }

  try {
    const config = getTransportationSettings(masterSs);
    if (!config.publicTransportSheetId) {
      throw new Error("Public Driver Signup Sheet is not yet configured. Please generate or link one first in Settings.");
    }

    let publicSs;
    try {
      publicSs = SpreadsheetApp.openById(config.publicTransportSheetId);
    } catch (err) {
      throw new Error(`Could not access Public Driver Sheet (ID: ${config.publicTransportSheetId}). Please verify permissions: ${err.message}`);
    }

    // Step 1: Pull drivers from Public -> Master
    const pullReport = pullDriversFromPublic(publicSs, masterSs);

    // Step 2: Push Master -> Public
    const pushReport = pushTransportationToPublic(masterSs, publicSs, options);

    // Step 3: Refresh Master Driver Summary Roster (skip in lightweight mode)
    if (!options.isLightweight && !options.skipRoster) {
      generateDriverSummaryRoster(masterSs);
    }

    return {
      success: true,
      pickupSlots: pushReport.pickupSlots,
      dropoffSlots: pushReport.dropoffSlots,
      preservedClaims: pushReport.preservedClaims,
      pickupUpdated: pullReport.pickupUpdated,
      dropoffUpdated: pullReport.dropoffUpdated,
      message: `Sync Complete: ${pushReport.pickupSlots} pickup runs, ${pushReport.dropoffSlots} drop-off runs updated. ${pullReport.pickupUpdated + pullReport.dropoffUpdated} driver assignments pulled.`
    };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// MASTER SHEET HEADER UPGRADE & DRIVER ROSTER SUMMARY
// ============================================================================

/**
 * Ensures Master Pickup and Drop-Off sheets possess the complete 22 columns
 * without disturbing existing participant data or coordinator notes.
 * 
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} travelType
 */
function ensureTransportationHeaders(sheet, travelType) {
  if (!sheet) return;

  const lastCol = sheet.getLastColumn();
  const currentHeaders = sheet.getRange(1, 1, 1, Math.max(1, lastCol)).getValues()[0].map(h => String(h || "").trim());

  const requiredExtensions = [
    { name: "Trip Sub-ID", format: "@" },
    { name: "Vehicle Slot", format: null },
    { name: "Driver Vehicle / Notes", format: null },
    { name: "Coordinator Status", format: null, dropdown: ["Unassigned", "Driver Claimed", "Confirmed / Contacted", "Reassign Needed", "Completed"] },
    { name: "One-Click Dispatch SMS Text", format: null }
  ];

  requiredExtensions.forEach(ext => {
    if (!currentHeaders.includes(ext.name)) {
      const nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(ext.name)
        .setFontWeight("bold")
        .setBackground("#4a86e8")
        .setFontColor("white");

      if (ext.format && sheet.getMaxRows() > 1) {
        sheet.getRange(2, nextCol, sheet.getMaxRows() - 1, 1).setNumberFormat(ext.format);
      }

      if (ext.dropdown && sheet.getMaxRows() > 1) {
        const rule = SpreadsheetApp.newDataValidation()
          .requireValueInList(ext.dropdown, true)
          .setAllowInvalid(false)
          .build();
        sheet.getRange(2, nextCol, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
      }
    }
  });
}

/**
 * Generates or refreshes the dedicated 'Driver Roster' tab in the Master Spreadsheet.
 * Groups runs by volunteer driver name so coordinators can review total workloads.
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} masterSs
 */
function generateDriverSummaryRoster(masterSs) {
  if (!masterSs) return;

  let rosterSheet = masterSs.getSheetByName("Driver Roster");
  if (!rosterSheet) {
    rosterSheet = masterSs.insertSheet("Driver Roster");
  }
  rosterSheet.clear();

  rosterSheet.getRange("A1").setValue("🚗 Volunteer Driver Assignments Summary")
    .setFontSize(14).setFontWeight("bold");

  const headers = [
    "Driver Full Name", "Driver Phone", "Assigned Runs Count", "Total Passengers", 
    "Vehicles / Notes", "Upcoming Schedule Summary"
  ];
  rosterSheet.getRange(3, 1, 1, headers.length).setValues([headers])
    .setFontWeight("bold")
    .setBackground("#137333")
    .setFontColor("white")
    .setHorizontalAlignment("center");

  // Read drivers across Pickup and Drop-Off
  const driverMap = new Map();

  ["Pickup", "Drop-Off"].forEach(sheetName => {
    const s = masterSs.getSheetByName(sheetName);
    if (!s || s.getLastRow() <= 1) return;

    const sData = s.getDataRange().getValues();
    const sHeaders = sData[0].map(h => String(h || "").trim());

    const dNameIdx = sHeaders.indexOf("Driver Full Name");
    const dPhoneIdx = sHeaders.indexOf("Driver Phone Number");
    const slotIdx = sHeaders.indexOf("Vehicle Slot");
    const subIdIdx = sHeaders.indexOf("Trip Sub-ID");
    const notesIdx = sHeaders.indexOf("Driver Vehicle / Notes");
    const firstIdx = sHeaders.indexOf("First Name");
    const lastIdx = sHeaders.indexOf("Last Name");
    const dateIdx = sHeaders.indexOf(sheetName === "Pickup" ? "Arrival Date" : "Departure Date");
    const timeIdx = sHeaders.indexOf(sheetName === "Pickup" ? "Arrival Time" : "Departure Time");

    for (let r = 1; r < sData.length; r++) {
      const dName = dNameIdx !== -1 ? String(sData[r][dNameIdx] || "").trim() : "";
      if (!dName) continue;

      const dPhone = dPhoneIdx !== -1 ? String(sData[r][dPhoneIdx] || "").trim() : "";
      const subId = subIdIdx !== -1 ? String(sData[r][subIdIdx] || "").trim() : "";
      const slot = slotIdx !== -1 ? String(sData[r][slotIdx] || "").trim() : "";
      const notes = notesIdx !== -1 ? String(sData[r][notesIdx] || "").trim() : "";
      const pName = `${sData[r][firstIdx] || ""} ${sData[r][lastIdx] || ""}`.trim();
      const dateStr = dateIdx !== -1 ? normalizeDate(sData[r][dateIdx]).displayDate : "";
      const timeStr = timeIdx !== -1 ? normalizeTime(sData[r][timeIdx]).displayTime : "";

      if (!driverMap.has(dName)) {
        driverMap.set(dName, {
          phone: dPhone,
          notes: notes,
          subIds: new Set(),
          passengers: [],
          runs: []
        });
      }

      const entry = driverMap.get(dName);
      if (dPhone && !entry.phone) entry.phone = dPhone;
      if (notes && !entry.notes) entry.notes = notes;
      entry.passengers.push(pName);

      if (subId && !entry.subIds.has(subId)) {
        entry.subIds.add(subId);
        entry.runs.push(`${sheetName}: ${dateStr} ${timeStr} (${slot})`);
      }
    }
  });

  if (driverMap.size === 0) {
    rosterSheet.getRange(4, 1).setValue("No drivers have signed up yet. Volunteer claims will appear here once submitted on the public sheet.");
    return;
  }

  const rows = [];
  driverMap.forEach((val, dName) => {
    rows.push([
      dName,
      val.phone,
      val.subIds.size,
      val.passengers.length,
      val.notes,
      val.runs.join(" | ")
    ]);
  });

  rosterSheet.getRange(4, 1, rows.length, headers.length).setValues(rows);
  rosterSheet.getRange(4, 2, rows.length, 1).setNumberFormat("@");
  rosterSheet.setColumnWidth(1, 160);
  rosterSheet.setColumnWidth(2, 140);
  rosterSheet.setColumnWidth(3, 140);
  rosterSheet.setColumnWidth(4, 120);
  rosterSheet.setColumnWidth(5, 180);
  rosterSheet.setColumnWidth(6, 400);
}

// ============================================================================
// AUTOMATED PROVISIONING WIZARD: CREATE PUBLIC SPREADSHEET
// ============================================================================

/**
 * Resolves the event's registration Drive folder for a given Event Response Spreadsheet.
 * Primary: Resolves the parent folder of `masterSs` via DriveApp.
 * Fallback: Looks up the event's "Drive Folder URL" in the Master Generator's "System Log" sheet.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} masterSs - The Event Response Spreadsheet.
 * @param {string} eventTitle - The resolved event title.
 * @returns {GoogleAppsScript.Drive.Folder|null}
 */
function resolveEventRegistrationFolder(masterSs, eventTitle) {
  if (!masterSs) return null;
  const targetSsId = masterSs.getId();

  // 1. Primary: Locate parent folder of the Event Response Spreadsheet directly
  try {
    const masterFile = DriveApp.getFileById(targetSsId);
    const parents = masterFile.getParents();
    if (parents.hasNext()) {
      return parents.next();
    }
  } catch (e) {
    Logger.log("Could not locate parent folder via getParents(): " + e.message);
  }

  // 2. Fallback: Check "System Log" on active or Master Generator spreadsheet for "Drive Folder URL"
  try {
    const activeSs = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = activeSs ? activeSs.getSheetByName("System Log") : null;
    if (logSheet && logSheet.getLastRow() > 1) {
      const data = logSheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h || "").trim());
      const respUrlIdx = headers.indexOf("Response Sheet URL");
      const titleIdx = headers.indexOf("Event Title");
      const folderUrlIdx = headers.indexOf("Drive Folder URL");

      if (folderUrlIdx !== -1) {
        for (let r = data.length - 1; r >= 1; r--) {
          const respUrl = respUrlIdx !== -1 ? String(data[r][respUrlIdx] || "") : "";
          const rowTitle = titleIdx !== -1 ? String(data[r][titleIdx] || "").trim() : "";
          const folderUrl = String(data[r][folderUrlIdx] || "").trim();
          if (!folderUrl) continue;

          if ((respUrl && respUrl.includes(targetSsId)) ||
              (eventTitle && rowTitle && rowTitle.toLowerCase() === eventTitle.toLowerCase())) {
            const folderMatch = folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
            if (folderMatch) {
              return DriveApp.getFolderById(folderMatch[1]);
            }
          }
        }
      }
    }
  } catch (e) {
    Logger.log("Fallback folder lookup in System Log failed: " + e.message);
  }

  return null;
}

/**
 * Creates a brand-new Public Driver Signup Spreadsheet (or reuses & syncs the existing one if
 * a valid, non-trashed Public Sheet already exists for the event), places it in the event's
 * registration Drive folder using Shared-Drive-compatible `File.moveTo()`, stores its ID/URL in
 * Settings, and executes an initial sync.
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} masterSs
 * @returns {Object} Result with public sheet URL and ID.
 */
function createPublicTransportationWorkbook(masterSs) {
  if (!masterSs) throw new Error("No Master Spreadsheet provided.");

  const config = getTransportationSettings(masterSs);
  let eventTitle = config.eventName;
  if (!eventTitle || eventTitle === "USGA Event") {
    const rawSsName = masterSs.getName() || "";
    const derivedTitle = rawSsName.replace(/\s*Responses$/i, "").trim();
    if (derivedTitle) {
      eventTitle = derivedTitle;
      config.eventName = derivedTitle;
      setTransportationSetting(masterSs, "EventName", derivedTitle);
    } else {
      eventTitle = "USGA Event";
    }
  }
  const publicFileName = `${eventTitle} - Volunteer Driver Signups (Public)`;

  // Locate the event's registration Drive folder
  const parentFolder = resolveEventRegistrationFolder(masterSs, eventTitle);
  const resolvedFolderName = parentFolder ? parentFolder.getName() : "My Drive";

  // -------------------------------------------------------------------------
  // DUPLICATE-PREVENTION GUARD: Reuse existing non-trashed Public Sheet if present
  // -------------------------------------------------------------------------
  let existingSs = null;
  let existingFile = null;

  // 1. Check by saved PublicTransportSheetId in Settings
  if (config.publicTransportSheetId) {
    try {
      const f = DriveApp.getFileById(config.publicTransportSheetId);
      if (f && !f.isTrashed()) {
        existingSs = SpreadsheetApp.openById(config.publicTransportSheetId);
        existingFile = f;
      }
    } catch (e) {
      Logger.log("Saved PublicTransportSheetId is no longer accessible or was deleted: " + e.message);
    }
  }

  // 2. Fallback: Check if a non-trashed sheet with the exact publicFileName already exists in parentFolder
  if (!existingSs && parentFolder) {
    try {
      const folderFiles = parentFolder.getFilesByName(publicFileName);
      while (folderFiles.hasNext()) {
        const candidate = folderFiles.next();
        if (!candidate.isTrashed() && candidate.getMimeType() === MimeType.GOOGLE_SHEETS) {
          existingSs = SpreadsheetApp.openById(candidate.getId());
          existingFile = candidate;
          break;
        }
      }
    } catch (e) {
      Logger.log("Could not scan parentFolder for existing Public Sheet: " + e.message);
    }
  }

  if (existingSs && existingFile) {
    const existingId = existingSs.getId();
    const existingUrl = existingSs.getUrl();

    setTransportationSetting(masterSs, "PublicTransportSheetId", existingId);
    setTransportationSetting(masterSs, "PublicTransportSheetUrl", existingUrl);

    try {
      const props = PropertiesService.getScriptProperties();
      const trackedIds = JSON.parse(props.getProperty("PublicTransportEventSheetIds") || "[]");
      const masterId = masterSs.getId();
      if (!trackedIds.includes(masterId)) {
        trackedIds.push(masterId);
        props.setProperty("PublicTransportEventSheetIds", JSON.stringify(trackedIds));
      }
      ensureTransportationSyncTrigger();
    } catch (e) {}

    syncTransportation(masterSs);

    return {
      success: true,
      reusedExisting: true,
      sheetId: existingId,
      sheetUrl: existingUrl,
      folderName: resolvedFolderName,
      message: `An active Public Driver Signup sheet already exists in folder "${resolvedFolderName}" — synced the existing sheet instead of creating a duplicate!\n\nURL: ${existingUrl}`
    };
  }

  // -------------------------------------------------------------------------
  // CREATE NEW PUBLIC SPREADSHEET (No existing active sheet found)
  // -------------------------------------------------------------------------
  const newSs = SpreadsheetApp.create(publicFileName);
  const newId = newSs.getId();
  const newFile = DriveApp.getFileById(newId);

  // Move into the event's registration folder using Shared-Drive-compatible moveTo()
  let folderName = "My Drive";
  if (parentFolder) {
    try {
      newFile.moveTo(parentFolder);
      folderName = parentFolder.getName();
    } catch (moveErr) {
      Logger.log("moveTo() failed (" + moveErr.message + "), attempting legacy addFile fallback.");
      try {
        parentFolder.addFile(newFile);
        DriveApp.getRootFolder().removeFile(newFile);
        folderName = parentFolder.getName();
      } catch (e) {
        Logger.log("Could not move Public Sheet into event folder: " + e.message);
      }
    }
  }

  // Set sharing: Anyone with the link can EDIT (volunteer driver signup)
  newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);

  // Setup tabs & protections
  setupPublicTransportWorkbook(newSs, config);

  // Save ID & URL in Master Settings tab
  setTransportationSetting(masterSs, "PublicTransportSheetId", newId);
  setTransportationSetting(masterSs, "PublicTransportSheetUrl", newSs.getUrl());

  // Register this event response sheet in ScriptProperties so background sync always includes it
  try {
    const props = PropertiesService.getScriptProperties();
    const trackedIds = JSON.parse(props.getProperty("PublicTransportEventSheetIds") || "[]");
    const masterId = masterSs.getId();
    if (!trackedIds.includes(masterId)) {
      trackedIds.push(masterId);
      props.setProperty("PublicTransportEventSheetIds", JSON.stringify(trackedIds));
    }
  } catch (propErr) {
    Logger.log("Could not register event sheet ID in PublicTransportEventSheetIds: " + propErr.message);
  }

  // Automatically ensure the 15-minute background sync trigger is installed
  try {
    ensureTransportationSyncTrigger();
  } catch (trigErr) {
    Logger.log("Could not auto-install transportation sync trigger: " + trigErr.message);
  }

  // Execute initial Push Sync and initialize Driver Roster tab
  pushTransportationToPublic(masterSs, newSs, {});
  generateDriverSummaryRoster(masterSs);

  return {
    success: true,
    reusedExisting: false,
    sheetId: newId,
    sheetUrl: newSs.getUrl(),
    folderName: folderName,
    message: `Public Driver Signup sheet created in folder "${folderName}" (15-min auto-sync active)!\n\nURL: ${newSs.getUrl()}`
  };
}

// ============================================================================
// TRIGGER INSTALLER
// ============================================================================

/**
 * Ensures at least one 15-minute time-based trigger for `backgroundTransportationSync` exists.
 * Does not delete/recreate the trigger if one is already active.
 */
function ensureTransportationSyncTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  const exists = triggers.some(t => t.getHandlerFunction() === "backgroundTransportationSync");
  if (!exists) {
    ScriptApp.newTrigger("backgroundTransportationSync")
      .timeBased()
      .everyMinutes(15)
      .create();
  }
}

/**
 * Installs (or resets) an automated background time-driven trigger to run syncTransportation every 15 minutes.
 */
function installTransportationSyncTrigger(masterSs) {
  // Remove existing transportation triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === "backgroundTransportationSync") {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger("backgroundTransportationSync")
    .timeBased()
    .everyMinutes(15)
    .create();

  // Time-driven triggers have no active spreadsheet, so register the event sheet explicitly.
  if (masterSs) {
    const props = PropertiesService.getScriptProperties();
    const trackedIds = JSON.parse(props.getProperty("PublicTransportEventSheetIds") || "[]");
    if (!trackedIds.includes(masterSs.getId())) {
      trackedIds.push(masterSs.getId());
      props.setProperty("PublicTransportEventSheetIds", JSON.stringify(trackedIds));
    }
  }

  return { success: true, message: "Automated 15-minute background transportation sync trigger installed (covers every event with a public driver sheet)." };
}

/**
 * Background cron execution handler.
 * Syncs the active spreadsheet (if configured), all monitored event spreadsheets in `FormsToMonitor`,
 * and any standalone event spreadsheets registered in `PublicTransportEventSheetIds`.
 */
function backgroundTransportationSync() {
  const syncedSheetIds = new Set();

  // 1. Active Spreadsheet (if any)
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
      const config = getTransportationSettings(ss);
      if (config.publicTransportSheetId) {
        syncTransportation(ss);
        syncedSheetIds.add(ss.getId());
      }
    }
  } catch (err) {
    Logger.log("Background Transportation Sync (Active SS) Error: " + err.message);
  }

  // 2. Monitored Events in FormsToMonitor
  try {
    const props = PropertiesService.getScriptProperties();
    const formsToMonitor = JSON.parse(props.getProperty('FormsToMonitor') || '{}');
    for (const formId in formsToMonitor) {
      const cfg = formsToMonitor[formId];
      if (!cfg || !cfg.sheetUrl) continue;
      try {
        const targetSs = SpreadsheetApp.openByUrl(cfg.sheetUrl);
        if (!targetSs || syncedSheetIds.has(targetSs.getId())) continue;
        const tConfig = getTransportationSettings(targetSs);
        if (tConfig.publicTransportSheetId) {
          syncTransportation(targetSs);
          syncedSheetIds.add(targetSs.getId());
        }
      } catch (innerErr) {
        Logger.log(`Background Transportation Sync skipped for form ${formId}: ${innerErr.message}`);
      }
    }

    // 3. Any additional event sheets registered via PublicTransportEventSheetIds
    const trackedIds = JSON.parse(props.getProperty("PublicTransportEventSheetIds") || "[]");
    for (let i = 0; i < trackedIds.length; i++) {
      const sheetId = trackedIds[i];
      if (!sheetId || syncedSheetIds.has(sheetId)) continue;
      try {
        const targetSs = SpreadsheetApp.openById(sheetId);
        if (!targetSs) continue;
        const tConfig = getTransportationSettings(targetSs);
        if (tConfig.publicTransportSheetId) {
          syncTransportation(targetSs);
          syncedSheetIds.add(sheetId);
        }
      } catch (innerErr) {
        Logger.log(`Background Transportation Sync skipped for sheet ID ${sheetId}: ${innerErr.message}`);
      }
    }
  } catch (err) {
    Logger.log("Background Transportation Sync (Monitored Events) Error: " + err.message);
  }
}

// ============================================================================
// UI MENU HANDLERS
// ============================================================================

/**
 * Resolves the target Event Response Spreadsheet for menu actions.
 * If the user invokes the menu from the Master Form Generator sheet (which has no Pickup/Drop-Off
 * or Form Responses 1 tab), prompts for the target Event Response Spreadsheet URL so the action
 * always operates on the intended event and its registration folder.
 *
 * @param {GoogleAppsScript.Base.Ui} ui
 * @param {string} menuTitle
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet|null}
 */
function resolveTargetEventSpreadsheetForMenu(ui, menuTitle) {
  const activeSs = SpreadsheetApp.getActiveSpreadsheet();
  if (activeSs && (activeSs.getSheetByName("Pickup") || activeSs.getSheetByName("Drop-Off") || activeSs.getSheetByName("Form Responses 1"))) {
    return activeSs;
  }

  const prompt = ui.prompt(
    menuTitle,
    "Enter the Google Sheet URL of the Event Response Spreadsheet:",
    ui.ButtonSet.OK_CANCEL
  );
  if (prompt.getSelectedButton() !== ui.Button.OK) return null;
  const url = prompt.getResponseText().trim();
  if (!url) return null;

  try {
    return SpreadsheetApp.openByUrl(url);
  } catch (err) {
    ui.alert("Error", "Could not open spreadsheet. Please check the URL and permissions: " + err.message, ui.ButtonSet.OK);
    return null;
  }
}

/**
 * UI Menu: Setup / Sync Public Driver Signup Sheet
 * Creates the Public Driver Signup Sheet in the event's registration folder if none exists yet,
 * or reuses and syncs the existing sheet without creating duplicates.
 */
function generatePublicTransportationSheetMenu() {
  const ui = SpreadsheetApp.getUi();
  const targetSs = resolveTargetEventSpreadsheetForMenu(ui, "Setup / Sync Public Driver Signup Sheet");
  if (!targetSs) return;

  try {
    const result = createPublicTransportationWorkbook(targetSs);
    const title = result.reusedExisting ? "Existing Public Sheet Synced!" : "Public Sheet Created & Linked!";
    ui.alert(title, result.message, ui.ButtonSet.OK);
  } catch (err) {
    ui.alert("Error", err.message, ui.ButtonSet.OK);
  }
}

/**
 * Backwards-compatible alias for `generatePublicTransportationSheetMenu`.
 */
function enablePublicTransportationForSheetUrlMenu() {
  generatePublicTransportationSheetMenu();
}

/**
 * UI Menu: Sync Transportation & Drivers Now
 */
function syncPublicTransportationMenu() {
  const ui = SpreadsheetApp.getUi();
  const targetSs = resolveTargetEventSpreadsheetForMenu(ui, "Sync Transportation & Drivers Now");
  if (!targetSs) return;

  try {
    const result = syncTransportation(targetSs);
    ui.alert("Transportation Sync", result.message, ui.ButtonSet.OK);
  } catch (err) {
    ui.alert("Sync Error", err.message, ui.ButtonSet.OK);
  }
}

/**
 * UI Menu: Generate Driver Summary Roster
 */
function generateDriverSummaryRosterMenu() {
  const ui = SpreadsheetApp.getUi();
  const targetSs = resolveTargetEventSpreadsheetForMenu(ui, "Generate Driver Summary Roster");
  if (!targetSs) return;

  try {
    generateDriverSummaryRoster(targetSs);
    ui.alert("Driver Roster Updated", `The 'Driver Roster' tab on "${targetSs.getName()}" has been refreshed with current volunteer assignments.`, ui.ButtonSet.OK);
  } catch (err) {
    ui.alert("Error", err.message, ui.ButtonSet.OK);
  }
}

/**
 * UI Menu: Install Auto-Sync Trigger
 */
function installTransportationTriggerMenu() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    const res = installTransportationSyncTrigger(ss);
    ui.alert("Trigger Installed", res.message, ui.ButtonSet.OK);
  } catch (err) {
    ui.alert("Trigger Error", err.message, ui.ButtonSet.OK);
  }
}

// ============================================================================
// SIDEBAR API ENDPOINTS (For ManageEventsSidebar.html)
// ============================================================================

/**
 * Returns transportation status for a monitored event by formId.
 * 
 * @param {string} formId
 * @returns {Object}
 */
function getTransportationStatusByFormId(formId) {
  if (!formId) throw new Error("No event selected.");

  const props = PropertiesService.getScriptProperties();
  const formsToMonitor = JSON.parse(props.getProperty('FormsToMonitor') || '{}');
  const cfg = formsToMonitor[formId];

  let targetSs = null;
  if (cfg && cfg.sheetUrl) {
    targetSs = SpreadsheetApp.openByUrl(cfg.sheetUrl);
  } else {
    const form = FormApp.openById(formId);
    const destId = form.getDestinationId();
    if (destId) targetSs = SpreadsheetApp.openById(destId);
  }

  if (!targetSs) throw new Error("Could not locate response spreadsheet for this event.");

  const tConfig = getTransportationSettings(targetSs);
  const pSheet = targetSs.getSheetByName("Pickup");
  const dSheet = targetSs.getSheetByName("Drop-Off");

  let pickupCount = 0;
  let dropoffCount = 0;

  if (pSheet && pSheet.getLastRow() > 1) pickupCount = pSheet.getLastRow() - 1;
  if (dSheet && dSheet.getLastRow() > 1) dropoffCount = dSheet.getLastRow() - 1;

  return {
    publicSheetId: tConfig.publicTransportSheetId,
    publicSheetUrl: tConfig.publicTransportSheetUrl,
    pickupCount: pickupCount,
    dropoffCount: dropoffCount,
    configured: !!tConfig.publicTransportSheetId
  };
}

/**
 * Syncs transportation for a monitored event by formId.
 * 
 * @param {string} formId
 * @returns {Object}
 */
function syncTransportationByFormId(formId) {
  if (!formId) throw new Error("No event selected.");

  const props = PropertiesService.getScriptProperties();
  const formsToMonitor = JSON.parse(props.getProperty('FormsToMonitor') || '{}');
  const cfg = formsToMonitor[formId];

  let targetSs = null;
  if (cfg && cfg.sheetUrl) {
    targetSs = SpreadsheetApp.openByUrl(cfg.sheetUrl);
  } else {
    const form = FormApp.openById(formId);
    const destId = form.getDestinationId();
    if (destId) targetSs = SpreadsheetApp.openById(destId);
  }

  if (!targetSs) throw new Error("Could not locate response spreadsheet for this event.");

  return syncTransportation(targetSs);
}

/**
 * Generates the public transportation spreadsheet for a monitored event by formId.
 * 
 * @param {string} formId
 * @returns {Object}
 */
function generatePublicTransportationByFormId(formId) {
  if (!formId) throw new Error("No event selected.");

  const props = PropertiesService.getScriptProperties();
  const formsToMonitor = JSON.parse(props.getProperty('FormsToMonitor') || '{}');
  const cfg = formsToMonitor[formId];

  let targetSs = null;
  if (cfg && cfg.sheetUrl) {
    targetSs = SpreadsheetApp.openByUrl(cfg.sheetUrl);
  } else {
    const form = FormApp.openById(formId);
    const destId = form.getDestinationId();
    if (destId) targetSs = SpreadsheetApp.openById(destId);
  }

  if (!targetSs) throw new Error("Could not locate response spreadsheet for this event.");

  return createPublicTransportationWorkbook(targetSs);
}
