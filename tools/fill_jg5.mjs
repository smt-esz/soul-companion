#!/usr/bin/env node
import ExcelJS from 'exceljs';
import fs from 'fs';

const filePath = './content/jahrgaenge/Jg5.xlsx';
const slotsPath = 'C:/Users/leonart.schmitt/OneDrive - Evangelisches Schulzentrum Bad Düben/02 - Schulentwicklung/14 - Planung der Schulentwicklung/Planer Schulentwicklung/SOUL/Planung/anhang/slots_2026-27.json';

// Lade Slots aus JSON
const slotsData = JSON.parse(fs.readFileSync(slotsPath, 'utf8'));
const jg5Slots = slotsData['5'].slots;
const jg5Sonder = slotsData['5'].sonder;

// Lade die Excel-Datei
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(filePath);

// 1. Blatt "Jahrgang"
const jahrgangSheet = workbook.getWorksheet('Jahrgang');
jahrgangSheet.getCell('A2').value = 5;
jahrgangSheet.getCell('B2').value = 'verspielt';
jahrgangSheet.getCell('C2').value = 'A,B,C';
jahrgangSheet.getCell('D2').value = new Date('2026-10-26');
jahrgangSheet.getCell('D2').numFmt = 'yyyy-mm-dd';

// 2. Blatt "Slots"
const slotsSheet = workbook.getWorksheet('Slots');
let slotRow = 2;
for (const slot of jg5Slots) {
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
for (const sonder of jg5Sonder) {
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

// 4. Blatt "Bausteine" (mit Gelingensnachweisen)
const bausteineSheet = workbook.getWorksheet('Bausteine');
let bausteinRow = 2;

const gelingensnachweis = {
  'jg5-de-1': { titel: 'Einen Brief schreiben', station: null },
  'jg5-ma-1': { titel: 'Kurzkontrolle', station: null },
  'jg5-bio-1': { titel: 'Bedrohung und Schutz der Fische', station: 13 }
};

for (const slot of jg5Slots) {
  bausteineSheet.getCell(`A${bausteinRow}`).value = slot.id;
  bausteineSheet.getCell(`B${bausteinRow}`).value = slot.fach;
  bausteineSheet.getCell(`C${bausteinRow}`).value = slot.titel;
  bausteineSheet.getCell(`D${bausteinRow}`).value = ''; // alternativen

  if (gelingensnachweis[slot.id]) {
    bausteineSheet.getCell(`E${bausteinRow}`).value = gelingensnachweis[slot.id].titel;
    if (gelingensnachweis[slot.id].station) {
      bausteineSheet.getCell(`F${bausteinRow}`).value = gelingensnachweis[slot.id].station;
    }
  }

  bausteineSheet.getCell(`G${bausteinRow}`).value = ''; // materialort
  bausteineSheet.getCell(`H${bausteinRow}`).value = ''; // kurzbeschreibung
  bausteinRow++;
}

// 5. Blatt "Stationen" (aus HTML-Artefakt)
const stationenSheet = workbook.getWorksheet('Stationen');

const stationenData = {
  'jg5-de-1': [
    { nr: 1, titel: 'Der persönliche Brief: Aufbau', art: 'pflicht', minuten: 20, niveau: 1, material: 'A1, A2', hinweis: '' },
    { nr: 2, titel: 'Der persönliche Brief: Redemittel', art: 'pflicht', minuten: 30, niveau: 2, material: 'M1, A3 oder M2', hinweis: '' },
    { nr: 3, titel: 'Der persönliche Brief: Übungen', art: 'wahl', minuten: 20, niveau: 2, material: 'M3, M4', hinweis: '' },
    { nr: 4, titel: 'Der persönliche Brief: Schreibübungen', art: 'pflicht', minuten: 20, niveau: 3, material: 'A4', hinweis: '' },
    { nr: 5, titel: 'Die Adresse: Aufbau', art: 'pflicht', minuten: 20, niveau: 1, material: '—', hinweis: '' },
    { nr: 6, titel: 'Der förmliche Brief: Aufbau', art: 'pflicht', minuten: 20, niveau: 2, material: 'A5, A6', hinweis: '' },
    { nr: 7, titel: 'Der förmliche Brief: Die Höflichkeitsform', art: 'pflicht', minuten: 20, niveau: 2, material: 'L1', hinweis: '' },
    { nr: 8, titel: 'Der förmliche Brief: Redemittel', art: 'pflicht', minuten: 30, niveau: 2, material: 'M5, A7 oder M6', hinweis: '' },
    { nr: 9, titel: 'Der förmliche Brief: Übungen', art: 'wahl', minuten: 20, niveau: 2, material: 'M7, M8', hinweis: '' },
    { nr: 10, titel: 'Der förmliche Brief: Schreibübungen', art: 'pflicht', minuten: 20, niveau: 3, material: 'A8', hinweis: '' },
    { nr: 11, titel: 'Der Briefumschlag: Aufbau', art: 'pflicht', minuten: 20, niveau: 1, material: 'A9', hinweis: '' },
    { nr: 12, titel: 'Die Geschichte der Post: Textverständnis', art: 'wahl', minuten: 30, niveau: 2, material: 'M9, A10 oder A11', hinweis: '' },
    { nr: 13, titel: 'Übungen', art: 'wahl', minuten: 60, niveau: 2, material: 'A12, M10–M14', hinweis: '' },
    { nr: 14, titel: 'Vergleich Briefe und E-Mails', art: 'wahl', minuten: 20, niveau: 2, material: '—', hinweis: '' },
    { nr: 15, titel: 'E-Mails schreiben', art: 'wahl', minuten: 20, niveau: 3, material: 'Laptop', hinweis: '' },
    { nr: 16, titel: 'Abschluss und Leistungsmessung', art: 'pflicht', minuten: 30, niveau: 3, material: '—', hinweis: '' }
  ],
  'jg5-ma-1': [
    { nr: 1, titel: 'Diagnose-Parcours', art: 'pflicht', minuten: 45, niveau: 1, material: 'Laptop', hinweis: '' },
    { nr: 2, titel: 'Riesenzahlen-Galerie', art: 'pflicht', minuten: 45, niveau: 1, material: 'Laptop', hinweis: '' },
    { nr: 3, titel: 'Stellenwerttafel', art: 'pflicht', minuten: 45, niveau: 1, material: 'Laptop', hinweis: '' },
    { nr: 4, titel: 'Zahlenstrahl', art: 'pflicht', minuten: 45, niveau: 2, material: 'Heft, Laptop', hinweis: '' },
    { nr: 5, titel: 'Schätzen & Runden', art: 'pflicht', minuten: 45, niveau: 2, material: 'Laptop', hinweis: '' },
    { nr: 6, titel: 'Vergleichen & Ordnen', art: 'pflicht', minuten: 45, niveau: 1, material: 'Laptop', hinweis: '' },
    { nr: 7, titel: 'Kopfrechen-Werkstatt', art: 'pflicht', minuten: 45, niveau: 1, material: 'Laptop', hinweis: '' },
    { nr: 8, titel: 'Schriftlich Rechnen', art: 'pflicht', minuten: 45, niveau: 2, material: 'Heft, Laptop', hinweis: '' },
    { nr: 9, titel: 'Geschickt Rechnen', art: 'pflicht', minuten: 45, niveau: 2, material: 'Laptop', hinweis: '' },
    { nr: 10, titel: 'Division mit Rest', art: 'pflicht', minuten: 45, niveau: 2, material: 'Laptop', hinweis: '' },
    { nr: 11, titel: 'Teiler & Teilbarkeit', art: 'pflicht', minuten: 45, niveau: 2, material: 'Laptop', hinweis: '' },
    { nr: 12, titel: 'Sachaufgaben-Werkstatt', art: 'pflicht', minuten: 45, niveau: 1, material: 'Laptop', hinweis: '' },
    { nr: 13, titel: 'Schätz-Olympiade', art: 'wahl', minuten: 30, niveau: 2, material: 'Laptop', hinweis: '' },
    { nr: 14, titel: 'Welche Zahl bin ich?', art: 'wahl', minuten: 30, niveau: 3, material: 'Laptop', hinweis: '' },
    { nr: 15, titel: 'Magische Quadrate', art: 'wahl', minuten: 30, niveau: 2, material: 'Laptop', hinweis: '' },
    { nr: 16, titel: 'Zweite Aufgaben-Karte', art: 'wahl', minuten: 30, niveau: 2, material: 'Laptop', hinweis: '' },
    { nr: 17, titel: 'Rechengesetze entdecken', art: 'wahl', minuten: 30, niveau: 3, material: 'Laptop', hinweis: '' },
    { nr: 18, titel: 'Primzahlen & Teilbarkeit', art: 'wahl', minuten: 30, niveau: 3, material: 'Laptop', hinweis: '' }
  ],
  'jg5-bio-1': [
    { nr: 1, titel: 'Arbeitsweisen in der Biologie', art: 'pflicht', minuten: 30, niveau: 1, material: 'Lehrbuch', hinweis: '' },
    { nr: 2, titel: 'Kennzeichen des Lebendigen', art: 'pflicht', minuten: 60, niveau: 2, material: 'M1, A1, Lehrbuch', hinweis: '' },
    { nr: 3, titel: 'Die Vielfalt der Fische', art: 'pflicht', minuten: 90, niveau: 2, material: 'A2, A3, Lehrbuch', hinweis: '' },
    { nr: 4, titel: 'Fisch-Domino', art: 'wahl', minuten: 30, niveau: 3, material: 'M2, Lehrbuch, Fisch-Buch', hinweis: '' },
    { nr: 5, titel: 'Äußerer und innerer Bau der Fische', art: 'pflicht', minuten: 45, niveau: 2, material: 'A4, Lehrbuch', hinweis: '' },
    { nr: 6, titel: 'Körperform der Fische', art: 'pflicht', minuten: 45, niveau: 2, material: 'Experiment, Lehrbuch, M3', hinweis: '' },
    { nr: 7, titel: 'Haut der Fische', art: 'pflicht', minuten: 30, niveau: 2, material: 'M4, Lupe, Fischschuppe', hinweis: '' },
    { nr: 8, titel: 'Atmung der Fische', art: 'pflicht', minuten: 45, niveau: 2, material: 'A5, A6, Lehrbuch, Laptop', hinweis: '' },
    { nr: 9, titel: 'Sektion eines Fisches', art: 'pflicht', minuten: 30, niveau: 2, material: 'A4 (ausgefüllt)', hinweis: 'Teilnahmepflicht, klassenweiser Termin' },
    { nr: 10, titel: 'Fortpflanzung und Entwicklung', art: 'pflicht', minuten: 45, niveau: 1, material: 'A7, Lehrbuch, Laptop', hinweis: '' },
    { nr: 11, titel: 'Verhaltensweisen bei Fortpflanzung/Entwicklung', art: 'wahl', minuten: 30, niveau: 2, material: 'M6, M7, A8, Laptop', hinweis: '' },
    { nr: 12, titel: 'Ernährung der Fische', art: 'pflicht', minuten: 60, niveau: 3, material: 'A9, Lehrbuch, Laptop', hinweis: '' },
    { nr: 13, titel: 'Bedrohung und Schutz der Fische', art: 'pflicht', minuten: 120, niveau: 3, material: 'M8, M9, A10', hinweis: '' },
    { nr: 14, titel: 'Online-Übungen Sofatutor', art: 'wahl', minuten: 60, niveau: 2, material: 'Laptop, Zugangscode', hinweis: '' }
  ]
};

let stationRow = 2;
for (const [bausteinId, stationen] of Object.entries(stationenData)) {
  for (const station of stationen) {
    stationenSheet.getCell(`A${stationRow}`).value = bausteinId;
    stationenSheet.getCell(`B${stationRow}`).value = station.nr;
    stationenSheet.getCell(`C${stationRow}`).value = station.titel;
    stationenSheet.getCell(`D${stationRow}`).value = station.art;
    stationenSheet.getCell(`E${stationRow}`).value = station.minuten;
    stationenSheet.getCell(`F${stationRow}`).value = station.niveau;
    stationenSheet.getCell(`G${stationRow}`).value = station.material;
    stationenSheet.getCell(`H${stationRow}`).value = station.hinweis;
    stationRow++;
  }
}

// 6. Blatt "Inputs"
const inputsSheet = workbook.getWorksheet('Inputs');
const inputsData = [
  { id: 'jg5-bio-sektion', fach: 'bio', art: 'baustein', titel: 'Sektion eines Fisches', beschreibung: '', pflicht: true, bausteine: 'jg5-bio-1' },
  { id: 'jg5-de-persoenlicher-brief', fach: 'de', art: 'baustein', titel: 'Persönlicher Brief', beschreibung: '', pflicht: false, bausteine: 'jg5-de-1' },
  { id: 'jg5-de-foermlicher-brief', fach: 'de', art: 'baustein', titel: 'Förmlicher Brief', beschreibung: '', pflicht: false, bausteine: 'jg5-de-1' }
];

let inputRow = 2;
for (const input of inputsData) {
  inputsSheet.getCell(`A${inputRow}`).value = input.id;
  inputsSheet.getCell(`B${inputRow}`).value = input.fach;
  inputsSheet.getCell(`C${inputRow}`).value = input.art;
  inputsSheet.getCell(`D${inputRow}`).value = input.titel;
  inputsSheet.getCell(`E${inputRow}`).value = input.beschreibung;
  inputsSheet.getCell(`F${inputRow}`).value = input.pflicht;
  inputsSheet.getCell(`G${inputRow}`).value = input.bausteine;
  inputRow++;
}

// 7. Blatt "Coachings"
const coachingsSheet = workbook.getWorksheet('Coachings');
const coachingsData = [
  { wochentag: 'Mo', kuerzel: 'ERL', gueltigAb: '2026-09-07', gueltigBis: '2026-10-02', klasse: '' },
  { wochentag: 'Di', kuerzel: 'HEC', gueltigAb: '2026-09-07', gueltigBis: '2026-10-02', klasse: '' },
  { wochentag: 'Mi', kuerzel: 'RIK', gueltigAb: '2026-09-07', gueltigBis: '2026-10-02', klasse: '' },
  { wochentag: 'Do', kuerzel: 'HER', gueltigAb: '2026-09-07', gueltigBis: '2026-10-02', klasse: '' },
  { wochentag: 'Fr', kuerzel: 'HAM', gueltigAb: '2026-09-07', gueltigBis: '2026-10-02', klasse: '' }
];

let coachingRow = 2;
const wochentageMap = { 'Mo': 1, 'Di': 2, 'Mi': 3, 'Do': 4, 'Fr': 5 };
for (const coaching of coachingsData) {
  coachingsSheet.getCell(`A${coachingRow}`).value = wochentageMap[coaching.wochentag];
  coachingsSheet.getCell(`B${coachingRow}`).value = coaching.kuerzel;
  coachingsSheet.getCell(`C${coachingRow}`).value = new Date(coaching.gueltigAb + 'T00:00:00Z');
  coachingsSheet.getCell(`C${coachingRow}`).numFmt = 'yyyy-mm-dd';
  coachingsSheet.getCell(`D${coachingRow}`).value = new Date(coaching.gueltigBis + 'T00:00:00Z');
  coachingsSheet.getCell(`D${coachingRow}`).numFmt = 'yyyy-mm-dd';
  coachingsSheet.getCell(`E${coachingRow}`).value = coaching.klasse;
  coachingRow++;
}

// 8. Blatt "Termine"
const termineSheet = workbook.getWorksheet('Termine');
const termineData = [
  { datum: '2026-09-08', art: 'input', fach: 'bio', kuerzel: 'HAM', klasse: 'A', input: 'jg5-bio-sektion', text: '', station: 9, pflicht: true, raster: 'jg5-r1' },
  { datum: '2026-09-09', art: 'input', fach: 'de', kuerzel: 'TRY', klasse: '', input: 'jg5-de-persoenlicher-brief', text: '', station: 2, pflicht: false, raster: 'jg5-r1' },
  { datum: '2026-09-11', art: 'input', fach: 'ma', kuerzel: 'HEC', klasse: '', input: '', text: 'Kommt mit euren Fragen!', station: '', pflicht: false, raster: 'jg5-r1' },
  { datum: '2026-09-22', art: 'input', fach: 'bio', kuerzel: 'HAM', klasse: 'B', input: 'jg5-bio-sektion', text: '', station: 9, pflicht: true, raster: 'jg5-r1' },
  { datum: '2026-09-23', art: 'input', fach: 'de', kuerzel: 'TRY', klasse: '', input: 'jg5-de-foermlicher-brief', text: '', station: 8, pflicht: false, raster: 'jg5-r1' },
  { datum: '2026-09-25', art: 'input', fach: 'ma', kuerzel: 'HEC', klasse: '', input: '', text: 'Kommt mit euren Fragen!', station: '', pflicht: false, raster: 'jg5-r1' },
  { datum: '2026-09-29', art: 'input', fach: 'bio', kuerzel: 'HAM', klasse: 'C', input: 'jg5-bio-sektion', text: '', station: 9, pflicht: true, raster: 'jg5-r1' },
  { datum: '2026-09-30', art: 'input', fach: 'de', kuerzel: 'TRY', klasse: '', input: '', text: 'Kommt mit euren Fragen!', station: '', pflicht: false, raster: 'jg5-r1' },
  { datum: '2026-10-02', art: 'input', fach: 'ma', kuerzel: 'HEC', klasse: '', input: '', text: 'Kommt mit euren Fragen!', station: '', pflicht: false, raster: 'jg5-r1' },
  { datum: '2026-09-22', art: 'entfall', fach: '', kuerzel: 'HEC', klasse: '', input: '', text: 'Kein Coaching', station: '', pflicht: false, raster: '' },
  { datum: '2026-10-01', art: 'entfall', fach: '', kuerzel: 'HER', klasse: '', input: '', text: 'Kein Coaching', station: '', pflicht: false, raster: '' },
  { datum: '2026-10-02', art: 'entfall', fach: '', kuerzel: 'HAM', klasse: '', input: '', text: 'Kein Coaching', station: '', pflicht: false, raster: '' }
];

let terminRow = 2;
for (const termin of termineData) {
  termineSheet.getCell(`A${terminRow}`).value = new Date(termin.datum + 'T00:00:00Z');
  termineSheet.getCell(`A${terminRow}`).numFmt = 'yyyy-mm-dd';
  termineSheet.getCell(`B${terminRow}`).value = termin.art;
  termineSheet.getCell(`C${terminRow}`).value = termin.fach;
  termineSheet.getCell(`D${terminRow}`).value = termin.kuerzel;
  termineSheet.getCell(`E${terminRow}`).value = termin.klasse;
  termineSheet.getCell(`F${terminRow}`).value = termin.input;
  termineSheet.getCell(`G${terminRow}`).value = termin.text;
  termineSheet.getCell(`H${terminRow}`).value = termin.station;
  termineSheet.getCell(`I${terminRow}`).value = termin.pflicht;
  termineSheet.getCell(`J${terminRow}`).value = termin.raster;
  terminRow++;
}

// 9. Blatt "Raster"
const rasterSheet = workbook.getWorksheet('Raster');
rasterSheet.getCell('A2').value = 'jg5-r1';
rasterSheet.getCell('B2').value = new Date('2026-08-31T00:00:00Z');
rasterSheet.getCell('B2').numFmt = 'yyyy-mm-dd';
rasterSheet.getCell('C2').value = new Date('2026-10-02T00:00:00Z');
rasterSheet.getCell('C2').numFmt = 'yyyy-mm-dd';
rasterSheet.getCell('D2').value = 'Bausteinzeitraum 31.08. bis 02.10.2026';

// Speichere die Datei
await workbook.xlsx.writeFile(filePath);
console.log('✓ Jg5.xlsx erfolgreich mit allen Daten gefüllt');
