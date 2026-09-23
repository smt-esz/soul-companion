// Service Worker fuer SOUL Companion (ARCHITEKTUR 3.8, AP-03).
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
// Unterschied zum English Companion (bewusst, siehe AP-03):
//   - kein skipWaiting() im install. Eine neue Version wartet, bis das Kind
//     in der App auf "Jetzt aktualisieren" tippt. Sonst koennte mitten im
//     Antrag neu geladen werden.
//   - alles liegt vorab im Cache, der Cache kommt zuerst. Neue Dateien gibt
//     es nur ueber einen neuen Service Worker, nie haeppchenweise. So passen
//     index.html, Module und Daten immer zueinander.
//   - keine fremden Hosts, es wird nichts nachgeladen und nichts gecacht,
//     was nicht aus dem eigenen Ordner kommt.

const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;

// Alle Caches der App beginnen mit diesem Praefix. Nur solche raeumt der
// Service Worker weg, fremde Caches auf derselben Herkunft bleiben stehen.
const PRAEFIX = 'soul-companion-';
const CACHE = PRAEFIX + VERSION;

// ---------------------------------------------------------------- install
// Alle Dateien der Precache-Liste laden. addAll ist dabei Absicht: schlaegt
// eine einzige Datei fehl, schlaegt der ganze install fehl. Ein halb
// gefuellter Cache waere schlimmer als gar keiner, weil die App dann offline
// an einer beliebigen Stelle haengen bliebe.
// Kein skipWaiting(). Der neue Service Worker bleibt wartend, bis die Seite
// die Nachricht 'SKIP_WAITING' schickt (app/update.js, applyUpdate()).
//
// cache: 'reload' umgeht den gewoehnlichen Browser-Cache. Die Pfade im
// Precache sind unversioniert (./app/main.js und so weiter), nur der
// Cache-Name wechselt. Ohne diesen Zusatz koennte ein neuer Service Worker
// alte Dateiinhalte aus dem HTTP-Cache uebernehmen und das Update waere nur
// scheinbar erfolgt. GitHub Pages schickt Cache-Control mit Lebensdauer,
// der Fall ist also nicht theoretisch.
// [ungeprueft] ob Safari auf iPadOS die Angabe beachtet. Kennt ein Browser
// sie nicht, wird sie stillschweigend uebergangen, schlimmstenfalls bleibt
// es also beim alten Verhalten.
self.addEventListener('install', (ereignis) => {
  ereignis.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(
      PRECACHE.map((pfad) => new Request(pfad, { cache: 'reload' }))
    ))
  );
});

// ---------------------------------------------------------------- activate
// Alte Staende loeschen und sofort die Steuerung uebernehmen.
self.addEventListener('activate', (ereignis) => {
  ereignis.waitUntil((async () => {
    const namen = await caches.keys();
    await Promise.all(namen
      .filter((name) => name.startsWith(PRAEFIX) && name !== CACHE)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

// ---------------------------------------------------------------- fetch
// Nur GET und nur gleiche Herkunft. Alles andere laeuft unveraendert am
// Service Worker vorbei (kein respondWith, der Browser macht es selbst).
//
// ignoreSearch ist noetig, weil an der Start-URL Parameter haengen koennen
// (?jgst=5 aus dem Jamf-Web-Clip, ?debug=1, ?vorschau=1). Ohne ignoreSearch
// waere './index.html?jgst=5' ein anderer Schluessel als './index.html' und
// die App startete offline nicht.
//
// cacheName gehoert dazu: Solange eine neue Version wartet, liegen zwei
// Caches nebeneinander. caches.match() ohne cacheName durchsucht beide. Der
// noch laufende alte Worker koennte dann eine Datei ausliefern, die erst mit
// dem Update dazugekommen ist. Genau das soll nicht passieren, index.html,
// Module und Daten sollen immer aus demselben Stand kommen.
const SUCHE = { cacheName: CACHE, ignoreSearch: true };

self.addEventListener('fetch', (ereignis) => {
  const anfrage = ereignis.request;
  if (anfrage.method !== 'GET') return;

  let url;
  try {
    url = new URL(anfrage.url);
  } catch (fehler) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Navigation: immer die Startseite aus dem Cache. Die Routen der App sind
  // Hashes, es gibt nur diese eine Seite.
  if (anfrage.mode === 'navigate') {
    ereignis.respondWith(
      caches.match('./index.html', SUCHE)
        .then((treffer) => treffer || fetch(anfrage))
    );
    return;
  }

  ereignis.respondWith(
    caches.match(anfrage, SUCHE)
      .then((treffer) => treffer || fetch(anfrage))
  );
});

// ---------------------------------------------------------------- message
// 'SKIP_WAITING'  die Seite hat "Jetzt aktualisieren" bestaetigt
// 'VERSION'       die Seite fragt, welche Version gerade laeuft
self.addEventListener('message', (ereignis) => {
  const nachricht = ereignis.data;
  if (nachricht === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (nachricht === 'VERSION' && ereignis.source) {
    ereignis.source.postMessage({ version: VERSION });
  }
});
