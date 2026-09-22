// Datumsfunktionen der App (ARCHITEKTUR 3.5).
//
// Regeln:
// - 'YYYY-MM-DD' wird nur hier gelesen, nie mit new Date('YYYY-MM-DD').
//   new Date('2026-03-29') liest UTC und liefert in Deutschland den Vortag.
// - Ein Datum ist immer lokal 00:00 Uhr.
// - Wochentags- und Monatsnamen stehen als feste Arrays hier, nicht über Intl.
//   So ist die Ausgabe auf jedem Gerät gleich.
// - Tagesdifferenzen rechnen über Date.UTC der lokalen Datumsteile. Damit
//   stimmen sie auch über die Zeitumstellung hinweg (Tage mit 23 oder 25 Stunden).

const MS_PRO_TAG = 86400000;

const WOCHENTAGE_LANG = [
  'Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'
];
const WOCHENTAGE_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const ISO_MUSTER = /^(\d{4})-(\d{2})-(\d{2})$/;

// Obergrenze für die Zählschleife in schultageBis, damit ein falscher
// Aufruf nicht endlos läuft. 4000 Tage sind rund 11 Jahre.
const MAX_TAGE = 4000;

/** 'YYYY-MM-DD' -> Date lokal 00:00. Wirft bei ungültiger Eingabe. */
export function parseISODate(s) {
  const treffer = typeof s === 'string' ? s.match(ISO_MUSTER) : null;
  if (!treffer) {
    throw new Error('Kein Datum im Format YYYY-MM-DD: ' + String(s));
  }
  const jahr = Number(treffer[1]);
  const monat = Number(treffer[2]);
  const tag = Number(treffer[3]);
  const d = new Date(jahr, monat - 1, tag, 0, 0, 0, 0);
  // Fängt 2026-02-30 und 2026-13-01: Date rechnet still weiter.
  if (d.getFullYear() !== jahr || d.getMonth() !== monat - 1 || d.getDate() !== tag) {
    throw new Error('Datum gibt es nicht: ' + s);
  }
  return d;
}

/** Date -> 'YYYY-MM-DD' (lokale Datumsteile). */
export function toISODate(d) {
  pruefeDatum(d, 'toISODate');
  return [
    String(d.getFullYear()).padStart(4, '0'),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
}

/**
 * Heute als Date lokal 00:00.
 * Mit ?debug=1&heute=YYYY-MM-DD in der URL wird das Datum simuliert.
 */
export function heute() {
  const simuliert = simuliertesDatum();
  if (simuliert) return simuliert;
  return tagesbeginn(new Date());
}

/** Neues Date, n Tage später (n darf negativ sein). */
export function addDays(d, n) {
  pruefeDatum(d, 'addDays');
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + Number(n), 0, 0, 0, 0);
}

/** Ganze Tage von a bis b (b - a). Sicher über die Zeitumstellung. */
export function diffDays(a, b) {
  pruefeDatum(a, 'diffDays');
  pruefeDatum(b, 'diffDays');
  return Math.round((utcTag(b) - utcTag(a)) / MS_PRO_TAG);
}

/** Montag der Woche, in der d liegt. */
export function mondayOf(d) {
  pruefeDatum(d, 'mondayOf');
  const wochentag = d.getDay() === 0 ? 7 : d.getDay();
  return addDays(tagesbeginn(d), 1 - wochentag);
}

/** ISO-Kalenderwoche: { jahr, kw }. Das Jahr kann vom Kalenderjahr abweichen. */
export function isoWeek(d) {
  pruefeDatum(d, 'isoWeek');
  // Donnerstag der Woche bestimmt nach ISO 8601 Jahr und Nummer.
  const donnerstag = new Date(utcTag(d));
  const wochentag = donnerstag.getUTCDay() === 0 ? 7 : donnerstag.getUTCDay();
  donnerstag.setUTCDate(donnerstag.getUTCDate() + 4 - wochentag);
  const jahr = donnerstag.getUTCFullYear();
  const erster = Date.UTC(jahr, 0, 1);
  const kw = Math.floor((donnerstag.getTime() - erster) / MS_PRO_TAG / 7) + 1;
  return { jahr, kw };
}

/** Samstag oder Sonntag. */
export function isWeekend(d) {
  pruefeDatum(d, 'isWeekend');
  return d.getDay() === 0 || d.getDay() === 6;
}

/** true, wenn d in einem Zeitraum aus schule.ferien liegt (Grenzen zählen mit). */
export function istFerientag(d, schule) {
  pruefeDatum(d, 'istFerientag');
  const ferien = (schule && Array.isArray(schule.ferien)) ? schule.ferien : [];
  for (const zeitraum of ferien) {
    if (!zeitraum || !zeitraum.von) continue;
    const von = parseISODate(zeitraum.von);
    const bis = parseISODate(zeitraum.bis || zeitraum.von);
    if (diffDays(von, d) >= 0 && diffDays(d, bis) >= 0) return true;
  }
  return false;
}

/** Schultag: kein Wochenende und kein Ferientag. */
export function istSchultag(d, schule) {
  return !isWeekend(d) && !istFerientag(d, schule);
}

/** Anzahl Schultage in (von, bis]. 0, wenn bis <= von. */
export function schultageBis(von, bis, schule) {
  pruefeDatum(von, 'schultageBis');
  pruefeDatum(bis, 'schultageBis');
  const spanne = diffDays(von, bis);
  if (spanne <= 0) return 0;
  if (spanne > MAX_TAGE) {
    throw new Error('Zeitraum zu groß für schultageBis: ' + spanne + ' Tage');
  }
  let anzahl = 0;
  for (let i = 1; i <= spanne; i++) {
    if (istSchultag(addDays(von, i), schule)) anzahl++;
  }
  return anzahl;
}

/**
 * Datum als Text.
 * 'kurz'    31.08.
 * 'datum'   31.08.2026
 * 'lang'    Montag, 31. August 2026
 * 'tag'     Mo
 * 'tagLang' Montag
 */
export function formatDatum(d, stil = 'datum') {
  pruefeDatum(d, 'formatDatum');
  const tag = String(d.getDate()).padStart(2, '0');
  const monat = String(d.getMonth() + 1).padStart(2, '0');
  const jahr = String(d.getFullYear()).padStart(4, '0');
  switch (stil) {
    case 'kurz':
      return tag + '.' + monat + '.';
    case 'datum':
      return tag + '.' + monat + '.' + jahr;
    case 'lang':
      return WOCHENTAGE_LANG[d.getDay()] + ', ' + d.getDate() + '. '
        + MONATE[d.getMonth()] + ' ' + jahr;
    case 'tag':
      return WOCHENTAGE_KURZ[d.getDay()];
    case 'tagLang':
      return WOCHENTAGE_LANG[d.getDay()];
    default:
      throw new Error('Unbekannter Datumsstil: ' + String(stil));
  }
}

// Hilfsfunktionen, nur in dieser Datei.

function tagesbeginn(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function utcTag(d) {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

function pruefeDatum(d, wo) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    throw new Error(wo + ' braucht ein gültiges Date, bekam: ' + String(d));
  }
}

function simuliertesDatum() {
  if (typeof location === 'undefined' || !location || !location.search) return null;
  const parameter = new URLSearchParams(location.search);
  if (parameter.get('debug') !== '1') return null;
  const wert = parameter.get('heute');
  if (!wert) return null;
  try {
    return parseISODate(wert);
  } catch (fehler) {
    // Falsch geschriebenes Debug-Datum soll die App nicht anhalten.
    return null;
  }
}
