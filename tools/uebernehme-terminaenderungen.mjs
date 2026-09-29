// Lehrerzugang fuer kleine, terminliche Aenderungen (Leo, 24./29.09.2026).
//
// Liest die Antworten aus den geteilten Microsoft-Formularen (je Jahrgang
// ein eigenes Formular, jeweils eine Excel-Datei in OneDrive, per Link
// freigegeben), prueft jede Antwort gegen den echten Kalender und
// verschiebt bei einer gueltigen Antwort das Datum des gewaehlten Termins
// in der passenden content/jahrgaenge/JgX.xlsx.
//
// Aufruf:
//   TERMIN_FORMULAR_URLS="5=https://...,6=https://...,7=https://..." \
//     node tools/uebernehme-terminaenderungen.mjs [--pruefen]
//
// TERMIN_FORMULAR_URLS: "<Jahrgang>=<Freigabe-Link>"-Paare, getrennt durch
// Komma oder Zeilenumbruch - ein Paar je Formular. Der Jahrgang sagt dem
// Skript, in welcher Termine-Liste es die Text-Antwort wiederfinden muss
// (die Beschriftung selbst traegt keinen Code mehr, siehe
// tools/lib/termin-label.mjs).
// --pruefen: nur pruefen und ausgeben, nichts schreiben (Trockenlauf).
//
// Erwartetes Formular je Jahrgang (siehe tools/termine-liste.mjs):
//   1. "Was soll verschoben werden?" (Input/Coaching, mit Verzweigung)
//   2. eine Spalte, deren Ueberschrift "input" enthaelt: Dropdown mit den
//      Input-Terminen
//   3. eine Spalte, deren Ueberschrift "coaching" enthaelt: Dropdown mit
//      den Coaching-Terminen
//   4. eine Spalte, deren Ueberschrift "datum" enthaelt: das neue Datum
// Genauer Wortlaut und Gross-/Kleinschreibung der Ueberschriften sind egal,
// gesucht wird nach diesen Teiltexten. Optional, nur fuers Protokoll: eine
// Spalte mit "Name" oder "E-Mail" und eine mit "ID" (Microsoft Forms legt
// "ID" automatisch an).
//
// Jede einmal gesehene Antwort wird in content/.termin-sync-log.json
// vermerkt (per ID, sonst per Zeileninhalt), damit sie nicht bei jedem Lauf
// erneut verarbeitet wird. Nicht uebernommene Antworten stehen mit Grund im
// Protokoll und in der Konsolenausgabe.

import ExcelJS from 'exceljs';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

import { datumZuISO, istISODatum } from './lib/excel.mjs';
import { ladeSchule, ladeTermine } from './lib/inhalte.mjs';
import { terminKategorie, terminLabel } from './lib/termin-label.mjs';
import { istSchultag, parseISODate } from '../src/app/dates.js';

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const LOG_PFAD = join(REPO, 'content', '.termin-sync-log.json');
const PRUEFEN = process.argv.includes('--pruefen');

async function main() {
  const quellen = leseQuellen(process.env.TERMIN_FORMULAR_URLS);
  if (quellen.length === 0) {
    console.error('FEHLER: Umgebungsvariable TERMIN_FORMULAR_URLS fehlt oder hat kein gueltiges "Jahrgang=Link"-Paar.');
    process.exitCode = 1;
    return;
  }

  const schule = ladeSchule(REPO);
  const log = ladeLog();

  let geaendert = false;
  let neuVerarbeitet = 0;

  for (let index = 0; index < quellen.length; index++) {
    const { jgst, url } = quellen[index];
    const antworten = await ladeAntworten(url);
    console.log('Formular Jg ' + jgst + ' (' + (index + 1) + '/' + quellen.length + '): ' + antworten.length + ' Antworten.');

    const nachschlage = baueNachschlagewerk(jgst, schule);

    for (const antwort of antworten) {
      const schluessel = 'jg' + jgst + ':' + antwortSchluessel(antwort);
      if (log[schluessel]) continue;
      neuVerarbeitet++;

      const ergebnis = await verarbeiteAntwort(antwort, jgst, nachschlage, schule);
      console.log((ergebnis.ok ? 'OK   ' : 'FEHLER ') + schluessel + ': ' + ergebnis.meldung);

      log[schluessel] = {
        verarbeitetAm: new Date().toISOString(),
        ok: ergebnis.ok,
        meldung: ergebnis.meldung,
        antwort: kurzfassung(antwort)
      };
      if (ergebnis.ok && ergebnis.geaendert) geaendert = true;
    }
  }

  if (neuVerarbeitet === 0) {
    console.log('Keine neuen Antworten.');
  }

  if (!PRUEFEN) {
    schreibeLog(log);
  } else {
    console.log('(--pruefen: nichts geschrieben)');
  }

  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, 'geaendert=' + (geaendert ? 'true' : 'false') + '\n', { flag: 'a' });
  }
}

/** "5=https://...,6=https://..." zu [{ jgst, url }]. */
function leseQuellen(wert) {
  return String(wert || '')
    .split(/[,\n]+/)
    .map((teil) => teil.trim())
    .filter(Boolean)
    .map((teil) => {
      const treffer = /^(\d+)\s*=\s*(\S+)$/.exec(teil);
      return treffer ? { jgst: Number(treffer[1]), url: treffer[2] } : null;
    })
    .filter(Boolean);
}

/** Beschriftung -> Termin (mit Excel-Zeile), fuer den schnellen Abgleich. */
function baueNachschlagewerk(jgst, schule) {
  const jg = ladeTermine(REPO, jgst);
  const karte = new Map();
  if (!jg) return karte;
  for (const termin of jg.termine) {
    if (!termin.datum || !terminKategorie(termin.art)) continue;
    karte.set(terminLabel(termin, jgst, schule), termin);
  }
  return karte;
}

// ---------------------------------------------------------------- Antworten

async function ladeAntworten(url) {
  const antwort = await fetch(url);
  if (!antwort.ok) {
    throw new Error('Formular-Datei liess sich nicht laden (' + antwort.status + '). Ist der Freigabe-Link noch gueltig?');
  }
  const puffer = Buffer.from(await antwort.arrayBuffer());
  const mappe = XLSX.read(puffer, { type: 'buffer', cellDates: true });
  const blattname = mappe.SheetNames[0];
  const zeilen = XLSX.utils.sheet_to_json(mappe.Sheets[blattname], { defval: '' });
  return zeilen.map(normalisiereZeile);
}

/** Findet Spalten anhand eines Teiltexts in der Ueberschrift, unabhaengig vom genauen Wortlaut. */
function normalisiereZeile(zeile) {
  const spalte = (teiltext) => Object.keys(zeile).find((k) => k.toLowerCase().includes(teiltext));
  const inputSpalte = spalte('input');
  const coachingSpalte = spalte('coaching');
  const datumSpalte = spalte('datum');
  const idSpalte = spalte('id');
  const nameSpalte = spalte('name') || spalte('e-mail') || spalte('email');
  // Wegen der Verzweigung im Formular ist immer nur eine der beiden Spalten
  // gefuellt, die andere bleibt leer.
  const terminLabelWert = (inputSpalte && String(zeile[inputSpalte] || '').trim())
    || (coachingSpalte && String(zeile[coachingSpalte] || '').trim())
    || '';
  return {
    terminLabel: terminLabelWert,
    neuesDatum: datumSpalte ? zeile[datumSpalte] : '',
    id: idSpalte ? String(zeile[idSpalte] || '').trim() : '',
    name: nameSpalte ? String(zeile[nameSpalte] || '').trim() : '',
    roh: zeile
  };
}

function antwortSchluessel(antwort) {
  if (antwort.id) return 'id:' + antwort.id;
  return 'zeile:' + JSON.stringify(antwort.roh);
}

function kurzfassung(antwort) {
  return { terminLabel: antwort.terminLabel, neuesDatum: antwort.neuesDatum, name: antwort.name || null };
}

// ---------------------------------------------------------------- Log

function ladeLog() {
  if (!existsSync(LOG_PFAD)) return {};
  try {
    return JSON.parse(readFileSync(LOG_PFAD, 'utf8'));
  } catch {
    return {};
  }
}

function schreibeLog(log) {
  writeFileSync(LOG_PFAD, JSON.stringify(log, null, 2) + '\n');
}

// ---------------------------------------------------------------- Verarbeitung

async function verarbeiteAntwort(antwort, jgst, nachschlage, schule) {
  if (!antwort.terminLabel) {
    return { ok: false, meldung: 'Keine Auswahl bei "Welcher Input/welches Coaching?" gefunden.' };
  }
  const termin = nachschlage.get(antwort.terminLabel);
  if (!termin) {
    return { ok: false, meldung: 'Auswahl "' + antwort.terminLabel + '" passt zu keinem aktuellen Termin in Jg ' + jgst + '.' };
  }

  const neuesDatumIso = alsIsoDatum(antwort.neuesDatum);
  if (!neuesDatumIso) {
    return { ok: false, meldung: 'Neues Datum ist nicht lesbar: "' + antwort.neuesDatum + '".' };
  }
  if (!istSchultag(parseISODate(neuesDatumIso), schule)) {
    return { ok: false, meldung: neuesDatumIso + ' ist kein Schultag (Wochenende oder Ferien), nicht uebernommen.' };
  }

  const pfad = join(REPO, 'content', 'jahrgaenge', 'Jg' + jgst + '.xlsx');
  if (!existsSync(pfad)) {
    return { ok: false, meldung: 'Jg' + jgst + '.xlsx gibt es nicht.' };
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(pfad);
  const sheet = workbook.getWorksheet('Termine');
  if (!sheet) {
    return { ok: false, meldung: 'Blatt "Termine" fehlt in Jg' + jgst + '.xlsx.' };
  }

  const kopfzeile = sheet.getRow(1).values.slice(1).map(String);
  const datumSpalte = kopfzeile.findIndex((name) => name.trim().toLowerCase() === 'datum') + 1;
  if (datumSpalte === 0) {
    return { ok: false, meldung: 'Spalte "datum" fehlt im Blatt "Termine".' };
  }

  const zielZeile = sheet.getRow(termin.__zeile);
  const alteZelle = zielZeile.getCell(datumSpalte);
  if (alteZelle.value === null || alteZelle.value === undefined || alteZelle.value === '') {
    return { ok: false, meldung: 'Zeile ' + termin.__zeile + ' in Jg' + jgst + '.xlsx gibt es nicht mehr (leer).' };
  }

  const altesDatumIso = alsIsoDatum(alteZelle.value);
  if (altesDatumIso === neuesDatumIso) {
    return { ok: true, geaendert: false, meldung: 'Schon ' + neuesDatumIso + ', keine Aenderung noetig.' };
  }

  if (!PRUEFEN) {
    zielZeile.getCell(datumSpalte).value = new Date(neuesDatumIso + 'T00:00:00Z');
    await workbook.xlsx.writeFile(pfad);
  }

  return {
    ok: true,
    geaendert: true,
    meldung: 'Jg' + jgst + ' Zeile ' + termin.__zeile + ': ' + altesDatumIso + ' -> ' + neuesDatumIso
      + (PRUEFEN ? ' (Trockenlauf, nicht gespeichert)' : '')
  };
}

/** Datum aus einer Excel-/Forms-Zelle (Date-Objekt oder Text) als 'YYYY-MM-DD', sonst null. */
function alsIsoDatum(wert) {
  if (wert instanceof Date) return datumZuISO(wert);
  if (typeof wert === 'string') {
    const text = wert.trim();
    if (istISODatum(text)) return text;
    const treffer = /^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/.exec(text);
    if (treffer) {
      const iso = treffer[3] + '-' + treffer[2].padStart(2, '0') + '-' + treffer[1].padStart(2, '0');
      return istISODatum(iso) ? iso : null;
    }
    const geparst = new Date(text);
    if (!Number.isNaN(geparst.getTime())) return datumZuISO(geparst);
  }
  return null;
}

main().catch((fehler) => {
  console.error('FEHLER: ' + fehler.message);
  process.exitCode = 1;
});
