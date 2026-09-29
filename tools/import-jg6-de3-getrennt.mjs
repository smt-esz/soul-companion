// Einmal-Skript: Jg6 Deutsch 3 als zwei parallele Wahlbausteine (Leo, 29.09.2026): jg6-de-3 =
// "Ocean City", neu jg6-de-3b = "Herr der Diebe" mit eigenem Slot (gleiche Spur, gleicher
// Zeitraum, Status wahl; der Build erlaubt das seit dem Spur-Check fuer parallele Wahl-Slots).
// Baut auf import-jg6-de3-parallel.mjs auf: die Stationen 19-32 von jg6-de-3 wandern nach
// jg6-de-3b (Nr. 1-14), die Hinweise "Nur fuer ..." entfallen.
// Nicht Teil des Builds, nach Gebrauch loeschbar.
import ExcelJS from 'exceljs';

const PFAD = 'content/jahrgaenge/Jg6.xlsx';

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(PFAD);
  const bausteine = workbook.getWorksheet('Bausteine');
  const slots = workbook.getWorksheet('Slots');
  const stationen = workbook.getWorksheet('Stationen');

  let zeileB = null, zeileS = null;
  bausteine.eachRow((row, nr) => { if (nr > 1 && row.getCell(1).value === 'jg6-de-3') zeileB = row; });
  slots.eachRow((row, nr) => { if (nr > 1 && row.getCell(1).value === 'jg6-de-3') zeileS = row; });
  if (!zeileB || !zeileS) throw new Error('jg6-de-3 nicht gefunden');
  bausteine.eachRow((row, nr) => { if (nr > 1 && row.getCell(1).value === 'jg6-de-3b') throw new Error('jg6-de-3b gibt es schon'); });

  const alternativen = zeileB.getCell(4).value;
  zeileB.getCell(3).value = 'Ocean City';
  zeileB.getCell(5).value = 'Flipbook als Lektürebegleitung';
  bausteine.addRow(['jg6-de-3b', 'de', 'Herr der Diebe', alternativen, 'Eine Textstelle umschreiben', null, null, null]);

  const s = zeileS.values.slice(1);
  slots.addRow([s[0] + 'b', s[1], s[2], s[3], s[4], s[5], s[6], s[7], s[8], 'jg6-de-3b', s[10], s[11]]);

  let verschoben = 0;
  stationen.eachRow((row, nr) => {
    if (nr === 1 || row.getCell(1).value !== 'jg6-de-3') return;
    const stNr = Number(row.getCell(2).value);
    row.getCell(8).value = null;
    if (stNr >= 19) {
      row.getCell(1).value = 'jg6-de-3b';
      row.getCell(2).value = stNr - 18;
      verschoben++;
    }
  });
  await workbook.xlsx.writeFile(PFAD);
  console.log('jg6-de-3b angelegt, ' + verschoben + ' Stationen verschoben');
}

main();
