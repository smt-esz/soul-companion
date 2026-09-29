// Einmal-Skript: traegt Stationen, Gelingensnachweis (und fehlende Baustein-Titel) aus den
// Bausteinuebersichten (WORD, SOUL-Ordner "SOUL Uebersicht Bausteine") in Jg5/Jg6/Jg7.xlsx ein.
// Nicht Teil des Builds, nach Gebrauch loeschbar.
//
// Herkunft: Pflicht/Wahl (Kreis-Symbole) und Schwierigkeit (Sterne) stammen aus den Grafiken
// der Dokumente. Schwebende Kreise stehen in den Dokumenten teils in der falschen Tabellenzeile;
// die Zuordnung ist ueber die tatsaechliche Seitenposition (Word) erfolgt. Stationen mit
// Buchstaben-/Dezimal-Unternummern (2.1, 4.2, 0 ...) sind fortlaufend durchnummeriert, die alte
// Nummer steht in Klammern im Titel. "2x90" ist als 180 Minuten mit Hinweis eingetragen.
// Ab Jgst. 7 bekommen Wahlstationen den Gymnasiasten-Hinweis (Leo, 24.09.2026).
//
// Nicht enthalten (offen): jg6-de-3 (zwei Lektuere-Alternativen), jg7-bio-2/3/4 (Dokument ohne
// Titel, Inhalt entspricht Jg6), Jg5 "Sexualitaet des Menschen" (kein Slot), Mathe Jg6 (fehlt).
import ExcelJS from 'exceljs';

const GYM_HINWEIS = 'Für Gymnasiasten ab Jgst. 7 Pflicht.';

// Titel nur eintragen, wenn im Blatt noch keiner steht
const TITEL_NEU = {
  'jg6-geo-5': 'Climate Co2llaboration',
  'jg7-en-1': 'The Magic Mirror',
  'jg7-geo-1': 'Orientierung auf der Erde'
};

// [text, station | null]; nur eintragen, wenn im Blatt noch nichts steht
const GELINGENSNACHWEIS = {
  'jg6-de-2': ['Eine eigene Fabel schreiben', null],
  'jg6-de-4': ['Journalistisches Schreibprojekt: Der Unfallbericht', null],
  'jg6-de-5': ['ein Sprichwort/eine Redensart erklären und eine Beispielgeschichte dazu schreiben', null],
  'jg6-en-2': ['design a collage on what Christmas means to you', 16],
  'jg6-en-3': ['give a report about a peacemaker', 16],
  'jg6-en-4': ['create a reading journal', null],
  'jg7-en-1': ['design a reading journal', 17],
  'jg5-bio-2': ['Jeweils ein Steckbrief zu einem Vertreter der Lurche und Kriechtiere', null],
  'jg5-bio-3': ['zeichnerisches Darstellen einer Feder', 3],
  'jg5-bio-4': ['Forschertagebuch – 2 Noten (Inhalt und Darstellung)', null],
  'jg5-de-2': ['Merksatzheft, Abschlusstest', null],
  'jg5-de-3': ['Buddybook zu den wichtigsten Regeln der Zeichensetzung', null],
  'jg5-de-5': ['Märchen oder Fantasiegeschichte schreiben (mit Note)', null],
  'jg5-de-4': ['Abschlussquiz (ohne Note)', null],
  'jg5-de-6': ['Komplexe Leistung – Papptheater, Textausschnitt lesen', null],
  'jg5-de-7': ['Ein eigenes Gedicht zu einer Jahreszeit verfassen', null],
  'jg5-en-1': ['eine Vokabelsammlung anlegen und fortführen', null],
  'jg5-en-2': ['ein Video erstellen, in dem du dich selbst vorstellst (mit Note)', null],
  'jg5-en-3': ['Brief schreiben, in dem über die Ferien berichtet wird (mit Note)', null],
  'jg5-en-4': ['write a diary entry about your last birthday party', null],
  'jg5-geo-1': ['Lapbook', null],
  'jg5-geo-2': ['Test Atlasführerschein', null],
  'jg5-geo-3': ['ein Spiel zum Thema Deutschland erstellen (Domino/Memory)', null],
  'jg5-geo-4': ['Stadt-Umland-Beziehung', 8],
  'jg6-bio-1': ['Bienen Comic (M11)', null],
  'jg6-bio-2': ['Herstellen eines Zellmodells', 8],
  'jg6-bio-3': ['Ein Waldtier in das System des Waldes einordnen', 13],
  'jg6-bio-4': ['Erstellen eines Lapbooks', null],
  'jg6-geo-2': ['Gelingensnachweis', 9],
  'jg6-geo-3': ['Reise durch Europa', 11],
  'jg6-geo-4': ['Wahlstationen Vulkan oder Faltengebirge (Station 10 oder 11)', null],
  'jg6-geo-5': ['Ein eigenes Projekt erstellen und in einem digitalen Showroom präsentieren', null],
  'jg7-geo-1': ['Anwenden des erlernten Wissens, um das ausgefallene Navigationssystem neu zu starten', 10]
};

// [baustein, nr, titel, art, minuten, niveau, material, hinweis]
const STATIONEN = [
  // jg6-de-2: Fabeln
  ['jg6-de-2', 1, 'Die Entstehung von Fabeln', 'pflicht', 20, 1, 'M1', ''],
  ['jg6-de-2', 2, 'Merkmale von Fabeln', 'pflicht', 20, 1, '—', ''],
  ['jg6-de-2', 3, 'Fabelhafte Tiere', 'pflicht', 60, 1, 'A1, LB, Laptop', ''],
  ['jg6-de-2', 4, 'Der Rabe und der Fuchs – Textverständnis', 'wahl', 30, 1, 'LB', ''],
  ['jg6-de-2', 5, 'Der Aufbau einer Fabel (2 Seiten)', 'pflicht', 80, 2, 'M2, M3', ''],
  ['jg6-de-2', 6, 'Das Präteritum in Fabeln', 'pflicht', 45, 2, '—', ''],
  ['jg6-de-2', 7, 'Wörtliche Rede in Fabeln', 'pflicht', 40, 2, 'Laptop, A2 oder A3', ''],
  ['jg6-de-2', 8, 'Die Lehren einer Fabel', 'pflicht', 30, 3, 'Laptop', ''],
  ['jg6-de-2', 9, 'Eine Fabel untersuchen', 'pflicht', 90, 3, 'M4, A4, Laptop', ''],
  ['jg6-de-2', 10, 'Der Drache und der Hase', 'wahl', 20, 2, 'Laptop', ''],
  ['jg6-de-2', 11, 'Fabelhafter Kreativworkshop', 'pflicht', 180, 3, 'Laptop, A5–A14', 'Läuft über 2 Termine à 90 Minuten.'],
  ['jg6-de-2', 12, 'Teste dich und dein fabelhaftes Wissen', 'wahl', 40, 3, 'A15, Laptop', ''],
  ['jg6-de-2', 13, 'Eine fabelhafte Geschichte', 'pflicht', 90, 3, '—', ''],

  // jg6-de-4: Beschreiben und Berichten
  ['jg6-de-4', 1, 'Personenbeschreibung', 'pflicht', 90, 2, 'A1, M1', ''],
  ['jg6-de-4', 2, 'Wortarten-Check: Das Adjektiv', 'wahl', 20, 1, 'A2, A3', ''],
  ['jg6-de-4', 3, 'Ermittlung läuft – Das Phantombild', 'pflicht', 60, 2, 'M2, Laptop', ''],
  ['jg6-de-4', 4, 'Wortarten-Check: Die Präposition', 'wahl', 30, 1, 'A4, A5', ''],
  ['jg6-de-4', 5, 'Wegbeschreibung', 'pflicht', 60, 2, 'A6, M3, M4', ''],
  ['jg6-de-4', 6, 'Vorgangsbeschreibung', 'pflicht', 30, 1, 'M5, M6', ''],
  ['jg6-de-4', 7, 'Die Sprache der Profis', 'pflicht', 40, 2, 'Leporello, A7, M7, M8', ''],
  ['jg6-de-4', 8, 'Aktiv und Passiv', 'pflicht', 30, 2, 'A8, A9, M9, M10', ''],
  ['jg6-de-4', 9, 'Mein Kochrezept', 'pflicht', 45, 3, 'Leporello, M11', ''],
  ['jg6-de-4', 10, 'Zeitformen-Check', 'wahl', 15, 1, 'Laptop', ''],
  ['jg6-de-4', 11, 'Checkliste eines Unfallbericht', 'pflicht', 15, 1, '—', ''],
  ['jg6-de-4', 12, 'W-Fragen – Reporter-Prüfung', 'pflicht', 45, 2, 'A11, A12', ''],
  ['jg6-de-4', 13, 'Von Unfällen berichten', 'pflicht', 60, 3, 'M12', ''],
  ['jg6-de-4', 14, 'ESZ ermittelt – Mein Unfallbericht', 'pflicht', 180, 3, 'M13', ''],

  // jg6-de-5: Redewendungen und Sprichwörter
  ['jg6-de-5', 1, 'Wörterschmiede 1', 'pflicht', 30, 1, 'Heft', ''],
  ['jg6-de-5', 2, 'Wörterschmiede 2', 'pflicht', 30, 2, 'Heft', ''],
  ['jg6-de-5', 3, 'Wortbildung kreativ', 'wahl', 10, 2, 'Heft', ''],
  ['jg6-de-5', 4, 'Fremd-, Erb- und Lehnwörter', 'pflicht', 60, 2, 'Lehrbuch, Laptop', ''],
  ['jg6-de-5', 5, 'Sprichwörter und Redewendungen', 'pflicht', 45, 2, 'Laptop, A1', ''],
  ['jg6-de-5', 6, 'Bedeutungen von Redewendungen', 'pflicht', 30, 2, 'Spiel \'Redewendungen\'', ''],
  ['jg6-de-5', 7, 'Redewendungen kennen', 'wahl', 60, 3, 'Memorykarten, Spiel \'das große Quiz\'', ''],
  ['jg6-de-5', 8, 'Gelingensnachweis: kreatives Schreiben', 'pflicht', 90, 2, 'Redensart-Karte, A2, Laptop', ''],

  // jg6-en-2: What Is Christmas About?
  ['jg6-en-2', 1, 'A Christmas Card', 'pflicht', 35, 1, 'M1', ''],
  ['jg6-en-2', 2, 'The Yellow Elf', 'pflicht', 55, 2, 'A1/A2, dictionary, schoolbook, laptop', ''],
  ['jg6-en-2', 3, 'Christmas Vocabulary Booklet', 'pflicht', 50, 1, 'M2, M3, DIN-A3 Papier', ''],
  ['jg6-en-2', 4, 'Christmas Trees', 'pflicht', 40, 1, 'M4, Christmas booklet', ''],
  ['jg6-en-2', 5, 'Christmas Carols', 'wahl', 35, 3, 'dictionary, laptop, Christmas booklet', ''],
  ['jg6-en-2', 6, 'Christmas Animals', 'pflicht', 90, 3, 'A3, M5, laptop, dictionary', ''],
  ['jg6-en-2', 7, 'Christmas Presents', 'pflicht', 90, 3, 'A4, dictionary, laptop', ''],
  ['jg6-en-2', 8, 'The Day Before Christmas', 'pflicht', 40, 2, 'A5, A6, laptop, Christmas booklet', ''],
  ['jg6-en-2', 9, 'The Night before Christmas', 'pflicht', 80, 2, 'A6 (completed), A7', ''],
  ['jg6-en-2', 10, 'Getting Around Who-Ville', 'wahl', 30, 2, 'A8, M6', ''],
  ['jg6-en-2', 11, 'How the Grinch Stole Christmas', 'pflicht', 45, 1, 'A9, dictionary, Christmas booklet, laptop', ''],
  ['jg6-en-2', 12, 'The Grinch and Cindy-Lou', 'pflicht', 60, 3, 'Laptop, dictionary', ''],
  ['jg6-en-2', 13, 'The Grinch\'s Christmas', 'pflicht', 40, 2, '', ''],
  ['jg6-en-2', 14, 'The Grinch Changes His Face', 'pflicht', 30, 1, 'dictionary', ''],
  ['jg6-en-2', 15, 'What Christmas is Actually About', 'pflicht', 60, 3, 'dictionary', ''],
  ['jg6-en-2', 16, 'That\'s Christmas For Me', 'pflicht', 90, 2, 'M7, craft material', ''],

  // jg6-en-3: Peacemakers
  ['jg6-en-3', 1, 'What Are Peacemakers?', 'pflicht', 60, 2, 'M1', ''],
  ['jg6-en-3', 2, 'Describing Peaceful People', 'pflicht', 40, 1, 'M2, A1, text markers', ''],
  ['jg6-en-3', 3, 'Talking About Peace', 'pflicht', 25, 1, 'M3', ''],
  ['jg6-en-3', 4, 'Important Peacemakers', 'pflicht', 60, 1, 'M4, a laptop', ''],
  ['jg6-en-3', 5, 'Martin Luther King, Jr.', 'pflicht', 75, 2, 'M5, A2, dictionary', ''],
  ['jg6-en-3', 6, 'A Peacemaker Timeline', 'wahl', 25, 1, 'M5, A3, scissors, glue', ''],
  ['jg6-en-3', 7, '“I Have a Dream…”', 'pflicht', 30, 1, 'A4, glue, scissors', ''],
  ['jg6-en-3', 8, 'Songs of Peace', 'pflicht', 45, 1, 'M6, A5, laptop, headphones', ''],
  ['jg6-en-3', 9, 'Mahatma Gandhi', 'pflicht', 75, 3, 'M7, A6', ''],
  ['jg6-en-3', 10, 'Words of Peace', 'wahl', 45, 1, 'A7, M7, scissors, glue', ''],
  ['jg6-en-3', 11, 'Problems in South Africa', 'pflicht', 75, 3, 'laptop', ''],
  ['jg6-en-3', 12, 'Nelson Mandela', 'pflicht', 75, 3, 'A8, M8, a dictionary', ''],
  ['jg6-en-3', 13, 'Activist Word Search', 'wahl', 30, 1, 'A9', ''],
  ['jg6-en-3', 14, 'A Long Walk to Freedom', 'pflicht', 40, 1, 'A10', ''],
  ['jg6-en-3', 15, 'Peaceful Heroes', 'wahl', 45, 1, 'A11, scissors', ''],
  ['jg6-en-3', 16, 'Young Peacemakers Today', 'pflicht', 90, 2, 'M9 or M10, A12 or A13', ''],

  // jg6-en-4: Pip and the Umbrella Room
  ['jg6-en-4', 1, 'Judging a Book by Its Cover', 'pflicht', 45, 1, 'M1, M2', ''],
  ['jg6-en-4', 2, 'Getting Started: How to Team Reader (2.1)', 'pflicht', 20, 1, 'A1', ''],
  ['jg6-en-4', 3, 'Getting Started: My Reading Journal (2.2)', 'pflicht', 10, 1, '', ''],
  ['jg6-en-4', 4, 'Strange Faces at Victoria Station', 'pflicht', 80, 2, 'A2, laptop/iPad', ''],
  ['jg6-en-4', 5, 'A Day Out in London', 'wahl', 45, 2, 'M3, laptop/iPad', ''],
  ['jg6-en-4', 6, 'Looking for a Lost Umbrella', 'pflicht', 60, 2, 'A3', ''],
  ['jg6-en-4', 7, 'Silly Goose', 'pflicht', 60, 2, 'A4', ''],
  ['jg6-en-4', 8, 'Stubborn Goat', 'pflicht', 60, 3, 'A5', ''],
  ['jg6-en-4', 9, 'Greedy Pig', 'pflicht', 60, 1, 'A6', ''],
  ['jg6-en-4', 10, 'Mrs Morgan and the Evil Witch', 'pflicht', 80, 2, 'A7', ''],
  ['jg6-en-4', 11, 'Taking a Closer Look: Mrs Morgan', 'wahl', 40, 3, 'A8', ''],
  ['jg6-en-4', 12, 'Goose Tale', 'pflicht', 60, 2, 'A9', ''],
  ['jg6-en-4', 13, 'Escape Goat', 'pflicht', 60, 3, 'A10', ''],
  ['jg6-en-4', 14, 'Stealth Pig', 'pflicht', 60, 1, 'A11', ''],
  ['jg6-en-4', 15, 'Umbrella Action Team', 'pflicht', 40, 3, 'A12', ''],
  ['jg6-en-4', 16, 'Pip\'s Plan', 'pflicht', 120, 3, '', ''],
  ['jg6-en-4', 17, 'The Last Umbrella', 'pflicht', 160, 3, 'A13, A14, or A15, M4', ''],

  // jg7-en-1: The Magic Mirror
  ['jg7-en-1', 1, 'What\'s a magic mirror?', 'pflicht', 45, 1, 'A1', ''],
  ['jg7-en-1', 2, 'Judging a Book by Its Cover', 'pflicht', 15, 1, 'your book', ''],
  ['jg7-en-1', 3, 'Getting Started: How to Team Reader (2.1)', 'pflicht', 20, 1, 'A2', ''],
  ['jg7-en-1', 4, 'Getting Started: My Reading Journal (2.2)', 'pflicht', 10, 1, '', ''],
  ['jg7-en-1', 5, 'The first part of the story', 'pflicht', 90, 1, 'a laptop, A3', ''],
  ['jg7-en-1', 6, 'In the museum (4.1)', 'pflicht', 70, 1, 'A4, A5', ''],
  ['jg7-en-1', 7, 'Museums (4.2)', 'wahl', 90, 2, 'a laptop', GYM_HINWEIS],
  ['jg7-en-1', 8, 'Travelling back in time – Ruby', 'pflicht', 90, 2, 'A6', ''],
  ['jg7-en-1', 9, 'Travelling back in time – Noah', 'pflicht', 90, 1, 'A7', ''],
  ['jg7-en-1', 10, 'Travelling back in time – Layla', 'pflicht', 90, 3, 'A8', ''],
  ['jg7-en-1', 11, 'In the Tower', 'pflicht', 120, 1, 'A9', ''],
  ['jg7-en-1', 12, 'Run, Ruby, Run!', 'pflicht', 90, 2, 'A10', ''],
  ['jg7-en-1', 13, 'Visiting the market', 'pflicht', 90, 1, 'A11', ''],
  ['jg7-en-1', 14, 'Medieval markets (10.1)', 'wahl', 50, 2, 'a laptop', GYM_HINWEIS],
  ['jg7-en-1', 15, 'How to defeat the Spanish', 'pflicht', 90, 3, 'A12', ''],
  ['jg7-en-1', 16, 'Getting back with a surprise', 'pflicht', 90, 2, 'A13 / A 14 / A15', ''],
  ['jg7-en-1', 17, 'Leaving the Magic Mirror behind', 'pflicht', 180, 3, 'A16 / A17 / A18, M4, M5', ''],

  // jg5-bio-2: Lurche und Kriechtiere
  ['jg5-bio-2', 1, 'Vom Wasser zum Land: Entwicklung der Lurche', 'pflicht', 45, 2, 'A1, M1, Laptop', ''],
  ['jg5-bio-2', 2, 'Bau der Froschlurche', 'pflicht', 40, 2, 'A2, Lehrbuch', ''],
  ['jg5-bio-2', 3, 'Atmung der Lurche', 'pflicht', 40, 3, 'A3, M2, Lehrbuch, Laptop', ''],
  ['jg5-bio-2', 4, 'Fortpflanzung der Lurche', 'pflicht', 60, 2, 'Glas-, Holzmodell, M3, Folienstift, A4, A5, M4, Lehrbuch', ''],
  ['jg5-bio-2', 5, 'Trockenlufttiere', 'pflicht', 45, 2, 'Laptop, Schlangenhaut, Lupe', ''],
  ['jg5-bio-2', 6, 'Bau der Kriechtiere', 'pflicht', 40, 2, 'A6, A7, Laptop, Lehrbuch', ''],
  ['jg5-bio-2', 7, 'Atmung der Kriechtiere', 'pflicht', 40, 3, 'M5, A8 oder A9', ''],
  ['jg5-bio-2', 8, 'Fortpflanzung der Kriechtiere', 'pflicht', 60, 2, 'A10, M6, Laptop, Lehrbuch', ''],
  ['jg5-bio-2', 9, 'Beutefang der Kriechtiere', 'pflicht', 45, 2, 'A11, Laptop', ''],
  ['jg5-bio-2', 10, 'Vielfalt der Lurche und Kriechtiere', 'pflicht', 240, 3, 'M7, Laptop, buntes Papier, Bilder', ''],
  ['jg5-bio-2', 11, 'Dinosaurier-Memory', 'wahl', 30, 2, 'M8, Dino-Memory, Lehrbuch', ''],
  ['jg5-bio-2', 12, 'Online Übungen Sofatutor', 'wahl', 60, 2, 'Laptop', ''],

  // jg5-bio-3: Vögel in ihren Lebensräumen
  ['jg5-bio-3', 1, 'Merkmale der Vögel', 'pflicht', 45, 1, 'Hefter, Lehrbuch', ''],
  ['jg5-bio-3', 2, 'Vielfalt der Vögel', 'pflicht', 45, 2, 'A1, Hefter, Lehrbuch, Laptop', ''],
  ['jg5-bio-3', 3, 'Körperbedeckung der Vögel', 'pflicht', 90, 2, 'Vogelfeder, Lupe, Pipette, Wasser, Becherglas, A2, M1, Hefter, Lehrbuch, A4-Blatt weiß', ''],
  ['jg5-bio-3', 4, 'Anpassungen an den Flug', 'pflicht', 45, 2, 'A3, Lehrbuch, Hefter', ''],
  ['jg5-bio-3', 5, 'Schnäbel und Ernährung', 'pflicht', 45, 3, 'Laptop, Hefter, A4', ''],
  ['jg5-bio-3', 6, 'Fortpflanzung der Vögel', 'pflicht', 90, 2, 'Laptop, A5, M3, Lehrbuch, Hefter', ''],
  ['jg5-bio-3', 7, 'Untersuchen eines Hühnereies', 'pflicht', 90, 3, 'A6, Hefter', ''],
  ['jg5-bio-3', 8, 'Balzverhalten und Brutpflege', 'pflicht', 90, 3, 'A7, Lehrbuch, Hefter, Laptop', ''],
  ['jg5-bio-3', 9, 'Schutz heimischer Vogelarten', 'pflicht', 45, 3, 'Lehrbuch, Laptop, Hefter', ''],
  ['jg5-bio-3', 10, 'Vogelflug und Flugversuche', 'wahl', 45, 3, 'M4, Lehrbuch, Büroklammern, jeweils 1 Blatt A3, A4, A5, Hefter', ''],
  ['jg5-bio-3', 11, 'Vogelstimmen', 'wahl', 45, 3, 'Laptop, Hefter', ''],
  ['jg5-bio-3', 12, 'Vertiefende Übungen Sofatutor', 'wahl', 90, 2, 'Laptop', ''],

  // jg5-bio-4: Säugetiere in ihren Lebensräumen
  ['jg5-bio-4', 1, 'Vielfalt der Säugetiere', 'pflicht', 80, 3, 'A1, M1, M2, weißes A-4 Blatt, Aktendulli', ''],
  ['jg5-bio-4', 2, 'Einheimische Wildtiere', 'wahl', 20, 2, 'Karten- Lesespiel', ''],
  ['jg5-bio-4', 3, 'Das Fell der Säugetiere', 'pflicht', 45, 3, 'Forschertagebuch, Fellproben, Lupe', ''],
  ['jg5-bio-4', 4, 'Merkmale der Säugetiere', 'pflicht', 45, 2, 'A2, M3, Laptop', ''],
  ['jg5-bio-4', 5, 'Körperbau der Säugetiere', 'pflicht', 45, 2, 'A3, Lehrbuch, Laptop', ''],
  ['jg5-bio-4', 6, 'Die Katze – ein Jäger', 'pflicht', 80, 3, 'Laptop, Lehrbuch, Forschertagebuch', ''],
  ['jg5-bio-4', 7, 'Rudelverhalten bei Hunden und Wölfen', 'wahl', 60, 2, 'M4, Lehrbuch, Laptop, Folienstift', ''],
  ['jg5-bio-4', 8, 'Verhaltensweisen von Katzen und Hunden', 'wahl', 45, 2, 'Laptop', ''],
  ['jg5-bio-4', 9, 'Anpassungen Lebensräumen', 'pflicht', 45, 2, 'A4, M5, Laptop, Folienstift', ''],
  ['jg5-bio-4', 10, 'Gebisse der Säugetiere', 'pflicht', 80, 3, 'A5, M6, M7, Forschertagebuch, Schädelmodelle', ''],
  ['jg5-bio-4', 11, 'Atmung der Säugetiere', 'pflicht', 30, 2, 'A6, Laptop', ''],
  ['jg5-bio-4', 12, 'Artenschutz Säugetiere', 'pflicht', 60, 3, 'M8, Laptop, Forschertagebuch', ''],
  ['jg5-bio-4', 13, 'Artgerechte Haltung von Hunden', 'wahl', 45, 3, 'A7, Lehrbuch', ''],
  ['jg5-bio-4', 14, 'Wissenswertes über Capybaras', 'wahl', 45, 1, 'A8, Laptop', ''],

  // jg5-de-2: Rechtschreibung
  ['jg5-de-2', 1, 'Deckblatt gestalten', 'pflicht', 30, 1, 'zwei leere A5-Blätter', ''],
  ['jg5-de-2', 2, 'Schreiben nach Silben', 'pflicht', 80, 2, 'M1, A1, Merksatzheft', ''],
  ['jg5-de-2', 3, 'Silben-Uno', 'wahl', 20, 2, 'Wortkarten', ''],
  ['jg5-de-2', 4, 'Wortfamilien (2 Seiten)', 'pflicht', 50, 2, 'Merksatzheft', ''],
  ['jg5-de-2', 5, 'Gleich und ähnlich klingende Laute', 'pflicht', 80, 2, 'Merksatzheft, A2, LB', ''],
  ['jg5-de-2', 6, 'Übungen: Gleich und ähnlich klingende Laute', 'wahl', 60, 2, 'A3 oder LB', ''],
  ['jg5-de-2', 7, 'Kurze Vokale (2 Seiten)', 'pflicht', 90, 2, 'Merksatzheft, M2, M3', ''],
  ['jg5-de-2', 8, 'Lange Vokale', 'pflicht', 90, 2, 'Merksatzheft, M4', ''],
  ['jg5-de-2', 9, 's-ss-ß', 'pflicht', 60, 2, 'Merksatzheft, LB, M5, A4, Laptop', ''],
  ['jg5-de-2', 10, 'Übungen: Kurze und lange Vokale', 'wahl', 70, 2, 'A5, M6, Buddy Book', ''],
  ['jg5-de-2', 11, 'Groß- und Kleinschreibung', 'pflicht', 60, 2, 'M7, M8, Laptop', ''],
  ['jg5-de-2', 12, 'Gelingensnachweis: Abschlusstest', 'pflicht', 30, 2, '—', ''],

  // jg5-de-3: Zeichensetzung
  ['jg5-de-3', 1, 'Bevor es losgeht…', 'pflicht', 40, 2, 'M1', ''],
  ['jg5-de-3', 2, 'Satzschlusszeichen', 'pflicht', 20, 1, 'Buddybook-Vorlage', ''],
  ['jg5-de-3', 3, 'Übungen zu Satzschlusszeichen', 'wahl', 30, 1, 'M2', ''],
  ['jg5-de-3', 4, 'Kommasetzung I', 'pflicht', 30, 2, 'Lehrbuch', ''],
  ['jg5-de-3', 5, 'Kommasetzung II', 'pflicht', 45, 2, 'M3, Lehrbuch, Buddybook', ''],
  ['jg5-de-3', 6, 'Kommas können Inhalte verändern', 'pflicht', 15, 1, 'Buddybook', ''],
  ['jg5-de-3', 7, 'Satzzeichen bei wörtlicher Rede', 'pflicht', 80, 2, 'A1, M4, Lehrbuch, Buddybook', ''],
  ['jg5-de-3', 8, 'Satzzeichen bei wörtlicher Rede', 'wahl', 30, 3, '—', ''],
  ['jg5-de-3', 9, 'Zusammengesetzte Sätze', 'pflicht', 70, 3, 'M5, A2, Buddybook, Schere', ''],

  // jg5-de-5: Märchenhaftes und Unglaubliches
  ['jg5-de-5', 1, 'Die Merkmale von Märchen', 'pflicht', 45, 1, 'A1, Lehrbuch', ''],
  ['jg5-de-5', 2, 'Der Aufbau von Märchen', 'pflicht', 45, 2, 'Laptop', ''],
  ['jg5-de-5', 3, 'Die Rolle der Figuren in Märchen', 'pflicht', 60, 2, 'A2', ''],
  ['jg5-de-5', 4, 'Die Sprache der Märchen', 'pflicht', 30, 3, '—', ''],
  ['jg5-de-5', 5, 'Die Rolle von Lehren in Märchen', 'pflicht', 20, 3, '—', ''],
  ['jg5-de-5', 6, 'Märchen in verschiedenen Kulturen', 'wahl', 90, 1, 'Laptop', ''],
  ['jg5-de-5', 7, 'Märchen im Wandel der Zeit', 'wahl', 60, 2, 'Laptop', ''],
  ['jg5-de-5', 8, 'Einführung in Fantasiegeschichten', 'pflicht', 60, 1, 'M1', ''],
  ['jg5-de-5', 9, 'Fantasiewelten – Elemente erschaffen', 'pflicht', 45, 2, 'eventuell M2', ''],
  ['jg5-de-5', 10, 'Erzähltechniken in Märchen und Fantasiegeschichten', 'pflicht', 30, 3, 'A3', ''],
  ['jg5-de-5', 11, 'Kreatives Schreiben', 'pflicht', 90, 3, 'eventuell A4', ''],
  ['jg5-de-5', 12, 'Märchen und Fantasiegeschichten inszenieren', 'wahl', 120, 3, '—', ''],
  ['jg5-de-5', 13, 'Illustrationen und ihre Bedeutung', 'wahl', 45, 3, 'M3', ''],
  ['jg5-de-5', 14, 'Märchenrätsel', 'wahl', 30, 3, 'M4', ''],
  ['jg5-de-5', 15, '… und wenn sie nicht gestorben sind…', 'wahl', 45, 2, 'Laptop', ''],
  ['jg5-de-5', 16, 'Märchen-Kahoot', 'wahl', 20, 2, 'Laptop', ''],

  // jg5-de-4: Arbeit mit dem Wörterbuch
  ['jg5-de-4', 1, 'Entstehungsgeschichte und Bedeutung des Dudens', 'pflicht', 30, 1, 'M1, Duden', ''],
  ['jg5-de-4', 2, 'Wörter alphabetisch sortieren (2.1)', 'pflicht', 20, 2, '—', ''],
  ['jg5-de-4', 3, 'Wörter alphabetisch sortieren (2.2)', 'pflicht', 20, 2, 'Duden', ''],
  ['jg5-de-4', 4, 'Wörter im Wörterbuch finden', 'pflicht', 30, 3, 'Duden', ''],
  ['jg5-de-4', 5, 'Die Bedeutung von Wörtern herausfinden', 'pflicht', 30, 3, 'Duden', ''],
  ['jg5-de-4', 6, 'Rechtschreibkontrolle', 'pflicht', 20, 1, 'Duden', ''],
  ['jg5-de-4', 7, 'Verben und Adjektive finden', 'pflicht', 30, 3, 'Duden', ''],
  ['jg5-de-4', 8, 'Abschluss und Quiz', 'pflicht', 15, 3, 'A1, Duden', ''],

  // jg5-de-6: Lektüre – Rico, Oskar und die Tieferschatten
  ['jg5-de-6', 1, 'Beschreibung des Buchcovers', 'pflicht', 45, 1, 'Lektüre-Buch', ''],
  ['jg5-de-6', 2, 'Eine Figur beschreiben – Rico', 'pflicht', 90, 2, 'Lektüre-Buch, A1', ''],
  ['jg5-de-6', 3, 'Ein erster Eindruck', 'pflicht', 60, 2, 'Lektüre-Buch', ''],
  ['jg5-de-6', 4, 'Der Nachbar Simon Westbühl und das einsturzgefährdete Haus', 'pflicht', 90, 3, 'Lektüre-Buch', ''],
  ['jg5-de-6', 5, 'Mister 2000 und die Tieferschatten', 'pflicht', 90, 1, 'Lektüre-Buch', ''],
  ['jg5-de-6', 6, 'Rico Ermittlungen – Kommt er Mister 2000 auf die Spur?', 'pflicht', 90, 2, 'Lektüre-Buch', ''],
  ['jg5-de-6', 7, 'Ricos Ermittlungen – Falscher Verdacht?', 'pflicht', 90, 3, 'Lektüre-Buch', ''],
  ['jg5-de-6', 8, 'Oskars Bericht', 'pflicht', 90, 1, 'Lektüre-Buch', ''],
  ['jg5-de-6', 9, 'Schöne Aussichten', 'pflicht', 30, 2, 'Lektüre-Buch', ''],
  ['jg5-de-6', 10, 'Komplexe Leistung', 'pflicht', 120, 3, 'Lektüre-Buch, Bastelmaterial', ''],
  ['jg5-de-6', 11, 'Was hältst du von Rico?', 'wahl', 45, 2, 'Lektüre-Buch', ''],
  ['jg5-de-6', 12, 'Die Freundschaft zwischen Rico und Oskar', 'wahl', 45, 2, 'Lektüre-Buch', ''],
  ['jg5-de-6', 13, 'Alternatives Buchcover', 'wahl', 45, 1, 'Lektüre-Buch', ''],
  ['jg5-de-6', 14, 'Wie geht es weiter?', 'wahl', 45, 3, 'Lektüre-Buch', ''],

  // jg5-de-7: Gedichte im Jahreskreis
  ['jg5-de-7', 1, 'Jahreszeiten erkennen', 'pflicht', 45, 1, 'Lehrbuch, A1, Laptop', ''],
  ['jg5-de-7', 2, 'Merkmale und Aufbau Gedichte', 'pflicht', 25, 1, 'M1, A2', ''],
  ['jg5-de-7', 3, 'Die Form von Gedichten untersuchen', 'pflicht', 45, 2, 'A3', ''],
  ['jg5-de-7', 4, 'Gedichtformen erkennen', 'pflicht', 60, 2, 'M2, A4, Laptop', ''],
  ['jg5-de-7', 5, 'Gedichte inhaltlich verstehen – 1', 'pflicht', 45, 3, 'Lehrbuch, A5, Laptop', ''],
  ['jg5-de-7', 6, 'Gedichte inhaltlich verstehen – 2', 'pflicht', 40, 2, 'Lehrbuch', ''],
  ['jg5-de-7', 7, 'Gedichte inhaltlich verstehen – 3', 'wahl', 20, 1, 'Lehrbuch', ''],
  ['jg5-de-7', 8, 'Sprachliche Bilder', 'pflicht', 60, 2, 'A6, Laptop', ''],
  ['jg5-de-7', 9, 'Sprachliche Bilder – Personifikation', 'pflicht', 20, 1, 'Laptop', ''],
  ['jg5-de-7', 10, 'Sprachliche Bilder – Vergleich', 'pflicht', 20, 1, 'A7', ''],
  ['jg5-de-7', 11, 'Ein eigenes Gedicht verfassen – 1', 'pflicht', 45, 3, 'M3, A8, Laptop', ''],
  ['jg5-de-7', 12, 'Ein eigenes Gedicht verfassen – 2', 'pflicht', 45, 3, 'M3, A8, A9', ''],
  ['jg5-de-7', 13, 'Ein Gedicht überarbeiten', 'pflicht', 45, 3, 'A9', ''],
  ['jg5-de-7', 14, 'Ein Gedicht vortragen', 'wahl', 60, 2, 'M4', ''],

  // jg5-en-1: ENG-Racers
  ['jg5-en-1', 1, 'Understanding tasks', 'pflicht', 5, 1, '', ''],
  ['jg5-en-1', 2, 'Meet the ENG-Racers', 'pflicht', 25, 1, '', ''],
  ['jg5-en-1', 3, 'The ABC-Circuit', 'pflicht', 30, 1, 'Laptop, A1 / A2', ''],
  ['jg5-en-1', 4, 'Dictionary Driving Lesson', 'wahl', 15, 1, 'M1, Wörterbuch', ''],
  ['jg5-en-1', 5, 'Page Rage', 'pflicht', 10, 2, 'A3, 2 Wörterbücher', ''],
  ['jg5-en-1', 6, 'Shortcuts', 'pflicht', 10, 2, 'M2, Wörterbuch', ''],
  ['jg5-en-1', 7, 'Word-Circuit', 'pflicht', 10, 2, 'Wörterbuch', ''],
  ['jg5-en-1', 8, 'Pimp your style', 'wahl', 20, 2, 'M3, Wörterbuch', ''],
  ['jg5-en-1', 9, 'It\'s Electric – Words and their meanings', 'pflicht', 45, 3, 'M4, A4', ''],
  ['jg5-en-1', 10, 'Book Rally', 'pflicht', 25, 2, 'Schulbuch', ''],
  ['jg5-en-1', 11, 'Phrasal Verbs in Word Webs', 'pflicht', 60, 3, 'Wörterbuch, A5, M5', ''],
  ['jg5-en-1', 12, 'Words in Pictures', 'wahl', 60, 3, 'M6, A6, Wörterbuch, Lehrbuch', ''],
  ['jg5-en-1', 13, 'Parking Words', 'pflicht', 80, 3, 'Lehrbuch, Laptop, A7, M7/8', ''],
  ['jg5-en-1', 14, 'My Vocabulary – on the long run', 'pflicht', 70, 3, 'Wörterbuch', ''],

  // jg5-en-2: Welcome to My World
  ['jg5-en-2', 1, 'Me, My Body & My Clothes', 'pflicht', 45, 2, 'A1 / A2', ''],
  ['jg5-en-2', 2, 'My Hobbies', 'pflicht', 30, 1, 'vocabulary folder', ''],
  ['jg5-en-2', 3, 'Who Belongs to My Family?', 'pflicht', 65, 2, 'M1 / M2', ''],
  ['jg5-en-2', 4, 'Sunday Lunch', 'wahl', 30, 2, 'English book', ''],
  ['jg5-en-2', 5, 'Food & Drink', 'pflicht', 50, 3, 'English book, M3, A3 or A4', ''],
  ['jg5-en-2', 6, 'Our House – My Bedroom', 'pflicht', 40, 2, 'M4, empty piece of paper', ''],
  ['jg5-en-2', 7, 'Study Skills: Mind Maps', 'wahl', 30, 2, 'English book', ''],
  ['jg5-en-2', 8, 'My Day at Home', 'pflicht', 30, 1, 'English book', ''],
  ['jg5-en-2', 9, 'My Hometown', 'wahl', 30, 2, 'empty piece of paper', ''],
  ['jg5-en-2', 10, 'GEN: Your Task', 'pflicht', 60, 3, 'M5, a camera (laptop)', ''],

  // jg5-en-3: Talking About the Holidays
  ['jg5-en-3', 1, 'What do you do at the weekend', 'pflicht', 40, 1, 'book, M1', ''],
  ['jg5-en-3', 2, 'Where were you?', 'pflicht', 40, 2, 'book, M2', ''],
  ['jg5-en-3', 3, 'The basketball match', 'pflicht', 30, 2, 'book', ''],
  ['jg5-en-3', 4, 'Where did you travel to?', 'wahl', 30, 1, 'laptop, A1', ''],
  ['jg5-en-3', 5, 'How did you travel there?', 'pflicht', 20, 2, 'vocabulary folder', ''],
  ['jg5-en-3', 6, 'What did you do in Plymouth?', 'pflicht', 30, 2, 'book, laptop', ''],
  ['jg5-en-3', 7, 'What was the weather like?', 'pflicht', 55, 2, 'book, M3', ''],
  ['jg5-en-3', 8, 'What is London like?', 'pflicht', 20, 2, 'laptop', ''],
  ['jg5-en-3', 9, 'Holiday logicals', 'wahl', 25, 2, 'A2 or A3 or A4', ''],
  ['jg5-en-3', 10, 'How were your holidays?', 'pflicht', 30, 3, 'A5', ''],
  ['jg5-en-3', 11, 'What did you do in your holidays?', 'pflicht', 20, 2, 'A6 or A7', ''],
  ['jg5-en-3', 12, 'How to write a letter', 'wahl', 30, 1, 'German folder, M4', ''],
  ['jg5-en-3', 13, 'Your task', 'pflicht', 30, 3, 'a piece of paper', ''],

  // jg5-en-4: Party Star
  ['jg5-en-4', 1, 'Magazine Cover', 'pflicht', 15, 1, 'En folder', ''],
  ['jg5-en-4', 2, 'Susy\'s Birthday', 'pflicht', 60, 2, 'En folder, M1', ''],
  ['jg5-en-4', 3, 'Party Outfits', 'wahl', 25, 1, 'En folder, M2', ''],
  ['jg5-en-4', 4, 'Finger Food', 'wahl', 40, 2, 'En folder, M3', ''],
  ['jg5-en-4', 5, 'DIY: A Birthday Leporello', 'wahl', 50, 2, 'Paper strip, pens/pencils', ''],
  ['jg5-en-4', 6, 'Party Game I', 'wahl', 25, 2, 'M4.1, M4.2', ''],
  ['jg5-en-4', 7, 'Star Interviews', 'pflicht', 50, 3, 'En folder, teachers', ''],
  ['jg5-en-4', 8, 'DJ IVie\'s Party Song', 'pflicht', 60, 2, 'Laptop, En book, En folder', ''],
  ['jg5-en-4', 9, 'Party Games II', 'pflicht', 40, 1, 'M5, En folder', ''],
  ['jg5-en-4', 10, 'Birthday Presents', 'pflicht', 70, 2, 'En folder, A1, A2', ''],
  ['jg5-en-4', 11, 'The Day after the Party', 'pflicht', 25, 1, 'En folder, M6', ''],
  ['jg5-en-4', 12, 'Dear Diary', 'pflicht', 40, 3, 'Laptop, En folder', ''],

  // jg5-geo-1: Die Erde
  ['jg5-geo-1', 1, 'Arbeitsplatz einrichten', 'pflicht', 15, 1, 'A3-Papier, Kopiervorlage Schere, Kleber, Stifte', ''],
  ['jg5-geo-1', 2, 'Kontinente und Ozeane', 'pflicht', 30, 1, 'M1, A1, Laptop, Lehrbuch', ''],
  ['jg5-geo-1', 3, 'Landschaftsformen der Erde', 'pflicht', 30, 1, 'A2, A3', ''],
  ['jg5-geo-1', 4, 'Die Erde – Die inneren Schichten', 'pflicht', 45, 2, 'A4, A5, M2', ''],
  ['jg5-geo-1', 5, 'Unser Sonnensystem', 'pflicht', 60, 2, 'A6, Laptop, Lehrbuch', ''],
  ['jg5-geo-1', 6, 'Lebensräume der Erde', 'pflicht', 90, 1, 'Lehrbuch', ''],
  ['jg5-geo-1', 7, 'Himmelsrichtungen', 'pflicht', 45, 3, 'A7, M1, Lehrbuch', ''],
  ['jg5-geo-1', 8, 'Geografische Rekorde', 'wahl', 60, 1, 'A8, Laptop, Lehrbuch', ''],
  ['jg5-geo-1', 9, 'Hier lebe ich', 'wahl', 30, 1, 'A9, Lapbook, Schere, Kleber, Stifte', ''],
  ['jg5-geo-1', 10, 'Windspiel', 'wahl', 90, 2, 'A10, M2, Schere, Kleber, Stifte', ''],
  ['jg5-geo-1', 11, 'Steckbriefe Kontinente', 'pflicht', 180, 3, 'Laptop, A11, M3', ''],
  ['jg5-geo-1', 12, 'Google Earth', 'wahl', 30, 2, 'Laptop', ''],

  // jg5-geo-2: Atlasführerschein
  ['jg5-geo-2', 1, 'Bewegungen der Erde', 'pflicht', 50, 2, 'A1, A2, M1, Schere, Pin', ''],
  ['jg5-geo-2', 2, 'Jahreszeiten', 'pflicht', 60, 2, 'Lehrbuch, Globus, Laptop, A3, M1', ''],
  ['jg5-geo-2', 3, 'Windrose', 'wahl', 30, 1, 'weißes Blatt, A4', ''],
  ['jg5-geo-2', 4, 'Orientierung mit dem Gradnetz', 'pflicht', 90, 2, 'Atlas, Lehrbuch, Laptop, M2, A5, A6', ''],
  ['jg5-geo-2', 5, 'Physische und thematische Karten', 'pflicht', 60, 1, 'Lehrbuch, A7, Atlas', ''],
  ['jg5-geo-2', 6, 'Namensregister und Planquadrate', 'pflicht', 45, 2, 'A8, Laptop, Atlas', ''],
  ['jg5-geo-2', 7, 'Signaturen und Legenden', 'pflicht', 50, 2, 'A9', ''],
  ['jg5-geo-2', 8, 'Höhenschichten', 'pflicht', 45, 2, 'A10, Atlas', ''],
  ['jg5-geo-2', 9, 'Maßstäbe I', 'pflicht', 60, 3, 'M3, A11', ''],
  ['jg5-geo-2', 10, 'Maßstäbe II', 'pflicht', 30, 3, 'A12, Laptop', ''],
  ['jg5-geo-2', 11, 'Vertiefung und Lernzeit', 'wahl', 90, 2, 'Laptop, deine Ausarbeitungen', ''],
  ['jg5-geo-2', 12, 'Eine eigene Karte zeichnen', 'wahl', 90, 3, 'Laptop, weißes Papier, Bleistift, Buntstifte, A13', ''],

  // jg5-geo-3: Die Topografie Deutschlands
  ['jg5-geo-3', 1, 'Nachbarstaaten Deutschlands', 'pflicht', 45, 1, 'Lehrbuch, A1', ''],
  ['jg5-geo-3', 2, 'Bundesländer', 'pflicht', 60, 1, 'Lehrbuch, A2, M1, Atlas', ''],
  ['jg5-geo-3', 3, 'Lernen an der Karte I', 'wahl', 45, 2, 'Stumme Karte', ''],
  ['jg5-geo-3', 4, 'Vielfalt in Deutschland', 'wahl', 40, 1, 'Lehrbuch', ''],
  ['jg5-geo-3', 5, 'Großlandschaften in Deutschland', 'pflicht', 40, 2, 'Lehrbuch, A3, Atlas', ''],
  ['jg5-geo-3', 6, 'Flüsse Deutschlands', 'pflicht', 30, 2, 'A4, Atlas, Lehrbuch', ''],
  ['jg5-geo-3', 7, 'Steckbrief Fluss', 'wahl', 25, 1, 'A5, Atlas, Laptop', ''],
  ['jg5-geo-3', 8, 'Gebirge Deutschlands', 'pflicht', 45, 2, 'A6, Atlas', ''],
  ['jg5-geo-3', 9, 'Lernen an der Karte II', 'pflicht', 60, 2, 'Stumme Karte', ''],
  ['jg5-geo-3', 10, 'Berlin – unsere Hauptstadt', 'pflicht', 60, 3, 'Lehrbuch', ''],
  ['jg5-geo-3', 11, 'Berlin – Stadtplan', 'pflicht', 60, 3, 'Lehrbuch, A7', ''],
  ['jg5-geo-3', 12, 'Topografie des Küstenraumes', 'pflicht', 30, 1, 'A8, Atlas, Lehrbuch', ''],
  ['jg5-geo-3', 13, 'Nordsee und Ostsee', 'pflicht', 30, 2, 'M2, A9, Lehrbuch', ''],
  ['jg5-geo-3', 14, 'Küstenformen', 'pflicht', 55, 2, 'A10, Lehrbuch', ''],
  ['jg5-geo-3', 15, 'Memory oder Domino', 'pflicht', 90, 2, 'Papier, Stift, Schere', ''],
  ['jg5-geo-3', 16, 'Mündlicher Test', 'pflicht', 5, 2, 'Papier, Stift, Schere', ''],

  // jg5-geo-4: Tiefland und Mittelgebirge
  ['jg5-geo-4', 1, 'Landschaften im Norddeutschen Tiefland', 'pflicht', 60, 1, 'Lehrbuch, A1, Heft, Atlas', ''],
  ['jg5-geo-4', 2, 'Gewässernetz im Norddeutschen Tiefland', 'pflicht', 40, 1, 'Lehrbuch, A2, M1, Heft', ''],
  ['jg5-geo-4', 3, 'Touristenmagnet Spreewald', 'wahl', 80, 1, 'A3, A4, M2, Atlas', ''],
  ['jg5-geo-4', 4, 'Landwirtschaft früher und heute', 'pflicht', 60, 3, 'Lehrbuch, Heft, Laptop', ''],
  ['jg5-geo-4', 5, 'Magdeburger Börde', 'pflicht', 90, 3, 'Lehrbuch, A5, Atlas, Laptop', ''],
  ['jg5-geo-4', 6, 'Bedeutung des Waldes', 'pflicht', 60, 1, 'A6, M3', ''],
  ['jg5-geo-4', 7, 'Braunkohle', 'pflicht', 60, 3, 'M4, A7, Laptop, Lehrbuch', ''],
  ['jg5-geo-4', 8, 'Stadt-Umland-Beziehung', 'pflicht', 90, 3, 'M5, A8, Lehrbuch, Heft', ''],
  ['jg5-geo-4', 9, 'Wirtschaft', 'pflicht', 45, 1, 'Lehrbuch, Heft', ''],
  ['jg5-geo-4', 10, 'Diagramme zeichnen und auswerten', 'pflicht', 90, 2, 'Lehrbuch, A9', ''],
  ['jg5-geo-4', 11, 'Mittelgebirge', 'wahl', 45, 2, 'M6, A10, Laptop', ''],
  ['jg5-geo-4', 12, 'Erosion/Talformen', 'pflicht', 60, 3, 'A11, M7, Hefter', ''],

  // jg6-bio-1: Wirbellose Tiere in ihren Lebensräumen
  ['jg6-bio-1', 1, 'Vielfalt wirbelloser Tiere', 'pflicht', 30, 1, 'M1, A1, Lehrbuch', ''],
  ['jg6-bio-1', 2, 'Angepasstheit des Regenwurms', 'pflicht', 60, 2, 'M2, M3, A2', ''],
  ['jg6-bio-1', 3, 'Untersuchen eines Regenwurms', 'pflicht', 80, 3, 'M4, A3, Materialien Versuch', ''],
  ['jg6-bio-1', 4, 'Bau der Insekten', 'pflicht', 20, 1, 'A4, Lehrbuch', ''],
  ['jg6-bio-1', 5, 'Insektenordnungen', 'pflicht', 80, 2, 'M5, A5, A6', ''],
  ['jg6-bio-1', 6, 'Entwicklung der Insekten', 'pflicht', 45, 1, 'A7, Lehrbuch, Laptop', ''],
  ['jg6-bio-1', 7, 'Mundwerkzeuge der Insekten', 'pflicht', 45, 1, 'A8, Lehrbuch', ''],
  ['jg6-bio-1', 8, 'Flügel der Insekten', 'wahl', 40, 2, 'M6, A9, Lehrbuch', ''],
  ['jg6-bio-1', 9, 'Gliedmaßen der Insekten', 'pflicht', 45, 2, 'M7, A10, Lehrbuch, Laptop', ''],
  ['jg6-bio-1', 10, 'Atmung der Insekten', 'wahl', 30, 1, 'M8, A11', ''],
  ['jg6-bio-1', 11, 'Leben einer Arbeitsbiene', 'wahl', 80, 2, 'M9, M10, A12, A13', ''],
  ['jg6-bio-1', 12, 'Tierstaat Honigbiene', 'pflicht', 80, 2, 'M11, A14, Laptop', ''],
  ['jg6-bio-1', 13, 'Nutzinsekten', 'wahl', 45, 2, 'M12', ''],
  ['jg6-bio-1', 14, 'Wirbellose Tiere als Parasiten', 'pflicht', 40, 1, 'M13, M14, Laptop', ''],

  // jg6-bio-2: Das Leben unter der Lupe
  ['jg6-bio-2', 1, 'Escape Game: Wirbeltiere und Wirbellose', 'pflicht', 60, 3, 'A1, A2, Laptop', ''],
  ['jg6-bio-2', 2, 'System der Wirbeltiere und Wirbellosen', 'pflicht', 80, 3, 'A3, A4, A5, M1, Lehrbuch', ''],
  ['jg6-bio-2', 3, 'Entwicklung der Zelllehre', 'pflicht', 60, 2, 'A6, Lupe, Millimeterpapier, Laptop', ''],
  ['jg6-bio-2', 4, 'Mikroskopieren I (Pflichtinput)', 'pflicht', 80, 3, 'A7, M2, Lichtmikroskop, Dauerpräparat', ''],
  ['jg6-bio-2', 5, 'Memory Lichtmikroskop', 'wahl', 30, 1, 'M3', ''],
  ['jg6-bio-2', 6, 'Form und Größe von Zellen', 'pflicht', 40, 3, 'M4, Lehrbuch, (Millimeterpapier)', ''],
  ['jg6-bio-2', 7, 'Bestandteile der Zelle II', 'pflicht', 60, 2, 'M5, M6, Lehrbuch, Klebestift', ''],
  ['jg6-bio-2', 8, 'Modelle pflanzlicher Zellen', 'pflicht', 80, 2, 'M7, Material für Zellmodell', ''],
  ['jg6-bio-2', 9, 'Anfertigen mikroskopischer Zeichnungen', 'pflicht', 40, 2, 'A8, M8, Dauerpräparat, Lichtmikroskop', ''],
  ['jg6-bio-2', 10, 'Mikroskopieren II (Pflichtinput)', 'pflicht', 80, 3, 'A9, Bleistift, weißes A4-Blatt', ''],
  ['jg6-bio-2', 11, 'Vergleich tierischer und pflanzlicher Zellen', 'pflicht', 60, 2, 'Lehrbuch', ''],
  ['jg6-bio-2', 12, 'Leben in der Pfütze', 'wahl', 40, 3, 'M9, Heuaufguss, Lichtmikroskop', ''],
  ['jg6-bio-2', 13, 'Organisationsebenen des Lebens', 'wahl', 30, 2, 'M10, Laptop', ''],
  ['jg6-bio-2', 14, 'Weiterführende Übungen', 'wahl', 45, 2, 'Laptop', ''],

  // jg6-bio-3: Der Wald als Lebensgemeinschaft
  ['jg6-bio-3', 1, 'Was weißt du schon über den Wald?', 'pflicht', 30, 1, 'A1', ''],
  ['jg6-bio-3', 2, 'Die Stockwerke des Waldes', 'pflicht', 60, 2, 'A2, M1, Lehrbuch, Laptop', ''],
  ['jg6-bio-3', 3, 'Wer lebt wo im Wald?', 'pflicht', 30, 2, 'A3, Lehrbuch, A2, M1', ''],
  ['jg6-bio-3', 4, 'Der Wald im Jahresverlauf', 'pflicht', 45, 3, 'A4, Lehrbuch', ''],
  ['jg6-bio-3', 5, 'Moose und Farne', 'pflicht', 45, 2, 'A5, Lehrbuch, Petrischale mit Moos', ''],
  ['jg6-bio-3', 6, 'Geheimnisvolle Welt der Pilze', 'pflicht', 45, 3, 'A6, M2, Laptop, Lehrbuch, Pilzmodell', ''],
  ['jg6-bio-3', 7, 'Pilze sammeln und bestimmen', 'wahl', 45, 2, 'M3 – Pilz-Lernkarteien, Laptop', ''],
  ['jg6-bio-3', 8, 'Tiere und Pflanzen des Waldes', 'pflicht', 30, 1, 'Laptop, Lehrbuch', ''],
  ['jg6-bio-3', 9, 'Waldtiere im Wald', 'wahl', 30, 2, 'M4 – Memory Tierspuren', ''],
  ['jg6-bio-3', 10, 'Nahrungsbeziehungen im Wald', 'pflicht', 60, 3, 'A7, A8, Lehrbuch', ''],
  ['jg6-bio-3', 11, 'Nahrungsnetze im Wald', 'wahl', 45, 2, 'M5 – Karten, Fadenrolle Holzklammern', ''],
  ['jg6-bio-3', 12, 'Gefährdung und Schutz von Wäldern', 'pflicht', 30, 2, 'Laptop, Lehrbuch', ''],
  ['jg6-bio-3', 13, 'Ein Waldtier im System Wald', 'pflicht', 180, 3, 'M6, Lehrbuch, Laptop', 'Läuft über 2 Termine à 90 Minuten.'],
  ['jg6-bio-3', 14, 'Pflanzen können heilen', 'wahl', 45, 3, 'A9, M7 - Karten, Kiste der Kräuterfee', ''],

  // jg6-bio-4: Samenpflanzen
  ['jg6-bio-4', 1, 'Das Lapbook', 'pflicht', 20, 1, 'A3-Tonkarton (dickes Papier), Lehrbuch', ''],
  ['jg6-bio-4', 2, 'Welche Pflanzen kennst du schon?', 'pflicht', 30, 1, 'A1', ''],
  ['jg6-bio-4', 3, 'Der Aufbau von Samenpflanzen', 'pflicht', 80, 2, 'A2, A3, M1, Lehrbuch', ''],
  ['jg6-bio-4', 4, 'Gemüse – Pflanzenorgane als Nahrungsmittel', 'pflicht', 20, 1, 'A4', ''],
  ['jg6-bio-4', 5, 'Das Laubblatt I', 'pflicht', 40, 3, 'Lehrbuch', ''],
  ['jg6-bio-4', 6, 'Das Laubblatt II', 'pflicht', 40, 2, 'M1, A5, Pflanzenbestimmungsbuch', ''],
  ['jg6-bio-4', 7, 'Der Aufbau der Blüte', 'pflicht', 40, 2, 'M2, M3, A6, Laptop, Blütenmodelle', ''],
  ['jg6-bio-4', 8, 'Legebild und Blütendiagramm', 'pflicht', 80, 3, 'Kirschblüte, weißes A4-Blatt, Pinzette, Tesa, Zirkel, M4, M5', ''],
  ['jg6-bio-4', 9, 'Die Bestäubung', 'pflicht', 30, 2, 'Laptop', ''],
  ['jg6-bio-4', 10, 'Von der Blüte zur Frucht', 'pflicht', 60, 2, 'M1, A7, M6, Lehrbuch, Laptop', ''],
  ['jg6-bio-4', 11, 'Fruchttypen', 'wahl', 30, 2, 'Lehrbuch, Laptop, Pflanzenbestimmungsbuch', ''],
  ['jg6-bio-4', 12, 'Pflanzenfamilien', 'pflicht', 80, 2, 'A8, M7', ''],
  ['jg6-bio-4', 13, 'Gewürze der Lippenblütler', 'wahl', 10, 2, 'Gewürzdosen', ''],

  // jg6-geo-2: Klima in Europa
  ['jg6-geo-2', 1, 'Wiederholung Topografie', 'wahl', 90, 2, 'Atlas, Laptop, Europakarte, rote und grüne Punkte', ''],
  ['jg6-geo-2', 2, 'Mündliche LK', 'pflicht', 20, 3, '—', ''],
  ['jg6-geo-2', 3, 'Beleuchtungszonen der Erde', 'pflicht', 90, 1, 'M1, A1, A2, Laptop', ''],
  ['jg6-geo-2', 4, 'Klima-Vegetationszonen NEEF', 'pflicht', 90, 2, 'Lehrbuch, A3, A4, M2', ''],
  ['jg6-geo-2', 5, 'Wind und Relief beeinflussen das Klima', 'pflicht', 45, 2, 'Lehrbuch', ''],
  ['jg6-geo-2', 6, 'Selbsttest Klima-Vegetationszonen', 'wahl', 45, 3, 'A5, A6', ''],
  ['jg6-geo-2', 7, 'Der Golfstrom', 'pflicht', 90, 2, 'Lehrbuch, A7, A8, M3, Atlas, Laptop', ''],
  ['jg6-geo-2', 8, 'Golfstrom und der Klimawandel', 'pflicht', 50, 3, 'A9, M4, M5, Laptop', ''],
  ['jg6-geo-2', 9, 'Gelingensnachweis', 'pflicht', 45, 3, 'A10', ''],
  ['jg6-geo-2', 10, 'Metropolen', 'pflicht', 90, 2, 'A11, A15, Lehrbuch, A12 oder A13 oder A14', ''],
  ['jg6-geo-2', 11, 'Satellitenbilder auswerten', 'wahl', 65, 2, 'M6, M7', ''],

  // jg6-geo-3: Nordeuropa
  ['jg6-geo-3', 1, 'Tipps (0)', 'wahl', 20, 1, 'Schmierpapier, bunte Stifte, A0', ''],
  ['jg6-geo-3', 2, 'Topografie Nordeuropas', 'pflicht', 60, 2, 'A1, A2, Atlas', ''],
  ['jg6-geo-3', 3, 'Glaziale Serie', 'pflicht', 45, 2, 'Lehrbuch, A3', ''],
  ['jg6-geo-3', 4, 'Gletscher-Eis in Strömen', 'pflicht', 45, 2, 'M1, A4', ''],
  ['jg6-geo-3', 5, 'Ein Landschaftsprofil auswerten', 'pflicht', 90, 3, 'M2, A5, Atlas', ''],
  ['jg6-geo-3', 6, 'Löss – ein Geschenk des Windes', 'pflicht', 60, 2, 'Lehrbuch, Laptop, A6, Atlas', ''],
  ['jg6-geo-3', 7, 'Polartag / Polarnacht', 'wahl', 40, 2, 'Laptop, Atlas, Ordner, A7', ''],
  ['jg6-geo-3', 8, 'Finnland und das grüne Gold', 'pflicht', 60, 2, 'M3, M4, Lehrbuch', ''],
  ['jg6-geo-3', 9, 'Nachhaltigkeit in der Forstwirtschaft', 'wahl', 90, 3, 'Laptop, M5, A8, A9', ''],
  ['jg6-geo-3', 10, 'Island – Insel aus Feuer und Eis', 'pflicht', 90, 2, 'M6, M7, A10, Laptop, Blatt Papier', ''],
  ['jg6-geo-3', 11, 'Gelingensnachweis – Reise durch Europa', 'pflicht', 120, 2, 'Atlas, Laptop, A11, A12, A13, A14, A15', ''],

  // jg6-geo-4: Südeuropa
  ['jg6-geo-4', 1, 'Der Süden Europas – Topografie', 'pflicht', 90, 2, 'Lehrbuch, A1, Transparentpapier, Atlas', ''],
  ['jg6-geo-4', 2, 'Vertiefung Topografie', 'pflicht', 70, 1, 'Laptop, A2', ''],
  ['jg6-geo-4', 3, 'Ein Flug über die Alpen', 'pflicht', 30, 1, 'A3, Atlas, LB S. 102', ''],
  ['jg6-geo-4', 4, 'Höhenstufen der Alpen', 'wahl', 45, 1, 'LB, A4, Ordner', ''],
  ['jg6-geo-4', 5, 'Tiere im Alpenraum', 'pflicht', 45, 1, 'A5, A6, Laptop', ''],
  ['jg6-geo-4', 6, 'Wirtschaftsmotor Alpen', 'pflicht', 70, 3, 'M1, A7', ''],
  ['jg6-geo-4', 7, 'Gebirgsbildung der Alpen', 'pflicht', 90, 2, 'Laptop, M2, A8', ''],
  ['jg6-geo-4', 8, 'Mission Vulkan', 'pflicht', 80, 2, 'M3, A9, A10, A11, A12, Laptop', ''],
  ['jg6-geo-4', 9, 'Was sind eigentlich Erdbeben', 'wahl', 60, 1, 'M4', ''],
  ['jg6-geo-4', 10, 'Wahlaufgabe Vulkan', 'pflicht', 120, 3, 'Laptop, Material zum Vulkanbau', ''],
  ['jg6-geo-4', 11, 'Wahlaufgabe Gebirgsbildung', 'pflicht', 120, 3, 'A13, optionale Materialien zu A13', ''],
  ['jg6-geo-4', 12, 'Mündliche LK', 'pflicht', 10, 2, '—', ''],

  // jg6-geo-5: Climate Co2llaboration
  ['jg6-geo-5', 1, 'Entdecke Digital Sparks', 'pflicht', 10, 1, 'Laptop', ''],
  ['jg6-geo-5', 2, 'Discover', 'pflicht', 180, 2, 'Laptop', 'Läuft über 2 Termine à 90 Minuten.'],
  ['jg6-geo-5', 3, 'Create', 'pflicht', 120, 3, 'Laptop', ''],
  ['jg6-geo-5', 4, 'Showtime', 'pflicht', 20, 2, 'Laptop', ''],

  // jg7-geo-1: Orientierung auf der Erde
  ['jg7-geo-1', 1, 'Das Gradnetz der Erde', 'pflicht', 65, 1, 'M1 & 2, A1 & 2, Atlas', ''],
  ['jg7-geo-1', 2, 'Geographische Koordinaten', 'pflicht', 90, 2, 'M3, A3–6, Atlas', ''],
  ['jg7-geo-1', 3, 'Wie weiß mein Handy, wo ich bin?', 'wahl', 20, 2, 'M4, A7, Atlas', GYM_HINWEIS],
  ['jg7-geo-1', 4, 'Zeitzonen der Erde', 'pflicht', 115, 2, 'M5, A8–11, Atlas', ''],
  ['jg7-geo-1', 5, 'Beleuchtungszonen der Erde', 'pflicht', 40, 1, 'A12–13, Laptop', ''],
  ['jg7-geo-1', 6, 'Entstehung der Jahreszeiten', 'pflicht', 110, 2, 'M6, A14–17', ''],
  ['jg7-geo-1', 7, 'Schalenaufbau der Erde', 'pflicht', 50, 1, 'M7, A18–19, Kleber & Schere', ''],
  ['jg7-geo-1', 8, 'Klimazonen und Klimadiagramme', 'pflicht', 120, 2, 'A20–21, M8, Atlas', ''],
  ['jg7-geo-1', 9, 'Warum lügen Weltkarten?', 'wahl', 30, 2, 'A22, Atlas', GYM_HINWEIS],
  ['jg7-geo-1', 10, 'Gelingensnachweis', 'pflicht', 90, 2, 'A23/0-5, Atlas', '']

];

const DATEIEN = ['Jg5', 'Jg6', 'Jg7'];

async function main() {
  let stationenGesamt = 0;
  for (const jg of DATEIEN) {
    const pfad = 'content/jahrgaenge/' + jg + '.xlsx';
    const prefix = jg.toLowerCase() + '-';
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(pfad);

    const bausteine = workbook.getWorksheet('Bausteine');
    const kopf = bausteine.getRow(1).values.slice(1).map(String);
    const spalte = (name) => kopf.findIndex((k) => k.trim() === name) + 1;
    const cId = spalte('id'), cTitel = spalte('titel'), cGn = spalte('gelingensnachweis'), cGnSt = spalte('gelingensnachweisStation');

    const stationen = workbook.getWorksheet('Stationen');
    const schonDa = new Set();
    stationen.eachRow((row, nr) => { if (nr > 1) schonDa.add(String(row.getCell(1).value || '')); });

    const bekannt = new Set();
    bausteine.eachRow((row, nr) => { if (nr > 1) bekannt.add(String(row.getCell(cId).value || '')); });

    bausteine.eachRow((row, nr) => {
      if (nr === 1) return;
      const id = String(row.getCell(cId).value || '');
      if (!id.startsWith(prefix) || schonDa.has(id)) return;
      if (TITEL_NEU[id] && !row.getCell(cTitel).value) row.getCell(cTitel).value = TITEL_NEU[id];
      const gn = GELINGENSNACHWEIS[id];
      if (gn && !row.getCell(cGn).value) {
        row.getCell(cGn).value = gn[0];
        if (gn[1] !== null && !row.getCell(cGnSt).value) row.getCell(cGnSt).value = gn[1];
      }
    });

    let n = 0;
    for (const [baustein, nr, titel, art, minuten, niveau, material, hinweis] of STATIONEN) {
      if (!baustein.startsWith(prefix)) continue;
      if (!bekannt.has(baustein)) throw new Error('Baustein ' + baustein + ' fehlt in ' + jg + '.xlsx');
      if (schonDa.has(baustein)) { console.log('uebersprungen (hat schon Stationen): ' + baustein); continue; }
      stationen.addRow([baustein, nr, titel, art, minuten, niveau, material, hinweis]);
      n++;
    }
    await workbook.xlsx.writeFile(pfad);
    console.log(jg + ': ' + n + ' Stationen geschrieben');
    stationenGesamt += n;
  }
  console.log('gesamt: ' + stationenGesamt + ' Stationen');
}

main();
