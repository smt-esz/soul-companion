// Nur zum lokalen Testen des Lehrerzugangs (uebernehme-terminaenderungen.mjs),
// nicht Teil des Builds. Erzeugt eine Excel-Datei in der Form, wie sie
// Microsoft Forms als "Antworten in Excel oeffnen" anlegt, mit den zwei
// Spalten "Welcher Input...?" und "Welches Coaching...?" (Verzweigung).
//
//   node tools/test-formular-fixture.mjs <Zieldatei.xlsx> '<JSON-Liste>'
//
// Jeder Eintrag braucht "kategorie" ("input" oder "coaching") und
// "terminLabel" (Text wie in tools/termine-liste.mjs), dazu "neuesDatum".
//
// Beispiel:
//   node tools/test-formular-fixture.mjs formular.xlsx \
//     '[{"id":"r1","kategorie":"input","terminLabel":"22.09.2026 – Jg 5 – Input Biologie HAM","neuesDatum":"2026-09-23"}]'
import ExcelJS from 'exceljs';

const pfad = process.argv[2];
const zeilen = JSON.parse(process.argv[3]);

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('Formular 1');
sheet.addRow([
  'ID', 'Startzeit', 'Abschlusszeit', 'E-Mail', 'Name',
  'Was soll verschoben werden?', 'Welcher Input soll verschoben werden?',
  'Welches Coaching soll verschoben werden?', 'Neues Datum'
]);
for (const z of zeilen) {
  const istInput = z.kategorie === 'input';
  sheet.addRow([
    z.id, '2026-09-24T08:00:00Z', '2026-09-24T08:01:00Z', z.email || '', z.name || '',
    istInput ? 'Input' : 'Coaching',
    istInput ? z.terminLabel : '',
    istInput ? '' : z.terminLabel,
    new Date(z.neuesDatum + 'T00:00:00Z')
  ]);
}
await workbook.xlsx.writeFile(pfad);
console.log('geschrieben: ' + pfad);
