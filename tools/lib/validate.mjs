// Pruefregeln fuer den Build (AP-02, DATENMODELL 3 und 5).
//
// Alle Regeln melden ueber ein `Meldungen`-Objekt. Eine Meldung nennt immer
// Datei, Blatt, Zeile und Feld, soweit bekannt:
//
//   FEHLER Jg5.xlsx > Termine > Zeile 14 > datum: 2026-10-14 liegt in den Herbstferien
//
// Die Datumsfunktionen kommen aus src/app/dates.js, damit App und Build
// denselben Kalender benutzen (AP_ALLGEMEIN.md, Regel 5).

import { parseISODate, toISODate, formatDatum, isWeekend, mondayOf } from '../../src/app/dates.js';
import { istISODatum } from './excel.mjs';

export const FACH_OFFEN = 'offen';
export const SLOT_STATUS = ['fest', 'wahl', 'vorlaeufig', 'offen'];
export const SONDERWOCHEN_ARTEN = ['themenwoche', 'soul-basics', 'puffer', 'kennenlernen', 'einfuehrung', 'besinntage', 'fvu', 'letzte-woche', 'sonstiges'];
export const STATION_ARTEN = ['pflicht', 'wahl'];
export const INPUT_ARTEN = ['fach', 'methode', 'baustein'];
export const TERMIN_ARTEN = ['input', 'coaching', 'sonstiges', 'entfall'];
export const TONLAGEN = ['verspielt', 'klar', 'sachlich'];
export const WISSEN_BEREICHE = ['soul', 'ablauf', 'hilfe', 'stufen', 'faq', 'glossar'];
export const WISSEN_STATUS = ['entwurf', 'freigegeben'];
export const ANTRAG_TYPEN = ['freitext', 'personen', 'kriterien', 'erklaerung', 'nurPdf'];

const KUERZEL = /^[A-ZÄÖÜ]{2,4}$/;
const ID_MUSTER = /^[a-z0-9][a-z0-9-]*$/;

/** Sammelt Fehler und Warnungen und bringt sie in die vereinbarte Form. */
export class Meldungen {
  constructor() {
    this.liste = [];
  }

  fehler(ort, text) {
    this.liste.push({ art: 'fehler', ...ort, text });
  }

  warnung(ort, text) {
    this.liste.push({ art: 'warnung', ...ort, text });
  }

  get alleFehler() {
    return this.liste.filter((m) => m.art === 'fehler');
  }

  get warnungen() {
    return this.liste.filter((m) => m.art === 'warnung');
  }

  hatFehler() {
    return this.liste.some((m) => m.art === 'fehler');
  }

  /** Alle Meldungen als Textzeilen, Fehler zuerst. */
  zeilen() {
    const fehler = this.alleFehler.map(formatiere);
    const warnungen = this.warnungen.map(formatiere);
    return { fehler, warnungen };
  }
}

/** Eine Meldung als eine Zeile. */
export function formatiere(meldung) {
  const teile = [meldung.art === 'fehler' ? 'FEHLER' : 'WARNUNG'];
  if (meldung.datei) teile.push(meldung.datei);
  if (meldung.blatt) teile.push(meldung.blatt);
  if (meldung.zeile) teile.push('Zeile ' + meldung.zeile);
  if (meldung.feld) teile.push(meldung.feld);
  return teile.join(' › ') + ': ' + meldung.text;
}

// ---------------------------------------------------------------- Hilfsmittel

/** Ferienzeitraum, in dem ein Tag liegt, sonst null. */
export function ferienAm(iso, schule) {
  const ferien = (schule && Array.isArray(schule.ferien)) ? schule.ferien : [];
  for (const zeitraum of ferien) {
    if (!istISODatum(zeitraum.von) || !istISODatum(zeitraum.bis)) continue;
    if (iso >= zeitraum.von && iso <= zeitraum.bis) return zeitraum;
  }
  return null;
}

/**
 * Warum ein Tag kein Schultag ist, als fertiger Satzteil. null heisst: Schultag.
 */
export function keinSchultagGrund(iso, schule) {
  const datum = parseISODate(iso);
  if (isWeekend(datum)) {
    return 'ist ein ' + formatDatum(datum, 'tagLang') + ', kein Schultag';
  }
  const ferien = ferienAm(iso, schule);
  if (ferien) {
    const name = ferien.name ? String(ferien.name) : 'den Ferien';
    return 'liegt in ' + (ferien.name ? 'den ' + name : name);
  }
  return null;
}

function pruefeDatum(meldungen, ort, wert, pflicht = true) {
  if (wert === '' || wert === null || wert === undefined) {
    if (pflicht) meldungen.fehler(ort, 'Datum fehlt.');
    return false;
  }
  if (!istISODatum(wert)) {
    meldungen.fehler(ort, String(wert) + ' ist kein Datum im Format JJJJ-MM-TT.');
    return false;
  }
  return true;
}

// ------------------------------------------------------------ content/index.json

export function pruefeIndex(index, bekannteModule, meldungen) {
  const ort = { datei: 'index.json' };
  if (!index || typeof index !== 'object') {
    meldungen.fehler(ort, 'Die Datei enthaelt kein Objekt.');
    return;
  }
  if (!Number.isInteger(index.schema)) {
    meldungen.warnung({ ...ort, feld: 'schema' }, 'Feld fehlt oder ist keine ganze Zahl.');
  }
  if (typeof index.schuljahr !== 'string' || index.schuljahr.trim() === '') {
    meldungen.fehler({ ...ort, feld: 'schuljahr' }, 'Feld fehlt (Beispiel: "2026/27").');
  }
  if (!Array.isArray(index.jahrgaenge) || index.jahrgaenge.length === 0) {
    meldungen.fehler({ ...ort, feld: 'jahrgaenge' }, 'Es ist kein Jahrgang eingetragen.');
  } else {
    for (const jgst of index.jahrgaenge) {
      if (!Number.isInteger(Number(jgst))) {
        meldungen.fehler({ ...ort, feld: 'jahrgaenge' }, String(jgst) + ' ist keine Jahrgangsstufe.');
      }
    }
  }
  if (!Array.isArray(index.module) || index.module.length === 0) {
    meldungen.warnung({ ...ort, feld: 'module' }, 'Es ist kein Modul eingetragen, die App zeigt dann nur das Onboarding.');
  } else {
    for (const modul of index.module) {
      if (!bekannteModule.includes(String(modul))) {
        meldungen.fehler({ ...ort, feld: 'module' },
          'Das Modul "' + modul + '" gibt es nicht. Vorhanden: ' + bekannteModule.join(', ') + '.');
      }
    }
  }
}

// ------------------------------------------------------------ schule.xlsx

export function pruefeSchule(schule, meldungen) {
  const datei = 'schule.xlsx';

  if (schule.faecher.length === 0) {
    meldungen.warnung({ datei, blatt: 'Faecher' }, 'Kein Fach eingetragen.');
  }
  const fachIds = new Set();
  for (const fach of schule.faecher) {
    const ort = { datei, blatt: 'Faecher', zeile: fach.__zeile };
    if (!fach.id) {
      meldungen.fehler({ ...ort, feld: 'id' }, 'Fach-ID fehlt.');
    } else if (!ID_MUSTER.test(fach.id)) {
      meldungen.fehler({ ...ort, feld: 'id' }, '"' + fach.id + '" ist keine gueltige ID (klein, ohne Leerzeichen).');
    } else if (fachIds.has(fach.id)) {
      meldungen.fehler({ ...ort, feld: 'id' }, 'Die ID "' + fach.id + '" kommt mehrfach vor.');
    } else {
      fachIds.add(fach.id);
    }
    if (fach.id === FACH_OFFEN) {
      meldungen.fehler({ ...ort, feld: 'id' }, '"offen" ist reserviert fuer Slots ohne Fach.');
    }
    for (const feld of ['name', 'kurz', 'farbe', 'symbol']) {
      if (!fach[feld]) meldungen.fehler({ ...ort, feld }, 'Feld ist leer.');
    }
    if (fach.kurz && String(fach.kurz).length > 3) {
      meldungen.warnung({ ...ort, feld: 'kurz' }, 'Laenger als 3 Zeichen, das Abzeichen wird eng.');
    }
    if (!Number.isFinite(fach.reihenfolge)) {
      meldungen.warnung({ ...ort, feld: 'reihenfolge' }, 'Keine Zahl, die Sortierung ist dann zufaellig.');
    }
  }

  if (schule.ferien.length === 0) {
    meldungen.warnung({ datei, blatt: 'Ferien' },
      'Keine Ferien eingetragen. Ohne Ferien kann der Build Termine nicht auf Schultage pruefen.');
  }
  for (const zeitraum of schule.ferien) {
    const ort = { datei, blatt: 'Ferien', zeile: zeitraum.__zeile };
    if (!zeitraum.name) meldungen.warnung({ ...ort, feld: 'name' }, 'Name fehlt.');
    const vonOk = pruefeDatum(meldungen, { ...ort, feld: 'von' }, zeitraum.von);
    const bisOk = pruefeDatum(meldungen, { ...ort, feld: 'bis' }, zeitraum.bis);
    if (vonOk && bisOk && zeitraum.von > zeitraum.bis) {
      meldungen.fehler({ ...ort, feld: 'bis' }, zeitraum.bis + ' liegt vor von (' + zeitraum.von + ').');
    }
  }

  if (schule.stufen.length === 0) {
    meldungen.warnung({ datei, blatt: 'Stufen' }, 'Keine Stufen eingetragen.');
  }
  const stufenIds = new Set();
  for (const stufe of schule.stufen) {
    const ort = { datei, blatt: 'Stufen', zeile: stufe.__zeile };
    if (!Number.isInteger(stufe.id)) {
      meldungen.fehler({ ...ort, feld: 'id' }, 'Die Stufe braucht eine ganze Zahl als ID.');
    } else if (stufenIds.has(stufe.id)) {
      meldungen.fehler({ ...ort, feld: 'id' }, 'Die ID ' + stufe.id + ' kommt mehrfach vor.');
    } else {
      stufenIds.add(stufe.id);
    }
    if (!stufe.name) meldungen.fehler({ ...ort, feld: 'name' }, 'Name fehlt.');
    if (!stufe.symbol) meldungen.warnung({ ...ort, feld: 'symbol' }, 'Symbol fehlt.');
  }
}

// ------------------------------------------------------------ JgN.xlsx

export function pruefeJahrgang(jg, schule, meldungen, optionen = {}) {
  const datei = optionen.datei || ('Jg' + jg.jgst + '.xlsx');
  const fachIds = new Set(schule.faecher.map((fach) => fach.id));
  const klassen = Array.isArray(jg.klassen) ? jg.klassen : [];

  pruefeJahrgangsblatt(jg, datei, meldungen);
  pruefeSonderwochen(jg, datei, meldungen);
  const raster = pruefeRaster(jg, datei, meldungen);
  const bausteine = pruefeBausteine(jg, datei, fachIds, meldungen, optionen);
  pruefeSlots(jg, schule, datei, fachIds, bausteine, meldungen);
  const inputs = pruefeInputs(jg, datei, fachIds, bausteine, meldungen);
  pruefeCoachings(jg, datei, klassen, meldungen);
  pruefeTermine(jg, schule, datei, fachIds, inputs, klassen, raster, meldungen);
}

function pruefeJahrgangsblatt(jg, datei, meldungen) {
  const ort = { datei, blatt: 'Jahrgang', zeile: jg.__zeile };
  if (!Number.isInteger(jg.jgst)) {
    meldungen.fehler({ ...ort, feld: 'jgst' }, 'Die Jahrgangsstufe fehlt oder ist keine Zahl.');
  }
  if (!jg.ton) {
    meldungen.warnung({ ...ort, feld: 'ton' }, 'Keine Tonlage gewaehlt, die App nimmt "klar".');
  } else if (!TONLAGEN.includes(jg.ton)) {
    meldungen.fehler({ ...ort, feld: 'ton' },
      '"' + jg.ton + '" ist keine Tonlage. Erlaubt: ' + TONLAGEN.join(', ') + '.');
  }
  if (!Array.isArray(jg.klassen) || jg.klassen.length === 0) {
    meldungen.warnung({ ...ort, feld: 'klassen' }, 'Keine Klassen eingetragen.');
  }
  if (jg.fruehesterAufstieg) {
    pruefeDatum(meldungen, { ...ort, feld: 'fruehesterAufstieg' }, jg.fruehesterAufstieg);
  }
}

function pruefeSonderwochen(jg, datei, meldungen) {
  for (const woche of jg.sonderwochen) {
    const ort = { datei, blatt: 'Sonderwochen', zeile: woche.__zeile };
    const vonOk = pruefeDatum(meldungen, { ...ort, feld: 'von' }, woche.von);
    const bisOk = pruefeDatum(meldungen, { ...ort, feld: 'bis' }, woche.bis);
    if (vonOk && bisOk && woche.von > woche.bis) {
      meldungen.fehler({ ...ort, feld: 'bis' }, woche.bis + ' liegt vor von (' + woche.von + ').');
    }
    if (!woche.titel) meldungen.warnung({ ...ort, feld: 'titel' }, 'Titel fehlt.');
    if (woche.art && !SONDERWOCHEN_ARTEN.includes(woche.art)) {
      meldungen.fehler({ ...ort, feld: 'art' },
        '"' + woche.art + '" ist keine bekannte Art. Erlaubt: ' + SONDERWOCHEN_ARTEN.join(', ') + '.');
    }
  }
}

function pruefeRaster(jg, datei, meldungen) {
  const ids = new Set();
  for (const eintrag of jg.raster) {
    const ort = { datei, blatt: 'Raster', zeile: eintrag.__zeile };
    if (!eintrag.id) {
      meldungen.fehler({ ...ort, feld: 'id' }, 'ID fehlt.');
    } else if (ids.has(eintrag.id)) {
      meldungen.fehler({ ...ort, feld: 'id' }, 'Die ID "' + eintrag.id + '" kommt mehrfach vor.');
    } else {
      ids.add(eintrag.id);
    }
    const vonOk = pruefeDatum(meldungen, { ...ort, feld: 'von' }, eintrag.von);
    const bisOk = pruefeDatum(meldungen, { ...ort, feld: 'bis' }, eintrag.bis);
    if (vonOk && bisOk && eintrag.von > eintrag.bis) {
      meldungen.fehler({ ...ort, feld: 'bis' }, eintrag.bis + ' liegt vor von (' + eintrag.von + ').');
    }
  }
  return ids;
}

function pruefeBausteine(jg, datei, fachIds, meldungen, optionen) {
  const bausteine = new Map();
  for (const baustein of jg.bausteine) {
    const ort = { datei, blatt: 'Bausteine', zeile: baustein.__zeile };
    if (!baustein.id) {
      meldungen.fehler({ ...ort, feld: 'id' }, 'ID fehlt.');
      continue;
    }
    if (bausteine.has(baustein.id)) {
      meldungen.fehler({ ...ort, feld: 'id' }, 'Die ID "' + baustein.id + '" kommt mehrfach vor.');
      continue;
    }
    bausteine.set(baustein.id, baustein);

    if (!baustein.fach) {
      meldungen.fehler({ ...ort, feld: 'fach' }, 'Fach fehlt.');
    } else if (!fachIds.has(baustein.fach)) {
      meldungen.fehler({ ...ort, feld: 'fach' },
        '"' + baustein.fach + '" ist kein bekanntes Fach. Bekannt: ' + [...fachIds].join(', ') + '.');
    }
    if (!baustein.titel) {
      meldungen.warnung({ ...ort, feld: 'titel' }, 'Kein Titel, die App zeigt "Thema folgt".');
    }
    if (optionen.ziel === 'oeffentlich' && baustein.material) {
      meldungen.fehler({ ...ort, feld: 'material' },
        'Im oeffentlichen Build darf kein Material stehen. Bitte leeren oder mit --ziel=intern bauen.');
    }

    pruefeStationen(baustein, datei, meldungen);
  }

  for (const station of jg.stationenOhneBaustein) {
    meldungen.fehler({ datei, blatt: 'Stationen', zeile: station.__zeile, feld: 'baustein' },
      'Den Baustein "' + station.baustein + '" gibt es im Blatt Bausteine nicht.');
  }

  return bausteine;
}

function pruefeStationen(baustein, datei, meldungen) {
  const nummern = new Set();
  for (const station of baustein.stationen) {
    const ort = { datei, blatt: 'Stationen', zeile: station.__zeile };
    if (!Number.isInteger(station.nr)) {
      meldungen.fehler({ ...ort, feld: 'nr' }, 'Die Station braucht eine ganze Zahl als Nummer.');
    } else if (nummern.has(station.nr)) {
      meldungen.fehler({ ...ort, feld: 'nr' },
        'Die Nummer ' + station.nr + ' kommt im Baustein "' + baustein.id + '" mehrfach vor.');
    } else {
      nummern.add(station.nr);
    }
    if (!station.titel) meldungen.warnung({ ...ort, feld: 'titel' }, 'Titel fehlt.');
    if (station.art && !STATION_ARTEN.includes(station.art)) {
      meldungen.fehler({ ...ort, feld: 'art' },
        '"' + station.art + '" ist keine bekannte Art. Erlaubt: ' + STATION_ARTEN.join(', ') + '.');
    }
    if (station.niveau !== null && (!Number.isInteger(station.niveau) || station.niveau < 1 || station.niveau > 3)) {
      meldungen.fehler({ ...ort, feld: 'niveau' }, 'Das Niveau muss 1, 2 oder 3 sein.');
    }
  }

  // Luecke in der Nummerierung: nur Warnung (DATENMODELL 3).
  const sortiert = [...nummern].sort((a, b) => a - b);
  for (let i = 0; i < sortiert.length; i++) {
    if (sortiert[i] !== i + 1) {
      meldungen.warnung({ datei, blatt: 'Stationen', zeile: baustein.__zeile, feld: 'nr' },
        'Die Stationen von "' + baustein.id + '" sind nicht lueckenlos ab 1: '
        + sortiert.join(', ') + '.');
      break;
    }
  }

  const nachweis = baustein.gelingensnachweisStation;
  if (nachweis !== null && nummern.size > 0 && !nummern.has(nachweis)) {
    meldungen.warnung({ datei, blatt: 'Bausteine', zeile: baustein.__zeile, feld: 'gelingensnachweisStation' },
      'Station ' + nachweis + ' gibt es im Baustein "' + baustein.id + '" nicht.');
  }
}

function pruefeSlots(jg, schule, datei, fachIds, bausteine, meldungen) {
  const ids = new Set();
  const belegt = new Map(); // spur -> [{ von, bis, id, zeile }]

  for (const slot of jg.slots) {
    const ort = { datei, blatt: 'Slots', zeile: slot.__zeile };

    if (!slot.id) {
      meldungen.fehler({ ...ort, feld: 'id' }, 'ID fehlt.');
    } else if (ids.has(slot.id)) {
      meldungen.fehler({ ...ort, feld: 'id' }, 'Die ID "' + slot.id + '" kommt mehrfach vor.');
    } else {
      ids.add(slot.id);
    }

    const offen = slot.fach === FACH_OFFEN || slot.status === 'offen';
    if (!slot.fach) {
      meldungen.fehler({ ...ort, feld: 'fach' }, 'Fach fehlt (bei offenen Slots bitte "offen" eintragen).');
    } else if (slot.fach !== FACH_OFFEN && !fachIds.has(slot.fach)) {
      meldungen.fehler({ ...ort, feld: 'fach' },
        '"' + slot.fach + '" ist kein bekanntes Fach. Bekannt: ' + [...fachIds].join(', ') + ', offen.');
    }

    if (slot.status && !SLOT_STATUS.includes(slot.status)) {
      meldungen.fehler({ ...ort, feld: 'status' },
        '"' + slot.status + '" ist kein bekannter Status. Erlaubt: ' + SLOT_STATUS.join(', ') + '.');
    }

    const vonOk = pruefeDatum(meldungen, { ...ort, feld: 'von' }, slot.von);
    const bisOk = pruefeDatum(meldungen, { ...ort, feld: 'bis' }, slot.bis);

    if (vonOk) {
      const datum = parseISODate(slot.von);
      if (toISODate(mondayOf(datum)) !== slot.von) {
        meldungen.fehler({ ...ort, feld: 'von' },
          slot.von + ' ist ein ' + formatDatum(datum, 'tagLang') + '. Ein Slot beginnt am Montag (ARCHITEKTUR 4).');
      }
    }
    if (bisOk) {
      const grund = keinSchultagGrund(slot.bis, schule);
      if (grund) meldungen.fehler({ ...ort, feld: 'bis' }, slot.bis + ' ' + grund + '.');
    }
    if (vonOk && bisOk && slot.von > slot.bis) {
      meldungen.fehler({ ...ort, feld: 'bis' }, slot.bis + ' liegt vor von (' + slot.von + ').');
    }

    if (slot.abgabeRoh) {
      const abgabeOk = pruefeDatum(meldungen, { ...ort, feld: 'abgabe' }, slot.abgabeRoh);
      if (abgabeOk && vonOk && slot.abgabeRoh < slot.von) {
        meldungen.fehler({ ...ort, feld: 'abgabe' }, slot.abgabeRoh + ' liegt vor dem Beginn des Slots (' + slot.von + ').');
      }
    }

    if (!offen) {
      if (!slot.baustein) {
        meldungen.fehler({ ...ort, feld: 'baustein' }, 'Kein Baustein zugeordnet.');
      } else if (!bausteine.has(slot.baustein)) {
        meldungen.fehler({ ...ort, feld: 'baustein' },
          'Den Baustein "' + slot.baustein + '" gibt es im Blatt Bausteine nicht.');
      } else {
        const baustein = bausteine.get(slot.baustein);
        if (baustein.fach && slot.fach && baustein.fach !== slot.fach) {
          meldungen.fehler({ ...ort, feld: 'baustein' },
            'Der Baustein "' + baustein.id + '" gehoert zum Fach "' + baustein.fach
            + '", der Slot zum Fach "' + slot.fach + '".');
        }
      }
    }

    for (const spur of slot.spuren) {
      if (!Number.isInteger(spur) || spur < 1) {
        meldungen.fehler({ ...ort, feld: slot.spurenRoh ? 'spuren' : 'spur' },
          '"' + spur + '" ist keine Spur (ganze Zahl ab 1).');
        continue;
      }
      if (!vonOk || !bisOk) continue;
      if (!belegt.has(spur)) belegt.set(spur, []);
      for (const anderer of belegt.get(spur)) {
        if (slot.von <= anderer.bis && anderer.von <= slot.bis) {
          meldungen.fehler({ ...ort, feld: 'von' },
            'Slot "' + slot.id + '" (' + slot.von + ' bis ' + slot.bis + ') ueberschneidet sich in Spur '
            + spur + ' mit "' + anderer.id + '" (' + anderer.von + ' bis ' + anderer.bis
            + ', Zeile ' + anderer.zeile + ').');
        }
      }
      belegt.get(spur).push({ von: slot.von, bis: slot.bis, id: slot.id, zeile: slot.__zeile });
    }
  }

  const benutzt = new Set(jg.slots.map((slot) => slot.baustein).filter(Boolean));
  for (const [id, baustein] of bausteine) {
    if (!benutzt.has(id)) {
      meldungen.warnung({ datei, blatt: 'Bausteine', zeile: baustein.__zeile, feld: 'id' },
        'Der Baustein "' + id + '" gehoert zu keinem Slot und wird nirgends gezeigt.');
    }
  }
}

function pruefeInputs(jg, datei, fachIds, bausteine, meldungen) {
  const ids = new Set();
  for (const input of jg.inputs) {
    const ort = { datei, blatt: 'Inputs', zeile: input.__zeile };
    if (!input.id) {
      meldungen.fehler({ ...ort, feld: 'id' }, 'ID fehlt.');
    } else if (ids.has(input.id)) {
      meldungen.fehler({ ...ort, feld: 'id' }, 'Die ID "' + input.id + '" kommt mehrfach vor.');
    } else {
      ids.add(input.id);
    }
    if (input.fach && !fachIds.has(input.fach)) {
      meldungen.fehler({ ...ort, feld: 'fach' },
        '"' + input.fach + '" ist kein bekanntes Fach. Bekannt: ' + [...fachIds].join(', ') + '.');
    }
    if (input.art && !INPUT_ARTEN.includes(input.art)) {
      meldungen.fehler({ ...ort, feld: 'art' },
        '"' + input.art + '" ist keine bekannte Art. Erlaubt: ' + INPUT_ARTEN.join(', ') + '.');
    }
    if (!input.titel) meldungen.warnung({ ...ort, feld: 'titel' }, 'Titel fehlt.');
    if (input.pflicht === null) {
      meldungen.fehler({ ...ort, feld: 'pflicht' }, 'Bitte "ja" oder "nein" eintragen.');
    }
    for (const bausteinId of input.bausteine) {
      if (!bausteine.has(bausteinId)) {
        meldungen.fehler({ ...ort, feld: 'bausteine' },
          'Den Baustein "' + bausteinId + '" gibt es im Blatt Bausteine nicht.');
      }
    }
  }
  return ids;
}

function pruefeCoachings(jg, datei, klassen, meldungen) {
  for (const coaching of jg.coachings) {
    const ort = { datei, blatt: 'Coachings', zeile: coaching.__zeile };
    if (coaching.wochentag === null) {
      meldungen.fehler({ ...ort, feld: 'wochentag' },
        '"' + coaching.wochentagRoh + '" ist kein Wochentag. Erlaubt: Mo, Di, Mi, Do, Fr.');
    }
    if (!coaching.kuerzel) {
      meldungen.fehler({ ...ort, feld: 'kuerzel' }, 'Kuerzel fehlt.');
    } else if (!KUERZEL.test(coaching.kuerzel)) {
      meldungen.fehler({ ...ort, feld: 'kuerzel' },
        '"' + coaching.kuerzel + '" ist kein Kuerzel aus 2 bis 4 Grossbuchstaben.');
    }
    if (coaching.gueltigAb) pruefeDatum(meldungen, { ...ort, feld: 'gueltigAb' }, coaching.gueltigAb);
    if (coaching.gueltigBis) pruefeDatum(meldungen, { ...ort, feld: 'gueltigBis' }, coaching.gueltigBis);
    if (coaching.gueltigAb && coaching.gueltigBis && coaching.gueltigAb > coaching.gueltigBis) {
      meldungen.fehler({ ...ort, feld: 'gueltigBis' },
        coaching.gueltigBis + ' liegt vor gueltigAb (' + coaching.gueltigAb + ').');
    }
    if (coaching.klasse && klassen.length > 0 && !klassen.includes(coaching.klasse)) {
      meldungen.fehler({ ...ort, feld: 'klasse' },
        'Die Klasse "' + coaching.klasse + '" gibt es im Jahrgang nicht (' + klassen.join(', ') + ').');
    }
  }
}

function pruefeTermine(jg, schule, datei, fachIds, inputs, klassen, raster, meldungen) {
  for (const termin of jg.termine) {
    const ort = { datei, blatt: 'Termine', zeile: termin.__zeile };
    const datumOk = pruefeDatum(meldungen, { ...ort, feld: 'datum' }, termin.datum);
    if (datumOk) {
      const grund = keinSchultagGrund(termin.datum, schule);
      if (grund) meldungen.fehler({ ...ort, feld: 'datum' }, termin.datum + ' ' + grund + '.');
    }
    if (!termin.art) {
      meldungen.fehler({ ...ort, feld: 'art' }, 'Art fehlt. Erlaubt: ' + TERMIN_ARTEN.join(', ') + '.');
    } else if (!TERMIN_ARTEN.includes(termin.art)) {
      meldungen.fehler({ ...ort, feld: 'art' },
        '"' + termin.art + '" ist keine bekannte Art. Erlaubt: ' + TERMIN_ARTEN.join(', ') + '.');
    }
    if (termin.fach && !fachIds.has(termin.fach)) {
      meldungen.fehler({ ...ort, feld: 'fach' },
        '"' + termin.fach + '" ist kein bekanntes Fach. Bekannt: ' + [...fachIds].join(', ') + '.');
    }
    if (termin.kuerzel && !KUERZEL.test(termin.kuerzel)) {
      meldungen.fehler({ ...ort, feld: 'kuerzel' },
        '"' + termin.kuerzel + '" ist kein Kuerzel aus 2 bis 4 Grossbuchstaben.');
    }
    if (termin.klasse && klassen.length > 0 && !klassen.includes(termin.klasse)) {
      meldungen.fehler({ ...ort, feld: 'klasse' },
        'Die Klasse "' + termin.klasse + '" gibt es im Jahrgang nicht (' + klassen.join(', ') + ').');
    }
    if (termin.input && !inputs.has(termin.input)) {
      meldungen.fehler({ ...ort, feld: 'input' },
        'Den Input "' + termin.input + '" gibt es im Blatt Inputs nicht.');
    }
    if (!termin.input && !termin.text && termin.art !== 'coaching') {
      meldungen.warnung({ ...ort, feld: 'text' },
        'Weder ein Input noch ein Text eingetragen, der Termin bleibt leer.');
    }
    if (termin.raster && !raster.has(termin.raster)) {
      meldungen.warnung({ ...ort, feld: 'raster' },
        'Den Rasterzeitraum "' + termin.raster + '" gibt es im Blatt Raster nicht.');
    }
  }
}

// ------------------------------------------------------------ antrag.json

export function pruefeAntrag(antrag, jahrgaenge, klassenJeJahrgang, meldungen) {
  const datei = 'antrag.json';
  if (!antrag || typeof antrag !== 'object') {
    meldungen.fehler({ datei }, 'Die Datei enthaelt kein Objekt.');
    return;
  }
  if (!Number.isInteger(antrag.schema)) {
    meldungen.warnung({ datei, feld: 'schema' }, 'Feld fehlt oder ist keine ganze Zahl.');
  }
  if (!antrag.configVersion) {
    meldungen.fehler({ datei, feld: 'configVersion' },
      'Feld fehlt. Es haelt laufende Antraege bei ihrem Wortlaut (REDAKTION 5).');
  }

  if (!antrag.stufen || typeof antrag.stufen !== 'object') {
    meldungen.fehler({ datei, feld: 'stufen' }, 'Feld fehlt.');
  } else {
    for (const [stufe, inhalt] of Object.entries(antrag.stufen)) {
      const ort = { datei, feld: 'stufen.' + stufe };
      if (!inhalt || typeof inhalt !== 'object') {
        meldungen.fehler(ort, 'Die Stufe enthaelt kein Objekt.');
        continue;
      }
      if (!Array.isArray(inhalt.schritte) || inhalt.schritte.length === 0) {
        meldungen.fehler({ ...ort, feld: 'stufen.' + stufe + '.schritte' }, 'Es ist kein Schritt eingetragen.');
        continue;
      }
      const ids = new Set();
      inhalt.schritte.forEach((schritt, i) => {
        const feld = 'stufen.' + stufe + '.schritte[' + i + ']';
        if (!schritt || typeof schritt !== 'object') {
          meldungen.fehler({ datei, feld }, 'Der Schritt enthaelt kein Objekt.');
          return;
        }
        if (!schritt.id) {
          meldungen.fehler({ datei, feld: feld + '.id' }, 'ID fehlt.');
        } else if (ids.has(schritt.id)) {
          meldungen.fehler({ datei, feld: feld + '.id' }, 'Die ID "' + schritt.id + '" kommt in Stufe ' + stufe + ' mehrfach vor.');
        } else {
          ids.add(schritt.id);
        }
        if (!schritt.titel) meldungen.warnung({ datei, feld: feld + '.titel' }, 'Titel fehlt.');
        if (!schritt.typ) {
          meldungen.fehler({ datei, feld: feld + '.typ' }, 'Typ fehlt. Erlaubt: ' + ANTRAG_TYPEN.join(', ') + '.');
        } else if (!ANTRAG_TYPEN.includes(schritt.typ)) {
          meldungen.fehler({ datei, feld: feld + '.typ' },
            '"' + schritt.typ + '" ist kein bekannter Typ. Erlaubt: ' + ANTRAG_TYPEN.join(', ') + '.');
        }
      });
    }
  }

  const empfaenger = antrag.empfaenger;
  if (!empfaenger || typeof empfaenger !== 'object') {
    meldungen.fehler({ datei, feld: 'empfaenger' }, 'Feld fehlt.');
    return;
  }
  for (const jgst of jahrgaenge) {
    const schluessel = String(jgst);
    const eintrag = empfaenger[schluessel];
    if (!eintrag || typeof eintrag !== 'object') {
      meldungen.fehler({ datei, feld: 'empfaenger.' + schluessel },
        'Fuer Jahrgang ' + schluessel + ' fehlt der Eintrag.');
      continue;
    }
    const klassen = klassenJeJahrgang.get(Number(jgst)) || [];
    for (const klasse of klassen) {
      if (!(klasse in eintrag)) {
        meldungen.fehler({ datei, feld: 'empfaenger.' + schluessel + '.' + klasse },
          'Fuer Klasse ' + schluessel + klasse + ' fehlt der Eintrag.');
      } else if (!String(eintrag[klasse]).trim()) {
        meldungen.warnung({ datei, feld: 'empfaenger.' + schluessel + '.' + klasse },
          'Noch keine Adresse eingetragen. Die App zeigt dann keinen Empfaenger.');
      }
    }
  }
}

// ------------------------------------------------------------ Wissensseiten

export function pruefeWissenKopf(kopf, datei, meldungen) {
  const ort = { datei };
  for (const feld of ['id', 'titel', 'bereich']) {
    if (!kopf[feld]) meldungen.fehler({ ...ort, feld }, 'Kopfdaten: Feld fehlt.');
  }
  if (kopf.id && !ID_MUSTER.test(String(kopf.id))) {
    meldungen.fehler({ ...ort, feld: 'id' }, '"' + kopf.id + '" ist keine gueltige ID (klein, ohne Leerzeichen).');
  }
  if (kopf.bereich && !WISSEN_BEREICHE.includes(String(kopf.bereich))) {
    meldungen.fehler({ ...ort, feld: 'bereich' },
      '"' + kopf.bereich + '" ist kein bekannter Bereich. Erlaubt: ' + WISSEN_BEREICHE.join(', ') + '.');
  }
  if (!kopf.status) {
    meldungen.warnung({ ...ort, feld: 'status' }, 'Kein Status gesetzt, die Seite gilt als Entwurf.');
  } else if (!WISSEN_STATUS.includes(String(kopf.status))) {
    meldungen.fehler({ ...ort, feld: 'status' },
      '"' + kopf.status + '" ist kein bekannter Status. Erlaubt: ' + WISSEN_STATUS.join(', ') + '.');
  }
  const jahrgaenge = kopf.jahrgaenge;
  if (jahrgaenge !== undefined && jahrgaenge !== '' && jahrgaenge !== 'alle' && !Array.isArray(jahrgaenge)) {
    meldungen.fehler({ ...ort, feld: 'jahrgaenge' },
      'Erlaubt ist "alle" oder eine Liste wie [5, 6].');
  }
  if (kopf.reihenfolge !== undefined && kopf.reihenfolge !== '' && !Number.isFinite(Number(kopf.reihenfolge))) {
    meldungen.warnung({ ...ort, feld: 'reihenfolge' }, 'Keine Zahl, die Sortierung ist dann zufaellig.');
  }
}
