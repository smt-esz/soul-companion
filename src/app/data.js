// Laden der JSON-Dateien (ARCHITEKTUR 3.7).
//
// Alle Pfade sind relativ, es wird nie ein fremder Host angefragt.
// Normal liegt alles in data/ (vom Build erzeugt). Solange es noch keinen
// Build gibt, lädt ?quelle=beispiel aus beispiel-data/.

const gecacht = new Map();

/** Ordner, aus dem geladen wird: 'data/' oder 'beispiel-data/'. */
export function quellordner() {
  if (typeof location !== 'undefined' && location && location.search) {
    const parameter = new URLSearchParams(location.search);
    if (parameter.get('quelle') === 'beispiel') return 'beispiel-data/';
  }
  return 'data/';
}

export function loadIndex() {
  return ladeJson('index.json');
}

export function loadSchule() {
  return ladeJson('schule.json');
}

export function loadJahrgang(jgst) {
  return ladeJson('jg' + jahrgangsnummer(jgst) + '.json');
}

export function loadWissen() {
  return ladeJson('wissen.json');
}

export function loadAntrag() {
  return ladeJson('antrag.json');
}

export function loadSuche(jgst) {
  return ladeJson('suche-jg' + jahrgangsnummer(jgst) + '.json');
}

/**
 * Wissensseiten auf einen Jahrgang eingrenzen (DATENMODELL 4).
 * Nicht in der Liste von ARCHITEKTUR 3.7, aber nötig: laut 3.2 ist ctx.wissen
 * bereits auf den Jahrgang gefiltert. Entwürfe nur mit ?vorschau=1.
 */
export function filterWissen(wissen, jgst, vorschau = false) {
  const zahl = jahrgangsnummer(jgst);
  const seiten = (wissen && Array.isArray(wissen.seiten)) ? wissen.seiten : [];
  return Object.assign({}, wissen, {
    seiten: seiten.filter((seite) => {
      if (!seite) return false;
      if (seite.status === 'entwurf' && !vorschau) return false;
      return giltFuerJahrgang(seite.jahrgaenge, zahl);
    })
  });
}

function giltFuerJahrgang(jahrgaenge, zahl) {
  if (jahrgaenge === undefined || jahrgaenge === null || jahrgaenge === 'alle') return true;
  if (!Array.isArray(jahrgaenge)) return true;
  return jahrgaenge.map(Number).includes(zahl);
}

function jahrgangsnummer(jgst) {
  const zahl = Number(jgst);
  if (!Number.isInteger(zahl)) {
    throw new Error('Kein gültiger Jahrgang: ' + String(jgst));
  }
  return zahl;
}

function ladeJson(name) {
  const pfad = quellordner() + name;
  if (!gecacht.has(pfad)) {
    const versprechen = hole(pfad, name);
    gecacht.set(pfad, versprechen);
    // Ein Fehlschlag darf nicht dauerhaft im Cache stehen bleiben,
    // sonst hilft auch ein zweiter Versuch nicht.
    versprechen.catch(() => {
      if (gecacht.get(pfad) === versprechen) gecacht.delete(pfad);
    });
  }
  return gecacht.get(pfad);
}

async function hole(pfad, name) {
  let antwort;
  try {
    antwort = await fetch(pfad);
  } catch (fehler) {
    throw new Error(name + ' konnte nicht geladen werden.');
  }
  if (!antwort.ok) {
    throw new Error(name + ' konnte nicht geladen werden (Status ' + antwort.status + ').');
  }
  try {
    return await antwort.json();
  } catch (fehler) {
    throw new Error(name + ' ist keine gültige JSON-Datei.');
  }
}
