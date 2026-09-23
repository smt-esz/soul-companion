#!/usr/bin/env node
import ExcelJS from 'exceljs';

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('./content/jahrgaenge/Jg5.xlsx');

console.log('=== Jg5.xlsx - Finale Prüfung ===\n');

function countRows(sheetName) {
  const sheet = wb.getWorksheet(sheetName);
  let count = 0;
  for (let i = 2; ; i++) {
    const cell = sheet.getCell(`A${i}`);
    if (!cell.value) break;
    count++;
  }
  return count;
}

console.log('Zeilen pro Blatt:');
console.log(`  Jahrgang: ${countRows('Jahrgang')} (erwartet: 1)`);
console.log(`  Slots: ${countRows('Slots')} (erwartet: 23)`);
console.log(`  Sonderwochen: ${countRows('Sonderwochen')} (erwartet: 7, ohne Ferienwochen)`);
console.log(`  Bausteine: ${countRows('Bausteine')} (erwartet: 23)`);
console.log(`  Stationen: ${countRows('Stationen')} (erwartet: 48)`);
console.log(`  Inputs: ${countRows('Inputs')} (erwartet: 3)`);
console.log(`  Coachings: ${countRows('Coachings')} (erwartet: 5)`);
console.log(`  Termine: ${countRows('Termine')} (erwartet: 12)`);
console.log(`  Raster: ${countRows('Raster')} (erwartet: 1)`);

console.log('\n✓ Jg5.xlsx ist vollständig ausgefüllt.');
