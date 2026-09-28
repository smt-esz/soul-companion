// Einmal-Skript: traegt Baustein-Titel, Stationen und Gelingensnachweis aus
// "Bausteinzeitraum2_Jgst7_SOUL.pdf" in Jg7.xlsx ein.
// Nicht Teil des Builds, nach Gebrauch loeschbar.
//
// Wahl-Stationen bekommen ab Jgst. 7 einen Hinweis: Leo (24.09.2026) hat
// bestaetigt, dass Wahlstationen fuer Gymnasiasten ab Klasse 7 verpflichtend
// sind (Tiefe des Gymnasialbildungsgangs), fuer Oberschueler aber Wahl
// bleiben. Die App kennt keinen Bildungsgang (Kinder sitzen gemischt in
// derselben Klasse), darum bleibt art='wahl' (der Regelfall/Oberschule) mit
// einem sichtbaren Hinweis dazu, statt eine falsche Pflicht fuer alle zu
// zeigen.
import ExcelJS from 'exceljs';

const PFAD = 'content/jahrgaenge/Jg7.xlsx';
const GYM_HINWEIS = 'Für Gymnasiasten ab Jgst. 7 Pflicht.';

const TITEL = {
  'jg7-bio-1': 'Krankheitserreger und Immunsystem',
  'jg7-de-1': 'Die geheimnisvolle Welt der Balladen',
  'jg7-ma-1': 'Prozent- und Zinsrechnung'
};

const GELINGENSNACHWEIS = {
  'jg7-ma-1': { text: 'Prozent- und Zinsaufgaben sicher lösen und das Vorgehen erklären', station: 13 },
  'jg7-bio-1': { text: 'Fallbericht an das Gesundheitsamt', station: 12 },
  'jg7-de-1': { text: 'komplexe Leistung', station: null }
};

const STATIONEN = [
  // Mathematik: Prozent- und Zinsrechnung
  ['jg7-ma-1', 1, 'Vorwissen: Anteile und Prozente', 'pflicht', 45, 1, 'Heft, M1, Lehrbuch', ''],
  ['jg7-ma-1', 2, 'Grundbegriffe der Prozentrechnung', 'pflicht', 45, 1, 'Heft, M1, Lehrbuch', ''],
  ['jg7-ma-1', 3, '1. Grundaufgabe: Prozentsatz', 'pflicht', 90, 2, 'Heft, M2, Lehrbuch', ''],
  ['jg7-ma-1', 4, '2. Grundaufgabe: Prozentwert', 'pflicht', 90, 2, 'Heft, M2, Lehrbuch', ''],
  ['jg7-ma-1', 5, '3. Grundaufgabe: Grundwert', 'pflicht', 90, 2, 'Heft, M2, Lehrbuch', ''],
  ['jg7-ma-1', 6, 'Übung: Die drei Grundaufgaben', 'wahl', 90, 2, 'Heft, M2, Lehrbuch', GYM_HINWEIS],
  ['jg7-ma-1', 7, 'Diagramme und Prozente', 'pflicht', 45, 1, 'Heft, Geodreieck, Zirkel, Lehrbuch', ''],
  ['jg7-ma-1', 8, 'Anwendung: Rabatt und Preisnachlass', 'wahl', 90, 2, 'Heft, M2, Lehrbuch', GYM_HINWEIS],
  ['jg7-ma-1', 9, 'Mehrwertsteuer und Brutto / Netto', 'pflicht', 90, 2, 'Heft, M2, Lehrbuch', ''],
  ['jg7-ma-1', 10, 'Prozentuale Zunahme und Abnahme', 'pflicht', 45, 2, 'Heft, M2, Lehrbuch', ''],
  ['jg7-ma-1', 11, 'Zinsrechnung: Jahreszinsen', 'pflicht', 90, 2, 'Heft, M3', ''],
  ['jg7-ma-1', 12, 'Zinsrechnung: Monats- & Tageszinsen', 'wahl', 60, 3, 'Heft, M3', GYM_HINWEIS],
  ['jg7-ma-1', 13, 'Gelingensnachweis', 'pflicht', 90, 3, 'A3', ''],

  // Biologie: Krankheitserreger und Immunsystem
  ['jg7-bio-1', 1, 'Der Ausbruch beginnt (OS/GYM)', 'pflicht', 40, 2, 'iPad, Website', ''],
  ['jg7-bio-1', 2, 'Die unsichtbaren Verdächtigen – Bakterien und Viren (OS/GYM)', 'pflicht', 40, 2, 'A1, iPad, Website', ''],
  ['jg7-bio-1', 3, 'Bakterien unter der Lupe', 'wahl', 40, 3, 'A2, iPad, Website', GYM_HINWEIS],
  ['jg7-bio-1', 4, 'Viren – Leben an der Grenze', 'wahl', 40, 3, 'iPad, Website', GYM_HINWEIS],
  ['jg7-bio-1', 5, 'Die Kette der Ansteckung (OS/GYM)', 'pflicht', 50, 3, 'A3, iPad, Website', ''],
  ['jg7-bio-1', 6, 'Das Einsatzteam im Blut (OS/GYM)', 'pflicht', 60, 3, 'A4 oder A5, iPad, Website', ''],
  ['jg7-bio-1', 7, 'Die Abwehr schlägt zurück (OS/GYM)', 'pflicht', 50, 2, 'A6, iPad, Website', ''],
  ['jg7-bio-1', 8, 'Wenn aus einem viele werden', 'wahl', 40, 2, 'iPad, Website', GYM_HINWEIS],
  ['jg7-bio-1', 9, 'Warum wird man krank (OS/GYM)', 'pflicht', 30, 3, 'A7 oder A8, iPad, Website', ''],
  ['jg7-bio-1', 10, 'Training für die Abwehr (OS/GYM)', 'pflicht', 30, 1, 'iPad, Website', ''],
  ['jg7-bio-1', 11, 'Die Detektive der Wissenschaft', 'wahl', 40, 3, 'iPad, Website', GYM_HINWEIS],
  ['jg7-bio-1', 12, 'Fallbericht an das Gesundheitsamt (OS/GYM)', 'pflicht', 100, 3, 'iPad, Website, Aktendulli', ''],
  ['jg7-bio-1', 13, 'Wenn Gerüchte krank machen', 'wahl', 30, 2, 'iPad, Website', GYM_HINWEIS],
  ['jg7-bio-1', 14, 'Gesund handeln im Alltag', 'wahl', 30, 2, 'A9, iPad, Website', GYM_HINWEIS],

  // Deutsch: Die geheimnisvolle Welt der Balladen. Die Vorlage nummeriert
  // zwei Stationen als 3a/3b und 4a/4b; die App braucht eine ganze Zahl je
  // Station, darum hier fortlaufend 1-16 durchnummeriert (nichts entfernt,
  // nur umnummeriert). Keine Abgabe/Input im Kalender verweist auf eine
  // Stationsnummer bei Deutsch Jg7, also bricht dadurch nichts anderes.
  ['jg7-de-1', 1, 'Lyrik-Check', 'wahl', 10, 1, 'iPad', GYM_HINWEIS],
  ['jg7-de-1', 2, 'Unbekannte Spurensuche', 'pflicht', 25, 2, 'Hefter, A1, A2', ''],
  ['jg7-de-1', 3, 'Die Geheimformel der Balladen (3a)', 'pflicht', 45, 2, 'A3, M1, M2, Hefter, iPad', ''],
  ['jg7-de-1', 4, 'Anwendung der Geheimformel (3b)', 'pflicht', 45, 3, 'A4', ''],
  ['jg7-de-1', 5, 'Balladen inhaltlich verstehen (4a)', 'pflicht', 15, 2, 'A5, iPad', ''],
  ['jg7-de-1', 6, 'Balladen am roten Faden (4b)', 'pflicht', 60, 3, 'M3, M4, Papier, Briefumschlag, Faden', ''],
  ['jg7-de-1', 7, 'Wahrheitssuche in einer Ballade', 'pflicht', 20, 1, 'Hefter, A6', ''],
  ['jg7-de-1', 8, 'Der Konjunktiv-Check', 'wahl', 15, 1, 'M5, A7', GYM_HINWEIS],
  ['jg7-de-1', 9, 'Sprache mit Stil – Nachrichten im Konjunktiv', 'pflicht', 30, 3, 'Hefter, A8', ''],
  ['jg7-de-1', 10, 'Eine Ballade unter der Lupe', 'pflicht', 35, 2, 'A9, M6, iPad', ''],
  ['jg7-de-1', 11, 'Sprachliche Stilmittel in Balladen', 'wahl', 10, 1, 'iPad', GYM_HINWEIS],
  ['jg7-de-1', 12, 'Wenn Worte Bilder zaubern', 'pflicht', 25, 2, 'iPad, A10', ''],
  ['jg7-de-1', 13, 'Das Zauberchaos', 'wahl', 10, 1, 'M7', GYM_HINWEIS],
  ['jg7-de-1', 14, 'Zwei Perspektiven, ein Schicksal', 'pflicht', 35, 2, 'A11, A12, M8', ''],
  ['jg7-de-1', 15, 'Bühne frei', 'wahl', 45, 1, 'M9', GYM_HINWEIS],
  ['jg7-de-1', 16, 'Eine Ballade zum Leben erwecken', 'pflicht', 90, 3, 'Link / QR-Code', 'Läuft über 2 Termine à 90 Minuten.']
];

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(PFAD);

  const bausteine = workbook.getWorksheet('Bausteine');
  const kopfB = bausteine.getRow(1).values.slice(1).map(String);
  const spalteB = (name) => kopfB.findIndex((k) => k.trim() === name) + 1;
  const cId = spalteB('id'), cTitel = spalteB('titel'), cGn = spalteB('gelingensnachweis'), cGnSt = spalteB('gelingensnachweisStation');

  bausteine.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const id = String(row.getCell(cId).value || '');
    if (TITEL[id]) row.getCell(cTitel).value = TITEL[id];
    const eintrag = GELINGENSNACHWEIS[id];
    if (eintrag) {
      row.getCell(cGn).value = eintrag.text;
      if (eintrag.station !== null) row.getCell(cGnSt).value = eintrag.station;
    }
  });

  const stationen = workbook.getWorksheet('Stationen');
  for (const [baustein, nr, titel, art, minuten, niveau, material, hinweis] of STATIONEN) {
    stationen.addRow([baustein, nr, titel, art, minuten, niveau, material, hinweis]);
  }

  await workbook.xlsx.writeFile(PFAD);
  console.log('geschrieben: ' + STATIONEN.length + ' Stationen, ' + Object.keys(TITEL).length + ' Titel, ' + Object.keys(GELINGENSNACHWEIS).length + ' Gelingensnachweise');
}

main();
