// Druckt die aktuelle Liste aller Termine als Zeilen zum Einfuegen in die
// Dropdown-Frage "Welcher Termin soll verschoben werden?" im Microsoft-
// Formular (Lehrerzugang, Leo 24.09.2026).
//
//   node tools/termine-liste.mjs
//
// Bei jeder inhaltlichen Aenderung an den Terminen (neue, verschobene oder
// geloeschte Zeilen) diese Liste neu erzeugen und im Formular ersetzen,
// sonst passen die Dropdown-Eintraege nicht mehr zu den echten Zeilen.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ladeJahrgaenge, ladeSchule, ladeTermine } from './lib/inhalte.mjs';
import { terminLabel } from './lib/termin-label.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const schule = ladeSchule(REPO);
const jahrgaenge = ladeJahrgaenge(REPO);

const zeilen = [];
for (const jgst of jahrgaenge) {
  const jg = ladeTermine(REPO, jgst);
  if (!jg) continue;
  for (const termin of jg.termine) {
    if (!termin.datum) continue;
    zeilen.push({ jgst, termin, label: terminLabel(termin, jgst, schule) });
  }
}

zeilen.sort((a, b) => a.termin.datum.localeCompare(b.termin.datum));

console.log('Zum Kopieren in die Formular-Dropdown-Liste, eine Zeile pro Option:\n');
for (const { label } of zeilen) console.log(label);
console.log('\n' + zeilen.length + ' Termine.');
