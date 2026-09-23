// Kontrastpruefung fuer src/styles/tokens.css (AP-04, DESIGN 11).
//
//   node tools/kontrast.mjs [--csv]
//
// Das Werkzeug liest alle Farbtokens aus tokens.css, loest var()-Verweise auf
// und rechnet jedes Paar aus Schrift und Untergrund nach WCAG 2.x aus, einmal
// im hellen und einmal im dunklen Modus.
//
// Schwellen (DESIGN 11):
//   Text   mindestens 4.5 : 1
//   Gross  mindestens 3.0 : 1  (Symbole, Bedienelemente, Schrift ab 24 px
//          bzw. ab 18.66 px fett). DESIGN 2.2 rechnet die Fachbadges
//          ausdruecklich mit dieser Schwelle ("verfehlt knapp die 3 : 1 fuer
//          Symbole"), deshalb stehen sie hier als "gross".
//
// Rueckgabe: 0, wenn kein Paar seine Schwelle unterschreitet, sonst 1.
//
// Dieses Werkzeug laeuft nur auf Leos Rechner. Im Browser landet nichts davon.

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = join(REPO, 'src', 'styles', 'tokens.css');

const SCHWELLE = { text: 4.5, gross: 3 };

// ------------------------------------------------------------------ Tokens

/**
 * Liest alle Deklarationen --name: wert aus der Datei.
 * Die erste gewinnt: oben in :root stehen die hellen Werte und dazu die
 * Zwillinge --<name>--dunkel. Weiter unten ordnen zwei Bloecke die hellen
 * Namen auf die Zwillinge um. Das ist nur der Schalter, keine neue Farbe.
 */
export function leseTokens(pfad = TOKENS) {
  const text = readFileSync(pfad, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const tokens = new Map();
  for (const treffer of text.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]+);/gi)) {
    const name = treffer[1].trim();
    if (!tokens.has(name)) tokens.set(name, treffer[2].trim());
  }
  return tokens;
}

/**
 * Wert eines Tokens in einem Modus.
 * Im Dunkelmodus gilt der Zwilling --<name>--dunkel, wenn es ihn gibt.
 * var()-Verweise werden im selben Modus weiter aufgeloest.
 */
export function wertVon(tokens, name, modus, tiefe = 0) {
  if (tiefe > 10) throw new Error('var()-Verweise drehen sich im Kreis: ' + name);
  const dunklerName = name + '--dunkel';
  const schluessel = modus === 'dunkel' && tokens.has(dunklerName) ? dunklerName : name;
  const roh = tokens.get(schluessel);
  if (roh === undefined) throw new Error('Token fehlt in tokens.css: ' + name);

  const verweis = roh.match(/^var\(\s*(--[a-z0-9-]+)\s*\)$/i);
  if (verweis) return wertVon(tokens, verweis[1], modus, tiefe + 1);
  return roh;
}

// ------------------------------------------------------------------ Rechnen

function zuRgb(wert) {
  const treffer = String(wert).trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!treffer) throw new Error('Kein einfacher Farbwert: ' + wert);
  const hex = treffer[1].length === 3
    ? treffer[1].split('').map((z) => z + z).join('')
    : treffer[1];
  return [0, 2, 4].map((n) => parseInt(hex.slice(n, n + 2), 16));
}

/** Relative Helligkeit nach WCAG 2.x. */
export function helligkeit(wert) {
  const [r, g, b] = zuRgb(wert).map((kanal) => {
    const anteil = kanal / 255;
    return anteil <= 0.04045 ? anteil / 12.92 : ((anteil + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Kontrastverhaeltnis zweier Farben, immer >= 1. */
export function kontrast(eine, andere) {
  const a = helligkeit(eine);
  const b = helligkeit(andere);
  const hell = Math.max(a, b);
  const dunkel = Math.min(a, b);
  return (hell + 0.05) / (dunkel + 0.05);
}

// ------------------------------------------------------------------ Paare

const FAECHER = [
  ['ma', 'Mathematik'],
  ['de', 'Deutsch'],
  ['en', 'Englisch'],
  ['bio', 'Biologie'],
  ['geo', 'Geografie'],
  ['offen', 'Fach offen']
];

/** Alle Paare aus Schrift und Untergrund, die in der App wirklich vorkommen. */
export function paare() {
  const liste = [
    ['Haupttext auf Seite', '--c-navy', '--c-grund', 'text'],
    ['Haupttext auf Karte', '--c-navy', '--c-karte', 'text'],
    ['Nebentext auf Seite', '--c-text-2', '--c-grund', 'text'],
    ['Nebentext auf Karte', '--c-text-2', '--c-karte', 'text'],
    ['Link auf Seite', '--c-teal-dunkel', '--c-grund', 'text'],
    ['Link auf Karte', '--c-teal-dunkel', '--c-karte', 'text'],
    ['Hauptknopf', '--c-auf-teal-dunkel', '--c-teal-dunkel', 'text'],
    ['Nebenknopf Schrift', '--c-teal-dunkel', '--c-karte', 'text'],
    ['Karte "laeuft gerade", Titel', '--c-navy', '--c-teal-hell', 'text'],
    ['Karte "laeuft gerade", Nebentext', '--c-text-2', '--c-teal-hell', 'text'],
    ['Etikett HEUTE', '--c-auf-gold', '--c-gold', 'text'],
    ['Gold als Text auf Karte', '--c-gold-dunkel', '--c-karte', 'text'],
    ['Gold als Text auf Seite', '--c-gold-dunkel', '--c-grund', 'text'],
    ['Teal als Flaeche und Icon auf Seite', '--c-teal', '--c-grund', 'gross'],
    ['Teal als Flaeche und Icon auf Karte', '--c-teal', '--c-karte', 'gross'],
    ['Fokusrahmen auf Seite', '--c-fokus', '--c-grund', 'gross'],
    ['Fokusrahmen auf Karte', '--c-fokus', '--c-karte', 'gross']
  ];

  for (const [id, name] of FAECHER) {
    liste.push(
      [name + ': Fachtext auf Karte', '--fach-' + id + '-text', '--c-karte', 'text'],
      [name + ': Fachtext auf Seite', '--fach-' + id + '-text', '--c-grund', 'text'],
      [name + ': Fachtext auf Fachflaeche', '--fach-' + id + '-text', '--fach-' + id + '-flaeche', 'text'],
      [name + ': Haupttext auf Fachflaeche', '--c-navy', '--fach-' + id + '-flaeche', 'text'],
      [name + ': Nebentext auf Fachflaeche', '--c-text-2', '--fach-' + id + '-flaeche', 'text'],
      [name + ': Badge (Symbol und Kuerzel)', '--fach-' + id + '-badge', '--fach-' + id + '-kante', 'gross']
    );
  }

  // Faecherverbindend: der Verlauf besteht genau aus den Farben der fuenf
  // Faecher. Die Stufen sind oben schon geprueft. Hier bleibt der Badge,
  // der auf Kartengrund steht (DESIGN 2.2).
  liste.push(
    ['Faecherverbindend: Badge auf Kartengrund', '--fach-fvu-badge', '--c-karte', 'text'],
    ['Faecherverbindend: Text auf Kartengrund', '--fach-fvu-text', '--c-karte', 'text'],
    // Stufenbaum (DESIGN 8): die Namen stehen in den Flaechen.
    ['Stufenbaum: Wurzel', '--stufe-schrift', '--stufe-1-flaeche', 'text'],
    ['Stufenbaum: Stamm', '--stufe-schrift', '--stufe-2-flaeche', 'text'],
    ['Stufenbaum: Krone', '--stufe-schrift', '--stufe-3-flaeche', 'text'],
    ['Stufenbaum: Wurzel gegen Seite', '--stufe-1-flaeche', '--c-grund', 'gross'],
    ['Stufenbaum: Stamm gegen Seite', '--stufe-2-flaeche', '--c-grund', 'gross'],
    ['Stufenbaum: Krone gegen Seite', '--stufe-3-flaeche', '--c-grund', 'gross']
  );

  return liste;
}

// ------------------------------------------------------------------ Ausgabe

function rechne(tokens) {
  const zeilen = [];
  for (const modus of ['hell', 'dunkel']) {
    for (const [was, vorn, hinten, zweck] of paare()) {
      const farbeVorn = wertVon(tokens, vorn, modus);
      const farbeHinten = wertVon(tokens, hinten, modus);
      const wert = kontrast(farbeVorn, farbeHinten);
      const schwelle = SCHWELLE[zweck];
      zeilen.push({
        modus, was, vorn, hinten, zweck, schwelle,
        farbeVorn, farbeHinten,
        wert: Math.round(wert * 100) / 100,
        ok: wert + 0.005 >= schwelle
      });
    }
  }
  return zeilen;
}

function tabelle(zeilen) {
  const kopf = ['Modus', 'Paar', 'Schrift', 'Grund', 'Zweck', 'Soll', 'Ist', ''];
  const koerper = zeilen.map((z) => [
    z.modus, z.was, z.farbeVorn, z.farbeHinten, z.zweck,
    z.schwelle.toFixed(1), z.wert.toFixed(2), z.ok ? 'ok' : 'ZU WENIG'
  ]);
  const alle = [kopf, ...koerper];
  const breiten = kopf.map((_, spalte) => Math.max(...alle.map((zeile) => zeile[spalte].length)));
  const zeile = (werte) => werte.map((wert, spalte) => (
    spalte >= 5 ? wert.padStart(breiten[spalte]) : wert.padEnd(breiten[spalte])
  )).join('  ').trimEnd();

  return [zeile(kopf), breiten.map((b) => '-'.repeat(b)).join('  ').trimEnd(), ...koerper.map(zeile)].join('\n');
}

function csv(zeilen) {
  const kopf = 'modus;paar;schrift;grund;zweck;soll;ist;ok';
  return [kopf, ...zeilen.map((z) => [
    z.modus, z.was, z.farbeVorn, z.farbeHinten, z.zweck,
    z.schwelle.toFixed(1), z.wert.toFixed(2), z.ok ? 'ja' : 'nein'
  ].join(';'))].join('\n');
}

const alsCsv = process.argv.includes('--csv');
const tokens = leseTokens();
const zeilen = rechne(tokens);
const schwach = zeilen.filter((z) => !z.ok);

console.log(alsCsv ? csv(zeilen) : tabelle(zeilen));
console.log('');
console.log(zeilen.length + ' Paare geprueft, ' + schwach.length + ' Unterschreitungen.');

if (schwach.length > 0) {
  console.log('');
  for (const z of schwach) {
    console.log('ZU WENIG  ' + z.modus + '  ' + z.was + ': ' + z.wert.toFixed(2)
      + ' : 1, noetig sind ' + z.schwelle.toFixed(1) + ' : 1 ('
      + z.farbeVorn + ' auf ' + z.farbeHinten + ').');
  }
  process.exitCode = 1;
}
