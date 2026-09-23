#!/usr/bin/env node
import ExcelJS from 'exceljs';

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('./content/jahrgaenge/Jg6.xlsx');

function printSheet(sheetName, maxCols) {
  const sheet = wb.getWorksheet(sheetName);
  console.log(`\n=== ${sheetName}-Kopfzeile ===`);
  const headerRow = sheet.getRow(1);
  for (let i = 1; i <= maxCols; i++) {
    const cell = headerRow.getCell(i);
    const col = String.fromCharCode(64 + i);
    console.log(`${col}: ${cell.value}`);
  }
}

printSheet('Jahrgang', 5);
printSheet('Slots', 12);
printSheet('Sonderwochen', 4);
printSheet('Bausteine', 8);
printSheet('Stationen', 8);
printSheet('Inputs', 7);
printSheet('Coachings', 5);
printSheet('Termine', 10);
printSheet('Raster', 4);
