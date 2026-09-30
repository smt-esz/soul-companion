// Hell/Dunkel-Wahl. "system" folgt der Geräteeinstellung (Standard), "hell"
// und "dunkel" erzwingen den Modus über data-farbschema (styles/tokens.css).
// Die Wahl liegt nur im Browser des Geräts, getrennt vom App-Zustand.

const SCHLUESSEL = 'soul_farbschema';
const ERLAUBT = ['system', 'hell', 'dunkel'];

export function leseFarbschema() {
  try {
    const wert = localStorage.getItem(SCHLUESSEL);
    return ERLAUBT.includes(wert) ? wert : 'system';
  } catch (fehler) {
    return 'system';
  }
}

export function wendeFarbschemaAn(wahl = leseFarbschema()) {
  const wurzel = document.documentElement;
  if (wahl === 'hell' || wahl === 'dunkel') {
    wurzel.setAttribute('data-farbschema', wahl);
  } else {
    wurzel.removeAttribute('data-farbschema');
  }
}

export function setzeFarbschema(wahl) {
  if (!ERLAUBT.includes(wahl)) return;
  try {
    if (wahl === 'system') localStorage.removeItem(SCHLUESSEL);
    else localStorage.setItem(SCHLUESSEL, wahl);
  } catch (fehler) {
    // Gesperrter Speicher: die Wahl gilt dann nur bis zum Neuladen.
  }
  wendeFarbschemaAn(wahl);
}
