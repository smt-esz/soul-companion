// Excel-Dateien einlesen (AP-02).
//
// Jedes Blatt wird zu einer Liste von Objekten: Die Kopfzeile (Zeile 1) liefert
// die Schluessel, jede weitere Zeile einen Eintrag. Regeln aus REDAKTION.md 2:
//   - Zeilen mit # in Spalte A sind Kommentare und werden uebersprungen.
//   - Leere Zeilen werden uebersprungen.
//   - Spalten ohne Kopftext werden ignoriert (so stoeren Notizen rechts nicht).
//   - Datumszellen werden zu 'YYYY-MM-DD'. Text in dieser Form bleibt, wie er ist.
//
// Jeder Eintrag traegt zusaetzlich `__zeile`: die Zeilennummer aus Excel.
// Damit kann der Build Fehler so melden, wie Leo sie in der Datei wiederfindet.

import * as XLSX from 'xlsx';
import * as fs from 'node:fs';

// Die ESM-Fassung von SheetJS bringt kein fs mit. Ohne diese Zeile meldet
// readFile 'Cannot access file'. So steht es in der SheetJS-Doku fuer Node.
XLSX.set_fs(fs);

const MS_PRO_TAG = 86400000;

/**
 * Oeffnet eine Arbeitsmappe.
 * @param {string} pfad  Pfad zur .xlsx-Datei
 * @param {string} name  Anzeigename fuer Meldungen, z. B. 'Jg5.xlsx'
 */
export function leseMappe(pfad, name) {
  const mappe = XLSX.readFile(pfad, { cellDates: true, cellNF: false, cellText: false });
  const blattNamen = mappe.SheetNames.slice();
  return {
    name,
    pfad,
    blattNamen,
    hatBlatt(blattName) {
      return blattNamen.includes(blattName);
    },
    /** Zeilen eines Blatts. Gibt es das Blatt nicht, kommt null zurueck. */
    blatt(blattName) {
      if (!blattNamen.includes(blattName)) return null;
      return leseBlatt(mappe.Sheets[blattName]);
    },
    /** Spaltennamen der Kopfzeile eines Blatts. */
    spalten(blattName) {
      if (!blattNamen.includes(blattName)) return null;
      return leseSpalten(mappe.Sheets[blattName]);
    }
  };
}

function bereich(blatt) {
  if (!blatt || !blatt['!ref']) return null;
  return XLSX.utils.decode_range(blatt['!ref']);
}

function leseSpalten(blatt) {
  const b = bereich(blatt);
  if (!b) return [];
  const spalten = [];
  for (let spalte = b.s.c; spalte <= b.e.c; spalte++) {
    const zelle = blatt[XLSX.utils.encode_cell({ r: b.s.r, c: spalte })];
    const kopf = zelle === undefined ? '' : String(zelle.v ?? '').trim();
    spalten.push({ spalte, kopf });
  }
  return spalten;
}

function leseBlatt(blatt) {
  const b = bereich(blatt);
  if (!b) return [];
  const spalten = leseSpalten(blatt).filter((eintrag) => eintrag.kopf !== '');
  if (spalten.length === 0) return [];

  const zeilen = [];
  for (let r = b.s.r + 1; r <= b.e.r; r++) {
    // Kommentarzeile: # in Spalte A.
    const ersteZelle = blatt[XLSX.utils.encode_cell({ r, c: b.s.c })];
    const erstesFeld = ersteZelle === undefined ? '' : String(ersteZelle.v ?? '').trim();
    if (erstesFeld.startsWith('#')) continue;

    const eintrag = { __zeile: r + 1 };
    let hatInhalt = false;
    for (const { spalte, kopf } of spalten) {
      const zelle = blatt[XLSX.utils.encode_cell({ r, c: spalte })];
      const wert = zelleZuWert(zelle);
      eintrag[kopf] = wert;
      if (wert !== '') hatInhalt = true;
    }
    if (!hatInhalt) continue;
    zeilen.push(eintrag);
  }
  return zeilen;
}

function zelleZuWert(zelle) {
  if (zelle === undefined || zelle.v === undefined || zelle.v === null) return '';
  if (zelle.v instanceof Date) return datumZuISO(zelle.v);
  if (zelle.t === 'b') return zelle.v === true;
  if (typeof zelle.v === 'number') return zelle.v;
  return String(zelle.v).trim();
}

/**
 * Datumszelle zu 'YYYY-MM-DD'.
 *
 * SheetJS legt Datumszellen auf Mitternacht UTC. Je nach Zeitzone des Rechners
 * kann davon ein paar Stunden abweichen. Deshalb wird auf den naechsten ganzen
 * Tag gerundet und dann mit den UTC-Teilen formatiert. So kommt in jeder
 * Zeitzone derselbe Tag heraus (die UTC-Falle aus ARCHITEKTUR 1.7).
 */
export function datumZuISO(datum) {
  const tage = Math.round(datum.getTime() / MS_PRO_TAG);
  const glatt = new Date(tage * MS_PRO_TAG);
  const jahr = String(glatt.getUTCFullYear()).padStart(4, '0');
  const monat = String(glatt.getUTCMonth() + 1).padStart(2, '0');
  const tag = String(glatt.getUTCDate()).padStart(2, '0');
  return jahr + '-' + monat + '-' + tag;
}

/** true bei '' , null, undefined. 0 und false gelten als Inhalt. */
export function istLeer(wert) {
  return wert === '' || wert === null || wert === undefined;
}

/** Text einer Zelle, immer als String (Zahlen werden umgewandelt). */
export function alsText(wert) {
  if (istLeer(wert)) return '';
  return String(wert).trim();
}

/** Ganze Zahl oder null. */
export function alsZahl(wert) {
  if (istLeer(wert)) return null;
  if (typeof wert === 'number') return Number.isFinite(wert) ? wert : null;
  const text = String(wert).trim().replace(',', '.');
  const zahl = Number(text);
  return Number.isFinite(zahl) ? zahl : null;
}

/**
 * 'ja' / 'nein' zu true / false. Leer gibt `standard` zurueck,
 * unbekannter Text gibt null (der Aufrufer meldet den Fehler).
 */
export function alsJaNein(wert, standard = null) {
  if (istLeer(wert)) return standard;
  if (typeof wert === 'boolean') return wert;
  const text = String(wert).trim().toLowerCase();
  if (text === 'ja' || text === 'j' || text === 'true' || text === 'wahr' || text === 'x') return true;
  if (text === 'nein' || text === 'n' || text === 'false' || text === 'falsch') return false;
  return null;
}

/** Kommaliste zu Array von Texten. Leer gibt []. */
export function alsListe(wert) {
  if (istLeer(wert)) return [];
  return String(wert)
    .split(',')
    .map((teil) => teil.trim())
    .filter((teil) => teil !== '');
}

/** Kommaliste zu Array von Zahlen. Nicht lesbare Teile fallen weg. */
export function alsZahlenliste(wert) {
  return alsListe(wert)
    .map((teil) => Number(teil))
    .filter((zahl) => Number.isFinite(zahl));
}

const WOCHENTAGE = new Map(Object.entries({
  mo: 1, di: 2, mi: 3, do: 4, fr: 5
}));

/**
 * 'Mo' bis 'Fr' zu 1 bis 5 (DATENMODELL 3, Blatt Coachings).
 * Unbekannter Text gibt null. Auch Zahlen 1 bis 5 werden angenommen.
 */
export function alsWochentag(wert) {
  if (istLeer(wert)) return null;
  if (typeof wert === 'number') {
    return Number.isInteger(wert) && wert >= 1 && wert <= 5 ? wert : null;
  }
  const text = String(wert).trim().toLowerCase();
  if (/^[1-5]$/.test(text)) return Number(text);
  if (WOCHENTAGE.has(text)) return WOCHENTAGE.get(text);
  return null;
}

/** true, wenn der Text genau die Form 'YYYY-MM-DD' hat und den Tag wirklich gibt. */
export function istISODatum(wert) {
  if (typeof wert !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(wert)) return false;
  const [jahr, monat, tag] = wert.split('-').map(Number);
  if (monat < 1 || monat > 12 || tag < 1 || tag > 31) return false;
  const probe = new Date(Date.UTC(jahr, monat - 1, tag));
  return probe.getUTCFullYear() === jahr
    && probe.getUTCMonth() === monat - 1
    && probe.getUTCDate() === tag;
}
