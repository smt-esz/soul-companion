// Einmal-Skript: legt im Blatt "Raster" alle Bausteinzeitraeume der drei Jahrgaenge an, damit
// die Plan-Ansicht ein Wochenraster zeigt (bisher nur Jg5, erster Zeitraum).
// Die Zeitraeume folgen den Slots (= Strukturierung SOUL 2026/27); die "Ueberblick ... Zeitraeume,
// Faecher, Inputs, Gelingensnachweise" nennen fuer Jg5 Zeitraum 1 (07.09.-09.10.) und Jg6/Jg7
// Zeitraum 6 (02.02.-13.03.) andere Daten, die nicht zu den Slots passen (Stand Vorjahr?).
// Nicht Teil des Builds, nach Gebrauch loeschbar.
import ExcelJS from 'exceljs';

const ZEITRAEUME = {
  Jg5: [
    ['2026-08-31', '2026-10-02'], ['2026-10-26', '2026-11-20'], ['2026-11-23', '2027-01-08'],
    ['2027-01-11', '2027-02-05'], ['2027-02-22', '2027-03-19'], ['2027-04-05', '2027-04-30'],
    ['2027-05-03', '2027-06-04'], ['2027-06-07', '2027-07-02']
  ],
  Jg6: [
    ['2026-08-17', '2026-09-11'], ['2026-09-21', '2026-10-30'], ['2026-11-02', '2026-11-27'],
    ['2026-11-30', '2027-01-08'], ['2027-01-11', '2027-02-05'], ['2027-02-22', '2027-03-19'],
    ['2027-04-05', '2027-04-30'], ['2027-05-03', '2027-06-04'], ['2027-06-07', '2027-07-02']
  ]
};
ZEITRAEUME.Jg7 = ZEITRAEUME.Jg6;

const tm = (iso) => iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.';
const tmj = (iso) => tm(iso) + iso.slice(0, 4);

async function main() {
  for (const jg of Object.keys(ZEITRAEUME)) {
    const pfad = 'content/jahrgaenge/' + jg + '.xlsx';
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(pfad);
    const raster = workbook.getWorksheet('Raster');
    const vorhanden = new Set();
    raster.eachRow((row, nr) => { if (nr > 1) vorhanden.add(String(row.getCell(2).value instanceof Date ? row.getCell(2).value.toISOString().slice(0, 10) : row.getCell(2).value)); });
    let n = 0;
    ZEITRAEUME[jg].forEach(([von, bis], i) => {
      if (vorhanden.has(von)) return;
      raster.addRow([jg.toLowerCase() + '-r' + (i + 1), von, bis, 'Bausteinzeitraum ' + tm(von) + ' bis ' + tmj(bis)]);
      n++;
    });
    await workbook.xlsx.writeFile(pfad);
    console.log(jg + ': ' + n + ' Rasterzeitraeume angelegt');
  }
}

main();
