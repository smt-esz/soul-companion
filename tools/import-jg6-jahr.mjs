// Einmal-Skript: ersetzt die Termine in Jg6.xlsx durch die komplette
// Jahresplanung aus "Coaching- und Inputplanung 2026_2027 Klasse 6.docx".
// Nicht Teil des Builds, nach Gebrauch loeschbar.
//
// Ausgelassen (schon anderswo abgedeckt):
// - Buß- und Bettag (18.11.), Christi Himmelfahrt (06.05.), Pfingstmontag
//   (17.05.): schulweit in schule.xlsx/Ferien.
// - Themen- und Fahrtenwoche (14.-18.09.), Herbstferien: schon vorhanden
//   bzw. schulweite Ferien.
// Weihnachtsmarkt (18.12.) ist hier ein normaler Termin, anders als bei
// Jg5: dort faellt die Woche in eine bestehende Pufferwoche-Sonderwoche,
// bei Jg6/Jg7 laeuft der reguläre Unterricht diese Woche weiter.
//
// Die sechs Bio-Inputs im November (Baustein "Unter der Lupe", 6A/6B/6C je
// zweimal) standen im Dokument nur mit Platzhalter-Thema ("6A: xxx"). Die
// echten Titel kommen von Leo (29.09.2026): pro Klasse zuerst "Mikroskopieren:
// Einführung" (HAM), dann "Mikroskopieren: Zwiebelhäutchen" (BRU).
import ExcelJS from 'exceljs';

const PFAD = 'content/jahrgaenge/Jg6.xlsx';

// [datum, art, fach, kuerzel, klasse, input, text, station, pflicht, raster]
const TERMINE = [
  ['2026-08-24', 'coaching', '', 'ADM', '', '', '', '', '', ''],
  ['2026-08-25', 'input', 'ma', 'STE', '', '', 'Darstellung von Zuordnungen', 3, '', ''],
  ['2026-08-25', 'coaching', '', 'EPP', '', '', '', '', '', ''],
  ['2026-08-26', 'coaching', '', 'BRU', '', '', '', '', '', ''],
  ['2026-08-27', 'input', 'de', 'DUB', '', '', 'Subjekt und Prädikat', 1, '', ''],
  ['2026-08-27', 'coaching', '', 'BUZ', '', '', '', '', '', ''],
  ['2026-08-28', 'coaching', '', 'BRU', '', '', '', '', '', ''],
  ['2026-08-31', 'coaching', '', 'ADM', '', '', '', '', '', ''],
  ['2026-09-01', 'input', 'ma', 'STE', '', '', 'Unterscheidung von Zuordnungen', 6, '', ''],
  ['2026-09-01', 'coaching', '', 'EPP', '', '', '', '', '', ''],
  ['2026-09-02', 'input', 'bio', 'BRU', 'A', '', 'Untersuchen eines Regenwurms', 3, 'ja', ''],
  ['2026-09-03', 'input', 'de', 'DUB', '', '', 'HS, NS, Satzreihen, Satzgefüge', 5, '', ''],
  ['2026-09-03', 'coaching', '', 'BUZ', '', '', '', '', '', ''],
  ['2026-09-04', 'input', 'bio', 'BRU', 'B', '', 'Untersuchen eines Regenwurms', 3, 'ja', ''],
  ['2026-09-07', 'coaching', '', 'ADM', '', '', '', '', '', ''],
  ['2026-09-08', 'input', 'ma', 'STE', '', '', 'Grafische Darstellungen', 11, '', ''],
  ['2026-09-08', 'coaching', '', 'EPP', '', '', '', '', '', ''],
  ['2026-09-09', 'input', 'bio', 'BRU', 'C', '', 'Untersuchen eines Regenwurms', 3, 'ja', ''],
  ['2026-09-10', 'input', 'de', 'DUB', '', '', 'Wörtliche Rede', 9, '', ''],
  ['2026-09-10', 'coaching', '', 'BUZ', '', '', '', '', '', ''],
  ['2026-09-11', 'coaching', '', 'BRU', '', '', '', '', '', ''],

  ['2026-09-24', 'coaching', '', 'ADM', '', '', '', '', '', ''],
  ['2026-09-25', 'coaching', '', 'HCO', '', '', '', '', '', ''],
  ['2026-09-28', 'input', 'geo', 'ADM', '', '', 'Klimadiagramme auswerten', 9, '', ''],
  ['2026-09-29', 'input', 'de', 'DUB', '', '', 'Wiederholung Satzglieder erkennen', 2, '', ''],
  ['2026-09-29', 'coaching', '', 'EPP', '', '', '', '', '', ''],
  ['2026-10-01', 'input', 'en', 'EPP', '', '', 'writing workshop', 2, '', ''],
  ['2026-10-01', 'coaching', '', 'ADM', '', '', '', '', '', ''],
  ['2026-10-02', 'coaching', '', 'HCO', '', '', '', '', '', ''],
  ['2026-10-05', 'input', 'geo', 'ADM', '', '', 'Klimadiagramme zeichnen', 10, '', ''],
  ['2026-10-06', 'input', 'de', 'DUB', '', '', 'HS-NS erkennen, Satzbilder (Station 5 und 7)', '', '', ''],
  ['2026-10-06', 'coaching', '', 'EPP', '', '', '', '', '', ''],
  ['2026-10-08', 'input', 'geo', 'ADM', '', '', 'Topografie – wie arbeite ich mit Wandkarten', '', '', ''],
  ['2026-10-09', 'coaching', '', 'HCO', '', '', '', '', '', ''],

  ['2026-10-26', 'sonstiges', '', '', '', '', 'Pädagogischer Tag – Heimarbeit', '', '', ''],
  ['2026-10-27', 'input', 'de', 'DUB', '', '', 'wörtliche Rede', 9, '', ''],
  ['2026-10-27', 'coaching', '', 'EPP', '', '', '', '', '', ''],
  ['2026-10-29', 'input', 'en', 'EPP', '', '', 'GEN – how to… (Station 13 und 14)', '', '', ''],
  ['2026-10-29', 'coaching', '', 'ADM', '', '', '', '', '', ''],

  ['2026-11-03', 'coaching', '', 'STE', '', '', '', '', '', ''],
  ['2026-11-04', 'input', 'ma', 'STE', '', '', 'Grundlegende Dreieckseigenschaften (Station 1-6)', '', '', ''],
  ['2026-11-04', 'coaching', '', 'BRU', '', '', '', '', '', ''],
  ['2026-11-09', 'input', 'bio', 'HAM', 'A', '', 'Mikroskopieren: Einführung', '', 'ja', ''],
  ['2026-11-10', 'input', 'de', 'HEC', '', '', 'Merkmale Fabeln und Fabeltiere (Station 3 und 4)', '', '', ''],
  ['2026-11-10', 'coaching', '', 'STE', '', '', '', '', '', ''],
  ['2026-11-11', 'input', 'ma', 'STE', '', '', 'Konstruktion nach dem Kongruenzsatz SsW', 11, '', ''],
  ['2026-11-11', 'coaching', '', 'BRU', '', '', '', '', '', ''],
  ['2026-11-12', 'coaching', '', 'OHR', '', '', '', '', '', ''],
  ['2026-11-13', 'input', 'bio', 'BRU', 'A', '', 'Mikroskopieren: Zwiebelhäutchen', '', 'ja', ''],
  ['2026-11-16', 'input', 'bio', 'HAM', 'B', '', 'Mikroskopieren: Einführung', '', 'ja', ''],
  ['2026-11-17', 'input', 'de', 'HEC', '', '', 'Der Aufbau einer Fabel', 5, '', ''],
  ['2026-11-17', 'coaching', '', 'STE', '', '', '', '', '', ''],
  ['2026-11-19', 'coaching', '', 'OHR', '', '', '', '', '', ''],
  ['2026-11-20', 'input', 'bio', 'BRU', 'B', '', 'Mikroskopieren: Zwiebelhäutchen', '', 'ja', ''],
  ['2026-11-23', 'input', 'bio', 'HAM', 'C', '', 'Mikroskopieren: Einführung', '', 'ja', ''],
  ['2026-11-24', 'input', 'de', 'HEC', '', '', 'Eine Fabel untersuchen und Lehren einer Fabel (Station 8 und 9)', '', '', ''],
  ['2026-11-25', 'input', 'ma', 'STE', '', '', 'Kommt mit euren Fragen!', '', '', ''],
  ['2026-11-25', 'coaching', '', 'BRU', '', '', '', '', '', ''],
  ['2026-11-26', 'coaching', '', 'OHR', '', '', '', '', '', ''],
  ['2026-11-27', 'input', 'bio', 'BRU', 'C', '', 'Mikroskopieren: Zwiebelhäutchen', '', 'ja', ''],

  ['2026-11-30', 'coaching', '', 'STE', '', '', '', '', '', ''],
  ['2026-12-01', 'coaching', '', 'STE', '', '', '', '', '', ''],
  ['2026-12-07', 'input', 'geo', 'ADM', '', '', 'Wind und Relief', 5, '', ''],
  ['2026-12-09', 'input', 'ma', 'STE', '', '', 'Grundlegende Dreieckseigenschaften (Station 1-6)', '', '', ''],
  ['2026-12-10', 'input', 'en', 'EPP', '', '', 'Working with a dictionary', 2, '', ''],
  ['2026-12-14', 'input', 'geo', 'ADM', '', '', 'Golfstrom', 7, '', ''],
  ['2026-12-14', 'coaching', '', 'STE', '', '', '', '', '', ''],
  ['2026-12-16', 'input', 'ma', 'STE', '', '', 'Konstruktion nach dem Kongruenzsatz SsW', 11, '', ''],
  ['2026-12-17', 'input', 'en', 'EPP', '', '', 'Viewing and listening skills', 8, '', ''],
  ['2026-12-18', 'sonstiges', '', '', '', '', 'Weihnachtsmarkt', '', '', ''],
  ['2027-01-04', 'input', 'geo', 'ADM', '', '', 'LK', '', '', ''],
  ['2027-01-06', 'input', 'ma', 'STE', '', '', 'Kommt mit euren Fragen!', '', '', ''],
  ['2027-01-07', 'input', 'en', 'EPP', '', '', 'Mediation from English to German', 9, '', ''],

  ['2027-01-18', 'input', 'de', 'RIK', '', '', 'Ocean City – Umgang mit dem Flipbook', '', '', ''],
  ['2027-01-19', 'input', 'ma', 'STE', '', '', 'Umkreis von Dreiecken', 3, '', ''],
  ['2027-01-20', 'input', 'de', 'HEI', '', '', 'Herr der Diebe: Wie schreibe ich eine Textstelle um?', '', '', ''],
  ['2027-01-21', 'input', 'bio', 'OHR', '', '', 'Moose und Farne', 5, '', ''],
  ['2027-01-25', 'input', 'de', 'RIK', '', '', 'Ocean City – Figurenkonstellation erstellen (Station 6 und 15)', '', '', ''],
  ['2027-01-26', 'input', 'ma', 'STE', '', '', 'Inkreis von Dreiecken', 5, '', ''],
  ['2027-01-27', 'input', 'de', 'HEI', '', '', 'Herr der Diebe: Wie schreibe ich eine Textstelle um?', '', '', ''],
  ['2027-01-28', 'input', 'bio', 'OHR', '', '', 'Moose und Farne', 5, '', ''],
  ['2027-01-29', 'sonstiges', '', '', '', '', 'Pädagogischer Tag – Heimarbeit', '', '', ''],
  ['2027-02-01', 'input', 'de', 'RIK', '', '', 'Ocean City – Rezensionen schreiben', 18, '', ''],
  ['2027-02-02', 'input', 'ma', 'STE', '', '', 'Flächeninhalt von Dreiecken', 8, '', ''],
  ['2027-02-03', 'input', 'de', 'HEI', '', '', 'Herr der Diebe: Wie schreibe ich eine Textstelle um?', '', '', ''],
  ['2027-02-04', 'input', 'bio', 'OHR', '', '', 'Moose und Farne', 5, '', ''],

  ['2027-03-01', 'input', 'geo', 'ADM', '', '', 'Glaziale Serie', 2, '', ''],
  ['2027-03-02', 'input', 'en', 'EPP', '', '', 'Describing people and character / working with adjectives', 2, '', ''],
  ['2027-03-03', 'input', 'bio', 'BRU', '', '', 'Pilze', 6, '', ''],
  ['2027-03-08', 'input', 'geo', 'ADM', '', '', 'Vorbereitung auf den Gelingensnachweis', '', '', ''],
  ['2027-03-09', 'input', 'en', 'EPP', '', '', 'Working with (informational) texts', 5, '', ''],
  ['2027-03-10', 'input', 'bio', 'BRU', '', '', 'Nahrungsketten und -netze (Station 8, 10 und 11)', '', '', ''],
  ['2027-03-15', 'input', 'geo', 'ADM', '', '', 'Ein Landschaftsprofil auswerten', 4, '', ''],
  ['2027-03-16', 'input', 'en', 'EPP', '', '', 'Working with (informational) texts', 5, '', ''],
  ['2027-03-17', 'input', 'bio', 'BRU', '', '', 'Nahrungsketten und -netze (Station 8, 10 und 11)', '', '', ''],

  ['2027-04-13', 'input', 'ma', 'STE', '', '', 'Körpernetze', 6, '', ''],
  ['2027-04-14', 'sonstiges', '', '', '', '', 'Pädagogischer Tag – Heimarbeit', '', '', ''],
  ['2027-04-15', 'input', 'en', 'EPP', '', '', 'How to work with a team reader / Introduction to Pip and the umbrella room', 1, '', ''],
  ['2027-04-16', 'input', 'bio', 'BRU', '', '', 'Das Laubblatt (Fotosynthese und Blattformen) (Station 4 und 5)', '', '', ''],
  ['2027-04-20', 'input', 'ma', 'STE', '', '', 'Schrägbild', 8, '', ''],
  ['2027-04-21', 'input', 'bio', 'BRU', '', '', 'Methode Legebild und Blütendiagramm', 8, '', ''],
  ['2027-04-22', 'input', 'en', 'EPP', '', '', 'Reading strategies', 5, '', ''],
  ['2027-04-23', 'sonstiges', '', '', '', '', 'Teamfahrt', '', '', ''],
  ['2027-04-27', 'input', 'ma', 'STE', '', '', 'Oberflächeninhalt', 11, '', ''],
  ['2027-04-28', 'input', 'bio', 'BRU', '', '', 'Von der Blüte zur Frucht', 10, '', ''],
  ['2027-04-29', 'input', 'en', 'EPP', '', '', 'Reading Journal Help', 6, '', ''],

  ['2027-05-04', 'input', 'en', 'EPP', '', '', 'How to work with a team reader / Introduction to Pip and the umbrella room', 1, '', ''],
  ['2027-05-10', 'input', 'geo', 'ADM', '', '', 'Fragen zum Gelingensnachweis', '', '', ''],
  ['2027-05-11', 'input', 'de', 'TUC', '', '', 'Die Sprache der Profis', 7, '', ''],
  ['2027-05-12', 'input', 'de', 'HEI', '', '', 'Aktiv und Passiv', 8, '', ''],
  ['2027-05-13', 'input', 'geo', 'ADM', '', '', 'Übung Topografie', '', '', ''],
  ['2027-05-20', 'input', 'en', 'EPP', '', '', 'Reading strategies', 5, '', ''],
  ['2027-05-24', 'input', 'geo', 'ADM', '', '', 'Übung Topografie', '', '', ''],
  ['2027-05-25', 'input', 'de', 'TUC', '', '', 'Der Unfallbericht (Station 12 und 13)', '', '', ''],
  ['2027-05-27', 'input', 'en', 'EPP', '', '', 'Reading Journal Help', 6, '', ''],

  ['2027-06-15', 'input', 'ma', 'STE', '', '', '', '', '', ''],
  ['2027-06-16', 'input', 'bio', 'BRU', '', '', '', '', '', ''],
  ['2027-06-17', 'input', 'de', 'DUB', '', '', 'Wortbildung', '', '', ''],
  ['2027-06-22', 'input', 'de', 'DUB', '', '', 'Erb-, Lehn- und Fremdwörter', '', '', ''],
  ['2027-06-24', 'input', 'geo', 'ADM', '', '', 'Einführung: Was ist Digital Sparks?', '', '', ''],
  ['2027-06-29', 'input', 'en', 'EPP', '', '', '', '', '', '']
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
