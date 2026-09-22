// Hash-Routing (ARCHITEKTUR 3.4).
//
// Vor dem Rendern: Container leeren, nach oben scrollen.
// Nach dem Rendern: Fokus auf die h1 der neuen Seite (Barrierearmut).

import { findRoute } from './module.js';
import { el, leer } from './ui/components.js';

// Unbekannte Route führt laut ARCHITEKTUR 3.4 auf '#/woche'. Solange es das
// Modul woche noch nicht gibt (AP-10), greift der Rückfall auf '#/demo'.
const STANDARD_HASH = '#/woche';
const RUECKFALL_HASH = '#/demo';

let ziel = null;
let kontext = null;
let laeuft = false;
const hoerer = new Set();

/** Startet den Router und rendert die aktuelle Route. */
export function startRouter({ container, ctx }) {
  if (!container) throw new Error('startRouter braucht einen container.');
  ziel = container;
  kontext = ctx || null;
  if (!laeuft) {
    window.addEventListener('hashchange', rendern);
    laeuft = true;
  }
  return rendern();
}

/** Wechselt die Seite. */
export function navigate(hash) {
  const neuerHash = String(hash || STANDARD_HASH);
  if (location.hash === neuerHash) {
    // Gleicher Hash löst kein hashchange aus, deshalb direkt rendern.
    return rendern();
  }
  location.hash = neuerHash;
  return undefined;
}

/** Aktueller Hash, immer mit '#/' am Anfang. */
export function aktuellerHash() {
  return location.hash || STANDARD_HASH;
}

/** Meldet nach jedem Rendern den aktuellen Hash (für die Navigation). */
export function onNavigation(fn) {
  if (typeof fn === 'function') hoerer.add(fn);
}

export function offNavigation(fn) {
  hoerer.delete(fn);
}

async function rendern() {
  if (!ziel) return;
  const hash = aktuellerHash();
  let treffer = findRoute(hash);

  if (!treffer) {
    const ersatz = ersatzHash(hash);
    if (ersatz) {
      location.hash = ersatz;
      return;
    }
  }

  leer(ziel);
  if (typeof window.scrollTo === 'function') window.scrollTo(0, 0);
  ziel.scrollTop = 0;

  if (!treffer) {
    ziel.removeAttribute('data-modul');
    zeigeHinweis('Seite nicht gefunden', 'Diese Seite gibt es nicht.');
    fokusAufTitel();
    melden(hash);
    return;
  }

  ziel.dataset.modul = treffer.modul.id;
  try {
    await treffer.route.render(ziel, treffer.params, kontext);
  } catch (fehler) {
    leer(ziel);
    zeigeHinweis(
      'Das hat nicht geklappt',
      'Diese Seite kann gerade nicht angezeigt werden. Versuche es später noch einmal.'
    );
  }
  fokusAufTitel();
  melden(hash);
}

// Welcher Hash soll es stattdessen sein? Nur Hashes, zu denen es eine Route gibt.
function ersatzHash(hash) {
  for (const kandidat of [STANDARD_HASH, RUECKFALL_HASH]) {
    if (kandidat !== hash && findRoute(kandidat)) return kandidat;
  }
  return null;
}

function zeigeHinweis(titel, text) {
  ziel.append(el('h1', { text: titel, tabindex: '-1' }));
  ziel.append(el('p', { text }));
}

function fokusAufTitel() {
  const titel = ziel.querySelector('h1');
  if (!titel) return;
  if (!titel.hasAttribute('tabindex')) titel.setAttribute('tabindex', '-1');
  try {
    titel.focus({ preventScroll: true });
  } catch (fehler) {
    titel.focus();
  }
}

function melden(hash) {
  for (const fn of hoerer) {
    try {
      fn(hash);
    } catch (fehler) {
      // Ein fehlerhafter Beobachter darf das Rendern nicht stören.
    }
  }
}
