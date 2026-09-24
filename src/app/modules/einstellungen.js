// Modul "Einstellungen" (#/einstellungen): Jahrgang wechseln, Version und
// Update, Installationshilfe, Link zu "Über die App", mit ?debug=1
// zusätzlich Speichergröße, simuliertes Datum und Link zur Musterseite
// (AP-10.md, ARCHITEKTUR 3.4).

import { registerModule } from '../module.js';
import { APP_VERSION } from '../version.js';
import * as update from '../update.js';
import { el, hinweis, knopf, leer, statusPunkt } from '../ui/components.js';

registerModule({
  id: 'einstellungen',
  titel: 'Einstellungen',
  icon: 'einstellungen',
  nav: { position: 90, sichtbar: true },
  routes: [
    { pattern: '#/einstellungen', render: renderEinstellungen }
  ]
});

function renderEinstellungen(container, params, ctx) {
  const debug = new URLSearchParams(location.search).get('debug') === '1';
  const kinder = [
    el('h1', { text: 'Einstellungen', tabindex: '-1' }),
    jahrgangAbschnitt(ctx),
    appAbschnitt(),
    installationsAbschnitt(),
    ueberAbschnitt(),
    debug ? fehlersucheAbschnitt(ctx) : null
  ].filter(Boolean);
  container.append(...kinder);
}

// ------------------------------------------------------------------ Jahrgang

function jahrgangAbschnitt(ctx) {
  const { index, state, store } = ctx;
  const jahrgaenge = Array.isArray(index.jahrgaenge) ? index.jahrgaenge.map(Number) : [];
  const aktueller = Number(state.jgst);
  const rueckfrageBereich = el('div', { style: { marginTop: 'var(--s-3)' } });

  const knoepfe = jahrgaenge
    .filter((nummer) => nummer !== aktueller)
    .map((nummer) => knopf({
      text: 'Zu Jahrgang ' + nummer + ' wechseln',
      art: 'neben',
      onTap: () => jahrgangRueckfrage(rueckfrageBereich, nummer, store)
    }));

  return abschnitt('Jahrgang', [
    el('p', { text: 'Du bist in Jahrgang ' + aktueller + '.' }),
    el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 'var(--touch-abstand)' } }, knoepfe),
    rueckfrageBereich
  ]);
}

function jahrgangRueckfrage(bereich, nummer, store) {
  leer(bereich);
  bereich.append(
    hinweis({ art: 'warnung', text: 'Du siehst dann nur noch Inhalte von Jahrgang ' + nummer + '.' }),
    el('div', { style: { display: 'flex', gap: 'var(--touch-abstand)' } }, [
      knopf({
        text: 'Ja, wechseln',
        art: 'haupt',
        onTap: () => {
          // Offene Anträge bleiben: setJahrgang ändert nur state.jgst
          // (ARCHITEKTUR 3.6). Ein Neustart lädt Navigation und Jahrgangs-
          // daten sauber neu, ohne main.js von hier aus anzufassen.
          store.setJahrgang(nummer);
          location.reload();
        }
      }),
      knopf({ text: 'Abbrechen', art: 'neben', onTap: () => leer(bereich) })
    ])
  );
}

// ------------------------------------------------------------------ App / Update

function appAbschnitt() {
  const stand = aktuellerStand();
  const statusText = !stand.online ? 'offline' : (stand.updateBereit ? 'update' : stand.version);
  const rueckfrageBereich = el('div', { style: { marginTop: 'var(--s-3)' } });

  return abschnitt('App', [
    el('p', {}, [statusPunkt(statusText)]),
    el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 'var(--touch-abstand)' } }, [
      knopf({ text: 'Nach Updates suchen', art: 'neben', onTap: () => update.pruefen() }),
      knopf({ text: 'Neu laden', art: 'neben', onTap: () => neuLadenRueckfrage(rueckfrageBereich) })
    ]),
    rueckfrageBereich
  ]);
}

// Einmalige Momentaufnahme (online, updateBereit, version). onStatus ruft
// sofort einmal auf (update.js-Dokumentation), offStatus danach beendet das
// Abonnement wieder, damit beim nächsten Besuch der Seite kein zweiter
// Beobachter übrig bleibt.
function aktuellerStand() {
  let stand = { online: true, updateBereit: false, version: APP_VERSION };
  const einmalig = (s) => {
    stand = s;
    update.offStatus(einmalig);
  };
  update.onStatus(einmalig);
  return stand;
}

function neuLadenRueckfrage(bereich) {
  leer(bereich);
  bereich.append(
    hinweis({ art: 'warnung', text: 'Die App lädt neu. Jahrgang und Anträge bleiben erhalten.' }),
    el('div', { style: { display: 'flex', gap: 'var(--touch-abstand)' } }, [
      knopf({ text: 'Ja, neu laden', art: 'haupt', onTap: () => update.neuLaden() }),
      knopf({ text: 'Abbrechen', art: 'neben', onTap: () => leer(bereich) })
    ])
  );
}

// ------------------------------------------------------------------ Installationshilfe

// Gleicher Wortlaut wie die Installationskarte (update.js, AP-03), hier aber
// immer sichtbar und nicht nur im Browser-Modus (AP-10.md).
function installationsAbschnitt() {
  return abschnitt('Installation', [
    el('ol', {}, [
      el('li', { text: 'Tippe auf Teilen, dann "Zum Home-Bildschirm".' }),
      el('li', { text: 'Lass "Als Web-App öffnen" eingeschaltet.' })
    ]),
    el('p', {
      class: 'text-klein text-neben',
      text: 'Was du in Safari einstellst, siehst du in der installierten App nicht, dort startest du neu.'
    })
  ]);
}

// ------------------------------------------------------------------ Über die App

function ueberAbschnitt() {
  return abschnitt('Über die App', [
    el('p', {}, [el('a', { href: '#/wissen/ueber-die-app', text: 'Über die App und Datenschutz' })])
  ]);
}

// ------------------------------------------------------------------ Fehlersuche (?debug=1)

function fehlersucheAbschnitt(ctx) {
  const ergebnis = ctx.store.save();
  const simuliert = new URLSearchParams(location.search).get('heute');

  return abschnitt('Fehlersuche', [
    el('dl', {}, [
      el('dt', { text: 'Speichergröße' }),
      el('dd', {
        text: ergebnis.ok
          ? ergebnis.bytes + ' Byte'
          : 'Speichern fehlgeschlagen (' + ergebnis.grund + ')'
      }),
      el('dt', { text: 'Simuliertes Datum' }),
      el('dd', { text: simuliert || 'keins, es gilt das echte Datum' })
    ]),
    el('p', {}, [el('a', { href: '#/muster', text: 'Zur Musterseite' })])
  ]);
}

// ------------------------------------------------------------------ Hilfsmittel

function abschnitt(titelText, kinder) {
  return el('section', { style: { marginBottom: 'var(--s-6)' } }, [
    el('h2', { text: titelText }),
    ...kinder
  ]);
}
