// Einmal-Skript: ersetzt die Termine in Jg7.xlsx durch die komplette
// Jahresplanung aus "Coaching- und Inputplanung 2026_2027 Klasse 7.docx".
// Nicht Teil des Builds, nach Gebrauch loeschbar.
//
// Ausgelassen (schon anderswo abgedeckt): Buß- und Bettag, Christi
// Himmelfahrt, Pfingstmontag (schulweite Ferien), Themen- und
// Fahrtenwoche/Herbstferien (Sonderwoche/Ferien), Weihnachtsmarkt (siehe
// Bericht).
import ExcelJS from 'exceljs';

const PFAD = 'content/jahrgaenge/Jg7.xlsx';

// [datum, art, fach, kuerzel, klasse, input, text, station, pflicht, raster]
const TERMINE = [
  ['2026-08-24', 'input', 'geo', 'KUL', '', '', 'Koordinaten ablesen', '', '', ''],
  ['2026-08-24', 'coaching', '', 'HIL', '', '', '', '', '', ''],
  ['2026-08-25', 'coaching', '', 'DUB', '', '', '', '', '', ''],
  ['2026-08-26', 'input', 'en', 'HEI', '', '', 'How to describe a picture using Present Progressive (Station 9-11)', '', '', ''],
  ['2026-08-26', 'coaching', '', 'BAL', '', '', '', '', '', ''],
  ['2026-08-27', 'coaching', '', 'SMT', '', '', '', '', '', ''],
  ['2026-08-28', 'input', 'bio', 'HAM', '', '', 'Bakterien und Viren – Aufbau, Unterschiede und Vermehrung', '', '', ''],
  ['2026-08-31', 'input', 'geo', 'KUL', '', '', 'Beleuchtungszonen / Jahreszeiten', '', '', ''],
  ['2026-08-31', 'coaching', '', 'HIL', '', '', '', '', '', ''],
  ['2026-09-01', 'coaching', '', 'DUB', '', '', '', '', '', ''],
  ['2026-09-02', 'input', 'en', 'HEI', '', '', 'How to write a character profile using the present tense', 13, '', ''],
  ['2026-09-02', 'coaching', '', 'BAL', '', '', '', '', '', ''],
  ['2026-09-03', 'coaching', '', 'SMT', '', '', '', '', '', ''],
  ['2026-09-04', 'input', 'bio', 'HAM', '', '', 'Ansteckung – So werden Krankheitserreger übertragen', '', '', ''],
  ['2026-09-04', 'coaching', '', 'HEI', '', '', '', '', '', ''],
  ['2026-09-07', 'input', 'geo', 'KUL', '', '', 'Klimazonen / Klimadiagramme', '', '', ''],
  ['2026-09-07', 'coaching', '', 'HIL', '', '', '', '', '', ''],
  ['2026-09-08', 'coaching', '', 'DUB', '', '', '', '', '', ''],
  ['2026-09-09', 'input', 'en', 'HEI', '', '', 'How to write a diary entry using Simple Past', 12, '', ''],
  ['2026-09-09', 'coaching', '', 'BAL', '', '', '', '', '', ''],
  ['2026-09-10', 'coaching', '', 'SMT', '', '', '', '', '', ''],
  ['2026-09-11', 'input', 'bio', 'HAM', '', '', 'Schutzbarrieren und unspezifische Immunabwehr', '', '', ''],
  ['2026-09-11', 'coaching', '', 'HEI', '', '', '', '', '', ''],

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
  ['2026-10-30', 'input', 'bio', 'HAM', '', '', 'Antibiotika – Wirkung, richtige Anwendung und Resistenzen', '', '', ''],
  ['2026-10-30', 'coaching', '', 'BAL', '', '', '', '', '', ''],

  ['2026-11-04', 'coaching', '', 'KUL', '', '', '', '', '', ''],
  ['2026-11-05', 'coaching', '', 'HIL', '', '', '', '', '', ''],
  ['2026-11-09', 'input', 'geo', 'KUL', '', '', '', '', '', ''],
  ['2026-11-09', 'coaching', '', 'HEI', '', '', '', '', '', ''],
  ['2026-11-10', 'input', 'en', 'SMT', '', '', '', '', '', ''],
  ['2026-11-10', 'coaching', '', 'DUB', '', '', '', '', '', ''],
  ['2026-11-11', 'coaching', '', 'HEI', '', '', '', '', '', ''],
  ['2026-11-12', 'coaching', '', 'HIL', '', '', '', '', '', ''],
  ['2026-11-13', 'input', 'bio', 'HAM', '', '', '', '', '', ''],
  ['2026-11-16', 'input', 'geo', 'KUL', '', '', '', '', '', ''],
  ['2026-11-17', 'input', 'en', 'SMT', '', '', '', '', '', ''],
  ['2026-11-17', 'coaching', '', 'DUB', '', '', '', '', '', ''],
  ['2026-11-19', 'coaching', '', 'HIL', '', '', '', '', '', ''],
  ['2026-11-20', 'input', 'bio', 'HAM', '', '', '', '', '', ''],
  ['2026-11-23', 'input', 'geo', 'KUL', '', '', '', '', '', ''],
  ['2026-11-23', 'coaching', '', 'HEI', '', '', '', '', '', ''],
  ['2026-11-24', 'input', 'en', 'SMT', '', '', '', '', '', ''],
  ['2026-11-24', 'coaching', '', 'DUB', '', '', '', '', '', ''],
  ['2026-11-27', 'input', 'bio', 'HAM', '', '', '', '', '', ''],

  ['2026-12-08', 'input', 'ma', 'STE', '', '', '', '', '', ''],
  ['2026-12-09', 'input', 'geo', 'KUL', '', '', '', '', '', ''],
  ['2026-12-10', 'input', 'de', 'HIL', '', '', '', '', '', ''],
  ['2026-12-15', 'input', 'ma', 'STE', '', '', '', '', '', ''],
  ['2026-12-16', 'input', 'geo', 'KUL', '', '', '', '', '', ''],
  ['2026-12-17', 'input', 'de', 'HIL', '', '', '', '', '', ''],
  ['2027-01-05', 'input', 'ma', 'STE', '', '', '', '', '', ''],
  ['2027-01-06', 'input', 'geo', 'KUL', '', '', '', '', '', ''],
  ['2027-01-07', 'input', 'de', 'HIL', '', '', '', '', '', ''],

  ['2027-01-19', 'input', 'en', 'BAL', '', '', '', '', '', ''],
  ['2027-01-20', 'input', 'ma', 'STE', '', '', '', '', '', ''],
  ['2027-01-22', 'input', 'bio', 'BRU', '', '', '', '', '', ''],
  ['2027-01-25', 'input', 'ma', 'STE', '', '', '', '', '', ''],
  ['2027-01-26', 'input', 'en', 'SMT', '', '', '', '', '', ''],
  ['2027-01-27', 'input', 'bio', 'BRU', '', '', '', '', '', ''],
  ['2027-01-29', 'sonstiges', '', '', '', '', 'Pädagogischer Tag – Heimarbeit', '', '', ''],
  ['2027-02-02', 'input', 'en', 'BAL', '', '', '', '', '', ''],
  ['2027-02-03', 'input', 'ma', 'STE', '', '', '', '', '', ''],
  ['2027-02-05', 'input', 'bio', 'BRU', '', '', '', '', '', ''],

  ['2027-03-02', 'input', 'en', 'SMT', '', '', '', '', '', ''],
  ['2027-03-04', 'input', 'de', 'DUB', '', '', '', '', '', ''],
  ['2027-03-09', 'input', 'en', 'SMT', '', '', '', '', '', ''],
  ['2027-03-11', 'input', 'de', 'DUB', '', '', '', '', '', ''],
  ['2027-03-16', 'input', 'en', 'SMT', '', '', '', '', '', ''],
  ['2027-03-18', 'input', 'de', 'DUB', '', '', '', '', '', ''],

  ['2027-04-12', 'input', 'de', 'HIL', '', '', '', '', '', ''],
  ['2027-04-13', 'input', 'en', 'BAL', '', '', '', '', '', ''],
  ['2027-04-14', 'sonstiges', '', '', '', '', 'Pädagogischer Tag – Heimarbeit', '', '', ''],
  ['2027-04-15', 'input', 'bio', 'OHR', '', '', '', '', '', ''],
  ['2027-04-19', 'input', 'de', 'HIL', '', '', '', '', '', ''],
  ['2027-04-21', 'input', 'en', 'BAL', '', '', '', '', '', ''],
  ['2027-04-22', 'input', 'bio', 'OHR', '', '', '', '', '', ''],
  ['2027-04-23', 'sonstiges', '', '', '', '', 'Teamfahrt', '', '', ''],
  ['2027-04-26', 'input', 'de', 'HIL', '', '', '', '', '', ''],
  ['2027-04-28', 'input', 'en', 'BAL', '', '', '', '', '', ''],
  ['2027-04-29', 'input', 'bio', 'OHR', '', '', '', '', '', ''],

  ['2027-05-12', 'input', 'ma', 'STE', '', '', '', '', '', ''],
  ['2027-05-13', 'input', 'de', 'DUB', '', '', '', '', '', ''],
  ['2027-05-19', 'input', 'ma', 'STE', '', '', '', '', '', ''],
  ['2027-05-20', 'input', 'de', 'DUB', '', '', '', '', '', ''],
  ['2027-05-26', 'input', 'ma', 'STE', '', '', '', '', '', ''],
  ['2027-05-27', 'input', 'de', 'DUB', '', '', '', '', '', '']
];

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(PFAD);
  const sheet = workbook.getWorksheet('Termine');

  // spliceRows(2, N) auf einmal loescht nicht zuverlaessig bis zum Ende
  // (ExcelJS-Eigenheit), darum Zeile fuer Zeile von hinten.
  for (let i = sheet.rowCount; i >= 2; i--) sheet.spliceRows(i, 1);

  for (const zeile of TERMINE) sheet.addRow(zeile);
  await workbook.xlsx.writeFile(PFAD);
  console.log('geschrieben: ' + TERMINE.length + ' Termine (alte Zeilen ersetzt)');
}

main();
