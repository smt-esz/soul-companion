// Modul "Diese Woche" (#/woche), die Startseite (AP-10, DESIGN 10,
// ARCHITEKTUR 3.1 bis 3.4).
//
// Reine Anzeige: jede Datumsfrage geht an model.js oder dates.js, hier wird
// kein Datum ausgerechnet (Akzeptanzkriterium 5). Die Reihenfolge der
// Abschnitte folgt DESIGN 10 und AP-10.md.

import { registerModule } from '../module.js';
import { terminAlsIcs, dateiname, ladeHerunter } from '../ics.js';
import { formatDatum, isWeekend, schultageBis, toISODate } from '../dates.js';
import * as model from '../model.js';
import * as update from '../update.js';
import {
  el, etikett, fachBadge, fortschritt, karte, knopf, leer, leerZustand,
  tagKarte, terminTitel, terminZeile
} from '../ui/components.js';
import { icon } from '../ui/icons.js';

registerModule({
  id: 'woche',
  titel: 'Diese Woche',
  icon: 'kalender',
  nav: { position: 10, sichtbar: true },
  routes: [
    { pattern: '#/woche', render: renderWoche }
  ]
});

// "offen" steht nicht in schule.faecher (DESIGN 2.2, letzte Zeile). Dieselbe
// Ersatzangabe verwendet schon die Musterseite (AP-04, modules/muster.js).
const FACH_OFFEN = { id: 'offen', name: 'Fach offen', kurz: '?', farbe: 'offen', symbol: 'fragezeichen' };

function renderWoche(container, params, ctx) {
  container.append(...[
    update.installKarte(),
    el('h1', { text: 'Diese Woche', tabindex: '-1' }),
    el('div', { class: 'woche-zweispaltig' }, [
      el('div', { class: 'woche-spalte' }, [
        el('h2', { text: 'Deine Termine' }),
        tagWaehler(ctx),
        verweisAbschnitt(ctx),
        ferienZeile(ctx)
      ]),
      el('div', { class: 'woche-spalte' }, [laeuftAbschnitt(ctx), naechstesAbschnitt(ctx, { eingeklappt: true })])
    ])
  ].filter(Boolean));
}

// Ab so vielen Schultagen vor der Abgabe gilt der Baustein als "letzte Woche".
const LETZTE_WOCHE_TAGE = 5;

// SOUL-Zeiten für die Kalenderdatei (Leo, 06.10.2026): Dienstag 10:00 bis 11:20,
// sonst 08:00 bis 09:30.
function soulZeit(datum) {
  return datum.getDay() === 2 ? { von: '10:00', bis: '11:20' } : { von: '08:00', bis: '09:30' };
}

// ------------------------------------------------------------ Bausteine

/** Eine Zeile: "Noch 12 Schultage bis zu den Herbstferien" (statt eigener Karte). */
function ferienZeile(ctx) {
  const { schule, heute } = ctx;
  const ferien = model.naechsteFerien(schule, heute);
  if (!ferien) return null;
  const tage = ferien.schultageBis;
  const text = ferien.laeuft
    ? 'Gerade sind ' + ferien.name + ', bis ' + formatDatum(ferien.bis, 'datum') + '.'
    : 'Noch ' + (tage === 1 ? '1 Schultag' : tage + ' Schultage') + ' bis zu den ' + ferien.name + '.';
  return el('p', { class: 'woche-ferienzeile' }, [icon('kalender', { groesse: 18 }), el('span', { text })]);
}

/** Wochenstreifen (fünf Tage) mit einem Tagesblock darunter, der den gewählten Tag zeigt. */
function tagWaehler(ctx) {
  const { jg, schule, heute } = ctx;
  const tage = model.wocheTermine(jg, schule, heute);
  const heuteISO = toISODate(heute);
  const block = el('section', { class: 'woche-tagblock', 'aria-live': 'polite' });
  const knoepfe = [];

  const waehle = (tag) => {
    const istHeute = toISODate(tag.datum) === heuteISO;
    knoepfe.forEach((eintrag) => eintrag.knopf.setAttribute('aria-pressed', eintrag.tag === tag ? 'true' : 'false'));
    leer(block);
    block.append(...tagBlockInhalt(ctx, tag, istHeute).filter(Boolean));
  };

  const streifen = el('div', { class: 'woche-streifen', role: 'group', 'aria-label': 'Tage dieser Woche' },
    tage.map((tag) => {
      const istHeute = toISODate(tag.datum) === heuteISO;
      const faecher = [...new Set(tag.termine.map((t) => t.fach).filter(Boolean))].slice(0, 3);
      const knopf = el('button', {
        type: 'button',
        class: 'woche-streifen-tag' + (istHeute ? ' woche-streifen-tag--heute' : ''),
        'aria-pressed': 'false',
        'aria-label': formatDatum(tag.datum, 'lang') + (tag.termine.length ? ', ' + tag.termine.length + ' Termine' : ', kein Termin'),
        onclick: () => waehle(tag)
      }, [
        el('span', { class: 'woche-streifen-name', text: formatDatum(tag.datum, 'tagLang').slice(0, 2) }),
        el('span', { class: 'woche-streifen-datum', text: formatDatum(tag.datum, 'kurz') }),
        el('span', { class: 'woche-streifen-punkte', 'aria-hidden': 'true' },
          tag.termine.length === 0
            ? [el('span', { class: 'woche-streifen-leer', text: '–' })]
            : (faecher.length ? faecher : [null]).map((fachId) => el('span', {
              class: 'woche-punkt',
              dataset: { fach: fachId ? fachVon(schule, fachId).farbe : 'offen' }
            })))
      ]);
      knoepfe.push({ knopf, tag });
      return knopf;
    }));

  const start = tage.find((tag) => toISODate(tag.datum) === heuteISO) || tage[0];
  waehle(start);
  return el('div', { class: 'woche-tagwaehler' }, [streifen, block]);
}

function tagBlockInhalt(ctx, tag, istHeute) {
  const { jg, schule } = ctx;
  const titel = (istHeute ? 'Heute, ' : '') + formatDatum(tag.datum, 'lang');
  const kopf = el('div', { class: 'woche-tagblock-kopf' }, [
    el('h2', { text: titel })
  ]);
  if (tag.termine.length === 0) {
    return [kopf, leerZustand({ text: tagLeerText(tag), motiv: 'keins' }), coachingHinweisFuer(jg, tag.datum, istHeute)];
  }
  return [
    kopf,
    el('div', {}, tag.termine.map((termin) => terminMitKalender(termin, tag.datum, schule, jg.jgst))),
    coachingHinweisFuer(jg, tag.datum, istHeute, tag.termine)
  ];
}

function coachingHinweisFuer(jg, datum, istHeute, termine = []) {
  if (!istHeute) return null;
  const iso = toISODate(datum);
  const ohneMuster = !(jg.coachings || []).some((c) =>
    (!c.gueltigAb || c.gueltigAb <= iso) && (!c.gueltigBis || iso <= c.gueltigBis));
  if (!ohneMuster || termine.some((termin) => termin.art === 'coaching')) return null;
  return el('p', { class: 'text-klein text-neben', text: 'Wann dein Coaching ist, erfährst du von deiner Lernbegleitung.' });
}

/** Terminzeile mit Knopf "In Kalender" (Inputs und Coachings, nicht bei Entfall). */
function terminMitKalender(termin, datum, schule, jgst) {
  const zeile = terminZeile(termin, schule, jgst);
  if (termin.art !== 'input' && termin.art !== 'coaching') return zeile;
  const titel = terminTitel(termin, schule) + (termin.kuerzel ? ' (' + termin.kuerzel + ')' : '');
  const iso = toISODate(datum);
  const kalender = el('button', {
    type: 'button',
    class: 'knopf knopf--text woche-kalender',
    'aria-label': titel + ' am ' + formatDatum(datum, 'lang') + ' in den Kalender eintragen',
    onclick: () => ladeHerunter(terminAlsIcs({
      datum: iso,
      titel,
      kennung: iso + '-' + termin.art + '-' + (termin.fach || termin.kuerzel || 'x'),
      zeit: soulZeit(datum),
      beschreibung: 'Findet innerhalb der SOUL-Zeit statt. Die genaue Uhrzeit nennt deine Lernbegleitung.'
    }), dateiname(titel, iso))
  }, [icon('kalender', { groesse: 18 }), el('span', { text: 'In Kalender' })]);
  return el('div', { class: 'termin-mit-kalender' }, [zeile, kalender]);
}

function tagLeerText(tag) {
  if (tag.sonderwoche && tag.sonderwoche.titel) return tag.sonderwoche.titel + '.';
  if (tag.ferien && tag.ferien.name) return tag.ferien.name + '.';
  if (isWeekend(tag.datum)) return 'Wochenende, kein SOUL-Tag.';
  return 'Kein Termin an diesem Tag.';
}

// ------------------------------------------------------------------ Läuft gerade

function laeuftAbschnitt(ctx) {
  const { jg, heute } = ctx;
  const slots = model.slotsAm(jg, heute);

  if (slots.length === 0) {
    return abschnitt('Läuft gerade', [
      leerZustand({ text: 'Gerade läuft für dich kein Baustein.', motiv: 'zahnrad' })
    ]);
  }

  return abschnitt('Läuft gerade', [el('div', { class: 'fach-kacheln' }, slots.map((slot) => laufKachel(ctx, slot)))]);
}

/**
 * Eine Kachel je laufendem Baustein, im Stil der Fachkacheln: Fach, Baustein
 * (kursiv), Abgabe mit Strich, verbleibende Schultage und ein Zeitbalken.
 * In den letzten 5 Schultagen vor der Abgabe wird der Zeitbalken
 * durch eine Leiste ersetzt. Tippen führt zum Baustein.
 */
function laufKachel(ctx, slot) {
  const { jg, schule, heute, navigate } = ctx;
  const fach = fachVon(schule, slot.fach);
  const baustein = bausteinVon(jg, slot.baustein);
  const titel = (baustein && baustein.titel) || 'Thema folgt';
  const tage = schultageBis(heute, slot.abgabe, schule);
  // DESIGN 2.2: Status vorlaeufig bekommt Hinweis.
  const vorlaeufig = slot.status === 'vorlaeufig';
  const bald = tage <= LETZTE_WOCHE_TAGE;
  const tageText = tage <= 0 ? 'Abgabe heute'
    : tage === 1 ? 'Noch 1 Schultag' : 'Noch ' + tage + ' Schultage';

  const zeilen = [
    { art: 'kopf', text: bald ? (vorlaeufig ? 'Letzte Woche, vorläufig' : 'Letzte Woche') : (vorlaeufig ? 'Läuft, vorläufig' : 'Läuft') },
    { art: 'baustein', text: titel },
    { art: 'datum', text: 'Abgabe ' + formatDatum(slot.abgabe, 'datum') }
  ];
  if (vorlaeufig && slot.hinweis) zeilen.push({ art: 'text', text: slot.hinweis });

  // Unten steht immer ein Zeitfeld gleicher Höhe: Läuft der Baustein noch,
  // zeigt es "Noch N Schultage" mit Zeitbalken. In den letzten 5 Schultagen
  // vor der Abgabe ersetzt eine Leiste beides (nichts steht doppelt), und die
  // Kacheln nebeneinander bleiben auch dann ruhig, wenn nur einige Bausteine
  // schon in der letzten Woche sind.
  const zeitfeld = bald
    ? [el('span', { class: 'bald-leiste' }, [
      icon('uhr', { groesse: 16 }),
      el('span', { class: 'bald-leiste-text', text: tage <= 0 ? 'Heute abgeben' : 'Noch ' + tage + (tage === 1 ? ' Tag' : ' Tage') })
    ])]
    : [
      el('span', { class: 'fach-kachel-stand-text', text: tageText }),
      fortschritt({ von: slot.von, bis: slot.bis, heute })
    ];

  return el(slot.baustein ? 'button' : 'div', {
    type: slot.baustein ? 'button' : null,
    class: 'fach-kachel fach-kachel--lauft' + (bald ? ' fach-kachel--bald' : ''),
    dataset: { fach: fach.farbe },
    onclick: slot.baustein ? () => navigate('#/baustein/' + slot.baustein) : null
  }, [
    fachBadge(fach, { groesse: 'l' }),
    el('span', { class: 'fach-kachel-text' }, [
      el('span', { class: 'fach-kachel-name', text: fach.name }),
      el('span', { class: 'fach-kachel-stand' }, zeilen.map(
        (zeile) => el('span', { class: 'fach-kachel-stand-' + zeile.art, text: zeile.text })
      )),
      el('span', { class: 'kachel-zeit' }, zeitfeld)
    ])
  ]);
}

// ------------------------------------------------------------------ Als Nächstes

// DESIGN 10, Punkt 5.
function naechstesAbschnitt(ctx, optionen = {}) {
  const { jg, schule, heute, navigate } = ctx;
  const treffer = model.naechsterSlotJeFach(jg, heute);
  const eintraege = Object.entries(treffer)
    .filter(([, slot]) => slot)
    .sort((a, b) => toISODate(a[1].von).localeCompare(toISODate(b[1].von)));

  if (eintraege.length === 0) {
    return abschnitt('Als Nächstes', [
      leerZustand({ text: 'Für dich ist gerade kein neuer Baustein geplant.', motiv: 'keins' })
    ]);
  }

  // Eine Zeile je Fach: Badge, Baustein (kursiv), Beginn rechts. Tippen fuehrt
  // zum Fach.
  const liste = eintraege.map(([fachId, slot]) => {
    const fach = fachVon(schule, fachId);
    const baustein = bausteinVon(jg, slot.baustein);
    const titel = (baustein && baustein.titel) || 'Thema folgt';
    return el('button', {
      type: 'button',
      class: 'woche-zeile',
      'aria-label': fach.name + ': ' + titel + ', ab ' + tagUndMonat(slot.von),
      onclick: () => navigate('#/fach/' + fachId)
    }, [
      fachBadge(fach, { groesse: 's' }),
      el('span', { class: 'woche-zeile-titel', text: titel }),
      el('span', { class: 'woche-zeile-datum', text: 'ab ' + tagUndMonat(slot.von) })
    ]);
  });

  if (optionen.eingeklappt) {
    return el('details', { class: 'woche-naechstes' }, [
      el('summary', {}, [el('h2', { text: 'Als Nächstes' }), el('span', { class: 'woche-naechstes-zahl', text: eintraege.length + ' Bausteine' })]),
      el('div', { class: 'woche-liste' }, liste)
    ]);
  }
  return abschnitt('Als Nächstes', [el('div', { class: 'woche-liste' }, liste)]);
}

// ------------------------------------------------------------------ Verweis

// DESIGN 10, Punkt 7. Ohne Rasterzeitraum für heute nur der Jahresüberblick,
// sonst bliebe der Link ins Leere führen (Akzeptanzkriterium 2).
function verweisAbschnitt(ctx) {
  const { jg, heute, navigate } = ctx;
  const raster = model.rasterAm(jg, heute);
  const ziel = raster ? '#/plan' : '#/plan/jahr';
  const text = raster ? 'Ganzes Wochenraster' : 'Zum Jahresüberblick';
  return el('p', {}, [knopf({ text, icon: 'plan', art: 'neben', onTap: () => navigate(ziel) })]);
}

// ------------------------------------------------------------------ Hilfsmittel

function abschnitt(titelText, kinder) {
  return el('section', { style: { marginBottom: 'var(--s-6)' } }, [
    el('h2', { text: titelText }),
    ...kinder
  ]);
}

function fachVon(schule, fachId) {
  if (!fachId || fachId === 'offen') return FACH_OFFEN;
  const liste = schule && Array.isArray(schule.faecher) ? schule.faecher : [];
  return liste.find((eintrag) => eintrag && eintrag.id === fachId) || FACH_OFFEN;
}

function bausteinVon(jg, bausteinId) {
  const liste = jg && Array.isArray(jg.bausteine) ? jg.bausteine : [];
  return liste.find((eintrag) => eintrag && eintrag.id === bausteinId) || null;
}

// "Montag, 31. August 2026" -> "31. August" (DESIGN 10, Beispiel
// "ab 11. Januar").
function tagUndMonat(datum) {
  const lang = formatDatum(datum, 'lang');
  const nachKomma = lang.includes(', ') ? lang.split(', ')[1] : lang;
  const teile = nachKomma.split(' ');
  teile.pop();
  return teile.join(' ');
}
