// Schmale, eigene Lesefunktionen fuer den Termin-Abgleich (Lehrerzugang,
// Leo 24.09.2026). Bewusst getrennt von build.mjs: der Abgleich soll nicht
// von dessen interner Fehlerpruefung abhaengen und braucht nur wenige Felder.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { alsText, leseMappe } from './excel.mjs';

/** Faecher (id, name) und Ferien (von, bis) aus content/schule.xlsx. */
export function ladeSchule(repo) {
  const pfad = join(repo, 'content', 'schule.xlsx');
  if (!existsSync(pfad)) throw new Error('content/schule.xlsx fehlt.');
  const mappe = leseMappe(pfad, 'schule.xlsx');
  const faecher = (mappe.blatt('Faecher') || []).map((zeile) => ({
    id: alsText(zeile.id),
    name: alsText(zeile.name)
  }));
  const ferien = (mappe.blatt('Ferien') || []).map((zeile) => ({
    von: alsText(zeile.von),
    bis: alsText(zeile.bis)
  }));
  return { faecher, ferien };
}

/** Termine eines Jahrgangs, inklusive __zeile (Excel-Zeilennummer). */
export function ladeTermine(repo, jgst) {
  const pfad = join(repo, 'content', 'jahrgaenge', 'Jg' + jgst + '.xlsx');
  if (!existsSync(pfad)) return null;
  const mappe = leseMappe(pfad, 'Jg' + jgst + '.xlsx');
  const termine = (mappe.blatt('Termine') || []).map((zeile) => ({
    __zeile: zeile.__zeile,
    datum: alsText(zeile.datum),
    art: alsText(zeile.art),
    fach: alsText(zeile.fach),
    kuerzel: alsText(zeile.kuerzel),
    text: alsText(zeile.text)
  }));
  return { pfad, termine };
}

/** Alle aktiven Jahrgaenge aus content/index.json. */
export function ladeJahrgaenge(repo) {
  const index = JSON.parse(readFileSync(join(repo, 'content', 'index.json'), 'utf8'));
  return Array.isArray(index.jahrgaenge) ? index.jahrgaenge.map(Number).filter(Number.isInteger) : [];
}
