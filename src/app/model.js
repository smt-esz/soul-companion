// Abgeleitete Abfragen (ARCHITEKTUR 3.7, präzisiert in AP-09).
//
// Reine Funktionen: kein DOM, kein Speicher, kein fetch, keine Mutation der
// Eingabedaten. Tests: tools/test-model.mjs.
//
// Datum: Parameter sind immer Date (lokal 00:00), Rückgaben enthalten Datums-
// angaben als Date. In den Daten stehen 'YYYY-MM-DD'-Texte. Verglichen wird
// über diese Texte, weil das Format zeichenweise genauso sortiert wie
// chronologisch. Gelesen wird ein Datumstext nur über dates.parseISODate.
//
// Kopieren statt ändern: Jede Rückgabe, die ein Feld ergänzt oder ein Datum
// umwandelt, ist eine flache Kopie. Die geladenen Daten bleiben unberührt,
// auch wenn sie tief eingefroren sind.

import {
  addDays, diffDays, heute as heuteDatum, isWeekend, isoWeek, istFerientag,
  istSchultag, mondayOf, parseISODate, schultageBis, toISODate
} from './dates.js';

// Input vor Coaching vor Sonstiges (AP-09, termineAm). 'entfall' steht nicht
// hier: Entfall-Zeilen streichen ein Coaching, sie sind selbst kein Termin.
const ART_REIHENFOLGE = { input: 0, coaching: 1, sonstiges: 2 };

// Obergrenze für die Tagessuche. Die Sommerferien sind der längste Block ohne
// Schultag, 400 Tage reichen weit darüber hinaus.
const MAX_SUCHTAGE = 400;

// Fächer ohne Eintrag in schule.faecher sortieren ans Ende.
const RANG_UNBEKANNT = Number.MAX_SAFE_INTEGER;

/** Slots mit von <= datum <= bis, sortiert nach Spur. */
export function slotsAm(jg, datum) {
  const tag = toISODate(datum);
  // Ein Slot über mehrere Spuren (spuren: [1,2,3]) steht einmal in den Daten
  // und kommt deshalb auch einmal zurück.
  return liste(jg, 'slots')
    .filter((slot) => slot && imZeitraum(tag, slot.von, slot.bis))
    .sort((a, b) => spurVon(a) - spurVon(b)
      || textVergleich(a.von, b.von)
      || textVergleich(a.id, b.id))
    .map(slotKopie);
}

/**
 * { fachId: slot|null } für jedes Fach des Jahrgangs: erster Slot mit
 * von > datum. Slots mit offenem Fach bleiben außen vor.
 */
export function naechsterSlotJeFach(jg, datum) {
  const tag = toISODate(datum);
  const slots = liste(jg, 'slots')
    .filter((slot) => slot && slot.von && slot.fach && slot.fach !== 'offen');

  const treffer = new Map();
  for (const slot of slots) {
    if (!treffer.has(slot.fach)) treffer.set(slot.fach, null);
    if (!(slot.von > tag)) continue;
    const bisher = treffer.get(slot.fach);
    if (!bisher || slot.von < bisher.von) treffer.set(slot.fach, slot);
  }

  const ergebnis = {};
  for (const [fachId, slot] of treffer) {
    ergebnis[fachId] = slot ? slotKopie(slot) : null;
  }
  return ergebnis;
}

/**
 * Bausteine eines Fachs: [{ slot, baustein, status }], sortiert nach von.
 * Sortiert wird nie nach slot.nr, die Nummer ist intern (DATENMODELL 3).
 * status: 'vorbei' (bis < datum), 'laeuft', 'kommt'.
 */
export function bausteineDesFachs(jg, fachId, datum) {
  const tag = toISODate(datum);
  const bausteine = liste(jg, 'bausteine');
  return liste(jg, 'slots')
    .filter((slot) => slot && slot.von && slot.fach === fachId)
    .sort((a, b) => textVergleich(a.von, b.von) || textVergleich(a.id, b.id))
    .map((slot) => ({
      slot: slotKopie(slot),
      baustein: bausteine.find((eintrag) => eintrag && eintrag.id === slot.baustein) || null,
      status: slotStatus(slot, tag)
    }));
}

/** { kw, jahr, montag, sonderwoche|null, ferien|null } (keine A/B-Woche). */
export function wocheninfo(schule, jg, datum) {
  const tag = toISODate(datum);
  const woche = isoWeek(datum);
  return {
    kw: woche.kw,
    jahr: woche.jahr,
    montag: mondayOf(datum),
    sonderwoche: sonderwocheAm(jg, tag),
    ferien: ferienAm(schule, tag)
  };
}

/** Rasterzeitraum mit von <= datum <= bis, sonst null. */
export function rasterAm(jg, datum) {
  const tag = toISODate(datum);
  const treffer = liste(jg, 'raster').find((eintrag) => eintrag && imZeitraum(tag, eintrag.von, eintrag.bis));
  return treffer ? zeitraumKopie(treffer) : null;
}

/**
 * Termine eines Tages: [{ art, fach, kuerzel, klasse, titel, text, station,
 * pflicht, inputId }], sortiert nach Art und Fach.
 * An Wochenenden, Ferientagen und in Sonderwochen gibt es keine Termine.
 */
export function termineAm(jg, schule, datum) {
  const tag = toISODate(datum);
  if (isWeekend(datum) || istFerientag(datum, schule)) return [];
  if (sonderwocheAm(jg, tag)) return [];

  const desTages = liste(jg, 'termine').filter((termin) => termin && termin.datum === tag);

  // Entfall streicht das Coaching mit demselben Kürzel am selben Tag.
  const abgesagt = new Set(
    desTages.filter((termin) => termin.art === 'entfall' && termin.kuerzel)
      .map((termin) => termin.kuerzel)
  );

  const wochentag = wochentagNummer(datum);
  const ergebnis = [];

  for (const coaching of liste(jg, 'coachings')) {
    if (!coaching || Number(coaching.wochentag) !== wochentag) continue;
    if (coaching.gueltigAb && tag < coaching.gueltigAb) continue;
    if (coaching.gueltigBis && tag > coaching.gueltigBis) continue;
    if (coaching.kuerzel && abgesagt.has(coaching.kuerzel)) continue;
    // Das Wochenmuster kennt weder Fach noch Text, den Titel setzt die Ansicht.
    ergebnis.push({
      art: 'coaching',
      fach: null,
      kuerzel: coaching.kuerzel || null,
      klasse: coaching.klasse || null,
      titel: null,
      text: null,
      station: null,
      pflicht: false,
      inputId: null
    });
  }

  const inputs = liste(jg, 'inputs');
  for (const termin of desTages) {
    if (!(termin.art in ART_REIHENFOLGE)) continue;
    const eintrag = termin.input
      ? inputs.find((input) => input && input.id === termin.input) || null
      : null;
    const text = termin.text || null;
    ergebnis.push({
      art: termin.art,
      fach: termin.fach || null,
      kuerzel: termin.kuerzel || null,
      klasse: termin.klasse || null,
      titel: eintrag && eintrag.titel ? eintrag.titel : text,
      text,
      station: termin.station === undefined || termin.station === null || termin.station === ''
        ? null
        : termin.station,
      pflicht: termin.pflicht === true,
      inputId: termin.input || null
    });
  }

  const rang = fachRaenge(schule);
  return ergebnis.sort((a, b) => ART_REIHENFOLGE[a.art] - ART_REIHENFOLGE[b.art]
    || fachRang(rang, a.fach) - fachRang(rang, b.fach)
    || textVergleich(a.kuerzel || '', b.kuerzel || ''));
}

/** Fünf Einträge Mo bis Fr: { datum, termine, ferien, sonderwoche }. */
export function wocheTermine(jg, schule, montag) {
  const start = mondayOf(montag);
  const tage = [];
  for (let versatz = 0; versatz < 5; versatz++) {
    const datum = addDays(start, versatz);
    const tag = toISODate(datum);
    tage.push({
      datum,
      termine: termineAm(jg, schule, datum),
      ferien: ferienAm(schule, tag),
      sonderwoche: sonderwocheAm(jg, tag)
    });
  }
  return tage;
}

/**
 * Nächster Ferienblock mit bis >= datum und mindestens drei Tagen Dauer.
 * Einzelne freie Tage zählen nicht als Ferien.
 * { name, von, bis, laeuft, schultageBis } oder null.
 */
export function naechsteFerien(schule, datum) {
  const tag = toISODate(datum);
  const treffer = liste(schule, 'ferien')
    .filter((block) => block && block.von
      && (block.bis || block.von) >= tag
      && dauerTage(block) >= 3)
    .sort((a, b) => textVergleich(a.von, b.von))[0];
  if (!treffer) return null;

  const von = parseISODate(treffer.von);
  return {
    name: treffer.name || '',
    von,
    bis: parseISODate(treffer.bis || treffer.von),
    laeuft: treffer.von <= tag,
    schultageBis: schultageBis(datum, von, schule)
  };
}

/**
 * Slots mit abgabe >= datum, sortiert, je mit Feld schultageBis.
 * anzahl begrenzt die Liste, ohne Angabe kommen alle zurück.
 * schule ist für die Ferien in schultageBis nötig (siehe AP-09 Bericht).
 */
export function abgabenAb(jg, datum, anzahl, schule = null) {
  const tag = toISODate(datum);
  const passend = liste(jg, 'slots')
    .filter((slot) => slot && slot.von && abgabeVon(slot) && abgabeVon(slot) >= tag)
    .sort((a, b) => textVergleich(abgabeVon(a), abgabeVon(b)) || textVergleich(a.id, b.id));

  const grenze = Number(anzahl);
  const begrenzt = Number.isFinite(grenze) && grenze > 0 ? passend.slice(0, grenze) : passend;

  // Die Liste ist aufsteigend sortiert, deshalb wird jeder Tag nur einmal
  // gezählt: Schultage bis zur ersten Abgabe, dann von Abgabe zu Abgabe.
  let vorherige = datum;
  let summe = 0;
  return begrenzt.map((slot) => {
    const kopie = slotKopie(slot);
    summe += schultageBis(vorherige, kopie.abgabe, schule);
    vorherige = kopie.abgabe;
    kopie.schultageBis = summe;
    return kopie;
  });
}

/** Erstes Datum > datum, das weder Wochenende noch Ferientag ist. */
export function naechsterSchultag(schule, datum) {
  for (let versatz = 1; versatz <= MAX_SUCHTAGE; versatz++) {
    const tag = addDays(datum, versatz);
    if (istSchultag(tag, schule)) return tag;
  }
  return null;
}

/** Wie naechsterSchultag, aber auch außerhalb der Sonderwochen des Jahrgangs. */
export function naechsterSoulTag(schule, jg, datum) {
  for (let versatz = 1; versatz <= MAX_SUCHTAGE; versatz++) {
    const tag = addDays(datum, versatz);
    if (!istSchultag(tag, schule)) continue;
    if (sonderwocheAm(jg, toISODate(tag))) continue;
    return tag;
  }
  return null;
}

/**
 * Inputs eines Fachs, gruppiert nach art: { fach, methode, baustein }.
 * Jeder Eintrag trägt seine nächsten Termine ab datum (Standard: heute).
 */
export function inputsDesFachs(jg, fachId, datum = heuteDatum()) {
  const ab = toISODate(datum);
  const gruppen = { fach: [], methode: [], baustein: [] };
  for (const eintrag of liste(jg, 'inputs')) {
    if (!eintrag || eintrag.fach !== fachId) continue;
    // DATENMODELL 3 kennt nur diese drei Arten. Alles andere wird übergangen,
    // damit eine unbekannte Art die Ansicht nicht anhält.
    const gruppe = Object.prototype.hasOwnProperty.call(gruppen, eintrag.art)
      ? gruppen[eintrag.art]
      : null;
    if (!gruppe) continue;
    gruppe.push(Object.assign({}, eintrag, { termine: termineZuInput(jg, eintrag.id, ab) }));
  }
  return gruppen;
}

/** { fruehesterAufstieg: Date|null, aufstiegMoeglich: boolean }. */
export function stufenInfo(jg, datum) {
  const wert = jg && jg.fruehesterAufstieg ? jg.fruehesterAufstieg : null;
  return {
    fruehesterAufstieg: wert ? parseISODate(wert) : null,
    aufstiegMoeglich: !wert || toISODate(datum) >= wert
  };
}

// ------------------------------------------------------------ Hilfsfunktionen

function liste(objekt, feld) {
  return objekt && Array.isArray(objekt[feld]) ? objekt[feld] : [];
}

function imZeitraum(tag, von, bis) {
  if (!von) return false;
  return von <= tag && tag <= (bis || von);
}

function textVergleich(a, b) {
  const links = a || '';
  const rechts = b || '';
  if (links < rechts) return -1;
  if (links > rechts) return 1;
  return 0;
}

function spurVon(slot) {
  if (Array.isArray(slot.spuren) && slot.spuren.length > 0) return Number(slot.spuren[0]) || 0;
  return Number(slot.spur) || 0;
}

function abgabeVon(slot) {
  return slot.abgabe || slot.bis || '';
}

function slotKopie(slot) {
  const kopie = Object.assign({}, slot);
  kopie.von = parseISODate(slot.von);
  kopie.bis = parseISODate(slot.bis || slot.von);
  // Leere Abgabe heißt: Abgabe am Ende des Slots (DATENMODELL 3).
  kopie.abgabe = parseISODate(abgabeVon(slot));
  return kopie;
}

function zeitraumKopie(objekt) {
  const kopie = Object.assign({}, objekt);
  kopie.von = parseISODate(objekt.von);
  kopie.bis = parseISODate(objekt.bis || objekt.von);
  return kopie;
}

function slotStatus(slot, tag) {
  if (slot.bis && slot.bis < tag) return 'vorbei';
  if (slot.von <= tag) return 'laeuft';
  return 'kommt';
}

function sonderwocheAm(jg, tag) {
  const treffer = liste(jg, 'sonderwochen').find((woche) => woche && imZeitraum(tag, woche.von, woche.bis));
  return treffer ? zeitraumKopie(treffer) : null;
}

function ferienAm(schule, tag) {
  const treffer = liste(schule, 'ferien').find((block) => block && imZeitraum(tag, block.von, block.bis));
  return treffer ? zeitraumKopie(treffer) : null;
}

function dauerTage(zeitraum) {
  return diffDays(parseISODate(zeitraum.von), parseISODate(zeitraum.bis || zeitraum.von)) + 1;
}

/** 1 = Montag bis 7 = Sonntag (wie DATENMODELL 3, Blatt Coachings). */
function wochentagNummer(datum) {
  const tag = datum.getDay();
  return tag === 0 ? 7 : tag;
}

function fachRaenge(schule) {
  const raenge = new Map();
  for (const fach of liste(schule, 'faecher')) {
    if (fach && fach.id) raenge.set(fach.id, Number(fach.reihenfolge) || 0);
  }
  return raenge;
}

function fachRang(raenge, fachId) {
  if (!fachId) return RANG_UNBEKANNT;
  const rang = raenge.get(fachId);
  return rang === undefined ? RANG_UNBEKANNT : rang;
}

function termineZuInput(jg, inputId, ab) {
  return liste(jg, 'termine')
    .filter((termin) => termin && termin.input === inputId
      && termin.art !== 'entfall'
      && termin.datum >= ab)
    .sort((a, b) => textVergleich(a.datum, b.datum))
    .map((termin) => Object.assign({}, termin, { datum: parseISODate(termin.datum) }));
}
