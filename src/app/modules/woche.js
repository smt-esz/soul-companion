// Modul "Diese Woche" (#/woche), die Startseite (AP-10, DESIGN 10,
// ARCHITEKTUR 3.1 bis 3.4).
//
// Reine Anzeige: jede Datumsfrage geht an model.js oder dates.js, hier wird
// kein Datum ausgerechnet (Akzeptanzkriterium 5). Die Reihenfolge der
// Abschnitte folgt DESIGN 10 und AP-10.md.

import { registerModule } from '../module.js';
import { formatDatum, isWeekend, schultageBis, toISODate } from '../dates.js';
import * as model from '../model.js';
import * as update from '../update.js';
import {
  el, etikett, fachBadge, fortschritt, karte, knopf, leer, leerZustand,
  tagKarte, terminZeile
} from '../ui/components.js';

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
  const kinder = [
    update.installKarte(),
    el('h1', { text: 'Diese Woche', tabindex: '-1' }),
    kopfAbschnitt(ctx),
    heuteAbschnitt(ctx),
    wocheAbschnitt(ctx),
    laeuftAbschnitt(ctx),
    naechstesAbschnitt(ctx),
    ferienAbschnitt(ctx),
    verweisAbschnitt(ctx)
  ].filter(Boolean);
  container.append(...kinder);
}

// ------------------------------------------------------------------ Kopf

// DESIGN 10, Punkt 1. Keine A/B-Woche (DATENMODELL 2, Leo 22.09.2026).
function kopfAbschnitt(ctx) {
  const { jg, schule, heute } = ctx;
  const info = model.wocheninfo(schule, jg, heute);

  const kinder = [el('p', { class: 'titel-gross', text: ohneJahr(heute) })];
  if (info.sonderwoche && info.sonderwoche.titel) {
    kinder.push(etikett(info.sonderwoche.titel, 'neutral'));
  } else if (info.ferien && info.ferien.name) {
    kinder.push(etikett(info.ferien.name, 'neutral'));
  }
  return el('div', { style: { marginBottom: 'var(--s-5)' } }, kinder);
}

// ------------------------------------------------------------------ Heute

// DESIGN 10, Punkt 2; AP-10.md, Abschnitt "Startseite", Punkt 2.
function heuteAbschnitt(ctx) {
  const { jg, schule, heute } = ctx;
  const info = model.wocheninfo(schule, jg, heute);
  const wochenende = isWeekend(heute);
  const abwesend = wochenende || Boolean(info.ferien) || Boolean(info.sonderwoche);

  if (abwesend) {
    const kinder = [el('p', { text: heuteAbwesendText(wochenende, info) })];
    const naechster = model.naechsterSoulTag(schule, jg, heute);
    if (naechster) {
      kinder.push(el('p', { text: 'Nächster SOUL-Tag: ' + ohneJahr(naechster) }));
    }
    return abschnitt('Heute', kinder);
  }

  const termine = model.termineAm(jg, schule, heute);
  // AP-10: Gilt heute kein Coaching-Muster, steht der Hinweis auf die
  // Lernbegleitung unter den Terminen, auch wenn der Tag sonst leer ist.
  const heuteISO = toISODate(heute);
  const ohneMuster = !(jg.coachings || []).some((c) =>
    (!c.gueltigAb || c.gueltigAb <= heuteISO) && (!c.gueltigBis || heuteISO <= c.gueltigBis));
  const coachingHinweis = () => el('p', {
    class: 'text-klein text-neben',
    text: 'Wann dein Coaching ist, erfährst du von deiner Lernbegleitung.'
  });

  if (termine.length === 0) {
    const kinder = [el('p', { text: 'Heute stehen keine Inputs oder Coachings im Plan.' })];
    if (ohneMuster) kinder.push(coachingHinweis());
    return abschnitt('Heute', kinder);
  }

  const kinder = [el('div', {}, termine.map((termin) => terminZeile(termin, schule, jg.jgst)))];
  if (ohneMuster && !termine.some((termin) => termin.art === 'coaching')) {
    kinder.push(coachingHinweis());
  }
  return abschnitt('Heute', kinder);
}

// Kein Wortlaut dafür in Planung/DESIGN.md oder AP-10.md vorgegeben (dort
// steht nur "passender Satz"), deshalb eigene, kurze Formulierung. Siehe
// Abschlussbericht, Abschnitt "Abweichungen von der Planung".
function heuteAbwesendText(wochenende, info) {
  if (info.sonderwoche && info.sonderwoche.titel) {
    return 'Diese Woche: ' + info.sonderwoche.titel + '.';
  }
  if (info.ferien && info.ferien.name) {
    return 'Gerade sind ' + info.ferien.name + ', bis ' + formatDatum(info.ferien.bis, 'datum') + '.';
  }
  if (wochenende) {
    return 'Heute ist Wochenende, kein SOUL-Tag.';
  }
  return 'Heute ist kein SOUL-Tag.';
}

// ------------------------------------------------------------------ Diese Woche

// DESIGN 10, Punkt 3. Tippen auf eine Tageskarte klappt die Tagesansicht
// darunter auf (kein neuer Hash, model.wocheTermine liefert je Tag schon
// termine, ferien und sonderwoche).
function wocheAbschnitt(ctx) {
  const { jg, schule, heute } = ctx;
  const tage = model.wocheTermine(jg, schule, heute);
  const heuteISO = toISODate(heute);
  const detailBereich = el('div', { style: { marginTop: 'var(--s-4)' } });

  const karten = tage.map((tag) => {
    const istHeute = toISODate(tag.datum) === heuteISO;
    const karte = tagKarte({
      datum: tag.datum,
      termine: tag.termine,
      istHeute,
      sonderwoche: tag.sonderwoche,
      schule,
      jgst: jg.jgst
    });
    // Tippbar: ein <article> darf nicht role="button" tragen. Deshalb derselbe
    // Inhalt in einem div. Der Name kommt aus dem sichtbaren Inhalt (Tag,
    // Datum, Termine), so wie DESIGN 11 es für VoiceOver beschreibt.
    const element = el('div', {
      class: karte.className + ' woche-tag-karte',
      role: 'button',
      tabindex: '0'
    }, [...karte.childNodes]);
    const oeffnen = () => tagDetailZeigen(detailBereich, tag, istHeute, schule, jg.jgst);
    element.addEventListener('click', oeffnen);
    element.addEventListener('keydown', (ereignis) => {
      if (ereignis.key !== 'Enter' && ereignis.key !== ' ') return;
      ereignis.preventDefault();
      oeffnen();
    });
    if (istHeute) tagDetailZeigen(detailBereich, tag, true, schule, jg.jgst, { keinScroll: true });
    return element;
  });

  return abschnitt('Diese Woche', [
    el('div', { class: 'wochenraster' }, karten),
    detailBereich
  ]);
}

function tagDetailZeigen(bereich, tag, istHeute, schule, jgst, optionen = {}) {
  leer(bereich);
  bereich.append(
    el('h3', { text: (istHeute ? 'Heute, ' : '') + formatDatum(tag.datum, 'lang') }),
    tag.termine.length > 0
      ? el('div', {}, tag.termine.map((termin) => terminZeile(termin, schule, jgst)))
      : leerZustand({ text: tagLeerText(tag), motiv: 'keins' })
  );
  if (!optionen.keinScroll && typeof bereich.scrollIntoView === 'function') {
    bereich.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function tagLeerText(tag) {
  if (tag.sonderwoche && tag.sonderwoche.titel) return tag.sonderwoche.titel + '.';
  if (tag.ferien && tag.ferien.name) return tag.ferien.name + '.';
  if (isWeekend(tag.datum)) return 'Wochenende, kein SOUL-Tag.';
  return 'Kein Termin an diesem Tag.';
}

// ------------------------------------------------------------------ Läuft gerade

// DESIGN 10, Punkt 4.
function laeuftAbschnitt(ctx) {
  const { jg, schule, heute, navigate } = ctx;
  const slots = model.slotsAm(jg, heute);

  if (slots.length === 0) {
    return abschnitt('Läuft gerade', [
      leerZustand({ text: 'Gerade läuft für dich kein Baustein.', motiv: 'zahnrad' })
    ]);
  }

  const kacheln = slots.map((slot) => laufKachel(ctx, slot));

  return abschnitt('Läuft gerade', [el('div', { class: 'fach-kacheln' }, kacheln)]);
}

/**
 * Eine Kachel je laufendem Baustein, im Stil der Fachkacheln: Fach, Baustein
 * (kursiv), Abgabe mit Strich, verbleibende Schultage und ein duenner
 * Zeitbalken. Tippen fuehrt zum Baustein.
 */
function laufKachel(ctx, slot) {
  const { jg, schule, heute, navigate } = ctx;
  const fach = fachVon(schule, slot.fach);
  const baustein = bausteinVon(jg, slot.baustein);
  const titel = (baustein && baustein.titel) || 'Thema folgt';
  const tage = schultageBis(heute, slot.abgabe, schule);
  // DESIGN 2.2: Status vorlaeufig bekommt Hinweis.
  const vorlaeufig = slot.status === 'vorlaeufig';
  const tageText = tage <= 0 ? 'Abgabe heute'
    : tage === 1 ? 'Noch 1 Schultag' : 'Noch ' + tage + ' Schultage';

  const zeilen = [
    { art: 'kopf', text: vorlaeufig ? 'Läuft, vorläufig' : 'Läuft' },
    { art: 'baustein', text: titel },
    { art: 'datum', text: 'Abgabe ' + formatDatum(slot.abgabe, 'datum') },
    { art: 'text', text: tageText }
  ];
  if (vorlaeufig && slot.hinweis) zeilen.push({ art: 'text', text: slot.hinweis });

  const kachel = el(slot.baustein ? 'button' : 'div', {
    type: slot.baustein ? 'button' : null,
    class: 'fach-kachel fach-kachel--lauft',
    dataset: { fach: fach.farbe },
    onclick: slot.baustein ? () => navigate('#/baustein/' + slot.baustein) : null
  }, [
    fachBadge(fach, { groesse: 'l' }),
    el('span', { class: 'fach-kachel-text' }, [
      el('span', { class: 'fach-kachel-name', text: fach.name }),
      el('span', { class: 'fach-kachel-stand' }, zeilen.map(
        (zeile) => el('span', { class: 'fach-kachel-stand-' + zeile.art, text: zeile.text })
      )),
      fortschritt({ von: slot.von, bis: slot.bis, heute })
    ])
  ]);
  return kachel;
}

// ------------------------------------------------------------------ Als Nächstes

// DESIGN 10, Punkt 5.
function naechstesAbschnitt(ctx) {
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

  return abschnitt('Als Nächstes', [el('div', { class: 'woche-liste' }, liste)]);
}

// ------------------------------------------------------------------ Nächste Ferien

// DESIGN 10, Punkt 6.
function ferienAbschnitt(ctx) {
  const { schule, heute } = ctx;
  const ferien = model.naechsteFerien(schule, heute);

  if (!ferien) {
    return abschnitt('Nächste Ferien', [
      leerZustand({ text: 'Keine weiteren Ferien in diesem Schuljahr.', motiv: 'keins' })
    ]);
  }

  const tage = ferien.schultageBis;
  const text = ferien.laeuft
    ? 'Gerade sind ' + ferien.name + ', bis ' + formatDatum(ferien.bis, 'datum') + '.'
    : 'Noch ' + (tage === 1 ? '1 Schultag' : tage + ' Schultage') + ' bis zu den ' + ferien.name + '.';

  return abschnitt('Nächste Ferien', [karte({ titel: ferien.name, kinder: [el('p', { text })] })]);
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

// "Montag, 31. August 2026" -> "Montag, 31. August" (dates.js kennt keinen
// eigenen Stil ohne Jahr, deshalb wird nur der letzte Textteil abgeschnitten,
// keine eigene Datumsrechnung).
function ohneJahr(datum) {
  const teile = formatDatum(datum, 'lang').split(' ');
  teile.pop();
  return teile.join(' ');
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
