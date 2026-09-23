// Musterseite (#/muster). Zeigt alle Komponenten, alle Fachbadges, alle
// Icons, die drei Tonlagen und beide Farbschemata nebeneinander.
//
// Die Seite ist nur zum Prüfen da: main.js meldet sie ausschliesslich mit
// ?debug=1 an, sie steht nicht in content/index.json und nicht in der
// Navigation (nav.sichtbar false).
//
// Alle Beispiele sind als Beispiel gekennzeichnet oder kommen aus den echten
// Daten des Jahrgangs. Hier wird kein Termin, kein Kürzel und kein
// Bausteintitel erfunden (AP_ALLGEMEIN, Regel 6).

import { registerModule } from '../module.js';
import { addDays, heute as heuteDatum, toISODate } from '../dates.js';
import { FACH_ICON_NAMEN, ICON_NAMEN, icon } from '../ui/icons.js';
import { hakenAnimation, reduziert } from '../ui/motion.js';
import {
  countdown, el, etikett, fachBadge, fortschritt, hinweis, karte, knopf, leer,
  leerZustand, leiste, segment, stationenTabelle, statusPunkt, stufenBaum,
  tagKarte, terminZeile
} from '../ui/components.js';

registerModule({
  id: 'muster',
  titel: 'Muster',
  icon: 'zahnrad',
  nav: { position: 900, sichtbar: false },
  routes: [
    { pattern: '#/muster', render: renderMuster }
  ]
});

const TONLAGEN = [
  { id: 'verspielt', text: 'verspielt (Jg 5)' },
  { id: 'klar', text: 'klar (Jg 6)' },
  { id: 'sachlich', text: 'sachlich (Jg 7+)' }
];

const SCHEMATA = [
  { id: 'system', text: 'wie das Gerät' },
  { id: 'hell', text: 'hell' },
  { id: 'dunkel', text: 'dunkel' }
];

// Beispielfächer, falls die Musterseite ohne geladene Schuldaten läuft.
// Farben, Kürzel und Symbole stehen so in DESIGN 2.2.
const FAECHER_ERSATZ = [
  { id: 'ma', name: 'Mathematik', kurz: 'Ma', farbe: 'ma', symbol: 'fach-ma' },
  { id: 'de', name: 'Deutsch', kurz: 'De', farbe: 'de', symbol: 'fach-de' },
  { id: 'en', name: 'Englisch', kurz: 'En', farbe: 'en', symbol: 'fach-en' },
  { id: 'bio', name: 'Biologie', kurz: 'Bio', farbe: 'bio', symbol: 'fach-bio' },
  { id: 'geo', name: 'Geografie', kurz: 'Geo', farbe: 'geo', symbol: 'fach-geo' },
  { id: 'fvu', name: 'Fächerverbindend', kurz: 'FvU', farbe: 'fvu', symbol: 'zahnrad' },
  { id: 'offen', name: 'Fach offen', kurz: '?', farbe: 'offen', symbol: 'fragezeichen' }
];

let urTon = null;
let aufraeumenGesetzt = false;

function renderMuster(container, params = {}, ctx = null) {
  const schule = ctx && ctx.schule ? ctx.schule : { faecher: FAECHER_ERSATZ };
  const faecher = Array.isArray(schule.faecher) && schule.faecher.length > 0
    ? schule.faecher
    : FAECHER_ERSATZ;
  // "offen" steht nicht in schule.xlsx, gehoert aber zum Farbsatz (DESIGN 2.2).
  const alleFaecher = faecher.some((fach) => fach.farbe === 'offen')
    ? faecher
    : faecher.concat(FAECHER_ERSATZ[FAECHER_ERSATZ.length - 1]);
  const jg = ctx && ctx.jg ? ctx.jg : null;
  const jetzt = ctx && ctx.heute ? ctx.heute : heuteDatum();

  if (urTon === null) urTon = document.body.dataset.ton || '';
  if (!document.body.dataset.ton) document.body.dataset.ton = 'klar';
  setzeAufraeumen();

  // Tonlage, Farbschema und Prüfhilfe lassen sich auch über die Adresse
  // vorgeben, z. B. #/muster?ton=sachlich&schema=dunkel&touch=1. Das macht
  // die Prüfung wiederholbar (Screenshots im Bericht).
  const zustand = {
    ton: TONLAGEN.some((eintrag) => eintrag.id === params.ton)
      ? params.ton
      : document.body.dataset.ton,
    schema: SCHEMATA.some((eintrag) => eintrag.id === params.schema)
      ? params.schema
      : document.documentElement.dataset.farbschema || 'system',
    touch: params.touch === '1'
  };

  const schalterHalter = el('div');
  const buehne = el('div');
  const flaeche = el('div', { class: 'muster' }, [schalterHalter, buehne]);
  container.append(
    el('h1', { text: 'Musterseite' }),
    el('p', {
      text: 'Alle Bausteine der Oberfläche auf einen Blick. Diese Seite ist nur '
        + 'zum Prüfen da und nur mit ?debug=1 erreichbar.'
    }),
    flaeche
  );

  zeichne();

  function zeichne() {
    document.body.dataset.ton = zustand.ton;
    // Die Schalter werden mitgezeichnet, damit sie zeigen, was gerade gilt.
    leer(schalterHalter).append(schalter(zustand, zeichne));
    if (zustand.schema === 'system') {
      delete document.documentElement.dataset.farbschema;
    } else {
      document.documentElement.dataset.farbschema = zustand.schema;
    }
    flaeche.className = 'muster' + (zustand.touch ? ' muster--touch' : '');
    leer(buehne);
    buehne.append(
      abschnittFarben(),
      abschnittSchrift(),
      abschnittIcons(),
      abschnittBadges(alleFaecher),
      abschnittKarten(faecher, jetzt),
      abschnittWoche(faecher, jetzt, schule),
      abschnittTermine(schule),
      abschnittBedienung(),
      abschnittMeldungen(),
      abschnittStationen(jg),
      abschnittStufen(schule),
      abschnittBewegung()
    );
  }
}

// ------------------------------------------------------------------ Schalter

function schalter(zustand, zeichne) {
  const tonWahl = segment(TONLAGEN, zustand.ton, (id) => { zustand.ton = id; zeichne(); });
  const schemaWahl = segment(SCHEMATA, zustand.schema, (id) => { zustand.schema = id; zeichne(); });
  const touchKnopf = knopf({
    text: 'Touchziele zeigen',
    icon: 'plan',
    art: 'neben',
    onTap: () => { zustand.touch = !zustand.touch; zeichne(); }
  });

  return el('div', { class: 'muster-schalter' }, [
    el('div', {}, [el('p', { class: 'muster-marke', text: 'Tonlage' }), tonWahl]),
    el('div', {}, [el('p', { class: 'muster-marke', text: 'Farben' }), schemaWahl]),
    el('div', {}, [el('p', { class: 'muster-marke', text: 'Prüfhilfe' }), touchKnopf])
  ]);
}

function block(titel, kinder) {
  return el('section', { class: 'muster-block' }, [
    el('h2', { text: titel }),
    el('div', { class: 'muster-inhalt' }, kinder)
  ]);
}

// ------------------------------------------------------------------ Farben

const FARB_PROBEN = [
  ['--c-teal', 'Teal'],
  ['--c-teal-dunkel', 'Teal dunkel'],
  ['--c-teal-hell', 'Teal hell'],
  ['--c-navy', 'Navy'],
  ['--c-text-2', 'Nebentext'],
  ['--c-gold', 'Gold'],
  ['--c-gold-dunkel', 'Gold dunkel'],
  ['--c-grund', 'Grund'],
  ['--c-karte', 'Karte'],
  ['--c-linie', 'Linie']
];

function abschnittFarben() {
  const proben = FARB_PROBEN.map(([token, name]) => {
    const feld = el('span', { class: 'muster-farbe-feld' });
    feld.style.background = 'var(' + token + ')';
    return el('div', { class: 'muster-farbe' }, [
      feld,
      el('span', { class: 'text-klein', text: name }),
      el('code', { class: 'text-klein text-neben', text: token })
    ]);
  });
  return block('Farben', [el('div', { class: 'muster-farben' }, proben)]);
}

// ------------------------------------------------------------------ Schrift

function abschnittSchrift() {
  return block('Schrift', [
    el('p', { class: 'muster-typ-display', text: 'Display 34' }),
    el('p', { class: 'muster-typ-h1', text: 'Überschrift 1 (28)' }),
    el('p', { class: 'muster-typ-h2', text: 'Überschrift 2 (22)' }),
    el('p', { class: 'muster-typ-h3', text: 'Überschrift 3 (18)' }),
    el('p', { text: 'Fließtext (17): Hier steht ein Beispielsatz, damit du die Zeilenlänge siehst. Mehr als 70 Zeichen soll eine Zeile nicht haben.' }),
    el('p', { class: 'text-klein text-neben', text: 'Kleintext (14) für Datum und Nebensachen' }),
    el('p', {}, [etikett('Etikett (12)', 'neutral')]),
    el('p', { class: 'zahl', text: '0123456789 tabellarische Ziffern' })
  ]);
}

// ------------------------------------------------------------------ Icons

function abschnittIcons() {
  const eigene = ICON_NAMEN.map((name) => el('div', { class: 'muster-icon' }, [
    icon(name, { groesse: 24 }),
    el('code', { class: 'text-klein', text: name })
  ]));
  const fach = FACH_ICON_NAMEN.map((name) => el('div', { class: 'muster-icon' }, [
    icon(name, { groesse: 32 }),
    el('code', { class: 'text-klein', text: name })
  ]));
  return block('Icons', [
    el('p', { class: 'text-klein text-neben', text: 'Eigene Icons, 24 x 24, Strich 2.' }),
    el('div', { class: 'muster-icons' }, eigene),
    el('p', { class: 'text-klein text-neben', text: 'Fachsymbole, 96 x 96, gefüllt.' }),
    el('div', { class: 'muster-icons' }, fach)
  ]);
}

// ------------------------------------------------------------------ Badges

function abschnittBadges(faecher) {
  const reihe = (groesse) => el('div', { class: 'muster-reihe' },
    faecher.map((fach) => fachBadge(fach, { groesse })));

  return block('Fachbadges', [
    el('p', { class: 'text-klein text-neben', text: 'Größe s' }),
    reihe('s'),
    el('p', { class: 'text-klein text-neben', text: 'Größe m' }),
    reihe('m'),
    el('p', { class: 'text-klein text-neben', text: 'Größe l' }),
    reihe('l'),
    el('p', {
      class: 'text-klein text-neben',
      text: 'Jeder Badge trägt Symbol und Kürzel, damit Farbe allein nie entscheidet.'
    })
  ]);
}

// ------------------------------------------------------------------ Karten

const ZUSTAENDE = ['normal', 'laeuft', 'heute', 'kommt', 'vorbei'];

function abschnittKarten(faecher, jetzt) {
  const proFach = faecher.map((fach) => karte({
    titel: 'Beispielkarte ' + fach.name,
    unter: 'So liegt die Fachfarbe in dieser Tonlage.',
    fach,
    kinder: [el('p', { class: 'text-klein', text: 'Platzhaltertext, keine echten Inhalte.' })]
  }));

  const zustaende = ZUSTAENDE.map((zustand) => karte({
    titel: 'Zustand: ' + zustand,
    unter: 'Beispielkarte',
    fach: faecher[0],
    zustand,
    etiketten: zustand === 'heute' ? [etikett('Heute', 'heute')] : [],
    kinder: [el('p', { class: 'text-klein', text: 'Platzhaltertext.' })]
  }));

  const tappbar = karte({
    titel: 'Karte zum Tippen',
    unter: 'Der Titel ist ein Knopf, die ganze Karte reagiert auf Tippen.',
    fach: faecher[1] || faecher[0],
    onTap: () => {},
    kinder: [
      countdown({ bis: toISODate(addDays(jetzt, 12)), label: 'bis zur Abgabe', schultage: 8 }),
      fortschritt({ von: toISODate(addDays(jetzt, -9)), bis: toISODate(addDays(jetzt, 12)), heute: jetzt })
    ]
  });

  return block('Karten', [
    el('div', { class: 'karten-reihe' }, proFach),
    el('h3', { text: 'Zustände' }),
    el('div', { class: 'karten-reihe' }, zustaende),
    el('h3', { text: 'Mit Countdown und Zeitbalken' }),
    tappbar
  ]);
}

// ------------------------------------------------------------------ Woche

function abschnittWoche(faecher, jetzt, schule) {
  const montag = addDays(jetzt, -((jetzt.getDay() + 6) % 7));
  const tage = [0, 1, 2, 3, 4].map((versatz) => {
    const tag = addDays(montag, versatz);
    const istHeute = toISODate(tag) === toISODate(jetzt);
    const termine = versatz % 2 === 0
      ? [{ art: 'input', fach: faecher[versatz % faecher.length].id, kuerzel: 'TEST', pflicht: true }]
      : [];
    return tagKarte({ datum: tag, termine, istHeute, schule });
  });

  return block('Wochenraster', [
    el('p', { class: 'text-klein text-neben', text: 'Fünf Tageskarten, heute in Gold. Kürzel TEST ist ein Platzhalter.' }),
    el('div', { class: 'wochenraster' }, tage)
  ]);
}

// ------------------------------------------------------------------ Termine

function abschnittTermine(schule) {
  const fachId = Array.isArray(schule.faecher) && schule.faecher[0] ? schule.faecher[0].id : 'bio';
  return block('Terminzeilen', [
    terminZeile({ art: 'input', fach: fachId, kuerzel: 'TEST', klasse: 'A', station: 9, pflicht: true }, schule),
    terminZeile({ art: 'coaching', kuerzel: 'TEST' }, schule),
    terminZeile({ art: 'sonstiges', text: 'Beispieltermin ohne Fach' }, schule),
    terminZeile({ art: 'entfall', text: 'Beispiel: fällt aus' }, schule)
  ]);
}

// ------------------------------------------------------------------ Bedienung

function abschnittBedienung() {
  return block('Bedienelemente', [
    el('div', { class: 'knopf-reihe' }, [
      knopf({ text: 'Hauptknopf', icon: 'haken', art: 'haupt', onTap: () => {} }),
      knopf({ text: 'Nebenknopf', icon: 'pfeil-rechts', art: 'neben', onTap: () => {} }),
      knopf({ text: 'Textknopf', art: 'text', onTap: () => {} }),
      knopf({ text: 'Gesperrt', art: 'neben', deaktiviert: true })
    ]),
    el('h3', { text: 'Umschalter' }),
    segment([{ id: 'zeit', text: 'Zeitleiste' }, { id: 'fach', text: 'Nach Fach' }], 'zeit', () => {}),
    el('h3', { text: 'Etiketten' }),
    el('div', { class: 'muster-reihe' }, [
      etikett('Heute', 'heute'),
      etikett('Pflicht', 'pflicht'),
      etikett('Wahl', 'wahl'),
      etikett('Vorläufig', 'vorlaeufig'),
      etikett('Neutral', 'neutral')
    ]),
    el('h3', { text: 'Status' }),
    el('div', { class: 'muster-reihe' }, [
      statusPunkt('offline'),
      statusPunkt('update'),
      statusPunkt('0.1.0')
    ])
  ]);
}

// ------------------------------------------------------------------ Meldungen

function abschnittMeldungen() {
  return block('Hinweise und Leisten', [
    hinweis({ art: 'info', text: 'Beispiel für einen Hinweis.' }),
    hinweis({ art: 'warnung', text: 'Beispiel für eine Warnung.', aktion: { text: 'Mehr dazu', onTap: () => {} } }),
    hinweis({ art: 'erfolg', text: 'Beispiel für eine Erfolgsmeldung.' }),
    leiste({ text: 'Beispiel: eine neue Version liegt bereit.', aktion: { text: 'Neu laden', onTap: () => {} } }),
    el('h3', { text: 'Leerzustände' }),
    el('div', { class: 'karten-reihe' }, [
      leerZustand({ text: 'Beispiel: hier läuft gerade nichts.', motiv: 'zahnrad' }),
      leerZustand({ text: 'Beispiel: hier gibt es noch nichts zu wissen.', motiv: 'gluehbirne' }),
      leerZustand({ text: 'Beispiel ohne Motiv.', motiv: 'keins' })
    ])
  ]);
}

// ------------------------------------------------------------------ Stationen

function abschnittStationen(jg) {
  const echte = jg && Array.isArray(jg.bausteine)
    ? (jg.bausteine.find((baustein) => baustein.stationen && baustein.stationen.length > 0) || null)
    : null;

  const stationen = echte ? echte.stationen.slice(0, 4) : [
    { nr: 1, titel: 'Beispielstation Pflicht', art: 'pflicht', minuten: 20, niveau: 1, material: 'A1' },
    { nr: 2, titel: 'Beispielstation Wahl', art: 'wahl', minuten: 30, niveau: 2, material: 'A2' },
    { nr: 3, titel: 'Beispielstation Niveau 3', art: 'wahl', minuten: 45, niveau: 3, material: '' }
  ];

  return block('Stationentabelle', [
    el('p', {
      class: 'text-klein text-neben',
      text: echte
        ? 'Echte Stationen aus dem geladenen Jahrgang.'
        : 'Platzhalterzeilen, es sind keine Jahrgangsdaten geladen.'
    }),
    stationenTabelle(stationen)
  ]);
}

// ------------------------------------------------------------------ Stufen

function abschnittStufen(schule) {
  const stufen = Array.isArray(schule.stufen) && schule.stufen.length === 3 ? schule.stufen : undefined;
  return block('Stufenbaum', [
    el('p', { class: 'text-klein text-neben', text: 'Wurzel, Stamm, Krone. Stufe 2 ist hier als Ziel hervorgehoben.' }),
    stufenBaum({ hervorheben: 2, stufen, onEbene: () => {} })
  ]);
}

// ------------------------------------------------------------------ Bewegung

function abschnittBewegung() {
  const haken = icon('haken', { groesse: 48, label: 'Haken' });
  const halter = el('div', { class: 'muster-haken' }, [haken]);
  return block('Bewegung', [
    el('p', {
      class: 'text-klein text-neben',
      text: reduziert()
        ? 'Das Gerät steht auf "Bewegung reduzieren". Der Haken erscheint ohne Animation.'
        : 'Der Haken zeichnet sich in 250 ms, dazu kommt der Effekt der Tonlage.'
    }),
    halter,
    knopf({ text: 'Haken zeigen', art: 'neben', onTap: () => { hakenAnimation(haken); } })
  ]);
}

// ------------------------------------------------------------------ Aufräumen

// Beim Verlassen der Musterseite gelten wieder Tonlage und Farbschema der App.
function setzeAufraeumen() {
  if (aufraeumenGesetzt) return;
  aufraeumenGesetzt = true;
  window.addEventListener('hashchange', () => {
    if (location.hash.startsWith('#/muster')) return;
    if (urTon) {
      document.body.dataset.ton = urTon;
    } else {
      delete document.body.dataset.ton;
    }
    delete document.documentElement.dataset.farbschema;
  });
}
