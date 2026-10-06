// Kalenderdatei (.ics) für einen einzelnen Termin.
//
// Reine Textfunktionen, kein DOM, keine Netzanfrage. Die Termine der App haben
// keine eigene Uhrzeit; der Aufrufer gibt die SOUL-Zeit mit (`zeit`), sonst entsteht
// ein ganztägiger Eintrag.
// Aufbau nach RFC 5545: Zeilenende CRLF, Texte maskiert, Zeilen auf 75 Byte
// gefaltet.

import { toISODate, addDays } from './dates.js';

const PRODID = '-//Evangelisches Schulzentrum Bad Düben//SOUL-Navi//DE';

/**
 * @param {object} termin   { datum: Date|'YYYY-MM-DD', titel: string, beschreibung?: string, kennung: string }
 * @param {Date} [jetzt]    Zeitstempel der Erzeugung (für Tests)
 * @returns {string} Inhalt der .ics-Datei
 */
export function terminAlsIcs(termin, jetzt = new Date()) {
  const tag = tagOhneStriche(termin.datum);
  const naechster = tagOhneStriche(addDays(parseTag(termin.datum), 1));
  // Mit Uhrzeit: lokale Zeit ohne Zeitzone ("schwebend"), der Kalender nimmt
  // die Zeitzone des Geräts. Ohne Uhrzeit: ganztägig.
  const beginn = termin.zeit ? 'DTSTART:' + tag + 'T' + uhr(termin.zeit.von) : 'DTSTART;VALUE=DATE:' + tag;
  const ende = termin.zeit ? 'DTEND:' + tag + 'T' + uhr(termin.zeit.bis) : 'DTEND;VALUE=DATE:' + naechster;
  const zeilen = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:' + PRODID,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + maskiere(termin.kennung) + '@soul-navi',
    'DTSTAMP:' + zeitstempel(jetzt),
    beginn,
    ende,
    'SUMMARY:' + maskiere(termin.titel),
    termin.beschreibung ? 'DESCRIPTION:' + maskiere(termin.beschreibung) : null,
    termin.zeit ? null : 'TRANSP:TRANSPARENT',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean);
  return zeilen.map(falte).join('\r\n') + '\r\n';
}

/** Dateiname aus dem Titel: nur a-z, 0-9 und Bindestrich. */
export function dateiname(titel, datum) {
  const grund = String(titel || 'termin').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'termin';
  return grund + '-' + toISODate(parseTag(datum)) + '.ics';
}

function uhr(zeit) {
  return String(zeit).replace(':', '') + '00';
}

function parseTag(datum) {
  if (datum instanceof Date) return datum;
  const [j, m, t] = String(datum).split('-').map(Number);
  return new Date(j, m - 1, t);
}

function tagOhneStriche(datum) {
  return toISODate(parseTag(datum)).replace(/-/g, '');
}

function zeitstempel(datum) {
  return datum.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function maskiere(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Zeilen länger als 75 Byte werden gefaltet: CRLF und ein Leerzeichen.
function falte(zeile) {
  const kodierer = new TextEncoder();
  if (kodierer.encode(zeile).length <= 75) return zeile;
  const teile = [];
  let aktuell = '';
  let bytes = 0;
  let grenze = 75;
  for (const zeichen of zeile) {
    const laenge = kodierer.encode(zeichen).length;
    if (bytes + laenge > grenze) {
      teile.push(aktuell);
      aktuell = '';
      bytes = 0;
      grenze = 74; // Folgezeilen beginnen mit einem Leerzeichen
    }
    aktuell += zeichen;
    bytes += laenge;
  }
  teile.push(aktuell);
  return teile.join('\r\n ');
}

/** Löst den Download im Browser aus (oder öffnet unter iOS das Kalenderblatt). */
export function ladeHerunter(inhalt, name) {
  const blob = new Blob([inhalt], { type: 'text/calendar;charset=utf-8' });
  const adresse = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = adresse;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(adresse), 10000);
}
