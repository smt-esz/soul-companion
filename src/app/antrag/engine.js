// Zustandsmaschine für den Antrag auf Stufenaufstieg (AP-14, ARCHITEKTUR 5).
//
// Reine Funktionen, kein DOM, kein Speicher, keine Uhr. Deshalb per node
// testbar (tools/test-antrag.mjs). Jede verändernde Funktion gibt ein **neues**
// Antrag-Objekt zurück, das übergebene bleibt unangetastet.
//
// Drei Regeln, die alles andere tragen:
// 1. Ein Schritt ist 'offen', 'in_arbeit' oder 'abgeschlossen' (DATENMODELL 6).
//    Nach außen kommt zusätzlich 'gesperrt', wenn er gerade nicht drankommt.
// 2. Ein abgeschlossener Schritt ist dicht. Er lässt sich nur als Ganzes
//    zurücksetzen, nie einzeln nachbessern (ARCHITEKTUR 5).
// 3. Ein laufender Antrag behält seinen Wortlaut. `neuerAntrag` kopiert die
//    Texte der Stufe nach `antrag.snapshot`, und alle Funktionen lesen zuerst
//    von dort. Änderungen an content/antrag.json ändern laufende Anträge nicht
//    (DATENMODELL 5, REDAKTION 5).
//
// Ein unbekannter `typ` ist kein Absturz, sondern eine Meldung im Schritt.
// So stürzt eine ältere App-Version an einer neueren Konfiguration nicht ab
// (DATENMODELL 5, letzter Hinweis).

/** Meldung für einen Schritt-Typ, den diese App-Version nicht kennt. */
export const UNBEKANNTER_TYP = 'Dieser Abschnitt wird in deiner App-Version noch nicht unterstützt.';

const TYPEN = ['freitext', 'personen', 'kriterien', 'erklaerung', 'nurPdf'];

// 2 bis 4 Buchstaben (AP-14). Umlaute sind erlaubt, Groß- und Kleinschreibung
// wird nicht erzwungen: auf dem Papier schreibt jede Lernbegleitung, wie sie
// unterschreibt.
const KUERZEL_MUSTER = /^[A-Za-zÄÖÜäöüß]{2,4}$/;

// ------------------------------------------------------------- neuerAntrag

/**
 * Legt einen Antrag an. Alle Schritte stehen auf 'offen', die Texte der Stufe
 * liegen als Kopie in `snapshot`.
 *
 * @param {object} config     content/antrag.json (ganz)
 * @param {number|string} zielstufe  2 oder 3
 * @param {string} heuteISO   'YYYY-MM-DD', kommt von außen (dates.js)
 * @param {string} [id]       vorhandene ID, z. B. aus store.antraege.create
 * @returns {object} Antrag nach DATENMODELL 6, zusätzlich `snapshot`
 */
export function neuerAntrag(config, zielstufe, heuteISO, id = null) {
  const stufe = stufeAusConfig(config, zielstufe);
  if (!stufe) {
    throw new Error('Für Stufe ' + zielstufe + ' steht keine Konfiguration bereit.');
  }
  const schritte = {};
  for (const schritt of schritteVon(stufe)) {
    // nurPdf steht nur im PDF, in der App gibt es dafür nichts zu speichern.
    if (schritt.typ === 'nurPdf') continue;
    schritte[schritt.id] = leererSchritt(schritt);
  }
  return {
    id: id || neueId(heuteISO),
    zielstufe: Number(zielstufe),
    configVersion: config && config.configVersion ? String(config.configVersion) : null,
    erstellt: heuteISO,
    geaendert: heuteISO,
    kopf: { name: '', klasse: '' },
    schritte,
    snapshot: kopie(stufe),
    pdfErzeugt: null,
    geteilt: null
  };
}

// ------------------------------------------------------------- Status

/**
 * Status eines Schritts aus Sicht der Oberfläche.
 * @returns {'gesperrt'|'offen'|'in_arbeit'|'abgeschlossen'}
 */
export function schrittStatus(antrag, config, schrittId) {
  const stufe = stufeVon(config, antrag);
  const schritt = schrittDefinition(stufe, schrittId);
  // Unbekannter Schritt und nurPdf sind in der App nie bearbeitbar.
  if (!schritt || schritt.typ === 'nurPdf') return 'gesperrt';

  const daten = schrittDaten(antrag, schrittId);
  const gespeichert = daten && daten.status ? String(daten.status) : 'offen';
  if (gespeichert === 'abgeschlossen') return 'abgeschlossen';
  if (!voraussetzungErfuellt(antrag, stufe, schritt)) return 'gesperrt';
  return gespeichert === 'in_arbeit' ? 'in_arbeit' : 'offen';
}

/** true, solange der Schritt bearbeitet werden darf. */
export function kannBearbeiten(antrag, config, schrittId) {
  const status = schrittStatus(antrag, config, schrittId);
  return status === 'offen' || status === 'in_arbeit';
}

/**
 * Schritt 4 (typ erklaerung) kommt erst, wenn alle Schritte davor
 * abgeschlossen sind (AP-14, ARCHITEKTUR 5). Alle anderen Schritte sind in
 * beliebiger Reihenfolge möglich, genau wie auf dem Papier.
 */
function voraussetzungErfuellt(antrag, stufe, schritt) {
  if (schritt.typ !== 'erklaerung') return true;
  for (const vorher of schritteVor(stufe, schritt.id)) {
    if (vorher.typ === 'nurPdf') continue;
    const daten = schrittDaten(antrag, vorher.id);
    if (!daten || daten.status !== 'abgeschlossen') return false;
  }
  return true;
}

// ------------------------------------------------------------- Bearbeiten

/**
 * Übernimmt Eingaben in einen Schritt und setzt ihn auf 'in_arbeit'.
 * Ein abgeschlossener oder unbekannter Schritt bleibt unverändert, damit ein
 * verirrter Aufruf keine unterschriebene Angabe überschreibt.
 *
 * @param {string} [heuteISO]  setzt zusätzlich `geaendert`
 */
export function aktualisiere(antrag, schrittId, patch, heuteISO = null) {
  const daten = schrittDaten(antrag, schrittId);
  if (!daten || daten.status === 'abgeschlossen') return antrag;

  const neu = kopieAntrag(antrag);
  neu.schritte[schrittId] = Object.assign({}, daten, patch || {}, { status: 'in_arbeit' });
  if (heuteISO) neu.geaendert = heuteISO;
  return neu;
}

/**
 * Prüft einen Schritt.
 * @returns {{ ok: boolean, fehler: string[] }}
 */
export function pruefeSchritt(antrag, config, schrittId) {
  const stufe = stufeVon(config, antrag);
  const schritt = schrittDefinition(stufe, schrittId);
  if (!schritt) return { ok: false, fehler: [UNBEKANNTER_TYP] };
  if (!TYPEN.includes(schritt.typ)) return { ok: false, fehler: [UNBEKANNTER_TYP] };
  // nurPdf wird in der App nicht ausgefüllt, es gibt also nichts zu prüfen.
  if (schritt.typ === 'nurPdf') return { ok: true, fehler: [] };

  if (!voraussetzungErfuellt(antrag, stufe, schritt)) {
    return { ok: false, fehler: ['Schließe zuerst die Schritte davor ab.'] };
  }

  const daten = schrittDaten(antrag, schrittId) || {};
  const fehler = [];

  if (schritt.typ === 'freitext') {
    const min = Number(schritt.minZeichen) || 0;
    const text = String(daten.text || '').trim();
    if (text.length < min) fehler.push('Bitte schreibe mindestens ' + min + ' Zeichen.');
  }

  if (schritt.typ === 'personen') {
    const anzahl = Number(schritt.anzahl) || 0;
    const personen = Array.isArray(daten.personen) ? daten.personen : [];
    for (let i = 0; i < anzahl; i++) {
      const person = personen[i] || {};
      const nummer = i + 1;
      if (!String(person.name || '').trim()) fehler.push('Bei Person ' + nummer + ' fehlt der Name.');
      if (!String(person.klasse || '').trim()) fehler.push('Bei Person ' + nummer + ' fehlt die Klasse.');
      if (!String(person.unterschrift || '')) fehler.push('Person ' + nummer + ' hat noch nicht unterschrieben.');
    }
  }

  if (schritt.typ === 'kriterien') {
    // Die Kriterien selbst dürfen teilweise leer bleiben, wie auf dem Papier
    // (AP-14). Pflicht sind Bestätigung, Kürzel und Unterschrift.
    if (daten.empfohlen !== true) {
      fehler.push('Die Bestätigung "' + (schritt.bestaetigung || '') + '" fehlt.');
    }
    if (!KUERZEL_MUSTER.test(String(daten.kuerzel || '').trim())) {
      fehler.push('Das Kürzel fehlt oder passt nicht. Es besteht aus 2 bis 4 Buchstaben.');
    }
    if (!String(daten.unterschrift || '')) fehler.push('Die Unterschrift fehlt.');
  }

  if (schritt.typ === 'erklaerung') {
    const aussagen = Array.isArray(schritt.aussagen) ? schritt.aussagen : [];
    const gesetzt = Array.isArray(daten.aussagen) ? daten.aussagen : [];
    if (aussagen.some((_, i) => gesetzt[i] !== true)) fehler.push('Hake alle Aussagen an.');
    if (!String(daten.unterschrift || '')) fehler.push('Die Unterschrift fehlt.');
  }

  return { ok: fehler.length === 0, fehler };
}

/**
 * Schließt einen Schritt ab, wenn die Prüfung ok ist.
 * Sonst kommt der Antrag unverändert zurück, die Meldungen holt die Oberfläche
 * über `pruefeSchritt`.
 */
export function abschliessen(antrag, config, schrittId, heuteISO = null) {
  if (!pruefeSchritt(antrag, config, schrittId).ok) return antrag;
  const daten = schrittDaten(antrag, schrittId);
  if (!daten) return antrag;

  const neu = kopieAntrag(antrag);
  neu.schritte[schrittId] = Object.assign({}, daten, { status: 'abgeschlossen' });
  if (heuteISO) neu.geaendert = heuteISO;
  return neu;
}

/**
 * Setzt einen Schritt vollständig zurück: leer und 'offen'.
 * Schritte, deren Voraussetzung dadurch wegfällt (Schritt 4 hängt an 1 bis 3),
 * gehen mit zurück. Sonst stünde eine Erklärung unterschrieben da, obwohl das,
 * was sie bestätigt, nicht mehr gilt.
 *
 * Die Textvorlage kommt aus `antrag.snapshot`. Fehlt der (alte Daten), werden
 * die vorhandenen Felder geleert, ohne die Form zu verändern.
 */
export function zuruecksetzen(antrag, schrittId, heuteISO = null) {
  const daten = schrittDaten(antrag, schrittId);
  if (!daten) return antrag;

  const stufe = stufeVon(null, antrag);
  const neu = kopieAntrag(antrag);
  neu.schritte[schrittId] = leerenNach(stufe, schrittId, daten);

  // Danach alles einsammeln, was jetzt in der Luft hängt.
  for (const schritt of schritteVon(stufe)) {
    if (schritt.typ === 'nurPdf' || schritt.id === schrittId) continue;
    const eigene = neu.schritte[schritt.id];
    if (!eigene || eigene.status === 'offen') continue;
    if (!voraussetzungErfuellt(neu, stufe, schritt)) {
      neu.schritte[schritt.id] = leerenNach(stufe, schritt.id, eigene);
    }
  }

  if (heuteISO) neu.geaendert = heuteISO;
  return neu;
}

/** true, wenn alle Schritte außer nurPdf abgeschlossen sind. */
export function bereitFuerPdf(antrag, config) {
  const stufe = stufeVon(config, antrag);
  const schritte = schritteVon(stufe).filter((schritt) => schritt.typ !== 'nurPdf');
  if (schritte.length === 0) return false;
  return schritte.every((schritt) => {
    const daten = schrittDaten(antrag, schritt.id);
    return Boolean(daten) && daten.status === 'abgeschlossen';
  });
}

/**
 * Welche Texte gelten für diesen Antrag?
 * Immer die gespeicherten aus `snapshot`. Weicht die Version der Datei davon
 * ab, gibt es zusätzlich einen Hinweis für die Oberfläche.
 *
 * @returns {{ stufe: object|null, version: string|null, aktuell: string|null,
 *             veraltet: boolean, hinweis: string|null }}
 */
export function configFuer(antrag, configAktuell) {
  const stufe = stufeVon(configAktuell, antrag);
  const version = antrag && antrag.configVersion ? String(antrag.configVersion) : null;
  const aktuell = configAktuell && configAktuell.configVersion ? String(configAktuell.configVersion) : null;
  const veraltet = Boolean(version && aktuell && version !== aktuell);
  return {
    stufe,
    version,
    aktuell,
    veraltet,
    hinweis: veraltet
      ? 'Dieser Antrag läuft mit dem Text, der beim Anlegen galt. So ändert sich dein Antrag nicht, während du ihn ausfüllst.'
      : null
  };
}

/**
 * Fortschritt für die Liste auf #/antrag ("Schritt 2 von 4").
 * Nicht in der API-Liste von AP-14, aber dort in der Oberfläche verlangt.
 * @returns {{ erledigt: number, gesamt: number, aktuell: object|null }}
 */
export function fortschritt(antrag, config) {
  const stufe = stufeVon(config, antrag);
  const schritte = schritteVon(stufe).filter((schritt) => schritt.typ !== 'nurPdf');
  let erledigt = 0;
  let aktuell = null;
  for (const schritt of schritte) {
    const status = schrittStatus(antrag, stufe, schritt.id);
    if (status === 'abgeschlossen') {
      erledigt++;
      continue;
    }
    if (!aktuell && status !== 'gesperrt') aktuell = schritt;
  }
  return { erledigt, gesamt: schritte.length, aktuell };
}

/**
 * Die automatischen Aussagen aus Schritt 4: gesetzt, sobald der genannte
 * Schritt abgeschlossen ist (AP-14). Sie werden nicht gespeichert, sondern
 * jedes Mal aus dem Zustand abgeleitet.
 * @returns {Array<{ text: string, erfuellt: boolean }>}
 */
export function automatischeAussagen(antrag, schritt) {
  const liste = Array.isArray(schritt && schritt.automatisch) ? schritt.automatisch : [];
  return liste.map((eintrag) => {
    const daten = schrittDaten(antrag, eintrag && eintrag.wennSchritt);
    return {
      text: String((eintrag && eintrag.text) || ''),
      erfuellt: Boolean(daten) && daten.status === 'abgeschlossen'
    };
  });
}

// ------------------------------------------------------------- Konfiguration

/**
 * Die geltende Stufen-Konfiguration.
 * Reihenfolge: gespeicherter Snapshot des Antrags, sonst die passende Stufe
 * aus der übergebenen Konfiguration. `config` darf die ganze antrag.json oder
 * schon eine Stufen-Konfiguration sein, damit die Oberfläche nicht bei jedem
 * Aufruf auswählen muss.
 */
export function stufeVon(config, antrag) {
  if (antrag && antrag.snapshot && Array.isArray(antrag.snapshot.schritte)) return antrag.snapshot;
  if (config && Array.isArray(config.schritte)) return config;
  return stufeAusConfig(config, antrag && antrag.zielstufe);
}

function stufeAusConfig(config, zielstufe) {
  if (!config || !config.stufen || zielstufe === null || zielstufe === undefined) return null;
  const eintrag = config.stufen[String(zielstufe)];
  return eintrag && Array.isArray(eintrag.schritte) ? eintrag : null;
}

/** Schritte einer Stufe, immer ein Array. */
export function schritteVon(stufe) {
  return stufe && Array.isArray(stufe.schritte) ? stufe.schritte.filter(Boolean) : [];
}

function schritteVor(stufe, schrittId) {
  const alle = schritteVon(stufe);
  const index = alle.findIndex((schritt) => schritt.id === schrittId);
  return index <= 0 ? [] : alle.slice(0, index);
}

export function schrittDefinition(stufe, schrittId) {
  if (!schrittId) return null;
  return schritteVon(stufe).find((schritt) => schritt.id === schrittId) || null;
}

function schrittDaten(antrag, schrittId) {
  if (!antrag || !antrag.schritte || !schrittId) return null;
  return antrag.schritte[schrittId] || null;
}

// ------------------------------------------------------------- Hilfsmittel

function leererSchritt(schritt) {
  if (schritt.typ === 'freitext') {
    return { status: 'offen', text: '' };
  }
  if (schritt.typ === 'personen') {
    const anzahl = Number(schritt.anzahl) || 0;
    const personen = [];
    for (let i = 0; i < anzahl; i++) {
      personen.push({ name: '', klasse: '', datum: '', unterschrift: '' });
    }
    return { status: 'offen', personen };
  }
  if (schritt.typ === 'kriterien') {
    const anzahl = Array.isArray(schritt.kriterien) ? schritt.kriterien.length : 0;
    return {
      status: 'offen',
      kriterien: new Array(anzahl).fill(false),
      empfohlen: false,
      kuerzel: '',
      datum: '',
      unterschrift: ''
    };
  }
  if (schritt.typ === 'erklaerung') {
    const anzahl = Array.isArray(schritt.aussagen) ? schritt.aussagen.length : 0;
    return { status: 'offen', aussagen: new Array(anzahl).fill(false), datum: '', unterschrift: '' };
  }
  // Unbekannter Typ: nur der Status, damit nichts verloren geht.
  return { status: 'offen' };
}

// Leert einen Schritt. Mit Definition entsteht die richtige leere Form, ohne
// Definition bleiben die vorhandenen Felder erhalten und werden geleert.
function leerenNach(stufe, schrittId, daten) {
  const schritt = schrittDefinition(stufe, schrittId);
  if (schritt) return leererSchritt(schritt);
  const leer = { status: 'offen' };
  for (const [schluessel, wert] of Object.entries(daten || {})) {
    if (schluessel === 'status') continue;
    if (Array.isArray(wert)) {
      leer[schluessel] = wert.map((eintrag) => (
        eintrag && typeof eintrag === 'object'
          ? Object.fromEntries(Object.keys(eintrag).map((k) => [k, '']))
          : (typeof eintrag === 'boolean' ? false : '')
      ));
      continue;
    }
    leer[schluessel] = typeof wert === 'boolean' ? false : '';
  }
  return leer;
}

/** Flache Kopie des Antrags mit eigener Schritt-Ebene. */
function kopieAntrag(antrag) {
  return Object.assign({}, antrag, { schritte: Object.assign({}, antrag && antrag.schritte) });
}

function kopie(wert) {
  return JSON.parse(JSON.stringify(wert));
}

// Gleiche Form wie store.js: 'a-20261027-1a2b' (DATENMODELL 6).
function neueId(heuteISO) {
  return 'a-' + String(heuteISO).replace(/-/g, '') + '-' + zufallsteil();
}

function zufallsteil() {
  if (typeof crypto !== 'undefined' && crypto && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(2);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
}
