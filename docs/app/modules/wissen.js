// Modul "Wissen" (AP-16): Inhaltsverzeichnis (#/wissen), Wörterbuch
// (#/wissen/glossar) und einzelne Wissensseite (#/wissen/:seiteId).
//
// Regeln aus AP_ALLGEMEIN und ARCHITEKTUR 3.3/3.4:
// - Reine Anzeige. Alle Texte stehen in content/wissen/*.md, hier steht kein
//   Satz aus den Quellen. Was das Modul selbst beschriftet, sind Namen von
//   Bereichen und Knöpfen.
// - Das HTML der Seiten kommt aus dem Build (tools/lib/markdown.mjs). Es ist
//   die eine erlaubte Ausnahme von "kein innerHTML" (AP_ALLGEMEIN 4): rohes
//   HTML und fremde Links hat der Build schon entfernt, Links zeigen nur noch
//   auf Routen der App. Alles andere auf dieser Seite baut ui/components.js.
// - Kein Modul importiert ein anderes Modul.
// - Entwürfe zeigt die App nur mit ?vorschau=1 (ctx.vorschau), und auch nur
//   dann, wenn der Build mit --vorschau gelaufen ist (DATENMODELL 4).

import { registerModule } from '../module.js';
import { icon } from '../ui/icons.js';
import { el, etikett, karte, knopf, leer, leerZustand } from '../ui/components.js';

registerModule({
  id: 'wissen',
  titel: 'Wissen',
  icon: 'wissen',
  nav: { position: 60, sichtbar: true },
  routes: [
    { pattern: '#/wissen', render: renderIndex },
    // Muss vor '#/wissen/:seiteId' stehen, sonst gewinnt das Muster mit dem
    // Platzhalter (module.js prüft die Routen in dieser Reihenfolge).
    { pattern: '#/wissen/glossar', render: renderGlossar },
    { pattern: '#/wissen/:seiteId', render: renderSeite }
  ]
});

// Reihenfolge und Überschriften der Bereiche (AP-16). Die Bereichsnamen aus
// DATENMODELL 4 sind kurz und technisch, auf dem Bildschirm steht eine
// Beschriftung in der Ansprache der App.
const BEREICHE = [
  { id: 'hilfe', titel: 'Wenn du Hilfe brauchst' },
  { id: 'soul', titel: 'Rund um SOUL' },
  { id: 'ablauf', titel: 'So läuft SOUL ab' },
  { id: 'stufen', titel: 'Stufen und Regeln' },
  { id: 'faq', titel: 'Häufige Fragen' },
  { id: 'glossar', titel: 'Wörterbuch' }
];

// Ab wie vielen Abschnitten eine Seite ein Inhaltsverzeichnis bekommt (AP-16).
const IVZ_AB = 3;

// ===================================================== Route #/wissen

function renderIndex(container, params, ctx) {
  const seiten = sichtbareSeiten(ctx);
  const glossar = glossarListe(ctx);

  const kinder = [el('h1', { text: 'Wissen', tabindex: '-1' })];

  if (seiten.length === 0 && glossar.length === 0) {
    kinder.push(leerZustand({
      text: 'Die Wissensseiten entstehen gerade. Bald steht hier mehr.',
      motiv: 'gluehbirne'
    }));
    anfuegen(container, kinder);
    return;
  }

  for (const bereich of BEREICHE) {
    if (bereich.id === 'glossar') {
      if (glossar.length === 0) continue;
      kinder.push(el('section', {}, [
        el('h2', { text: bereich.titel }),
        el('div', { class: 'wissen-karten' }, [glossarKarte(glossar, ctx)])
      ]));
      continue;
    }
    const eigene = seiten.filter((seite) => seite.bereich === bereich.id);
    if (eigene.length === 0) continue;
    kinder.push(el('section', {}, [
      el('h2', { text: bereich.titel }),
      el('div', { class: 'wissen-karten' }, eigene.map((seite) => seitenKarte(seite, ctx)))
    ]));
  }

  anfuegen(container, kinder);
}

/** Eine Karte je Wissensseite. Die ganze Karte führt auf die Seite. */
function seitenKarte(seite, ctx) {
  const { navigate } = ctx;
  return karte({
    titel: seite.titel || seite.id,
    onTap: () => navigate('#/wissen/' + seite.id),
    etiketten: [entwurfEtikett(seite, ctx)].filter(Boolean)
  });
}

/** Das Wörterbuch bekommt eine eigene Karte (AP-16). */
function glossarKarte(glossar, ctx) {
  const { navigate } = ctx;
  return karte({
    titel: 'Begriffe von A bis Z',
    unter: glossar.length + (glossar.length === 1 ? ' Eintrag' : ' Einträge'),
    onTap: () => navigate('#/wissen/glossar')
  });
}

// ===================================================== Route #/wissen/:seiteId

function renderSeite(container, params, ctx) {
  const { navigate } = ctx;
  const seiteId = params && params.seiteId;
  const seite = sichtbareSeiten(ctx).find((eintrag) => eintrag.id === seiteId) || null;

  if (!seite) {
    anfuegen(container, [
      el('h1', { text: 'Seite nicht gefunden', tabindex: '-1' }),
      el('p', { text: 'Diese Wissensseite gibt es nicht.' }),
      zurueckZeile(navigate)
    ]);
    return;
  }

  const abschnitte = Array.isArray(seite.abschnitte) ? seite.abschnitte : [];
  const inhalt = seitenInhalt(seite);

  anfuegen(container, [
    el('header', { class: 'wissen-kopf' }, [
      el('h1', { text: seite.titel || seite.id, tabindex: '-1' }),
      entwurfEtikett(seite, ctx)
    ]),
    abschnitte.length > IVZ_AB ? inhaltsverzeichnis(abschnitte, inhalt) : null,
    inhalt,
    zurueckZeile(navigate)
  ]);
}

/**
 * Der Textteil einer Seite.
 * Das HTML stammt aus dem Build und ist die Ausnahme von "kein innerHTML"
 * (siehe Kopf der Datei). Danach greift das Modul nur noch strukturell ein:
 * Tabellen bekommen einen scrollbaren Rahmen und `th scope` (DESIGN 11),
 * die Helferkette bekommt ihr eigenes Layout (AP-16).
 */
function seitenInhalt(seite) {
  const bereich = el('div', { class: 'wissen-text' });
  bereich.innerHTML = String(seite.html || '');
  richteTabellen(bereich);
  if (seite.id === 'helferkette') alsKette(bereich);
  return bereich;
}

/**
 * Inhaltsverzeichnis. Es sind Knöpfe, keine Links: Die App läuft über den
 * Hash, ein zweites '#' im Hash würde die Route zerstören. Der Knopf scrollt
 * zur Überschrift und setzt den Fokus dorthin, damit Tastatur und VoiceOver
 * an derselben Stelle weiterlesen.
 */
function inhaltsverzeichnis(abschnitte, bereich) {
  return el('nav', { class: 'wissen-ivz', 'aria-label': 'Auf dieser Seite' }, [
    el('p', { class: 'wissen-ivz-titel text-klein', text: 'Auf dieser Seite' }),
    el('ol', {}, abschnitte.map((abschnitt) => el('li', {}, [
      knopf({
        text: abschnitt.titel,
        art: 'text',
        onTap: () => springeZu(bereich.querySelector('#' + cssId(abschnitt.anker)))
      })
    ])))
  ]);
}

// ===================================================== Route #/wissen/glossar

function renderGlossar(container, params, ctx) {
  const { navigate } = ctx;
  const eintraege = glossarListe(ctx);

  if (eintraege.length === 0) {
    anfuegen(container, [
      el('h1', { text: 'Wörterbuch', tabindex: '-1' }),
      leerZustand({ text: 'Im Wörterbuch steht noch kein Begriff.', motiv: 'gluehbirne' }),
      zurueckZeile(navigate)
    ]);
    return;
  }

  const gruppen = nachBuchstaben(eintraege);
  const bereich = el('div', { class: 'glossar' });

  for (const gruppe of gruppen) {
    bereich.append(el('h2', {
      class: 'glossar-buchstabe',
      id: 'buchstabe-' + zuAnker(gruppe.buchstabe),
      text: gruppe.buchstabe
    }));
    for (const eintrag of gruppe.eintraege) {
      // Der Anker je Begriff ist für die Suche gedacht (AP-16), deshalb steht
      // er an der Überschrift und nicht am Absatz.
      bereich.append(el('h3', {
        class: 'glossar-begriff',
        id: 'begriff-' + zuAnker(eintrag.begriff),
        text: eintrag.begriff
      }));
      bereich.append(el('p', { class: 'glossar-erklaerung', text: eintrag.text || '' }));
    }
  }

  anfuegen(container, [
    el('h1', { text: 'Wörterbuch', tabindex: '-1' }),
    el('p', { text: 'Begriffe aus SOUL, kurz erklärt.' }),
    sprungbuchstaben(gruppen, bereich),
    bereich,
    zurueckZeile(navigate)
  ]);
}

/** Leiste mit den Anfangsbuchstaben. Knöpfe, aus demselben Grund wie im IVZ. */
function sprungbuchstaben(gruppen, bereich) {
  return el('nav', { class: 'glossar-sprung', 'aria-label': 'Zu einem Buchstaben springen' },
    gruppen.map((gruppe) => el('button', {
      type: 'button',
      class: 'glossar-sprung-knopf',
      'aria-label': 'Zum Buchstaben ' + gruppe.buchstabe,
      text: gruppe.buchstabe,
      onclick: () => springeZu(bereich.querySelector('#buchstabe-' + cssId(zuAnker(gruppe.buchstabe))))
    })));
}

/** Begriffe alphabetisch, gruppiert nach ihrem ersten Buchstaben. */
function nachBuchstaben(eintraege) {
  const sortiert = eintraege.slice().sort((a, b) => a.begriff.localeCompare(b.begriff, 'de'));
  const gruppen = [];
  for (const eintrag of sortiert) {
    const buchstabe = ersterBuchstabe(eintrag.begriff);
    const letzte = gruppen[gruppen.length - 1];
    if (letzte && letzte.buchstabe === buchstabe) {
      letzte.eintraege.push(eintrag);
    } else {
      gruppen.push({ buchstabe, eintraege: [eintrag] });
    }
  }
  return gruppen;
}

// "lernlog" steht unter L, "Ärger" stünde unter A (wie im Wörterbuch).
function ersterBuchstabe(begriff) {
  const zeichen = String(begriff).trim().slice(0, 1).toLocaleUpperCase('de');
  const ohneUmlaut = { 'Ä': 'A', 'Ö': 'O', 'Ü': 'U' }[zeichen];
  return ohneUmlaut || zeichen || '?';
}

// ===================================================== Helferkette

/**
 * Macht aus der nummerierten Liste der Seite eine senkrechte Kette mit
 * Nummern und Pfeilen (AP-16).
 * Vorlesehilfen lesen "Schritt 1 von 5, Nachdenken ...": Die sichtbare Zahl
 * ist versteckt (aria-hidden), davor steht derselbe Satz als reiner Text.
 */
function alsKette(bereich) {
  const liste = bereich.querySelector('ol');
  if (!liste) return;
  const schritte = Array.from(liste.children).filter((kind) => kind.tagName === 'LI');
  if (schritte.length === 0) return;

  liste.classList.add('helferkette');
  schritte.forEach((schritt, i) => {
    const nummer = i + 1;
    const text = el('div', { class: 'helferkette-text' });
    while (schritt.firstChild) text.append(schritt.firstChild);
    text.prepend(el('span', {
      class: 'nur-vorlesen',
      text: 'Schritt ' + nummer + ' von ' + schritte.length + ', '
    }));

    leer(schritt);
    schritt.className = 'helferkette-schritt';
    schritt.append(
      el('span', { class: 'helferkette-nummer', 'aria-hidden': 'true', text: String(nummer) }),
      text
    );
    if (nummer < schritte.length) {
      schritt.append(el('span', { class: 'helferkette-pfeil', 'aria-hidden': 'true' }, [
        icon('pfeil-rechts', { groesse: 20 })
      ]));
    }
  });
}

// ===================================================== Hilfsmittel

function anfuegen(container, kinder) {
  container.append(...kinder.filter(Boolean));
}

function zurueckZeile(navigate) {
  return el('p', { class: 'wissen-zurueck' }, [
    knopf({ text: 'Zurück zum Wissen', icon: 'pfeil-links', art: 'neben', onTap: () => navigate('#/wissen') })
  ]);
}

/**
 * Seiten, die dieses Gerät sehen darf.
 * ctx.wissen ist laut ARCHITEKTUR 3.2 schon auf den Jahrgang gefiltert. Das
 * Modul filtert trotzdem selbst, damit die Regel aus DATENMODELL 4 an genau
 * einer weiteren Stelle nicht verloren gehen kann.
 */
function sichtbareSeiten(ctx) {
  const seiten = (ctx.wissen && Array.isArray(ctx.wissen.seiten)) ? ctx.wissen.seiten : [];
  const jgst = Number(ctx.jg && ctx.jg.jgst);
  return seiten.filter((seite) => Boolean(seite)
    && (seite.status !== 'entwurf' || ctx.vorschau === true)
    && giltFuerJahrgang(seite.jahrgaenge, jgst));
}

function giltFuerJahrgang(jahrgaenge, jgst) {
  if (jahrgaenge === undefined || jahrgaenge === null || jahrgaenge === '' || jahrgaenge === 'alle') return true;
  if (!Array.isArray(jahrgaenge)) return true;
  return jahrgaenge.map(Number).includes(jgst);
}

function glossarListe(ctx) {
  const liste = (ctx.wissen && Array.isArray(ctx.wissen.glossar)) ? ctx.wissen.glossar : [];
  return liste.filter((eintrag) => eintrag && eintrag.begriff);
}

/** Etikett "Entwurf", nur in der Vorschau (AP-16). */
function entwurfEtikett(seite, ctx) {
  if (seite.status !== 'entwurf' || ctx.vorschau !== true) return null;
  return etikett('Entwurf', 'entwurf');
}

/** Scrollt zu einem Element und setzt den Fokus dorthin. */
function springeZu(element) {
  if (!element) return;
  if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
  if (typeof element.scrollIntoView === 'function') element.scrollIntoView({ block: 'start' });
  try {
    element.focus({ preventScroll: true });
  } catch (fehler) {
    element.focus();
  }
}

/** Anker als CSS-Auswahl, damit querySelector auch mit Ziffern am Anfang geht. */
function cssId(anker) {
  const text = String(anker || '');
  if (typeof CSS !== 'undefined' && CSS && typeof CSS.escape === 'function') return CSS.escape(text);
  return text.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

/**
 * Anker aus einem Text: klein, ohne Umlaute, nur Buchstaben, Zahlen, Strich.
 * Gleiche Regel wie zuAnker in tools/lib/markdown.mjs, damit Anker aus dem
 * Build und Anker aus dem Wörterbuch dieselbe Form haben.
 */
function zuAnker(text) {
  const klein = String(text).toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  const anker = klein.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return anker === '' ? 'abschnitt' : anker;
}

/**
 * Tabellen im Seitentext: Kopfzellen bekommen `scope` (DESIGN 11), die
 * Tabelle einen Rahmen, der auf schmalen Geräten waagerecht scrollt. Der
 * Rahmen trägt tabindex, damit er auch mit Tastatur erreichbar ist (wie die
 * Stationentabelle in AP-12).
 */
function richteTabellen(bereich) {
  for (const zelle of bereich.querySelectorAll('th')) {
    if (!zelle.hasAttribute('scope')) {
      zelle.setAttribute('scope', zelle.closest('thead') ? 'col' : 'row');
    }
  }
  for (const tabelle of Array.from(bereich.querySelectorAll('table'))) {
    const rahmen = el('div', {
      class: 'wissen-tabelle-rahmen',
      tabindex: '0',
      role: 'group',
      'aria-label': 'Tabelle'
    });
    tabelle.replaceWith(rahmen);
    rahmen.append(tabelle);
  }
}
