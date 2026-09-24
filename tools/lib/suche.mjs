// Suchindex je Jahrgang (AP-02 Schritt 8, vervollstaendigt in AP-18,
// ARCHITEKTUR 3.10).
//
// Eine flache Liste { id, typ, titel, text, route, fach? } aus Bausteinen,
// Stationstiteln, Inputs, Wissensseiten (als Seite und als Abschnitt je
// Absatz), Glossarbegriffen, FAQ-Fragen und Stufen. `typ` ist eines von:
// baustein, station, input, wissen, abschnitt, glossar, faq, stufe (AP-18).
// Die Normalisierung und das Ranking macht die App zur Laufzeit in
// app/search.js (AP-18), hier wird nur gesammelt. `text` ist hoechstens
// 300 Zeichen lang (AP-18).

const MAX_TEXT = 300;

/**
 * @param {object} jg      data/jgN.json (ohne interne Felder)
 * @param {object} wissen  data/wissen.json
 * @param {object} [schule]  data/schule.json, fuer die Stufen (AP-18)
 * @returns {Array}
 */
export function baueSuchindex(jg, wissen, schule) {
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
        id: 'abschnitt:' + seite.id + ':' + i,
        typ: 'abschnitt',
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

  // Stufen (DATENMODELL 2, Blatt Stufen): dieselben drei Eintraege in jedem
  // Jahrgang, die Seite dazu (#/stufen) zeigt immer alle drei (AP-13).
  for (const stufe of (schule && Array.isArray(schule.stufen)) ? schule.stufen : []) {
    if (!stufe || !stufe.name) continue;
    eintraege.push({
      id: 'stufe:' + stufe.id,
      typ: 'stufe',
      titel: stufe.name,
      text: kuerze(stufe.kurzbeschreibung || ''),
      route: '#/stufen'
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
