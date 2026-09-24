// Eine lesbare, aber eindeutige Beschriftung fuer einen Termin aus dem Blatt
// "Termine" (siehe build.mjs, Funktion leseJahrgang). Dieselbe Funktion baut
// die Dropdown-Liste fuers Formular (termine-liste.mjs) und liest sie beim
// Uebernehmen der Antworten wieder aus (uebernehme-terminaenderungen.mjs).
// Der Code in eckigen Klammern ist der Teil, den die Maschine braucht,
// Jahrgang und Excel-Zeile aus leseMappe (__zeile).

// Dieselben Woerter wie TERMIN_WORT in src/app/ui/components.js.
const ART_TEXT = { input: 'Input', coaching: 'Coaching', sonstiges: 'Termin', entfall: 'Fällt aus' };

/** 'YYYY-MM-DD' zu 'DD.MM.YYYY'. */
function datumDeutsch(iso) {
  const [jahr, monat, tag] = iso.split('-');
  return tag + '.' + monat + '.' + jahr;
}

function fachName(schule, fachId) {
  const eintrag = (schule?.faecher || []).find((f) => f.id === fachId);
  return eintrag ? eintrag.name : fachId || 'Fach offen';
}

/**
 * @param {object} termin   Eintrag aus jg.termine (mit __zeile)
 * @param {number} jgst     Jahrgangsstufe, z. B. 5
 * @param {object} schule   schule.json-Inhalt (fuer den Fachnamen)
 * @returns {string}
 */
export function terminLabel(termin, jgst, schule) {
  const art = ART_TEXT[termin.art] || termin.art || 'Termin';
  const teile = [art];
  if (termin.fach && termin.fach !== 'offen') teile.push(fachName(schule, termin.fach));
  if (termin.kuerzel) teile.push(termin.kuerzel);
  if (termin.text) teile.push(termin.text);
  const beschreibung = teile.join(' ');
  return datumDeutsch(termin.datum) + ' – ' + beschreibung + ' [jg' + jgst + '-z' + termin.__zeile + ']';
}

/** Liest Jahrgang und Zeile aus einer Beschriftung. null, wenn es nicht passt. */
export function leseLabelCode(label) {
  const treffer = /\[jg(\d+)-z(\d+)\]\s*$/.exec(String(label || '').trim());
  if (!treffer) return null;
  return { jgst: Number(treffer[1]), zeile: Number(treffer[2]) };
}
