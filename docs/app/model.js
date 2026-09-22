// Abgeleitete Abfragen (ARCHITEKTUR 3.7).
//
// Reine Funktionen: kein DOM, kein Speicher, kein fetch. Damit sind sie mit
// node testbar (AP-09 schreibt die Tests).
//
// AP-01 legt nur die Signaturen fest, damit alle Module dagegen bauen können.
// Die Rümpfe füllt AP-09.

function nochNicht(name) {
  throw new Error('AP-09: ' + name + ' ist noch nicht umgesetzt.');
}

/** Slots mit von <= datum <= bis. */
export function slotsAm(jg, datum) {
  return nochNicht('slotsAm');
}

/** { fachId: slot|null }, erster Slot je Fach mit von > datum. */
export function naechsterSlotJeFach(jg, datum) {
  return nochNicht('naechsterSlotJeFach');
}

/** Slots eines Fachs, sortiert, mit status 'vorbei' | 'laeuft' | 'kommt'. */
export function bausteineDesFachs(jg, fachId) {
  return nochNicht('bausteineDesFachs');
}

/** { kw, montag, sonderwoche|null, ferien|null } (keine A/B-Woche). */
export function wocheninfo(schule, jg, datum) {
  return nochNicht('wocheninfo');
}

/** Rasterzeitraum, der datum enthält, sonst null. */
export function rasterAm(jg, datum) {
  return nochNicht('rasterAm');
}

/** Termine des Tages aus raster.termine, coachingMuster und Pflichtinputs, sortiert. */
export function termineAm(jg, schule, datum) {
  return nochNicht('termineAm');
}

/** { name, von, bis, schultageBis } der nächsten Ferien. */
export function naechsteFerien(schule, datum) {
  return nochNicht('naechsteFerien');
}

/** Nächste Abgaben (slot.abgabe >= datum), höchstens anzahl. */
export function abgabenAb(jg, datum, anzahl) {
  return nochNicht('abgabenAb');
}
