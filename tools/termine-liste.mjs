// Druckt die aktuellen Termine eines Jahrgangs als zwei Listen (Input,
// Coaching) zum Einfuegen in die zwei Dropdown-Fragen des passenden
// Microsoft-Formulars (Lehrerzugang, Leo 24.09./29.09.2026: ein Formular je
// Jahrgang, mit Verzweigung "Was soll verschoben werden? -> Input oder
// Coaching -> passende Liste").
//
//   node tools/termine-liste.mjs 5      Jg 5, beide Listen
//   node tools/termine-liste.mjs        alle Jahrgaenge, beide Listen
//
// "Sonstiges" (z. B. ein Paedagogischer Tag) passt in keine der beiden
// Fragen und erscheint hier nicht - sowas verschiebt niemand per Formular.
//
// Bei jeder inhaltlichen Aenderung an den Terminen (neue, verschobene oder
// geloeschte Zeilen) diese Liste neu erzeugen und im passenden Formular
// ersetzen, sonst passen die Dropdown-Eintraege nicht mehr zu den echten
// Zeilen.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ladeJahrgaenge, ladeSchule, ladeTermine } from './lib/inhalte.mjs';
import { terminKategorie, terminLabel } from './lib/termin-label.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NUR_JGST = process.argv[2] ? Number(process.argv[2]) : null;

const schule = ladeSchule(REPO);
const jahrgaenge = ladeJahrgaenge(REPO).filter((jgst) => NUR_JGST === null || jgst === NUR_JGST);

const zeilen = [];
for (const jgst of jahrgaenge) {
  const jg = ladeTermine(REPO, jgst);
  if (!jg) continue;
  for (const termin of jg.termine) {
    const kategorie = terminKategorie(termin.art);
    if (!termin.datum || !kategorie) continue;
    zeilen.push({ jgst, kategorie, label: terminLabel(termin, jgst, schule), datum: termin.datum });
  }
}

zeilen.sort((a, b) => a.datum.localeCompare(b.datum));

const ziel = NUR_JGST === null ? 'alle Jahrgänge' : 'Jg ' + NUR_JGST;
for (const kategorie of ['input', 'coaching']) {
  const treffer = zeilen.filter((z) => z.kategorie === kategorie);
  console.log('--- ' + (kategorie === 'input' ? 'Input' : 'Coaching') + '-Dropdown (' + ziel + ') ---\n');
  for (const { label } of treffer) console.log(label);
  console.log('\n' + treffer.length + ' Termine.\n');
}
