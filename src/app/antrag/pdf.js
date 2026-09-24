// Antrag als PDF (AP-15, ARCHITEKTUR 5).
//
// Erzeugt das offizielle Dokument, das an die Klassenleitung geht. Aufbau wie
// das Papierformular "Antrag Stufe 2/3": Kopf, dann die Abschnitte 1 bis 5 mit
// Nummer und Titel. Abschnitt 5 (Entscheidung im Coaching) bleibt leer, er wird
// im Coaching von Hand ausgefuellt.
//
// Drei Regeln, die den Aufbau bestimmen:
// 1. **Kein Wortlaut im Code.** Titel, Fragen, Kriterien, Aussagen und Optionen
//    kommen aus `antrag.snapshot` (laufender Antrag) bzw. aus `config`
//    (leere Vorlage). Fest steht hier nur, was auf dem Papier als Beschriftung
//    gedruckt ist: "Name", "Klasse", "Datum", "Kuerzel", "Unterschrift" und die
//    Zeile "Datum / Kuerzel Klassenleitung" (AP-15).
// 2. **pdf-lib liegt lokal**, als UMD-Build in `src/vendor/pdf-lib.min.js`. Die
//    Bibliothek haengt sich an `window.PDFLib` (index.html laedt sie mit defer
//    vor main.js). Keine Netzanfrage, kein CDN (AP_ALLGEMEIN 2).
//    Version 1.17.1, MIT, Lizenz in `src/vendor/pdf-lib.LICENSE.txt`.
// 3. **Schrift: Helvetica und Helvetica-Bold** aus den PDF-Standardschriften.
//    Die tragen WinAnsi und damit "aeoeueAeOeUess" [geprueft, siehe Bericht
//    AP-15]. Zeichen, die WinAnsi nicht kennt, wuerden pdf-lib zum Abbruch
//    bringen, deshalb geht jeder Text durch `sichereZeichen()`.
//
// Das Blatt wird von oben nach unten gefuellt und passt im Normalfall auf
// **eine Seite** (Leos Entscheidung vom 24.09.2026, AP-15-Bericht). Dafuer
// sind Rand, Schriftgroessen und Abstaende enger als im AP vorgesehen, und
// Datum und Kuerzel stehen neben der Unterschrift statt darueber.
// Der Seitenumbruch bleibt trotzdem eingebaut: eine Begruendung ueber rund
// 900 Zeichen laeuft auf eine zweite Seite. Jeder Abschnitt, der auf eine
// Seite passt, wird dabei vorher ganz vermessen und bleibt zusammen (siehe
// `abschnitt`). Abgeschnitten wird nie etwas.

import { formatDatum, heute, parseISODate, toISODate } from '../dates.js';
import { automatischeAussagen, schritteVon, stufeVon } from './engine.js';

// ---------------------------------------------------------------- Masse

const MM = 2.834645669;             // ein Millimeter in PDF-Punkten
const SEITE_BREITE = 210 * MM;
const SEITE_HOEHE = 297 * MM;
// Rand: 12 mm statt der 20 mm aus AP-15. Mit 20 mm passt der Antrag nicht auf
// ein Blatt, weil die vier Unterschriftsbilder Hoehe brauchen, die das
// Papierformular nicht kennt. Leo hat am 24.09.2026 entschieden: eine Seite.
// Das Papier selbst hat 7,5 mm links und 3 mm unten, 12 mm bleibt also immer
// noch grosszuegiger als die Vorlage.
const RAND = 12 * MM;
const INHALT_BREITE = SEITE_BREITE - 2 * RAND;
const UNTEN = SEITE_HOEHE - RAND;   // hier ist der Inhalt zu Ende
const FUSS_ABSTAND = 7 * MM;        // Fusszeile sitzt im unteren Rand

// Schriftgroessen in Punkt.
const S_TITEL = 16;
const S_UNTER = 8.5;
const S_KOPF = 9.5;
const S_NUMMER = 9.5;
const S_ABSCHNITT = 12;
const S_HINWEIS = 8;
const S_TEXT = 9;
const S_KLEIN = 7.5;
const S_FUSS = 7;

const ZEILE = 1.28;                 // Zeilenabstand als Faktor der Groesse
const KASTEN = 9;                   // Kaestchen zum Ankreuzen, Seitenlaenge
const NUMMER_KASTEN = 13;           // Kaestchen mit der Abschnittsnummer
const SCHREIBLINIE = 0.7;           // Strichstaerke der Linien fuer Handschrift
const UNTERSCHRIFT_BREITE = 102;    // Unterschriftsbild, Hoehe folgt 600 x 200
const LOGO_BREITE = 26 * MM;

// Abstaende, die ueber das ganze Blatt gelten.
const ABSCHNITT_ABSTAND = 2.8 * MM; // zwischen zwei Abschnitten
const ZEILEN_ABSTAND = 1.1 * MM;    // unter einer Zeile mit Kaestchen

// Farben wie in styles/tokens.css, damit PDF und App zusammenpassen.
const FARBEN = {
  teal: [0x07, 0x8A, 0x87],
  navy: [0x0E, 0x28, 0x41],
  neben: [0x4A, 0x5A, 0x6A],
  linie: [0xB9, 0xC6, 0xC4],
  weiss: [0xFF, 0xFF, 0xFF]
};

// ---------------------------------------------------------------- Zeichen

// WinAnsi kennt oberhalb von 0xFF genau diese Zeichen. Alles andere muss
// ersetzt werden, sonst bricht pdf-lib beim Zeichnen ab.
const WINANSI_HOCH = new Set([
  0x20AC, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017D, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022,
  0x2013, 0x2014, 0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x017E, 0x0178
]);

// Zeichen, die in Leos Dokumenten vorkommen koennen und einen sinnvollen
// Ersatz haben. "zu" fuer den Pfeil ist die Festlegung aus AP-14.
const ERSATZ = new Map([
  [String.fromCharCode(0x27AD), 'zu'],    // Pfeil aus dem Papierantrag
  [String.fromCharCode(0x2794), 'zu'],
  [String.fromCharCode(0x2192), 'zu'],
  [String.fromCharCode(0x21D2), 'zu'],
  [String.fromCharCode(0x00A0), ' '],     // geschuetztes Leerzeichen
  [String.fromCharCode(0x202F), ' '],
  [String.fromCharCode(0x2009), ' '],
  [String.fromCharCode(0x2007), ' '],
  [String.fromCharCode(0x00AD), ''],      // weiches Trennzeichen
  [String.fromCharCode(0x200B), ''],      // Breite Null
  [String.fromCharCode(0xFEFF), ''],
  [String.fromCharCode(0x2713), 'x'],     // Haken, wird hier gezeichnet
  [String.fromCharCode(0x2714), 'x'],
  [String.fromCharCode(0x2717), 'x'],
  [String.fromCharCode(0x2718), 'x'],
  [String.fromCharCode(0x2264), '<='],
  [String.fromCharCode(0x2265), '>='],
  [String.fromCharCode(0x2260), '!='],
  [String.fromCharCode(0x2212), '-'],     // Minus, Bindestrich-Varianten
  [String.fromCharCode(0x2011), '-'],
  [String.fromCharCode(0x2015), '-']
]);

/**
 * Macht einen Text fuer die PDF-Standardschriften sicher.
 * Unbekannte Zeichen werden ersetzt, notfalls durch "?". Das ist sichtbar,
 * damit ein Zeichenproblem auffaellt und nicht stillschweigend Woerter
 * zusammenzieht.
 * @param {*} wert
 * @returns {string}
 */
export function sichereZeichen(wert) {
  const text = String(wert === null || wert === undefined ? '' : wert);
  let aus = '';
  for (const zeichen of text) {
    const code = zeichen.codePointAt(0);
    if (code === 0x0A || code === 0x0D || code === 0x09) {
      aus += ' ';
      continue;
    }
    if (code >= 0x20 && code <= 0x7E) {
      aus += zeichen;
      continue;
    }
    if (code >= 0xA1 && code <= 0xFF && code !== 0xAD) {
      aus += zeichen;
      continue;
    }
    if (WINANSI_HOCH.has(code)) {
      aus += zeichen;
      continue;
    }
    aus += ERSATZ.has(zeichen) ? ERSATZ.get(zeichen) : '?';
  }
  return aus;
}

// ---------------------------------------------------------------- Aufbau

/**
 * Erzeugt das Antrags-PDF.
 *
 * @param {object} optionen
 *   antrag      Antrag nach DATENMODELL 6. Fuer die leere Vorlage reicht
 *               `{ zielstufe: 2 }`, die Texte kommen dann aus `config`.
 *   config      content/antrag.json (ganz)
 *   jgst        Jahrgang, nur fuer die Anzeige der Klasse ("5B")
 *   leer        true: Vorlage mit leeren Feldern und Linien fuer Handschrift
 *   appVersion  Version fuer die Fusszeile
 * @returns {Promise<Uint8Array>}
 */
export async function erzeugeAntragPdf({ antrag, config, jgst, leer = false, appVersion = '' }) {
  const PDFLib = holePdfLib();
  const stufe = stufeVon(config, antrag) || {};
  const schritte = schritteVon(stufe);

  const doc = await PDFLib.PDFDocument.create();
  const schriften = {
    normal: await doc.embedFont(PDFLib.StandardFonts.Helvetica),
    fett: await doc.embedFont(PDFLib.StandardFonts.HelveticaBold)
  };

  const bogen = neuerBogen(doc, PDFLib, schriften);
  // Bilder zuerst: das Einbetten ist asynchron, das Zeichnen danach nicht mehr.
  if (!leer) await betteUnterschriftenEin(bogen, antrag, schritte);
  neueSeite(bogen);

  await kopf(bogen, { antrag, stufe, jgst, leer, doc });

  for (const schritt of schritte) {
    abschnitt(bogen, { schritt, antrag, leer });
  }

  fusszeile(bogen, { antrag, leer, appVersion });
  metadaten(doc, { stufe, leer, appVersion });

  return doc.save();
}

/**
 * Alle Unterschriften einmal einbetten. Sie stehen als PNG-DataURL im Antrag
 * (AP-14). Eine kaputte DataURL wird uebersprungen, dann bleibt an der Stelle
 * nur die Linie: ein fehlerhaftes Bild darf den Antrag nicht verhindern.
 */
async function betteUnterschriftenEin(bogen, antrag, schritte) {
  for (const png of sammleUnterschriften(antrag, schritte)) {
    if (bogen.bilder.has(png)) continue;
    try {
      bogen.bilder.set(png, await bogen.doc.embedPng(png));
    } catch (fehler) {
      bogen.bilder.set(png, null);
    }
  }
}

function sammleUnterschriften(antrag, schritte) {
  const gefunden = [];
  for (const schritt of schritte) {
    const daten = schrittDaten(antrag, schritt.id);
    if (daten.unterschrift) gefunden.push(daten.unterschrift);
    for (const person of Array.isArray(daten.personen) ? daten.personen : []) {
      if (person && person.unterschrift) gefunden.push(person.unterschrift);
    }
  }
  return gefunden;
}

/** `window.PDFLib` aus `src/vendor/pdf-lib.min.js`. */
function holePdfLib() {
  const wurzel = typeof globalThis !== 'undefined' ? globalThis : null;
  const PDFLib = wurzel && wurzel.PDFLib;
  if (!PDFLib || !PDFLib.PDFDocument) {
    throw new Error('pdf-lib ist nicht geladen (src/vendor/pdf-lib.min.js).');
  }
  return PDFLib;
}

// ---------------------------------------------------------------- Kopf

async function kopf(bogen, { antrag, stufe, jgst, leer, doc }) {
  const { breite: logoBreite, hoehe: logoHoehe } = await logo(bogen, { doc });
  const titelBreite = INHALT_BREITE - (logoBreite > 0 ? logoBreite + 6 * MM : 0);

  const titel = sichereZeichen(stufe.titel || '');
  const groesse = passendeGroesse(titel, bogen.schriften.fett, S_TITEL, titelBreite, 11);
  schreibe(bogen, titel, { font: bogen.schriften.fett, groesse, farbe: FARBEN.navy, maxBreite: titelBreite });

  if (stufe.unterzeile) {
    bogen.y += 1.5 * MM;
    schreibe(bogen, sichereZeichen(stufe.unterzeile), {
      font: bogen.schriften.normal, groesse: S_UNTER, farbe: FARBEN.neben, maxBreite: titelBreite
    });
  }

  // Hoehe aus dem echten Bild, damit ein anderes Logo nicht in die Zeile laeuft.
  bogen.y = Math.max(bogen.y, RAND + logoHoehe) + 3 * MM;
  kopfzeile(bogen, { antrag, jgst, leer });
  bogen.y += 2.5 * MM;
}

/**
 * Name und Klasse in einer Zeile. Das Papier hat hier auch ein Datum; Leo hat
 * am 24.09.2026 entschieden, dass es oben nicht noetig ist: massgeblich ist das
 * Datum neben der Unterschrift der Lernenden in Abschnitt 4 (Gegenpruefung
 * AP-15, Punkt 7). Der Tag der PDF-Erzeugung steht in der Fusszeile.
 */
function kopfzeile(bogen, { antrag, jgst, leer }) {
  const kopfDaten = (antrag && antrag.kopf) || {};
  const klasse = leer ? '' : klassenText(antrag, jgst);

  const spalten = [
    { beschriftung: 'Name:', wert: leer ? '' : String(kopfDaten.name || ''), anteil: 0.72 },
    { beschriftung: 'Klasse:', wert: klasse, anteil: 0.28 }
  ];

  const oben = bogen.y;
  let x = RAND;
  for (const feld of spalten) {
    const breite = INHALT_BREITE * feld.anteil;
    zeichneText(bogen, feld.beschriftung, {
      x, y: oben, font: bogen.schriften.fett, groesse: S_KOPF, farbe: FARBEN.navy
    });
    const versatz = bogen.schriften.fett.widthOfTextAtSize(feld.beschriftung, S_KOPF) + 4;
    const feldBreite = breite - versatz - 4 * MM;
    zeichneText(bogen, sichereZeichen(feld.wert), {
      x: x + versatz, y: oben, font: bogen.schriften.normal, groesse: S_KOPF, farbe: FARBEN.navy
    });
    linie(bogen, x + versatz, oben + S_KOPF * ZEILE - 1, feldBreite);
    x += breite;
  }
  bogen.y = oben + S_KOPF * ZEILE + 1 * MM;
}

/**
 * SOUL-Logo klein rechts oben. Fehlt es, bleibt der Platz frei.
 * @returns {Promise<{breite: number, hoehe: number}>} gesetzte Groesse, 0 ohne Logo
 */
async function logo(bogen, { doc }) {
  const ohne = { breite: 0, hoehe: 0 };
  const bytes = await holeLogoBytes();
  if (!bytes) return ohne;
  try {
    const bild = await doc.embedPng(bytes);
    const breite = LOGO_BREITE;
    const hoehe = breite * (bild.height / bild.width);
    bogen.seite.drawImage(bild, {
      x: SEITE_BREITE - RAND - breite,
      y: SEITE_HOEHE - RAND - hoehe,
      width: breite,
      height: hoehe
    });
    return { breite, hoehe };
  } catch (fehler) {
    // Ohne Logo ist der Antrag genauso gueltig.
    return ohne;
  }
}

async function holeLogoBytes() {
  if (typeof fetch !== 'function') return null;
  try {
    const antwort = await fetch('assets/soul-logo.png');
    if (!antwort || !antwort.ok) return null;
    return new Uint8Array(await antwort.arrayBuffer());
  } catch (fehler) {
    return null;
  }
}

// ---------------------------------------------------------------- Abschnitte

function abschnitt(bogen, { schritt, antrag, leer }) {
  const daten = leer ? {} : schrittDaten(antrag, schritt.id);
  const kopfMass = kopfLayout(bogen, schritt);
  const koerper = koerperHoehe(bogen, { schritt, daten, antrag, leer });

  // Passt der ganze Abschnitt auf eine Seite, bleibt er ganz zusammen. So
  // steht eine Unterschrift nie getrennt von dem, was sie unterschreibt.
  // Nur ein Abschnitt, der allein laenger als eine Seite ist (sehr lange
  // Begruendung), wird geteilt; dann bleiben Kopf und Anfang zusammen.
  if (kopfMass.hoehe + koerper <= UNTEN - RAND) brauchePlatz(bogen, kopfMass.hoehe + koerper);
  else brauchePlatz(bogen, kopfMass.hoehe + Math.min(koerper, 22 * MM));
  abschnittKopf(bogen, schritt, kopfMass);

  if (schritt.typ === 'freitext') freitext(bogen, { daten, leer });
  else if (schritt.typ === 'personen') personen(bogen, { schritt, daten, leer });
  else if (schritt.typ === 'kriterien') kriterien(bogen, { schritt, daten, leer });
  else if (schritt.typ === 'erklaerung') erklaerung(bogen, { schritt, daten, antrag, leer });
  else if (schritt.typ === 'nurPdf') nurPdf(bogen, { schritt });
  else unbekannt(bogen);

  bogen.y += ABSCHNITT_ABSTAND;
}

/**
 * Mass des Abschnittskopfs, ohne zu zeichnen. `abschnittKopf` zeichnet genau
 * danach, damit Messen und Zeichnen nicht auseinanderlaufen.
 */
function kopfLayout(bogen, schritt) {
  const titelX = RAND + NUMMER_KASTEN + 3 * MM;
  const titel = sichereZeichen(schritt.titel || '');
  const titelBreite = bogen.schriften.fett.widthOfTextAtSize(titel, S_ABSCHNITT);
  const platzRest = INHALT_BREITE - (titelX - RAND) - titelBreite - 4 * MM;
  const zusatz = sichereZeichen(schritt.frage || schritt.hinweis || '');
  // Frage bzw. Hinweis steht wie auf dem Papier rechts neben dem Titel, wenn
  // Platz ist, sonst darunter.
  const daneben = Boolean(zusatz) && platzRest > 40;
  const zeilen = !zusatz ? []
    : umbrich(zusatz, bogen.schriften.normal, S_HINWEIS, daneben ? platzRest : INHALT_BREITE);

  let unterkante = S_ABSCHNITT * ZEILE;
  if (daneben) unterkante = Math.max(unterkante, 3 + zeilen.length * S_HINWEIS * ZEILE);
  else if (zusatz) unterkante = S_ABSCHNITT * ZEILE + 1 * MM + zeilen.length * S_HINWEIS * ZEILE;
  const hoehe = Math.max(unterkante, NUMMER_KASTEN) + 1.3 * MM;

  return { titel, titelX, titelBreite, daneben, zeilen, hoehe };
}

/** Nummer im Kaestchen, Titel, dahinter Frage oder Hinweis. */
function abschnittKopf(bogen, schritt, mass) {
  const oben = bogen.y;
  const nummer = sichereZeichen(schritt.nr === undefined || schritt.nr === null ? '' : schritt.nr);
  const kastenHoehe = NUMMER_KASTEN;

  bogen.seite.drawRectangle({
    x: RAND,
    y: pdfY(bogen, oben + kastenHoehe),
    width: kastenHoehe,
    height: kastenHoehe,
    color: farbe(bogen, FARBEN.teal)
  });
  const nummerBreite = bogen.schriften.fett.widthOfTextAtSize(nummer, S_NUMMER);
  zeichneText(bogen, nummer, {
    x: RAND + (kastenHoehe - nummerBreite) / 2,
    y: oben + (kastenHoehe - S_NUMMER) / 2 - 0.5,
    font: bogen.schriften.fett,
    groesse: S_NUMMER,
    farbe: FARBEN.weiss
  });

  const { titel, titelX, titelBreite, daneben, zeilen } = mass;
  zeichneText(bogen, titel, {
    x: titelX, y: oben + 1.5, font: bogen.schriften.fett, groesse: S_ABSCHNITT, farbe: FARBEN.navy
  });

  // Zeilenweise ohne eigenen Seitenumbruch: der Platz ist in `abschnitt`
  // schon geprueft, der Kopf bleibt so immer beisammen.
  const x = daneben ? titelX + titelBreite + 4 * MM : RAND;
  let y = daneben ? oben + 3 : oben + S_ABSCHNITT * ZEILE + 1 * MM;
  for (const stueck of zeilen) {
    zeichneText(bogen, stueck, {
      x, y, font: bogen.schriften.normal, groesse: S_HINWEIS, farbe: FARBEN.neben
    });
    y += S_HINWEIS * ZEILE;
  }

  bogen.y = oben + mass.hoehe;
}

// Drei Schreiblinien wie auf dem Papier, Abstand 8 mm.
const SCHREIBZEILEN = 3;
const SCHREIBZEILE_HOEHE = 7.2 * MM;

function freitext(bogen, { daten, leer }) {
  if (leer || !String(daten.text || '').trim()) {
    schreiblinien(bogen, SCHREIBZEILEN);
    return;
  }
  schreibe(bogen, sichereZeichen(daten.text), {
    font: bogen.schriften.normal, groesse: S_TEXT, farbe: FARBEN.navy
  });
}

const SPALTE_PAD = 2.5 * MM;

/** Abschnitt 2: zwei Spalten, je Name, Klasse, Datum und Unterschrift. */
function personen(bogen, { schritt, daten, leer }) {
  const anzahl = Math.max(1, Number(schritt.anzahl) || 1);
  const liste = Array.isArray(daten.personen) ? daten.personen : [];
  const spalten = Math.min(anzahl, 2);
  const spaltenBreite = (INHALT_BREITE - (spalten - 1) * 6 * MM) / spalten;
  const hoehe = spaltenHoehe();
  const reihen = Math.ceil(anzahl / 2);

  brauchePlatz(bogen, hoehe * reihen + (reihen - 1) * 4 * MM);
  const oben = bogen.y;

  for (let i = 0; i < anzahl; i++) {
    const person = leer ? {} : (liste[i] || {});
    spalte(bogen, {
      x: RAND + (i % 2) * (spaltenBreite + 6 * MM),
      oben: oben + Math.floor(i / 2) * (hoehe + 4 * MM),
      breite: spaltenBreite,
      hoehe,
      titel: 'Person ' + (i + 1),
      zeilen: [
        { beschriftung: 'Name:', wert: person.name },
        { beschriftung: 'Klasse:', wert: person.klasse },
        { beschriftung: 'Datum:', wert: datumText(person.datum) }
      ],
      unterschrift: person.unterschrift
    });
  }
  bogen.y = oben + hoehe * reihen + (reihen - 1) * 4 * MM;
}

// Hoehe eines Spaltenkastens, Summe der Teile darin. Muss zu `spalte` passen.
function spaltenHoehe() {
  return SPALTE_PAD
    + S_KLEIN * ZEILE + 1 * MM
    + 3 * (S_TEXT * ZEILE + 1 * MM)
    + 1.5 * MM
    + unterschriftHoehe()
    + 1 * MM + S_KLEIN * ZEILE
    + SPALTE_PAD;
}

function spalte(bogen, { x, oben, breite, hoehe, titel, zeilen, unterschrift }) {
  bogen.seite.drawRectangle({
    x,
    y: pdfY(bogen, oben + hoehe),
    width: breite,
    height: hoehe,
    borderColor: farbe(bogen, FARBEN.linie),
    borderWidth: 0.7
  });

  const innenX = x + SPALTE_PAD;
  const innenBreite = breite - 2 * SPALTE_PAD;
  let y = oben + SPALTE_PAD;
  zeichneText(bogen, titel, {
    x: innenX, y, font: bogen.schriften.fett, groesse: S_KLEIN, farbe: FARBEN.neben
  });
  y += S_KLEIN * ZEILE + 1 * MM;

  for (const eintrag of zeilen) {
    const beschriftung = eintrag.beschriftung;
    zeichneText(bogen, beschriftung, {
      x: innenX, y, font: bogen.schriften.normal, groesse: S_TEXT, farbe: FARBEN.neben
    });
    const versatz = bogen.schriften.normal.widthOfTextAtSize(beschriftung, S_TEXT) + 4;
    zeichneText(bogen, sichereZeichen(eintrag.wert || ''), {
      x: innenX + versatz, y, font: bogen.schriften.normal, groesse: S_TEXT, farbe: FARBEN.navy
    });
    linie(bogen, innenX + versatz, y + S_TEXT * ZEILE - 1, innenBreite - versatz);
    y += S_TEXT * ZEILE + 1 * MM;
  }

  y += 1.5 * MM;
  unterschriftFeld(bogen, {
    x: innenX, y, breite: innenBreite, png: unterschrift, beschriftung: 'Unterschrift'
  });
}

/** Abschnitt 3: Kriterien mit Kaestchen, Bestaetigung, Kuerzel, Unterschrift. */
function kriterien(bogen, { schritt, daten, leer }) {
  const liste = Array.isArray(schritt.kriterien) ? schritt.kriterien : [];
  const gesetzt = leer || !Array.isArray(daten.kriterien) ? [] : daten.kriterien;

  for (let i = 0; i < liste.length; i++) {
    ankreuzZeile(bogen, sichereZeichen(liste[i]), gesetzt[i] === true, RAND, INHALT_BREITE);
  }

  if (schritt.bestaetigung) {
    bogen.y += 2 * MM;
    ankreuzZeile(bogen, sichereZeichen(schritt.bestaetigung), leer ? false : daten.empfohlen === true,
      RAND, INHALT_BREITE, bogen.schriften.fett);
  }

  bogen.y += 2 * MM;
  abschluss(bogen, {
    zeilen: [
      { beschriftung: 'Datum:', wert: leer ? '' : datumText(daten.datum) },
      { beschriftung: 'Kürzel:', wert: leer ? '' : daten.kuerzel }
    ],
    unterschrift: leer ? '' : daten.unterschrift,
    beschriftung: 'Unterschrift Lernbegleitung'
  });
}

/** Abschnitt 4: automatische Aussagen, Aussagen zum Ankreuzen, Unterschrift. */
function erklaerung(bogen, { schritt, daten, antrag, leer }) {
  for (const eintrag of automatischeAussagen(leer ? null : antrag, schritt)) {
    ankreuzZeile(bogen, sichereZeichen(eintrag.text), leer ? false : eintrag.erfuellt, RAND, INHALT_BREITE);
  }

  const aussagen = Array.isArray(schritt.aussagen) ? schritt.aussagen : [];
  const gesetzt = leer || !Array.isArray(daten.aussagen) ? [] : daten.aussagen;
  if (aussagen.length > 0) bogen.y += 1.5 * MM;
  for (let i = 0; i < aussagen.length; i++) {
    ankreuzZeile(bogen, sichereZeichen(aussagen[i]), gesetzt[i] === true, RAND, INHALT_BREITE);
  }

  bogen.y += 2 * MM;
  abschluss(bogen, {
    zeilen: [{ beschriftung: 'Datum:', wert: leer ? '' : datumText(daten.datum) }],
    unterschrift: leer ? '' : daten.unterschrift,
    beschriftung: 'Unterschrift Lernende'
  });
}

/** Abschnitt 5: Optionen mit leeren Kaestchen, Linie fuer die Klassenleitung. */
function nurPdf(bogen, { schritt }) {
  const optionen = Array.isArray(schritt.optionen) ? schritt.optionen : [];
  for (const text of optionen) {
    ankreuzZeile(bogen, sichereZeichen(text), false, RAND, INHALT_BREITE);
  }

  bogen.y += 2.5 * MM;
  brauchePlatz(bogen, 9 * MM);
  const breite = 70 * MM;
  const x = SEITE_BREITE - RAND - breite;
  linie(bogen, x, bogen.y, breite);
  zeichneText(bogen, 'Datum / Kürzel Klassenleitung', {
    x, y: bogen.y + 1 * MM, font: bogen.schriften.normal, groesse: S_KLEIN, farbe: FARBEN.neben
  });
  bogen.y += S_KLEIN * ZEILE + 1 * MM;
}

function unbekannt(bogen) {
  // Ein Schritt-Typ aus einer neueren Konfiguration soll das PDF nicht
  // verhindern (DATENMODELL 5). Der Abschnitt bleibt leer, mit Linien.
  schreiblinien(bogen, 2);
}

/** Leere Linien zum Schreiben von Hand, ueber die ganze Breite. */
function schreiblinien(bogen, anzahl) {
  for (let i = 0; i < anzahl; i++) {
    brauchePlatz(bogen, SCHREIBZEILE_HOEHE);
    linie(bogen, RAND, bogen.y + SCHREIBZEILE_HOEHE - 2.5 * MM, INHALT_BREITE);
    bogen.y += SCHREIBZEILE_HOEHE;
  }
}

/**
 * Datum, Kuerzel und Unterschrift am Ende eines Abschnitts, rechts.
 * Datum und Kuerzel stehen **neben** der Unterschrift, nicht darueber. Das
 * spart die Hoehe, die fuer eine Seite fehlt, und liegt naeher am Papier, wo
 * "Datum / Kuerzel" ebenfalls in einer Zeile steht.
 */
const ABSCHLUSS_FELD = 34 * MM;     // Breite fuer Datum und Kuerzel
const ABSCHLUSS_LUECKE = 5 * MM;

/** Hoehe von `abschluss` bei `anzahl` Zeilen links. */
function abschlussHoehe(anzahl) {
  const zeilenHoehe = anzahl * (S_TEXT * ZEILE + 1.2 * MM);
  const sigHoehe = unterschriftHoehe() + 1 * MM + S_KLEIN * ZEILE;
  return Math.max(zeilenHoehe, sigHoehe) + 1.5 * MM;
}

function abschluss(bogen, { zeilen, unterschrift, beschriftung }) {
  const sigBreite = UNTERSCHRIFT_BREITE;
  const breite = ABSCHLUSS_FELD + ABSCHLUSS_LUECKE + sigBreite;
  const zeilenHoehe = zeilen.length * (S_TEXT * ZEILE + 1.2 * MM);
  const sigHoehe = unterschriftHoehe() + 1 * MM + S_KLEIN * ZEILE;
  const hoehe = abschlussHoehe(zeilen.length);

  brauchePlatz(bogen, hoehe);
  const oben = bogen.y;
  const x = SEITE_BREITE - RAND - breite;

  // Die kuerzere Spalte sitzt mittig zur laengeren.
  let y = oben + Math.max(0, (sigHoehe - zeilenHoehe) / 2);
  for (const eintrag of zeilen) {
    zeichneText(bogen, eintrag.beschriftung, {
      x, y, font: bogen.schriften.normal, groesse: S_TEXT, farbe: FARBEN.neben
    });
    const versatz = bogen.schriften.normal.widthOfTextAtSize(eintrag.beschriftung, S_TEXT) + 4;
    zeichneText(bogen, sichereZeichen(eintrag.wert || ''), {
      x: x + versatz, y, font: bogen.schriften.normal, groesse: S_TEXT, farbe: FARBEN.navy
    });
    linie(bogen, x + versatz, y + S_TEXT * ZEILE - 1, ABSCHLUSS_FELD - versatz);
    y += S_TEXT * ZEILE + 1.2 * MM;
  }

  unterschriftFeld(bogen, {
    x: x + ABSCHLUSS_FELD + ABSCHLUSS_LUECKE,
    y: oben + Math.max(0, (zeilenHoehe - sigHoehe) / 2),
    breite: sigBreite,
    png: unterschrift,
    beschriftung
  });
  bogen.y = oben + hoehe;
}

function unterschriftHoehe() {
  return UNTERSCHRIFT_BREITE / 3;   // Unterschriften sind 600 x 200
}

/**
 * Unterschrift als Bild ueber einer Linie. Ohne Bild bleibt die Linie leer,
 * dann kann von Hand unterschrieben werden (leere Vorlage, GoodNotes).
 */
function unterschriftFeld(bogen, { x, y, breite, png, beschriftung }) {
  const bildBreite = Math.min(UNTERSCHRIFT_BREITE, breite);
  const bildHoehe = bildBreite / 3;

  if (png) {
    const bild = bogen.bilder.get(png);
    if (bild) {
      bogen.seite.drawImage(bild, {
        x, y: pdfY(bogen, y + bildHoehe), width: bildBreite, height: bildHoehe
      });
    }
  }
  linie(bogen, x, y + bildHoehe, breite);
  zeichneText(bogen, beschriftung, {
    x, y: y + bildHoehe + 1 * MM, font: bogen.schriften.normal, groesse: S_KLEIN, farbe: FARBEN.neben
  });
}

/** Eine Zeile mit Kaestchen. Der Text umbricht neben dem Kaestchen. */
function ankreuzUmbruch(bogen, text, breite, font) {
  return umbrich(text, font || bogen.schriften.normal, S_TEXT, breite - KASTEN - 2 * MM);
}

function ankreuzHoehe(zeilen) {
  return Math.max(KASTEN, zeilen.length * S_TEXT * ZEILE) + ZEILEN_ABSTAND;
}

function ankreuzZeile(bogen, text, angekreuzt, x, breite, font = null) {
  const schrift = font || bogen.schriften.normal;
  const textX = x + KASTEN + 2 * MM;
  const zeilen = ankreuzUmbruch(bogen, text, breite, schrift);
  const hoehe = ankreuzHoehe(zeilen);

  brauchePlatz(bogen, hoehe);
  const oben = bogen.y;
  kaestchen(bogen, x, oben + 0.5, angekreuzt);

  let y = oben;
  for (const stueck of zeilen) {
    zeichneText(bogen, stueck, { x: textX, y, font: schrift, groesse: S_TEXT, farbe: FARBEN.navy });
    y += S_TEXT * ZEILE;
  }
  bogen.y = oben + hoehe;
}

function kaestchen(bogen, x, oben, angekreuzt) {
  bogen.seite.drawRectangle({
    x,
    y: pdfY(bogen, oben + KASTEN),
    width: KASTEN,
    height: KASTEN,
    borderColor: farbe(bogen, FARBEN.neben),
    borderWidth: 0.8
  });
  if (!angekreuzt) return;
  // Haken aus zwei Strichen. Die Standardschriften kennen kein Hakenzeichen.
  const u = pdfY(bogen, oben + KASTEN);
  const strich = { thickness: 1.4, color: farbe(bogen, FARBEN.navy) };
  bogen.seite.drawLine(Object.assign({
    start: { x: x + KASTEN * 0.2, y: u + KASTEN * 0.5 },
    end: { x: x + KASTEN * 0.42, y: u + KASTEN * 0.24 }
  }, strich));
  bogen.seite.drawLine(Object.assign({
    start: { x: x + KASTEN * 0.42, y: u + KASTEN * 0.24 },
    end: { x: x + KASTEN * 0.82, y: u + KASTEN * 0.76 }
  }, strich));
}

// ---------------------------------------------------------------- Fusszeile

function fusszeile(bogen, { antrag, leer, appVersion }) {
  const version = sichereZeichen(appVersion || '');
  const tag = formatDatum(heute(), 'datum');
  const id = sichereZeichen((antrag && antrag.id) || '');
  const text = leer
    ? 'Vorlage aus SOUL Companion ' + version
    : 'Erstellt mit SOUL Companion ' + version + ' am ' + tag + '.' + (id ? ' Antrag-ID ' + id + '.' : '');

  const seiten = bogen.seiten;
  for (let i = 0; i < seiten.length; i++) {
    const seite = seiten[i];
    const y = FUSS_ABSTAND;
    seite.drawText(text, {
      x: RAND, y, size: S_FUSS, font: bogen.schriften.normal, color: farbe(bogen, FARBEN.neben)
    });
    if (seiten.length > 1) {
      const zaehler = 'Seite ' + (i + 1) + ' von ' + seiten.length;
      const breite = bogen.schriften.normal.widthOfTextAtSize(zaehler, S_FUSS);
      seite.drawText(zaehler, {
        x: SEITE_BREITE - RAND - breite, y, size: S_FUSS, font: bogen.schriften.normal,
        color: farbe(bogen, FARBEN.neben)
      });
    }
  }
}

/**
 * Wenige Angaben im Dokument selbst. Producer und Creator werden ueberschrieben,
 * damit dort nicht die Adresse der Bibliothek steht.
 */
function metadaten(doc, { stufe, leer, appVersion }) {
  const titel = sichereZeichen(stufe.titel || 'Antrag');
  try {
    doc.setTitle(leer ? titel + ' (Vorlage)' : titel);
    doc.setCreator('SOUL Companion ' + sichereZeichen(appVersion || ''));
    doc.setProducer('SOUL Companion ' + sichereZeichen(appVersion || ''));
    // Uhrzeit bleibt aussen vor, das Datum kommt aus dates.js (AP_ALLGEMEIN 5).
    doc.setCreationDate(heute());
    doc.setModificationDate(heute());
  } catch (fehler) {
    // Angaben im Dokument sind Zierde, kein Grund zum Abbruch.
  }
}

// ---------------------------------------------------------------- Bogen

function neuerBogen(doc, PDFLib, schriften) {
  return { doc, PDFLib, schriften, seiten: [], seite: null, y: RAND, bilder: new Map() };
}

function neueSeite(bogen) {
  bogen.seite = bogen.doc.addPage([SEITE_BREITE, SEITE_HOEHE]);
  bogen.seiten.push(bogen.seite);
  bogen.y = RAND;
  return bogen.seite;
}

/** Neue Seite, wenn die Hoehe nicht mehr passt. */
function brauchePlatz(bogen, hoehe) {
  // Kleine Toleranz: ein ganz vorgemerkter Abschnitt soll nicht an
  // Rundungsresten der Einzelschritte doch noch umbrechen.
  if (bogen.y + hoehe <= UNTEN + 0.5) return;
  if (bogen.y <= RAND + 0.01) return;   // eine leere Seite hilft nicht
  neueSeite(bogen);
}

/** y von oben in die Koordinaten von pdf-lib (von unten) umrechnen. */
function pdfY(bogen, vonOben) {
  return SEITE_HOEHE - vonOben;
}

function farbe(bogen, rgb) {
  return bogen.PDFLib.rgb(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
}

/** Einzelne Zeile ohne Umbruch, Position von oben. */
function zeichneText(bogen, text, { x, y, font, groesse, farbe: rgb }) {
  if (!text) return;
  bogen.seite.drawText(text, {
    x,
    y: pdfY(bogen, y + groesse * 0.82),
    size: groesse,
    font,
    color: farbe(bogen, rgb)
  });
}

/** Mehrzeiliger Text, rueckt `bogen.y` vor und bricht notfalls die Seite um. */
function schreibe(bogen, text, { font, groesse, farbe: rgb, x = RAND, maxBreite = INHALT_BREITE }) {
  for (const stueck of umbrich(text, font, groesse, maxBreite)) {
    brauchePlatz(bogen, groesse * ZEILE);
    zeichneText(bogen, stueck, { x, y: bogen.y, font, groesse, farbe: rgb });
    bogen.y += groesse * ZEILE;
  }
}

function linie(bogen, x, y, breite) {
  bogen.seite.drawLine({
    start: { x, y: pdfY(bogen, y) },
    end: { x: x + breite, y: pdfY(bogen, y) },
    thickness: SCHREIBLINIE,
    color: farbe(bogen, FARBEN.linie)
  });
}

// ---------------------------------------------------------------- Textmasse

/**
 * Eigene Umbruchfunktion nach Wortbreite (AP-15). Ein Wort, das allein zu
 * breit ist, wird zeichenweise getrennt, damit nichts aus dem Rand laeuft.
 * @returns {string[]}
 */
export function umbrich(text, font, groesse, maxBreite) {
  const roh = String(text || '').replace(/\s+/g, ' ').trim();
  if (!roh) return [];
  if (maxBreite <= 0) return [roh];

  const zeilen = [];
  let laufend = '';
  for (const wort of roh.split(' ')) {
    const versuch = laufend ? laufend + ' ' + wort : wort;
    if (font.widthOfTextAtSize(versuch, groesse) <= maxBreite) {
      laufend = versuch;
      continue;
    }
    if (laufend) zeilen.push(laufend);
    if (font.widthOfTextAtSize(wort, groesse) <= maxBreite) {
      laufend = wort;
      continue;
    }
    let rest = wort;
    while (rest && font.widthOfTextAtSize(rest, groesse) > maxBreite) {
      // Mindestens ein Zeichen je Zeile, sonst liefe die Schleife endlos,
      // wenn schon ein einzelnes Zeichen breiter ist als die Zeile.
      let schnitt = Math.max(1, rest.length - 1);
      while (schnitt > 1 && font.widthOfTextAtSize(rest.slice(0, schnitt), groesse) > maxBreite) schnitt--;
      zeilen.push(rest.slice(0, schnitt));
      rest = rest.slice(schnitt);
    }
    laufend = rest;
  }
  if (laufend) zeilen.push(laufend);
  return zeilen;
}

/** Groesse so weit verkleinern, bis der Text in eine Zeile passt. */
function passendeGroesse(text, font, groesse, maxBreite, minimum) {
  let wert = groesse;
  while (wert > minimum && font.widthOfTextAtSize(text, wert) > maxBreite) wert -= 0.5;
  return wert;
}

/**
 * Hoehe des Abschnittskoerpers, gemessen mit denselben Umbruechen und
 * Abstaenden wie beim Zeichnen. Aendert sich eine Zeichenfunktion, muss
 * diese Rechnung mitgehen.
 */
function koerperHoehe(bogen, { schritt, daten, antrag, leer }) {
  const summe = (texte, font = null) => texte.reduce(
    (wert, text) => wert + ankreuzHoehe(ankreuzUmbruch(bogen, sichereZeichen(text), INHALT_BREITE, font)), 0);

  if (schritt.typ === 'freitext') {
    if (leer || !String(daten.text || '').trim()) return SCHREIBZEILEN * SCHREIBZEILE_HOEHE;
    return umbrich(sichereZeichen(daten.text), bogen.schriften.normal, S_TEXT, INHALT_BREITE).length * S_TEXT * ZEILE;
  }
  if (schritt.typ === 'personen') {
    const reihen = Math.ceil(Math.max(1, Number(schritt.anzahl) || 1) / 2);
    return spaltenHoehe() * reihen + (reihen - 1) * 4 * MM;
  }
  if (schritt.typ === 'kriterien') {
    const kriterien = Array.isArray(schritt.kriterien) ? schritt.kriterien : [];
    const bestaetigung = schritt.bestaetigung ? 2 * MM + summe([schritt.bestaetigung], bogen.schriften.fett) : 0;
    return summe(kriterien) + bestaetigung + 2 * MM + abschlussHoehe(2);
  }
  if (schritt.typ === 'erklaerung') {
    const automatisch = automatischeAussagen(leer ? null : antrag, schritt).map((eintrag) => eintrag.text);
    const aussagen = Array.isArray(schritt.aussagen) ? schritt.aussagen : [];
    return summe(automatisch) + (aussagen.length > 0 ? 1.5 * MM : 0) + summe(aussagen)
      + 2 * MM + abschlussHoehe(1);
  }
  if (schritt.typ === 'nurPdf') {
    const optionen = Array.isArray(schritt.optionen) ? schritt.optionen : [];
    return summe(optionen) + 2.5 * MM + 9 * MM;
  }
  return 2 * SCHREIBZEILE_HOEHE;
}

function schrittDaten(antrag, schrittId) {
  if (!antrag || !antrag.schritte || !schrittId) return {};
  return antrag.schritte[schrittId] || {};
}

function datumText(iso) {
  const wert = String(iso || '').trim();
  if (!wert) return '';
  try {
    return formatDatum(parseISODate(wert), 'datum');
  } catch (fehler) {
    return wert;
  }
}

/**
 * Dateiname nach AP-15:
 * `Antrag_Stufe<2|3>_<Klasse>_<Name ohne Sonderzeichen>_<JJJJ-MM-TT>.pdf`.
 * Fuer die leere Vorlage steht "Vorlage" an der Stelle von Klasse und Name.
 */
export function dateiname({ antrag, jgst, leer = false }) {
  const stufe = antrag && antrag.zielstufe !== undefined ? String(antrag.zielstufe) : '';
  const tag = toISODate(heute());
  if (leer) return ['Antrag', 'Stufe' + stufe, 'Vorlage', tag].join('_') + '.pdf';

  const kopfDaten = (antrag && antrag.kopf) || {};
  const klasse = sauber(klassenText(antrag, jgst));
  const name = sauber(kopfDaten.name);
  return ['Antrag', 'Stufe' + stufe, klasse, name, tag].filter(Boolean).join('_') + '.pdf';
}

// Umlaute bleiben lesbar, alles andere wird zu "_". Kein Punkt, kein Schraegstrich.
function sauber(wert) {
  return String(wert || '')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Klasse wie "6B". Der Jahrgang steht seit der Gegenpruefung zu AP-15 im
 * Antrag (`kopf.jgst`), damit ein spaeterer Jahrgangswechsel auf dem Geraet
 * die Klasse im PDF nicht veraendert. Aeltere Antraege ohne `kopf.jgst`
 * nehmen den uebergebenen Jahrgang.
 */
export function klassenText(antrag, jgst) {
  const kopfDaten = (antrag && antrag.kopf) || {};
  const gespeichert = kopfDaten.jgst;
  const zahl = gespeichert !== undefined && gespeichert !== null && gespeichert !== '' ? gespeichert : jgst;
  return String(zahl === undefined || zahl === null ? '' : zahl) + String(kopfDaten.klasse || '');
}
