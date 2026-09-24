// Tests fuer den Build (AP-02, Akzeptanzkriterien 1 bis 8).
//
//   node tools/test-build.mjs
//
// Der Test legt zuerst die Beispieldateien in tools/testdaten/ neu an, damit
// sie sich jederzeit reproduzieren lassen, und baut dann damit. Alles, was
// dabei entsteht, landet in einem temporaeren Ordner, nie im Repo.
//
// Die Inhalte in tools/testdaten/ sind erfundene Testwerte ("Testbaustein A",
// Kuerzel "TST"), kein SOUL-Inhalt. Sie pruefen nur die Technik.

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as XLSX from 'xlsx';

import { baue, jsonFehlerOrt, leseOptionen } from './build.mjs';
import { alsWochentag, datumZuISO, istISODatum } from './lib/excel.mjs';
import { trenneKopfdaten, zerlegeNachUeberschriften, zuHtml } from './lib/markdown.mjs';
import { fuelleVorlage } from './lib/swgen.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const REPO = join(HIER, '..');
const TESTDATEN = join(HIER, 'testdaten');
const ARBEIT = join(tmpdir(), 'soul-build-test-' + process.pid);

let bestanden = 0;
const fehlgeschlagen = [];

function pruefe(name, fn) {
  try {
    fn();
    bestanden++;
    console.log('  ok    ' + name);
  } catch (fehler) {
    fehlgeschlagen.push({ name, fehler });
    console.log('  FEHLT ' + name);
    console.log('        ' + (fehler && fehler.message ? fehler.message : fehler));
  }
}

async function pruefeAsync(name, fn) {
  try {
    await fn();
    bestanden++;
    console.log('  ok    ' + name);
  } catch (fehler) {
    fehlgeschlagen.push({ name, fehler });
    console.log('  FEHLT ' + name);
    console.log('        ' + (fehler && fehler.message ? fehler.message : fehler));
  }
}

function enthaelt(zeilen, teil) {
  return zeilen.some((zeile) => zeile.includes(teil));
}

// ------------------------------------------------------------ Testdaten

function blatt(zeilen) {
  return XLSX.utils.aoa_to_sheet(zeilen);
}

function schreibeMappe(pfad, blaetter) {
  const mappe = XLSX.utils.book_new();
  for (const [name, zeilen] of blaetter) {
    XLSX.utils.book_append_sheet(mappe, blatt(zeilen), name);
  }
  mkdirSync(dirname(pfad), { recursive: true });
  XLSX.writeFile(mappe, pfad);
}

const SCHULE_BLAETTER = [
  ['Faecher', [
    ['id', 'name', 'kurz', 'farbe', 'symbol', 'reihenfolge'],
    ['de', 'Deutsch', 'De', 'de', 'fach-de', 1],
    ['ma', 'Mathematik', 'Ma', 'ma', 'fach-ma', 2],
    ['bio', 'Biologie', 'Bio', 'bio', 'fach-bio', 4]
  ]],
  ['Ferien', [
    ['name', 'von', 'bis', 'quelle'],
    // Als echte Datumszellen, damit der Weg "Datumszelle" mitgeprueft wird.
    ['Herbstferien', new Date(Date.UTC(2026, 9, 12)), new Date(Date.UTC(2026, 9, 24)), 'Testwert'],
    ['Testfeiertag', '2026-11-18', '2026-11-18', 'Testwert']
  ]],
  ['Stufen', [
    ['id', 'name', 'symbol', 'kurzbeschreibung'],
    [1, 'Wurzel', 'wurzel', ''],
    [2, 'Stamm', 'stamm', ''],
    [3, 'Krone', 'krone', '']
  ]]
];

const JG_GUT = [
  ['Jahrgang', [
    ['jgst', 'ton', 'klassen', 'fruehesterAufstieg', 'hinweis'],
    [5, 'verspielt', 'A,B,C', '2026-10-26', '']
  ]],
  ['Sonderwochen', [
    ['von', 'bis', 'titel', 'art'],
    ['2026-09-14', '2026-09-18', 'Testwoche', 'themenwoche']
  ]],
  ['Slots', [
    ['id', 'fach', 'nr', 'spur', 'spuren', 'stunden', 'von', 'bis', 'abgabe', 'baustein', 'status', 'hinweis'],
    ['jg5-de-1', 'de', 1, 1, '', 8, '2026-08-31', '2026-10-02', '', 'jg5-de-1', 'fest', ''],
    ['jg5-ma-1', 'ma', 1, 2, '', 8, '2026-08-31', '2026-10-02', '', 'jg5-ma-1', 'fest', ''],
    ['jg5-de-2', 'de', 2, 1, '', 6, '2026-10-26', '2026-11-20', '2026-11-19', 'jg5-de-2', 'fest', ''],
    ['# Kommentarzeile, wird uebersprungen'],
    ['jg5-fvu-1', 'bio', 1, 1, '1,2,3', 4, '2026-11-23', '2026-11-27', '', 'jg5-bio-1', 'fest', '']
  ]],
  ['Bausteine', [
    ['id', 'fach', 'titel', 'alternativen', 'gelingensnachweis', 'gelingensnachweisStation', 'materialort', 'kurzbeschreibung'],
    ['jg5-de-1', 'de', 'Testbaustein A', '', 'Testnachweis A', 2, 'Testregal', 'Kurztext A'],
    ['jg5-ma-1', 'ma', 'Testbaustein B', 'Testthema B1 ODER Testthema B2', '', '', '', ''],
    ['jg5-de-2', 'de', '', '', '', '', '', ''],
    ['jg5-bio-1', 'bio', 'Testbaustein C', '', '', '', '', '']
  ]],
  ['Stationen', [
    ['baustein', 'nr', 'titel', 'art', 'minuten', 'niveau', 'material', 'hinweis'],
    ['jg5-de-1', 1, 'Teststation eins', 'pflicht', 20, 1, 'A1', ''],
    ['jg5-de-1', 2, 'Teststation zwei', 'pflicht', 30, 2, 'A2', ''],
    ['jg5-ma-1', 1, 'Teststation drei', 'wahl', 15, 3, '', '']
  ]],
  ['Inputs', [
    ['id', 'fach', 'art', 'titel', 'beschreibung', 'pflicht', 'bausteine'],
    ['jg5-de-test', 'de', 'methode', 'Testinput', 'Beschreibung zum Testinput.', 'ja', 'jg5-de-1']
  ]],
  ['Coachings', [
    ['wochentag', 'kuerzel', 'gueltigAb', 'gueltigBis', 'klasse'],
    ['Mo', 'TST', '2026-09-07', '', '']
  ]],
  ['Termine', [
    ['datum', 'art', 'fach', 'kuerzel', 'klasse', 'input', 'text', 'station', 'pflicht', 'raster'],
    ['2026-09-08', 'input', 'de', 'TST', 'A', 'jg5-de-test', '', 1, 'ja', 'jg5-r1'],
    ['2026-09-18', 'entfall', '', 'TST', '', '', 'Testtermin faellt aus', '', '', 'jg5-r1']
  ]],
  ['Raster', [
    ['id', 'von', 'bis', 'titel'],
    ['jg5-r1', '2026-08-31', '2026-10-02', 'Testzeitraum 1']
  ]]
];

// Dieselbe Datei mit genau den Fehlern aus AP-02, Akzeptanzkriterium 2.
const JG_FEHLER = [
  ['Jahrgang', [
    ['jgst', 'ton', 'klassen', 'fruehesterAufstieg', 'hinweis'],
    [5, 'verspielt', 'A,B,C', '', '']
  ]],
  ['Sonderwochen', [['von', 'bis', 'titel', 'art']]],
  ['Slots', [
    ['id', 'fach', 'nr', 'spur', 'spuren', 'stunden', 'von', 'bis', 'abgabe', 'baustein', 'status', 'hinweis'],
    ['jg5-de-1', 'de', 1, 1, '', 8, '2026-08-31', '2026-10-02', '', 'jg5-de-1', 'fest', ''],
    // 1. ueberlappt mit jg5-de-1 in Spur 1
    ['jg5-de-2', 'de', 2, 1, '', 6, '2026-09-21', '2026-10-09', '', 'jg5-de-2', 'fest', ''],
    // 2. unbekanntes Fach
    ['jg5-xx-1', 'xx', 1, 2, '', 4, '2026-08-31', '2026-09-11', '', 'jg5-xx-1', 'fest', ''],
    // 3. Baustein fehlt im Blatt Bausteine
    ['jg5-ma-1', 'ma', 1, 3, '', 4, '2026-08-31', '2026-09-11', '', 'jg5-ma-9', 'fest', '']
  ]],
  ['Bausteine', [
    ['id', 'fach', 'titel', 'alternativen', 'gelingensnachweis', 'gelingensnachweisStation', 'materialort', 'kurzbeschreibung'],
    ['jg5-de-1', 'de', 'Testbaustein A', '', '', '', '', ''],
    ['jg5-de-2', 'de', 'Testbaustein B', '', '', '', '', ''],
    ['jg5-xx-1', 'xx', 'Testbaustein C', '', '', '', '', '']
  ]],
  ['Stationen', [['baustein', 'nr', 'titel', 'art', 'minuten', 'niveau', 'material', 'hinweis']]],
  ['Inputs', [['id', 'fach', 'art', 'titel', 'beschreibung', 'pflicht', 'bausteine']]],
  ['Coachings', [
    ['wochentag', 'kuerzel', 'gueltigAb', 'gueltigBis', 'klasse'],
    // 4. Tippfehler im Wochentag
    ['Moo', 'TST', '2026-09-07', '', '']
  ]],
  ['Termine', [
    ['datum', 'art', 'fach', 'kuerzel', 'klasse', 'input', 'text', 'station', 'pflicht', 'raster'],
    // 5. Termin in den Herbstferien
    ['2026-10-14', 'input', 'de', 'TST', '', '', 'Testtermin in den Ferien', '', '', '']
  ]],
  ['Raster', [['id', 'von', 'bis', 'titel']]]
];

const INDEX_GUT = {
  schema: 1, schuljahr: '2026/27', zielgruppe: 'sus', jahrgaenge: [5], module: ['woche']
};

const ANTRAG_GUT = {
  schema: 1,
  configVersion: '2026-09-test',
  empfaenger: { 5: { A: 'test-a@example.invalid', B: '', C: '' } },
  stufen: {
    2: {
      titel: 'Testantrag Stufe 2',
      schritte: [
        { id: 'begruendung', nr: 1, titel: 'Begruendung', rolle: 'kind', typ: 'freitext', minZeichen: 30 },
        { id: 'teamcheck', nr: 2, titel: 'Team-Check', rolle: 'mitschueler', typ: 'personen', anzahl: 2 },
        { id: 'empfehlung', nr: 3, titel: 'Empfehlung', rolle: 'lernbegleitung', typ: 'kriterien', kriterien: ['Testkriterium'] },
        { id: 'selbst', nr: 4, titel: 'Erklaerung', rolle: 'kind', typ: 'erklaerung', aussagen: ['Testaussage'] },
        { id: 'entscheidung', nr: 5, titel: 'Entscheidung', rolle: 'klassenleitung', typ: 'nurPdf' }
      ]
    }
  },
  rollen: { kind: 'Du', mitschueler: 'Mitschueler:in', lernbegleitung: 'Lernbegleitung', klassenleitung: 'Klassenleitung' }
};

// 6. JSON-Kommafehler: nach "configVersion" fehlt das Komma.
const ANTRAG_KOMMAFEHLER = [
  '{',
  '  "schema": 1,',
  '  "configVersion": "2026-09-test"',
  '  "empfaenger": { "5": { "A": "", "B": "", "C": "" } },',
  '  "stufen": {}',
  '}',
  ''
].join('\n');

const WISSEN_START = [
  '---',
  'id: teststart',
  'titel: Testseite',
  'bereich: soul',
  'jahrgaenge: alle',
  'status: freigegeben',
  'reihenfolge: 10',
  'stichworte: [Test, Beispiel]',
  'quelle: Testdaten',
  '---',
  '## Erster Abschnitt',
  'Ein Absatz mit genug Text, damit er im Suchindex landet und geprueft werden kann.',
  '',
  'Ein Link auf eine Seite der App: [Stufen](#/stufen).',
  'Ein Link nach draussen: [Beispiel](https://example.invalid) und rohes <b>HTML</b>.',
  ''
].join('\n');

const WISSEN_ENTWURF = [
  '---',
  'id: testentwurf',
  'titel: Testseite im Entwurf',
  'bereich: ablauf',
  'jahrgaenge: [5]',
  'status: entwurf',
  'reihenfolge: 20',
  '---',
  'Dieser Text ist noch nicht freigegeben und darf nur mit --vorschau mitgehen.',
  ''
].join('\n');

const WISSEN_GLOSSAR = [
  '---',
  'id: glossar',
  'titel: Glossar',
  'bereich: glossar',
  'jahrgaenge: alle',
  'status: freigegeben',
  'reihenfolge: 90',
  '---',
  '## Testbegriff',
  'Erklaerung zum Testbegriff.',
  '',
  '## Zweiter Testbegriff',
  'Erklaerung zum zweiten Testbegriff.',
  ''
].join('\n');

const WISSEN_FAQ = [
  '---',
  'id: faq',
  'titel: Haeufige Fragen',
  'bereich: faq',
  'jahrgaenge: alle',
  'status: freigegeben',
  'reihenfolge: 80',
  '---',
  '## Ist das eine Testfrage?',
  'Ja, das ist eine Testfrage aus den Testdaten.',
  ''
].join('\n');

function schreibeTestdaten() {
  rmSync(TESTDATEN, { recursive: true, force: true });

  const gut = join(TESTDATEN, 'gut');
  mkdirSync(join(gut, 'wissen'), { recursive: true });
  writeFileSync(join(gut, 'index.json'), JSON.stringify(INDEX_GUT, null, 2) + '\n', 'utf8');
  writeFileSync(join(gut, 'antrag.json'), JSON.stringify(ANTRAG_GUT, null, 2) + '\n', 'utf8');
  writeFileSync(join(gut, 'wissen', 'start.md'), WISSEN_START, 'utf8');
  writeFileSync(join(gut, 'wissen', 'entwurf.md'), WISSEN_ENTWURF, 'utf8');
  writeFileSync(join(gut, 'wissen', 'glossar.md'), WISSEN_GLOSSAR, 'utf8');
  writeFileSync(join(gut, 'wissen', 'faq.md'), WISSEN_FAQ, 'utf8');
  schreibeMappe(join(gut, 'schule.xlsx'), SCHULE_BLAETTER);
  schreibeMappe(join(gut, 'jahrgaenge', 'Jg5.xlsx'), JG_GUT);

  const schlecht = join(TESTDATEN, 'fehler');
  mkdirSync(schlecht, { recursive: true });
  writeFileSync(join(schlecht, 'index.json'), JSON.stringify(INDEX_GUT, null, 2) + '\n', 'utf8');
  writeFileSync(join(schlecht, 'antrag.json'), ANTRAG_KOMMAFEHLER, 'utf8');
  schreibeMappe(join(schlecht, 'schule.xlsx'), SCHULE_BLAETTER);
  schreibeMappe(join(schlecht, 'jahrgaenge', 'Jg5.xlsx'), JG_FEHLER);

  writeFileSync(join(TESTDATEN, 'LIESMICH.md'), [
    '# Testdaten fuer den Build',
    '',
    'Diese Dateien erzeugt `node tools/test-build.mjs` bei jedem Lauf neu.',
    'Von Hand aendern lohnt nicht, die Vorlagen stehen in `tools/test-build.mjs`.',
    '',
    '- `gut/` laeuft ohne Fehler durch, nur mit Warnungen.',
    '- `fehler/` enthaelt absichtlich sechs Fehler (ueberlappende Slots, Termin in den',
    '  Ferien, unbekanntes Fach, fehlender Baustein, Tippfehler im Wochentag,',
    '  Kommafehler in antrag.json).',
    '',
    'Alle Inhalte sind erfundene Testwerte, kein SOUL-Inhalt.',
    ''
  ].join('\n'), 'utf8');
}

// ------------------------------------------------------------ Testlauf

function arbeitsordner(name) {
  const pfad = join(ARBEIT, name);
  rmSync(pfad, { recursive: true, force: true });
  mkdirSync(pfad, { recursive: true });
  return pfad;
}

function baueTest(zusatz) {
  return baue({
    repo: REPO,
    inhalt: join(TESTDATEN, 'gut'),
    quelle: join(REPO, 'src'),
    still: true,
    ...zusatz
  });
}

console.log('Testdaten anlegen');
schreibeTestdaten();
console.log('  ok    tools/testdaten/gut und tools/testdaten/fehler geschrieben');
bestanden++;

console.log('');
console.log('Bausteine der Bibliothek');

pruefe('datumZuISO rechnet Datumszellen ohne Zeitzonenfehler um', () => {
  assert.equal(datumZuISO(new Date(Date.UTC(2026, 9, 12))), '2026-10-12');
  assert.equal(datumZuISO(new Date(Date.UTC(2026, 9, 12, 22))), '2026-10-13');
  assert.equal(datumZuISO(new Date(Date.UTC(2026, 2, 29, 2))), '2026-03-29');
});

pruefe('istISODatum erkennt gueltige und ungueltige Datumsangaben', () => {
  assert.equal(istISODatum('2026-10-12'), true);
  assert.equal(istISODatum('2026-02-30'), false);
  assert.equal(istISODatum('12.10.2026'), false);
});

pruefe('alsWochentag macht aus Mo bis Fr die Zahlen 1 bis 5', () => {
  assert.equal(alsWochentag('Mo'), 1);
  assert.equal(alsWochentag('fr'), 5);
  assert.equal(alsWochentag('Moo'), null);
  assert.equal(alsWochentag(''), null);
});

pruefe('Markdown: HTML wird verworfen, Links nur auf #/', () => {
  const { kopf, rumpf } = trenneKopfdaten(WISSEN_START);
  assert.equal(kopf.id, 'teststart');
  assert.deepEqual(kopf.stichworte, ['Test', 'Beispiel']);
  const { html, warnungen, abschnitte } = zuHtml(rumpf);
  assert.ok(!html.includes('<b>'), 'rohes HTML ist noch da');
  assert.ok(html.includes('<a href="#/stufen">'), 'interner Link fehlt');
  assert.ok(!html.includes('example.invalid'), 'externer Link ist noch da');
  assert.ok(html.includes('Beispiel'), 'der Linktext soll stehen bleiben');
  assert.equal(abschnitte[0].anker, 'erster-abschnitt');
  assert.ok(warnungen.length >= 2);
});

pruefe('Glossar wird an den Ueberschriften zerlegt', () => {
  const { rumpf } = trenneKopfdaten(WISSEN_GLOSSAR);
  const teile = zerlegeNachUeberschriften(rumpf);
  assert.equal(teile.length, 2);
  assert.equal(teile[0].titel, 'Testbegriff');
});

pruefe('fuelleVorlage ersetzt beide Platzhalter', () => {
  const text = fuelleVorlage("const V='__VERSION__'; const P=__PRECACHE__;", '1.2.3-abcdef12', ['./', './a.js']);
  assert.ok(text.includes("'1.2.3-abcdef12'"));
  assert.ok(text.includes('"./a.js"'));
  assert.throws(() => fuelleVorlage('ohne Platzhalter', '1', []));
});

pruefe('leseOptionen versteht die Kommandozeile', () => {
  assert.deepEqual(leseOptionen([]), { ziel: 'oeffentlich', vorschau: false, ausgabe: null });
  assert.deepEqual(leseOptionen(['--ziel=intern', '--vorschau', '--ausgabe=../x/docs']),
    { ziel: 'intern', vorschau: true, ausgabe: '../x/docs' });
  assert.throws(() => leseOptionen(['--unsinn=1']));
});

pruefe('jsonFehlerOrt findet die Zeile eines Kommafehlers', () => {
  let ort = null;
  try {
    JSON.parse(ANTRAG_KOMMAFEHLER);
  } catch (fehler) {
    ort = jsonFehlerOrt(fehler, ANTRAG_KOMMAFEHLER);
  }
  assert.ok(ort && ort.zeile, 'keine Zeilennummer gefunden');
  assert.ok(ort.zeile >= 3 && ort.zeile <= 4, 'Zeile ' + ort.zeile + ' passt nicht zum Kommafehler');
});

console.log('');
console.log('Akzeptanzkriterium 1: Build mit den leeren Vorlagen');

await pruefeAsync('content/ des Repos baut durch und meldet nur Warnungen', async () => {
  const ergebnis = await baue({
    repo: REPO, ausgabe: arbeitsordner('leer'), still: true
  });
  assert.equal(ergebnis.ok, true, 'Fehler: ' + ergebnis.fehler.join(' | '));
  assert.equal(ergebnis.fehler.length, 0);
});

console.log('');
console.log('Akzeptanzkriterium 2: fehlerhafte Testdaten');

let fehlerLauf = null;
await pruefeAsync('jeder eingebaute Fehler wird mit Datei, Blatt, Zeile und Feld gemeldet', async () => {
  fehlerLauf = await baue({
    repo: REPO,
    inhalt: join(TESTDATEN, 'fehler'),
    quelle: join(REPO, 'src'),
    ausgabe: arbeitsordner('fehler'),
    still: true
  });
  assert.equal(fehlerLauf.ok, false, 'der Build haette abbrechen muessen');
  const z = fehlerLauf.fehler;
  assert.ok(enthaelt(z, 'ueberschneidet sich in Spur 1'), 'ueberlappende Slots fehlen:\n' + z.join('\n'));
  assert.ok(enthaelt(z, 'liegt in den Herbstferien'), 'Termin in den Ferien fehlt:\n' + z.join('\n'));
  assert.ok(enthaelt(z, '"xx" ist kein bekanntes Fach'), 'unbekanntes Fach fehlt:\n' + z.join('\n'));
  assert.ok(enthaelt(z, 'Den Baustein "jg5-ma-9" gibt es im Blatt Bausteine nicht'), 'fehlender Baustein fehlt:\n' + z.join('\n'));
  assert.ok(enthaelt(z, '"Moo" ist kein Wochentag'), 'Tippfehler im Wochentag fehlt:\n' + z.join('\n'));
  assert.ok(enthaelt(z, 'antrag.json'), 'Kommafehler in antrag.json fehlt:\n' + z.join('\n'));
});

pruefe('jede Fehlermeldung nennt Datei, Blatt, Zeile und Feld', () => {
  const slotFehler = fehlerLauf.fehler.find((zeile) => zeile.includes('ueberschneidet sich'));
  assert.ok(/^FEHLER Jg5\.xlsx › Slots › Zeile \d+ › von: /.test(slotFehler), slotFehler);
  const terminFehler = fehlerLauf.fehler.find((zeile) => zeile.includes('Herbstferien'));
  assert.ok(/^FEHLER Jg5\.xlsx › Termine › Zeile \d+ › datum: /.test(terminFehler), terminFehler);
  const antragFehler = fehlerLauf.fehler.find((zeile) => zeile.includes('antrag.json'));
  assert.ok(/Zeile \d+/.test(antragFehler), antragFehler);
});

pruefe('bei Fehlern wird nichts geschrieben', () => {
  assert.equal(existsSync(join(ARBEIT, 'fehler', 'index.html')), false);
});

console.log('');
console.log('Akzeptanzkriterium 3: Version haengt nur am Inhalt');

let versionEins = null;
await pruefeAsync('zweimal bauen ohne Aenderung gibt dieselbe Version', async () => {
  const a = await baueTest({ ausgabe: arbeitsordner('v1') });
  const b = await baueTest({ ausgabe: arbeitsordner('v2') });
  assert.equal(a.ok, true, a.fehler.join(' | '));
  assert.equal(b.ok, true, b.fehler.join(' | '));
  assert.equal(a.version, b.version, 'Versionen unterscheiden sich: ' + a.version + ' / ' + b.version);
  versionEins = a.version;
});

await pruefeAsync('eine Textaenderung in einer Wissensseite gibt eine andere Version', async () => {
  const seite = join(TESTDATEN, 'gut', 'wissen', 'start.md');
  const vorher = readFileSync(seite, 'utf8');
  writeFileSync(seite, vorher.replace('Ein Absatz mit', 'Ein geaenderter Absatz mit'), 'utf8');
  try {
    const c = await baueTest({ ausgabe: arbeitsordner('v3') });
    assert.equal(c.ok, true, c.fehler.join(' | '));
    assert.notEqual(c.version, versionEins, 'die Version hat sich nicht geaendert');
  } finally {
    writeFileSync(seite, vorher, 'utf8');
  }
});

await pruefeAsync('die Version beginnt mit APP_VERSION aus src/app/version.js', async () => {
  const quelltext = readFileSync(join(REPO, 'src', 'app', 'version.js'), 'utf8');
  const appVersion = quelltext.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/)[1];
  assert.ok(versionEins.startsWith(appVersion + '-'), versionEins + ' passt nicht zu ' + appVersion);
  assert.ok(/-[0-9a-f]{8}$/.test(versionEins), 'am Ende fehlen acht Zeichen aus dem Hash');
});

console.log('');
console.log('Akzeptanzkriterium 4: Materialschutz');

await pruefeAsync('eine Datei src/material/x.pdf bricht den oeffentlichen Build ab', async () => {
  const quelle = join(ARBEIT, 'src-mit-material');
  rmSync(quelle, { recursive: true, force: true });
  cpSync(join(REPO, 'src'), quelle, { recursive: true });
  mkdirSync(join(quelle, 'material'), { recursive: true });
  writeFileSync(join(quelle, 'material', 'x.pdf'), '%PDF-1.4 Testdatei\n', 'utf8');

  const ergebnis = await baueTest({ quelle, ausgabe: arbeitsordner('material') });
  assert.equal(ergebnis.ok, false, 'der Build haette abbrechen muessen');
  assert.ok(enthaelt(ergebnis.fehler, 'Materialschutz'), ergebnis.fehler.join(' | '));
  assert.ok(enthaelt(ergebnis.fehler, 'material/x.pdf'), ergebnis.fehler.join(' | '));
});

await pruefeAsync('mit --ziel=intern laeuft derselbe Ordner durch', async () => {
  const quelle = join(ARBEIT, 'src-mit-material');
  const ergebnis = await baueTest({ quelle, ziel: 'intern', ausgabe: arbeitsordner('intern') });
  assert.equal(ergebnis.ok, true, ergebnis.fehler.join(' | '));
  assert.equal(existsSync(join(ARBEIT, 'intern', 'material', 'x.pdf')), true);
});

console.log('');
console.log('Akzeptanzkriterium 5: Vorschau');

await pruefeAsync('ohne --vorschau fehlen Entwuerfe, mit --vorschau sind sie dabei', async () => {
  const ohne = await baueTest({ ausgabe: arbeitsordner('ohne-vorschau') });
  assert.equal(ohne.ok, true, ohne.fehler.join(' | '));
  const wissenOhne = JSON.parse(readFileSync(join(ARBEIT, 'ohne-vorschau', 'data', 'wissen.json'), 'utf8'));
  assert.equal(wissenOhne.seiten.some((seite) => seite.id === 'testentwurf'), false);
  assert.equal(wissenOhne.seiten.some((seite) => seite.id === 'teststart'), true);

  const mit = await baueTest({ vorschau: true, ausgabe: arbeitsordner('mit-vorschau') });
  assert.equal(mit.ok, true, mit.fehler.join(' | '));
  const wissenMit = JSON.parse(readFileSync(join(ARBEIT, 'mit-vorschau', 'data', 'wissen.json'), 'utf8'));
  assert.equal(wissenMit.seiten.some((seite) => seite.id === 'testentwurf'), true);
});

console.log('');
console.log('Akzeptanzkriterium 6: Ausgabeordner');

await pruefeAsync('--ausgabe=src wird verweigert', async () => {
  const ergebnis = await baue({ repo: REPO, ausgabe: 'src', still: true });
  assert.equal(ergebnis.ok, false);
  assert.ok(enthaelt(ergebnis.fehler, '--ausgabe'), ergebnis.fehler.join(' | '));
  assert.equal(existsSync(join(REPO, 'src', 'index.html')), true, 'src/ wurde angefasst');
});

await pruefeAsync('--ausgabe=content, --ausgabe=tools und das Repo selbst werden verweigert', async () => {
  for (const ausgabe of ['content', 'tools', '.', 'src/app']) {
    const ergebnis = await baue({ repo: REPO, ausgabe, still: true });
    assert.equal(ergebnis.ok, false, 'durchgelassen: ' + ausgabe);
  }
});

await pruefeAsync('--ausgabe=../x/docs funktioniert', async () => {
  const basis = arbeitsordner('nebenan');
  const repoOrdner = join(basis, 'repo');
  mkdirSync(repoOrdner, { recursive: true });
  const ergebnis = await baueTest({ repo: repoOrdner, ausgabe: '../x/docs' });
  assert.equal(ergebnis.ok, true, ergebnis.fehler.join(' | '));
  assert.equal(existsSync(join(basis, 'x', 'docs', 'index.html')), true);
  assert.equal(existsSync(join(basis, 'x', 'docs', 'sw.js')), true);
});

console.log('');
console.log('Inhalt der erzeugten Dateien');

await pruefeAsync('data/ enthaelt alle erwarteten Dateien', async () => {
  const ausgabe = arbeitsordner('inhalt');
  const ergebnis = await baueTest({ ausgabe });
  assert.equal(ergebnis.ok, true, ergebnis.fehler.join(' | '));
  for (const name of ['index.json', 'schule.json', 'jg5.json', 'wissen.json', 'antrag.json', 'suche-jg5.json']) {
    assert.equal(existsSync(join(ausgabe, 'data', name)), true, name + ' fehlt');
  }
  assert.equal(existsSync(join(ausgabe, 'beispiel-data')), false, 'beispiel-data wurde mitkopiert');
  assert.equal(existsSync(join(ausgabe, 'sw.template.js')), false, 'sw.template.js wurde mitkopiert');
});

pruefe('jg5.json folgt dem Datenmodell', () => {
  const jg = JSON.parse(readFileSync(join(ARBEIT, 'inhalt', 'data', 'jg5.json'), 'utf8'));
  assert.equal(jg.jgst, 5);
  assert.deepEqual(jg.klassen, ['A', 'B', 'C']);
  assert.equal(jg.ton, 'verspielt');
  assert.equal(jg.slots.length, 4, 'die Kommentarzeile wurde nicht uebersprungen');
  const erster = jg.slots.find((slot) => slot.id === 'jg5-de-1');
  assert.equal(erster.abgabe, '2026-10-02', 'abgabe leer muss bis werden');
  assert.deepEqual(erster.spuren, [1]);
  const fvu = jg.slots.find((slot) => slot.id === 'jg5-fvu-1');
  assert.deepEqual(fvu.spuren, [1, 2, 3]);
  const zweiter = jg.slots.find((slot) => slot.id === 'jg5-de-2');
  assert.equal(zweiter.abgabe, '2026-11-19', 'eine eigene Abgabe muss bleiben');
  const baustein = jg.bausteine.find((b) => b.id === 'jg5-de-1');
  assert.equal(baustein.stationen.length, 2);
  assert.equal(baustein.stationen[0].nr, 1);
  assert.equal(jg.coachings[0].wochentag, 1, 'Mo muss zu 1 werden');
  assert.equal(jg.coachings[0].gueltigBis, null);
  assert.equal(jg.inputs[0].pflicht, true, 'ja muss zu true werden');
  assert.deepEqual(jg.bausteine.find((b) => b.id === 'jg5-ma-1').alternativen,
    ['Testthema B1', 'Testthema B2']);
  assert.equal(jg.termine[0].datum, '2026-09-08', 'Termine muessen nach Datum sortiert sein');
});

pruefe('schule.json enthaelt die Ferien aus den Datumszellen', () => {
  const schule = JSON.parse(readFileSync(join(ARBEIT, 'inhalt', 'data', 'schule.json'), 'utf8'));
  const herbst = schule.ferien.find((f) => f.name === 'Herbstferien');
  assert.equal(herbst.von, '2026-10-12');
  assert.equal(herbst.bis, '2026-10-24');
  assert.equal(schule.faecher[0].id, 'de', 'Faecher muessen nach reihenfolge sortiert sein');
});

pruefe('index.json bekommt version und erzeugt', () => {
  const index = JSON.parse(readFileSync(join(ARBEIT, 'inhalt', 'data', 'index.json'), 'utf8'));
  assert.ok(index.version, 'version fehlt');
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(index.erzeugt), 'erzeugt fehlt oder ist kein Zeitstempel');
  assert.equal(index.schuljahr, '2026/27');
});

pruefe('wissen.json enthaelt Seiten, Glossar und FAQ', () => {
  const wissen = JSON.parse(readFileSync(join(ARBEIT, 'inhalt', 'data', 'wissen.json'), 'utf8'));
  assert.equal(wissen.glossar.length, 2);
  assert.equal(wissen.faq.length, 1);
  const seite = wissen.seiten.find((s) => s.id === 'teststart');
  assert.ok(seite.html.includes('<a href="#/stufen">'));
  assert.ok(!seite.html.includes('<b>'));
  assert.equal(seite.abschnitte[0].anker, 'erster-abschnitt');
  assert.equal(seite.absaetze, undefined, 'absaetze gehoeren nicht in die veroeffentlichte Datei');
});

pruefe('der Suchindex enthaelt Bausteine, Stationen, Inputs und Wissen', () => {
  const suche = JSON.parse(readFileSync(join(ARBEIT, 'inhalt', 'data', 'suche-jg5.json'), 'utf8'));
  const typen = new Set(suche.eintraege.map((eintrag) => eintrag.typ));
  for (const typ of ['baustein', 'station', 'input', 'wissen', 'glossar', 'faq']) {
    assert.ok(typen.has(typ), 'Typ fehlt im Suchindex: ' + typ);
  }
  const baustein = suche.eintraege.find((eintrag) => eintrag.id === 'baustein:jg5-de-1');
  assert.equal(baustein.route, '#/baustein/jg5-de-1');
  assert.equal(baustein.fach, 'de');
});

pruefe('sw.js hat Version und Precache-Liste, aber nicht sich selbst', () => {
  const sw = readFileSync(join(ARBEIT, 'inhalt', 'sw.js'), 'utf8');
  assert.ok(!sw.includes('__VERSION__'), 'Platzhalter __VERSION__ steht noch drin');
  assert.ok(!sw.includes('__PRECACHE__'), 'Platzhalter __PRECACHE__ steht noch drin');
  assert.ok(sw.includes('"./"'), 'die Startseite fehlt im Precache');
  assert.ok(sw.includes('"./index.html"'), 'index.html fehlt im Precache');
  assert.ok(sw.includes('"./data/jg5.json"'), 'die Daten fehlen im Precache');
  assert.ok(!sw.includes('"./sw.js"'), 'sw.js darf sich nicht selbst vormerken');
});

console.log('');
console.log('Akzeptanzkriterium 8: Geschwindigkeit');

await pruefeAsync('der Build des Repos mit drei Jahrgaengen dauert unter 10 Sekunden', async () => {
  const start = Date.now();
  const ergebnis = await baue({ repo: REPO, ausgabe: arbeitsordner('tempo'), still: true });
  const dauer = (Date.now() - start) / 1000;
  assert.equal(ergebnis.ok, true, ergebnis.fehler.join(' | '));
  assert.equal(ergebnis.zusammenfassung.jahrgaenge.length, 3, 'es wurden nicht drei Jahrgaenge gebaut');
  assert.ok(dauer < 10, 'der Build brauchte ' + dauer.toFixed(1) + ' s');
  console.log('        (' + dauer.toFixed(1) + ' s fuer drei Jahrgaenge)');
});

// ------------------------------------------------------------ Aufraeumen

rmSync(ARBEIT, { recursive: true, force: true });

console.log('');
console.log(bestanden + ' Pruefungen bestanden, ' + fehlgeschlagen.length + ' fehlgeschlagen.');
if (fehlgeschlagen.length > 0) {
  for (const { name, fehler } of fehlgeschlagen) {
    console.log('  ' + name + ': ' + (fehler && fehler.message ? fehler.message : fehler));
  }
  process.exit(1);
}
