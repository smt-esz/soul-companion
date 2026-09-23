#!/usr/bin/env node
import ExcelJS from 'exceljs';

async function validate(filename, expectedSlots) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filename);
  
  const jahrgang = workbook.getWorksheet('Jahrgang');
  const slots = workbook.getWorksheet('Slots');
  const bausteine = workbook.getWorksheet('Bausteine');
  const sonderwochen = workbook.getWorksheet('Sonderwochen');
  
  console.log(`\n=== ${filename} ===`);
  
  // Jahrgang-Daten
  const jgst = jahrgang.getCell('A2').value;
  const ton = jahrgang.getCell('B2').value;
  const klassen = jahrgang.getCell('C2').value;
  console.log(`Jahrgang: ${jgst}, Ton: ${ton}, Klassen: ${klassen}`);
  
  // Slot-Zählung
  let slotCount = 0;
  let slotRow = 2;
  while (slots.getCell(`A${slotRow}`).value) {
    slotCount++;
    slotRow++;
  }
  console.log(`Slots: ${slotCount} (erwartet: ${expectedSlots})`);
  
  // Baustein-Zählung
  let bausteinCount = 0;
  let bausteinRow = 2;
  while (bausteine.getCell(`A${bausteinRow}`).value) {
    bausteinCount++;
    bausteinRow++;
  }
  console.log(`Bausteine: ${bausteinCount}`);
  
  // Sonderwochen-Zählung
  let sonderRow = 2;
  let sonderCount = 0;
  while (sonderwochen.getCell(`A${sonderRow}`).value) {
    sonderCount++;
    sonderRow++;
  }
  console.log(`Sonderwochen: ${sonderCount}`);
  
  // Erste und letzte Slots prüfen
  const firstSlot = slots.getCell('A2').value;
  const lastSlot = slots.getCell(`A${slotRow - 1}`).value;
  console.log(`Erste Slot: ${firstSlot}, Letzte Slot: ${lastSlot}`);
}

await validate('./content/jahrgaenge/Jg6.xlsx', 25);
await validate('./content/jahrgaenge/Jg7.xlsx', 21);
