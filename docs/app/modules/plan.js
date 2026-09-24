// Modul "Plan" (AP-11): Wochenraster (#/plan) und Jahresueberblick
// (#/plan/jahr, #/plan/jahr?ansicht=fach).
//
// Regeln aus AP_ALLGEMEIN und ARCHITEKTUR 3.3/3.4:
// - Reine Anzeige. Jede Datumsfrage geht an model.js oder dates.js, hier wird
//   kein Datum selbst ausgerechnet. Verglichen wird ueber 'YYYY-MM-DD'-Texte
//   (zeichenweise Sortierung = chronologische Sortierung), gelesen wird ein
//   Datumstext nur ueber dates.parseISODate.
// - Kein Modul importiert ein anderes Modul.
// - Keine Inhalte erfinden: Titel, Kuerzel und Zeitraeume kommen aus den
//   Daten, fehlende Bausteintitel werden zu "Thema folgt" (DATENMODELL 3).
//
// Die Zeitleiste ist ein CSS-Grid ohne Bibliothek (AP-11):
// Zeitachse = Kalendertage des Schuljahrs, Spurachse = drei Spuren bzw. je
// eine Zeile pro Fach. Jede Zelle setzt vier eigene Werte (--zeit-von,
// --zeit-span, --spur-von, --spur-span); welche davon Zeile und welche
// Spalte werden, entscheidet components.css. So ist das Hochformat nur ein
// Tausch der beiden Achsen, ohne zweiten Aufbau in JavaScript.

import { registerModule } from '../module.js';
import { addDays, diffDays, formatDatum, mondayOf, parseISODate, toISODate } from '../dates.js';
import * as model from '../model.js';
import {
  el, etikett, fachBadge, hinweis, knopf, leer, leerZustand, segment, tagKarte
} from '../ui/components.js';

registerModule({
  id: 'plan',
  titel: 'Plan',
  icon: 'plan',
  nav: { position: 20, sichtbar: true },
  routes: [
    { pattern: '#/plan', render: renderWochenraster },
    { pattern: '#/plan/jahr', render: renderJahr },
    { pattern: '#/plan/druck/:rasterId', render: renderDruck }
  ]
});

// "offen" steht nicht in schule.faecher (DESIGN 2.2, letzte Zeile), dieselbe
// Ersatzangabe verwenden schon muster.js (AP-04) und woche.js (AP-10).
const FACH_OFFEN = { id: 'offen', name: 'Fach offen', kurz: '?', farbe: 'offen', symbol: 'fragezeichen' };

// Der Jahresueberblick hat laut AP-11 immer drei Spuren, auch wenn eine davon
// gerade leer ist.
const SPUREN_MINDESTENS = 3;

// ===================================================== Route #/plan

function renderWochenraster(container, params, ctx) {
  const { jg, schule, heute, navigate } = ctx;
  const raster = model.rasterAm(jg, heute);

  if (!raster) {
    anfuegen(container, [
      el('h1', { text: 'Plan', tabindex: '-1' }),
      hinweis({
        art: 'info',
        text: 'Für diesen Zeitraum gibt es noch keinen Wochenplan in der App. Schau auf den SOUL-Screen.'
      }),
      coachingAbschnitt(ctx),
      verweis(navigate, '#/plan/jahr', 'Zum Jahresüberblick')
    ]);
    return;
  }

  const schalterBereich = el('div', { class: 'plan-schalter' });
  const wochenBereich = el('div', { class: 'plan-wochen' });

  anfuegen(container, [
    el('h1', { text: raster.titel || 'Wochenraster', tabindex: '-1' }),
    legende(jg, schule, raster),
    el('p', {}, [
      knopf({ text: 'Drucken', art: 'neben', onTap: () => navigate('#/plan/druck/' + raster.id) })
    ]),
    schalterBereich,
    wochenBereich,
    verweis(navigate, '#/plan/jahr', 'Zum Jahresüberblick')
  ]);

  // Standard ist der ganze Zeitraum (AP-11).
  zeichneWochen('zeitraum');

  function zeichneWochen(ansicht) {
    leer(schalterBereich);
    schalterBereich.append(segment(
      [{ id: 'woche', text: 'Diese Woche' }, { id: 'zeitraum', text: 'Ganzer Zeitraum' }],
      ansicht,
      (gewaehlt) => { if (gewaehlt !== ansicht) zeichneWochen(gewaehlt); }
    ));

    leer(wochenBereich);
    for (const montag of wochenListe(raster, heute, ansicht)) {
      wochenBereich.append(wocheBlock(ctx, montag));
    }
    zurAktuellenWoche(wochenBereich);
  }
}

/** Die laufenden Slots des Rasterzeitraums als fachBadge mit Titel. */
function legende(jg, schule, raster) {
  const slots = laufendeSlots(jg, raster);
  if (slots.length === 0) return null;

  return el('ul', { class: 'plan-legende' }, slots.map((slot) => {
    const fach = fachVon(schule, slot.fach);
    const baustein = bausteinVon(jg, slot.baustein);
    return el('li', {}, [
      fachBadge(fach, { groesse: 's' }),
      el('span', { text: fach.name + ': ' + ((baustein && baustein.titel) || 'Thema folgt') })
    ]);
  }));
}

/**
 * Slots, die im Rasterzeitraum laufen.
 * Ein Slot beginnt laut Pruefregel (DATENMODELL 3) immer an einem Montag,
 * deshalb genuegt es, model.slotsAm fuer jeden Montag des Zeitraums zu fragen.
 * Damit bleibt jede Datumsrechnung in model.js und dates.js.
 */
function laufendeSlots(jg, raster) {
  const gefunden = new Map();
  const ende = toISODate(raster.bis);
  for (let montag = mondayOf(raster.von); toISODate(montag) <= ende; montag = addDays(montag, 7)) {
    for (const slot of model.slotsAm(jg, montag)) {
      if (!gefunden.has(slot.id)) gefunden.set(slot.id, slot);
    }
  }
  return Array.from(gefunden.values()).sort(nachSpurUndDatum);
}

/** Montage des Rasterzeitraums, bei "Diese Woche" nur der aktuelle. */
function wochenListe(raster, heute, ansicht) {
  const alle = [];
  const ende = toISODate(raster.bis);
  for (let montag = mondayOf(raster.von); toISODate(montag) <= ende; montag = addDays(montag, 7)) {
    alle.push(montag);
  }
  if (ansicht !== 'woche') return alle;

  const gesucht = toISODate(mondayOf(heute));
  const treffer = alle.filter((montag) => toISODate(montag) === gesucht);
  // Liegt heute im Rasterzeitraum, aber nicht auf einer der Wochen (kann bei
  // einem Zeitraum ohne volle Woche vorkommen), bleibt der ganze Zeitraum.
  return treffer.length > 0 ? treffer : alle;
}

/** Eine Woche: Kopfzeile und darunter fuenf Tageskarten oder ein Balken. */
function wocheBlock(ctx, montag) {
  const { jg, schule, heute } = ctx;
  const info = model.wocheninfo(schule, jg, montag);
  const tage = model.wocheTermine(jg, schule, montag);
  const heuteISO = toISODate(heute);
  const istAktuell = toISODate(mondayOf(heute)) === toISODate(montag);

  const kopf = el('h2', {
    class: 'plan-woche-kopf',
    text: 'KW ' + info.kw + ' · ' + formatDatum(montag, 'kurz')
      + ' bis ' + formatDatum(addDays(montag, 4), 'kurz')
  });

  return el('section', {
    class: 'plan-woche' + (istAktuell ? ' plan-woche--aktuell' : ''),
    dataset: istAktuell ? { aktuell: 'true' } : null
  }, [
    kopf,
    wocheInhalt(tage, info, schule, heuteISO)
  ]);
}

function wocheInhalt(tage, info, schule, heuteISO) {
  // Sonderwoche: statt der Tage ein Balken ueber die ganze Breite (AP-11,
  // wie im JPG "Themen- und Fahrtenwoche").
  if (info.sonderwoche && info.sonderwoche.titel) {
    return el('p', { class: 'plan-balken plan-balken--sonderwoche', text: info.sonderwoche.titel });
  }
  // Liegt die ganze Woche in den Ferien, waeren fuenf leere Karten nur
  // Rauschen. Derselbe Balken traegt dann den Ferienname.
  const ferien = tage[0] && tage[0].ferien;
  if (ferien && tage.every((tag) => tag.ferien)) {
    return el('p', { class: 'plan-balken plan-balken--ferien', text: ferien.name || 'Ferien' });
  }

  return el('div', { class: 'wochenraster plan-tage' }, tage.map((tag) => tagKarte({
    datum: tag.datum,
    termine: tag.termine,
    istHeute: toISODate(tag.datum) === heuteISO,
    sonderwoche: tag.sonderwoche,
    schule
  })));
}

/** Beim Oeffnen zur aktuellen Woche scrollen (AP-11). */
function zurAktuellenWoche(bereich) {
  const woche = bereich.querySelector('[data-aktuell]');
  if (!woche || typeof woche.scrollIntoView !== 'function') return;
  woche.scrollIntoView({ block: 'start' });
}

/**
 * Ohne Rasterzeitraum trotzdem die Coachings der laufenden Woche zeigen
 * (AP-11). Sie stammen aus dem Wochenmuster, model.wocheTermine setzt sie
 * zusammen.
 */
function coachingAbschnitt(ctx) {
  const { jg, schule, heute } = ctx;
  const heuteISO = toISODate(heute);
  const tage = model.wocheTermine(jg, schule, heute).map((tag) => Object.assign({}, tag, {
    termine: tag.termine.filter((termin) => termin.art === 'coaching')
  }));

  const kinder = [el('h2', { text: 'Deine Coachings diese Woche' })];
  if (!tage.some((tag) => tag.termine.length > 0)) {
    kinder.push(leerZustand({ text: 'Für diese Woche steht kein Coaching im Plan.', motiv: 'keins' }));
    return el('section', {}, kinder);
  }

  kinder.push(el('div', { class: 'wochenraster plan-tage' }, tage.map((tag) => tagKarte({
    datum: tag.datum,
    termine: tag.termine,
    istHeute: toISODate(tag.datum) === heuteISO,
    sonderwoche: tag.sonderwoche,
    schule
  }))));
  return el('section', {}, kinder);
}

// ===================================================== Route #/plan/druck/:rasterId
// Druckansicht (AP-19): ein A4-quer-Blatt je Bausteinzeitraum, Vorbild ist
// QUELLEN\SOUL Artefakt Klasse 5\bausteinzeitraum-uebersicht.jpg. Die A/B-
// Wochen-Spalte des Vorbilds entfällt (Leo, 22.09.2026: für SOUL nicht
// relevant), an ihrer Stelle steht die Kalenderwoche. Alle Werte kommen aus
// denselben model.js-Funktionen wie #/plan, hier wird kein Datum berechnet.

function renderDruck(container, params, ctx) {
  const { jg, schule, heute, navigate } = ctx;
  const raster = rasterVonId(jg, params && params.rasterId);

  if (!raster) {
    anfuegen(container, [
      el('h1', { text: 'Druckansicht', tabindex: '-1' }),
      hinweis({ art: 'info', text: 'Diesen Bausteinzeitraum gibt es nicht.' }),
      verweis(navigate, '#/plan', 'Zum Wochenraster')
    ]);
    return;
  }

  const wochen = wochenListe(raster, heute, 'zeitraum');
  const titel = raster.titel || ('Bausteinzeitraum ' + formatDatum(raster.von, 'datum') + ' bis ' + formatDatum(raster.bis, 'datum'));

  container.append(el('div', { class: 'druck-seite' }, [
    el('header', { class: 'druck-kopf' }, [
      el('div', { class: 'druck-kopf-text' }, [
        el('h1', { text: titel, tabindex: '-1' }),
        legende(jg, schule, raster)
      ]),
      el('img', { class: 'druck-logo', src: 'assets/soul-logo.png', alt: '', 'aria-hidden': 'true' })
    ]),
    druckTabelle(ctx, raster, wochen),
    el('p', { class: 'druck-knopfzeile' }, [
      knopf({ text: 'Drucken', art: 'haupt', onTap: () => window.print() }),
      knopf({ text: 'Zurück zum Plan', art: 'neben', onTap: () => navigate('#/plan') })
    ])
  ]));
}

/** Der Bausteinzeitraum mit dieser ID, oder null. Sucht direkt in jg.raster,
 * weil model.rasterAm nur "den Zeitraum an einem Datum" kennt, nicht per ID. */
function rasterVonId(jg, rasterId) {
  const treffer = liste(jg, 'raster').find((eintrag) => eintrag && eintrag.id === rasterId);
  if (!treffer) return null;
  return Object.assign({}, treffer, {
    von: parseISODate(treffer.von),
    bis: parseISODate(treffer.bis || treffer.von)
  });
}

/**
 * Die Tabelle: Kopfzeile Mo bis Fr, je Woche eine Datums- und eine
 * Terminzeile (AP-19), Sonderwochen und Ferien als Balken über die ganze
 * Breite (wie #/plan, siehe wocheInhalt).
 */
function druckTabelle(ctx, raster, wochen) {
  const { jg, schule } = ctx;
  const referenzMontag = wochen[0] || mondayOf(raster.von);
  const koerper = [];

  for (const montag of wochen) {
    const info = model.wocheninfo(schule, jg, montag);
    const tage = model.wocheTermine(jg, schule, montag);
    const zeitraumText = formatDatum(montag, 'datum') + ' bis ' + formatDatum(addDays(montag, 4), 'datum') + ': ';

    if (info.sonderwoche && info.sonderwoche.titel) {
      koerper.push(druckBalken(zeitraumText + info.sonderwoche.titel, 'sonderwoche'));
      continue;
    }
    const ferien = tage[0] && tage[0].ferien;
    if (ferien && tage.every((tag) => tag.ferien)) {
      koerper.push(druckBalken(zeitraumText + (ferien.name || 'Ferien'), 'ferien'));
      continue;
    }

    koerper.push(el('tr', { class: 'druck-datumszeile' }, [
      el('td', { class: 'druck-kw', rowspan: 2, text: 'KW ' + info.kw }),
      ...tage.map((tag) => el('td', { class: 'druck-datum', text: formatDatum(tag.datum, 'datum') }))
    ]));
    koerper.push(el('tr', { class: 'druck-terminzeile' },
      tage.map((tag) => el('td', {}, tag.termine.map((termin) => terminBlock(termin, schule))))
    ));
  }

  // Eigener Rahmen mit waagerechtem Scrollen auf schmalen Geraeten (DESIGN 1,
  // dieselbe Regel wie .wissen-tabelle-rahmen in wissen.js). Fuer den Ausdruck
  // hebt print.css das wieder auf, dort bestimmt @page die Breite.
  return el('div', { class: 'druck-tabelle-rahmen', tabindex: '0', role: 'group', 'aria-label': 'Tabelle' }, [
    el('table', { class: 'druck-tabelle' }, [
      el('thead', {}, [
        el('tr', {}, [
          el('th', { scope: 'col', class: 'druck-kw', text: 'KW' }),
          ...[0, 1, 2, 3, 4].map((versatz) => el('th', {
            scope: 'col',
            text: formatDatum(addDays(referenzMontag, versatz), 'tagLang')
          }))
        ])
      ]),
      el('tbody', {}, koerper)
    ])
  ]);
}

function druckBalken(text, art) {
  return el('tr', { class: 'druck-balken' }, [
    el('td', { colspan: 6, class: 'plan-balken plan-balken--' + art, text })
  ]);
}

/**
 * Ein Termin im Feld: Inputs als Fachfläche mit fettem Kopf "Input <Kürzel
 * Fach> <Kürzel Person>", Coachings als "Coaching <Kürzel>" (AP-19). Der
 * Fach-Kürzel kommt aus schule.faecher (dieselbe Angabe wie überall sonst in
 * der App), nicht aus der informellen Beschriftung des alten JPGs.
 */
function terminBlock(termin, schule) {
  if (termin.art === 'input') {
    const fach = fachVon(schule, termin.fach);
    const zusatz = [
      termin.titel,
      termin.station ? 'Station ' + termin.station : null,
      termin.pflicht ? 'Pflicht' : null,
      termin.klasse ? 'nur Klasse ' + termin.klasse : null
    ].filter(Boolean).join(', ');
    return el('div', { class: 'druck-input', dataset: { fach: fach.farbe } }, [
      el('p', { class: 'druck-input-kopf', text: 'Input ' + fach.kurz + (termin.kuerzel ? ' ' + termin.kuerzel : '') }),
      zusatz ? el('p', { class: 'druck-input-text', text: zusatz }) : null
    ].filter(Boolean));
  }
  if (termin.art === 'coaching') {
    return el('p', { class: 'druck-coaching', text: 'Coaching' + (termin.kuerzel ? ' ' + termin.kuerzel : '') });
  }
  // 'sonstiges': dieselbe Bezeichnung wie in ui/components.js terminZeile.
  return el('p', { class: 'druck-sonstiges', text: 'Termin' + (termin.text ? ': ' + termin.text : '') });
}

// ===================================================== Route #/plan/jahr

function renderJahr(container, params, ctx) {
  const { jg, schule, heute, navigate } = ctx;
  const nachFach = Boolean(params) && params.ansicht === 'fach';

  const kinder = [
    el('h1', { text: 'Jahresüberblick', tabindex: '-1' }),
    el('div', { class: 'plan-schalter' }, [segment(
      [{ id: 'zeitleiste', text: 'Zeitleiste' }, { id: 'fach', text: 'Nach Fach' }],
      nachFach ? 'fach' : 'zeitleiste',
      (gewaehlt) => navigate(gewaehlt === 'fach' ? '#/plan/jahr?ansicht=fach' : '#/plan/jahr')
    )])
  ];

  const zeitraum = jahresZeitraum(jg);
  const eintraege = alleSlots(jg, schule, heute);

  if (!zeitraum || eintraege.length === 0) {
    kinder.push(leerZustand({
      text: 'Für dein Schuljahr sind noch keine Bausteine eingetragen.',
      motiv: 'zahnrad'
    }));
    kinder.push(verweis(navigate, '#/plan', 'Zum Wochenraster'));
    anfuegen(container, kinder);
    return;
  }

  const reihen = nachFach ? fachReihen(eintraege, schule) : spurReihen(eintraege);
  const geordnet = nachFach ? eintraege : eintraege.slice().sort(nachDatumUndSpur);

  kinder.push(zeitleiste(ctx, zeitraum, geordnet, reihen, nachFach));
  kinder.push(listeKnopf(ctx, geordnet, nachFach));
  kinder.push(verweis(navigate, '#/plan', 'Zum Wochenraster'));

  anfuegen(container, kinder);
  zuHeuteScrollen(container);
}

/**
 * Zeitraum des Schuljahrs: vom Montag des fruehesten bis zum Sonntag der
 * Woche des spaetesten Eintrags (Slots und Sonderwochen des Jahrgangs).
 * Nichts davon ist gesetzt, alles kommt aus den Daten.
 */
function jahresZeitraum(jg) {
  const marken = [];
  for (const slot of liste(jg, 'slots')) {
    if (slot && slot.von) marken.push(slot.von, slot.bis || slot.von);
  }
  for (const woche of liste(jg, 'sonderwochen')) {
    if (woche && woche.von) marken.push(woche.von, woche.bis || woche.von);
  }
  if (marken.length === 0) return null;

  let frueh = marken[0];
  let spaet = marken[0];
  for (const marke of marken) {
    if (marke < frueh) frueh = marke;
    if (marke > spaet) spaet = marke;
  }
  return {
    von: mondayOf(parseISODate(frueh)),
    bis: addDays(mondayOf(parseISODate(spaet)), 6)
  };
}

/**
 * Alle Slots des Jahrgangs als { slot, baustein, zeitStatus, fachId }.
 * zeitStatus ist 'vorbei' | 'laeuft' | 'kommt' relativ zu heute und nicht zu
 * verwechseln mit slot.status aus den Daten ('fest' | 'wahl' | 'vorlaeufig').
 * model.bausteineDesFachs liefert je Fach schon Kopien mit Date-Feldern und
 * den Status relativ zu heute, deshalb wird hier nach Fach gefragt und nicht
 * in jg.slots gegriffen.
 */
function alleSlots(jg, schule, heute) {
  const ergebnis = [];
  for (const fachId of fachIds(jg, schule)) {
    for (const eintrag of model.bausteineDesFachs(jg, fachId, heute)) {
      ergebnis.push({
        slot: eintrag.slot,
        baustein: eintrag.baustein,
        zeitStatus: eintrag.status,
        fachId
      });
    }
  }
  return ergebnis;
}

/** Faecher, die im Jahrgang vorkommen, in der Reihenfolge aus schule.faecher. */
function fachIds(jg, schule) {
  const vorhanden = new Set();
  for (const slot of liste(jg, 'slots')) {
    if (slot && slot.fach) vorhanden.add(slot.fach);
  }
  const geordnet = liste(schule, 'faecher')
    .map((fach) => fach && fach.id)
    .filter((id) => id && vorhanden.has(id));
  for (const id of vorhanden) {
    if (!geordnet.includes(id)) geordnet.push(id);
  }
  return geordnet;
}

/** Zeilen der Ansicht "Zeitleiste": die drei Spuren. */
function spurReihen(eintraege) {
  let hoechste = SPUREN_MINDESTENS;
  for (const eintrag of eintraege) {
    const lage = spurLage(eintrag.slot);
    hoechste = Math.max(hoechste, lage.von + lage.span - 1);
  }
  const reihen = [];
  for (let nummer = 1; nummer <= hoechste; nummer++) {
    reihen.push({ id: 'spur-' + nummer, text: 'Spur ' + nummer });
  }
  return reihen;
}

/** Zeilen der Ansicht "Nach Fach": je Fach eine Zeile. */
function fachReihen(eintraege, schule) {
  const reihen = [];
  for (const eintrag of eintraege) {
    if (reihen.some((reihe) => reihe.id === eintrag.fachId)) continue;
    reihen.push({ id: eintrag.fachId, text: fachVon(schule, eintrag.fachId).name });
  }
  return reihen;
}

/** Erste Spur und Anzahl Spuren eines Slots (spuren gewinnt vor spur). */
function spurLage(slot) {
  const nummern = Array.isArray(slot.spuren) && slot.spuren.length > 0
    ? slot.spuren.map(Number).filter(Number.isFinite)
    : [Number(slot.spur)].filter(Number.isFinite);
  if (nummern.length === 0) return { von: 1, span: 1 };
  const kleinste = Math.min.apply(null, nummern);
  const groesste = Math.max.apply(null, nummern);
  return { von: kleinste, span: groesste - kleinste + 1 };
}

// ------------------------------------------------------ Zeitleiste

function zeitleiste(ctx, zeitraum, eintraege, reihen, nachFach) {
  const { jg, schule, heute } = ctx;
  const tage = diffDays(zeitraum.von, zeitraum.bis) + 1;

  const gitter = el('div', { class: 'plan-gitter' });
  // Die beiden Achsen als eigene Werte: components.css entscheidet, welche
  // davon Spalten und welche Zeilen werden (Quer- bzw. Hochformat).
  gitter.style.setProperty('--plan-zeit-achse', 'var(--plan-kopf) repeat(' + tage + ', var(--plan-tag))');
  gitter.style.setProperty('--plan-spur-achse', 'var(--plan-monat) repeat(' + reihen.length + ', var(--plan-spur))');

  // 1. Monatsköpfe.
  for (const monat of monatsKoepfe(zeitraum)) {
    gitter.append(zelle('div', { class: 'plan-monat', text: monat.text, title: monat.text }, {
      zeitVon: 2 + diffDays(zeitraum.von, monat.von),
      zeitSpan: monat.tage,
      spurVon: 1,
      spurSpan: 1
    }));
  }

  // 2. Zeilenbeschriftung und Zeilenband (Trennlinie, Hintergrund).
  reihen.forEach((reihe, nummer) => {
    // Der Name steht in einem span: Ein nackter Text waere ein anonymes
    // Flex-Kind, an dem Umbruchregeln nicht greifen, und lange Namen wie
    // "Mathematik" wuerden in der schmalen Spalte abgeschnitten.
    gitter.append(zelle('div', { class: 'plan-reihenname' }, {
      zeitVon: 1, zeitSpan: 1, spurVon: 2 + nummer, spurSpan: 1
    }, [el('span', { class: 'plan-reihenname-text', text: reihe.text })]));
    gitter.append(zelle('div', { class: 'plan-reihe', 'aria-hidden': 'true' }, {
      zeitVon: 2, zeitSpan: tage, spurVon: 2 + nummer, spurSpan: 1
    }));
  });

  // 3. Ferien (graue Streifen) und Sonderwochen (schraffierte Streifen),
  //    jeweils über alle Spuren, hinter den Slots.
  streifen(gitter, zeitraum, liste(schule, 'ferien'), 'plan-ferien', reihen.length);
  streifen(gitter, zeitraum, liste(jg, 'sonderwochen'), 'plan-sonderwoche', reihen.length);

  // 4. Linie "heute" in Gold mit Etikett.
  const heuteISO = toISODate(heute);
  if (heuteISO >= toISODate(zeitraum.von) && heuteISO <= toISODate(zeitraum.bis)) {
    gitter.append(zelle('div', { class: 'plan-heute', dataset: { heute: 'true' } }, {
      zeitVon: 2 + diffDays(zeitraum.von, heute),
      zeitSpan: 1,
      spurVon: 2,
      spurSpan: reihen.length
    }, [etikett('Heute', 'heute')]));
  }

  // 5. Slots zuletzt, damit sie über den Streifen liegen.
  for (const eintrag of eintraege) {
    const lage = nachFach
      ? { von: reihen.findIndex((reihe) => reihe.id === eintrag.fachId) + 1, span: 1 }
      : spurLage(eintrag.slot);
    gitter.append(slotBlock(ctx, eintrag, {
      zeitVon: 2 + diffDays(zeitraum.von, eintrag.slot.von),
      zeitSpan: diffDays(eintrag.slot.von, eintrag.slot.bis) + 1,
      spurVon: 1 + Math.max(1, lage.von),
      spurSpan: Math.max(1, lage.span)
    }));
  }

  return el('div', {
    class: 'plan-zeitleiste',
    // Die Ansicht steht auch am Scrollbereich, damit components.css sie ohne
    // :has() ansprechen kann (auf schmalen Geraeten bleibt "Nach Fach" bei
    // Zeilen je Fach, siehe Abschnitt "Modul plan").
    dataset: { ansicht: nachFach ? 'fach' : 'zeitleiste' },
    tabindex: '0',
    role: 'group',
    'aria-label': 'Zeitleiste des Schuljahres'
  }, [gitter]);
}

/** Ein Block im Gitter, Zeitachse und Spurachse als eigene Werte. */
function zelle(tag, attribute, lage, kinder = []) {
  const element = el(tag, attribute, kinder);
  element.classList.add('plan-zelle');
  element.style.setProperty('--zeit-von', String(lage.zeitVon));
  element.style.setProperty('--zeit-span', String(lage.zeitSpan));
  element.style.setProperty('--spur-von', String(lage.spurVon));
  element.style.setProperty('--spur-span', String(lage.spurSpan));
  return element;
}

/** Monate als Kopfzeile: Name, bei Jahreswechsel zusätzlich die Jahreszahl. */
function monatsKoepfe(zeitraum) {
  const koepfe = [];
  const ende = toISODate(zeitraum.bis);
  let letztesJahr = '';
  let tag = zeitraum.von;

  while (toISODate(tag) <= ende) {
    const monat = toISODate(tag).slice(0, 7);
    let laeufer = tag;
    let tage = 0;
    while (toISODate(laeufer) <= ende && toISODate(laeufer).slice(0, 7) === monat) {
      tage++;
      laeufer = addDays(laeufer, 1);
    }
    // 'lang' liefert "Montag, 31. August 2026". Monatsname und Jahr stehen
    // am Ende, deshalb nur Text schneiden, keine eigene Monatstabelle.
    const teile = formatDatum(tag, 'lang').split(' ');
    const name = teile[teile.length - 2];
    const jahr = teile[teile.length - 1];
    koepfe.push({ von: tag, tage, text: jahr === letztesJahr ? name : name + ' ' + jahr });
    letztesJahr = jahr;
    tag = laeufer;
  }
  return koepfe;
}

/** Ferien und Sonderwochen als Streifen über alle Spuren, auf den Zeitraum beschnitten. */
function streifen(gitter, zeitraum, bloecke, klasse, reihenAnzahl) {
  const start = toISODate(zeitraum.von);
  const ende = toISODate(zeitraum.bis);

  for (const block of bloecke) {
    if (!block || !block.von) continue;
    const von = block.von < start ? start : block.von;
    const bis = (block.bis || block.von) > ende ? ende : (block.bis || block.von);
    if (von > bis) continue;

    const text = block.name || block.titel || '';
    const vonDatum = parseISODate(von);
    gitter.append(zelle('div', { class: klasse, title: text, 'aria-label': text }, {
      zeitVon: 2 + diffDays(zeitraum.von, vonDatum),
      zeitSpan: diffDays(vonDatum, parseISODate(bis)) + 1,
      spurVon: 2,
      spurSpan: reihenAnzahl
    }, [el('span', { class: 'plan-streifen-text', text })]));
  }
}

/**
 * Ein Slot als Block: Fachfläche, Fachkante, fachBadge, Titel und Stunden.
 * Status 'vorlaeufig' nach DESIGN 2.2: gestrichelte Kante, Etikett und
 * Hinweistext. Baustein-Nummern kommen nicht vor (AP-11).
 */
function slotBlock(ctx, eintrag, lage) {
  const { schule, navigate } = ctx;
  const slot = eintrag.slot;
  const fach = fachVon(schule, slot.fach);
  const titel = (eintrag.baustein && eintrag.baustein.titel) || 'Thema folgt';
  const vorlaeufig = slot.status === 'vorlaeufig';
  const stunden = Number(slot.stunden) > 0 ? Number(slot.stunden) + ' Stunden' : '';

  const teile = [
    fach.name,
    titel,
    formatDatum(slot.von, 'datum') + ' bis ' + formatDatum(slot.bis, 'datum')
  ];
  if (stunden) teile.push(stunden);
  if (vorlaeufig) {
    teile.push('Vorläufig');
    if (slot.hinweis) teile.push(slot.hinweis);
  }
  const beschriftung = teile.join(', ');

  const kinder = [
    el('span', { class: 'plan-block-kopf' }, [
      fachBadge(fach, { groesse: 's' }),
      el('span', { class: 'plan-block-titel', text: titel })
    ]),
    stunden ? el('span', { class: 'plan-block-stunden', text: stunden }) : null,
    vorlaeufig ? etikett('Vorläufig', 'vorlaeufig') : null,
    vorlaeufig && slot.hinweis
      ? el('span', { class: 'plan-block-hinweis', text: slot.hinweis })
      : null
  ];

  const attribute = {
    class: 'plan-block' + (vorlaeufig ? ' plan-block--vorlaeufig' : ''),
    dataset: { fach: fach.farbe },
    title: beschriftung,
    'aria-label': beschriftung
  };

  if (!slot.baustein) return zelle('div', attribute, lage, kinder);

  attribute.type = 'button';
  attribute.onclick = () => navigate('#/baustein/' + slot.baustein);
  return zelle('button', attribute, lage, kinder);
}

// ------------------------------------------------------ Liste (Barrierearmut)

/**
 * Knopf "Als Liste anzeigen" mit der vollständigen Liste aller Slots in
 * derselben Reihenfolge wie die Grafik (AP-11, sichtbar für alle).
 */
function listeKnopf(ctx, eintraege, nachFach) {
  const { schule, navigate } = ctx;

  const eintragsZeilen = eintraege.map((eintrag) => {
    const slot = eintrag.slot;
    const fach = fachVon(schule, slot.fach);
    const titel = (eintrag.baustein && eintrag.baustein.titel) || 'Thema folgt';
    const stunden = Number(slot.stunden) > 0 ? Number(slot.stunden) + ' Stunden' : '';

    const zeile = [
      el('span', { class: 'plan-liste-zeitraum', text: formatDatum(slot.von, 'datum') + ' bis ' + formatDatum(slot.bis, 'datum') }),
      stunden ? el('span', { class: 'plan-liste-stunden', text: stunden }) : null,
      slot.status === 'vorlaeufig' ? etikett('Vorläufig', 'vorlaeufig') : null,
      slot.status === 'vorlaeufig' && slot.hinweis
        ? el('span', { class: 'text-klein text-neben', text: slot.hinweis })
        : null
    ];

    const beschriftung = fach.name + ': ' + titel;
    const inhalt = slot.baustein
      ? knopf({ text: beschriftung, art: 'text', onTap: () => navigate('#/baustein/' + slot.baustein) })
      : el('span', { text: beschriftung });

    return el('li', { class: 'plan-liste-eintrag' }, [
      el('span', { class: 'plan-liste-kopf' }, [fachBadge(fach, { groesse: 's' }), inhalt]),
      el('span', { class: 'plan-liste-daten' }, zeile)
    ]);
  });

  const listenElement = el('ol', {
    class: 'plan-liste',
    hidden: true,
    'aria-label': nachFach ? 'Alle Bausteine nach Fach' : 'Alle Bausteine in Reihenfolge'
  }, eintragsZeilen);

  const schalter = knopf({ text: 'Als Liste anzeigen', art: 'neben' });
  schalter.setAttribute('aria-expanded', 'false');
  schalter.addEventListener('click', () => {
    const offen = !listenElement.hidden;
    listenElement.hidden = offen;
    schalter.setAttribute('aria-expanded', String(!offen));
    const beschriftung = schalter.querySelector('span');
    if (beschriftung) beschriftung.textContent = offen ? 'Als Liste anzeigen' : 'Liste ausblenden';
  });

  return el('div', { class: 'plan-listenbereich' }, [el('p', {}, [schalter]), listenElement]);
}

/** Beim Öffnen auf "heute" zentrieren (quer waagerecht, hoch senkrecht). */
function zuHeuteScrollen(container) {
  const marke = container.querySelector('[data-heute]');
  if (!marke || typeof marke.scrollIntoView !== 'function') return;
  const hoch = typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 899px)').matches;
  marke.scrollIntoView(hoch
    ? { block: 'center', inline: 'nearest' }
    : { block: 'nearest', inline: 'center' });
}

// ===================================================== Hilfsmittel

function anfuegen(container, kinder) {
  container.append(...kinder.filter(Boolean));
}

function verweis(navigate, ziel, text) {
  return el('p', {}, [knopf({ text, icon: 'plan', art: 'neben', onTap: () => navigate(ziel) })]);
}

function liste(objekt, feld) {
  return objekt && Array.isArray(objekt[feld]) ? objekt[feld] : [];
}

function fachVon(schule, fachId) {
  if (!fachId || fachId === 'offen') return FACH_OFFEN;
  const faecher = liste(schule, 'faecher');
  return faecher.find((eintrag) => eintrag && eintrag.id === fachId) || FACH_OFFEN;
}

function bausteinVon(jg, bausteinId) {
  if (!bausteinId) return null;
  return liste(jg, 'bausteine').find((eintrag) => eintrag && eintrag.id === bausteinId) || null;
}

// Sortierung: 'YYYY-MM-DD' sortiert zeichenweise wie chronologisch.
function nachSpurUndDatum(a, b) {
  const spurA = spurLage(a).von;
  const spurB = spurLage(b).von;
  if (spurA !== spurB) return spurA - spurB;
  return textVergleich(toISODate(a.von), toISODate(b.von));
}

function nachDatumUndSpur(a, b) {
  const vergleich = textVergleich(toISODate(a.slot.von), toISODate(b.slot.von));
  if (vergleich !== 0) return vergleich;
  return spurLage(a.slot).von - spurLage(b.slot).von;
}

function textVergleich(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
