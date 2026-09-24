// Build und Pruefung fuer SOUL Companion (AP-02, ARCHITEKTUR 3.9).
//
//   node tools/build.mjs [--ziel=oeffentlich|intern] [--vorschau] [--ausgabe=<ordner>]
//
// Aus content/ und src/ wird eine veroeffentlichungsfertige Website:
// geprueftes JSON in <ausgabe>/data/, kopierter App-Code und ein passender
// Service Worker. Fehler werden gesammelt und am Ende alle zusammen gemeldet,
// jeweils mit Datei, Blatt, Zeile und Feld.
//
// Dieses Werkzeug laeuft nur auf Leos Rechner. Im Browser landet nichts davon.

import { execFile } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import {
  alsJaNein, alsListe, alsText, alsWochentag, alsZahl, alsZahlenliste, leseMappe
} from './lib/excel.mjs';
import { trenneKopfdaten, zerlegeNachUeberschriften, zuAnker, zuHtml } from './lib/markdown.mjs';
import {
  Meldungen, formatiere, pruefeAntrag, pruefeIndex, pruefeJahrgang, pruefeSchule, pruefeWissenKopf
} from './lib/validate.mjs';
import { erzeugeServiceWorker } from './lib/swgen.mjs';
import { baueSuchindex } from './lib/suche.mjs';

const ausfuehren = promisify(execFile);

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const JAHRGANG_BLAETTER = ['Jahrgang', 'Sonderwochen', 'Slots', 'Bausteine', 'Stationen', 'Inputs', 'Coachings', 'Termine', 'Raster'];
const SCHULE_BLAETTER = ['Faecher', 'Ferien', 'Stufen'];
const VERBOTENE_ENDUNGEN = ['.pdf', '.docx', '.pptx', '.xlsx', '.xlsm', '.doc', '.ppt', '.xls'];

// ---------------------------------------------------------------- oeffentlich

/**
 * Baut die Website.
 * @param {object} optionen  { repo, inhalt, quelle, ausgabe, ziel, vorschau, still }
 * @returns {Promise<{ ok, fehler, warnungen, version, zusammenfassung }>}
 */
export async function baue(optionen = {}) {
  const start = Date.now();
  const repo = resolve(optionen.repo || REPO);
  const inhalt = resolve(optionen.inhalt || join(repo, 'content'));
  const quelle = resolve(optionen.quelle || join(repo, 'src'));
  const ziel = optionen.ziel || 'oeffentlich';
  const vorschau = optionen.vorschau === true;
  const still = optionen.still === true;
  const sage = still ? () => {} : (text) => console.log(text);

  if (ziel !== 'oeffentlich' && ziel !== 'intern') {
    return abbruch(['FEHLER --ziel: "' + ziel + '" gibt es nicht. Erlaubt: oeffentlich, intern.'], still);
  }

  // Schritt 1: Ausgabeordner bestimmen und pruefen.
  const standard = ziel === 'intern' ? 'dist-intern' : 'docs';
  const ausgabe = resolve(repo, optionen.ausgabe || standard);
  const verweigert = pruefeAusgabeordner(ausgabe, repo, quelle, inhalt);
  if (verweigert) return abbruch(['FEHLER --ausgabe: ' + verweigert], still);

  if (!existsSync(quelle)) return abbruch(['FEHLER Den Ordner src/ gibt es nicht: ' + quelle], still);
  if (!existsSync(inhalt)) return abbruch(['FEHLER Den Ordner content/ gibt es nicht: ' + inhalt], still);

  // Materialschutz schon an der Quelle, damit ein Abbruch nichts geloescht hat.
  if (ziel === 'oeffentlich') {
    const fund = sucheMaterial(quelle, ['beispiel-data']);
    if (fund.length > 0) {
      return abbruch([
        'FEHLER Materialschutz: Im oeffentlichen Build darf kein Material mitgehen.',
        ...hoechstensZwanzig(fund).map((pfad) => '       gefunden in src/: ' + pfad),
        '       Entweder die Dateien entfernen oder mit --ziel=intern bauen.'
      ], still);
    }
  }

  const meldungen = new Meldungen();

  // Schritt 2: content/index.json
  const bekannteModule = leseModulnamen(quelle);
  const index = await leseJson(join(inhalt, 'index.json'), 'index.json', meldungen);
  if (index === null) return fehlerAbbruch(meldungen, still);
  pruefeIndex(index, bekannteModule, meldungen);
  const jahrgaenge = Array.isArray(index.jahrgaenge) ? index.jahrgaenge.map(Number).filter(Number.isInteger) : [];

  // Schritt 3: schule.xlsx
  const schule = leseSchule(join(inhalt, 'schule.xlsx'), meldungen);
  if (schule === null) return fehlerAbbruch(meldungen, still);
  pruefeSchule(schule, meldungen);

  // Schritt 4: je Jahrgang eine Excel-Datei
  const jahrgangsdaten = [];
  for (const jgst of jahrgaenge) {
    const dateiname = 'Jg' + jgst + '.xlsx';
    const pfad = join(inhalt, 'jahrgaenge', dateiname);
    if (!existsSync(pfad)) {
      meldungen.fehler({ datei: dateiname },
        'Die Datei fehlt in content/jahrgaenge/, obwohl Jahrgang ' + jgst + ' in index.json steht.');
      continue;
    }
    const jg = leseJahrgang(pfad, dateiname, jgst, meldungen);
    if (jg === null) continue;
    pruefeJahrgang(jg, schule, meldungen, { datei: dateiname, ziel });
    jahrgangsdaten.push(jg);
  }

  // Schritt 5: Wissensseiten
  const wissen = await leseWissen(join(inhalt, 'wissen'), vorschau, meldungen);

  // Schritt 6: antrag.json
  const klassenJeJahrgang = new Map(jahrgangsdaten.map((jg) => [jg.jgst, jg.klassen]));
  const antrag = await leseAntrag(join(inhalt, 'antrag.json'), jahrgaenge, klassenJeJahrgang, meldungen);

  // Schritt 7: alle Fehler zusammen melden
  if (meldungen.hatFehler()) return fehlerAbbruch(meldungen, still);

  // Schritt 8 und 9: Daten und Dateien schreiben
  await leereOrdner(ausgabe);
  await cp(quelle, ausgabe, {
    recursive: true,
    filter: (pfad) => {
      const rel = relative(quelle, pfad);
      if (rel === '') return true;
      const teile = rel.split(sep);
      if (teile[0] === 'beispiel-data') return false;
      if (rel === 'sw.template.js') return false;
      return true;
    }
  });

  const datenOrdner = join(ausgabe, 'data');
  await mkdir(datenOrdner, { recursive: true });

  const appVersion = leseAppVersion(quelle, meldungen);
  const indexAus = { ...index, version: appVersion, erzeugt: new Date().toISOString() };
  await schreibeJson(join(datenOrdner, 'index.json'), indexAus);
  await schreibeJson(join(datenOrdner, 'schule.json'), schuleZuJson(schule));
  await schreibeJson(join(datenOrdner, 'wissen.json'), wissenZuJson(wissen));
  await schreibeJson(join(datenOrdner, 'antrag.json'), antrag);

  const statistik = [];
  for (const jg of jahrgangsdaten) {
    const daten = jahrgangZuJson(jg, ziel);
    await schreibeJson(join(datenOrdner, 'jg' + jg.jgst + '.json'), daten);
    const treffer = baueSuchindex(daten, wissen, schule);
    await schreibeJson(join(datenOrdner, 'suche-jg' + jg.jgst + '.json'), { schema: 1, jgst: jg.jgst, eintraege: treffer });
    statistik.push({
      jgst: jg.jgst,
      slots: daten.slots.length,
      bausteine: daten.bausteine.length,
      stationen: daten.bausteine.reduce((summe, baustein) => summe + baustein.stationen.length, 0),
      termine: daten.termine.length,
      inputs: daten.inputs.length,
      suche: treffer.length
    });
  }

  // Schritt 10: Materialschutz im Ausgabeordner
  if (ziel === 'oeffentlich') {
    const fund = sucheMaterial(ausgabe, []);
    if (fund.length > 0) {
      return abbruch([
        'FEHLER Materialschutz: Im Ausgabeordner liegt Material.',
        ...hoechstensZwanzig(fund).map((pfad) => '       ' + pfad),
        '       Der Build wurde abgebrochen, der Ordner ist unvollstaendig.'
      ], still);
    }
  }

  // Schritt 11: Service Worker
  const sw = await erzeugeServiceWorker({
    ausgabe,
    vorlagePfad: join(quelle, 'sw.template.js'),
    appVersion,
    normalisiereFuerHash: ohneZeitstempel
  });

  // Schritt 12: Syntaxpruefung aller ausgelieferten JavaScript-Dateien
  const syntaxfehler = await pruefeSyntax(ausgabe);
  if (syntaxfehler.length > 0) {
    return abbruch(['FEHLER Syntaxpruefung im Ausgabeordner:', ...syntaxfehler.map((z) => '       ' + z)], still);
  }

  // Schritt 13: Zusammenfassung
  const warnungen = meldungen.warnungen.map(formatiere);
  const dauer = ((Date.now() - start) / 1000).toFixed(1);
  const zusammenfassung = {
    ziel, ausgabe, version: sw.version, appVersion, vorschau,
    dateien: sw.anzahl - 1, jahrgaenge: statistik,
    wissen: {
      freigegeben: wissen.seiten.filter((seite) => seite.status === 'freigegeben').length,
      entwurf: wissen.entwuerfe,
      glossar: wissen.glossar.length,
      faq: wissen.faq.length
    },
    warnungen: warnungen.length,
    dauer
  };
  if (!still) zeigeZusammenfassung(zusammenfassung, warnungen, sage);

  return { ok: true, fehler: [], warnungen, version: sw.version, zusammenfassung };
}

// ---------------------------------------------------------------- Ausgabeordner

function pruefeAusgabeordner(ausgabe, repo, quelle, inhalt) {
  const werkzeuge = join(repo, 'tools');
  const name = basename(ausgabe).toLowerCase();

  if (ausgabe === repo) return 'Das Repo selbst darf nicht der Ausgabeordner sein (' + ausgabe + ').';
  if (['src', 'content', 'tools', 'node_modules'].includes(name)) {
    return 'Ein Ordner mit dem Namen "' + basename(ausgabe) + '" darf nicht der Ausgabeordner sein, der Build wuerde ihn leeren.';
  }
  for (const geschuetzt of [quelle, inhalt, werkzeuge]) {
    if (ausgabe === geschuetzt || ausgabe.startsWith(geschuetzt + sep)) {
      return ausgabe + ' liegt in ' + geschuetzt + '. Dort wird nichts geloescht.';
    }
  }
  if (repo === ausgabe || repo.startsWith(ausgabe + sep)) {
    return ausgabe + ' enthaelt das Repo. Der Build wuerde das ganze Projekt loeschen.';
  }
  if (dirname(ausgabe) === ausgabe) return 'Ein Laufwerks- oder Wurzelordner darf nicht der Ausgabeordner sein.';
  return null;
}

async function leereOrdner(ordner) {
  await mkdir(ordner, { recursive: true });
  for (const eintrag of await readdir(ordner)) {
    // .git und .gitkeep bleiben: sonst waere der Ordner im Repo weg.
    if (eintrag === '.git' || eintrag === '.gitkeep') continue;
    await rm(join(ordner, eintrag), { recursive: true, force: true });
  }
}

/** Material im Ordner: Unterordner "material" oder Dateien mit verbotener Endung. */
function sucheMaterial(ordner, ausnahmen) {
  const gefunden = [];
  const gehe = (pfad) => {
    for (const eintrag of readdirSync(pfad, { withFileTypes: true })) {
      const rel = relative(ordner, join(pfad, eintrag.name)).split(sep).join('/');
      if (ausnahmen.includes(rel.split('/')[0])) continue;
      if (eintrag.isDirectory()) {
        if (eintrag.name.toLowerCase() === 'material') gefunden.push(rel + '/  (Ordner "material")');
        gehe(join(pfad, eintrag.name));
      } else if (VERBOTENE_ENDUNGEN.includes(extname(eintrag.name).toLowerCase())) {
        gefunden.push(rel);
      }
    }
  };
  gehe(ordner);
  return gefunden.sort();
}

/** Lange Fundlisten kuerzen, damit die Meldung lesbar bleibt. */
function hoechstensZwanzig(liste) {
  if (liste.length <= 20) return liste;
  return [...liste.slice(0, 20), 'und ' + (liste.length - 20) + ' weitere'];
}

// ---------------------------------------------------------------- Quellen lesen

function leseModulnamen(quelle) {
  const ordner = join(quelle, 'app', 'modules');
  if (!existsSync(ordner)) return [];
  return readdirSync(ordner)
    .filter((name) => name.endsWith('.js'))
    .map((name) => name.slice(0, -3))
    .sort();
}

function leseAppVersion(quelle, meldungen) {
  const pfad = join(quelle, 'app', 'version.js');
  if (!existsSync(pfad)) {
    meldungen.warnung({ datei: 'app/version.js' }, 'Die Datei fehlt, die Version wird 0.0.0.');
    return '0.0.0';
  }
  const text = readFileSync(pfad, 'utf8');
  const treffer = text.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
  if (!treffer) {
    meldungen.warnung({ datei: 'app/version.js' }, 'Kein APP_VERSION gefunden, die Version wird 0.0.0.');
    return '0.0.0';
  }
  return treffer[1];
}

async function leseJson(pfad, dateiname, meldungen) {
  if (!existsSync(pfad)) {
    meldungen.fehler({ datei: dateiname }, 'Die Datei fehlt in content/.');
    return null;
  }
  const text = await readFile(pfad, 'utf8');
  try {
    return JSON.parse(text);
  } catch (fehler) {
    const ort = jsonFehlerOrt(fehler, text);
    meldungen.fehler({ datei: dateiname, zeile: ort.zeile },
      jsonFehlerText(fehler) + (ort.ausschnitt ? ' Dort steht: ' + ort.ausschnitt : ''));
    return null;
  }
}

/** Zeilennummer und Ausschnitt zu einem JSON-Fehler (fuer REDAKTION 5). */
export function jsonFehlerOrt(fehler, text) {
  const nachricht = String(fehler && fehler.message ? fehler.message : fehler);
  let zeile = null;
  const zeileTreffer = nachricht.match(/line (\d+)/i);
  if (zeileTreffer) {
    zeile = Number(zeileTreffer[1]);
  } else {
    const posTreffer = nachricht.match(/position (\d+)/i);
    if (posTreffer) zeile = text.slice(0, Number(posTreffer[1])).split('\n').length;
  }
  if (zeile === null) return { zeile: null, ausschnitt: '' };
  const zeilen = text.split('\n');
  const inhalt = (zeilen[zeile - 1] || '').trim();
  return { zeile, ausschnitt: inhalt.length > 70 ? inhalt.slice(0, 67) + '...' : inhalt };
}

function jsonFehlerText(fehler) {
  const nachricht = String(fehler && fehler.message ? fehler.message : fehler);
  if (/Expected ',' or/.test(nachricht) || /after property value/.test(nachricht)) {
    return 'Die Datei ist kein gueltiges JSON, vermutlich fehlt ein Komma oder eine Klammer.';
  }
  if (/Unexpected token/.test(nachricht)) {
    return 'Die Datei ist kein gueltiges JSON (unerwartetes Zeichen).';
  }
  return 'Die Datei ist kein gueltiges JSON.';
}

// ---------------------------------------------------------------- schule.xlsx

function leseSchule(pfad, meldungen) {
  if (!existsSync(pfad)) {
    meldungen.fehler({ datei: 'schule.xlsx' }, 'Die Datei fehlt in content/.');
    return null;
  }
  let mappe;
  try {
    mappe = leseMappe(pfad, 'schule.xlsx');
  } catch (fehler) {
    meldungen.fehler({ datei: 'schule.xlsx' }, 'Die Datei laesst sich nicht lesen: ' + fehler.message);
    return null;
  }
  for (const blatt of SCHULE_BLAETTER) {
    if (!mappe.hatBlatt(blatt)) {
      meldungen.fehler({ datei: 'schule.xlsx' }, 'Das Blatt "' + blatt + '" fehlt.');
      return null;
    }
  }

  const faecher = (mappe.blatt('Faecher') || []).map((zeile) => ({
    __zeile: zeile.__zeile,
    id: alsText(zeile.id),
    name: alsText(zeile.name),
    kurz: alsText(zeile.kurz),
    farbe: alsText(zeile.farbe),
    symbol: alsText(zeile.symbol),
    reihenfolge: alsZahl(zeile.reihenfolge)
  }));

  const ferien = (mappe.blatt('Ferien') || []).map((zeile) => ({
    __zeile: zeile.__zeile,
    name: alsText(zeile.name),
    von: alsText(zeile.von),
    bis: alsText(zeile.bis),
    quelle: alsText(zeile.quelle)
  }));

  const stufen = (mappe.blatt('Stufen') || []).map((zeile) => ({
    __zeile: zeile.__zeile,
    id: alsZahl(zeile.id),
    name: alsText(zeile.name),
    symbol: alsText(zeile.symbol),
    kurzbeschreibung: alsText(zeile.kurzbeschreibung)
  }));

  return { schema: 1, faecher, ferien, stufen };
}

function schuleZuJson(schule) {
  return {
    schema: 1,
    faecher: [...schule.faecher]
      .sort((a, b) => (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999))
      .map(({ id, name, kurz, farbe, symbol, reihenfolge }) => ({ id, name, kurz, farbe, symbol, reihenfolge })),
    ferien: [...schule.ferien]
      .sort((a, b) => a.von.localeCompare(b.von))
      .map(({ name, von, bis }) => ({ name, von, bis })),
    stufen: [...schule.stufen]
      .sort((a, b) => (a.id ?? 999) - (b.id ?? 999))
      .map(({ id, name, symbol, kurzbeschreibung }) => ({ id, name, symbol, kurzbeschreibung }))
  };
}

// ---------------------------------------------------------------- JgN.xlsx

function leseJahrgang(pfad, dateiname, jgstErwartet, meldungen) {
  let mappe;
  try {
    mappe = leseMappe(pfad, dateiname);
  } catch (fehler) {
    meldungen.fehler({ datei: dateiname }, 'Die Datei laesst sich nicht lesen: ' + fehler.message);
    return null;
  }
  for (const blatt of JAHRGANG_BLAETTER) {
    if (!mappe.hatBlatt(blatt)) {
      meldungen.fehler({ datei: dateiname }, 'Das Blatt "' + blatt + '" fehlt.');
      return null;
    }
  }

  const kopfzeilen = mappe.blatt('Jahrgang') || [];
  if (kopfzeilen.length === 0) {
    meldungen.fehler({ datei: dateiname, blatt: 'Jahrgang' }, 'Das Blatt ist leer, es braucht eine Zeile.');
    return null;
  }
  if (kopfzeilen.length > 1) {
    meldungen.warnung({ datei: dateiname, blatt: 'Jahrgang', zeile: kopfzeilen[1].__zeile },
      'Das Blatt hat mehr als eine Zeile. Nur die erste wird genommen.');
  }
  const kopf = kopfzeilen[0];
  const jgst = alsZahl(kopf.jgst);
  if (jgst !== null && jgst !== jgstErwartet) {
    meldungen.fehler({ datei: dateiname, blatt: 'Jahrgang', zeile: kopf.__zeile, feld: 'jgst' },
      'Hier steht ' + jgst + ', die Datei heisst aber ' + dateiname + '.');
  }

  const bausteine = (mappe.blatt('Bausteine') || []).map((zeile) => ({
    __zeile: zeile.__zeile,
    id: alsText(zeile.id),
    fach: alsText(zeile.fach),
    titel: alsText(zeile.titel),
    alternativen: alsText(zeile.alternativen)
      ? alsText(zeile.alternativen).split(' ODER ').map((teil) => teil.trim()).filter(Boolean)
      : [],
    gelingensnachweis: alsText(zeile.gelingensnachweis),
    gelingensnachweisStation: alsZahl(zeile.gelingensnachweisStation),
    materialort: alsText(zeile.materialort),
    kurzbeschreibung: alsText(zeile.kurzbeschreibung),
    material: alsText(zeile.material),
    stationen: []
  }));
  const nachId = new Map(bausteine.filter((baustein) => baustein.id).map((baustein) => [baustein.id, baustein]));

  const stationenOhneBaustein = [];
  for (const zeile of mappe.blatt('Stationen') || []) {
    const station = {
      __zeile: zeile.__zeile,
      baustein: alsText(zeile.baustein),
      nr: alsZahl(zeile.nr),
      titel: alsText(zeile.titel),
      art: alsText(zeile.art),
      minuten: alsZahl(zeile.minuten),
      niveau: alsZahl(zeile.niveau),
      material: alsText(zeile.material),
      hinweis: alsText(zeile.hinweis)
    };
    const baustein = nachId.get(station.baustein);
    if (!baustein) {
      stationenOhneBaustein.push(station);
      continue;
    }
    baustein.stationen.push(station);
  }
  for (const baustein of bausteine) {
    baustein.stationen.sort((a, b) => (a.nr ?? 9999) - (b.nr ?? 9999));
  }

  const slots = (mappe.blatt('Slots') || []).map((zeile) => {
    const spur = alsZahl(zeile.spur);
    const spurenRoh = alsText(zeile.spuren);
    const spuren = spurenRoh ? alsZahlenliste(spurenRoh) : (spur === null ? [] : [spur]);
    return {
      __zeile: zeile.__zeile,
      id: alsText(zeile.id),
      fach: alsText(zeile.fach),
      nr: alsZahl(zeile.nr),
      spur,
      spurenRoh,
      spuren,
      stunden: alsZahl(zeile.stunden),
      von: alsText(zeile.von),
      bis: alsText(zeile.bis),
      abgabeRoh: alsText(zeile.abgabe),
      baustein: alsText(zeile.baustein),
      status: alsText(zeile.status) || 'fest',
      hinweis: alsText(zeile.hinweis)
    };
  });

  const inputs = (mappe.blatt('Inputs') || []).map((zeile) => {
    const pflichtRoh = alsText(zeile.pflicht);
    return {
      __zeile: zeile.__zeile,
      id: alsText(zeile.id),
      fach: alsText(zeile.fach),
      art: alsText(zeile.art),
      titel: alsText(zeile.titel),
      beschreibung: alsText(zeile.beschreibung),
      pflicht: pflichtRoh === '' ? false : alsJaNein(pflichtRoh, false),
      bausteine: alsListe(zeile.bausteine)
    };
  });

  const coachings = (mappe.blatt('Coachings') || []).map((zeile) => ({
    __zeile: zeile.__zeile,
    wochentagRoh: alsText(zeile.wochentag),
    wochentag: alsWochentag(zeile.wochentag),
    kuerzel: alsText(zeile.kuerzel),
    gueltigAb: alsText(zeile.gueltigAb) || null,
    gueltigBis: alsText(zeile.gueltigBis) || null,
    klasse: alsText(zeile.klasse) || null
  }));

  const termine = (mappe.blatt('Termine') || []).map((zeile) => {
    const pflichtRoh = alsText(zeile.pflicht);
    return {
      __zeile: zeile.__zeile,
      datum: alsText(zeile.datum),
      art: alsText(zeile.art),
      fach: alsText(zeile.fach),
      kuerzel: alsText(zeile.kuerzel),
      klasse: alsText(zeile.klasse) || null,
      input: alsText(zeile.input),
      text: alsText(zeile.text),
      station: alsZahl(zeile.station),
      pflicht: pflichtRoh === '' ? false : alsJaNein(pflichtRoh, false),
      raster: alsText(zeile.raster)
    };
  });

  const raster = (mappe.blatt('Raster') || []).map((zeile) => ({
    __zeile: zeile.__zeile,
    id: alsText(zeile.id),
    von: alsText(zeile.von),
    bis: alsText(zeile.bis),
    titel: alsText(zeile.titel)
  }));

  const sonderwochen = (mappe.blatt('Sonderwochen') || []).map((zeile) => ({
    __zeile: zeile.__zeile,
    von: alsText(zeile.von),
    bis: alsText(zeile.bis),
    titel: alsText(zeile.titel),
    art: alsText(zeile.art)
  }));

  return {
    __zeile: kopf.__zeile,
    schema: 1,
    jgst: jgst === null ? jgstErwartet : jgst,
    ton: alsText(kopf.ton),
    klassen: alsListe(kopf.klassen),
    fruehesterAufstieg: alsText(kopf.fruehesterAufstieg),
    hinweis: alsText(kopf.hinweis),
    sonderwochen, slots, bausteine, stationenOhneBaustein, inputs, coachings, termine, raster
  };
}

function jahrgangZuJson(jg, ziel) {
  const oeffentlich = ziel === 'oeffentlich';
  return {
    schema: 1,
    jgst: jg.jgst,
    ton: jg.ton || 'klar',
    klassen: jg.klassen,
    fruehesterAufstieg: jg.fruehesterAufstieg || null,
    hinweis: jg.hinweis,
    sonderwochen: [...jg.sonderwochen]
      .sort((a, b) => a.von.localeCompare(b.von))
      .map(({ von, bis, titel, art }) => ({ von, bis, titel, art })),
    slots: [...jg.slots]
      .sort((a, b) => a.von.localeCompare(b.von) || (a.spur ?? 0) - (b.spur ?? 0))
      .map((slot) => ({
        id: slot.id,
        fach: slot.fach,
        nr: slot.nr,
        spur: slot.spur,
        spuren: slot.spuren,
        stunden: slot.stunden,
        von: slot.von,
        bis: slot.bis,
        abgabe: slot.abgabeRoh || slot.bis,
        baustein: slot.baustein,
        status: slot.status,
        hinweis: slot.hinweis
      })),
    bausteine: jg.bausteine.map((baustein) => {
      const ausgabe = {
        id: baustein.id,
        fach: baustein.fach,
        titel: baustein.titel,
        alternativen: baustein.alternativen,
        gelingensnachweis: baustein.gelingensnachweis,
        gelingensnachweisStation: baustein.gelingensnachweisStation,
        materialort: baustein.materialort,
        kurzbeschreibung: baustein.kurzbeschreibung,
        stationen: baustein.stationen.map(({ nr, titel, art, minuten, niveau, material, hinweis }) =>
          ({ nr, titel, art, minuten, niveau, material, hinweis }))
      };
      // Schritt 10: im oeffentlichen Build gibt es kein Feld material am Baustein.
      if (!oeffentlich && baustein.material) ausgabe.material = baustein.material;
      return ausgabe;
    }),
    inputs: jg.inputs.map(({ id, fach, art, titel, beschreibung, pflicht, bausteine }) =>
      ({ id, fach, art, titel, beschreibung, pflicht, bausteine })),
    coachings: [...jg.coachings]
      .sort((a, b) => (a.wochentag ?? 9) - (b.wochentag ?? 9))
      .map(({ wochentag, kuerzel, gueltigAb, gueltigBis, klasse }) =>
        ({ wochentag, kuerzel, gueltigAb, gueltigBis, klasse })),
    termine: [...jg.termine]
      .sort((a, b) => a.datum.localeCompare(b.datum) || a.art.localeCompare(b.art))
      .map(({ datum, art, fach, kuerzel, klasse, input, text, station, pflicht, raster }) =>
        ({ datum, art, fach, kuerzel, klasse, input, text, station, pflicht, raster })),
    raster: [...jg.raster]
      .sort((a, b) => a.von.localeCompare(b.von))
      .map(({ id, von, bis, titel }) => ({ id, von, bis, titel }))
  };
}

// ---------------------------------------------------------------- Wissensseiten

async function leseWissen(ordner, vorschau, meldungen) {
  const leer = { schema: 1, seiten: [], glossar: [], faq: [], entwuerfe: 0 };
  if (!existsSync(ordner)) {
    meldungen.warnung({ datei: 'content/wissen/' },
      'Den Ordner gibt es noch nicht. Die Wissensseiten kommen mit AP-16 und AP-17.');
    return leer;
  }
  const dateien = (await readdir(ordner)).filter((name) => name.toLowerCase().endsWith('.md')).sort();
  if (dateien.length === 0) {
    meldungen.warnung({ datei: 'content/wissen/' }, 'Der Ordner enthaelt keine Wissensseite.');
    return leer;
  }

  const seiten = [];
  const glossar = [];
  const faq = [];
  const ids = new Set();
  let entwuerfe = 0;

  for (const dateiname of dateien) {
    const text = await readFile(join(ordner, dateiname), 'utf8');
    const { kopf, rumpf, fehler } = trenneKopfdaten(text);
    if (fehler) {
      meldungen.fehler({ datei: 'wissen/' + dateiname }, fehler);
      continue;
    }
    pruefeWissenKopf(kopf, 'wissen/' + dateiname, meldungen);

    const id = alsText(kopf.id);
    if (id) {
      if (ids.has(id)) {
        meldungen.fehler({ datei: 'wissen/' + dateiname, feld: 'id' }, 'Die ID "' + id + '" gibt es schon.');
      }
      ids.add(id);
    }

    const status = alsText(kopf.status) || 'entwurf';
    if (status === 'entwurf') entwuerfe++;
    if (status === 'entwurf' && !vorschau) {
      meldungen.warnung({ datei: 'wissen/' + dateiname, feld: 'status' },
        'Entwurf, deshalb nicht im Build. Mit --vorschau kommt die Seite mit.');
      continue;
    }

    const bereich = alsText(kopf.bereich);
    if (bereich === 'glossar') {
      for (const teil of zerlegeNachUeberschriften(rumpf)) {
        const inhalt = zuHtml(teil.rumpf);
        meldeMarkdownWarnungen(inhalt.warnungen, 'wissen/' + dateiname, teil.zeile, meldungen);
        glossar.push({ begriff: teil.titel, text: inhalt.absaetze.join(' ') || reinerText(inhalt.html) });
      }
      if (glossar.length === 0) {
        meldungen.warnung({ datei: 'wissen/' + dateiname }, 'Kein Begriff gefunden. Jeder Begriff braucht eine Zeile "## Begriff".');
      }
      continue;
    }
    if (bereich === 'faq') {
      for (const teil of zerlegeNachUeberschriften(rumpf)) {
        const inhalt = zuHtml(teil.rumpf);
        meldeMarkdownWarnungen(inhalt.warnungen, 'wissen/' + dateiname, teil.zeile, meldungen);
        faq.push({
          id: zuAnker(teil.titel),
          frage: teil.titel,
          html: inhalt.html,
          text: inhalt.absaetze.join(' ')
        });
      }
      if (faq.length === 0) {
        meldungen.warnung({ datei: 'wissen/' + dateiname }, 'Keine Frage gefunden. Jede Frage braucht eine Zeile "## Frage?".');
      }
      continue;
    }

    const inhalt = zuHtml(rumpf);
    meldeMarkdownWarnungen(inhalt.warnungen, 'wissen/' + dateiname, null, meldungen);
    seiten.push({
      id,
      titel: alsText(kopf.titel),
      bereich,
      jahrgaenge: kopf.jahrgaenge === undefined || kopf.jahrgaenge === '' ? 'alle' : kopf.jahrgaenge,
      status,
      reihenfolge: alsZahl(kopf.reihenfolge) ?? 999,
      stichworte: Array.isArray(kopf.stichworte) ? kopf.stichworte.map(String) : alsListe(kopf.stichworte),
      quelle: alsText(kopf.quelle),
      html: inhalt.html,
      abschnitte: inhalt.abschnitte.map(({ titel, anker }) => ({ titel, anker })),
      absaetze: inhalt.absaetze
    });
  }

  seiten.sort((a, b) => a.reihenfolge - b.reihenfolge || String(a.titel).localeCompare(String(b.titel)));
  return { schema: 1, seiten, glossar, faq, entwuerfe };
}

function wissenZuJson(wissen) {
  return {
    schema: 1,
    seiten: wissen.seiten.map(({ absaetze, ...rest }) => rest),
    glossar: wissen.glossar,
    faq: wissen.faq
  };
}

function meldeMarkdownWarnungen(warnungen, datei, zeile, meldungen) {
  for (const text of warnungen) {
    meldungen.warnung(zeile ? { datei, zeile } : { datei }, text);
  }
}

function reinerText(html) {
  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------- antrag.json

async function leseAntrag(pfad, jahrgaenge, klassenJeJahrgang, meldungen) {
  if (!existsSync(pfad)) {
    meldungen.warnung({ datei: 'antrag.json' },
      'Die Datei gibt es noch nicht. Sie kommt mit AP-14, bis dahin bleibt der Antrag-Bereich leer.');
    return {};
  }
  const antrag = await leseJson(pfad, 'antrag.json', meldungen);
  if (antrag === null) return {};
  pruefeAntrag(antrag, jahrgaenge, klassenJeJahrgang, meldungen);
  return antrag;
}

// ---------------------------------------------------------------- Ausgabe

async function schreibeJson(pfad, daten) {
  await mkdir(dirname(pfad), { recursive: true });
  await writeFile(pfad, JSON.stringify(daten, null, 2) + '\n', 'utf8');
}

/**
 * Fuer den Inhalts-Hash wird der Zeitstempel in data/index.json neutralisiert.
 * Sonst haette jeder Build eine andere Version (AP-02, Akzeptanzkriterium 3).
 */
function ohneZeitstempel(pfad, inhalt) {
  if (pfad !== 'data/index.json') return inhalt;
  const text = inhalt.toString('utf8').replace(/"erzeugt":\s*"[^"]*"/, '"erzeugt": ""');
  return Buffer.from(text, 'utf8');
}

async function pruefeSyntax(ausgabe) {
  const dateien = [];
  const gehe = (pfad) => {
    for (const eintrag of readdirSync(pfad, { withFileTypes: true })) {
      const voll = join(pfad, eintrag.name);
      if (eintrag.isDirectory()) gehe(voll);
      else if (extname(eintrag.name).toLowerCase() === '.js') dateien.push(voll);
    }
  };
  gehe(ausgabe);

  const fehler = [];
  const gleichzeitig = 8;
  for (let i = 0; i < dateien.length; i += gleichzeitig) {
    const teil = dateien.slice(i, i + gleichzeitig);
    const ergebnisse = await Promise.all(teil.map(async (datei) => {
      try {
        await ausfuehren(process.execPath, ['--check', datei]);
        return null;
      } catch (ausnahme) {
        const meldung = String(ausnahme.stderr || ausnahme.message || '').split('\n').slice(0, 4).join(' ').trim();
        return relative(ausgabe, datei).split(sep).join('/') + ': ' + meldung;
      }
    }));
    for (const ergebnis of ergebnisse) if (ergebnis) fehler.push(ergebnis);
  }
  return fehler;
}

function zeigeZusammenfassung(z, warnungen, sage) {
  sage('');
  sage('Fertig in ' + z.dauer + ' s.');
  sage('  Ziel:     ' + z.ziel + (z.vorschau ? ' (mit Entwuerfen)' : ''));
  sage('  Ausgabe:  ' + z.ausgabe);
  sage('  Version:  ' + z.version + '   (' + z.dateien + ' Dateien)');
  for (const jg of z.jahrgaenge) {
    sage('  Jahrgang ' + jg.jgst + ': ' + jg.slots + ' Slots, ' + jg.bausteine + ' Bausteine, '
      + jg.stationen + ' Stationen, ' + jg.termine + ' Termine, ' + jg.inputs + ' Inputs, '
      + jg.suche + ' Suchtreffer');
  }
  sage('  Wissen:   ' + z.wissen.freigegeben + ' freigegeben, ' + z.wissen.entwurf + ' Entwuerfe, '
    + z.wissen.glossar + ' Glossarbegriffe, ' + z.wissen.faq + ' FAQ');
  if (warnungen.length > 0) {
    sage('');
    sage('  ' + warnungen.length + ' Warnung' + (warnungen.length === 1 ? '' : 'en') + ':');
    for (const zeile of warnungen) sage('  ' + zeile);
  } else {
    sage('  Warnungen: keine');
  }
}

function abbruch(zeilen, still) {
  if (!still) for (const zeile of zeilen) console.error(zeile);
  return { ok: false, fehler: zeilen, warnungen: [], version: null, zusammenfassung: null };
}

function fehlerAbbruch(meldungen, still) {
  const { fehler, warnungen } = meldungen.zeilen();
  if (!still) {
    for (const zeile of fehler) console.error(zeile);
    for (const zeile of warnungen) console.error(zeile);
    console.error('');
    console.error(fehler.length + ' Fehler. Der Build wurde abgebrochen, nichts wurde geschrieben.');
  }
  return { ok: false, fehler, warnungen, version: null, zusammenfassung: null };
}

// ---------------------------------------------------------------- Kommandozeile

export function leseOptionen(argumente) {
  const optionen = { ziel: 'oeffentlich', vorschau: false, ausgabe: null };
  for (const argument of argumente) {
    if (argument === '--vorschau') { optionen.vorschau = true; continue; }
    const treffer = argument.match(/^--([a-zA-Z]+)=(.*)$/);
    if (!treffer) throw new Error('Unbekanntes Argument: ' + argument
      + '\nErlaubt: --ziel=oeffentlich|intern, --vorschau, --ausgabe=<ordner>');
    const [, name, wert] = treffer;
    if (name === 'ziel') optionen.ziel = wert;
    else if (name === 'ausgabe') optionen.ausgabe = wert;
    else throw new Error('Unbekannte Option: --' + name
      + '\nErlaubt: --ziel=oeffentlich|intern, --vorschau, --ausgabe=<ordner>');
  }
  return optionen;
}

const direktAufgerufen = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (direktAufgerufen) {
  let optionen;
  try {
    optionen = leseOptionen(process.argv.slice(2));
  } catch (fehler) {
    console.error(fehler.message);
    process.exit(1);
  }
  const ergebnis = await baue(optionen);
  if (!ergebnis.ok) process.exit(1);
}
