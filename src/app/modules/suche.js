// Modul "Suche" (AP-18): Route #/suche, Ergebnisliste zur Anfrage in der URL
// (?q=...). Das Eingabefeld selbst steht im Kopf der App (main.js) und
// navigiert bei jeder Eingabe hierher.
//
// Regeln aus AP_ALLGEMEIN und ARCHITEKTUR 3.3/3.10:
// - Der Suchindex kommt aus dem Build (data/suche-jgN.json), hier steht kein
//   Satz aus den Quellen. Bewertung und Normalisierung stehen in
//   app/search.js, hier nur Gruppierung und Darstellung.
// - Trefferwörter werden per DOM als <mark> eingesetzt, nie per innerHTML
//   mit Daten (AP_ALLGEMEIN 4).
// - Andere Module können über ihr optionales `suche(ctx)` (ARCHITEKTUR 3.3)
//   zusätzliche Treffer beisteuern. Registriert bisher keines, die Suche
//   funktioniert auch ohne.
// - Kein Modul importiert ein anderes Modul (deshalb `getModules()` aus
//   module.js, nicht die einzelnen Modul-Dateien).

import { registerModule, getModules } from '../module.js';
import * as data from '../data.js';
import { hervorhebung, suche as sucheAusfuehren, zuWorten } from '../search.js';
import { el, knopf, leerZustand } from '../ui/components.js';

registerModule({
  id: 'suche',
  titel: 'Suche',
  icon: 'suche',
  nav: { position: 5, sichtbar: false },
  routes: [
    { pattern: '#/suche', render: renderSuche }
  ]
});

// Vorschläge bei leerer Suche (AP-18).
const VORSCHLAEGE = ['Helferkette', 'Abgabe', 'Stamm'];

// Reihenfolge und Beschriftung der Ergebnisgruppen. `typ` siehe
// tools/lib/suche.mjs. Unbekannte Typen (z. B. aus modul.suche) landen am
// Ende unter ihrem rohen Namen.
const TYP_GRUPPEN = [
  { typ: 'glossar', titel: 'Wörterbuch' },
  { typ: 'baustein', titel: 'Bausteine' },
  { typ: 'station', titel: 'Stationen' },
  { typ: 'input', titel: 'Inputs' },
  { typ: 'wissen', titel: 'Wissen' },
  { typ: 'abschnitt', titel: 'Aus den Wissensseiten' },
  { typ: 'faq', titel: 'Häufige Fragen' },
  { typ: 'stufe', titel: 'Stufen' }
];

async function renderSuche(container, params, ctx) {
  const abfrage = String((params && params.q) || '');
  const worte = zuWorten(abfrage);

  const kinder = [el('h1', { text: 'Suche', tabindex: '-1' })];

  if (worte.length === 0 || worte.join('').length < 2) {
    kinder.push(vorschlaege(ctx));
    anfuegen(container, kinder);
    return;
  }

  let eintraege;
  try {
    const index = await data.loadSuche(ctx.jg && ctx.jg.jgst);
    eintraege = (index && Array.isArray(index.eintraege)) ? index.eintraege : [];
  } catch (fehler) {
    kinder.push(el('p', { class: 'hinweis', text: 'Die Suche ist gerade nicht verfügbar.' }));
    anfuegen(container, kinder);
    return;
  }

  const alle = eintraege.concat(zusaetzlicheTreffer(ctx));
  const treffer = sucheAusfuehren(alle, abfrage);

  if (treffer.length === 0) {
    kinder.push(leerZustand({ text: 'Nichts gefunden für "' + abfrage + '".', motiv: 'keins' }));
    anfuegen(container, kinder);
    return;
  }

  for (const gruppe of gruppiereNachTyp(treffer)) {
    kinder.push(el('section', { class: 'suche-gruppe' }, [
      el('h2', { text: gruppe.titel }),
      el('ul', { class: 'suche-liste' }, gruppe.eintraege.map((eintrag) => treffereintrag(eintrag, worte, ctx)))
    ]));
  }

  anfuegen(container, kinder);
}

/** Sammelt zusätzliche Laufzeit-Treffer aus Modulen mit `suche(ctx)` (ARCHITEKTUR 3.3). */
function zusaetzlicheTreffer(ctx) {
  const gesammelt = [];
  for (const modul of getModules()) {
    if (typeof modul.suche !== 'function') continue;
    try {
      const treffer = modul.suche(ctx);
      if (Array.isArray(treffer)) gesammelt.push(...treffer.filter(Boolean));
    } catch (fehler) {
      // Ein fehlerhaftes Modul darf die Suche nicht abbrechen.
    }
  }
  return gesammelt;
}

/** Ein Ergebnis: tippbarer Titel, darunter der Textausschnitt, beides mit Hervorhebung. */
function treffereintrag(eintrag, worte, ctx) {
  const { navigate } = ctx;
  const kinder = [
    el('button', {
      type: 'button',
      class: 'suche-eintrag-titel',
      onclick: () => navigate(eintrag.route)
    }, hervorgehobeneKnoten(eintrag.titel, worte))
  ];
  if (eintrag.text) {
    kinder.push(el('p', { class: 'suche-eintrag-text' }, hervorgehobeneKnoten(eintrag.text, worte)));
  }
  return el('li', { class: 'suche-eintrag' }, kinder);
}

/** Baut aus hervorhebung() echte Knoten: Treffer als <mark>, Rest als Text. */
function hervorgehobeneKnoten(text, worte) {
  return hervorhebung(text, worte).map((stueck) => (stueck.treffer ? el('mark', { text: stueck.text }) : stueck.text));
}

function gruppiereNachTyp(treffer) {
  const nachTyp = new Map();
  for (const eintrag of treffer) {
    const liste = nachTyp.get(eintrag.typ) || [];
    liste.push(eintrag);
    nachTyp.set(eintrag.typ, liste);
  }

  const gruppen = [];
  for (const definition of TYP_GRUPPEN) {
    const liste = nachTyp.get(definition.typ);
    if (liste && liste.length > 0) gruppen.push({ titel: definition.titel, eintraege: liste });
  }
  for (const [typ, liste] of nachTyp) {
    if (!TYP_GRUPPEN.some((definition) => definition.typ === typ)) {
      gruppen.push({ titel: typ, eintraege: liste });
    }
  }
  return gruppen;
}

function vorschlaege(ctx) {
  const { navigate } = ctx;
  return el('div', { class: 'suche-vorschlaege' }, [
    el('p', { text: 'Zum Beispiel:' }),
    el('div', { class: 'suche-vorschlaege-liste' }, VORSCHLAEGE.map((wort) => knopf({
      text: wort,
      art: 'neben',
      onTap: () => navigate('#/suche?q=' + encodeURIComponent(wort))
    })))
  ]);
}

function anfuegen(container, kinder) {
  container.append(...kinder.filter(Boolean));
}
