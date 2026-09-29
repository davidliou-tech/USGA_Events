const fs = require('fs');
let html = fs.readFileSync('Sidebar.html', 'utf8');

// Replace datetime-local with date + time inputs
html = html.replace(
  '<input type="datetime-local" id="f_regStartDate" style="width: 100%; padding: 5px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;">',
  '<div style="display: flex; gap: 5px;"><input type="date" id="f_regStartDate" style="flex: 1; padding: 5px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"><input type="time" id="f_regStartTime" style="flex: 1; padding: 5px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;" title="Optional. Defaults to 12:00 AM"></div>'
);

html = html.replace(
  '<input type="datetime-local" id="f_regEndDate" style="width: 100%; padding: 5px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;">',
  '<div style="display: flex; gap: 5px;"><input type="date" id="f_regEndDate" style="flex: 1; padding: 5px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"><input type="time" id="f_regEndTime" style="flex: 1; padding: 5px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;" title="Optional. Defaults to 11:59 PM"></div>'
);

// Update payload construction
const oldPayloadStart = "regStartDate: document.getElementById('f_regStartDate') ? document.getElementById('f_regStartDate').value : '',";
const newPayloadStart = `regStartDate: (function(){
            let d = document.getElementById('f_regStartDate') ? document.getElementById('f_regStartDate').value : '';
            let t = document.getElementById('f_regStartTime') ? document.getElementById('f_regStartTime').value : '';
            if (d && !t) t = '00:00';
            return d ? (d + 'T' + t) : '';
          })(),`;

const oldPayloadEnd = "regEndDate: document.getElementById('f_regEndDate') ? document.getElementById('f_regEndDate').value : '',";
const newPayloadEnd = `regEndDate: (function(){
            let d = document.getElementById('f_regEndDate') ? document.getElementById('f_regEndDate').value : '';
            let t = document.getElementById('f_regEndTime') ? document.getElementById('f_regEndTime').value : '';
            if (d && !t) t = '23:59';
            return d ? (d + 'T' + t) : '';
          })(),`;

html = html.replace(oldPayloadStart, newPayloadStart);
html = html.replace(oldPayloadEnd, newPayloadEnd);

fs.writeFileSync('Sidebar.html', html);
console.log('Sidebar.html patched successfully.');
