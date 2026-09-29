// Einmal-Skript: Jg6 Deutsch 3 (Leo, 29.09.2026: zwei Buecher laufen parallel, die SuS entscheiden
// sich vorher fuer eines). Der Build erlaubt keine zwei Slots in derselben Spur, darum bleibt es
// bei EINEM Baustein (jg6-de-3): Stationen 1-18 = Ocean City (Nummern wie im Dokument, die Termine
// verweisen auf Station 6, 15 und 18), Stationen 19-32 = Herr der Diebe (im Dokument 1-14). Jede
// Station traegt im Hinweis, fuer welches Buch sie gilt. Der Gelingensnachweis nennt beide Buecher.
// Ausserdem: Jg6 GEO 4, Station 10/11 (Vulkan oder Gebirgsbildung) werden Wahl mit Hinweis,
// weil genau eine der beiden gemacht werden muss.
// Nicht Teil des Builds, nach Gebrauch loeschbar.
import ExcelJS from 'exceljs';

const PFAD = 'content/jahrgaenge/Jg6.xlsx';
const HINWEIS_GEO4 = 'Eine der beiden Wahlaufgaben (Station 10 oder 11) musst du machen.';

// [baustein, nr, titel, art, minuten, niveau, material, hinweis]
const STATIONEN = [
  ['jg6-de-3', 1, 'Das Flipbook', 'pflicht', 15, 1, 'Flipbook-Vorlage', 'Nur für Ocean City.'],
  ['jg6-de-3', 2, 'Der erste Eindruck', 'pflicht', 30, 1, 'Flipbook', 'Nur für Ocean City.'],
  ['jg6-de-3', 3, 'Ist das so richtig?', 'wahl', 15, 2, 'Laptop', 'Nur für Ocean City.'],
  ['jg6-de-3', 4, 'Mega-Floating-City: Ocean City', 'pflicht', 45, 2, 'Flipbook, M1', 'Nur für Ocean City.'],
  ['jg6-de-3', 5, 'Jackson, Crockie & Henk', 'pflicht', 45, 3, 'Flipbook', 'Nur für Ocean City.'],
  ['jg6-de-3', 6, 'Macht durch Kontrolle', 'pflicht', 30, 2, '—', 'Nur für Ocean City.'],
  ['jg6-de-3', 7, 'Zeit ist Geld', 'pflicht', 60, 3, 'Flipbook', 'Nur für Ocean City.'],
  ['jg6-de-3', 8, 'Beweg dich!', 'wahl', 20, 1, 'Laptop', 'Nur für Ocean City.'],
  ['jg6-de-3', 9, 'Der Transponder & andere Erfindungen', 'pflicht', 60, 2, 'A1', 'Nur für Ocean City.'],
  ['jg6-de-3', 10, 'Die Große Zeremonie', 'pflicht', 30, 2, 'Flipbook, M2', 'Nur für Ocean City.'],
  ['jg6-de-3', 11, 'Schulkleidung', 'wahl', 30, 1, '—', 'Nur für Ocean City.'],
  ['jg6-de-3', 12, 'Kommando „Matt Fuller“', 'pflicht', 45, 2, 'Flipbook', 'Nur für Ocean City.'],
  ['jg6-de-3', 13, 'Der Verrat', 'pflicht', 20, 1, '—', 'Nur für Ocean City.'],
  ['jg6-de-3', 14, 'Die Rollen des Clark Kellington', 'pflicht', 45, 2, 'A2', 'Nur für Ocean City.'],
  ['jg6-de-3', 15, 'Die Personenkonstellation', 'pflicht', 25, 3, 'Flipbook', 'Nur für Ocean City.'],
  ['jg6-de-3', 16, 'Der Autor & der Cliffhanger', 'wahl', 30, 2, 'Flipbook, Laptop', 'Nur für Ocean City.'],
  ['jg6-de-3', 17, 'Du bist dran!', 'pflicht', 90, 3, 'weißes A4-Blatt', 'Nur für Ocean City.'],
  ['jg6-de-3', 18, 'Eine Rezension schreiben', 'pflicht', 45, 3, 'Flipbook, A3', 'Nur für Ocean City.'],
  ['jg6-de-3', 19, 'Venedig', 'pflicht', 7, 1, 'Laptop, Venedig-Quiz', 'Nur für Herr der Diebe.'],
  ['jg6-de-3', 20, 'Ein Auftrag für Victor und eine Kinderbande', 'pflicht', 45, 1, 'Lektüre', 'Nur für Herr der Diebe.'],
  ['jg6-de-3', 21, 'Ein Auftrag für den Herrn der Diebe', 'pflicht', 45, 1, 'Lektüre', 'Nur für Herr der Diebe.'],
  ['jg6-de-3', 22, 'Victor und die Kinder', 'pflicht', 45, 1, 'Lektüre', 'Nur für Herr der Diebe.'],
  ['jg6-de-3', 23, 'Der Umschlag des Conte & Victor in der Falle', 'pflicht', 60, 1, 'Lektüre', 'Nur für Herr der Diebe.'],
  ['jg6-de-3', 24, 'Wut, Streit und ein Ehrenwort', 'pflicht', 45, 1, 'Lektüre', 'Nur für Herr der Diebe.'],
  ['jg6-de-3', 25, 'Der Einbruch und eine alte Geschichte', 'pflicht', 45, 1, 'Lektüre', 'Nur für Herr der Diebe.'],
  ['jg6-de-3', 26, 'Treffen mit dem Conte und die Geheime Insel & Alles verloren?', 'pflicht', 60, 1, 'Lektüre', 'Nur für Herr der Diebe.'],
  ['jg6-de-3', 27, 'Das Karussell & Wie alle ein Zuhause finden', 'pflicht', 60, 1, 'Lektüre', 'Nur für Herr der Diebe.'],
  ['jg6-de-3', 28, 'Die Vogelmaske', 'wahl', 30, 3, 'M1', 'Nur für Herr der Diebe.'],
  ['jg6-de-3', 29, 'Detektivarbeit', 'wahl', 30, 1, 'M2', 'Nur für Herr der Diebe.'],
  ['jg6-de-3', 30, 'Das Karussell', 'wahl', 30, 1, '—', 'Nur für Herr der Diebe.'],
  ['jg6-de-3', 31, 'Alternatives Buchcover', 'wahl', 45, 1, '—', 'Nur für Herr der Diebe.'],
  ['jg6-de-3', 32, 'Einen Erzähltext in eine Szene umschreiben', 'pflicht', 120, 3, 'Lektüre, Laptop', 'Nur für Herr der Diebe.']
];

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(PFAD);

  const bausteine = workbook.getWorksheet('Bausteine');
  const stationen = workbook.getWorksheet('Stationen');

  let zeileB = null;
  bausteine.eachRow((row, nr) => { if (nr > 1 && row.getCell(1).value === 'jg6-de-3') zeileB = row; });
  if (!zeileB) throw new Error('jg6-de-3 nicht gefunden');
  stationen.eachRow((row, nr) => { if (nr > 1 && String(row.getCell(1).value).startsWith('jg6-de-3')) throw new Error('jg6-de-3 hat schon Stationen'); });

  zeileB.getCell(5).value = 'Ocean City: Flipbook als Lektürebegleitung. Herr der Diebe: Eine Textstelle umschreiben';

  for (const z of STATIONEN) stationen.addRow(z);

  // GEO 4: Station 10 und 11
  stationen.eachRow((row, nr) => {
    if (nr > 1 && row.getCell(1).value === 'jg6-geo-4' && [10, 11].includes(Number(row.getCell(2).value))) {
      row.getCell(4).value = 'wahl';
      row.getCell(8).value = HINWEIS_GEO4;
    }
  });

  await workbook.xlsx.writeFile(PFAD);
  console.log('Jg6: ' + STATIONEN.length + ' Stationen fuer DE 3, GEO 4 angepasst');
}

main();
