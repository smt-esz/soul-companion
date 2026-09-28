// Einmal-Skript: traegt die Termine (Inputs/Coachings) aus
// "2026_2027_SOUL_6_UebersichtBaustein_Zeitraum2.pdf" in Jg6.xlsx ein.
// Nicht Teil des Builds, nach Gebrauch loeschbar.
//
// "Paedagogischer Tag" am 26.10.2026: Leo (24.09.2026) - fuer alle
// Heimarbeit, kein regulaerer Ferientag. Darum kein Eintrag in
// schule.xlsx/Ferien (zaehlt weiter als Schultag), sondern ein normaler
// Termin (art: sonstiges) im Wochenraster.
import ExcelJS from 'exceljs';

const PFAD = 'content/jahrgaenge/Jg6.xlsx';

// [datum, art, fach, kuerzel, klasse, input, text, station, pflicht, raster]
const TERMINE = [
  ['2026-09-23', 'coaching', '', 'ADM', '', '', '', '', '', ''],
  ['2026-09-25', 'coaching', '', 'HCO', '', '', '', '', '', ''],
  ['2026-09-28', 'input', 'geo', 'ADM', '', '', 'Klimadiagramme auswerten', 9, '', ''],
  ['2026-09-29', 'input', 'de', 'DUB', '', '', 'Wiederholung Satzglieder erkennen', 2, '', ''],
  ['2026-09-29', 'coaching', '', 'EPP', '', '', '', '', '', ''],
  ['2026-09-30', 'coaching', '', 'ADM', '', '', '', '', '', ''],
  ['2026-10-01', 'input', 'en', 'EPP', '', '', 'writing workshop', 2, '', ''],
  ['2026-10-02', 'coaching', '', 'HCO', '', '', '', '', '', ''],
  ['2026-10-05', 'coaching', '', 'ADM', '', '', '', '', '', ''],
  ['2026-10-06', 'input', 'de', 'DUB', '', '', 'HS-NS erkennen, Satzbilder (Station 5 und 7)', '', '', ''],
  ['2026-10-07', 'coaching', '', 'EPP', '', '', '', '', '', ''],
  ['2026-10-08', 'input', 'geo', 'ADM', '', '', 'Klimadiagramme zeichnen', 10, '', ''],
  ['2026-10-09', 'coaching', '', 'HCO', '', '', '', '', '', ''],
  ['2026-10-26', 'sonstiges', '', '', '', '', 'Pädagogischer Tag – Heimarbeit', '', '', ''],
  ['2026-10-27', 'input', 'de', 'DUB', '', '', 'wörtliche Rede', 9, '', ''],
  ['2026-10-28', 'coaching', '', 'EPP', '', '', '', '', '', ''],
  ['2026-10-29', 'input', 'geo', 'ADM', '', '', 'Topografie – wie arbeite ich mit Wandkarten', '', '', ''],
  ['2026-10-30', 'input', 'en', 'EPP', '', '', 'GEN – how to… (Station 13 und 14)', '', '', '']
];

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(PFAD);
  const sheet = workbook.getWorksheet('Termine');
  for (const zeile of TERMINE) sheet.addRow(zeile);
  await workbook.xlsx.writeFile(PFAD);
  console.log('geschrieben: ' + TERMINE.length + ' Termine');
}

main();
