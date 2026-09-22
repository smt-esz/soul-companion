// Lokaler Testserver fuer den Technik-Test (AP-00), ohne Abhaengigkeiten.
//
//   node spike/serve.mjs                 liefert spike/ auf Port 8080
//   node spike/serve.mjs --port=8081     anderer Port
//
// Nur fuer die Arbeit am eigenen Rechner: der Server hoert auf 127.0.0.1,
// schickt nichts nach aussen und speichert nichts zwischen.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = dirname(fileURLToPath(import.meta.url));

const TYPEN = new Map(Object.entries({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8'
}));

const port = leseOptionen(process.argv.slice(2));

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

  let datei = resolve(WURZEL, '.' + pfadTeil.replace(/\/+/g, '/'));

  // Nichts außerhalb des Spike-Ordners herausgeben.
  if (datei !== WURZEL && !datei.startsWith(WURZEL + sep)) {
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
    console.error('Port ' + port + ' ist belegt. Anderer Port: --port=8081');
    process.exit(1);
  }
  console.error(fehler);
  process.exit(1);
});

server.listen(port, '127.0.0.1', () => {
  console.log('Ordner:  ' + WURZEL);
  console.log('Adresse: http://localhost:' + port + '/');
  console.log('Mit Jahrgangs-Parameter: http://localhost:' + port + '/?jgst=6');
  console.log('Beenden mit Strg + C');
});

function sende(antwort, status, typ, text) {
  antwort.writeHead(status, { 'Content-Type': typ, 'Cache-Control': 'no-store' });
  antwort.end(text);
}

function leseOptionen(argumente) {
  let port = 8080;
  for (const argument of argumente) {
    const treffer = argument.match(/^--port=(\d+)$/);
    if (!treffer) {
      console.error('Unbekanntes Argument: ' + argument);
      process.exit(1);
    }
    const zahl = Number(treffer[1]);
    if (!Number.isInteger(zahl) || zahl < 1 || zahl > 65535) {
      console.error('Kein gültiger Port: ' + treffer[1]);
      process.exit(1);
    }
    port = zahl;
  }
  return port;
}
