// Eine lesbare Beschriftung fuer einen Termin aus dem Blatt "Termine" (siehe
// build.mjs, Funktion leseJahrgang). Dieselbe Funktion baut die Dropdown-
// Liste fuers Formular (termine-liste.mjs) und wird beim Uebernehmen der
// Antworten (uebernehme-terminaenderungen.mjs) fuer jeden Termin neu
// berechnet, um die Text-Antwort wiederzufinden - kein Code im Text noetig,
// weil jedes Formular schon auf einen Jahrgang beschraenkt ist (Leo,
// 24.09.2026: ein Formular je Jahrgang) und die Beschriftung selbst
// eindeutig genug ist (Datum + Beschreibung).

// Dieselben Woerter wie TERMIN_WORT in src/app/ui/components.js.
const ART_TEXT = { input: 'Input', coaching: 'Coaching', sonstiges: 'Termin', entfall: 'Fällt aus' };

/**
 * Zwei Formular-Fragen statt einer lange Liste (Leo, 29.09.2026):
 * "input" und "entfall/coaching" landen in getrennten Dropdowns, "sonstiges"
 * (z. B. der Paedagogische Tag) passt in keine der beiden Fragen und wird
 * beim Erzeugen der Formular-Liste ausgelassen - sowas verschiebt niemand
 * per Formular.
 */
export function terminKategorie(art) {
  if (art === 'input') return 'input';
  if (art === 'coaching' || art === 'entfall') return 'coaching';
  return null;
}

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
  return datumDeutsch(termin.datum) + ' – Jg ' + jgst + ' – ' + beschreibung;
}
