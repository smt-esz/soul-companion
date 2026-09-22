// Vorlage fuer den Service Worker (ARCHITEKTUR 3.8).
//
// Diese Datei wird nie veroeffentlicht. Der Build (tools/lib/swgen.mjs) ersetzt
// die beiden Platzhalter in den Zeilen unten und schreibt das Ergebnis nach
// <ausgabe>/sw.js:
//
//   Version   APP_VERSION aus src/app/version.js, dann ein Bindestrich und
//             acht Zeichen aus dem sha256 ueber alle veroeffentlichten Dateien
//   Precache  Liste aller veroeffentlichten Dateien, jeweils mit ./ davor,
//             ohne sw.js selbst, dazu ./ fuer die Startseite
//
// Wichtig: Die Platzhalter stehen nur in den beiden Codezeilen. In Kommentaren
// duerfen sie nicht vorkommen, sonst ersetzt der Build sie dort auch.
//
// Die Logik (install, activate, fetch, message SKIP_WAITING) schreibt AP-03.
// Bis dahin steht hier nur der Rumpf, damit der Build laeuft.

const VERSION = '0.1.0-ef7e3e44';
const PRECACHE = [
  "./",
  "./app/data.js",
  "./app/dates.js",
  "./app/main.js",
  "./app/model.js",
  "./app/module.js",
  "./app/modules/demo.js",
  "./app/router.js",
  "./app/store.js",
  "./app/ui/components.js",
  "./app/version.js",
  "./data/antrag.json",
  "./data/index.json",
  "./data/jg5.json",
  "./data/jg6.json",
  "./data/jg7.json",
  "./data/schule.json",
  "./data/suche-jg5.json",
  "./data/suche-jg6.json",
  "./data/suche-jg7.json",
  "./data/wissen.json",
  "./index.html",
  "./manifest.webmanifest",
  "./styles/base.css"
];

const CACHE_NAME = 'soul-companion-' + VERSION;

// AP-03 fuellt die folgenden Ereignisse:
//   install   alle Dateien der Precache-Liste in CACHE_NAME laden,
//             ohne skipWaiting()
//   activate  alte Caches soul-companion-* loeschen, clients.claim()
//   fetch     nur GET und gleiche Herkunft, Navigation auf index.html
//   message   'SKIP_WAITING' fuehrt zu self.skipWaiting()
//
// Solange das fehlt, meldet sich der Service Worker nur einmal in der Konsole
// und greift in keine Anfrage ein.
self.addEventListener('install', () => {
  console.log('SOUL Companion: Service Worker ' + VERSION + ' (' + CACHE_NAME + '), '
    + PRECACHE.length + ' Dateien vorgemerkt. Logik folgt in AP-03.');
});
