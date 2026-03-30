const XLSX = require('xlsx');
const path = require('path');

const filePath = 'c:\\Users\\Kim\\Documents\\AntiGravity\\RoadSeaker\\test.xlsx';
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
