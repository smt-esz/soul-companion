// Suche: Normalisierung und Bewertung (AP-18, ARCHITEKTUR 3.10).
//
// Reine Funktionen, kein DOM. Die Anzeige (Gruppierung, Hervorhebung als
// <mark>-Element) baut modules/suche.js. Keine Bibliothek (AP-18).

const HOECHSTENS = 30;
const MINDESTLAENGE = 2;

// Muster fuer ein "Wort": Buchstaben (inkl. Umlaute vor der Normalisierung)
// und Ziffern. Alles andere (Satzzeichen, Leerzeichen) trennt Wörter.
const WORT_MUSTER = /[a-zäöüßA-ZÄÖÜ0-9]+/g;

// Nach der Kleinschreibung und Umlautersetzung bleiben nur noch a-z0-9 übrig.
const WORT_MUSTER_KLEIN = /[a-z0-9]+/g;

/**
 * Normalisiert Text für den Vergleich (AP-18): Kleinbuchstaben, ä→a, ö→o,
 * ü→u, ß→ss, Satzzeichen werden zu Leerzeichen. So findet "Ubung" auch
 * "Übung", und Gross-/Kleinschreibung sowie Interpunktion spielen keine
 * Rolle.
 */
export function normalisiere(text) {
  const klein = String(text || '').toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
  const woerter = klein.match(WORT_MUSTER_KLEIN) || [];
  return woerter.join(' ');
}

/** Eine Suchanfrage in normalisierte Einzelwörter zerlegt, leere weggelassen. */
export function zuWorten(text) {
  const normal = normalisiere(text);
  return normal === '' ? [] : normal.split(' ');
}

/**
 * Sucht in einer flachen Liste von Einträgen `{ id, typ, titel, text, route, fach? }`
 * (ARCHITEKTUR 3.10, AP-18).
 *
 * Regeln (AP-18):
 * - Bei mehreren Wörtern müssen alle vorkommen, Präfix-Treffer zählen.
 * - Punkte je Wort: Titel beginnt damit 10, Titel enthält es 5, Text enthält
 *   es 1. Ein Eintrag zählt nur, wenn jedes Wort mindestens einen Punkt holt.
 * - Ein Glossar-Eintrag, dessen Titel genau der ganzen Anfrage entspricht,
 *   steht immer ganz oben (auch vor einer höheren Punktzahl).
 * - Unter 2 Zeichen liefert die Suche nichts (AP-18: "ab 2 Zeichen").
 *
 * @param {Array} eintraege
 * @param {string} abfrage
 * @param {object} [optionen]  { hoechstens }
 * @returns {Array} höchstens `hoechstens` Einträge, sortiert
 */
export function suche(eintraege, abfrage, optionen = {}) {
  const hoechstens = Number.isInteger(optionen.hoechstens) ? optionen.hoechstens : HOECHSTENS;
  const worte = zuWorten(abfrage);
  if (worte.length === 0 || worte.join('').length < MINDESTLAENGE) return [];

  const abfrageNormalisiert = normalisiere(abfrage);
  const treffer = [];

  for (const eintrag of Array.isArray(eintraege) ? eintraege : []) {
    if (!eintrag) continue;
    const titelNormalisiert = normalisiere(eintrag.titel);
    const textNormalisiert = normalisiere(eintrag.text);

    let summe = 0;
    let vollstaendig = true;
    for (const wort of worte) {
      if (titelNormalisiert.startsWith(wort)) {
        summe += 10;
      } else if (enthaeltAlsWortpraefix(titelNormalisiert, wort)) {
        summe += 5;
      } else if (enthaeltAlsWortpraefix(textNormalisiert, wort)) {
        summe += 1;
      } else {
        vollstaendig = false;
        break;
      }
    }
    if (!vollstaendig) continue;

    const exakterGlossarTreffer = eintrag.typ === 'glossar' && titelNormalisiert === abfrageNormalisiert;
    treffer.push({ eintrag, summe, exakterGlossarTreffer });
  }

  // Array.prototype.sort ist stabil (ES2019): bei gleicher Punktzahl bleibt
  // die Reihenfolge aus dem Suchindex erhalten.
  treffer.sort((a, b) => {
    if (a.exakterGlossarTreffer !== b.exakterGlossarTreffer) {
      return a.exakterGlossarTreffer ? -1 : 1;
    }
    return b.summe - a.summe;
  });

  return treffer.slice(0, hoechstens).map((eintrag) => eintrag.eintrag);
}

function enthaeltAlsWortpraefix(normalisierterText, wort) {
  if (!wort) return false;
  return normalisierterText.split(' ').some((teil) => teil.length > 0 && teil.startsWith(wort));
}

/**
 * Zerlegt einen Text in Stücke für die Hervorhebung: `{ text, treffer }`.
 * `treffer` ist wahr, wenn das Stück ein zusammenhängendes Wort ist, das mit
 * einem der Suchwörter beginnt (Präfix, wie bei der Bewertung). Trennzeichen
 * (Leerzeichen, Satzzeichen) sind eigene, nie hervorgehobene Stücke.
 *
 * Reine Textverarbeitung: modules/suche.js baut daraus mit `el()` echte
 * <mark>-Elemente statt Daten per innerHTML einzusetzen (AP_ALLGEMEIN 4).
 *
 * @param {string} text
 * @param {string[]} worte  bereits normalisierte Suchwörter (aus zuWorten)
 * @returns {{text: string, treffer: boolean}[]}
 */
export function hervorhebung(text, worte) {
  const roh = String(text || '');
  if (!Array.isArray(worte) || worte.length === 0 || roh === '') {
    return roh === '' ? [] : [{ text: roh, treffer: false }];
  }

  const stuecke = [];
  let rest = 0;
  WORT_MUSTER.lastIndex = 0;
  let treffer;
  while ((treffer = WORT_MUSTER.exec(roh)) !== null) {
    if (treffer.index > rest) stuecke.push({ text: roh.slice(rest, treffer.index), treffer: false });
    const wort = treffer[0];
    const istTreffer = worte.some((suchwort) => normalisiere(wort).startsWith(suchwort));
    stuecke.push({ text: wort, treffer: istTreffer });
    rest = treffer.index + wort.length;
  }
  if (rest < roh.length) stuecke.push({ text: roh.slice(rest), treffer: false });
  return stuecke;
}
