// Lokaler Speicher (ARCHITEKTUR 3.6, DATENMODELL 6).
//
// Es liegt nur im Browser des Geräts, nichts geht an einen Server.
// Unbekannte Felder bleiben erhalten, damit eine ältere App-Version die
// Daten einer neueren nicht wegwirft.

import { heute, toISODate } from './dates.js';

export const STORAGE_KEY = 'soul_companion_v1';

const SCHEMA = 1;

function standardZustand() {
  return { schema: SCHEMA, jgst: null, schuljahr: null, seenVersion: null, antraege: [] };
}

let zustand = standardZustand();
const hoerer = new Set();

/** Liest den Zustand, ergänzt fehlende Standardfelder, gibt ihn zurück. */
function load() {
  let rohtext = null;
  try {
    rohtext = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  } catch (fehler) {
    // Privater Modus oder gesperrter Speicher: mit Standardzustand weiterarbeiten.
    rohtext = null;
  }
  zustand = standardZustand();
  if (!rohtext) return zustand;
  let gelesen = null;
  try {
    gelesen = JSON.parse(rohtext);
  } catch (fehler) {
    return zustand;
  }
  if (!gelesen || typeof gelesen !== 'object' || Array.isArray(gelesen)) return zustand;
  // Reihenfolge: erst das Gelesene (auch unbekannte Felder), dann fehlende Standardfelder.
  zustand = Object.assign(standardZustand(), gelesen);
  zustand.schema = SCHEMA;
  if (!Array.isArray(zustand.antraege)) zustand.antraege = [];
  if (zustand.jgst !== null && zustand.jgst !== undefined) {
    const zahl = Number(zustand.jgst);
    zustand.jgst = Number.isFinite(zahl) ? zahl : null;
  }
  return zustand;
}

/** Schreibt den Zustand. { ok: false } bei vollem Speicher (QuotaExceededError). */
function save() {
  const text = JSON.stringify(zustand);
  const bytes = new TextEncoder().encode(text).length;
  try {
    localStorage.setItem(STORAGE_KEY, text);
  } catch (fehler) {
    const grund = fehler && fehler.name ? fehler.name : 'Fehler';
    return { ok: false, bytes, grund };
  }
  benachrichtigen();
  return { ok: true, bytes };
}

function setJahrgang(jgst) {
  const zahl = Number(jgst);
  zustand.jgst = Number.isFinite(zahl) ? zahl : null;
  return save();
}

/**
 * Setzt das Schuljahr aus index.json.
 * Nicht in ARCHITEKTUR 3.6 aufgeführt, aber nötig: Onboarding und die Frage
 * beim Schuljahreswechsel (3.1 Punkt 4) müssen state.schuljahr setzen.
 */
function setSchuljahr(schuljahr) {
  zustand.schuljahr = schuljahr === null || schuljahr === undefined ? null : String(schuljahr);
  return save();
}

function setSeenVersion(version) {
  zustand.seenVersion = version === null || version === undefined ? null : String(version);
  return save();
}

// Anträge (DATENMODELL 6). Die Schritte füllt die Zustandsmaschine in AP-14.

function antragListe() {
  return zustand.antraege.slice();
}

function antragGet(id) {
  return zustand.antraege.find((antrag) => antrag && antrag.id === id) || null;
}

function antragCreate(zielstufe, configVersion) {
  const heuteISO = toISODate(heute());
  const antrag = {
    id: neueAntragId(heuteISO),
    zielstufe: Number(zielstufe),
    configVersion: configVersion === undefined ? null : configVersion,
    erstellt: heuteISO,
    geaendert: heuteISO,
    kopf: { name: '', klasse: '' },
    schritte: {},
    pdfErzeugt: null,
    geteilt: null
  };
  zustand.antraege.push(antrag);
  save();
  return antrag;
}

function antragUpdate(id, patch) {
  const antrag = antragGet(id);
  if (!antrag) return null;
  Object.assign(antrag, patch || {});
  antrag.id = id;
  antrag.geaendert = toISODate(heute());
  save();
  return antrag;
}

function antragRemove(id) {
  const vorher = zustand.antraege.length;
  zustand.antraege = zustand.antraege.filter((antrag) => !antrag || antrag.id !== id);
  const entfernt = zustand.antraege.length !== vorher;
  if (entfernt) save();
  return entfernt;
}

function neueAntragId(heuteISO) {
  return 'a-' + heuteISO.replace(/-/g, '') + '-' + zufallsteil();
}

function zufallsteil() {
  if (typeof crypto !== 'undefined' && crypto && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(2);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
}

// Beobachter

function subscribe(fn) {
  if (typeof fn === 'function') hoerer.add(fn);
}

function unsubscribe(fn) {
  hoerer.delete(fn);
}

function benachrichtigen() {
  for (const fn of hoerer) {
    try {
      fn(zustand);
    } catch (fehler) {
      // Ein fehlerhafter Beobachter darf das Speichern nicht verhindern.
    }
  }
}

export const store = {
  STORAGE_KEY,
  load,
  save,
  get state() {
    return zustand;
  },
  setJahrgang,
  setSchuljahr,
  setSeenVersion,
  antraege: {
    list: antragListe,
    get: antragGet,
    create: antragCreate,
    update: antragUpdate,
    remove: antragRemove
  },
  subscribe,
  unsubscribe
};

export default store;
