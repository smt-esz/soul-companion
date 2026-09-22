// AP-05: erzeugt die leeren Excel-Vorlagen in content/.
// Aufruf: node tools/vorlagen.mjs [--ueberschreiben]
// Quelle der Spalten und Auswahllisten: Planung/DATENMODELL.md (Abschnitt 2 und 3), Planung/REDAKTION.md (Abschnitt 2).
import ExcelJS from 'exceljs';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const UEBERSCHREIBEN = process.argv.includes('--ueberschreiben');

// ---- Auswahllisten (Vorgabe AP-05) ----------------------------------------
const FACH = ['de', 'ma', 'en', 'bio', 'geo', 'fvu', 'offen'];
const PFLICHT = ['ja', 'nein'];
const STATUS = ['fest', 'wahl', 'vorlaeufig', 'offen'];
const TON = ['verspielt', 'klar', 'sachlich'];
const WOCHENTAG = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const KLASSE = ['A', 'B', 'C'];
const SONDERWOCHEN_ART = ['themenwoche', 'soul-basics', 'puffer', 'kennenlernen', 'einfuehrung', 'besinntage', 'fvu', 'letzte-woche', 'sonstiges'];
const STATIONEN_ART = ['pflicht', 'wahl'];
const INPUTS_ART = ['fach', 'methode', 'baustein'];
const TERMINE_ART = ['input', 'coaching', 'sonstiges', 'entfall'];

const ZEILEN_FUER_VALIDIERUNG = 500;

// ---- Hilfsfunktionen für Spaltendefinitionen -------------------------------
function col(name, { breite = 14, umbruch = false, datum = false, auswahl = null, erklaerung, beispiel = '' } = {}) {
  return { name, breite, umbruch, datum, auswahl, erklaerung, beispiel };
}

// ---- Blattdefinitionen: schule.xlsx ----------------------------------------
const FAECHER_SPALTEN = [
  col('id', { breite: 10, erklaerung: 'Fach-ID, klein, ohne Leerzeichen, einmal vergeben nie ändern.', beispiel: 'bio' }),
  col('name', { breite: 16, erklaerung: 'Anzeigename des Fachs.', beispiel: 'Biologie' }),
  col('kurz', { breite: 8, erklaerung: 'Kürzel-Abzeichen, maximal 3 Zeichen.', beispiel: 'Bio' }),
  col('farbe', { breite: 10, erklaerung: 'Farbsatz aus DESIGN.md 2.2 (ma, de, en, bio, geo, offen); neue Fächer bekommen dort einen Satz.', beispiel: 'bio' }),
  col('symbol', { breite: 16, erklaerung: 'Icon-Name aus DESIGN.md (Fachsymbole aus SOUL Fachräume).', beispiel: 'fach-bio' }),
  col('reihenfolge', { breite: 12, erklaerung: 'Sortierung, Pflicht.', beispiel: '4' }),
];
const FAECHER_ZEILEN = [
  { id: 'de', name: 'Deutsch', kurz: 'De', farbe: 'de', symbol: 'fach-de', reihenfolge: 1 },
  { id: 'ma', name: 'Mathematik', kurz: 'Ma', farbe: 'ma', symbol: 'fach-ma', reihenfolge: 2 },
  { id: 'en', name: 'Englisch', kurz: 'En', farbe: 'en', symbol: 'fach-en', reihenfolge: 3 },
  { id: 'bio', name: 'Biologie', kurz: 'Bio', farbe: 'bio', symbol: 'fach-bio', reihenfolge: 4 },
  { id: 'geo', name: 'Geografie', kurz: 'Geo', farbe: 'geo', symbol: 'fach-geo', reihenfolge: 5 },
  { id: 'fvu', name: 'Fächerverbindend', kurz: 'FvU', farbe: 'fvu', symbol: 'zahnrad', reihenfolge: 6 },
];

const FERIEN_SPALTEN = [
  col('name', { breite: 18, erklaerung: 'Name der Ferien oder des freien Tages (auch einzelne Brückentage als eigene Zeile).', beispiel: 'Herbstferien' }),
  col('von', { breite: 13, datum: true, erklaerung: 'Erster freier Tag.', beispiel: '2026-10-12' }),
  col('bis', { breite: 13, datum: true, erklaerung: 'Letzter freier Tag.', beispiel: '2026-10-24' }),
  col('quelle', { breite: 22, umbruch: true, erklaerung: 'Herkunft der Angabe, damit sie sich prüfen lässt.', beispiel: 'kultus.sachsen.de (zu prüfen)' }),
];

const STUFEN_SPALTEN = [
  col('id', { breite: 8, erklaerung: 'Stufennummer.', beispiel: '1' }),
  col('name', { breite: 14, erklaerung: 'Name der Stufe.', beispiel: 'Wurzel' }),
  col('symbol', { breite: 14, erklaerung: 'Icon-Name aus DESIGN.md.', beispiel: 'wurzel' }),
  col('kurzbeschreibung', { breite: 30, umbruch: true, erklaerung: 'Kurzer Text zur Stufe. Rechte, Freiheiten und Aufstiegskriterien stehen nicht hier, sondern in der Wissensseite stufen.md und in content/antrag.json, damit der Wortlaut nur an einer Stelle liegt.', beispiel: '' }),
];
const STUFEN_ZEILEN = [
  { id: 1, name: 'Wurzel', symbol: 'wurzel', kurzbeschreibung: '' },
  { id: 2, name: 'Stamm', symbol: 'stamm', kurzbeschreibung: '' },
  { id: 3, name: 'Krone', symbol: 'krone', kurzbeschreibung: '' },
];

// ---- Blattdefinitionen: Jahrgang JgN.xlsx / Jahrgang_Vorlage.xlsx ---------
const JAHRGANG_SPALTEN = [
  col('jgst', { breite: 8, erklaerung: 'Jahrgangsstufe.', beispiel: '5' }),
  col('ton', { breite: 12, auswahl: TON, erklaerung: 'Tonfall der App-Texte für diesen Jahrgang.', beispiel: 'verspielt' }),
  col('klassen', { breite: 12, erklaerung: 'Klassen des Jahrgangs, mit Komma getrennt.', beispiel: 'A,B,C' }),
  col('fruehesterAufstieg', { breite: 16, datum: true, erklaerung: 'Frühestes Datum für einen Stufenaufstieg laut Onboarding-Heft. Für Jg 6/7 leer lassen, wenn keine Sperre gilt.', beispiel: '2026-10-26' }),
  col('hinweis', { breite: 30, umbruch: true, erklaerung: 'Freier Hinweistext zum Jahrgang, optional.', beispiel: '' }),
];

const SONDERWOCHEN_SPALTEN = [
  col('von', { breite: 13, datum: true, erklaerung: 'Erster Tag der Sonderwoche.', beispiel: '2026-09-14' }),
  col('bis', { breite: 13, datum: true, erklaerung: 'Letzter Tag der Sonderwoche.', beispiel: '2026-09-18' }),
  col('titel', { breite: 28, umbruch: true, erklaerung: 'Titel der Sonderwoche.', beispiel: 'Themen- und Fahrtenwoche' }),
  col('art', { breite: 14, auswahl: SONDERWOCHEN_ART, erklaerung: 'Art der Sonderwoche.', beispiel: 'themenwoche' }),
];

const SLOTS_SPALTEN = [
  col('id', { breite: 12, erklaerung: 'Slot-ID, klein, ohne Leerzeichen, einmal vergeben nie ändern.', beispiel: 'jg5-de-1' }),
  col('fach', { breite: 8, auswahl: FACH, erklaerung: 'Fach des Slots.', beispiel: 'de' }),
  col('nr', { breite: 6, erklaerung: 'Interne Nummer. Bestimmt keine Reihenfolge und wird SuS nicht angezeigt, die App sortiert immer nach Datum.', beispiel: '1' }),
  col('spur', { breite: 8, erklaerung: 'Spur des Slots.', beispiel: '1' }),
  col('spuren', { breite: 10, erklaerung: 'Nur ausfüllen, wenn der Slot mehrere Spuren belegt (z. B. fächerverbindender Unterricht), sonst gilt spur.', beispiel: '' }),
  col('stunden', { breite: 10, erklaerung: 'Anzahl Stunden, darf leer bleiben.', beispiel: '8' }),
  col('von', { breite: 13, datum: true, erklaerung: 'Erster Tag des Slots.', beispiel: '2026-08-31' }),
  col('bis', { breite: 13, datum: true, erklaerung: 'Letzter Tag des Slots.', beispiel: '2026-10-02' }),
  col('abgabe', { breite: 13, datum: true, erklaerung: 'Abgabetermin, wenn abweichend vom Slot-Ende. Leer = bis.', beispiel: '' }),
  col('baustein', { breite: 12, erklaerung: 'Verweist auf die ID im Blatt Bausteine.', beispiel: 'jg5-de-1' }),
  col('status', { breite: 12, auswahl: STATUS, erklaerung: 'fest, wahl (Wahlbaustein), vorlaeufig (Fach geplant, Tausch möglich, hinweis erklärt) oder offen (Fach folgt, fach = offen).', beispiel: 'fest' }),
  col('hinweis', { breite: 26, umbruch: true, erklaerung: 'Freier Hinweistext, z. B. Begründung bei vorlaeufig.', beispiel: '' }),
];

const BAUSTEINE_SPALTEN = [
  col('id', { breite: 12, erklaerung: 'Baustein-ID, klein, ohne Leerzeichen, einmal vergeben nie ändern.', beispiel: 'jg5-bio-1' }),
  col('fach', { breite: 8, auswahl: FACH, erklaerung: 'Fach des Bausteins.', beispiel: 'bio' }),
  col('titel', { breite: 30, umbruch: true, erklaerung: 'Titel des Bausteins. Leer = die App zeigt "Thema folgt".', beispiel: 'Fische & Merkmale des Lebens' }),
  col('alternativen', { breite: 24, umbruch: true, erklaerung: 'Bei Wahl-Slots mit " ODER " getrennt (Beispiel: Jg 6 Deutsch 3).', beispiel: '' }),
  col('gelingensnachweis', { breite: 30, umbruch: true, erklaerung: 'Text des Gelingensnachweises.', beispiel: 'Bedrohung und Schutz der Fische' }),
  col('gelingensnachweisStation', { breite: 14, erklaerung: 'Nummer der Station mit dem Gelingensnachweis.', beispiel: '13' }),
  col('materialort', { breite: 20, umbruch: true, erklaerung: 'Nur Ortsangabe als Text, kein Link, kein Material.', beispiel: '' }),
  col('kurzbeschreibung', { breite: 30, umbruch: true, erklaerung: 'Kurzbeschreibung des Bausteins, optional.', beispiel: '' }),
];

const STATIONEN_SPALTEN = [
  col('baustein', { breite: 12, erklaerung: 'Verweist auf die ID im Blatt Bausteine.', beispiel: 'jg5-de-1' }),
  col('nr', { breite: 6, erklaerung: 'Stationsnummer je Baustein, eindeutig und lückenlos ab 1.', beispiel: '1' }),
  col('titel', { breite: 30, umbruch: true, erklaerung: 'Titel der Station.', beispiel: 'Der persönliche Brief: Aufbau' }),
  col('art', { breite: 10, auswahl: STATIONEN_ART, erklaerung: 'pflicht oder wahl.', beispiel: 'pflicht' }),
  col('minuten', { breite: 10, erklaerung: 'Geplante Dauer in Minuten.', beispiel: '20' }),
  col('niveau', { breite: 9, erklaerung: 'Niveau 1 bis 3 (Sterne).', beispiel: '1' }),
  col('material', { breite: 16, umbruch: true, erklaerung: 'Nur die Kürzel wie im Baustein (z. B. A1, M2), keine Dateien.', beispiel: 'A1, A2' }),
  col('hinweis', { breite: 24, umbruch: true, erklaerung: 'Freier Hinweistext, optional.', beispiel: '' }),
];

const INPUTS_SPALTEN = [
  col('id', { breite: 16, erklaerung: 'Input-ID, klein, ohne Leerzeichen, einmal vergeben nie ändern.', beispiel: 'jg5-bio-sektion' }),
  col('fach', { breite: 8, auswahl: FACH, erklaerung: 'Fach des Inputs.', beispiel: 'bio' }),
  col('art', { breite: 12, auswahl: INPUTS_ART, erklaerung: 'fach (fachlich übergreifend), methode (Arbeitstechnik) oder baustein.', beispiel: 'baustein' }),
  col('titel', { breite: 26, umbruch: true, erklaerung: 'Titel des Inputs.', beispiel: 'Sektion eines Fisches' }),
  col('beschreibung', { breite: 26, umbruch: true, erklaerung: 'Beschreibung des Inputs, optional.', beispiel: '' }),
  col('pflicht', { breite: 9, auswahl: PFLICHT, erklaerung: 'Ist der Input Pflicht.', beispiel: 'ja' }),
  col('bausteine', { breite: 20, umbruch: true, erklaerung: 'Kommagetrennte Baustein-IDs, optional.', beispiel: 'jg5-bio-1' }),
];

const COACHINGS_SPALTEN = [
  col('wochentag', { breite: 11, auswahl: WOCHENTAG, erklaerung: 'Wochentag des Wochenmusters, Mo bis Fr.', beispiel: 'Mo' }),
  col('kuerzel', { breite: 10, erklaerung: 'Kürzel der Lernbegleitung, 2 bis 4 Großbuchstaben.', beispiel: 'ERL' }),
  col('gueltigAb', { breite: 13, datum: true, erklaerung: 'Erster Tag, ab dem das Muster gilt.', beispiel: '2026-09-07' }),
  col('gueltigBis', { breite: 13, datum: true, erklaerung: 'Letzter Tag. Leer = gilt das ganze Schuljahr.', beispiel: '' }),
  col('klasse', { breite: 9, auswahl: KLASSE, erklaerung: 'Klasse, leer = ganzer Jahrgang.', beispiel: '' }),
];

const TERMINE_SPALTEN = [
  col('datum', { breite: 13, datum: true, erklaerung: 'Datum des Termins, muss ein Schultag sein.', beispiel: '2026-09-08' }),
  col('art', { breite: 12, auswahl: TERMINE_ART, erklaerung: 'input, coaching, sonstiges oder entfall.', beispiel: 'input' }),
  col('fach', { breite: 8, auswahl: FACH, erklaerung: 'Fach des Termins, wenn zutreffend.', beispiel: 'bio' }),
  col('kuerzel', { breite: 10, erklaerung: 'Kürzel der Lernbegleitung, 2 bis 4 Großbuchstaben.', beispiel: 'HAM' }),
  col('klasse', { breite: 9, auswahl: KLASSE, erklaerung: 'Klasse, leer = ganzer Jahrgang.', beispiel: 'A' }),
  col('input', { breite: 18, erklaerung: 'ID aus Blatt Inputs. Entweder input oder text ausfüllen.', beispiel: 'jg5-bio-sektion' }),
  col('text', { breite: 26, umbruch: true, erklaerung: 'Freier Text statt input, z. B. bei sonstiges oder entfall.', beispiel: '' }),
  col('station', { breite: 9, erklaerung: 'Stationsnummer, wenn zutreffend.', beispiel: '9' }),
  col('pflicht', { breite: 9, auswahl: PFLICHT, erklaerung: 'Ist der Termin Pflicht.', beispiel: 'ja' }),
  col('raster', { breite: 12, erklaerung: 'ID aus Blatt Raster für den Zeitraum.', beispiel: 'jg5-r1' }),
];

const RASTER_SPALTEN = [
  col('id', { breite: 10, erklaerung: 'Raster-ID, klein, ohne Leerzeichen, einmal vergeben nie ändern.', beispiel: 'jg5-r1' }),
  col('von', { breite: 13, datum: true, erklaerung: 'Erster Tag des Rasterzeitraums.', beispiel: '2026-08-31' }),
  col('bis', { breite: 13, datum: true, erklaerung: 'Letzter Tag des Rasterzeitraums.', beispiel: '2026-10-02' }),
  col('titel', { breite: 30, umbruch: true, erklaerung: 'Titel des Rasterzeitraums.', beispiel: 'Bausteinzeitraum 31.08. bis 02.10.2026' }),
];

// ---- Workbook-Aufbau --------------------------------------------------------
function schreibeDatenblatt(workbook, blattname, spalten, zeilen = []) {
  const sheet = workbook.addWorksheet(blattname);
  sheet.columns = spalten.map((s) => ({ header: s.name, key: s.name, width: s.breite }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: spalten.length } };

  for (const zeile of zeilen) {
    sheet.addRow(zeile);
  }

  spalten.forEach((s, i) => {
    const spalte = sheet.getColumn(i + 1);
    if (s.umbruch) {
      spalte.alignment = { wrapText: true, vertical: 'top' };
    }
    if (s.datum) {
      spalte.numFmt = 'dd.mm.yyyy';
    }
    if (s.auswahl) {
      sheet.dataValidations.add(`${spalte.letter}2:${spalte.letter}${ZEILEN_FUER_VALIDIERUNG}`, {
        type: 'list',
        allowBlank: true,
        formulae: [`"${s.auswahl.join(',')}"`],
      });
    }
  });

  return sheet;
}

function schreibeHinweise(workbook, titel, blaetter) {
  const sheet = workbook.addWorksheet('Hinweise', { properties: { tabColor: { argb: 'FF6B9080' } } });
  sheet.columns = [
    { key: 'blatt', width: 16 },
    { key: 'spalte', width: 20 },
    { key: 'erklaerung', width: 60 },
    { key: 'beispiel', width: 24 },
  ];

  sheet.mergeCells('A1:D1');
  sheet.getCell('A1').value = titel;
  sheet.getCell('A1').font = { bold: true, size: 14 };

  sheet.mergeCells('A2:D2');
  sheet.getCell('A2').value =
    'Ausführliche Anleitung: Planung/REDAKTION.md. Kopfzeile nie ändern, keine Spalten löschen oder umbenennen, neue Spalten rechts sind erlaubt. ' +
    'Datum als Datumszelle oder als Text im Format JJJJ-MM-TT. IDs klein, ohne Leerzeichen, stabil, einmal vergeben nie ändern. ' +
    'Keine Namen von Schülerinnen und Schülern, keine Links auf Material. Zeilen mit # in Spalte A sind Kommentare und werden übersprungen.';
  sheet.getCell('A2').alignment = { wrapText: true, vertical: 'top' };
  sheet.getRow(2).height = 60;

  let zeile = 4;
  const kopf = sheet.getRow(zeile);
  kopf.values = ['Blatt', 'Spalte', 'Erklärung', 'Beispiel'];
  kopf.font = { bold: true };
  zeile += 1;

  for (const blatt of blaetter) {
    const blattStart = zeile;
    sheet.getCell(`A${zeile}`).value = blatt.blatt;
    sheet.getCell(`A${zeile}`).font = { bold: true };
    sheet.getCell(`B${zeile}`).value = '';
    sheet.mergeCells(`B${zeile}:D${zeile}`);
    sheet.getCell(`B${zeile}`).value = blatt.beschreibung;
    sheet.getCell(`B${zeile}`).alignment = { wrapText: true };
    zeile += 1;
    for (const spalte of blatt.spalten) {
      sheet.getCell(`A${zeile}`).value = '';
      sheet.getCell(`B${zeile}`).value = spalte.name;
      sheet.getCell(`C${zeile}`).value = spalte.erklaerung;
      sheet.getCell(`C${zeile}`).alignment = { wrapText: true, vertical: 'top' };
      sheet.getCell(`D${zeile}`).value = spalte.beispiel;
      zeile += 1;
    }
    void blattStart;
  }

  sheet.views = [{ state: 'frozen', ySplit: 4 }];
  return sheet;
}

// ---- Beschreibungstexte der Blätter (für Hinweise) -------------------------
const BESCHREIBUNG = {
  Faecher: 'Fächer der Schule. Startwerte sind vorbefüllt, Geschichte (ge) wird erst ergänzt, wenn sie einen Slot bekommt.',
  Ferien: 'Ferien und einzelne freie Tage (auch Brückentage). A/B-Wochen werden nicht gepflegt.',
  Stufen: 'Die drei SOUL-Stufen. Startwerte sind vorbefüllt.',
  Jahrgang: 'Eine Zeile mit den Grunddaten des Jahrgangs. jgst und klassen sind vorbefüllt.',
  Sonderwochen: 'Wochen, die nicht dem normalen Wochenraster folgen.',
  Slots: 'Die Bausteinzeiträume je Fach und Spur.',
  Bausteine: 'Die Bausteine, auf die die Slots verweisen.',
  Stationen: 'Die Stationen je Baustein.',
  Inputs: 'Das Input-Curriculum, auf das Termine verweisen können.',
  Coachings: 'Das Wochenmuster der Coachings. Die App erzeugt daraus an jedem passenden Schultag einen Termin, außer in Sonderwochen und Ferien.',
  Termine: 'Alles, was nicht ins Coaching-Wochenmuster passt: einzelne Input-Termine, Sondertermine, Entfall.',
  Raster: 'Die Zeiträume, für die ein Wochenraster angezeigt wird.',
};

function hinweiseEintraege(blattnamen, spaltenNachBlatt) {
  return blattnamen.map((name) => ({
    blatt: name,
    beschreibung: BESCHREIBUNG[name],
    spalten: spaltenNachBlatt[name],
  }));
}

// ---- Dateien erzeugen --------------------------------------------------------
async function baueSchule() {
  const workbook = new ExcelJS.Workbook();
  schreibeHinweise(
    workbook,
    'Hinweise zu schule.xlsx',
    hinweiseEintraege(['Faecher', 'Ferien', 'Stufen'], { Faecher: FAECHER_SPALTEN, Ferien: FERIEN_SPALTEN, Stufen: STUFEN_SPALTEN })
  );
  schreibeDatenblatt(workbook, 'Faecher', FAECHER_SPALTEN, FAECHER_ZEILEN);
  schreibeDatenblatt(workbook, 'Ferien', FERIEN_SPALTEN, []);
  schreibeDatenblatt(workbook, 'Stufen', STUFEN_SPALTEN, STUFEN_ZEILEN);
  return workbook;
}

const JAHRGANG_BLATTNAMEN = ['Jahrgang', 'Sonderwochen', 'Slots', 'Bausteine', 'Stationen', 'Inputs', 'Coachings', 'Termine', 'Raster'];
const JAHRGANG_SPALTEN_NACH_BLATT = {
  Jahrgang: JAHRGANG_SPALTEN,
  Sonderwochen: SONDERWOCHEN_SPALTEN,
  Slots: SLOTS_SPALTEN,
  Bausteine: BAUSTEINE_SPALTEN,
  Stationen: STATIONEN_SPALTEN,
  Inputs: INPUTS_SPALTEN,
  Coachings: COACHINGS_SPALTEN,
  Termine: TERMINE_SPALTEN,
  Raster: RASTER_SPALTEN,
};

async function baueJahrgang({ titel, jgst }) {
  const workbook = new ExcelJS.Workbook();
  schreibeHinweise(workbook, `Hinweise zu ${titel}`, hinweiseEintraege(JAHRGANG_BLATTNAMEN, JAHRGANG_SPALTEN_NACH_BLATT));
  const jahrgangZeilen = jgst ? [{ jgst, klassen: 'A,B,C' }] : [];
  schreibeDatenblatt(workbook, 'Jahrgang', JAHRGANG_SPALTEN, jahrgangZeilen);
  schreibeDatenblatt(workbook, 'Sonderwochen', SONDERWOCHEN_SPALTEN, []);
  schreibeDatenblatt(workbook, 'Slots', SLOTS_SPALTEN, []);
  schreibeDatenblatt(workbook, 'Bausteine', BAUSTEINE_SPALTEN, []);
  schreibeDatenblatt(workbook, 'Stationen', STATIONEN_SPALTEN, []);
  schreibeDatenblatt(workbook, 'Inputs', INPUTS_SPALTEN, []);
  schreibeDatenblatt(workbook, 'Coachings', COACHINGS_SPALTEN, []);
  schreibeDatenblatt(workbook, 'Termine', TERMINE_SPALTEN, []);
  schreibeDatenblatt(workbook, 'Raster', RASTER_SPALTEN, []);
  return workbook;
}

// ---- Schreiben mit Überschreib-Schutz ---------------------------------------
async function schreibeDatei(pfad, baueWorkbook) {
  if (existsSync(pfad) && !UEBERSCHREIBEN) {
    console.log(`übersprungen (existiert schon, --ueberschreiben nutzen): ${pfad}`);
    return false;
  }
  mkdirSync(dirname(pfad), { recursive: true });
  const workbook = await baueWorkbook();
  await workbook.xlsx.writeFile(pfad);
  console.log(`geschrieben: ${pfad}`);
  return true;
}

// ---- Vergleich: Spaltennamen zeichengenau gegen die Vorgabe prüfen ----------
async function pruefeSpalten(pfad, erwarteteBlaetter) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(pfad);
  let ok = true;
  for (const [blattname, spalten] of Object.entries(erwarteteBlaetter)) {
    const sheet = workbook.getWorksheet(blattname);
    if (!sheet) {
      console.log(`  FEHLER ${pfad} :: Blatt "${blattname}" fehlt`);
      ok = false;
      continue;
    }
    const kopfzeile = sheet.getRow(1).values.slice(1).map(String);
    const erwartet = spalten.map((s) => s.name);
    const stimmt = erwartet.length === kopfzeile.length && erwartet.every((name, i) => name === kopfzeile[i]);
    if (stimmt) {
      console.log(`  ok ${pfad} :: ${blattname}`);
    } else {
      console.log(`  FEHLER ${pfad} :: ${blattname} :: erwartet [${erwartet.join(', ')}] gefunden [${kopfzeile.join(', ')}]`);
      ok = false;
    }
  }
  return ok;
}

// ---- Hauptprogramm ------------------------------------------------------------
async function main() {
  const dateien = [
    {
      pfad: join(REPO, 'content', 'schule.xlsx'),
      bauen: baueSchule,
      blaetter: { Faecher: FAECHER_SPALTEN, Ferien: FERIEN_SPALTEN, Stufen: STUFEN_SPALTEN },
    },
    {
      pfad: join(REPO, 'content', 'jahrgaenge', 'Jg5.xlsx'),
      bauen: () => baueJahrgang({ titel: 'Jg5.xlsx', jgst: 5 }),
      blaetter: JAHRGANG_SPALTEN_NACH_BLATT,
    },
    {
      pfad: join(REPO, 'content', 'jahrgaenge', 'Jg6.xlsx'),
      bauen: () => baueJahrgang({ titel: 'Jg6.xlsx', jgst: 6 }),
      blaetter: JAHRGANG_SPALTEN_NACH_BLATT,
    },
    {
      pfad: join(REPO, 'content', 'jahrgaenge', 'Jg7.xlsx'),
      bauen: () => baueJahrgang({ titel: 'Jg7.xlsx', jgst: 7 }),
      blaetter: JAHRGANG_SPALTEN_NACH_BLATT,
    },
    {
      pfad: join(REPO, 'content', 'vorlagen', 'Jahrgang_Vorlage.xlsx'),
      bauen: () => baueJahrgang({ titel: 'Jahrgang_Vorlage.xlsx', jgst: null }),
      blaetter: JAHRGANG_SPALTEN_NACH_BLATT,
    },
  ];

  for (const d of dateien) {
    await schreibeDatei(d.pfad, d.bauen);
  }

  console.log('\nVergleich der Spaltennamen mit der Vorgabe (DATENMODELL.md 2 und 3):');
  let gesamtOk = true;
  for (const d of dateien) {
    if (!existsSync(d.pfad)) continue;
    const ok = await pruefeSpalten(d.pfad, d.blaetter);
    gesamtOk = gesamtOk && ok;
  }
  console.log(gesamtOk ? '\nok: alle Spaltennamen stimmen mit der Vorgabe überein.' : '\nFEHLER: Abweichungen gefunden, siehe oben.');
  if (!gesamtOk) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
