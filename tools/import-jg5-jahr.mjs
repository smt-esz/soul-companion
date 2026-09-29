// Einmal-Skript: ersetzt die Termine in Jg5.xlsx durch die komplette
// Jahresplanung aus "Coaching- und Inputplanung 2026_2027 Klasse 5.docx".
// Nicht Teil des Builds, nach Gebrauch loeschbar.
//
// Ausgelassen (bewusst, siehe AP-Bericht):
// - Buß- und Bettag (18.11.), Christi Himmelfahrt (06.05.), Pfingstmontag
//   (17.05.): schon schulweit in schule.xlsx/Ferien.
// - Weihnachtsmarkt (18.12.): schon Teil der bestehenden Sonderwoche
//   "Pufferwoche + SOUL Basics + Weihnachtsmarkt" (14.-18.12.).
// - "Pufferwoche + SOUL Basics" (14.-17.12.): dito, schon als Sonderwoche da.
//
// Zwei Datums-Tippfehler im Dokument korrigiert (Jahr 2026 statt 2027 bei
// drei Terminen kurz nach Weihnachten - aus dem Zusammenhang eindeutig).
import ExcelJS from 'exceljs';

const PFAD = 'content/jahrgaenge/Jg5.xlsx';

// [datum, art, fach, kuerzel, klasse, input, text, station, pflicht, raster]
const TERMINE = [
  ['2026-09-21', 'coaching', '', 'ERL', '', '', '', '', '', ''],
  ['2026-09-22', 'input', 'bio', 'HAM', 'A', '', 'Sektion eines Fisches', 9, 'ja', ''],
  ['2026-09-22', 'coaching', '', 'HEC', '', '', '', '', '', ''],
  ['2026-09-23', 'input', 'de', 'TRY', '', '', 'Persönlicher Brief', 2, '', ''],
  ['2026-09-23', 'coaching', '', 'RIK', '', '', '', '', '', ''],
  ['2026-09-24', 'coaching', '', 'HER', '', '', '', '', '', ''],
  ['2026-09-25', 'input', 'ma', 'HEC', '', '', 'Kommt mit euren Fragen!', '', '', ''],
  ['2026-09-25', 'coaching', '', 'HAM', '', '', '', '', '', ''],
  ['2026-09-28', 'coaching', '', 'ERL', '', '', '', '', '', ''],
  ['2026-09-29', 'input', 'bio', 'HAM', 'B', '', 'Sektion eines Fisches', 9, 'ja', ''],
  ['2026-09-30', 'input', 'de', 'TRY', '', '', 'Förmlicher Brief', 8, '', ''],
  ['2026-09-30', 'coaching', '', 'RIK', '', '', '', '', '', ''],
  ['2026-10-01', 'coaching', '', 'HER', '', '', '', '', '', ''],
  ['2026-10-02', 'input', 'ma', 'HEC', '', '', 'Kommt mit euren Fragen!', '', '', ''],
  ['2026-10-02', 'coaching', '', 'HAM', '', '', '', '', '', ''],
  ['2026-10-05', 'coaching', '', 'ERL', '', '', '', '', '', ''],
  ['2026-10-06', 'input', 'bio', 'HAM', 'C', '', 'Sektion eines Fisches', 9, 'ja', ''],
  ['2026-10-06', 'coaching', '', 'HEC', '', '', '', '', '', ''],
  ['2026-10-07', 'input', 'de', 'TRY', '', '', 'Kommt mit euren Fragen', '', '', ''],
  ['2026-10-07', 'coaching', '', 'RIK', '', '', '', '', '', ''],
  ['2026-10-08', 'coaching', '', 'HER', '', '', '', '', '', ''],
  ['2026-10-09', 'input', 'ma', 'HEC', '', '', 'Kommt mit euren Fragen!', '', '', ''],
  ['2026-10-09', 'coaching', '', 'HAM', '', '', '', '', '', ''],

  ['2026-10-26', 'sonstiges', '', '', '', '', 'Pädagogischer Tag – Heimarbeit', '', '', ''],
  ['2026-10-28', 'coaching', '', 'TRY', '', '', '', '', '', ''],
  ['2026-11-02', 'input', 'geo', 'ADM', '', '', 'Umgang mit einem Lapbook, Vorgehen, allgemeine Fragen', '', '', ''],
  ['2026-11-03', 'coaching', '', 'HAM', '', '', '', '', '', ''],
  ['2026-11-04', 'input', 'en', 'HEI', '', '', 'Kommt mit euren Fragen!', '', '', ''],
  ['2026-11-04', 'coaching', '', 'TRY', '', '', '', '', '', ''],
  ['2026-11-05', 'input', 'de', 'RIK', '', '', '', '', '', ''],
  ['2026-11-05', 'coaching', '', 'ERL', '', '', '', '', '', ''],
  ['2026-11-06', 'input', 'en', 'HEI', '', '', 'Kommt mit euren Fragen!', '', '', ''],
  ['2026-11-06', 'coaching', '', 'HEC', '', '', '', '', '', ''],
  ['2026-11-09', 'input', 'geo', 'ADM', '', '', 'allgemeine Fragen, Vertiefung, Quiz', '', '', ''],
  ['2026-11-10', 'coaching', '', 'HAM', '', '', '', '', '', ''],
  ['2026-11-11', 'input', 'en', 'HEI', '', '', 'Kommt mit euren Fragen!', '', '', ''],
  ['2026-11-11', 'coaching', '', 'TRY', '', '', '', '', '', ''],
  ['2026-11-12', 'input', 'de', 'RIK', '', '', '', '', '', ''],
  ['2026-11-12', 'coaching', '', 'ERL', '', '', '', '', '', ''],
  ['2026-11-13', 'coaching', '', 'HEC', '', '', '', '', '', ''],
  ['2026-11-16', 'input', 'geo', 'ADM', '', '', 'Hilfestellungen zum Lapbook', '', '', ''],
  ['2026-11-17', 'coaching', '', 'HAM', '', '', '', '', '', ''],
  ['2026-11-19', 'input', 'de', 'RIK', '', '', '', '', '', ''],
  ['2026-11-19', 'coaching', '', 'ERL', '', '', '', '', '', ''],
  ['2026-11-20', 'coaching', '', 'HEC', '', '', '', '', '', ''],

  ['2026-11-23', 'coaching', '', 'RIK', '', '', '', '', '', ''],
  ['2026-11-24', 'coaching', '', 'HEC', '', '', '', '', '', ''],
  ['2026-11-25', 'coaching', '', 'TRY', '', '', '', '', '', ''],
  ['2026-11-26', 'coaching', '', 'HER', '', '', '', '', '', ''],
  ['2026-11-30', 'coaching', '', 'RIK', '', '', '', '', '', ''],
  ['2026-12-01', 'input', 'bio', 'HAM', '', '', 'Methode: Steckbrief erklärt', '', '', ''],
  ['2026-12-02', 'coaching', '', 'TRY', '', '', '', '', '', ''],
  ['2026-12-03', 'input', 'de', 'RIK', '', '', 'Kommasetzung bei Ausrufen und Anreden', 4, '', ''],
  ['2026-12-03', 'coaching', '', 'HER', '', '', '', '', '', ''],
  ['2026-12-04', 'input', 'ma', 'HEC', '', '', 'Potenzen (Station 1-5)', '', '', ''],
  ['2026-12-07', 'coaching', '', 'RIK', '', '', '', '', '', ''],
  ['2026-12-08', 'input', 'bio', 'HAM', '', '', 'Methode: Steckbrief erklärt', '', '', ''],
  ['2026-12-09', 'coaching', '', 'TRY', '', '', '', '', '', ''],
  ['2026-12-10', 'input', 'de', 'RIK', '', '', 'Zeichensetzung bei wörtlicher Rede', 7, '', ''],
  ['2026-12-10', 'coaching', '', 'HER', '', '', '', '', '', ''],
  ['2026-12-11', 'input', 'ma', 'HEC', '', '', 'Teilbarkeit (Station 10)', '', '', ''],
  // 14.-18.12.: schon Sonderwoche "Pufferwoche + SOUL Basics + Weihnachtsmarkt"
  ['2027-01-05', 'input', 'bio', 'HAM', '', '', 'Methode: Steckbrief erklärt', '', '', ''],
  ['2027-01-07', 'input', 'de', 'RIK', '', '', 'Unterscheidung Haupt- und Nebensätze', 9, '', ''],
  ['2027-01-08', 'input', 'ma', 'HEC', '', '', 'Primfaktorzerlegung (Station 14-17)', '', '', ''],

  ['2027-01-19', 'input', 'en', 'EPP', '', '', 'Descriptions', 1, '', ''],
  ['2027-01-20', 'input', 'geo', 'KUL', '', '', 'Orientierung mit dem Gradnetz', 4, '', ''],
  ['2027-01-21', 'input', 'de', 'RIK', '', '', 'Die Rolle von Lehren', 5, '', ''],
  ['2027-01-26', 'input', 'en', 'EPP', '', '', 'Working with texts', 5, '', ''],
  ['2027-01-27', 'input', 'geo', 'KUL', '', '', 'Orientierung mit dem Gradnetz', 4, '', ''],
  ['2027-01-28', 'input', 'de', 'RIK', '', '', 'Merkmale von Fantasiegeschichten (Station 8 und 9)', '', '', ''],
  ['2027-01-29', 'sonstiges', '', '', '', '', 'Pädagogischer Tag – Heimarbeit', '', '', ''],
  ['2027-02-02', 'input', 'en', 'EPP', '', '', 'Creating Profiles', 9, '', ''],
  ['2027-02-03', 'input', 'geo', 'KUL', '', '', 'Maßstäbe lesen', 9, '', ''],
  ['2027-02-04', 'input', 'de', 'RIK', '', '', 'Kreatives Schreiben', 11, '', ''],

  ['2027-03-02', 'input', 'ma', 'HEC', '', '', 'Bandornamente', 4, '', ''],
  ['2027-03-03', 'input', 'de', 'TRY', '', '', 'Relevanz der Kopf- und Seitenzahlen im Duden', '', '', ''],
  ['2027-03-05', 'input', 'bio', 'HAM', 'A', '', 'Untersuchen eines Hühnereis', '', 'ja', ''],
  ['2027-03-09', 'input', 'ma', 'HEC', '', '', 'Spiegelung und Symmetrie', 10, '', ''],
  ['2027-03-10', 'input', 'de', 'TRY', '', '', 'Bilden von Grundformen', '', '', ''],
  ['2027-03-12', 'input', 'bio', 'HAM', 'B', '', 'Untersuchen eines Hühnereis', '', 'ja', ''],
  ['2027-03-16', 'input', 'ma', 'HEC', '', '', 'Drehsymmetrie', 17, '', ''],
  ['2027-03-17', 'input', 'de', 'TRY', '', '', 'Wie gehe ich vor, wenn ich nicht weiß, wonach ich eigentlich suche?', '', '', ''],
  ['2027-03-19', 'input', 'bio', 'HAM', 'C', '', 'Untersuchen eines Hühnereis', '', 'ja', ''],

  ['2027-04-12', 'input', 'geo', 'KUL', '', '', 'Orientieren in Deutschland', '', '', ''],
  ['2027-04-14', 'sonstiges', '', '', '', '', 'Pädagogischer Tag – Heimarbeit', '', '', ''],
  ['2027-04-15', 'input', 'de', 'RIK', '', '', 'Figurenbeschreibung und Zitieren', 2, '', ''],
  ['2027-04-16', 'input', 'en', 'HEI', '', '', 'Simple Present', '', '', ''],
  ['2027-04-19', 'input', 'geo', 'KUL', '', '', 'Kommt mit euren Fragen!', '', '', ''],
  ['2027-04-21', 'input', 'en', 'HEI', '', '', 'Simple Past', '', '', ''],
  ['2027-04-22', 'input', 'de', 'RIK', '', '', 'Argumentieren', 6, '', ''],
  ['2027-04-23', 'sonstiges', '', '', '', '', 'Teamfahrt', '', '', ''],
  ['2027-04-26', 'input', 'geo', 'KUL', '', '', 'Übung für die Leistungskontrolle Topografie', '', '', ''],
  ['2027-04-29', 'input', 'de', 'RIK', '', '', 'Kommt mit euren Fragen!', '', '', ''],
  ['2027-04-30', 'input', 'en', 'HEI', '', '', 'Possessive Pronouns', '', '', ''],

  ['2027-05-11', 'input', 'ma', 'HEC', '', '', 'Flächeninhalte und allgemeine Fragen', 3, '', ''],
  ['2027-05-12', 'input', 'de', 'TRY', '', '', 'Figurenbeschreibung und Zitieren', 2, '', ''],
  ['2027-05-14', 'input', 'bio', 'HAM', '', '', 'Merkmale von Säugetieren', '', '', ''],
  ['2027-05-19', 'input', 'de', 'TRY', '', '', 'Argumentieren', 6, '', ''],
  ['2027-05-21', 'input', 'bio', 'HAM', '', '', 'Merkmale von Säugetieren', '', '', ''],
  ['2027-05-25', 'input', 'ma', 'HEC', '', '', 'Flächeninhalt Rechteck und Umfang von Figuren', 12, '', ''],
  ['2027-05-26', 'input', 'de', 'TRY', '', '', 'Kommt mit euren Fragen!', '', '', ''],
  ['2027-05-28', 'input', 'bio', 'HAM', '', '', 'Merkmale von Säugetieren', '', '', ''],
  ['2027-06-01', 'input', 'ma', 'HEC', '', '', 'Quadernetze und Schrägbilder', 17, '', ''],

  ['2027-06-14', 'input', 'geo', 'ADM', '', '', 'Stadt-Umland-Beziehung (GEN)', 8, '', ''],
  ['2027-06-15', 'input', 'de', 'TRY', '', '', 'Merkmale und Aufbau von Gedichten', 2, '', ''],
  ['2027-06-17', 'input', 'en', 'EPP', '', '', 'Talking about the past', '', '', ''],
  ['2027-06-21', 'input', 'geo', 'ADM', '', '', 'Stadt-Umland-Beziehung (GEN)', 8, '', ''],
  ['2027-06-22', 'input', 'de', 'TRY', '', '', 'Sprachliche Bilder entschlüsseln', 8, '', ''],
  ['2027-06-24', 'input', 'en', 'EPP', '', '', 'How to learn irregular verbs', '', '', ''],
  ['2027-06-28', 'input', 'geo', 'ADM', '', '', 'Kommt mit euren Fragen!', '', '', ''],
  ['2027-06-29', 'input', 'de', 'TRY', '', '', 'Kommt mit euren Fragen!', '', '', ''],
  ['2027-07-01', 'input', 'en', 'EPP', '', '', 'Kommt mit euren Fragen!', '', '', '']
];

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(PFAD);
  const sheet = workbook.getWorksheet('Termine');

  // Alte Zeilen (Platzhalter/unvollstaendig, __zeile 2-13) entfernen, dann
  // die komplette Jahresplanung neu schreiben.
  // spliceRows(2, N) auf einmal loescht nicht zuverlaessig bis zum Ende
  // (ExcelJS-Eigenheit), darum Zeile fuer Zeile von hinten.
  for (let i = sheet.rowCount; i >= 2; i--) sheet.spliceRows(i, 1);

  for (const zeile of TERMINE) sheet.addRow(zeile);

  // Die alte woechentliche Coaching-Regel (Blatt "Coachings", Mo-Fr
  // ERL/HEC/RIK/HER/HAM, 07.09.-02.10.2026) ist jetzt doppelt: dieselben
  // Termine stehen jetzt einzeln und genauer im Blatt "Termine" (siehe
  // oben). Ohne diesen Schritt wuerde jeder Coaching-Tag doppelt
  // erscheinen.
  const coachings = workbook.getWorksheet('Coachings');
  for (let i = coachings.rowCount; i >= 2; i--) coachings.spliceRows(i, 1);

  await workbook.xlsx.writeFile(PFAD);
  console.log('geschrieben: ' + TERMINE.length + ' Termine, alte Platzhalter- und Coachings-Regel entfernt');
}

main();
