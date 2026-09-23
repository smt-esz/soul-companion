// Bausteine für die Oberfläche (Planung/DESIGN.md, Abschnitt 7).
//
// Jede Komponente gibt ein DOM-Element zurück. Kein Modul schreibt HTML,
// Daten kommen immer über textContent in die Seite (CSP, ARCHITEKTUR 3.1).
// Die Stile stehen in styles/components.css, die Form der Tonlage in
// styles/tones.css. Farben und Masse nie hier eintragen, nur Klassen setzen.

import { icon } from './icons.js';
import { diffDays, formatDatum, parseISODate } from '../dates.js';

/**
 * Erzeugt ein Element.
 *
 *   el('p', { text: 'Hallo' })
 *   el('button', { type: 'button', class: 'knopf', onclick: fn }, [kind])
 *
 * Regeln (CSP, siehe ARCHITEKTUR 3.1):
 * - Daten kommen immer als textContent in die Seite, nie als innerHTML.
 * - style wird nur als Objekt angenommen und über element.style gesetzt,
 *   nie als style="..."-Zeichenkette.
 *
 * Werte null, undefined und false lassen das Attribut weg.
 * true setzt es als leeres Attribut (z. B. hidden: true).
 */
export function el(tag, attribute = {}, kinder = []) {
  const element = document.createElement(tag);
  for (const [schluessel, wert] of Object.entries(attribute || {})) {
    if (wert === null || wert === undefined || wert === false) continue;
    if (schluessel === 'text') {
      element.textContent = String(wert);
      continue;
    }
    if (schluessel === 'class' || schluessel === 'klasse') {
      element.className = String(wert);
      continue;
    }
    if (schluessel === 'style') {
      if (typeof wert !== 'object') {
        throw new Error('style bitte als Objekt angeben, nicht als Text.');
      }
      Object.assign(element.style, wert);
      continue;
    }
    if (schluessel === 'dataset') {
      Object.assign(element.dataset, wert);
      continue;
    }
    if (schluessel.startsWith('on') && typeof wert === 'function') {
      element.addEventListener(schluessel.slice(2), wert);
      continue;
    }
    element.setAttribute(schluessel, wert === true ? '' : String(wert));
  }
  anhaengen(element, kinder);
  return element;
}

/** Leert ein Element. */
export function leer(element) {
  if (!element) return element;
  while (element.firstChild) element.removeChild(element.firstChild);
  return element;
}

function anhaengen(element, kinder) {
  const liste = Array.isArray(kinder) ? kinder : [kinder];
  for (const kind of liste) {
    if (kind === null || kind === undefined || kind === false) continue;
    if (Array.isArray(kind)) {
      anhaengen(element, kind);
      continue;
    }
    element.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  }
}

// --------------------------------------------------------------- Hilfsmittel

// Ein Fach ohne Eintrag wird zum Fach "offen" (DESIGN 2.2, letzte Zeile).
// Name, Kürzel und Symbol stehen dort, hier wird nichts erfunden.
const FACH_OFFEN = { id: 'offen', name: 'Fach offen', kurz: '?', farbe: 'offen', symbol: 'fragezeichen' };

function alsFach(fach) {
  if (!fach || typeof fach !== 'object') return FACH_OFFEN;
  return {
    id: fach.id || 'offen',
    name: fach.name || FACH_OFFEN.name,
    kurz: fach.kurz || FACH_OFFEN.kurz,
    farbe: fach.farbe || fach.id || 'offen',
    symbol: fach.symbol || FACH_OFFEN.symbol
  };
}

// Datum als Date, egal ob 'YYYY-MM-DD' oder Date hereinkommt.
// Nie new Date('YYYY-MM-DD'), das wäre UTC (ARCHITEKTUR 1.7).
function alsDatum(wert) {
  if (wert instanceof Date) return wert;
  if (typeof wert === 'string' && wert) return parseISODate(wert);
  return null;
}

function fachAusListe(schule, fachId) {
  const liste = schule && Array.isArray(schule.faecher) ? schule.faecher : [];
  return liste.find((eintrag) => eintrag.id === fachId) || null;
}

// --------------------------------------------------------------- fachBadge

/**
 * Kürzel und Symbol in der Fachfarbe.
 * Eine Fachfarbe steht nie allein: Symbol und Kürzel sind immer dabei,
 * damit Rot-Grün-Schwäche und Graustufen nichts kosten (DESIGN 2.2).
 *
 * @param {object} fach   Eintrag aus schule.faecher
 * @param {object} [optionen]  { groesse: 's' | 'm' | 'l' }
 */
export function fachBadge(fach, optionen = {}) {
  const { groesse = 'm' } = optionen;
  const f = alsFach(fach);
  const klassen = ['fach-badge', 'fach-badge--' + groesse];
  if (f.farbe === 'fvu') klassen.push('fach-badge--fvu');

  const symbolgroesse = groesse === 'l' ? 28 : groesse === 's' ? 16 : 20;

  return el('span', {
    class: klassen.join(' '),
    dataset: { fach: f.farbe },
    'aria-label': f.name
  }, [
    icon(f.symbol, { groesse: symbolgroesse }),
    el('span', { class: 'fach-badge-kuerzel', text: f.kurz, 'aria-hidden': 'true' })
  ]);
}

// --------------------------------------------------------------- karte

/**
 * Grundkarte.
 * @param {object} optionen
 *   titel    Überschrift der Karte
 *   unter    kleine Zeile darunter
 *   fach     Eintrag aus schule.faecher (optional)
 *   zustand  'normal' | 'laeuft' | 'vorbei' | 'kommt' | 'heute'
 *   onTap    Funktion, macht die Karte tippbar
 *   kinder   weitere Elemente im Inhaltsteil
 *   etiketten  Elemente rechts im Kopf (z. B. etikett('HEUTE'))
 */
export function karte(optionen = {}) {
  const { titel, unter, fach = null, zustand = 'normal', onTap = null, kinder = [], etiketten = [] } = optionen;
  const f = fach ? alsFach(fach) : null;

  const klassen = ['karte'];
  if (zustand && zustand !== 'normal') klassen.push('karte--' + zustand);
  if (onTap) klassen.push('karte--tappbar');

  const titelInhalt = onTap
    ? el('button', { type: 'button', class: 'karte-knopf', text: titel, onclick: onTap })
    : titel;

  const kopf = el('div', { class: 'karte-kopf' }, [
    el('div', { class: 'karte-titelblock' }, [
      titel ? el('h3', { class: 'karte-titel' }, [titelInhalt]) : null,
      unter ? el('p', { class: 'karte-unter', text: unter }) : null
    ]),
    el('div', { class: 'karte-marken' }, [
      f ? fachBadge(f, { groesse: 's' }) : null,
      etiketten
    ])
  ]);

  const element = el('article', {
    class: klassen.join(' '),
    dataset: f ? { fach: f.farbe } : null
  }, [
    kopf,
    el('div', { class: 'karte-inhalt' }, kinder)
  ]);

  // Tippen auf die ganze Karte ist bequem, der Knopf im Titel macht sie mit
  // Tastatur und VoiceOver erreichbar. Knöpfe und Links innen behalten Vorrang.
  if (onTap) {
    element.addEventListener('click', (ereignis) => {
      if (ereignis.target.closest('button, a, input, select, textarea')) return;
      onTap(ereignis);
    });
  }

  return element;
}

// --------------------------------------------------------------- tagKarte

/**
 * Ein Tag im Wochenraster.
 * @param {object} optionen
 *   datum        Date oder 'YYYY-MM-DD'
 *   termine      Liste von Elementen oder Termin-Objekten
 *   istHeute     markiert den Tag in Gold
 *   sonderwoche  { titel } aus jg.sonderwochen, optional
 *   schule       nötig, wenn termine Objekte sind
 */
export function tagKarte(optionen = {}) {
  const { datum, termine = [], istHeute = false, sonderwoche = null, schule = null } = optionen;
  const tag = alsDatum(datum);

  const klassen = ['tag-karte'];
  if (istHeute) klassen.push('tag-karte--heute');
  if (termine.length === 0) klassen.push('tag-karte--leer');

  const eintraege = termine.map((eintrag) => el('li', {}, [
    eintrag instanceof Node ? eintrag : terminZeile(eintrag, schule)
  ]));

  return el('article', {
    class: klassen.join(' '),
    'aria-label': tag ? formatDatum(tag, 'lang') : undefined
  }, [
    el('div', { class: 'tag-karte-kopf' }, [
      el('span', { class: 'tag-karte-tag', text: tag ? formatDatum(tag, 'tagLang') : '' }),
      el('span', { class: 'tag-karte-datum', text: tag ? formatDatum(tag, 'kurz') : '' })
    ]),
    istHeute ? etikett('Heute', 'heute') : null,
    sonderwoche && sonderwoche.titel ? el('p', { class: 'tag-karte-datum', text: sonderwoche.titel }) : null,
    el('ul', { class: 'tag-karte-liste' }, eintraege.length > 0
      ? eintraege
      : [el('li', { text: 'Kein Termin' })])
  ]);
}

// --------------------------------------------------------------- terminZeile

const TERMIN_WORT = {
  input: 'Input',
  coaching: 'Coaching',
  sonstiges: 'Termin',
  entfall: 'Fällt aus'
};

/**
 * Eine Zeile für Input, Coaching, Sonstiges oder Entfall.
 * @param {object} termin  Eintrag aus jg.termine oder aus dem Coaching-Muster
 * @param {object} schule  data/schule.json (für Fachname und Kürzel)
 */
export function terminZeile(termin, schule = null) {
  const daten = termin || {};
  const art = daten.art || 'sonstiges';
  const fach = daten.fach ? fachAusListe(schule, daten.fach) : null;

  // Titel: Art und Fach ("Input Biologie", DESIGN 11), dahinter der eigene
  // Titel des Termins, wenn es einen gibt ("Input Biologie: Sektion eines
  // Fisches", AP-11, Tageskarte). model.termineAm setzt titel aus dem Input
  // oder aus dem Freitext, bei Coachings bleibt es leer.
  const wort = TERMIN_WORT[art] || TERMIN_WORT.sonstiges;
  const grund = fach ? wort + ' ' + alsFach(fach).name : wort;
  const eigen = daten.titel || daten.text || '';
  const titel = !eigen || eigen === grund ? grund : grund + ': ' + eigen;

  return el('div', { class: 'termin-zeile' + (art === 'entfall' ? ' termin-zeile--entfall' : '') }, [
    fach ? fachBadge(fach, { groesse: 's' }) : null,
    el('span', { class: 'termin-titel', text: titel }),
    daten.kuerzel ? el('span', { class: 'termin-kuerzel', text: daten.kuerzel }) : null,
    daten.klasse ? el('span', { class: 'termin-klasse', text: 'nur Klasse ' + daten.klasse }) : null,
    daten.station ? el('span', { class: 'termin-station', text: 'Station ' + daten.station }) : null,
    daten.pflicht ? etikett('Pflicht', 'pflicht') : null
  ]);
}

// --------------------------------------------------------------- countdown

/**
 * "Noch 8 Schultage bis zur Abgabe".
 * @param {object} optionen
 *   bis        Date oder 'YYYY-MM-DD' (nur für die Datumsangabe)
 *   label      Text nach der Zahl, z. B. 'bis zur Abgabe'
 *   schultage  Anzahl Schultage, aus dates.schultageBis()
 */
export function countdown(optionen = {}) {
  const { bis = null, label = '', schultage = 0 } = optionen;
  const tage = Number(schultage) || 0;
  const zielDatum = alsDatum(bis);

  const text = tage <= 0
    ? 'Heute'
    : tage === 1 ? 'Noch 1 Schultag' : 'Noch ' + tage + ' Schultage';

  return el('p', { class: 'countdown' + (tage <= 0 ? ' countdown--heute' : '') }, [
    icon('uhr', { groesse: 20 }),
    el('span', { class: 'countdown-zahl', text: text }),
    label ? el('span', { text: label }) : null,
    zielDatum ? el('span', { class: 'nur-vorlesen', text: 'am ' + formatDatum(zielDatum, 'lang') }) : null
  ]);
}

// --------------------------------------------------------------- fortschritt

/**
 * Dünner Balken: wie viel Zeit im Slot vergangen ist.
 * Kein Leistungsbalken (DESIGN 7).
 */
export function fortschritt(optionen = {}) {
  const von = alsDatum(optionen.von);
  const bis = alsDatum(optionen.bis);
  const jetzt = alsDatum(optionen.heute);
  if (!von || !bis || !jetzt) return el('div', { class: 'fortschritt' });

  const gesamt = Math.max(1, diffDays(von, bis));
  const vergangen = Math.min(gesamt, Math.max(0, diffDays(von, jetzt)));
  const anteil = Math.round((vergangen / gesamt) * 100);

  const text = 'Tag ' + (vergangen + 1) + ' von ' + (gesamt + 1)
    + ' (' + formatDatum(von, 'kurz') + ' bis ' + formatDatum(bis, 'kurz') + ')';

  const teil = el('div', { class: 'fortschritt-teil' });
  teil.style.width = anteil + '%';

  return el('div', { class: 'fortschritt' }, [
    el('div', { class: 'fortschritt-bahn', role: 'img', 'aria-label': text }, [teil]),
    el('p', { class: 'fortschritt-text', text: text })
  ]);
}

// --------------------------------------------------------------- stationenTabelle

/** Sterne für das Niveau, dazu immer der Text (DESIGN 7). */
function niveauFeld(niveau) {
  const stufe = Number(niveau);
  if (!Number.isFinite(stufe) || stufe < 1) return el('span', { text: '' });
  const sterne = [];
  for (let n = 1; n <= 3; n++) sterne.push(icon(n <= stufe ? 'stern' : 'stern-leer', { groesse: 16 }));
  return el('span', {}, [
    el('span', { class: 'niveau', 'aria-hidden': 'true' }, sterne),
    el('span', { class: 'nur-vorlesen', text: 'Niveau ' + stufe + ' von 3' })
  ]);
}

/** Pflicht oder Wahl: gefüllter Punkt plus Wort, nie nur Farbe (DESIGN 7). */
function artFeld(art) {
  const istPflicht = art === 'pflicht';
  return el('span', { class: 'art art--' + (istPflicht ? 'pflicht' : 'wahl') }, [
    el('span', { class: 'art-punkt', 'aria-hidden': 'true' }),
    el('span', { text: istPflicht ? 'Pflicht' : 'Wahl' })
  ]);
}

/**
 * Tabelle der Stationen eines Bausteins.
 * @param {Array} stationen  Liste aus jg.bausteine[].stationen
 */
export function stationenTabelle(stationen = []) {
  const zeilen = (Array.isArray(stationen) ? stationen : []).map((station) => el('tr', {}, [
    el('td', { class: 'spalte-nr', text: String(station.nr ?? '') }),
    el('td', { text: station.titel || '' }),
    el('td', {}, [artFeld(station.art)]),
    el('td', { class: 'spalte-zeit', text: station.minuten ? station.minuten + ' min' : '' }),
    el('td', {}, [niveauFeld(station.niveau)]),
    el('td', { text: station.material || '' })
  ]));

  return el('table', { class: 'stationen' }, [
    el('caption', { text: 'Stationen' }),
    el('thead', {}, [
      el('tr', {}, [
        el('th', { scope: 'col', class: 'spalte-nr', text: 'Nr.' }),
        el('th', { scope: 'col', text: 'Titel' }),
        el('th', { scope: 'col', text: 'Pflicht oder Wahl' }),
        el('th', { scope: 'col', class: 'spalte-zeit', text: 'Zeit' }),
        el('th', { scope: 'col', text: 'Niveau' }),
        el('th', { scope: 'col', text: 'Material' })
      ])
    ]),
    el('tbody', {}, zeilen)
  ]);
}

// --------------------------------------------------------------- leer

/**
 * Leerzustand.
 * @param {object} optionen  { text, motiv: 'zahnrad' | 'gluehbirne' | 'keins' }
 */
export function leerZustand(optionen = {}) {
  const { text = '', motiv = 'keins' } = optionen;
  const motivIcon = motiv === 'zahnrad' || motiv === 'gluehbirne'
    ? icon(motiv, { groesse: 72, klasse: 'leer-motiv' })
    : null;
  return el('div', { class: 'leer' }, [
    motivIcon,
    el('p', { text })
  ]);
}

// --------------------------------------------------------------- hinweis

const HINWEIS_ICON = { info: 'info', warnung: 'warnung', erfolg: 'haken' };
const HINWEIS_WORT = { info: 'Hinweis', warnung: 'Achtung', erfolg: 'Geschafft' };

/**
 * Hinweisfeld.
 * @param {object} optionen  { art: 'info'|'warnung'|'erfolg', text, aktion }
 *   aktion: { text, onTap }
 */
export function hinweis(optionen = {}) {
  const { art = 'info', text = '', aktion = null } = optionen;
  const gueltig = HINWEIS_ICON[art] ? art : 'info';

  return el('div', { class: 'hinweis-feld hinweis-feld--' + gueltig, role: gueltig === 'warnung' ? 'alert' : null }, [
    icon(HINWEIS_ICON[gueltig], { label: HINWEIS_WORT[gueltig] }),
    el('div', {}, [
      el('p', { text }),
      aktion ? knopf({ text: aktion.text, art: 'text', onTap: aktion.onTap }) : null
    ])
  ]);
}

// --------------------------------------------------------------- leiste

/**
 * Leiste oben, z. B. für ein bereitstehendes Update.
 * @param {object} optionen  { text, aktion: { text, onTap }, art }
 */
export function leiste(optionen = {}) {
  const { text = '', aktion = null, art = 'info' } = optionen;
  return el('div', { class: 'leiste' + (art === 'warnung' ? ' leiste--warnung' : ''), role: 'status' }, [
    el('p', { text }),
    aktion ? knopf({ text: aktion.text, art: 'haupt', onTap: aktion.onTap }) : null
  ]);
}

// --------------------------------------------------------------- knopf

/**
 * Knopf.
 * @param {object} optionen  { text, icon: Name, art: 'haupt'|'neben'|'text', onTap }
 */
export function knopf(optionen = {}) {
  const { text = '', icon: iconName = null, art = 'neben', onTap = null, deaktiviert = false } = optionen;
  return el('button', {
    type: 'button',
    class: 'knopf knopf--' + art,
    disabled: deaktiviert || null,
    onclick: onTap || null
  }, [
    iconName ? icon(iconName, { groesse: 20 }) : null,
    el('span', { text })
  ]);
}

// --------------------------------------------------------------- segment

/**
 * Umschalter, z. B. "Zeitleiste" und "Nach Fach".
 * @param {Array} optionen    [{ id, text }] oder Zeichenketten
 * @param {string} aktiv      id der aktiven Option
 * @param {Function} onWechsel  bekommt die id
 */
export function segment(optionen = [], aktiv = null, onWechsel = null) {
  const liste = optionen.map((eintrag) => (
    typeof eintrag === 'string' ? { id: eintrag, text: eintrag } : eintrag
  ));

  return el('div', { class: 'segment', role: 'group' }, liste.map((eintrag) => el('button', {
    type: 'button',
    class: 'segment-knopf',
    'aria-pressed': String(eintrag.id === aktiv),
    onclick: () => { if (onWechsel) onWechsel(eintrag.id); }
  }, [el('span', { text: eintrag.text })])));
}

// --------------------------------------------------------------- etikett

/**
 * Kleines Etikett: "HEUTE", "PFLICHT", "VORLÄUFIG".
 * Die Versalien macht CSS, damit Vorlesehilfen den Text normal lesen.
 */
export function etikett(text, art = 'neutral') {
  return el('span', { class: 'etikett etikett--' + art, text });
}

// --------------------------------------------------------------- statusPunkt

/**
 * Anzeige oben rechts: offline, Update wartet, sonst die Version.
 * @param {object|string} status  { art, text } oder 'offline' | 'update' | Version
 */
export function statusPunkt(status) {
  const daten = typeof status === 'string' ? deuteStatus(status) : (status || { art: 'version', text: '' });
  return el('p', { class: 'status-punkt status-punkt--' + daten.art }, [
    el('span', { class: 'status-punkt-kreis', 'aria-hidden': 'true' }),
    el('span', { text: daten.text })
  ]);
}

function deuteStatus(wert) {
  if (wert === 'offline') return { art: 'offline', text: 'Offline' };
  if (wert === 'update') return { art: 'update', text: 'Update bereit' };
  return { art: 'version', text: 'Version ' + wert };
}

// --------------------------------------------------------------- stufenBaum

// Der Baum steht seit AP-13 in einer eigenen Datei, weil er mit Auswahl,
// Tastatur und Schmuck deutlich groesser geworden ist. Er bleibt hier
// ausgeleitet, damit DESIGN 7 stimmt: alle Komponenten kommen aus
// ui/components.js.
export { stufenBaum, markiereEbene } from './stufenbaum.js';
