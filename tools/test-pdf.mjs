// Pruefung des Antrags-PDF (AP-15), ohne Browser.
//
//   node tools/test-pdf.mjs [--ausgabe=<ordner>]
//
// Das PDF entsteht in der App, nicht hier. Damit sich `src/app/antrag/pdf.js`
// trotzdem ohne iPad pruefen laesst, laedt dieses Werkzeug
//   - pdf-lib aus src/vendor/ in einen eigenen Kontext (die Datei ist ein
//     UMD-Build fuer den Browser, in Node braucht sie ein `self`),
//   - content/antrag.json als Konfiguration,
//   - einen vollstaendig ausgefuellten Testantrag mit vier Unterschriften.
//
// Geprueft wird: Groesse (AP-15, Akzeptanzkriterium 3), Umlaute im PDF-Text,
// Anzahl der Seiten, Fusszeile, Abschnitt 5 leer, leere Vorlage ohne Namen.
// Die PDFs bleiben im Ausgabeordner liegen, damit Layout und Unterschriften
// mit dem Auge geprueft werden koennen.
//
// Keine Namen von SuS: der Testantrag laeuft auf "Max Muster" (AP_ALLGEMEIN 7).

import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import zlib from 'node:zlib';

const ausfuehren = promisify(execFile);
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let bestanden = 0;
const fehlgeschlagen = [];

function pruefe(name, bedingung, hinweis = '') {
  if (bedingung) {
    bestanden++;
    return;
  }
  fehlgeschlagen.push(name + (hinweis ? '  ->  ' + hinweis : ''));
}

// ------------------------------------------------------- pdf-lib in Node laden

/**
 * pdf-lib ist ein UMD-Build fuer den Browser. In Node laesst es sich nicht
 * als ES-Modul importieren (`self` fehlt), und `node:vm` waere falsch: ein
 * eigener Kontext hat eigene Grundobjekte, dann erkennt pdf-lib seine eigenen
 * Farb- und Byte-Objekte nicht wieder. Deshalb wird die Datei in **derselben**
 * Umgebung ausgefuehrt, mit `exports`, `module` und `self` als Argumenten. Das
 * entspricht dem, was der Browser mit dem script-Tag macht.
 */
function ladePdfLib(pfad) {
  const quelle = readFileSync(pfad, 'utf8');
  const exportiert = {};
  const modul = { exports: exportiert };
  // eslint wuerde new Function ruegen, hier ist es der Zweck: fremdes UMD laden.
  const fabrik = new Function('exports', 'module', 'self', quelle);
  fabrik(exportiert, modul, globalThis);
  return exportiert.PDFLib || modul.exports.PDFLib || modul.exports;
}

// ------------------------------------------------------- Test-Unterschrift

/** Kleines PNG mit einem Schwung, als Ersatz fuer eine echte Unterschrift. */
function unterschriftPng(striche = 3, breite = 600, hoehe = 200) {
  const zeilen = [];
  const punkte = new Uint8Array(breite * hoehe);
  for (let s = 0; s < striche; s++) {
    const versatz = 30 + s * 17;
    for (let x = 20; x < breite - 20; x++) {
      const y = Math.round(hoehe / 2 + Math.sin((x + versatz) / 26) * (28 + s * 4) + (s - 1) * 6);
      for (let d = -2; d <= 2; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < hoehe) punkte[yy * breite + x] = 255;
      }
    }
  }
  for (let y = 0; y < hoehe; y++) {
    const zeile = Buffer.alloc(1 + breite * 4);
    for (let x = 0; x < breite; x++) {
      const a = punkte[y * breite + x];
      const p = 1 + x * 4;
      zeile[p] = 26; zeile[p + 1] = 26; zeile[p + 2] = 26; zeile[p + 3] = a;
    }
    zeilen.push(zeile);
  }
  const daten = zlib.deflateSync(Buffer.concat(zeilen));

  const stueck = (typ, inhalt) => {
    const laenge = Buffer.alloc(4);
    laenge.writeUInt32BE(inhalt.length);
    const koerper = Buffer.concat([Buffer.from(typ, 'latin1'), inhalt]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(koerper) >>> 0);
    return Buffer.concat([laenge, koerper, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite, 0);
  ihdr.writeUInt32BE(hoehe, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    stueck('IHDR', ihdr),
    stueck('IDAT', daten),
    stueck('IEND', Buffer.alloc(0))
  ]);
  return 'data:image/png;base64,' + png.toString('base64');
}

let crcTabelle = null;
function crc32(puffer) {
  if (!crcTabelle) {
    crcTabelle = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      crcTabelle[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < puffer.length; i++) c = crcTabelle[(c ^ puffer[i]) & 0xFF] ^ (c >>> 8);
  return c ^ -1;
}

// ------------------------------------------------------- Testantrag

function testAntrag(engine, config, zielstufe, heuteISO) {
  const antrag = engine.neuerAntrag(config, zielstufe, heuteISO, 'a-20261027-1a2b');
  antrag.kopf = { name: 'Max Muster', klasse: 'B' };

  const stufe = engine.stufeVon(config, antrag);
  for (const schritt of engine.schritteVon(stufe)) {
    if (schritt.typ === 'freitext') {
      antrag.schritte[schritt.id] = {
        status: 'abgeschlossen',
        text: 'Ich arbeite seit den Sommerferien selbststaendig an meinen Aufgaben und '
          + 'halte meine Abgaben ein. In der Gruppe uebernehme ich Verantwortung und '
          + 'raeume meinen Platz ohne Erinnerung auf. Deshalb moechte ich die naechste '
          + 'Stufe erreichen, weil ich mir mehr Freiheit zutraue und weiss, dass damit '
          + 'auch mehr Eigenverantwortung kommt.'
      };
    }
    if (schritt.typ === 'personen') {
      antrag.schritte[schritt.id] = {
        status: 'abgeschlossen',
        personen: [
          { name: 'Erika Test', klasse: '6A', datum: heuteISO, unterschrift: unterschriftPng(3) },
          { name: 'Max Muster', klasse: '6C', datum: heuteISO, unterschrift: unterschriftPng(4) }
        ]
      };
    }
    if (schritt.typ === 'kriterien') {
      const anzahl = Array.isArray(schritt.kriterien) ? schritt.kriterien.length : 0;
      antrag.schritte[schritt.id] = {
        status: 'abgeschlossen',
        kriterien: new Array(anzahl).fill(true).map((wert, i) => i !== 3),
        empfohlen: true,
        kuerzel: 'SMT',
        datum: heuteISO,
        unterschrift: unterschriftPng(5)
      };
    }
    if (schritt.typ === 'erklaerung') {
      const anzahl = Array.isArray(schritt.aussagen) ? schritt.aussagen.length : 0;
      antrag.schritte[schritt.id] = {
        status: 'abgeschlossen',
        aussagen: new Array(anzahl).fill(true),
        datum: heuteISO,
        unterschrift: unterschriftPng(3)
      };
    }
  }
  return antrag;
}

// ------------------------------------------------------- Lauf

const argumente = process.argv.slice(2);
const ausgabeArg = argumente.find((a) => a.startsWith('--ausgabe='));
const ausgabe = resolve(ausgabeArg ? ausgabeArg.slice('--ausgabe='.length) : join(tmpdir(), 'soul-pdf-test'));
mkdirSync(ausgabe, { recursive: true });

const PDFLib = ladePdfLib(join(REPO, 'src', 'vendor', 'pdf-lib.min.js'));
pruefe('pdf-lib laedt und bringt PDFDocument mit', Boolean(PDFLib && PDFLib.PDFDocument));
globalThis.PDFLib = PDFLib;

// Das Logo kommt in der App per fetch aus assets/. Hier aus dem Dateisystem.
const logoPfad = join(REPO, 'src', 'assets', 'soul-logo.png');
globalThis.fetch = async (pfad) => {
  const datei = join(REPO, 'src', String(pfad));
  if (!existsSync(datei)) return { ok: false };
  const bytes = readFileSync(datei);
  return { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
};
pruefe('Logo liegt in src/assets/soul-logo.png', existsSync(logoPfad));

const engine = await import(pathToFileURL(join(REPO, 'src', 'app', 'antrag', 'engine.js')).href);
const pdf = await import(pathToFileURL(join(REPO, 'src', 'app', 'antrag', 'pdf.js')).href);
const config = JSON.parse(readFileSync(join(REPO, 'content', 'antrag.json'), 'utf8'));

const heuteISO = '2026-10-27';
const APP_VERSION = (await import(pathToFileURL(join(REPO, 'src', 'app', 'version.js')).href)).APP_VERSION;

// --- sichereZeichen

pruefe('sichereZeichen laesst Umlaute stehen',
  pdf.sichereZeichen('Groesse aeoeue äöüÄÖÜß') === 'Groesse aeoeue äöüÄÖÜß');
pruefe('sichereZeichen ersetzt den Pfeil aus dem Papierantrag durch "zu"',
  pdf.sichereZeichen('Wurzel ➭ Stamm') === 'Wurzel zu Stamm');
pruefe('sichereZeichen ersetzt ein unbekanntes Zeichen durch ?',
  pdf.sichereZeichen('a中b') === 'a?b');
pruefe('sichereZeichen macht aus dem geschuetzten Leerzeichen ein normales',
  pdf.sichereZeichen('a b') === 'a b');
pruefe('sichereZeichen behaelt Gedankenstrich und Anfuehrungszeichen (WinAnsi)',
  pdf.sichereZeichen('a – „x“') === 'a – „x“');

// --- umbrich

const doc0 = await PDFLib.PDFDocument.create();
const helvetica = await doc0.embedFont(PDFLib.StandardFonts.Helvetica);
pruefe('umbrich gibt bei leerem Text keine Zeile', pdf.umbrich('   ', helvetica, 10, 200).length === 0);
const zeilen = pdf.umbrich('Wort '.repeat(40), helvetica, 10, 100);
pruefe('umbrich bricht nach Wortbreite um', zeilen.length > 1);
pruefe('umbrich haelt die Breite ein',
  zeilen.every((z) => helvetica.widthOfTextAtSize(z, 10) <= 100),
  'breiteste Zeile ' + Math.max(...zeilen.map((z) => helvetica.widthOfTextAtSize(z, 10))).toFixed(1));
const langeZeilen = pdf.umbrich('A'.repeat(200), helvetica, 10, 60);
pruefe('umbrich trennt ein zu breites Wort zeichenweise', langeZeilen.length > 1
  && langeZeilen.every((z) => helvetica.widthOfTextAtSize(z, 10) <= 60));

// --- Dateiname

pruefe('Dateiname nach AP-15',
  pdf.dateiname({ antrag: { zielstufe: 2, kopf: { name: 'Max Muster', klasse: 'B' } }, jgst: 5 })
    === 'Antrag_Stufe2_5B_Max_Muster_' + heutigerTag() + '.pdf',
  pdf.dateiname({ antrag: { zielstufe: 2, kopf: { name: 'Max Muster', klasse: 'B' } }, jgst: 5 }));
pruefe('Dateiname ohne Sonderzeichen',
  pdf.dateiname({ antrag: { zielstufe: 3, kopf: { name: 'José Müller-Suß', klasse: 'A' } }, jgst: 7 })
    === 'Antrag_Stufe3_7A_Jos_Mueller_Suss_' + heutigerTag() + '.pdf',
  pdf.dateiname({ antrag: { zielstufe: 3, kopf: { name: 'José Müller-Suß', klasse: 'A' } }, jgst: 7 }));
pruefe('Dateiname der Vorlage nennt "Vorlage"',
  pdf.dateiname({ antrag: { zielstufe: 2 }, leer: true }) === 'Antrag_Stufe2_Vorlage_' + heutigerTag() + '.pdf');

function heutigerTag() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

// --- PDFs erzeugen

const werke = [];
for (const zielstufe of ['2', '3']) {
  const antrag = testAntrag(engine, config, zielstufe, heuteISO);
  werke.push({
    name: 'Stufe' + zielstufe + '_voll',
    bytes: await pdf.erzeugeAntragPdf({ antrag, config, jgst: 6, leer: false, appVersion: APP_VERSION }),
    leer: false
  });
  werke.push({
    name: 'Stufe' + zielstufe + '_leer',
    bytes: await pdf.erzeugeAntragPdf({ antrag: { zielstufe }, config, jgst: null, leer: true, appVersion: APP_VERSION }),
    leer: true
  });
}

for (const werk of werke) {
  const datei = join(ausgabe, werk.name + '.pdf');
  writeFileSync(datei, werk.bytes);
  werk.datei = datei;
  werk.kb = werk.bytes.length / 1024;
  pruefe(werk.name + ': unter 500 KB', werk.bytes.length < 500 * 1024, werk.kb.toFixed(1) + ' KB');
  pruefe(werk.name + ': faengt mit %PDF an', Buffer.from(werk.bytes.slice(0, 5)).toString('latin1') === '%PDF-');
}

// --- Text im PDF nachlesen, wenn pdftotext da ist

// pdftotext meldet bei -v den Rueckgabewert 99, das ist kein Fehlen.
let pdftotext = true;
try {
  await ausfuehren('pdftotext', ['-v']);
} catch (fehler) {
  const meldung = String((fehler && (fehler.stderr || fehler.stdout)) || '');
  pdftotext = /pdftotext/i.test(meldung);
}

if (!pdftotext) {
  console.log('Hinweis: pdftotext fehlt, die Textpruefungen im PDF werden uebersprungen.');
} else {
  for (const werk of werke) {
    const txtDatei = werk.datei.replace(/\.pdf$/, '.txt');
    await ausfuehren('pdftotext', ['-enc', 'UTF-8', '-layout', werk.datei, txtDatei]);
    const text = readFileSync(txtDatei, 'utf8').replace(/\r/g, '');
    werk.text = text;
    werk.seiten = text.split('\f').filter((s) => s.trim()).length;

    pruefe(werk.name + ': Umlaute kommen im PDF an',
      /ä|ö|ü/.test(text) && text.includes('Selbstverständniserklärung'),
      'kein Umlaut gefunden');
    pruefe(werk.name + ': "Kürzel" steht mit Umlaut im PDF', text.includes('Kürzel'));
    pruefe(werk.name + ': Abschnitt 5 ist dabei',
      text.includes('Entscheidung über den Stufenaufstieg'));
    pruefe(werk.name + ': Zeile "Datum / Kürzel Klassenleitung" steht da',
      text.includes('Datum / Kürzel Klassenleitung'));

    const stufe = config.stufen[werk.name.includes('Stufe2') ? '2' : '3'];
    const flach = text.replace(/\s+/g, ' ');
    for (const kriterium of stufe.schritte.find((s) => s.typ === 'kriterien').kriterien) {
      pruefe(werk.name + ': Kriterium steht im PDF: ' + kriterium.slice(0, 28),
        flach.includes(kriterium.replace(/\s+/g, ' ')));
    }
    for (const option of stufe.schritte.find((s) => s.typ === 'nurPdf').optionen) {
      pruefe(werk.name + ': Option aus Abschnitt 5 steht im PDF: ' + option.slice(0, 24),
        flach.includes(option.replace(/\s+/g, ' ')));
    }

    if (werk.leer) {
      pruefe(werk.name + ': Vorlage nennt keinen Namen', !text.includes('Max Muster'));
      pruefe(werk.name + ': Fusszeile der Vorlage', flach.includes('Vorlage aus SOUL Companion ' + APP_VERSION));
      pruefe(werk.name + ': Vorlage nennt keine Antrag-ID', !text.includes('a-20261027-1a2b'));
    } else {
      pruefe(werk.name + ': Name und Klasse stehen im PDF',
        text.includes('Max Muster') && flach.includes('Klasse: 6B'));
      pruefe(werk.name + ': Kuerzel der Lernbegleitung steht im PDF', flach.includes('SMT'));
      pruefe(werk.name + ': Fusszeile mit Version und Antrag-ID',
        flach.includes('Erstellt mit SOUL Companion ' + APP_VERSION) && flach.includes('a-20261027-1a2b'));
      pruefe(werk.name + ': Begruendung steht im PDF',
        flach.includes('Ich arbeite seit den Sommerferien selbststaendig'));
    }
  }
}

// --- Bericht

console.log('');
console.log('Ausgabeordner: ' + ausgabe);
console.log('');
console.log('Datei                 Groesse     Seiten');
for (const werk of werke) {
  console.log('  ' + werk.name.padEnd(18) + (werk.kb.toFixed(1) + ' KB').padStart(9)
    + String(werk.seiten === undefined ? '?' : werk.seiten).padStart(11));
}
console.log('');
for (const zeile of fehlgeschlagen) console.log('FEHLT  ' + zeile);
console.log((bestanden + fehlgeschlagen.length) + ' Pruefungen, ' + bestanden + ' bestanden, '
  + fehlgeschlagen.length + ' fehlgeschlagen.');
process.exitCode = fehlgeschlagen.length === 0 ? 0 : 1;
