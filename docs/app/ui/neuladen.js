// Ziehen zum Neuladen (Pull-to-Refresh).
//
// Ganz oben auf der Seite nach unten ziehen zeigt eine Anzeige, ab einer
// Schwelle und beim Loslassen lädt die App neu (update.neuLaden: Caches
// löschen, Service Worker abmelden, neu laden; der lokale Speicher mit Jahrgang
// und Anträgen bleibt). Das native Überziehen des Browsers wird dabei
// unterdrückt, damit sich nicht der ganze Hintergrund mitbewegt.
//
// Kein Ziehen in Formularen, auf dem Antrag und in waagerecht scrollenden
// Bereichen, damit dort nichts verloren geht oder verrutscht.

const SCHWELLE = 56;      // gedämpfter Zugweg in px, ab dem "loslassen" gilt
const MAXIMUM = 84;       // weiter zieht die Anzeige nicht mit
const DAEMPFUNG = 0.5;    // Finger bewegt sich doppelt so weit wie die Anzeige

let anzeige = null;
let text = null;
let start = null;         // { y } während eines Zugs
let weg = 0;              // aktueller gedämpfter Zugweg
let laedt = false;

/**
 * Richtet die Geste einmal ein.
 * @param {object} optionen  { onNeuLaden: Funktion }
 */
export function zieheZumNeuladen(optionen = {}) {
  const { onNeuLaden = null } = optionen;
  if (!onNeuLaden || !('ontouchstart' in window)) return;

  document.addEventListener('touchstart', (ereignis) => {
    if (laedt || ereignis.touches.length !== 1) { start = null; return; }
    if (!hochgescrollt() || istAusgenommen(ereignis.target)) { start = null; return; }
    start = { y: ereignis.touches[0].clientY };
    weg = 0;
  }, { passive: true });

  document.addEventListener('touchmove', (ereignis) => {
    if (!start) return;
    const dy = ereignis.touches[0].clientY - start.y;
    if (dy <= 0 || !hochgescrollt()) { zuruecksetzen(); start = null; return; }
    // Das native Überziehen unterdrücken, sonst wandert die ganze Seite mit.
    if (ereignis.cancelable) ereignis.preventDefault();
    weg = Math.min(MAXIMUM, dy * DAEMPFUNG);
    zeige(weg, weg >= SCHWELLE ? 'bereit' : 'zieht');
  }, { passive: false });

  document.addEventListener('touchend', () => {
    if (!start) return;
    const bereit = weg >= SCHWELLE;
    start = null;
    if (!bereit) { zuruecksetzen(); return; }
    laedt = true;
    zeige(SCHWELLE, 'laedt');
    Promise.resolve(onNeuLaden()).catch(() => { laedt = false; zuruecksetzen(); });
  }, { passive: true });

  document.addEventListener('touchcancel', () => { start = null; zuruecksetzen(); }, { passive: true });
}

function hochgescrollt() {
  return (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
}

function istAusgenommen(ziel) {
  if (!(ziel instanceof Element)) return false;
  return Boolean(ziel.closest('input, textarea, select, [contenteditable], .plan-zeitleiste, .antrag-unterschrift-rahmen'))
    || String(location.hash).startsWith('#/antrag/');
}

function anzeigeHolen() {
  if (anzeige && anzeige.isConnected) return anzeige;
  anzeige = document.createElement('div');
  anzeige.className = 'zieh-anzeige';
  anzeige.setAttribute('role', 'status');
  anzeige.setAttribute('aria-live', 'polite');
  const kreis = document.createElement('span');
  kreis.className = 'zieh-kreis';
  kreis.setAttribute('aria-hidden', 'true');
  text = document.createElement('span');
  text.className = 'zieh-text';
  anzeige.append(kreis, text);
  document.body.append(anzeige);
  return anzeige;
}

const TEXTE = {
  zieht: 'Zum Neuladen ziehen',
  bereit: 'Loslassen zum Neuladen',
  laedt: 'Lädt neu …'
};

function zeige(strecke, zustand) {
  const knoten = anzeigeHolen();
  knoten.dataset.zustand = zustand;
  knoten.style.setProperty('--zieh-weg', strecke + 'px');
  knoten.style.setProperty('--zieh-winkel', Math.round((strecke / SCHWELLE) * 180) + 'deg');
  text.textContent = TEXTE[zustand];
}

function zuruecksetzen() {
  if (!anzeige) return;
  anzeige.dataset.zustand = 'aus';
  anzeige.style.setProperty('--zieh-weg', '0px');
}
