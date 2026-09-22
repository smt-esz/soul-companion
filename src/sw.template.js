// Service Worker fuer SOUL Companion (ARCHITEKTUR 3.8).
//
// ERZEUGT. Aus der Vorlage src/sw.template.js macht tools/build.mjs die Datei
// <ausgabe>/sw.js und setzt dabei zwei Werte ein:
//
//   Version   APP_VERSION aus src/app/version.js, ein Bindestrich und acht
//             Zeichen aus dem sha256 ueber alle veroeffentlichten Dateien
//   Precache  alle veroeffentlichten Dateien, jeweils mit ./ davor, ohne
//             sw.js selbst, dazu ./ fuer die Startseite
//
// Aendern bitte nur die Vorlage, nie die erzeugte Datei.
// Hinweis fuer die Vorlage: Die beiden Platzhalter stehen nur in den zwei
// Codezeilen unten. In Kommentaren duerfen sie nicht vorkommen, sonst ersetzt
// der Build sie dort auch und die Datei wird ungueltig.
//
// Die Logik (install, activate, fetch, message SKIP_WAITING) schreibt AP-03.
// Bis dahin steht hier nur der Rumpf, damit der Build laeuft.

const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;

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
