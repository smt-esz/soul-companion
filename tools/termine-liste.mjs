// Druckt die aktuelle Liste der Termine als Zeilen zum Einfuegen in die
// Dropdown-Frage "Welcher Termin soll verschoben werden?" im passenden
// Microsoft-Formular (Lehrerzugang, Leo 24.09.2026: ein Formular je
// Jahrgang).
//
//   node tools/termine-liste.mjs 5      nur Jg 5
//   node tools/termine-liste.mjs        alle Jahrgaenge zusammen
//
// Bei jeder inhaltlichen Aenderung an den Terminen (neue, verschobene oder
// geloeschte Zeilen) diese Liste neu erzeugen und im passenden Formular
// ersetzen, sonst passen die Dropdown-Eintraege nicht mehr zu den echten
// Zeilen.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ladeJahrgaenge, ladeSchule, ladeTermine } from './lib/inhalte.mjs';
import { terminLabel } from './lib/termin-label.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NUR_JGST = process.argv[2] ? Number(process.argv[2]) : null;

const schule = ladeSchule(REPO);
const jahrgaenge = ladeJahrgaenge(REPO).filter((jgst) => NUR_JGST === null || jgst === NUR_JGST);

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

const ziel = NUR_JGST === null ? 'alle Jahrgänge' : 'Jg ' + NUR_JGST;
console.log('Zum Kopieren in die Formular-Dropdown-Liste (' + ziel + '), eine Zeile pro Option:\n');
for (const { label } of zeilen) console.log(label);
console.log('\n' + zeilen.length + ' Termine.');
