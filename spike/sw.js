// Minimaler Service Worker fuer den Technik-Test (AP-00).
// VERSION von Hand erhoehen, um den Update-Test auszuloesen (siehe Testanleitung).
const VERSION = '1';
const CACHE_NAME = 'soul-spike-' + VERSION;

const PRECACHE = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
  './test.pdf'
];

self.addEventListener('install', (ereignis) => {
  ereignis.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  // Kein skipWaiting(): neue Version soll erst "wartend" sein, siehe Testanleitung.
});

self.addEventListener('activate', (ereignis) => {
  ereignis.waitUntil(
    caches.keys().then((namen) => Promise.all(
      namen
        .filter((name) => name.startsWith('soul-spike-') && name !== CACHE_NAME)
        .map((name) => caches.delete(name))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (ereignis) => {
  const anfrage = ereignis.request;
  if (anfrage.method !== 'GET') return;
  const url = new URL(anfrage.url);
  if (url.origin !== self.location.origin) return;

  ereignis.respondWith(
    caches.match(anfrage).then((treffer) => {
      if (treffer) return treffer;
      return fetch(anfrage);
    })
  );
});

self.addEventListener('message', (ereignis) => {
  if (ereignis.data === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (ereignis.data && ereignis.data.typ === 'GET_VERSION' && ereignis.ports[0]) {
    ereignis.ports[0].postMessage(VERSION);
  }
});
