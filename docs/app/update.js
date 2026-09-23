// Service Worker, Updates, Offline-Status und Installationshinweis
// (ARCHITEKTUR 3.8, AP-03).
//
// Leitgedanke: Eine neue Version wird erkannt, aber nie von selbst aktiviert.
// Das Kind entscheidet, wann neu geladen wird. Damit kann ein Update keinen
// halb ausgefuellten Antrag wegreissen.
//
// Oeffentliche Schnittstelle (AP-03):
//   init({ statusEl, leisteEl })
//   pruefen()
//   applyUpdate()
//   sperren(grund) / freigeben(grund)
//   neuLaden()
//   onStatus(fn)
//   installKarte({ onSchliessen })

import { APP_VERSION } from './version.js';
import { el, leer, leiste, knopf, statusPunkt, karte } from './ui/components.js';

// Muss zum Praefix in sw.template.js passen.
const PRAEFIX = 'soul-companion-';

// Beim Sichtbarwerden hoechstens alle 30 Minuten pruefen, damit das Hin und
// Her zwischen Apps nicht dauernd Anfragen ausloest.
const PRUEF_ABSTAND_MS = 30 * 60 * 1000;
// Zusaetzlich stuendlich, solange die App sichtbar ist.
const PRUEF_INTERVALL_MS = 60 * 60 * 1000;

const EINSTELLUNGEN_HASH = '#/einstellungen';

let statusBereich = null;
let leistenBereich = null;

let registrierung = null;
let wartend = null;
let aktiveVersion = APP_VERSION;

let online = true;
let spaeterInDieserSitzung = false;
let installHinweisVersteckt = false;

// Gruende, die die Leiste zurueckhalten (z. B. der Uebergabe-Modus im
// Antrag). Gemerkt wird das Update trotzdem, die Leiste kommt danach.
const sperrgruende = new Set();

const statusHoerer = new Set();

let hatteControllerBeimStart = false;
let updateAngestossen = false;
let schonNeuGeladen = false;
let letztePruefung = 0;
let intervall = null;
let schonGestartet = false;
let letzterZustand = null;

// ---------------------------------------------------------------- init

/**
 * Registriert den Service Worker und richtet Statusanzeige, Update-Leiste
 * und die Pruefungen ein. Darf mehrfach aufgerufen werden, arbeitet aber
 * nur beim ersten Mal.
 * @param {object} optionen  { statusEl, leisteEl }
 * @returns {Promise<void>}
 */
export async function init(optionen = {}) {
  // Ein zweiter Aufruf richtet nichts neu ein, uebernimmt aber neue
  // Anzeigebereiche. Baut ein spaeteres AP die Kopfzeile neu auf, zeigen
  // Status und Leiste sonst auf Elemente, die nicht mehr im Dokument sind.
  if (schonGestartet) {
    if (optionen.statusEl) statusBereich = optionen.statusEl;
    if (optionen.leisteEl) leistenBereich = optionen.leisteEl;
    letzterZustand = null;
    zeichneStatus();
    zeichneLeiste();
    return;
  }
  schonGestartet = true;

  statusBereich = optionen.statusEl || null;
  leistenBereich = optionen.leisteEl || null;

  online = navigator.onLine !== false;
  window.addEventListener('online', () => setzeOnline(true));
  window.addEventListener('offline', () => setzeOnline(false));

  zeichneStatus();
  zeichneLeiste();

  // Der Speicher darf nicht von selbst aufgeraeumt werden, sonst waeren
  // angefangene Antraege weg. Ergebnis nur in die Konsole, nicht speichern
  // und nicht anzeigen (AP-03).
  speicherSichern();

  if (!('serviceWorker' in navigator)) {
    melde();
    return;
  }

  hatteControllerBeimStart = Boolean(navigator.serviceWorker.controller);

  // Nach skipWaiting() uebernimmt der neue Service Worker. Genau einmal neu
  // laden.
  //
  // Zwei Faelle sind zu unterscheiden. Beim allerersten Besuch uebernimmt der
  // Service Worker ueber clients.claim(), obwohl es gar kein Update gab. Da
  // darf nicht neu geladen werden, sonst startet jede erste Sitzung mit einem
  // ueberfluessigen Neuladen. Sonst gilt: neu laden, entweder weil wir das
  // Update selbst angestossen haben (updateAngestossen) oder weil es ein
  // anderer Tab getan hat (dann lief hier schon ein Controller).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (schonNeuGeladen) return;
    if (!updateAngestossen && !hatteControllerBeimStart) {
      // Erstbesuch: der Service Worker steuert die Seite jetzt. Gute
      // Gelegenheit, seine Version zu erfragen.
      frageVersion();
      return;
    }
    schonNeuGeladen = true;
    location.reload();
  });

  navigator.serviceWorker.addEventListener('message', (ereignis) => {
    const daten = ereignis.data;
    if (daten && typeof daten.version === 'string') {
      aktiveVersion = daten.version;
      zeichneStatus();
      melde();
    }
  });

  // Ohne das bleiben Nachrichten des Service Workers in der Warteschlange
  // liegen: navigator.serviceWorker gibt sie erst frei, wenn onmessage
  // gesetzt oder startMessages() gerufen wurde. addEventListener allein
  // reicht nicht, die Antwort auf 'VERSION' kaeme sonst nie an.
  if (typeof navigator.serviceWorker.startMessages === 'function') {
    navigator.serviceWorker.startMessages();
  }

  try {
    registrierung = await navigator.serviceWorker.register('./sw.js');
  } catch (fehler) {
    // Ohne Service Worker laeuft die App weiter, nur eben ohne Offline und
    // ohne Updates. Kein Grund, das Kind damit zu behelligen.
    console.info('SOUL Companion: Service Worker nicht registriert.', fehler);
    melde();
    return;
  }

  if (registrierung.waiting) setzeWartend(registrierung.waiting);

  // Lief beim Registrieren schon eine Installation, ist 'updatefound' bereits
  // gefeuert und waiting noch leer. Dann hier weiter zusehen, sonst geht das
  // Update in dieser Sitzung verloren.
  if (registrierung.installing) beobachte(registrierung.installing);

  registrierung.addEventListener('updatefound', () => {
    beobachte(registrierung.installing);
  });

  frageVersion();
  pruefen();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - letztePruefung < PRUEF_ABSTAND_MS) return;
    pruefen();
  });

  if (intervall === null) {
    intervall = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      pruefen();
    }, PRUEF_INTERVALL_MS);
  }

  melde();
}

// ---------------------------------------------------------------- pruefen

/** Fragt beim Server nach einer neuen Version. Fehler bleiben still. */
export async function pruefen() {
  if (!registrierung) return;
  letztePruefung = Date.now();
  try {
    await registrierung.update();
  } catch (fehler) {
    // Offline oder Server nicht erreichbar. Beim naechsten Mal wieder.
  }
}

// ---------------------------------------------------------------- applyUpdate

/**
 * Aktiviert die wartende Version. Das Neuladen loest der Browser ueber
 * 'controllerchange' aus, siehe init().
 */
export function applyUpdate() {
  const ziel = wartend || (registrierung ? registrierung.waiting : null);
  if (!ziel) return;
  updateAngestossen = true;
  ziel.postMessage('SKIP_WAITING');
}

// ---------------------------------------------------------------- sperren

/** Haelt die Leiste zurueck, solange mindestens ein Grund gesetzt ist. */
export function sperren(grund) {
  if (!grund) return;
  sperrgruende.add(String(grund));
  zeichneLeiste();
}

/** Nimmt einen Grund zurueck. Ist keiner mehr offen, kommt die Leiste. */
export function freigeben(grund) {
  if (!grund) return;
  sperrgruende.delete(String(grund));
  zeichneLeiste();
}

// ---------------------------------------------------------------- neuLaden

/**
 * Notfallknopf fuer die Einstellungen: alle Caches der App loeschen, den
 * Service Worker abmelden, neu laden. Der localStorage bleibt unberuehrt,
 * Jahrgang und Antraege gehen also nicht verloren.
 * @returns {Promise<void>}
 */
export async function neuLaden() {
  // Kein zweites Neuladen durch den Controller-Wechsel beim Abmelden.
  schonNeuGeladen = true;

  try {
    if (typeof caches !== 'undefined') {
      const namen = await caches.keys();
      await Promise.all(namen
        .filter((name) => name.startsWith(PRAEFIX))
        .map((name) => caches.delete(name)));
    }
  } catch (fehler) {
    console.info('SOUL Companion: Caches nicht vollstaendig geloescht.', fehler);
  }

  try {
    if ('serviceWorker' in navigator) {
      const alle = await navigator.serviceWorker.getRegistrations();
      await Promise.all(alle.map((eintrag) => eintrag.unregister()));
    }
  } catch (fehler) {
    console.info('SOUL Companion: Service Worker nicht abgemeldet.', fehler);
  }

  location.reload();
}

// ---------------------------------------------------------------- onStatus

/**
 * Meldet Aenderungen an Online-Zustand, wartendem Update und Version.
 * Wird sofort einmal mit dem aktuellen Stand aufgerufen.
 * @param {Function} fn  fn({ online, updateBereit, version })
 */
export function onStatus(fn) {
  if (typeof fn !== 'function') return;
  statusHoerer.add(fn);
  try {
    fn(standDaten());
  } catch (fehler) {
    // Ein fehlerhafter Beobachter darf die App nicht stoeren.
  }
}

/** Nimmt einen Beobachter wieder zurueck. */
export function offStatus(fn) {
  statusHoerer.delete(fn);
}

// ---------------------------------------------------------------- installKarte

/**
 * Karte "Installiere die App" fuer den Browser-Modus. Laeuft die App schon
 * als Web-App oder wurde die Karte in dieser Sitzung geschlossen, gibt die
 * Funktion null zurueck. Eingebunden wird sie von AP-10 auf der Startseite.
 * @param {object} optionen  { onSchliessen }
 * @returns {HTMLElement|null}
 */
export function installKarte(optionen = {}) {
  if (installHinweisVersteckt || istWebApp()) return null;
  const { onSchliessen = null } = optionen;

  const schliessen = knopf({
    text: 'Schließen',
    icon: 'schliessen',
    art: 'text',
    onTap: () => {
      installHinweisVersteckt = true;
      if (element.parentNode) element.parentNode.removeChild(element);
      if (typeof onSchliessen === 'function') onSchliessen();
    }
  });

  const element = karte({
    titel: 'Installiere die App',
    kinder: [
      el('ol', {}, [
        el('li', { text: 'Tippe auf Teilen, dann "Zum Home-Bildschirm".' }),
        el('li', { text: 'Lass "Als Web-App öffnen" eingeschaltet.' })
      ]),
      el('p', {
        class: 'hinweis',
        text: 'Was du in Safari einstellst, siehst du in der installierten App nicht, dort startest du neu.'
      }),
      schliessen
    ]
  });

  return element;
}

/**
 * Laeuft die App als installierte Web-App?
 * navigator.standalone gibt es nur in Safari, display-mode in allen anderen.
 */
export function istWebApp() {
  if (navigator.standalone === true) return true;
  if (typeof matchMedia !== 'function') return false;
  return matchMedia('(display-mode: standalone)').matches === true;
}

// ---------------------------------------------------------------- innen

// Sieht einem installierenden Service Worker zu, bis er bereitsteht.
function beobachte(neuer) {
  if (!neuer) return;
  const schauen = () => {
    // 'installed' plus vorhandener Controller heisst: Es lief schon eine
    // Version, das hier ist wirklich ein Update und keine Erstinstallation.
    if (neuer.state === 'installed' && navigator.serviceWorker.controller) {
      setzeWartend(registrierung.waiting || neuer);
    }
  };
  neuer.addEventListener('statechange', schauen);
  schauen();
}

function setzeWartend(arbeiter) {
  if (!arbeiter || wartend === arbeiter) return;
  wartend = arbeiter;
  zeichneStatus();
  zeichneLeiste();
  melde();
}

function updateBereit() {
  return Boolean(wartend);
}

function setzeOnline(wert) {
  if (online === wert) return;
  online = wert;
  zeichneStatus();
  melde();
  // Wieder online: nachsehen, ob es etwas Neues gibt. Mit demselben Abstand
  // wie beim Sichtbarwerden, sonst loest ein wackeliges WLAN eine Anfrage
  // nach der anderen aus.
  if (wert && Date.now() - letztePruefung >= PRUEF_ABSTAND_MS) pruefen();
}

function frageVersion() {
  const controller = navigator.serviceWorker ? navigator.serviceWorker.controller : null;
  if (!controller) return;
  try {
    controller.postMessage('VERSION');
  } catch (fehler) {
    // Dann bleibt die Version aus version.js stehen.
  }
}

async function speicherSichern() {
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      const dauerhaft = await navigator.storage.persist();
      console.info('SOUL Companion: navigator.storage.persist() =', dauerhaft);
    }
  } catch (fehler) {
    console.info('SOUL Companion: persist() nicht moeglich.', fehler);
  }
}

function standDaten() {
  return { online, updateBereit: updateBereit(), version: aktiveVersion };
}

function melde() {
  const daten = standDaten();
  for (const fn of statusHoerer) {
    try {
      fn(daten);
    } catch (fehler) {
      // siehe onStatus
    }
  }
}

// Anzeige oben rechts. Die Form macht statusPunkt() aus AP-04.
// Tippen fuehrt in die Einstellungen, dort steht mehr dazu.
function zeichneStatus() {
  if (!statusBereich) return;

  let zustand;
  if (!online) zustand = 'offline';
  else if (updateBereit()) zustand = 'update';
  else zustand = aktiveVersion;

  // Nur neu bauen, wenn sich wirklich etwas geaendert hat. Sonst verliert ein
  // Kind, das gerade mit der Tastatur auf dem Status steht, den Fokus.
  if (zustand === letzterZustand) return;
  letzterZustand = zustand;

  leer(statusBereich);
  statusBereich.append(el('a', {
    href: EINSTELLUNGEN_HASH,
    class: 'status-link',
    // Dynamische Stile nur ueber element.style, nie als style="..." (CSP).
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      minHeight: 'var(--touch)',
      textDecoration: 'none'
    }
  }, [statusPunkt(zustand)]));
}

function leisteSichtbar() {
  return updateBereit() && !spaeterInDieserSitzung && sperrgruende.size === 0;
}

function zeichneLeiste() {
  if (!leistenBereich) return;
  leer(leistenBereich);
  if (!leisteSichtbar()) return;

  const balken = leiste({
    text: 'Neue Version verfügbar.',
    aktion: { text: 'Jetzt aktualisieren', onTap: () => applyUpdate() }
  });
  balken.style.marginBottom = 'var(--s-4)';

  const spaeter = knopf({
    text: 'Später',
    art: 'text',
    onTap: () => {
      spaeterInDieserSitzung = true;
      zeichneLeiste();
    }
  });
  // knopf--text ist sonst dunkelgruen auf dunkelgruenem Grund.
  spaeter.style.color = 'var(--c-auf-teal-dunkel)';
  balken.append(spaeter);

  leistenBereich.append(balken);
}
