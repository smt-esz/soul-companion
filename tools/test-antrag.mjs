// Tests für src/app/antrag/engine.js. Ohne Framework, nur node und assert.
//
//   node tools/test-antrag.mjs
//
// Die Engine hat kein DOM und keine Uhr, deshalb laeuft sie hier unveraendert.
// Geprueft wird gegen die echte content/antrag.json und gegen kleine
// synthetische Konfigurationen fuer die Randfaelle.
//
// In den Testdaten steht kein Name eines Kindes: "Max Muster" und "Erika Test"
// sind Platzhalter (AP_ALLGEMEIN, Regel 7).

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  abschliessen, aktualisiere, automatischeAussagen, bereitFuerPdf, configFuer,
  fortschritt, kannBearbeiten, neuerAntrag, pruefeSchritt, schrittStatus,
  stufeVon, UNBEKANNTER_TYP, zuruecksetzen
} from '../src/app/antrag/engine.js';

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(wurzel, 'content', 'antrag.json'), 'utf8'));

const HEUTE = '2026-10-27';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
const BEGRUENDUNG = 'Ich arbeite seit den Ferien jeden Tag allein an meinen Stationen und werde fertig.';

let bestanden = 0;
const fehlgeschlagen = [];

function pruefe(name, fn) {
  try {
    fn();
    bestanden++;
    console.log('  ok    ' + name);
  } catch (fehler) {
    fehlgeschlagen.push({ name, fehler });
    console.log('  FEHLT ' + name);
    console.log('        ' + (fehler && fehler.message ? fehler.message : fehler));
  }
}

// ------------------------------------------------------------ Hilfsmittel

function neu(zielstufe = 2) {
  return neuerAntrag(config, zielstufe, HEUTE, 'a-20261027-test');
}

/** Fuellt einen Schritt vollstaendig aus und schliesst ihn ab. */
function erledige(antrag, schrittId) {
  const patch = {
    begruendung: { text: BEGRUENDUNG },
    teamcheck: {
      personen: [
        { name: 'Max Muster', klasse: '5B', datum: HEUTE, unterschrift: PNG },
        { name: 'Erika Test', klasse: '5C', datum: HEUTE, unterschrift: PNG }
      ]
    },
    empfehlung: {
      kriterien: [true, true, false, true, true, true],
      empfohlen: true,
      kuerzel: 'HEC',
      datum: HEUTE,
      unterschrift: PNG
    },
    selbst: { aussagen: [true, true, true], datum: HEUTE, unterschrift: PNG }
  }[schrittId];
  const mitDaten = aktualisiere(antrag, schrittId, patch, HEUTE);
  const zu = abschliessen(mitDaten, config, schrittId, HEUTE);
  assert.equal(zu.schritte[schrittId].status, 'abgeschlossen',
    'Schritt ' + schrittId + ' liess sich nicht abschliessen: '
    + pruefeSchritt(mitDaten, config, schrittId).fehler.join(' | '));
  return zu;
}

function alleDrei(antrag) {
  return erledige(erledige(erledige(antrag, 'begruendung'), 'teamcheck'), 'empfehlung');
}

// ------------------------------------------------------------ neuerAntrag

console.log('');
console.log('neuerAntrag und Snapshot');

pruefe('legt alle Schritte ausser nurPdf an, alle offen', () => {
  const antrag = neu(2);
  assert.deepEqual(Object.keys(antrag.schritte), ['begruendung', 'teamcheck', 'empfehlung', 'selbst']);
  for (const schritt of Object.values(antrag.schritte)) assert.equal(schritt.status, 'offen');
  assert.equal(antrag.zielstufe, 2);
  assert.equal(antrag.erstellt, HEUTE);
  assert.equal(antrag.kopf.name, '');
});

pruefe('legt die leere Form je Typ an', () => {
  const antrag = neu(2);
  assert.equal(antrag.schritte.begruendung.text, '');
  assert.equal(antrag.schritte.teamcheck.personen.length, 2);
  assert.deepEqual(antrag.schritte.teamcheck.personen[0], { name: '', klasse: '', datum: '', unterschrift: '' });
  assert.deepEqual(antrag.schritte.empfehlung.kriterien, [false, false, false, false, false, false]);
  assert.equal(antrag.schritte.empfehlung.empfohlen, false);
  assert.deepEqual(antrag.schritte.selbst.aussagen, [false, false, false]);
});

pruefe('kopiert die Texte der Stufe in den Snapshot', () => {
  const antrag = neu(3);
  assert.equal(antrag.snapshot.titel, config.stufen['3'].titel);
  assert.equal(antrag.snapshot.zielname, 'Krone');
  assert.equal(antrag.snapshot.schritte.length, 5);
  // Eine echte Kopie, keine Referenz.
  antrag.snapshot.titel = 'geaendert';
  assert.notEqual(config.stufen['3'].titel, 'geaendert');
});

pruefe('unbekannte Zielstufe wirft', () => {
  assert.throws(() => neuerAntrag(config, 9, HEUTE));
});

pruefe('uebernimmt die configVersion', () => {
  assert.equal(neu(2).configVersion, config.configVersion);
});

// ------------------------------------------------------------ Reihenfolge

console.log('');
console.log('Reihenfolge und Sperre');

pruefe('Schritt 4 ist gesperrt, solange 1 bis 3 offen sind', () => {
  const antrag = neu(2);
  assert.equal(schrittStatus(antrag, config, 'selbst'), 'gesperrt');
  assert.equal(kannBearbeiten(antrag, config, 'selbst'), false);
});

pruefe('Schritte 1 bis 3 sind in beliebiger Reihenfolge moeglich', () => {
  const antrag = neu(2);
  for (const id of ['begruendung', 'teamcheck', 'empfehlung']) {
    assert.equal(schrittStatus(antrag, config, id), 'offen', id);
    assert.equal(kannBearbeiten(antrag, config, id), true, id);
  }
  // Mit Schritt 3 anfangen ist erlaubt.
  const mitDrei = erledige(antrag, 'empfehlung');
  assert.equal(schrittStatus(mitDrei, config, 'begruendung'), 'offen');
  assert.equal(schrittStatus(mitDrei, config, 'selbst'), 'gesperrt');
});

pruefe('Schritt 4 geht erst auf, wenn 1 bis 3 abgeschlossen sind', () => {
  let antrag = neu(2);
  antrag = erledige(antrag, 'begruendung');
  assert.equal(schrittStatus(antrag, config, 'selbst'), 'gesperrt');
  antrag = erledige(antrag, 'teamcheck');
  assert.equal(schrittStatus(antrag, config, 'selbst'), 'gesperrt');
  antrag = erledige(antrag, 'empfehlung');
  assert.equal(schrittStatus(antrag, config, 'selbst'), 'offen');
  assert.equal(kannBearbeiten(antrag, config, 'selbst'), true);
});

pruefe('ein gesperrter Schritt laesst sich nicht abschliessen', () => {
  let antrag = neu(2);
  antrag = aktualisiere(antrag, 'selbst', { aussagen: [true, true, true], unterschrift: PNG }, HEUTE);
  const versuch = abschliessen(antrag, config, 'selbst', HEUTE);
  assert.equal(versuch.schritte.selbst.status, 'in_arbeit');
  assert.deepEqual(pruefeSchritt(antrag, config, 'selbst').fehler, ['Schließe zuerst die Schritte davor ab.']);
});

pruefe('nurPdf ist in der App immer gesperrt', () => {
  const antrag = neu(2);
  assert.equal(schrittStatus(antrag, config, 'entscheidung'), 'gesperrt');
  assert.equal(kannBearbeiten(antrag, config, 'entscheidung'), false);
  assert.equal(antrag.schritte.entscheidung, undefined);
});

pruefe('ein abgeschlossener Schritt nimmt keine Aenderung mehr an', () => {
  const antrag = erledige(neu(2), 'begruendung');
  const versuch = aktualisiere(antrag, 'begruendung', { text: 'anders' }, HEUTE);
  assert.equal(versuch.schritte.begruendung.text, BEGRUENDUNG);
  assert.equal(versuch.schritte.begruendung.status, 'abgeschlossen');
});

pruefe('aktualisiere gibt ein neues Objekt zurueck, das alte bleibt', () => {
  const antrag = neu(2);
  const neuer = aktualisiere(antrag, 'begruendung', { text: 'abc' }, '2026-10-28');
  assert.equal(antrag.schritte.begruendung.text, '');
  assert.equal(antrag.schritte.begruendung.status, 'offen');
  assert.equal(neuer.schritte.begruendung.text, 'abc');
  assert.equal(neuer.schritte.begruendung.status, 'in_arbeit');
  assert.equal(neuer.geaendert, '2026-10-28');
  assert.equal(antrag.geaendert, HEUTE);
});

// ------------------------------------------------------------ Pruefregeln

console.log('');
console.log('Pruefregeln');

pruefe('freitext: Mindestlaenge', () => {
  const antrag = neu(2);
  assert.deepEqual(pruefeSchritt(antrag, config, 'begruendung').fehler,
    ['Bitte schreibe mindestens 30 Zeichen.']);
  const kurz = aktualisiere(antrag, 'begruendung', { text: 'Weil ich das kann.' }, HEUTE);
  assert.equal(pruefeSchritt(kurz, config, 'begruendung').ok, false);
  const lang = aktualisiere(antrag, 'begruendung', { text: BEGRUENDUNG }, HEUTE);
  assert.deepEqual(pruefeSchritt(lang, config, 'begruendung'), { ok: true, fehler: [] });
});

pruefe('freitext: Leerzeichen zaehlen nicht als Inhalt', () => {
  const antrag = aktualisiere(neu(2), 'begruendung', { text: '   ' + ' '.repeat(40) }, HEUTE);
  assert.equal(pruefeSchritt(antrag, config, 'begruendung').ok, false);
});

pruefe('personen: Name, Klasse und Unterschrift je Person', () => {
  const antrag = neu(2);
  const fehler = pruefeSchritt(antrag, config, 'teamcheck').fehler;
  assert.equal(fehler.length, 6);
  assert.ok(fehler.includes('Bei Person 1 fehlt der Name.'));
  assert.ok(fehler.includes('Bei Person 2 fehlt die Klasse.'));
  assert.ok(fehler.includes('Person 2 hat noch nicht unterschrieben.'));

  const halb = aktualisiere(antrag, 'teamcheck', {
    personen: [
      { name: 'Max Muster', klasse: '5B', datum: HEUTE, unterschrift: PNG },
      { name: 'Erika Test', klasse: '5C', datum: '', unterschrift: '' }
    ]
  }, HEUTE);
  assert.deepEqual(pruefeSchritt(halb, config, 'teamcheck').fehler,
    ['Person 2 hat noch nicht unterschrieben.']);
});

pruefe('kriterien: Bestaetigung, Kuerzel und Unterschrift sind Pflicht, Kreuze nicht', () => {
  const antrag = neu(2);
  const fehler = pruefeSchritt(antrag, config, 'empfehlung').fehler;
  assert.equal(fehler.length, 3);
  assert.ok(fehler[0].includes('Ich empfehle den nächsten Schritt.'));

  // Kein einziges Kriterium angekreuzt, aber alles andere da: das reicht,
  // genau wie auf dem Papier (AP-14).
  const ohneKreuze = aktualisiere(antrag, 'empfehlung', {
    kriterien: [false, false, false, false, false, false],
    empfohlen: true,
    kuerzel: 'HEC',
    datum: HEUTE,
    unterschrift: PNG
  }, HEUTE);
  assert.equal(pruefeSchritt(ohneKreuze, config, 'empfehlung').ok, true);
});

pruefe('kriterien: Kuerzel 2 bis 4 Buchstaben', () => {
  const basis = { kriterien: [true], empfohlen: true, datum: HEUTE, unterschrift: PNG };
  const mit = (kuerzel) => pruefeSchritt(
    aktualisiere(neu(2), 'empfehlung', Object.assign({}, basis, { kuerzel }), HEUTE),
    config, 'empfehlung'
  ).fehler.join(' ');

  assert.ok(mit('H').includes('Kürzel'));
  assert.ok(mit('HECHE').includes('Kürzel'));
  assert.ok(mit('H3C').includes('Kürzel'));
  assert.ok(mit('').includes('Kürzel'));
  assert.equal(mit('HEC'), '');
  assert.equal(mit('hec'), '');
  assert.equal(mit('MUEL'), '');
});

pruefe('erklaerung: alle Aussagen und Unterschrift', () => {
  let antrag = alleDrei(neu(2));
  assert.deepEqual(pruefeSchritt(antrag, config, 'selbst').fehler,
    ['Hake alle Aussagen an.', 'Die Unterschrift fehlt.']);

  antrag = aktualisiere(antrag, 'selbst', { aussagen: [true, true, false], unterschrift: PNG }, HEUTE);
  assert.deepEqual(pruefeSchritt(antrag, config, 'selbst').fehler, ['Hake alle Aussagen an.']);

  antrag = aktualisiere(antrag, 'selbst', { aussagen: [true, true, true] }, HEUTE);
  assert.equal(pruefeSchritt(antrag, config, 'selbst').ok, true);
});

// -------------------------------------------------- Zuruecksetzen und Abhaengigkeit

console.log('');
console.log('Zuruecksetzen');

pruefe('setzt den Schritt leer und auf offen', () => {
  const antrag = erledige(neu(2), 'teamcheck');
  const zurueck = zuruecksetzen(antrag, 'teamcheck', '2026-10-28');
  assert.equal(zurueck.schritte.teamcheck.status, 'offen');
  assert.deepEqual(zurueck.schritte.teamcheck.personen, [
    { name: '', klasse: '', datum: '', unterschrift: '' },
    { name: '', klasse: '', datum: '', unterschrift: '' }
  ]);
  assert.equal(zurueck.geaendert, '2026-10-28');
  // Das Original bleibt unberuehrt.
  assert.equal(antrag.schritte.teamcheck.status, 'abgeschlossen');
});

pruefe('nimmt Schritt 4 mit, wenn eine Voraussetzung wegfaellt', () => {
  let antrag = alleDrei(neu(2));
  antrag = erledige(antrag, 'selbst');
  assert.equal(bereitFuerPdf(antrag, config), true);

  const zurueck = zuruecksetzen(antrag, 'empfehlung', HEUTE);
  assert.equal(zurueck.schritte.empfehlung.status, 'offen');
  assert.equal(zurueck.schritte.selbst.status, 'offen', 'Schritt 4 haengt an 1 bis 3');
  assert.deepEqual(zurueck.schritte.selbst.aussagen, [false, false, false]);
  assert.equal(zurueck.schritte.selbst.unterschrift, '');
  // Die Schritte, die noch stehen, bleiben stehen.
  assert.equal(zurueck.schritte.begruendung.status, 'abgeschlossen');
  assert.equal(zurueck.schritte.teamcheck.status, 'abgeschlossen');
  assert.equal(bereitFuerPdf(zurueck, config), false);
});

pruefe('Schritt 4 allein zuruecksetzen laesst 1 bis 3 stehen', () => {
  const antrag = erledige(alleDrei(neu(2)), 'selbst');
  const zurueck = zuruecksetzen(antrag, 'selbst', HEUTE);
  assert.equal(zurueck.schritte.selbst.status, 'offen');
  for (const id of ['begruendung', 'teamcheck', 'empfehlung']) {
    assert.equal(zurueck.schritte[id].status, 'abgeschlossen', id);
  }
});

pruefe('zuruecksetzen eines unbekannten Schritts aendert nichts', () => {
  const antrag = neu(2);
  assert.equal(zuruecksetzen(antrag, 'gibtsnicht', HEUTE), antrag);
});

// ------------------------------------------------------ automatische Aussagen

console.log('');
console.log('Automatische Aussagen');

pruefe('sind erst gesetzt, wenn der genannte Schritt abgeschlossen ist', () => {
  const schritt = stufeVon(config, neu(2)).schritte.find((eintrag) => eintrag.id === 'selbst');

  let antrag = neu(2);
  assert.deepEqual(automatischeAussagen(antrag, schritt).map((a) => a.erfuellt), [false, false]);

  antrag = erledige(antrag, 'teamcheck');
  assert.deepEqual(automatischeAussagen(antrag, schritt).map((a) => a.erfuellt), [true, false]);

  antrag = erledige(antrag, 'empfehlung');
  assert.deepEqual(automatischeAussagen(antrag, schritt).map((a) => a.erfuellt), [true, true]);

  antrag = zuruecksetzen(antrag, 'teamcheck', HEUTE);
  assert.deepEqual(automatischeAussagen(antrag, schritt).map((a) => a.erfuellt), [false, true]);
});

pruefe('uebernimmt den Wortlaut aus der Konfiguration', () => {
  const schritt = stufeVon(config, neu(2)).schritte.find((eintrag) => eintrag.id === 'selbst');
  assert.deepEqual(automatischeAussagen(neu(2), schritt).map((a) => a.text), [
    'Ich habe die Empfehlung von 2 Lernenden (Team-Check)',
    'Ich habe die Empfehlung einer Lernbegleitung'
  ]);
});

// ------------------------------------------------------------ configVersion

console.log('');
console.log('configVersion und Snapshot');

pruefe('ein laufender Antrag behaelt seine Texte, wenn die Datei sich aendert', () => {
  const antrag = neu(2);
  const neuereConfig = JSON.parse(JSON.stringify(config));
  neuereConfig.configVersion = '2026-11';
  neuereConfig.stufen['2'].schritte[0].frage = 'Ganz neue Frage?';
  neuereConfig.stufen['2'].schritte[0].minZeichen = 500;

  const lage = configFuer(antrag, neuereConfig);
  assert.equal(lage.veraltet, true);
  assert.equal(lage.version, '2026-09');
  assert.equal(lage.aktuell, '2026-11');
  assert.ok(lage.hinweis);
  assert.equal(lage.stufe.schritte[0].frage, 'Warum bin ich zum Stufenaufstieg bereit?');

  // Auch die Pruefung rechnet mit dem alten Wert, nicht mit 500.
  const gefuellt = aktualisiere(antrag, 'begruendung', { text: BEGRUENDUNG }, HEUTE);
  assert.equal(pruefeSchritt(gefuellt, neuereConfig, 'begruendung').ok, true);
});

pruefe('gleiche Version gibt keinen Hinweis', () => {
  const lage = configFuer(neu(2), config);
  assert.equal(lage.veraltet, false);
  assert.equal(lage.hinweis, null);
});

// ------------------------------------------------------------ unbekannter Typ

console.log('');
console.log('Unbekannter Typ');

const configNeuer = {
  configVersion: '2027-01',
  stufen: {
    2: {
      titel: 'Platzhalter',
      zielname: 'Platzhalter',
      schritte: [
        { id: 'begruendung', nr: 1, titel: 'Begründung', rolle: 'kind', typ: 'freitext', minZeichen: 10 },
        { id: 'neuartig', nr: 2, titel: 'Platzhalter', rolle: 'kind', typ: 'schieberegler' }
      ]
    }
  }
};

pruefe('ein unbekannter Typ meldet, statt abzustuerzen', () => {
  const antrag = neuerAntrag(configNeuer, 2, HEUTE, 'a-20261027-neu');
  assert.deepEqual(antrag.schritte.neuartig, { status: 'offen' });
  assert.equal(schrittStatus(antrag, configNeuer, 'neuartig'), 'offen');
  assert.deepEqual(pruefeSchritt(antrag, configNeuer, 'neuartig'), { ok: false, fehler: [UNBEKANNTER_TYP] });
  assert.equal(abschliessen(antrag, configNeuer, 'neuartig', HEUTE).schritte.neuartig.status, 'offen');
  assert.equal(bereitFuerPdf(antrag, configNeuer), false);
});

pruefe('ein unbekannter Schritt meldet ebenfalls', () => {
  const antrag = neu(2);
  assert.equal(schrittStatus(antrag, config, 'gibtsnicht'), 'gesperrt');
  assert.deepEqual(pruefeSchritt(antrag, config, 'gibtsnicht'), { ok: false, fehler: [UNBEKANNTER_TYP] });
});

// ------------------------------------------------------------ bereitFuerPdf

console.log('');
console.log('bereitFuerPdf und Fortschritt');

pruefe('bereitFuerPdf erst nach allen vier Schritten', () => {
  let antrag = neu(2);
  assert.equal(bereitFuerPdf(antrag, config), false);
  antrag = alleDrei(antrag);
  assert.equal(bereitFuerPdf(antrag, config), false);
  antrag = erledige(antrag, 'selbst');
  assert.equal(bereitFuerPdf(antrag, config), true);
});

pruefe('Fortschritt zaehlt nur die Schritte in der App', () => {
  let antrag = neu(2);
  assert.deepEqual(kurz(fortschritt(antrag, config)), { erledigt: 0, gesamt: 4, aktuell: 'begruendung' });
  antrag = erledige(antrag, 'begruendung');
  assert.deepEqual(kurz(fortschritt(antrag, config)), { erledigt: 1, gesamt: 4, aktuell: 'teamcheck' });
  antrag = alleDrei(antrag);
  assert.deepEqual(kurz(fortschritt(antrag, config)), { erledigt: 3, gesamt: 4, aktuell: 'selbst' });
  antrag = erledige(antrag, 'selbst');
  assert.deepEqual(kurz(fortschritt(antrag, config)), { erledigt: 4, gesamt: 4, aktuell: null });
});

function kurz(stand) {
  return { erledigt: stand.erledigt, gesamt: stand.gesamt, aktuell: stand.aktuell ? stand.aktuell.id : null };
}

// ------------------------------------------------------------ Stufe 3

console.log('');
console.log('Stufe 3');

pruefe('Stufe 3 hat eigene Kriterien und nennt Krone', () => {
  const antrag = neu(3);
  const stufe = stufeVon(config, antrag);
  assert.equal(stufe.zielname, 'Krone');
  assert.ok(stufe.titel.includes('Krone'));
  assert.equal(stufe.schritte[2].kriterien.length, 6);
  assert.notDeepEqual(stufe.schritte[2].kriterien, config.stufen['2'].schritte[2].kriterien);
  assert.ok(stufe.schritte[3].aussagen.some((satz) => satz.includes('Krone')));
  assert.ok(stufe.schritte[4].optionen.some((satz) => satz.includes('Krone')));
  assert.ok(stufe.schritte[1].hinweis.includes('Stufe 3'));
});

pruefe('Stufe 3 laeuft durch wie Stufe 2', () => {
  const antrag = erledige(alleDrei(neu(3)), 'selbst');
  assert.equal(bereitFuerPdf(antrag, config), true);
});

// ------------------------------------------------------------ Konfiguration

console.log('');
console.log('content/antrag.json');

pruefe('Empfaenger sind fuer alle Jahrgaenge und Klassen angelegt', () => {
  for (const jgst of ['5', '6', '7']) {
    assert.ok(config.empfaenger[jgst], 'Jahrgang ' + jgst + ' fehlt');
    assert.deepEqual(Object.keys(config.empfaenger[jgst]), ['A', 'B', 'C']);
  }
});

pruefe('beide Stufen haben dieselbe Schrittfolge', () => {
  const ids = (stufe) => stufe.schritte.map((schritt) => schritt.id);
  assert.deepEqual(ids(config.stufen['2']), ['begruendung', 'teamcheck', 'empfehlung', 'selbst', 'entscheidung']);
  assert.deepEqual(ids(config.stufen['2']), ids(config.stufen['3']));
});

pruefe('das Zeichen aus dem PDF ist ersetzt, der Bindestrich bleibt', () => {
  for (const stufe of Object.values(config.stufen)) {
    assert.ok(!stufe.titel.includes('➭'), 'Zeichen 27AD steht noch im Titel');
    assert.ok(stufe.titel.includes(' zu '), 'Titel nennt kein "zu"');
    const entscheidung = stufe.schritte.find((schritt) => schritt.typ === 'nurPdf');
    assert.ok(entscheidung.optionen[0].startsWith('Noch im TRAINING - '));
    assert.ok(entscheidung.optionen[1].startsWith('Antrag GENEHMIGT - '));
  }
});

pruefe('kein Gedankenstrich in den Texten der Konfiguration', () => {
  const text = JSON.stringify(config);
  assert.equal(text.includes('–'), false, 'Halbgeviertstrich gefunden');
  assert.equal(text.includes('—'), false, 'Geviertstrich gefunden');
});

// ------------------------------------------------------------ Speicherbedarf

console.log('');
console.log('Speicherbedarf');

pruefe('ein vollstaendiger Antrag bleibt unter 300 KB (ohne Unterschriftsbilder)', () => {
  const antrag = erledige(alleDrei(neu(2)), 'selbst');
  antrag.kopf = { name: 'Max Muster', klasse: 'B' };
  const bytes = Buffer.byteLength(JSON.stringify(antrag), 'utf8');
  console.log('        Geruest ohne Bilder: ' + bytes + ' Byte');
  assert.ok(bytes < 300 * 1024, bytes + ' Byte');
});

console.log('');
console.log(bestanden + ' Prüfungen bestanden, ' + fehlgeschlagen.length + ' fehlgeschlagen.');
if (fehlgeschlagen.length > 0) process.exitCode = 1;
