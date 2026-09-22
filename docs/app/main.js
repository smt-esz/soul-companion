// Start der App (ARCHITEKTUR 3.1), Onboarding-Weiche, Layout, Navigation.

import { store } from './store.js';
import * as data from './data.js';
import { heute } from './dates.js';
import { getModules, setzeAktive, zerlegeHash } from './module.js';
import { startRouter, navigate, onNavigation } from './router.js';
import { el, leer } from './ui/components.js';

// Module melden sich beim Import selbst an. Ohne Bundler braucht es diese
// Zeile je Moduldatei. Welche davon wirklich gelten, sagt content/index.json
// (Feld module) über setzeAktive().
import './modules/demo.js';

const ONBOARDING_HASH = '#/start';

let inhalt = null;
let navigation = null;

start();

async function start() {
  try {
    store.load();
    const index = await data.loadIndex();
    const schule = await data.loadSchule();

    const parameter = new URLSearchParams(location.search);
    const vorschau = parameter.get('vorschau') === '1';
    const jahrgaenge = Array.isArray(index.jahrgaenge) ? index.jahrgaenge.map(Number) : [];

    // URL-Parameter jgst gewinnt, wenn er gültig ist, und wird gespeichert.
    const gewuenscht = Number(parameter.get('jgst'));
    if (Number.isInteger(gewuenscht) && jahrgaenge.includes(gewuenscht)) {
      if (store.state.jgst !== gewuenscht) store.setJahrgang(gewuenscht);
      store.setSchuljahr(index.schuljahr);
    }

    const jgst = Number(store.state.jgst);
    if (!jahrgaenge.includes(jgst)) {
      zeigeJahrgangswahl(index, schule, vorschau);
      return;
    }

    // Erster Start ohne Schuljahr: still nachtragen, es gibt nichts zu fragen.
    if (!store.state.schuljahr) store.setSchuljahr(index.schuljahr);

    // Schuljahreswechsel (ARCHITEKTUR 3.1 Punkt 4). AP-10 gestaltet das aus.
    if (store.state.schuljahr !== index.schuljahr) {
      zeigeSchuljahrFrage(index, schule, vorschau);
      return;
    }

    await appStarten(index, schule, vorschau);
  } catch (fehler) {
    zeigeStartfehler(fehler);
  }
}

async function appStarten(index, schule, vorschau) {
  const jgst = Number(store.state.jgst);
  const jg = await data.loadJahrgang(jgst);
  const wissen = data.filterWissen(await data.loadWissen(), jgst, vorschau);

  setzeAktive(Array.isArray(index.module) ? index.module : []);

  const ctx = {
    index,
    schule,
    jg,
    wissen,
    state: store.state,
    store,
    heute: heute(),
    navigate,
    vorschau
  };

  layoutAufbauen(jg);
  onNavigation(navigationMarkieren);
  await startRouter({ container: inhalt, ctx });

  // update.init() kommt in AP-03 (Service Worker, Update-Leiste, Statusanzeige).
}

// Layout: Statuszeile oben rechts, Navigation links bzw. unten, Inhalt daneben.
function layoutAufbauen(jg) {
  leer(document.body);

  if (jg && jg.ton) document.body.dataset.ton = jg.ton;

  const kopf = el('header', { class: 'kopfzeile' }, [
    el('p', { class: 'kopfzeile-titel', text: 'SOUL Companion' }),
    // Bleibt in AP-01 leer. AP-03 zeigt hier Version, offline und Updates.
    el('div', { id: 'status', class: 'status' })
  ]);

  navigation = el('nav', { class: 'hauptnavigation', 'aria-label': 'Bereiche' }, [
    el('ul', { class: 'hauptnavigation-liste' }, getModules()
      .filter((modul) => modul.nav.sichtbar && modul.routes.length > 0)
      .map((modul) => el('li', {}, [
        el('a', {
          class: 'hauptnavigation-link',
          href: modul.routes[0].pattern,
          'data-modul': modul.id,
          text: modul.titel
        })
      ])))
  ]);

  inhalt = el('main', { id: 'inhalt', class: 'inhalt' });

  document.body.append(kopf, navigation, inhalt);
}

function navigationMarkieren(hash) {
  if (!navigation) return;
  const { pfad } = zerlegeHash(hash);
  for (const link of navigation.querySelectorAll('.hauptnavigation-link')) {
    const eigen = zerlegeHash(link.getAttribute('href')).pfad;
    if (eigen === pfad) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  }
}

// Platzhalter-Onboarding. AP-10 ersetzt es durch das richtige Onboarding
// in einer eigenen Datei src/app/onboarding.js.
function zeigeJahrgangswahl(index, schule, vorschau) {
  const jahrgaenge = Array.isArray(index.jahrgaenge) ? index.jahrgaenge.map(Number) : [];
  location.hash = ONBOARDING_HASH;

  const seite = einzelseite([
    el('h1', { text: 'Jahrgang wählen', tabindex: '-1' }),
    el('p', { text: 'Hier findest du alles zu SOUL für deinen Jahrgang.' }),
    el('div', { class: 'wahl' }, jahrgaenge.map((nummer) => el('button', {
      type: 'button',
      class: 'wahl-knopf',
      text: 'Jahrgang ' + nummer,
      onclick: () => jahrgangUebernehmen(nummer, index, schule, vorschau)
    }))),
    el('p', { class: 'hinweis', text: 'Du kannst den Jahrgang später ändern.' })
  ]);
  fokusAufTitel(seite);
}

// Schuljahreswechsel (ARCHITEKTUR 3.1 Punkt 4).
function zeigeSchuljahrFrage(index, schule, vorschau) {
  const alter = Number(store.state.jgst);
  const jahrgaenge = Array.isArray(index.jahrgaenge) ? index.jahrgaenge.map(Number) : [];

  const knoepfe = [el('button', {
    type: 'button',
    class: 'wahl-knopf',
    text: 'Ja, Jahrgang ' + alter,
    onclick: () => jahrgangUebernehmen(alter, index, schule, vorschau)
  })];
  for (const nummer of jahrgaenge) {
    if (nummer === alter) continue;
    knoepfe.push(el('button', {
      type: 'button',
      class: 'wahl-knopf',
      text: 'Nein, Jahrgang ' + nummer,
      onclick: () => jahrgangUebernehmen(nummer, index, schule, vorschau)
    }));
  }

  const seite = einzelseite([
    el('h1', { text: 'Neues Schuljahr', tabindex: '-1' }),
    el('p', { text: 'Bist du noch in Jahrgang ' + alter + '?' }),
    el('div', { class: 'wahl' }, knoepfe)
  ]);
  fokusAufTitel(seite);
}

function jahrgangUebernehmen(nummer, index, schule, vorschau) {
  store.setJahrgang(nummer);
  store.setSchuljahr(index.schuljahr);
  appStarten(index, schule, vorschau).catch(zeigeStartfehler);
}

function zeigeStartfehler(fehler) {
  const text = fehler && fehler.message ? fehler.message : 'Unbekannter Fehler';
  const seite = einzelseite([
    el('h1', { text: 'Die App kann nicht starten', tabindex: '-1' }),
    el('p', { text: 'Bitte lade die Seite neu. Wenn es dann noch nicht geht, sage es deiner Lernbegleitung.' }),
    el('p', { class: 'hinweis', text: text })
  ]);
  fokusAufTitel(seite);
}

// Seite ohne Navigation (Onboarding, Rückfragen, Startfehler).
function einzelseite(kinder) {
  leer(document.body);
  navigation = null;
  inhalt = el('main', { id: 'inhalt', class: 'inhalt inhalt-einzel' }, kinder);
  document.body.append(inhalt);
  if (typeof window.scrollTo === 'function') window.scrollTo(0, 0);
  return inhalt;
}

function fokusAufTitel(bereich) {
  const titel = bereich.querySelector('h1');
  if (titel) titel.focus();
}

