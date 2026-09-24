// Nur zum lokalen Testen: liefert eine Datei per HTTP aus, so als waere sie
// der Freigabe-Link auf die Formular-Antworten-Excel-Datei. Zusammen mit
// test-formular-fixture.mjs zum Ausprobieren von uebernehme-terminaenderungen.mjs,
// ohne dass das echte Microsoft-Formular schon eingerichtet ist.
//
//   node tools/test-formular-server.mjs <Datei.xlsx> [Port, Standard 8123]
import http from 'node:http';
import { readFileSync } from 'node:fs';

const pfad = process.argv[2];
const port = Number(process.argv[3]) || 8123;
const puffer = readFileSync(pfad);

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
  res.end(puffer);
}).listen(port, () => console.log('liefert ' + pfad + ' auf http://localhost:' + port + '/'));
