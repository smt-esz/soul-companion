// Modul "Stufen" (AP-13): Graduierung (#/stufen) und "Was muss ich tun?"
// (#/stufen/aufstieg/:ziel).
//
// Regeln aus AP_ALLGEMEIN und ARCHITEKTUR 3.3:
// - Kein Wortlaut im Code. Die Rechte und Freiheiten stehen wörtlich in
//   content/wissen/stufe-1.md bis stufe-3.md (Quelle: A3-Übersicht), die
//   Kriterien und der Ablauf des Antrags in content/antrag.json. Hier stehen
//   nur Beschriftungen der Bedienung.
// - Reine Anzeige. Das Modul fragt nie "in welcher Stufe bist du" und
//   speichert nichts (AP-13, Akzeptanzkriterium 4). ctx.store wird nicht
//   angefasst.
// - Datum nur über dates.js, der früheste Aufstieg kommt aus
//   model.stufenInfo.
// - content/antrag.json steht nicht in ctx (ARCHITEKTUR 3.2), deshalb lädt
//   das Modul sie über data.loadAntrag() (ARCHITEKTUR 3.7), wie AP-14.

import { registerModule } from '../module.js';
import * as data from '../data.js';
import { formatDatum } from '../dates.js';
import * as model from '../model.js';
import { el, hinweis, karte, knopf, leer, leerZustand } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { markiereEbene, stufenBaum } from '../ui/stufenbaum.js';

registerModule({
  id: 'stufen',
  titel: 'Stufen',
  icon: 'stufen',
  nav: { position: 40, sichtbar: true },
  routes: [
    { pattern: '#/stufen', render: renderStufen },
    { pattern: '#/stufen/aufstieg/:ziel', render: renderAufstieg }
  ]
});

// Ein Icon je Abschnitt der Stufenseite, in der Reihenfolge aus AP-13:
// Lernprozess, Arbeiten mit anderen, Wahl der Lernorte. Die Icons sind
// Schmuck und werden nicht vorgelesen (DESIGN 6).
const ABSCHNITT_ICONS = ['zahnrad', 'personen', 'faecher'];

// Anker des Abschnitts, der auf die Aufstiegsseite gehört. Er kommt aus der
// Überschrift "So kommst du in die nächste Stufe" (AP-13). Findet sich der
// Anker nicht, gilt der letzte Abschnitt der Seite.
const AUFSTIEG_ANKER = 'so-kommst-du-in-die-naechste-stufe';

// Artikel für die Knopfbeschriftung "Was muss ich für den Stamm tun?" bzw.
// "... für die Krone tun?" (AP-13). Das ist Grammatik, kein Inhalt. Steht ein
// Name nicht in der Liste, bleibt der Artikel weg.
const ARTIKEL = { Stamm: 'den', Krone: 'die', Wurzel: 'die' };

// Beschriftung je Rolle auf der Aufstiegsseite (AP-13, Punkt 4). Sie ist
// ausführlicher als `rollen` in antrag.json, weil hier erklärt wird, wer was
// tut, und dort nur, wer gerade unterschreibt.
const ROLLEN_TEXT = {
  kind: () => 'Das machst du',
  mitschueler: (zielname) => 'Zwei Mitschüler:innen aus der Stufe ' + zielname,
  lernbegleitung: () => 'Eine Lernbegleitung deiner Wahl',
  klassenleitung: () => 'Deine Klassenleitung im Coaching'
};

// ===================================================== Route #/stufen

function renderStufen(container, params, ctx) {
  const stufen = stufenListe(ctx);

  const kinder = [
    el('h1', { text: 'Deine Stufen in SOUL', tabindex: '-1' }),
    el('p', { class: 'stufen-einleitung', text: 'Je höher deine Stufe, desto mehr Freiheit und desto mehr Verantwortung.' })
  ];

  const detailBereich = el('div', { class: 'stufen-details' });
  const baum = stufenBaum({
    stufen,
    gewaehlt: stufen[0].id,
    onEbene: (id) => {
      markiereEbene(baum, id);
      zeigeStufe(detailBereich, id, ctx, stufen);
    }
  });

  zeigeStufe(detailBereich, stufen[0].id, ctx, stufen);

  kinder.push(el('div', { class: 'stufen-layout' }, [
    el('div', { class: 'stufen-baum-feld' }, [baum]),
    detailBereich
  ]));

  kinder.push(aufstiegsKnoepfe(ctx, stufen));
  kinder.push(allgemeinAbschnitt(ctx));

  container.append(...kinder.filter(Boolean));
}

/** Die drei Abschnitte einer Stufenseite als Karten mit Icon. */
function zeigeStufe(bereich, stufeId, ctx, stufen) {
  leer(bereich);
  const stufe = stufen.find((eintrag) => String(eintrag.id) === String(stufeId)) || stufen[0];
  const seite = stufenSeite(ctx, stufe.id);

  bereich.append(el('h2', { class: 'stufen-details-titel' }, [
    icon(stufe.symbol || 'stufen', { groesse: 28 }),
    el('span', { text: 'Stufe ' + stufe.id + ': ' + stufe.name })
  ]));

  if (!seite) {
    bereich.append(leerZustand({
      text: 'Die Seite zu dieser Stufe ist noch nicht freigegeben.',
      motiv: 'gluehbirne'
    }));
    return;
  }

  const abschnitte = detailAbschnitte(seite);
  if (abschnitte.length === 0) {
    bereich.append(leerZustand({ text: 'Für diese Stufe steht noch kein Text bereit.', motiv: 'keins' }));
    return;
  }

  abschnitte.forEach((abschnitt, i) => {
    const inhalt = abschnittInhalt(seite, abschnitt.anker);
    bereich.append(karte({
      titel: abschnitt.titel,
      etiketten: [icon(ABSCHNITT_ICONS[i] || 'info', { groesse: 24 })],
      kinder: inhalt ? [inhalt] : []
    }));
  });
}

/** "Was muss ich für den Stamm tun?" je Stufe über der ersten. */
function aufstiegsKnoepfe(ctx, stufen) {
  const knoepfe = stufen
    .filter((stufe) => Number(stufe.id) > 1)
    .map((stufe) => knopf({
      text: 'Was muss ich für ' + mitArtikel(stufe.name) + ' tun?',
      icon: 'pfeil-rechts',
      art: 'haupt',
      onTap: () => ctx.navigate('#/stufen/aufstieg/' + stufe.id)
    }));
  if (knoepfe.length === 0) return null;
  return el('div', { class: 'stufen-knopfreihe' }, knoepfe);
}

/** Der Text aus stufen-allgemein.md, unten auf der Seite. */
function allgemeinAbschnitt(ctx) {
  const seite = seiteMitId(ctx, 'stufen-allgemein');
  if (!seite) return null;
  const inhalt = el('div', { class: 'stufen-allgemein wissen-text' });
  // Vom Build erzeugtes HTML, die eine erlaubte Ausnahme von "kein
  // innerHTML" (AP_ALLGEMEIN 4). Rohes HTML und fremde Links hat der Build
  // schon entfernt.
  inhalt.innerHTML = String(seite.html || '');
  return el('section', {}, [
    el('h2', { text: seite.titel || 'Rund um die Stufen' }),
    inhalt
  ]);
}

// ============================================ Route #/stufen/aufstieg/:ziel

async function renderAufstieg(container, params, ctx) {
  const stufen = stufenListe(ctx);
  const ziel = stufen.find((stufe) => String(stufe.id) === String(params && params.ziel));

  if (!ziel || Number(ziel.id) < 2) {
    container.append(
      el('h1', { text: 'Stufe nicht gefunden', tabindex: '-1' }),
      el('p', { text: 'Zu dieser Stufe gibt es keinen Aufstieg.' }),
      zurueckZeile(ctx.navigate)
    );
    return;
  }

  const config = await ladeAntrag();
  const stufeConfig = (config && config.stufen) ? config.stufen[String(ziel.id)] : null;
  const vorher = stufen.find((stufe) => Number(stufe.id) === Number(ziel.id) - 1) || null;

  container.append(...[
    el('header', { class: 'stufen-aufstieg-kopf' }, [
      el('h1', { text: 'So kommst du in die Stufe ' + ziel.name, tabindex: '-1' }),
      stufenBaum({ stufen, hervorheben: ziel.id, klein: true, beschriftung: 'Baum der drei Stufen, ' + ziel.name + ' hervorgehoben' })
    ]),
    wasKannstDuTun(ctx, vorher),
    kriterienAbschnitt(stufeConfig),
    ablaufAbschnitt(config, stufeConfig, ziel),
    terminAbschnitt(ctx),
    el('p', { class: 'stufen-start' }, [
      knopf({
        text: 'Antrag starten',
        icon: 'antrag',
        art: 'haupt',
        onTap: () => ctx.navigate('#/antrag')
      })
    ]),
    zurueckZeile(ctx.navigate)
  ].filter(Boolean));
}

/** Der Abschnitt "So kommst du in die nächste Stufe" aus der Stufe darunter. */
function wasKannstDuTun(ctx, vorher) {
  if (!vorher) return null;
  const seite = stufenSeite(ctx, vorher.id);
  const abschnitt = seite ? aufstiegAbschnitt(seite) : null;
  const inhalt = abschnitt ? abschnittInhalt(seite, abschnitt.anker) : null;

  return el('section', {}, [
    el('h2', { text: 'Was kannst du tun?' }),
    inhalt || hinweis({ art: 'info', text: 'Der Text dazu ist noch nicht freigegeben.' })
  ]);
}

/** Die Kriterien aus antrag.json, nur zum Lesen (AP-13: nicht ankreuzbar). */
function kriterienAbschnitt(stufeConfig) {
  const schritt = schritteVon(stufeConfig).find((eintrag) => Array.isArray(eintrag.kriterien));
  const kriterien = schritt ? schritt.kriterien : [];

  return el('section', {}, [
    el('h2', { text: 'Darauf achtet deine Lernbegleitung im Antrag' }),
    kriterien.length > 0
      ? el('ul', { class: 'stufen-kriterien' }, kriterien.map((text) => el('li', { text })))
      : hinweis({ art: 'info', text: 'Die Kriterien stehen noch nicht bereit.' })
  ]);
}

/** Die Schritte des Antrags in ihrer Reihenfolge, mit Rolle. */
function ablaufAbschnitt(config, stufeConfig, ziel) {
  const schritte = schritteVon(stufeConfig);
  if (schritte.length === 0) return null;

  return el('section', {}, [
    el('h2', { text: 'So läuft der Antrag' }),
    el('ol', { class: 'stufen-ablauf' }, schritte.map((schritt) => el('li', {}, [
      el('p', { class: 'stufen-ablauf-titel', text: schritt.titel || '' }),
      el('p', { class: 'text-klein text-neben', text: rollenText(schritt.rolle, ziel.name) })
    ]))),
    config && config.hinweisVersand
      ? hinweis({ art: 'info', text: String(config.hinweisVersand) })
      : null
  ].filter(Boolean));
}

/** "Aufsteigen kannst du frühestens ab 26.10.2026.", nur wenn das noch kommt. */
function terminAbschnitt(ctx) {
  const info = model.stufenInfo(ctx.jg, ctx.heute);
  if (!info.fruehesterAufstieg || info.aufstiegMoeglich) return null;
  return el('p', {
    class: 'stufen-termin',
    text: 'Aufsteigen kannst du frühestens ab ' + formatDatum(info.fruehesterAufstieg, 'datum') + '.'
  });
}

// ===================================================== Hilfsmittel

let antragVersprechen = null;

function ladeAntrag() {
  if (!antragVersprechen) antragVersprechen = data.loadAntrag().catch(() => ({}));
  return antragVersprechen;
}

function schritteVon(stufeConfig) {
  return stufeConfig && Array.isArray(stufeConfig.schritte) ? stufeConfig.schritte.filter(Boolean) : [];
}

function rollenText(rolle, zielname) {
  const bauer = ROLLEN_TEXT[rolle];
  return bauer ? bauer(zielname) : '';
}

/** Die drei Stufen aus schule.json, sonst die Namen aus DESIGN 8. */
function stufenListe(ctx) {
  const liste = ctx.schule && Array.isArray(ctx.schule.stufen) ? ctx.schule.stufen.filter(Boolean) : [];
  if (liste.length === 3) {
    return liste.slice().sort((a, b) => Number(a.id) - Number(b.id));
  }
  return [
    { id: 1, name: 'Wurzel', symbol: 'wurzel' },
    { id: 2, name: 'Stamm', symbol: 'stamm' },
    { id: 3, name: 'Krone', symbol: 'krone' }
  ];
}

function seiteMitId(ctx, id) {
  const seiten = (ctx.wissen && Array.isArray(ctx.wissen.seiten)) ? ctx.wissen.seiten : [];
  return seiten.find((seite) => seite && seite.id === id) || null;
}

function stufenSeite(ctx, stufeId) {
  return seiteMitId(ctx, 'stufe-' + stufeId);
}

/** Alle Abschnitte einer Stufenseite außer dem für die Aufstiegsseite. */
function detailAbschnitte(seite) {
  const alle = Array.isArray(seite.abschnitte) ? seite.abschnitte : [];
  const aufstieg = aufstiegAbschnitt(seite);
  return alle.filter((abschnitt) => !aufstieg || abschnitt.anker !== aufstieg.anker);
}

function aufstiegAbschnitt(seite) {
  const alle = Array.isArray(seite.abschnitte) ? seite.abschnitte : [];
  const treffer = alle.find((abschnitt) => abschnitt.anker === AUFSTIEG_ANKER);
  if (treffer) return treffer;
  // Rückfall: Hat die Seite mehr als die drei Abschnitte aus AP-13, ist der
  // letzte gemeint.
  return alle.length > 3 ? alle[alle.length - 1] : null;
}

/**
 * Schneidet einen Abschnitt aus dem HTML einer Wissensseite: alles zwischen
 * der Überschrift mit diesem Anker und der nächsten Überschrift.
 * Das HTML stammt aus dem Build (AP_ALLGEMEIN 4, Ausnahme).
 * @returns {DocumentFragment|null}
 */
function abschnittInhalt(seite, anker) {
  if (!seite || !anker) return null;
  const quelle = document.createElement('div');
  quelle.innerHTML = String(seite.html || '');

  const start = quelle.querySelector('#' + cssId(anker));
  if (!start) return null;

  const stueck = document.createDocumentFragment();
  let knoten = start.nextElementSibling;
  while (knoten && !/^H[1-6]$/.test(knoten.tagName)) {
    const naechster = knoten.nextElementSibling;
    stueck.append(knoten);
    knoten = naechster;
  }
  return stueck.childNodes.length > 0 ? stueck : null;
}

/** "den Stamm", "die Krone". Ohne bekannten Artikel nur der Name. */
function mitArtikel(name) {
  const artikel = ARTIKEL[name];
  return artikel ? artikel + ' ' + name : name;
}

function zurueckZeile(navigate) {
  return el('p', { class: 'stufen-zurueck' }, [
    knopf({ text: 'Zurück zu den Stufen', icon: 'pfeil-links', art: 'neben', onTap: () => navigate('#/stufen') })
  ]);
}

/** Anker als CSS-Auswahl, damit querySelector auch mit Ziffern am Anfang geht. */
function cssId(anker) {
  const text = String(anker || '');
  if (typeof CSS !== 'undefined' && CSS && typeof CSS.escape === 'function') return CSS.escape(text);
  return text.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}
