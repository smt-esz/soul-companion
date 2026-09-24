// Lehrerzugang fuer kleine, terminliche Aenderungen (Leo, 24.09.2026).
//
// Liest die Antworten aus dem geteilten Microsoft-Formular (eine Excel-Datei
// in OneDrive, per Link freigegeben), prueft jede Antwort gegen den echten
// Kalender und verschiebt bei einer gueltigen Antwort das Datum des
// gewaehlten Termins in der passenden content/jahrgaenge/JgX.xlsx.
//
// Aufruf:
//   TERMIN_FORMULAR_URL=https://... node tools/uebernehme-terminaenderungen.mjs [--pruefen]
//
// --pruefen: nur pruefen und ausgeben, nichts schreiben (Trockenlauf).
//
// Erwartete Spalten in der Formular-Antworten-Tabelle (Gross-/Kleinschreibung
// und genauer Wortlaut egal, gesucht wird nach diesen Teiltexten):
//   - eine Spalte, deren Ueberschrift "Termin" enthaelt: die Auswahl aus
//     tools/termine-liste.mjs, mit dem Code "[jgX-zY]" am Ende
//   - eine Spalte, deren Ueberschrift "Datum" enthaelt: das neue Datum
//     (Formular-Feldtyp "Datum", kommt als echtes Datum aus Excel)
// Optional, nur fuers Protokoll: eine Spalte mit "Name" oder "E-Mail" und
// eine mit "ID" (Microsoft Forms legt "ID" automatisch an).
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
import { ladeSchule } from './lib/inhalte.mjs';
import { leseLabelCode } from './lib/termin-label.mjs';
import { istSchultag, parseISODate } from '../src/app/dates.js';

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const LOG_PFAD = join(REPO, 'content', '.termin-sync-log.json');
const PRUEFEN = process.argv.includes('--pruefen');

async function main() {
  const url = process.env.TERMIN_FORMULAR_URL;
  if (!url) {
    console.error('FEHLER: Umgebungsvariable TERMIN_FORMULAR_URL fehlt.');
    process.exitCode = 1;
    return;
  }

  const antworten = await ladeAntworten(url);
  const schule = ladeSchule(REPO);
  const log = ladeLog();

  let geaendert = false;
  let neuVerarbeitet = 0;

  for (const antwort of antworten) {
    const schluessel = antwortSchluessel(antwort);
    if (log[schluessel]) continue;
    neuVerarbeitet++;

    const ergebnis = await verarbeiteAntwort(antwort, schule);
    console.log((ergebnis.ok ? 'OK   ' : 'FEHLER ') + schluessel + ': ' + ergebnis.meldung);

    log[schluessel] = {
      verarbeitetAm: new Date().toISOString(),
      ok: ergebnis.ok,
      meldung: ergebnis.meldung,
      antwort: kurzfassung(antwort)
    };
    if (ergebnis.ok && ergebnis.geaendert) geaendert = true;
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
  const terminSpalte = spalte('termin');
  const datumSpalte = spalte('datum');
  const idSpalte = spalte('id');
  const nameSpalte = spalte('name') || spalte('e-mail') || spalte('email');
  return {
    terminLabel: terminSpalte ? String(zeile[terminSpalte] || '').trim() : '',
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

async function verarbeiteAntwort(antwort, schule) {
  if (!antwort.terminLabel) {
    return { ok: false, meldung: 'Keine Auswahl bei "Welcher Termin?" gefunden.' };
  }
  const code = leseLabelCode(antwort.terminLabel);
  if (!code) {
    return { ok: false, meldung: 'Auswahl "' + antwort.terminLabel + '" hat keinen erkennbaren Code am Ende.' };
  }

  const neuesDatumIso = alsIsoDatum(antwort.neuesDatum);
  if (!neuesDatumIso) {
    return { ok: false, meldung: 'Neues Datum ist nicht lesbar: "' + antwort.neuesDatum + '".' };
  }
  if (!istSchultag(parseISODate(neuesDatumIso), schule)) {
    return { ok: false, meldung: neuesDatumIso + ' ist kein Schultag (Wochenende oder Ferien), nicht uebernommen.' };
  }

  const pfad = join(REPO, 'content', 'jahrgaenge', 'Jg' + code.jgst + '.xlsx');
  if (!existsSync(pfad)) {
    return { ok: false, meldung: 'Jg' + code.jgst + '.xlsx gibt es nicht.' };
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(pfad);
  const sheet = workbook.getWorksheet('Termine');
  if (!sheet) {
    return { ok: false, meldung: 'Blatt "Termine" fehlt in Jg' + code.jgst + '.xlsx.' };
  }

  const kopfzeile = sheet.getRow(1).values.slice(1).map(String);
  const datumSpalte = kopfzeile.findIndex((name) => name.trim().toLowerCase() === 'datum') + 1;
  if (datumSpalte === 0) {
    return { ok: false, meldung: 'Spalte "datum" fehlt im Blatt "Termine".' };
  }

  const zielZeile = sheet.getRow(code.zeile);
  const alteZelle = zielZeile.getCell(datumSpalte);
  if (alteZelle.value === null || alteZelle.value === undefined || alteZelle.value === '') {
    return { ok: false, meldung: 'Zeile ' + code.zeile + ' in Jg' + code.jgst + '.xlsx gibt es nicht mehr (leer).' };
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
    meldung: 'Jg' + code.jgst + ' Zeile ' + code.zeile + ': ' + altesDatumIso + ' -> ' + neuesDatumIso
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
