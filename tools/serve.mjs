// Lokaler Testserver ohne Abhängigkeiten.
//
//   node tools/serve.mjs                  liefert docs/  (nach einem Build)
//   node tools/serve.mjs --ordner=src     liefert src/   (zum Entwickeln)
//   node tools/serve.mjs --port=8081      anderer Port
//
// Nur für die Arbeit am eigenen Rechner: der Server hört auf 127.0.0.1,
// schickt nichts nach außen und speichert nichts zwischen.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const TYPEN = new Map(Object.entries({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8'
}));

const optionen = leseOptionen(process.argv.slice(2));
const wurzel = resolve(REPO, optionen.ordner);

const server = createServer(async (anfrage, antwort) => {
  if (anfrage.method !== 'GET' && anfrage.method !== 'HEAD') {
    sende(antwort, 405, 'text/plain; charset=utf-8', 'Nur GET.');
    return;
  }

  let pfadTeil;
  try {
    pfadTeil = decodeURIComponent(new URL(anfrage.url, 'http://localhost').pathname);
  } catch (fehler) {
    sende(antwort, 400, 'text/plain; charset=utf-8', 'Ungültige Adresse.');
    return;
  }

  let datei = resolve(wurzel, '.' + pfadTeil.replace(/\/+/g, '/'));

  // Nichts außerhalb des ausgelieferten Ordners herausgeben.
  if (datei !== wurzel && !datei.startsWith(wurzel + sep)) {
    sende(antwort, 403, 'text/plain; charset=utf-8', 'Nicht erlaubt.');
    return;
  }

  try {
    let angaben = await stat(datei);
    if (angaben.isDirectory()) {
      datei = join(datei, 'index.html');
      angaben = await stat(datei);
    }
    const inhalt = await readFile(datei);
    const typ = TYPEN.get(extname(datei).toLowerCase()) || 'application/octet-stream';
    antwort.writeHead(200, {
      'Content-Type': typ,
      'Content-Length': angaben.size,
      // Beim Entwickeln soll immer die neue Datei kommen.
      'Cache-Control': 'no-store'
    });
    if (anfrage.method === 'HEAD') {
      antwort.end();
      return;
    }
    antwort.end(inhalt);
    console.log('200', pfadTeil);
  } catch (fehler) {
    sende(antwort, 404, 'text/plain; charset=utf-8', 'Nicht gefunden: ' + pfadTeil);
    console.log('404', pfadTeil);
  }
});

server.on('error', (fehler) => {
  if (fehler && fehler.code === 'EADDRINUSE') {
    console.error('Port ' + optionen.port + ' ist belegt. Anderer Port: --port=8081');
    process.exit(1);
  }
  console.error(fehler);
  process.exit(1);
});

try {
  const angaben = await stat(wurzel);
  if (!angaben.isDirectory()) throw new Error('kein Ordner');
} catch (fehler) {
  console.error('Ordner gibt es nicht: ' + wurzel);
  console.error('Zum Entwickeln ohne Build: node tools/serve.mjs --ordner=src');
  process.exit(1);
}

server.listen(optionen.port, '127.0.0.1', () => {
  console.log('Ordner:  ' + wurzel);
  console.log('Adresse: http://localhost:' + optionen.port + '/');
  if (optionen.ordner === 'src') {
    console.log('Ohne Build die Beispieldaten nutzen: http://localhost:'
      + optionen.port + '/?quelle=beispiel');
  }
  console.log('Beenden mit Strg + C');
});

function sende(antwort, status, typ, text) {
  antwort.writeHead(status, { 'Content-Type': typ, 'Cache-Control': 'no-store' });
  antwort.end(text);
}

function leseOptionen(argumente) {
  const optionen = { ordner: 'docs', port: 8080 };
  for (const argument of argumente) {
    const treffer = argument.match(/^--([a-zA-Z]+)=(.+)$/);
    if (!treffer) {
      console.error('Unbekanntes Argument: ' + argument);
      process.exit(1);
    }
    const [, name, wert] = treffer;
    if (name === 'ordner') {
      optionen.ordner = wert;
    } else if (name === 'port') {
      const zahl = Number(wert);
      if (!Number.isInteger(zahl) || zahl < 1 || zahl > 65535) {
        console.error('Kein gültiger Port: ' + wert);
        process.exit(1);
      }
      optionen.port = zahl;
    } else {
      console.error('Unbekannte Option: --' + name);
      process.exit(1);
    }
  }
  return optionen;
}
