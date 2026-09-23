// Modul "Fächer" (AP-12): Fachübersicht (#/faecher), Fachseite mit Jahr und
// Input-Curriculum (#/fach/:fachId) und Baustein-Detail (#/baustein/:bausteinId).
//
// Regeln aus AP_ALLGEMEIN und ARCHITEKTUR 3.3/3.4:
// - Reine Anzeige. Jede Datumsfrage geht an model.js oder dates.js, hier wird
//   kein Datum selbst ausgerechnet. Gelesen wird ein Datumstext nur über
//   dates.parseISODate.
// - Kein Modul importiert ein anderes Modul, gemeinsame Logik liegt in
//   model.js, dates.js und ui/*.
// - Keine Inhalte erfinden: Titel, Stationen, Inputs und Hinweise kommen aus
//   den Daten. Fehlt ein Bausteintitel, steht dort "Thema folgt"
//   (DATENMODELL 3). Baustein-Nummern (slot.nr) sind intern und kommen nie
//   auf den Bildschirm (Leo, 22.09.2026).
// - Keine Material-Ansicht, keine Links auf Dateien, kein Abhaken (AP-12).

import { registerModule } from '../module.js';
import { formatDatum, schultageBis } from '../dates.js';
import * as model from '../model.js';
import { icon } from '../ui/icons.js';
import {
  countdown, el, etikett, fachBadge, hinweis, knopf, leerZustand,
  stationenTabelle
} from '../ui/components.js';

registerModule({
  id: 'faecher',
  titel: 'Fächer',
  icon: 'faecher',
  nav: { position: 30, sichtbar: true },
  routes: [
    { pattern: '#/faecher', render: renderFaecher },
    { pattern: '#/fach/:fachId', render: renderFach },
    { pattern: '#/baustein/:bausteinId', render: renderBaustein }
  ]
});

// "offen" steht nicht in schule.faecher (DESIGN 2.2, letzte Zeile). Dieselbe
// Ersatzangabe verwenden schon muster.js (AP-04), woche.js (AP-10) und
// plan.js (AP-11).
const FACH_OFFEN = { id: 'offen', name: 'Fach offen', kurz: '?', farbe: 'offen', symbol: 'fragezeichen' };

// Etikett je Zeitstatus aus model.bausteineDesFachs. Die Versalien macht CSS.
const STATUS_WORT = { vorbei: 'Vorbei', laeuft: 'Läuft', kommt: 'Kommt' };

// Überschriften der drei Gruppen des Input-Curriculums (AP-12, Reihenfolge
// wie dort). Die Schlüssel sind die Arten aus DATENMODELL 3, Blatt Inputs.
const INPUT_GRUPPEN = [
  { art: 'fach', titel: 'Rund ums Fach' },
  { art: 'methode', titel: 'Arbeitstechniken' },
  { art: 'baustein', titel: 'Zu den Bausteinen' }
];

// ===================================================== Route #/faecher

function renderFaecher(container, params, ctx) {
  const { jg, schule, heute, navigate } = ctx;
  const faecher = faecherMitSlot(jg, schule);

  const kinder = [el('h1', { text: 'Fächer', tabindex: '-1' })];

  if (faecher.length === 0) {
    kinder.push(leerZustand({
      text: 'Für dein Schuljahr sind noch keine Bausteine eingetragen.',
      motiv: 'zahnrad'
    }));
    anfuegen(container, kinder);
    return;
  }

  kinder.push(el('div', { class: 'fach-kacheln' }, faecher.map(
    (fach) => fachKachel(fach, model.bausteineDesFachs(jg, fach.id, heute), navigate)
  )));
  anfuegen(container, kinder);
}

/**
 * Eine Kachel je Fach: fachBadge groß, Fachname, eine Zeile zum Stand.
 * Die Kachel ist selbst der Knopf, damit sie mit Tastatur und VoiceOver
 * genauso erreichbar ist wie mit dem Finger (DESIGN 11).
 */
function fachKachel(fach, eintraege, navigate) {
  const zeile = standZeile(eintraege);
  return el('button', {
    type: 'button',
    class: 'fach-kachel',
    dataset: { fach: fach.farbe },
    'aria-label': fach.name + ': ' + zeile,
    onclick: () => navigate('#/fach/' + fach.id)
  }, [
    fachBadge(fach, { groesse: 'l' }),
    el('span', { class: 'fach-kachel-name', text: fach.name }),
    el('span', { class: 'fach-kachel-stand', text: zeile })
  ]);
}

/** "Läuft: ...", "Wieder dran ab ...: ..." oder "In diesem Schuljahr fertig". */
function standZeile(eintraege) {
  const laeuft = eintraege.find((eintrag) => eintrag.status === 'laeuft');
  if (laeuft) {
    return 'Läuft: ' + titelVon(laeuft.baustein)
      + ' bis ' + formatDatum(laeuft.slot.bis, 'datum');
  }
  // bausteineDesFachs sortiert nach Datum, der erste "kommt" ist der nächste.
  const kommt = eintraege.find((eintrag) => eintrag.status === 'kommt');
  if (kommt) {
    return 'Wieder dran ab ' + formatDatum(kommt.slot.von, 'datum')
      + ': ' + titelVon(kommt.baustein);
  }
  return 'In diesem Schuljahr fertig';
}

// ===================================================== Route #/fach/:fachId

function renderFach(container, params, ctx) {
  const { jg, schule, heute, navigate } = ctx;
  const fachId = params && params.fachId;
  const fach = fachAusListe(schule, fachId);

  if (!fach || !hatSlot(jg, fachId)) {
    anfuegen(container, [
      el('h1', { text: 'Fach nicht gefunden', tabindex: '-1' }),
      el('p', { text: 'Dieses Fach gibt es in deinem Jahrgang nicht.' }),
      verweis(navigate, '#/faecher', 'Zu deinen Fächern')
    ]);
    return;
  }

  anfuegen(container, [
    fachKopf(fach),
    jahresAbschnitt(ctx, fach, model.bausteineDesFachs(jg, fachId, heute)),
    inputAbschnitt(jg, fach, model.inputsDesFachs(jg, fachId, heute)),
    // AP-12: Kompetenzen stehen in lernlog, nicht in dieser App.
    el('p', { class: 'text-neben', text: 'Deine Kompetenzen in ' + fach.name + ' schätzt du in lernlog ein.' }),
    verweis(navigate, '#/faecher', 'Zu deinen Fächern')
  ]);
}

/** Kopf in Fachfarbe mit Symbol und Fachname. Die Tonlage macht CSS. */
function fachKopf(fach) {
  return el('div', { class: 'fach-kopf', dataset: { fach: fach.farbe } }, [
    el('span', { class: 'fach-kopf-symbol' }, [icon(fach.symbol, { groesse: 48 })]),
    el('h1', { class: 'fach-kopf-name', text: fach.name, tabindex: '-1' })
  ]);
}

/** "Dein Jahr in <Fach>": senkrechte Liste mit Verbindungslinie. */
function jahresAbschnitt(ctx, fach, eintraege) {
  const { navigate } = ctx;
  const kinder = [el('h2', { text: 'Dein Jahr in ' + fach.name })];

  if (eintraege.length === 0) {
    kinder.push(leerZustand({
      text: 'Für ' + fach.name + ' steht noch kein Baustein im Plan.',
      motiv: 'zahnrad'
    }));
    return el('section', {}, kinder);
  }

  kinder.push(el('ol', { class: 'fach-jahr' }, eintraege.map(
    (eintrag) => jahresEintrag(eintrag, navigate)
  )));
  return el('section', {}, kinder);
}

/**
 * Ein Baustein im Jahr: Titel, Zeitraum, Stunden, Status-Etikett.
 * Keine Nummer (slot.nr ist intern, Leo 22.09.2026), sortiert wird nach Datum.
 */
function jahresEintrag(eintrag, navigate) {
  const slot = eintrag.slot;
  const titel = titelVon(eintrag.baustein);
  const vorlaeufig = slot.status === 'vorlaeufig';
  const stunden = stundenText(slot);

  const kopf = slot.baustein
    ? knopf({ text: titel, art: 'text', onTap: () => navigate('#/baustein/' + slot.baustein) })
    : el('span', { class: 'fach-jahr-titel', text: titel });

  return el('li', {
    class: 'fach-jahr-eintrag',
    dataset: { status: eintrag.status }
  }, [
    el('div', { class: 'fach-jahr-kopf' }, [
      kopf,
      etikett(STATUS_WORT[eintrag.status] || '', eintrag.status),
      vorlaeufig ? etikett('Vorläufig', 'vorlaeufig') : null
    ]),
    el('p', { class: 'fach-jahr-daten text-klein text-neben' }, [
      el('span', { text: zeitraumText(slot) }),
      stunden ? el('span', { text: stunden }) : null
    ]),
    vorlaeufig && slot.hinweis
      ? el('p', { class: 'fach-jahr-hinweis text-klein', text: slot.hinweis })
      : null
  ]);
}

/** Input-Curriculum des Fachs in bis zu drei Gruppen. */
function inputAbschnitt(jg, fach, gruppen) {
  const kinder = [el('h2', { text: 'Input-Curriculum' })];
  const gefuellte = INPUT_GRUPPEN.filter((gruppe) => (gruppen[gruppe.art] || []).length > 0);

  if (gefuellte.length === 0) {
    kinder.push(leerZustand({
      text: 'Das Input-Curriculum für ' + fach.name + ' entsteht gerade.',
      motiv: 'gluehbirne'
    }));
    return el('section', {}, kinder);
  }

  for (const gruppe of gefuellte) {
    kinder.push(el('h3', { text: gruppe.titel }));
    kinder.push(el('ul', { class: 'input-liste' }, gruppen[gruppe.art].map(
      (eintrag) => inputEintrag(eintrag, jg)
    )));
  }
  return el('section', {}, kinder);
}

function inputEintrag(eintrag, jg) {
  const termine = Array.isArray(eintrag.termine) ? eintrag.termine : [];
  return el('li', { class: 'input-eintrag' }, [
    el('p', { class: 'input-titel' }, [
      el('span', { text: eintrag.titel || '' }),
      eintrag.pflicht ? etikett('Pflicht', 'pflicht') : null
    ]),
    eintrag.beschreibung ? el('p', { text: eintrag.beschreibung }) : null,
    termine.length > 0
      ? el('p', { class: 'input-termine text-klein text-neben', text: termineText(termine, jg) })
      : null
  ]);
}

/** "Di 08.09., nur 5A" je Termin, mehrere durch Mittelpunkt getrennt. */
function termineText(termine, jg) {
  return termine.map((termin) => {
    const tag = formatDatum(termin.datum, 'tag') + ' ' + formatDatum(termin.datum, 'kurz');
    return termin.klasse ? tag + ', nur ' + jgstText(jg) + termin.klasse : tag;
  }).join(' · ');
}

// ===================================================== Route #/baustein/:id

function renderBaustein(container, params, ctx) {
  const { jg, schule, heute, navigate } = ctx;
  const bausteinId = params && params.bausteinId;
  const baustein = bausteinVon(jg, bausteinId);

  if (!baustein) {
    anfuegen(container, [
      el('h1', { text: 'Baustein nicht gefunden', tabindex: '-1' }),
      el('p', { text: 'Diesen Baustein gibt es in deinem Jahrgang nicht.' }),
      verweis(navigate, '#/faecher', 'Zu deinen Fächern')
    ]);
    return;
  }

  const fach = fachAusListe(schule, baustein.fach) || FACH_OFFEN;
  // Zeitraum, Stunden und Abgabe stehen im Slot, nicht im Baustein
  // (DATENMODELL 3). bausteineDesFachs liefert den Slot schon als Kopie mit
  // Date-Feldern und dem Zeitstatus relativ zu heute.
  const eintrag = model.bausteineDesFachs(jg, baustein.fach, heute)
    .find((kandidat) => kandidat.baustein && kandidat.baustein.id === baustein.id) || null;
  const slot = eintrag ? eintrag.slot : null;

  anfuegen(container, [
    bausteinKopf(baustein, fach, slot),
    slot ? zeitAbschnitt(slot, eintrag.status, schule, heute) : null,
    gelingensnachweisAbschnitt(baustein),
    stationenAbschnitt(baustein),
    baustein.materialort
      ? el('p', { class: 'baustein-material', text: 'Material: ' + baustein.materialort })
      : null,
    inputsZumBaustein(jg, baustein),
    verweis(navigate, '#/fach/' + fach.id, 'Alle Bausteine in ' + fach.name)
  ]);
}

/** Kopf: fachBadge, Titel, dazu Etikett und Hinweise des Slots. */
function bausteinKopf(baustein, fach, slot) {
  const vorlaeufig = Boolean(slot) && slot.status === 'vorlaeufig';
  const wahl = Boolean(slot) && slot.status === 'wahl';
  const alternativen = Array.isArray(baustein.alternativen) ? baustein.alternativen : [];

  return el('header', { class: 'baustein-kopf', dataset: { fach: fach.farbe } }, [
    el('div', { class: 'baustein-kopf-marken' }, [
      fachBadge(fach, { groesse: 'l' }),
      vorlaeufig ? etikett('Vorläufig', 'vorlaeufig') : null,
      wahl ? etikett('Wahl', 'wahl') : null
    ]),
    el('h1', { text: titelVon(baustein), tabindex: '-1' }),
    baustein.kurzbeschreibung ? el('p', { text: baustein.kurzbeschreibung }) : null,
    // Ein Hinweis steht nur dann da, wenn er in den Daten steht. Das gilt für
    // vorläufige Slots wie für den fächerverbindenden Unterricht (AP-12).
    slot && slot.hinweis ? hinweis({ art: 'info', text: slot.hinweis }) : null,
    wahl && alternativen.length > 0
      ? el('p', { class: 'baustein-wahl', text: 'Du wählst: ' + alternativen.join(' oder ') })
      : null
  ]);
}

/** Zeitraum, Stunden, Abgabe groß, Countdown, solange etwas läuft oder kommt. */
function zeitAbschnitt(slot, status, schule, heute) {
  const stunden = stundenText(slot);
  return el('section', { class: 'baustein-zeit' }, [
    el('dl', {}, [
      el('dt', { text: 'Zeitraum' }),
      el('dd', { text: zeitraumText(slot) }),
      stunden ? el('dt', { text: 'Stunden' }) : null,
      stunden ? el('dd', { text: stunden }) : null
    ]),
    el('p', { class: 'baustein-abgabe' }, [
      el('span', { class: 'baustein-abgabe-wort', text: 'Abgabe' }),
      el('span', { class: 'baustein-abgabe-datum', text: formatDatum(slot.abgabe, 'datum') })
    ]),
    status === 'vorbei'
      ? null
      : countdown({
        bis: slot.abgabe,
        label: 'bis zur Abgabe',
        schultage: schultageBis(heute, slot.abgabe, schule)
      })
  ]);
}

/** Gelingensnachweis als hervorgehobene Karte. */
function gelingensnachweisAbschnitt(baustein) {
  if (!baustein.gelingensnachweis) return null;
  const station = baustein.gelingensnachweisStation;
  return el('section', { class: 'gelingensnachweis' }, [
    el('h2', { text: 'Gelingensnachweis' }),
    el('p', { class: 'gelingensnachweis-titel', text: baustein.gelingensnachweis }),
    station === null || station === undefined || station === ''
      ? null
      : el('p', { class: 'text-klein text-neben', text: 'Station ' + station })
  ]);
}

/** Stationen mit Legende und den beiden Zeitsummen. */
function stationenAbschnitt(baustein) {
  const stationen = Array.isArray(baustein.stationen) ? baustein.stationen : [];
  const kinder = [el('h2', { text: 'Stationen' })];

  if (stationen.length === 0) {
    kinder.push(leerZustand({ text: 'Die Stationen stehen in deinem Baustein.', motiv: 'keins' }));
    return el('section', {}, kinder);
  }

  kinder.push(legendePflichtWahl());
  kinder.push(el('p', { class: 'stationen-summe' }, [
    el('span', { text: 'Pflichtstationen: ' + dauerText(minutenSumme(stationen, 'pflicht')) }),
    el('span', { text: 'Alle Stationen: ' + dauerText(minutenSumme(stationen, null)) })
  ]));
  // Die Tabelle bleibt vollstaendig und darf auf schmalen Geraeten waagerecht
  // scrollen. Der Rahmen traegt tabindex, damit der Bereich auch mit Tastatur
  // erreichbar ist (wie die Zeitleiste in AP-11).
  kinder.push(el('div', {
    class: 'stationen-rahmen',
    tabindex: '0',
    role: 'group',
    'aria-label': 'Tabelle der Stationen'
  }, [stationenTabelle(stationen)]));
  return el('section', {}, kinder);
}

/** Legende zur Tabelle: gefüllter Punkt Pflicht, Ring Wahl (DESIGN 7). */
function legendePflichtWahl() {
  return el('p', { class: 'stationen-legende' }, [
    el('span', { class: 'art art--pflicht' }, [
      el('span', { class: 'art-punkt', 'aria-hidden': 'true' }),
      el('span', { text: 'Pflicht: machst du auf jeden Fall' })
    ]),
    el('span', { class: 'art art--wahl' }, [
      el('span', { class: 'art-punkt', 'aria-hidden': 'true' }),
      el('span', { text: 'Wahl: du darfst, musst aber nicht' })
    ])
  ]);
}

/** Inputs, die laut inputs.bausteine zu diesem Baustein gehören. */
function inputsZumBaustein(jg, baustein) {
  const treffer = liste(jg, 'inputs').filter((eintrag) => eintrag
    && Array.isArray(eintrag.bausteine)
    && eintrag.bausteine.includes(baustein.id));
  if (treffer.length === 0) return null;

  return el('section', {}, [
    el('h2', { text: 'Inputs zu diesem Baustein' }),
    el('ul', { class: 'input-liste' }, treffer.map((eintrag) => el('li', { class: 'input-eintrag' }, [
      el('p', { class: 'input-titel' }, [
        el('span', { text: eintrag.titel || '' }),
        eintrag.pflicht ? etikett('Pflicht', 'pflicht') : null
      ]),
      eintrag.beschreibung ? el('p', { text: eintrag.beschreibung }) : null
    ])))
  ]);
}

// ===================================================== Hilfsmittel

function anfuegen(container, kinder) {
  container.append(...kinder.filter(Boolean));
}

function verweis(navigate, ziel, text) {
  return el('p', {}, [knopf({ text, icon: 'faecher', art: 'neben', onTap: () => navigate(ziel) })]);
}

function liste(objekt, feld) {
  return objekt && Array.isArray(objekt[feld]) ? objekt[feld] : [];
}

/** Fächer des Jahrgangs mit mindestens einem Slot, in Reihenfolge aus schule. */
function faecherMitSlot(jg, schule) {
  const vorhanden = new Set();
  for (const slot of liste(jg, 'slots')) {
    if (slot && slot.fach && slot.fach !== 'offen') vorhanden.add(slot.fach);
  }
  return liste(schule, 'faecher')
    .filter((fach) => fach && fach.id && vorhanden.has(fach.id))
    .slice()
    .sort((a, b) => (Number(a.reihenfolge) || 0) - (Number(b.reihenfolge) || 0));
}

function hatSlot(jg, fachId) {
  return liste(jg, 'slots').some((slot) => slot && slot.fach === fachId);
}

function fachAusListe(schule, fachId) {
  if (!fachId) return null;
  return liste(schule, 'faecher').find((eintrag) => eintrag && eintrag.id === fachId) || null;
}

function bausteinVon(jg, bausteinId) {
  if (!bausteinId) return null;
  return liste(jg, 'bausteine').find((eintrag) => eintrag && eintrag.id === bausteinId) || null;
}

/** Leerer Titel heißt "Thema folgt" (DATENMODELL 3, Blatt Bausteine). */
function titelVon(baustein) {
  return (baustein && baustein.titel) || 'Thema folgt';
}

/** "26.10. bis 20.11.2026" (AP-12). */
function zeitraumText(slot) {
  return formatDatum(slot.von, 'kurz') + ' bis ' + formatDatum(slot.bis, 'datum');
}

/** "16 Stunden" oder leer, wenn im Slot keine Stunden stehen. */
function stundenText(slot) {
  const stunden = Number(slot.stunden);
  if (!Number.isFinite(stunden) || stunden <= 0) return '';
  return stunden === 1 ? '1 Stunde' : stunden + ' Stunden';
}

function minutenSumme(stationen, art) {
  let summe = 0;
  for (const station of stationen) {
    if (!station) continue;
    if (art && station.art !== art) continue;
    const minuten = Number(station.minuten);
    if (Number.isFinite(minuten) && minuten > 0) summe += minuten;
  }
  return summe;
}

/**
 * Minuten als grobe Zeitangabe: unter einer Stunde in Minuten, darüber auf
 * halbe Stunden gerundet ("ca. 6 Stunden", AP-12).
 */
function dauerText(minuten) {
  if (!Number.isFinite(minuten) || minuten <= 0) return 'keine Angabe';
  if (minuten < 60) return 'ca. ' + minuten + ' Minuten';
  const stunden = Math.round(minuten / 30) / 2;
  const zahl = Number.isInteger(stunden) ? String(stunden) : String(stunden).replace('.', ',');
  return 'ca. ' + zahl + (stunden === 1 ? ' Stunde' : ' Stunden');
}

/** "5" aus jg.jgst, für Klassenangaben wie "nur 5A". */
function jgstText(jg) {
  const nummer = jg && jg.jgst;
  return nummer === null || nummer === undefined ? '' : String(nummer);
}
