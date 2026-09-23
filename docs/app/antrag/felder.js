// Felder je Schritt-Typ des Antrags (AP-14).
//
// Ein Renderer je Typ: freitext, personen, kriterien, erklaerung.
// `nurPdf` wird nicht gerendert, der Abschnitt entsteht erst im PDF (AP-15).
// Ein unbekannter Typ gibt einen Hinweis zurück, keinen Fehler: eine ältere
// App-Version soll an einer neueren Konfiguration nicht abstürzen
// (DATENMODELL 5).
//
// Die Felder schreiben nichts selbst. Jede Eingabe geht als kleiner Patch an
// `onAendern`, das Speichern und Entprellen macht das Modul.

import { formatDatum, parseISODate } from '../dates.js';
import { el, hinweis, knopf } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { automatischeAussagen, UNBEKANNTER_TYP } from './engine.js';
import { Unterschrift } from './signature.js';

let zaehler = 0;

function neueId(teil) {
  zaehler += 1;
  return 'antrag-' + teil + '-' + zaehler;
}

/**
 * Bearbeitbare Felder eines Schritts.
 *
 * @param {object} optionen
 *   schritt    Schritt-Definition aus der Konfiguration
 *   daten      antrag.schritte[schritt.id]
 *   antrag     ganzer Antrag (für die automatischen Aussagen)
 *   heuteISO   'YYYY-MM-DD' für die Datumsfelder neben den Unterschriften
 *   onAendern  (patch) => void
 *   person     bei typ personen: nur diese Person zeigen (0-basiert)
 * @returns {Element}
 */
export function schrittFelder(optionen = {}) {
  const { schritt, daten = {}, antrag = null, heuteISO = '', onAendern = null, person = null } = optionen;
  if (!schritt) return hinweis({ art: 'warnung', text: UNBEKANNTER_TYP });

  const melden = typeof onAendern === 'function' ? onAendern : () => {};

  if (schritt.typ === 'freitext') return freitextFeld(schritt, daten, melden);
  if (schritt.typ === 'personen') return personenFeld(schritt, daten, heuteISO, melden, person);
  if (schritt.typ === 'kriterien') return kriterienFeld(schritt, daten, heuteISO, melden);
  if (schritt.typ === 'erklaerung') return erklaerungFeld(schritt, daten, antrag, heuteISO, melden);
  return hinweis({ art: 'warnung', text: UNBEKANNTER_TYP });
}

/**
 * Ansicht eines abgeschlossenen Schritts: Inhalt und Unterschrift, nichts
 * änderbar (AP-14).
 * @returns {Element}
 */
export function schrittVorschau(optionen = {}) {
  const { schritt, daten = {}, antrag = null } = optionen;
  if (!schritt) return hinweis({ art: 'warnung', text: UNBEKANNTER_TYP });

  if (schritt.typ === 'freitext') {
    return el('div', { class: 'antrag-vorschau' }, [
      el('p', { class: 'antrag-vorschau-text', text: String(daten.text || '') })
    ]);
  }

  if (schritt.typ === 'personen') {
    const personen = Array.isArray(daten.personen) ? daten.personen : [];
    return el('div', { class: 'antrag-vorschau antrag-personen' }, personen.map((eintrag, i) => el('div', {
      class: 'antrag-person'
    }, [
      el('p', { class: 'antrag-person-kopf text-klein text-neben', text: 'Person ' + (i + 1) }),
      el('p', { text: (eintrag.name || '') + (eintrag.klasse ? ', Klasse ' + eintrag.klasse : '') }),
      unterschriftBild(eintrag.unterschrift, eintrag.datum)
    ])));
  }

  if (schritt.typ === 'kriterien') {
    const kriterien = Array.isArray(schritt.kriterien) ? schritt.kriterien : [];
    const gesetzt = Array.isArray(daten.kriterien) ? daten.kriterien : [];
    return el('div', { class: 'antrag-vorschau' }, [
      el('ul', { class: 'antrag-haken-liste' }, kriterien.map((text, i) => hakenZeile(text, gesetzt[i] === true))),
      hakenZeile(schritt.bestaetigung || '', daten.empfohlen === true, 'antrag-bestaetigung'),
      el('p', { class: 'text-klein text-neben', text: 'Kürzel: ' + (daten.kuerzel || '') }),
      unterschriftBild(daten.unterschrift, daten.datum)
    ]);
  }

  if (schritt.typ === 'erklaerung') {
    const aussagen = Array.isArray(schritt.aussagen) ? schritt.aussagen : [];
    const gesetzt = Array.isArray(daten.aussagen) ? daten.aussagen : [];
    return el('div', { class: 'antrag-vorschau' }, [
      el('ul', { class: 'antrag-haken-liste' },
        automatischeAussagen(antrag, schritt).map((eintrag) => hakenZeile(eintrag.text, eintrag.erfuellt))),
      el('ul', { class: 'antrag-haken-liste' }, aussagen.map((text, i) => hakenZeile(text, gesetzt[i] === true))),
      unterschriftBild(daten.unterschrift, daten.datum)
    ]);
  }

  return hinweis({ art: 'warnung', text: UNBEKANNTER_TYP });
}

// ----------------------------------------------------------------- freitext

function freitextFeld(schritt, daten, melden) {
  const id = neueId('freitext');
  const min = Number(schritt.minZeichen) || 0;
  const zaehlZeile = el('p', { class: 'antrag-zaehler text-klein text-neben' });

  const feld = el('textarea', {
    id,
    class: 'antrag-textfeld',
    rows: '6',
    'aria-describedby': min > 0 ? id + '-zaehler' : null
  });
  feld.value = String(daten.text || '');
  feld.addEventListener('input', () => {
    zeigeZaehler(zaehlZeile, feld.value, min);
    melden({ text: feld.value });
  });

  zaehlZeile.id = id + '-zaehler';
  zeigeZaehler(zaehlZeile, feld.value, min);

  return el('div', { class: 'antrag-feld' }, [
    schritt.frage ? el('label', { class: 'antrag-frage', for: id, text: schritt.frage }) : null,
    feld,
    min > 0 ? zaehlZeile : null
  ]);
}

function zeigeZaehler(element, text, min) {
  if (min <= 0) return;
  const laenge = String(text || '').trim().length;
  element.textContent = laenge >= min
    ? laenge + ' Zeichen, das reicht.'
    : laenge + ' von ' + min + ' Zeichen.';
}

// ----------------------------------------------------------------- personen

function personenFeld(schritt, daten, heuteISO, melden, nurPerson) {
  const anzahl = Number(schritt.anzahl) || 0;
  const personen = Array.isArray(daten.personen) ? daten.personen.slice() : [];
  while (personen.length < anzahl) personen.push({ name: '', klasse: '', datum: '', unterschrift: '' });

  const aendern = (index, patch) => {
    const naechste = personen.map((eintrag, i) => (i === index ? Object.assign({}, eintrag, patch) : eintrag));
    personen.splice(0, personen.length, ...naechste);
    melden({ personen: naechste });
  };

  const indizes = [];
  for (let i = 0; i < anzahl; i++) {
    if (nurPerson === null || nurPerson === undefined || nurPerson === i) indizes.push(i);
  }

  return el('div', { class: 'antrag-feld antrag-personen' }, indizes.map((i) => {
    const eintrag = personen[i];
    const nameId = neueId('name');
    const klasseId = neueId('klasse');

    const nameFeld = textEingabe(nameId, eintrag.name, (wert) => aendern(i, { name: wert }));
    const klasseFeld = textEingabe(klasseId, eintrag.klasse, (wert) => aendern(i, { klasse: wert }), { maxlength: '4' });
    klasseFeld.classList.add('antrag-eingabe--kurz');

    return el('div', { class: 'antrag-person' }, [
      el('p', { class: 'antrag-person-kopf', text: 'Person ' + (i + 1) }),
      el('div', { class: 'antrag-zeile' }, [
        el('div', {}, [el('label', { for: nameId, text: 'Name' }), nameFeld]),
        el('div', {}, [el('label', { for: klasseId, text: 'Klasse' }), klasseFeld])
      ]),
      unterschriftFeld({
        beschriftung: 'Unterschrift von Person ' + (i + 1),
        wert: eintrag.unterschrift,
        datum: eintrag.datum,
        onSetzen: (png) => aendern(i, { unterschrift: png || '', datum: png ? heuteISO : '' })
      })
    ]);
  }));
}

// ----------------------------------------------------------------- kriterien

function kriterienFeld(schritt, daten, heuteISO, melden) {
  const kriterien = Array.isArray(schritt.kriterien) ? schritt.kriterien : [];
  const gesetzt = Array.isArray(daten.kriterien) ? daten.kriterien.slice() : new Array(kriterien.length).fill(false);
  while (gesetzt.length < kriterien.length) gesetzt.push(false);

  const kuerzelId = neueId('kuerzel');
  const kuerzelFeld = textEingabe(kuerzelId, daten.kuerzel, (wert) => melden({ kuerzel: wert }), { maxlength: '4' });
  kuerzelFeld.classList.add('antrag-eingabe--kurz');

  return el('div', { class: 'antrag-feld' }, [
    el('ul', { class: 'antrag-ankreuz-liste' }, kriterien.map((text, i) => el('li', {}, [
      ankreuzFeld(text, gesetzt[i] === true, (an) => {
        gesetzt[i] = an;
        melden({ kriterien: gesetzt.slice() });
      })
    ]))),
    el('div', { class: 'antrag-bestaetigung' }, [
      ankreuzFeld(schritt.bestaetigung || '', daten.empfohlen === true, (an) => melden({ empfohlen: an }))
    ]),
    el('div', {}, [
      el('label', { for: kuerzelId, text: 'Kürzel' }),
      kuerzelFeld
    ]),
    unterschriftFeld({
      beschriftung: 'Unterschrift der Lernbegleitung',
      wert: daten.unterschrift,
      datum: daten.datum,
      onSetzen: (png) => melden({ unterschrift: png || '', datum: png ? heuteISO : '' })
    })
  ]);
}

// ---------------------------------------------------------------- erklaerung

function erklaerungFeld(schritt, daten, antrag, heuteISO, melden) {
  const aussagen = Array.isArray(schritt.aussagen) ? schritt.aussagen : [];
  const gesetzt = Array.isArray(daten.aussagen) ? daten.aussagen.slice() : new Array(aussagen.length).fill(false);
  while (gesetzt.length < aussagen.length) gesetzt.push(false);

  const automatisch = automatischeAussagen(antrag, schritt);

  return el('div', { class: 'antrag-feld' }, [
    // Die beiden oberen Aussagen setzt die App selbst, sobald die Schritte
    // davor abgeschlossen sind (AP-14). Sie sind deshalb nicht antippbar.
    automatisch.length > 0
      ? el('ul', { class: 'antrag-haken-liste' }, automatisch.map((eintrag) => hakenZeile(eintrag.text, eintrag.erfuellt)))
      : null,
    el('ul', { class: 'antrag-ankreuz-liste' }, aussagen.map((text, i) => el('li', {}, [
      ankreuzFeld(text, gesetzt[i] === true, (an) => {
        gesetzt[i] = an;
        melden({ aussagen: gesetzt.slice() });
      })
    ]))),
    unterschriftFeld({
      beschriftung: 'Deine Unterschrift',
      wert: daten.unterschrift,
      datum: daten.datum,
      onSetzen: (png) => melden({ unterschrift: png || '', datum: png ? heuteISO : '' })
    })
  ]);
}

// ------------------------------------------------------------- Bausteine

function textEingabe(id, wert, onWert, attribute = {}) {
  const feld = el('input', Object.assign({ id, type: 'text', class: 'antrag-eingabe' }, attribute));
  feld.value = String(wert || '');
  feld.addEventListener('input', () => onWert(feld.value));
  return feld;
}

/** Kästchen mit Text. Die ganze Zeile ist antippbar (DESIGN 5, 48 px). */
function ankreuzFeld(text, an, onWechsel) {
  const id = neueId('haken');
  const kasten = el('input', { id, type: 'checkbox', class: 'antrag-kasten' });
  kasten.checked = an === true;
  kasten.addEventListener('change', () => onWechsel(kasten.checked));
  return el('label', { class: 'antrag-ankreuz', for: id }, [
    kasten,
    el('span', { text })
  ]);
}

/** Zeile mit Haken oder leerem Kästchen, nur zum Ansehen. */
function hakenZeile(text, erfuellt, klasse = null) {
  return el('li', { class: klasse ? 'antrag-haken ' + klasse : 'antrag-haken' }, [
    erfuellt
      ? icon('haken', { groesse: 20, label: 'erledigt' })
      : el('span', { class: 'antrag-haken-leer', 'aria-label': 'offen', role: 'img' }),
    el('span', { text })
  ]);
}

function unterschriftBild(png, datum) {
  if (!png) return el('p', { class: 'text-klein text-neben', text: 'Noch nicht unterschrieben.' });
  return el('figure', { class: 'antrag-unterschrift-bild' }, [
    el('img', { src: png, alt: 'Unterschrift', width: '300', height: '100' }),
    datum ? el('figcaption', { class: 'text-klein text-neben', text: datumLesbar(datum) }) : null
  ]);
}

/**
 * Unterschriftsfeld. Ist schon unterschrieben, steht das Bild da, dazu der
 * Knopf "Neu unterschreiben". Sonst kommt die Zeichenfläche.
 */
function unterschriftFeld({ beschriftung, wert, datum, onSetzen }) {
  const bereich = el('div', { class: 'antrag-unterschrift' });

  const zeigeBild = () => {
    bereich.replaceChildren(
      el('p', { class: 'antrag-unterschrift-titel text-klein text-neben', text: beschriftung }),
      unterschriftBild(wert, datum),
      knopf({
        text: 'Neu unterschreiben',
        icon: 'stift',
        art: 'neben',
        onTap: () => {
          wert = '';
          datum = '';
          onSetzen(null);
          zeigeFlaeche();
        }
      })
    );
  };

  const zeigeFlaeche = () => {
    bereich.replaceChildren();
    const rahmen = el('div', { class: 'antrag-unterschrift-rahmen' });
    const flaeche = new Unterschrift(rahmen, {
      onAenderung: (stift) => {
        wert = stift.alsPng() || '';
        onSetzen(wert || null);
      }
    });
    bereich.append(
      el('p', { class: 'antrag-unterschrift-titel text-klein text-neben', text: beschriftung }),
      rahmen,
      el('p', { class: 'antrag-unterschrift-hinweis text-klein text-neben', text: 'Hier unterschreiben' }),
      knopf({
        text: 'Löschen',
        icon: 'schliessen',
        art: 'text',
        onTap: () => {
          flaeche.loeschen();
          wert = '';
          onSetzen(null);
        }
      })
    );
  };

  if (wert) {
    zeigeBild();
  } else {
    zeigeFlaeche();
  }
  return bereich;
}

// 'YYYY-MM-DD' zu '27.10.2026', immer über dates.js (AP_ALLGEMEIN 5).
function datumLesbar(iso) {
  try {
    return formatDatum(parseISODate(String(iso)), 'datum');
  } catch (fehler) {
    return String(iso || '');
  }
}
