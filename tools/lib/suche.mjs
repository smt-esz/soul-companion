// Suchindex je Jahrgang (AP-02 Schritt 8, ARCHITEKTUR 3.10).
//
// Eine flache Liste { id, typ, titel, text, route, fach? } aus Bausteinen,
// Stationstiteln, Inputs, Wissensseiten (Absaetze) und Glossarbegriffen.
// Die Normalisierung und das Ranking macht die App zur Laufzeit (AP-11),
// hier wird nur gesammelt.

const MAX_TEXT = 400;

/**
 * @param {object} jg      data/jgN.json (ohne interne Felder)
 * @param {object} wissen  data/wissen.json
 * @returns {Array}
 */
export function baueSuchindex(jg, wissen) {
  const eintraege = [];
  const jgst = Number(jg.jgst);

  for (const baustein of jg.bausteine || []) {
    eintraege.push({
      id: 'baustein:' + baustein.id,
      typ: 'baustein',
      titel: baustein.titel || 'Thema folgt',
      text: kuerze([baustein.kurzbeschreibung, baustein.gelingensnachweis].filter(Boolean).join(' ')),
      route: '#/baustein/' + baustein.id,
      fach: baustein.fach
    });

    for (const station of baustein.stationen || []) {
      if (!station.titel) continue;
      eintraege.push({
        id: 'station:' + baustein.id + ':' + station.nr,
        typ: 'station',
        titel: station.titel,
        text: kuerze([('Station ' + station.nr), baustein.titel, station.hinweis].filter(Boolean).join(' · ')),
        route: '#/baustein/' + baustein.id,
        fach: baustein.fach
      });
    }
  }

  for (const input of jg.inputs || []) {
    eintraege.push({
      id: 'input:' + input.id,
      typ: 'input',
      titel: input.titel || 'Input',
      text: kuerze(input.beschreibung || ''),
      route: input.fach ? '#/fach/' + input.fach : '#/plan',
      fach: input.fach || undefined
    });
  }

  const seiten = (wissen && Array.isArray(wissen.seiten)) ? wissen.seiten : [];
  for (const seite of seiten) {
    if (!giltFuerJahrgang(seite.jahrgaenge, jgst)) continue;
    const route = '#/wissen/' + seite.id;
    eintraege.push({
      id: 'wissen:' + seite.id,
      typ: 'wissen',
      titel: seite.titel || seite.id,
      text: kuerze((seite.absaetze || []).join(' ')),
      route
    });
    (seite.absaetze || []).forEach((absatz, i) => {
      if (!absatz || absatz.length < 30) return;
      eintraege.push({
        id: 'absatz:' + seite.id + ':' + i,
        typ: 'absatz',
        titel: seite.titel || seite.id,
        text: kuerze(absatz),
        route
      });
    });
  }

  for (const eintrag of (wissen && Array.isArray(wissen.glossar)) ? wissen.glossar : []) {
    eintraege.push({
      id: 'glossar:' + eintrag.begriff,
      typ: 'glossar',
      titel: eintrag.begriff,
      text: kuerze(eintrag.text || ''),
      route: '#/wissen/glossar'
    });
  }

  for (const eintrag of (wissen && Array.isArray(wissen.faq)) ? wissen.faq : []) {
    eintraege.push({
      id: 'faq:' + eintrag.id,
      typ: 'faq',
      titel: eintrag.frage,
      text: kuerze(eintrag.text || ''),
      route: '#/wissen/faq'
    });
  }

  return eintraege;
}

function giltFuerJahrgang(jahrgaenge, jgst) {
  if (jahrgaenge === undefined || jahrgaenge === null || jahrgaenge === '' || jahrgaenge === 'alle') return true;
  if (!Array.isArray(jahrgaenge)) return true;
  return jahrgaenge.map(Number).includes(jgst);
}

function kuerze(text) {
  const eine = String(text || '').replace(/\s+/g, ' ').trim();
  return eine.length > MAX_TEXT ? eine.slice(0, MAX_TEXT - 3) + '...' : eine;
}
