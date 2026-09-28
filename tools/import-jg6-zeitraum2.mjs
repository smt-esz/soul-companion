// Einmal-Skript: traegt Stationen, Gelingensnachweis und Termine aus den
// PDFs "2026_2027_SOUL_6_UebersichtBaustein_Zeitraum2.pdf" in Jg6.xlsx ein.
// Nicht Teil des Builds, nach Gebrauch loeschbar.
import ExcelJS from 'exceljs';

const PFAD = 'content/jahrgaenge/Jg6.xlsx';

const GELINGENSNACHWEIS = {
  'jg6-de-1': { text: 'Lernübersicht zur Grammatik', station: null },
  'jg6-en-1': { text: 'report on the events of the story – graded task', station: 15 },
  'jg6-geo-1': { text: 'Klimadiagramm zeichnen', station: 11 }
};

const STATIONEN = [
  // Deutsch: Satzglieder
  ['jg6-de-1', 1, 'Sätze würfeln', 'pflicht', 45, 2, 'M1, Satzgliedwürfel', ''],
  ['jg6-de-1', 2, 'Wiederholung aller Satzglieder', 'wahl', 45, 2, 'Laptop', ''],
  ['jg6-de-1', 3, 'Der Hauptsatz', 'pflicht', 45, 2, 'A1, Laptop', ''],
  ['jg6-de-1', 4, 'Der Nebensatz', 'pflicht', 60, 2, 'A2, M2, Laptop', ''],
  ['jg6-de-1', 5, 'Einfache Satzreihen und Satzgefüge', 'pflicht', 45, 2, 'A3, Laptop', ''],
  ['jg6-de-1', 6, 'Mehrgliedrige Satzgefüge', 'wahl', 45, 3, 'A4, Laptop', ''],
  ['jg6-de-1', 7, 'Satzbilder zeichnen', 'pflicht', 30, 2, 'A5', ''],
  ['jg6-de-1', 8, 'Zeichensetzung bei wörtlicher Rede', 'pflicht', 30, 1, 'M3, Laptop', ''],
  ['jg6-de-1', 9, 'Begleitsätze bei wörtlicher Rede', 'pflicht', 60, 3, 'A6, A7', ''],
  ['jg6-de-1', 10, 'Anwendung grammatischer Verfahren', 'pflicht', 45, 1, 'A8, Laptop', ''],
  ['jg6-de-1', 11, 'Das kann ich jetzt!', 'pflicht', 80, 3, 'M4, Material zur Gestaltung', ''],
  ['jg6-de-1', 12, 'Weiterführende Übungen', 'wahl', 60, 2, 'Laptop', ''],

  // Englisch: The Secret of Maple Hill
  ['jg6-en-1', 1, 'Welcome to Maple Hill', 'pflicht', 60, 1, 'M1', ''],
  ['jg6-en-1', 2, 'Falling Leaves & First Feelings', 'pflicht', 60, 2, 'M2, white paper', ''],
  ['jg6-en-1', 3, 'The Strange Note', 'pflicht', 30, 2, 'A1, A2, or A3', ''],
  ['jg6-en-1', 4, 'The Poem in the Attic', 'pflicht', 60, 2, 'A4, M2, white paper', ''],
  ['jg6-en-1', 5, "What's Inside?", 'pflicht', 30, 1, 'sensory boxes', ''],
  ['jg6-en-1', 6, 'The Mysterious Message', 'pflicht', 35, 2, 'M3', ''],
  ['jg6-en-1', 7, 'A Quiet Day', 'wahl', 60, 2, 'M4', ''],
  ['jg6-en-1', 8, 'Whispers in the Wind', 'pflicht', 45, 2, 'laptop, headphones', ''],
  ['jg6-en-1', 9, 'Maple Hill Side-Quests', 'pflicht', 80, 3, 'A5, A6, A7, A8', ''],
  ['jg6-en-1', 10, 'Through the Trees', 'pflicht', 35, 2, 'M2', ''],
  ['jg6-en-1', 11, 'The Hidden Door', 'pflicht', 60, 3, 'M2', ''],
  ['jg6-en-1', 12, 'The Secret of Maple Hill', 'pflicht', 60, 3, 'M2', ''],
  ['jg6-en-1', 13, 'Escape the Forest', 'pflicht', 20, 3, '', ''],
  ['jg6-en-1', 14, 'Between Truth and Silence', 'pflicht', 40, 3, 'A9', ''],
  ['jg6-en-1', 15, "Corinne's Choice – Your Task", 'pflicht', 100, 3, 'M5, M6, or M7', ''],
  ['jg6-en-1', 16, 'A Quiet Voice Speaks', 'wahl', 25, 2, '', ''],
  ['jg6-en-1', 17, 'The Book with Her Name', 'wahl', 25, 2, '', ''],

  // Geografie: Europa
  ['jg6-geo-1', 1, 'Warm Up', 'pflicht', 20, 1, 'A1, Hefter, Stift', ''],
  ['jg6-geo-1', 2, 'Länder Europas', 'pflicht', 80, 2, 'Atlas, A2, Lehrbuch, Hefter, Stift, Lineal', ''],
  ['jg6-geo-1', 3, 'Inseln, Halbinseln, Flüsse, Gebirge Europas', 'pflicht', 90, 2, 'A3, A4, Lehrbuch, Atlas, Heft', ''],
  ['jg6-geo-1', 4, 'Europa – unser Heimatkontinent', 'pflicht', 45, 1, 'Lehrbuch, M1, A5, Heft, Schere, Kleber', ''],
  ['jg6-geo-1', 5, 'Großlandschaften Europas', 'pflicht', 45, 2, 'Lehrbuch, Heft, A6, M2, Transparentpapier', ''],
  ['jg6-geo-1', 6, 'Die Europäische Union', 'wahl', 45, 2, 'Lehrbuch, M3, Heft, Münzen', ''],
  ['jg6-geo-1', 7, 'Ländersteckbrief', 'pflicht', 60, 2, 'Lehrbuch, A7', ''],
  ['jg6-geo-1', 8, 'Wetter und Klima / Klimadiagramm', 'pflicht', 60, 2, 'M4, Lehrbuch, A8', ''],
  ['jg6-geo-1', 9, 'Klimadiagramm auswerten', 'pflicht', 80, 3, 'A9, A10, M4', ''],
  ['jg6-geo-1', 10, 'Klimadiagramm zeichnen', 'pflicht', 80, 3, 'Lehrbuch, kariertes Papier, Millimeterpapier', ''],
  ['jg6-geo-1', 11, 'Gelingensnachweis', 'pflicht', 40, 3, 'A11, Lehrbuch, Millimeterpapier', ''],
  ['jg6-geo-1', 12, 'Universelles Klimadiagramm', 'wahl', 30, 2, 'Pappe, Stecknadeln', ''],
  ['jg6-geo-1', 13, 'Vertiefung Topografie', 'pflicht', 45, 2, 'A2, A3, A4, Atlas, Wandkarte', '']
];

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(PFAD);

  const bausteine = workbook.getWorksheet('Bausteine');
  const kopfB = bausteine.getRow(1).values.slice(1).map(String);
  const spalteB = (name) => kopfB.findIndex((k) => k.trim() === name) + 1;
  const cId = spalteB('id'), cGn = spalteB('gelingensnachweis'), cGnSt = spalteB('gelingensnachweisStation');

  bausteine.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const id = String(row.getCell(cId).value || '');
    const eintrag = GELINGENSNACHWEIS[id];
    if (eintrag) {
      row.getCell(cGn).value = eintrag.text;
      if (eintrag.station !== null) row.getCell(cGnSt).value = eintrag.station;
    }
  });

  const stationen = workbook.getWorksheet('Stationen');
  const kopfS = stationen.getRow(1).values.slice(1).map(String);
  console.log('Stationen-Spalten:', kopfS.join(', '));
  for (const [baustein, nr, titel, art, minuten, niveau, material, hinweis] of STATIONEN) {
    stationen.addRow([baustein, nr, titel, art, minuten, niveau, material, hinweis]);
  }

  await workbook.xlsx.writeFile(PFAD);
  console.log('geschrieben: ' + STATIONEN.length + ' Stationen, ' + Object.keys(GELINGENSNACHWEIS).length + ' Gelingensnachweise');
}

main();
