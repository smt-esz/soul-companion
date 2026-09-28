// Einmal-Skript: traegt die Termine (Inputs/Coachings) aus
// "Bausteinzeitraum2_Jgst7_SOUL.pdf" in Jg7.xlsx ein.
// Nicht Teil des Builds, nach Gebrauch loeschbar.
//
// "Paedagogischer Tag" am 26.10.2026: Leo (24.09.2026) - fuer alle
// Heimarbeit, kein regulaerer Ferientag. Darum kein Eintrag in
// schule.xlsx/Ferien (zaehlt weiter als Schultag), sondern ein normaler
// Termin (art: sonstiges) im Wochenraster.
import ExcelJS from 'exceljs';

const PFAD = 'content/jahrgaenge/Jg7.xlsx';

// [datum, art, fach, kuerzel, klasse, input, text, station, pflicht, raster]
const TERMINE = [
  ['2026-09-21', 'coaching', '', 'KUL', '', '', '', '', '', ''],
  ['2026-09-25', 'coaching', '', 'HEI', '', '', '', '', '', ''],
  ['2026-09-28', 'coaching', '', 'KUL', '', '', '', '', '', ''],
  ['2026-09-29', 'input', 'ma', 'STE', '', '', '', '', '', ''],
  ['2026-09-30', 'coaching', '', 'HEI', '', '', '', '', '', ''],
  ['2026-10-01', 'input', 'de', 'DUB', '', '', '', '', '', ''],
  ['2026-10-01', 'coaching', '', 'SMT', '', '', '', '', '', ''],
  ['2026-10-02', 'input', 'bio', 'HAM', '', '', 'Spezifische Immunabwehr – Antikörper und Gedächtniszellen', '', '', ''],
  ['2026-10-02', 'coaching', '', 'BAL', '', '', '', '', '', ''],
  ['2026-10-05', 'coaching', '', 'KUL', '', '', '', '', '', ''],
  ['2026-10-06', 'input', 'ma', 'STE', '', '', '', '', '', ''],
  ['2026-10-07', 'coaching', '', 'KUL', '', '', '', '', '', ''],
  ['2026-10-08', 'input', 'de', 'DUB', '', '', '', '', '', ''],
  ['2026-10-08', 'coaching', '', 'SMT', '', '', '', '', '', ''],
  ['2026-10-09', 'input', 'bio', 'HAM', '', '', 'Krankheitsverlauf, Fieber und Schutzimpfung', '', '', ''],
  ['2026-10-09', 'coaching', '', 'BAL', '', '', '', '', '', ''],
  ['2026-10-26', 'sonstiges', '', '', '', '', 'Pädagogischer Tag – Heimarbeit', '', '', ''],
  ['2026-10-27', 'input', 'ma', 'STE', '', '', '', '', '', ''],
  ['2026-10-28', 'coaching', '', 'KUL', '', '', '', '', '', ''],
  ['2026-10-29', 'input', 'de', 'DUB', '', '', '', '', '', ''],
  ['2026-10-29', 'coaching', '', 'SMT', '', '', '', '', '', ''],
  ['2026-10-30', 'input', 'bio', 'HAM', '', '', 'Antibiotika – Wirkung, richtige Anwendung und Resistenzen', '', '', '']
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
