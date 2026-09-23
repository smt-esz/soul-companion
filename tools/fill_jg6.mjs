#!/usr/bin/env node
import ExcelJS from 'exceljs';
import fs from 'fs';

const filePath = './content/jahrgaenge/Jg6.xlsx';
const slotsPath = 'C:/Users/leonart.schmitt/OneDrive - Evangelisches Schulzentrum Bad Düben/02 - Schulentwicklung/14 - Planung der Schulentwicklung/Planer Schulentwicklung/SOUL/Planung/anhang/slots_2026-27.json';

// Lade Slots aus JSON
const slotsData = JSON.parse(fs.readFileSync(slotsPath, 'utf8'));
const jg6Slots = slotsData['6'].slots;
const jg6Sonder = slotsData['6'].sonder;

// Lade die Excel-Datei
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(filePath);

// 1. Blatt "Jahrgang"
const jahrgangSheet = workbook.getWorksheet('Jahrgang');
jahrgangSheet.getCell('A2').value = 6;
jahrgangSheet.getCell('B2').value = 'klar';
jahrgangSheet.getCell('C2').value = 'A,B,C';
jahrgangSheet.getCell('D2').value = null; // fruehesterAufstieg leer

// 2. Blatt "Slots"
const slotsSheet = workbook.getWorksheet('Slots');
let slotRow = 2;
for (const slot of jg6Slots) {
  slotsSheet.getCell(`A${slotRow}`).value = slot.id;
  slotsSheet.getCell(`B${slotRow}`).value = slot.fach;
  slotsSheet.getCell(`C${slotRow}`).value = slot.nr;
  slotsSheet.getCell(`D${slotRow}`).value = slot.spur;
  slotsSheet.getCell(`E${slotRow}`).value = slot.spuren ? slot.spuren.join(',') : '';  // spuren
  slotsSheet.getCell(`F${slotRow}`).value = slot.stunden;
  slotsSheet.getCell(`G${slotRow}`).value = new Date(slot.von + 'T00:00:00Z');
  slotsSheet.getCell(`G${slotRow}`).numFmt = 'yyyy-mm-dd';
  slotsSheet.getCell(`H${slotRow}`).value = new Date(slot.bis + 'T00:00:00Z');
  slotsSheet.getCell(`H${slotRow}`).numFmt = 'yyyy-mm-dd';
  slotsSheet.getCell(`I${slotRow}`).value = ''; // abgabe leer = bis
  slotsSheet.getCell(`J${slotRow}`).value = slot.id; // baustein = id
  slotsSheet.getCell(`K${slotRow}`).value = slot.status;
  slotsSheet.getCell(`L${slotRow}`).value = slot.hinweis;
  slotRow++;
}

// 3. Blatt "Sonderwochen" (ohne Ferienwochen)
const sonderwochenSheet = workbook.getWorksheet('Sonderwochen');
const ferienwochen = ['Herbstferien', 'Weihnachtsferien', 'Winterferien', 'Ferien'];
let sonderRow = 2;
for (const sonder of jg6Sonder) {
  if (!ferienwochen.includes(sonder.titel)) {
    const von = sonder.von;
    const bis = sonder.bis;
    const art = {
      'Kennenlernwoche': 'kennenlernen',
      'SOUL-Einführungswoche + SOUL-Basics 1': 'einfuehrung',
      'Themen- und Fahrtenwoche': 'themenwoche',
      'SOUL-Basics Woche': 'soul-basics',
      'Pufferwoche + SOUL Basics + Weihnachtsmarkt': 'puffer',
      'Besinn-Dich-Tage': 'besinntage',
      'letzte Schulwoche': 'letzte-woche'
    }[sonder.titel] || 'sonstiges';

    sonderwochenSheet.getCell(`A${sonderRow}`).value = new Date(von + 'T00:00:00Z');
    sonderwochenSheet.getCell(`A${sonderRow}`).numFmt = 'yyyy-mm-dd';
    sonderwochenSheet.getCell(`B${sonderRow}`).value = new Date(bis + 'T00:00:00Z');
    sonderwochenSheet.getCell(`B${sonderRow}`).numFmt = 'yyyy-mm-dd';
    sonderwochenSheet.getCell(`C${sonderRow}`).value = sonder.titel;
    sonderwochenSheet.getCell(`D${sonderRow}`).value = art;
    sonderRow++;
  }
}

// 4. Blatt "Bausteine"
const bausteineSheet = workbook.getWorksheet('Bausteine');
let bausteinRow = 2;

for (const slot of jg6Slots) {
  bausteineSheet.getCell(`A${bausteinRow}`).value = slot.id;
  bausteineSheet.getCell(`B${bausteinRow}`).value = slot.fach;
  bausteineSheet.getCell(`C${bausteinRow}`).value = slot.titel;

  // Alternativen nur für jg6-de-3
  if (slot.id === 'jg6-de-3') {
    bausteineSheet.getCell(`D${bausteinRow}`).value = 'Ocean City ODER Herr der Diebe';
  } else {
    bausteineSheet.getCell(`D${bausteinRow}`).value = '';
  }

  bausteineSheet.getCell(`E${bausteinRow}`).value = ''; // gelingensnachweis
  bausteineSheet.getCell(`F${bausteinRow}`).value = ''; // gelingensnachweisStation
  bausteineSheet.getCell(`G${bausteinRow}`).value = ''; // materialort
  bausteineSheet.getCell(`H${bausteinRow}`).value = ''; // kurzbeschreibung
  bausteinRow++;
}

// Speichern
await workbook.xlsx.writeFile(filePath);
console.log('Jg6.xlsx gefüllt');
