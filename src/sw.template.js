// Vorlage fuer den Service Worker (ARCHITEKTUR 3.8).
//
// Diese Datei wird nie veroeffentlicht. Der Build ersetzt die beiden
// Platzhalter und schreibt das Ergebnis nach <ausgabe>/sw.js:
//
//   __VERSION__    APP_VERSION + '-' + acht Zeichen aus dem Inhalts-Hash
//   __PRECACHE__   Liste aller veroeffentlichten Dateien, mit './' davor
//
// Die Logik (install, activate, fetch, message SKIP_WAITING) schreibt AP-03.
// Bis dahin steht hier nur der Rumpf, damit der Build laeuft und die
// Platzhalter erhalten bleiben.

const VERSION = '__VERSION__';
const CACHE_NAME = 'soul-companion-' + VERSION;
const PRECACHE = __PRECACHE__;

// AP-03 fuellt die folgenden Ereignisse:
//   install   alle Dateien aus PRECACHE in CACHE_NAME laden, kein skipWaiting()
//   activate  alte Caches soul-companion-* loeschen, clients.claim()
//   fetch     nur GET und gleiche Herkunft, Navigation auf index.html
//   message   'SKIP_WAITING' -> self.skipWaiting()
//
// Solange das fehlt, meldet sich der Service Worker nur einmal in der Konsole
// und greift in keine Anfrage ein.
self.addEventListener('install', () => {
  console.log('SOUL Companion: Service Worker ' + VERSION + ', '
    + PRECACHE.length + ' Dateien vorgemerkt. Logik folgt in AP-03.');
});
