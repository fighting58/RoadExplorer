const path = require('path');

let XLSX = null;
try {
    XLSX = require('xlsx');
} catch (e) {
    console.error('xlsx package is not installed. This helper is optional and not required by the web app.');
    process.exit(1);
}

const filePath = path.join(__dirname, 'test.xlsx');
try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log('--- Headers ---');
    console.log(Object.keys(data[0] || {}));
    console.log('--- First Row ---');
    console.log(data[0]);
} catch (err) {
    console.error(err);
}
