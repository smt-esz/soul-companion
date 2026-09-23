// Onboarding: Jahrgangswahl (#/start) und Schuljahreswechsel-Frage
// (ARCHITEKTUR 3.1, AP-10.md, ersetzt den Platzhalter aus AP-01 in main.js).
//
// Baut nur den Inhalt einer von main.js bereitgestellten Einzelseite
// (Rahmen, Fokus auf h1 und das Speichern übernimmt main.js weiterhin).
// Schreibt selbst nichts in den Speicher.

import { el, karte, knopf } from './ui/components.js';

const SATZ_START = 'Hier findest du alles zu SOUL für deinen Jahrgang.';
const HINWEIS_START = 'Du kannst den Jahrgang später in den Einstellungen ändern.';

/**
 * Schritt 1 (und einziger Schritt, AP-10.md): SOUL-Logo, Satz, drei große
 * Karten für die Jahrgänge aus index.jahrgaenge.
 * @param {HTMLElement} container
 * @param {object} optionen  { jahrgaenge: number[], onWahl(nummer) }
 */
export function renderJahrgangswahl(container, optionen = {}) {
  const { jahrgaenge = [], onWahl = null } = optionen;

  const logo = el('img', {
    src: 'assets/soul-logo.png',
    alt: '',
    style: { display: 'block', width: '96px', height: 'auto', margin: '0 auto var(--s-5)' }
  });

  const karten = jahrgaenge.map((nummer) => karte({
    titel: 'Jahrgang ' + nummer,
    onTap: onWahl ? () => onWahl(nummer) : null
  }));

  container.append(
    logo,
    el('h1', { class: 'titel-gross', text: SATZ_START, tabindex: '-1' }),
    el('div', { class: 'karten-reihe' }, karten),
    el('p', { class: 'text-klein text-neben', text: HINWEIS_START })
  );
}

/**
 * Schuljahreswechsel-Frage (ARCHITEKTUR 3.1, Punkt 4): weicht
 * index.schuljahr von state.schuljahr ab, fragt die App einmal, ob das Kind
 * noch im selben Jahrgang ist.
 * @param {HTMLElement} container
 * @param {object} optionen  { alter: number, jahrgaenge: number[], onWahl(nummer) }
 */
export function renderSchuljahrFrage(container, optionen = {}) {
  const { alter, jahrgaenge = [], onWahl = null } = optionen;

  const knoepfe = [knopf({
    text: 'Ja, Jahrgang ' + alter,
    art: 'haupt',
    onTap: onWahl ? () => onWahl(alter) : null
  })];
  for (const nummer of jahrgaenge) {
    if (nummer === alter) continue;
    knoepfe.push(knopf({
      text: 'Nein, Jahrgang ' + nummer,
      art: 'neben',
      onTap: onWahl ? () => onWahl(nummer) : null
    }));
  }

  container.append(
    el('h1', { text: 'Neues Schuljahr', tabindex: '-1' }),
    el('p', { text: 'Bist du noch in Jahrgang ' + alter + '?' }),
    el('div', { class: 'knopf-reihe' }, knoepfe)
  );
}
