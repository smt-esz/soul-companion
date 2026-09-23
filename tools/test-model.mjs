// Tests für src/app/model.js. Ohne Framework, nur node und assert.
//
//   node tools/test-model.mjs
//
// Geprüft wird gegen die echten gebauten Daten aus docs/data/ (Jg 5 nach
// AP-06 und AP-08, dazu Jg 6 und Jg 7) und gegen kleine synthetische Daten
// für die Randfälle. Die Sollwerte stehen in AP-09, Abschnitt "Tests".
//
// In den synthetischen Daten steht kein erfundener Inhalt: Fächer, Kürzel und
// Titel sind als Platzhalter erkennbar (AP_ALLGEMEIN, Regel 6 und 7).

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { parseISODate, schultageBis, toISODate } from '../src/app/dates.js';
import {
  abgabenAb, bausteineDesFachs, inputsDesFachs, naechsteFerien,
  naechsterSchultag, naechsterSlotJeFach, naechsterSoulTag, rasterAm, slotsAm,
  stufenInfo, termineAm, wocheTermine, wocheninfo
} from '../src/app/model.js';

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function daten(name) {
  return JSON.parse(fs.readFileSync(path.join(wurzel, 'docs', 'data', name + '.json'), 'utf8'));
}

const schule = daten('schule');
const jg5 = daten('jg5');
const jg6 = daten('jg6');
const jg7 = daten('jg7');

const d = parseISODate;
const ids = (liste) => liste.map((eintrag) => eintrag.id);

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

// --------------------------------------------------------- synthetische Daten

// Ein Jahrgang mit einem Slot über den Jahreswechsel und einem Coaching mit
// Enddatum. Alle Namen sind Platzhalter.
const jgSynthetisch = {
  schema: 1,
  jgst: 0,
  sonderwochen: [],
  slots: [
    {
      id: 't-test-1', fach: 'test', nr: 1, spur: 1, spuren: [1], stunden: null,
      von: '2026-12-07', bis: '2027-01-15', abgabe: '2027-01-15',
      baustein: 't-test-1', status: 'fest', hinweis: ''
    }
  ],
  bausteine: [{ id: 't-test-1', fach: 'test', titel: 'Testbaustein', stationen: [] }],
  inputs: [],
  coachings: [
    { wochentag: 1, kuerzel: 'TEST', gueltigAb: '2026-12-07', gueltigBis: '2026-12-21', klasse: null }
  ],
  termine: [],
  raster: []
};

// Ein Jahrgang mit einem offenen Slot (Fach folgt) und einem festen Slot.
const jgOffen = {
  schema: 1,
  sonderwochen: [],
  slots: [
    {
      id: 't-offen-1', fach: 'offen', nr: 1, spur: 1, spuren: [1], stunden: null,
      von: '2026-09-07', bis: '2026-09-25', abgabe: '2026-09-25',
      baustein: '', status: 'offen', hinweis: ''
    },
    {
      id: 't-test-2', fach: 'test', nr: 1, spur: 2, spuren: [2], stunden: null,
      von: '2026-09-07', bis: '2026-09-25', abgabe: '2026-09-25',
      baustein: 't-test-2', status: 'fest', hinweis: ''
    }
  ],
  bausteine: [],
  inputs: [],
  coachings: [],
  termine: [],
  raster: []
};

// Zwei Inputs am selben Tag plus Coaching, für die Sortierprüfung.
const jgSortierung = {
  schema: 1,
  sonderwochen: [],
  slots: [],
  bausteine: [],
  inputs: [],
  coachings: [
    { wochentag: 2, kuerzel: 'TEST', gueltigAb: '2026-09-01', gueltigBis: null, klasse: null }
  ],
  termine: [
    {
      datum: '2026-09-08', art: 'input', fach: 'geo', kuerzel: 'TEST', klasse: null,
      input: '', text: 'Testtermin Geografie', station: null, pflicht: false, raster: ''
    },
    {
      datum: '2026-09-08', art: 'input', fach: 'de', kuerzel: 'TEST', klasse: null,
      input: '', text: 'Testtermin Deutsch', station: null, pflicht: false, raster: ''
    }
  ],
  raster: []
};

console.log('slotsAm');

pruefe('slotsAm 2026-10-26 = de-2, en-1, geo-1 (nach Spur sortiert)', () => {
  assert.deepEqual(ids(slotsAm(jg5, d('2026-10-26'))), ['jg5-de-2', 'jg5-en-1', 'jg5-geo-1']);
});

pruefe('slotsAm prüft beide Grenzen mit', () => {
  assert.equal(slotsAm(jg5, d('2026-10-25')).length, 0);
  assert.equal(slotsAm(jg5, d('2026-11-20')).some((slot) => slot.id === 'jg5-de-2'), true);
  assert.equal(slotsAm(jg5, d('2026-11-21')).some((slot) => slot.id === 'jg5-de-2'), false);
});

pruefe('slotsAm: ein Slot läuft in der Sonderwoche weiter', () => {
  // 2026-09-16 liegt in der Themen- und Fahrtenwoche, Deutsch 1 läuft trotzdem.
  assert.deepEqual(ids(slotsAm(jg5, d('2026-09-16'))), ['jg5-de-1', 'jg5-ma-1', 'jg5-bio-1']);
});

pruefe('slotsAm: ein Slot über mehrere Spuren kommt einmal vor', () => {
  const slots = slotsAm(jg7, d('2027-06-14'));
  const fvu = slots.filter((slot) => slot.id === 'jg7-fvu-1');
  assert.equal(fvu.length, 1);
  assert.deepEqual(fvu[0].spuren, [1, 2, 3]);
});

pruefe('slotsAm liefert Datumsangaben als Date', () => {
  const slot = slotsAm(jg5, d('2026-10-26'))[0];
  assert.ok(slot.von instanceof Date);
  assert.ok(slot.bis instanceof Date);
  assert.ok(slot.abgabe instanceof Date);
  assert.equal(toISODate(slot.von), '2026-10-26');
  assert.equal(toISODate(slot.abgabe), '2026-11-20');
});

console.log('naechsterSlotJeFach');

pruefe('naechsterSlotJeFach 2026-10-05 (SOUL-Basics-Woche): de = jg5-de-2', () => {
  const naechste = naechsterSlotJeFach(jg5, d('2026-10-05'));
  assert.equal(naechste.de.id, 'jg5-de-2');
  assert.equal(toISODate(naechste.de.von), '2026-10-26');
});

pruefe('naechsterSlotJeFach kennt jedes Fach des Jahrgangs', () => {
  const naechste = naechsterSlotJeFach(jg5, d('2026-10-05'));
  assert.deepEqual(Object.keys(naechste).sort(), ['bio', 'de', 'en', 'geo', 'ma']);
});

pruefe('naechsterSlotJeFach: kein Slot mehr, also null', () => {
  const naechste = naechsterSlotJeFach(jg5, d('2027-07-09'));
  for (const fachId of Object.keys(naechste)) {
    assert.equal(naechste[fachId], null, fachId + ' sollte null sein');
  }
});

pruefe('naechsterSlotJeFach nimmt offene Slots nicht auf', () => {
  const naechste = naechsterSlotJeFach(jgOffen, d('2026-09-01'));
  assert.deepEqual(Object.keys(naechste), ['test']);
  assert.equal(naechste.test.id, 't-test-2');
});

console.log('bausteineDesFachs');

pruefe('bausteineDesFachs de am 2027-01-11: Deutsch 5 läuft', () => {
  const liste = bausteineDesFachs(jg5, 'de', d('2027-01-11'));
  const laufend = liste.filter((eintrag) => eintrag.status === 'laeuft');
  assert.equal(laufend.length, 1);
  assert.equal(laufend[0].slot.id, 'jg5-de-5');
});

pruefe('bausteineDesFachs sortiert nach Datum, nicht nach nr', () => {
  // Deutsch 5 beginnt am 2027-01-11, Deutsch 4 erst am 2027-02-22.
  const liste = bausteineDesFachs(jg5, 'de', d('2027-01-11'));
  assert.deepEqual(liste.map((eintrag) => eintrag.slot.id), [
    'jg5-de-1', 'jg5-de-2', 'jg5-de-3', 'jg5-de-5', 'jg5-de-4', 'jg5-de-6', 'jg5-de-7'
  ]);
  const nummern = liste.map((eintrag) => eintrag.slot.nr);
  assert.deepEqual(nummern, [1, 2, 3, 5, 4, 6, 7]);
});

pruefe('bausteineDesFachs setzt vorbei, laeuft und kommt', () => {
  const liste = bausteineDesFachs(jg5, 'de', d('2027-01-11'));
  assert.deepEqual(liste.map((eintrag) => eintrag.status), [
    'vorbei', 'vorbei', 'vorbei', 'laeuft', 'kommt', 'kommt', 'kommt'
  ]);
});

pruefe('bausteineDesFachs hängt den Baustein an den Slot', () => {
  const liste = bausteineDesFachs(jg5, 'bio', d('2026-09-08'));
  assert.ok(liste.length > 0);
  assert.equal(liste[0].baustein.id, liste[0].slot.baustein);
  assert.equal(liste[0].baustein.fach, 'bio');
});

console.log('wocheninfo und rasterAm');

pruefe('wocheninfo 2026-09-16: KW 38 und Themenwoche', () => {
  const info = wocheninfo(schule, jg5, d('2026-09-16'));
  assert.equal(info.kw, 38);
  assert.equal(info.jahr, 2026);
  assert.equal(toISODate(info.montag), '2026-09-14');
  assert.equal(info.sonderwoche.art, 'themenwoche');
  assert.equal(info.ferien, null);
});

pruefe('wocheninfo 2026-10-14: Herbstferien, keine Sonderwoche', () => {
  const info = wocheninfo(schule, jg5, d('2026-10-14'));
  assert.equal(info.kw, 42);
  assert.equal(info.sonderwoche, null);
  assert.equal(info.ferien.name, 'Herbstferien');
  assert.ok(info.ferien.von instanceof Date);
});

pruefe('rasterAm findet den Rasterzeitraum, sonst null', () => {
  assert.equal(rasterAm(jg5, d('2026-09-08')).id, 'jg5-r1');
  assert.equal(rasterAm(jg5, d('2026-10-02')).id, 'jg5-r1');
  assert.equal(rasterAm(jg5, d('2026-10-26')), null);
});

console.log('termineAm');

pruefe('termineAm 2026-09-08: Input Bio HAM Klasse A Pflicht Station 9, Coaching HEC', () => {
  const termine = termineAm(jg5, schule, d('2026-09-08'));
  assert.equal(termine.length, 2);
  assert.deepEqual(termine[0], {
    art: 'input',
    fach: 'bio',
    kuerzel: 'HAM',
    klasse: 'A',
    titel: 'Sektion eines Fisches',
    text: null,
    station: 9,
    pflicht: true,
    inputId: 'jg5-bio-sektion'
  });
  assert.equal(termine[1].art, 'coaching');
  assert.equal(termine[1].kuerzel, 'HEC');
});

pruefe('termineAm 2026-09-22: Input Bio HAM Klasse B, kein Coaching HEC (entfall)', () => {
  const termine = termineAm(jg5, schule, d('2026-09-22'));
  assert.equal(termine.length, 1);
  assert.equal(termine[0].art, 'input');
  assert.equal(termine[0].klasse, 'B');
  assert.equal(termine.some((termin) => termin.art === 'coaching'), false);
});

pruefe('termineAm 2026-09-16: Sonderwoche, keine Termine', () => {
  assert.deepEqual(termineAm(jg5, schule, d('2026-09-16')), []);
});

pruefe('termineAm an Ferientagen und Wochenenden: keine Termine', () => {
  assert.deepEqual(termineAm(jg5, schule, d('2026-10-13')), []);
  assert.deepEqual(termineAm(jg5, schule, d('2026-09-12')), []);
});

pruefe('termineAm nimmt den Text als Titel, wenn kein Input hinterlegt ist', () => {
  const termine = termineAm(jg5, schule, d('2026-09-11'));
  assert.equal(termine[0].titel, termine[0].text);
  assert.equal(termine[0].inputId, null);
});

pruefe('termineAm sortiert Input vor Coaching', () => {
  const termine = termineAm(jg5, schule, d('2026-09-09'));
  assert.deepEqual(termine.map((termin) => termin.art), ['input', 'coaching']);
});

pruefe('termineAm sortiert nach der Fachreihenfolge aus schule.faecher', () => {
  // Zwei Inputs am selben Tag: Geografie (5) steht nach Deutsch (1).
  const termine = termineAm(jgSortierung, schule, d('2026-09-08'));
  assert.deepEqual(termine.map((termin) => termin.fach), ['de', 'geo', null]);
  assert.deepEqual(termine.map((termin) => termin.art), ['input', 'input', 'coaching']);
});

console.log('wocheTermine');

pruefe('wocheTermine liefert fünf Tage Mo bis Fr', () => {
  const woche = wocheTermine(jg5, schule, d('2026-09-07'));
  assert.equal(woche.length, 5);
  assert.deepEqual(woche.map((tag) => toISODate(tag.datum)), [
    '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11'
  ]);
  assert.deepEqual(woche.map((tag) => tag.termine.length), [1, 2, 2, 1, 2]);
});

pruefe('wocheTermine in der Themenwoche: Sonderwoche gesetzt, keine Termine', () => {
  const woche = wocheTermine(jg5, schule, d('2026-09-14'));
  assert.equal(woche.every((tag) => tag.termine.length === 0), true);
  assert.equal(woche.every((tag) => tag.sonderwoche && tag.sonderwoche.art === 'themenwoche'), true);
  assert.equal(woche.every((tag) => tag.ferien === null), true);
});

pruefe('wocheTermine in den Herbstferien: Ferien gesetzt', () => {
  const woche = wocheTermine(jg5, schule, d('2026-10-12'));
  assert.equal(woche.every((tag) => tag.ferien && tag.ferien.name === 'Herbstferien'), true);
  assert.equal(woche.every((tag) => tag.termine.length === 0), true);
});

console.log('naechsteFerien');

pruefe('naechsteFerien 2026-09-08: Herbstferien, 23 Schultage davor', () => {
  const ferien = naechsteFerien(schule, d('2026-09-08'));
  assert.equal(ferien.name, 'Herbstferien');
  assert.equal(toISODate(ferien.von), '2026-10-12');
  assert.equal(toISODate(ferien.bis), '2026-10-24');
  assert.equal(ferien.laeuft, false);
  assert.equal(ferien.schultageBis, 23);
});

pruefe('naechsteFerien 2026-10-14: Herbstferien laufen', () => {
  const ferien = naechsteFerien(schule, d('2026-10-14'));
  assert.equal(ferien.name, 'Herbstferien');
  assert.equal(ferien.laeuft, true);
  assert.equal(ferien.schultageBis, 0);
});

pruefe('naechsteFerien überspringt einzelne freie Tage', () => {
  // Nach dem 2026-11-16 kommen Buß- und Bettag (1 Tag) und zwei bewegliche
  // Ferientage (2 Tage). Beide sind kürzer als drei Tage.
  const ferien = naechsteFerien(schule, d('2026-11-16'));
  assert.equal(ferien.name, 'Weihnachtsferien');
});

console.log('abgabenAb');

pruefe('abgabenAb 2026-10-26: erste Abgabe am 2026-11-20', () => {
  const abgaben = abgabenAb(jg5, d('2026-10-26'), 3, schule);
  assert.equal(toISODate(abgaben[0].abgabe), '2026-11-20');
  assert.deepEqual(ids(abgaben), ['jg5-de-2', 'jg5-en-1', 'jg5-geo-1']);
});

pruefe('abgabenAb begrenzt auf anzahl und sortiert aufsteigend', () => {
  assert.equal(abgabenAb(jg5, d('2026-10-26'), 1, schule).length, 1);
  const alle = abgabenAb(jg5, d('2026-10-26'), 0, schule);
  assert.ok(alle.length > 3);
  for (let i = 1; i < alle.length; i++) {
    assert.ok(alle[i - 1].abgabe <= alle[i].abgabe, 'Abgaben nicht sortiert');
  }
});

pruefe('abgabenAb zählt Schultage und lässt Ferientage aus', () => {
  const mitSchule = abgabenAb(jg5, d('2026-10-26'), 1, schule)[0];
  const ohneSchule = abgabenAb(jg5, d('2026-10-26'), 1)[0];
  // Der Buß- und Bettag am 2026-11-18 fällt nur mit Schuldaten heraus.
  assert.equal(mitSchule.schultageBis, 18);
  assert.equal(ohneSchule.schultageBis, 19);
});

pruefe('abgabenAb: schultageBis stimmt für jede Abgabe des Jahres', () => {
  const start = d('2026-08-31');
  for (const slot of abgabenAb(jg5, start, 0, schule)) {
    assert.equal(slot.schultageBis, schultageBis(start, slot.abgabe, schule), slot.id);
  }
});

console.log('naechsterSchultag und naechsterSoulTag');

pruefe('naechsterSchultag springt über Wochenende und Herbstferien', () => {
  assert.equal(toISODate(naechsterSchultag(schule, d('2026-10-09'))), '2026-10-26');
  assert.equal(toISODate(naechsterSchultag(schule, d('2026-09-11'))), '2026-09-14');
});

pruefe('naechsterSoulTag lässt die Sonderwoche aus, naechsterSchultag nicht', () => {
  // 2026-10-05 bis 2026-10-09 ist die SOUL-Basics-Woche.
  assert.equal(toISODate(naechsterSchultag(schule, d('2026-10-02'))), '2026-10-05');
  assert.equal(toISODate(naechsterSoulTag(schule, jg5, d('2026-10-02'))), '2026-10-26');
});

pruefe('naechsterSoulTag 2026-10-14 (Herbstferien) = 2026-10-26', () => {
  assert.equal(toISODate(naechsterSoulTag(schule, jg5, d('2026-10-14'))), '2026-10-26');
});

console.log('inputsDesFachs und stufenInfo');

pruefe('inputsDesFachs gruppiert nach art und hängt die nächsten Termine an', () => {
  const gruppen = inputsDesFachs(jg5, 'bio', d('2026-09-01'));
  assert.deepEqual(Object.keys(gruppen), ['fach', 'methode', 'baustein']);
  assert.deepEqual(gruppen.fach, []);
  assert.deepEqual(gruppen.methode, []);
  assert.equal(gruppen.baustein.length, 1);
  assert.equal(gruppen.baustein[0].id, 'jg5-bio-sektion');
  assert.equal(gruppen.baustein[0].termine.length, 3);
  assert.equal(toISODate(gruppen.baustein[0].termine[0].datum), '2026-09-08');
});

pruefe('inputsDesFachs zeigt nur Termine ab dem Stichtag', () => {
  const gruppen = inputsDesFachs(jg5, 'bio', d('2026-09-23'));
  assert.equal(gruppen.baustein[0].termine.length, 1);
  assert.equal(toISODate(gruppen.baustein[0].termine[0].datum), '2026-09-29');
});

pruefe('stufenInfo Jg 5: Aufstieg erst ab 2026-10-26', () => {
  const vorher = stufenInfo(jg5, d('2026-10-25'));
  assert.equal(toISODate(vorher.fruehesterAufstieg), '2026-10-26');
  assert.equal(vorher.aufstiegMoeglich, false);
  assert.equal(stufenInfo(jg5, d('2026-10-26')).aufstiegMoeglich, true);
});

pruefe('stufenInfo ohne Sperre: Aufstieg jederzeit möglich', () => {
  const info = stufenInfo(jg6, d('2026-09-01'));
  assert.equal(info.fruehesterAufstieg, null);
  assert.equal(info.aufstiegMoeglich, true);
});

console.log('synthetische Daten');

pruefe('Slot über den Jahreswechsel läuft weiter', () => {
  assert.deepEqual(ids(slotsAm(jgSynthetisch, d('2026-12-31'))), ['t-test-1']);
  assert.deepEqual(ids(slotsAm(jgSynthetisch, d('2027-01-04'))), ['t-test-1']);
  const liste = bausteineDesFachs(jgSynthetisch, 'test', d('2027-01-04'));
  assert.equal(liste[0].status, 'laeuft');
  assert.equal(toISODate(liste[0].slot.bis), '2027-01-15');
});

pruefe('Coaching endet mit gueltigBis', () => {
  const schuleOhneFerien = { faecher: schule.faecher, ferien: [] };
  // Montage: 2026-12-07 innerhalb, 2026-12-28 nach gueltigBis.
  const davor = termineAm(jgSynthetisch, schuleOhneFerien, d('2026-12-07'));
  assert.equal(davor.length, 1);
  assert.equal(davor[0].kuerzel, 'TEST');
  assert.deepEqual(termineAm(jgSynthetisch, schuleOhneFerien, d('2026-12-28')), []);
});

pruefe('Ferienblock von einem Tag zählt nicht als nächste Ferien', () => {
  const kurz = {
    ferien: [
      { name: 'Testtag', von: '2026-11-02', bis: '2026-11-02' },
      { name: 'Testferien', von: '2026-11-09', bis: '2026-11-11' }
    ]
  };
  const ferien = naechsteFerien(kurz, d('2026-11-01'));
  assert.equal(ferien.name, 'Testferien');
  assert.equal(toISODate(ferien.von), '2026-11-09');
});

pruefe('leerer Jahrgang stürzt nicht ab', () => {
  const leer = {};
  const tag = d('2026-09-08');
  assert.deepEqual(slotsAm(leer, tag), []);
  assert.deepEqual(naechsterSlotJeFach(leer, tag), {});
  assert.deepEqual(bausteineDesFachs(leer, 'de', tag), []);
  assert.equal(wocheninfo({}, leer, tag).sonderwoche, null);
  assert.equal(rasterAm(leer, tag), null);
  assert.deepEqual(termineAm(leer, {}, tag), []);
  assert.equal(wocheTermine(leer, {}, tag).length, 5);
  assert.equal(naechsteFerien({}, tag), null);
  assert.deepEqual(abgabenAb(leer, tag, 3), []);
  assert.ok(naechsterSchultag({}, tag) instanceof Date);
  assert.ok(naechsterSoulTag({}, leer, tag) instanceof Date);
  assert.deepEqual(inputsDesFachs(leer, 'de', tag), { fach: [], methode: [], baustein: [] });
  assert.deepEqual(stufenInfo(leer, tag), { fruehesterAufstieg: null, aufstiegMoeglich: true });
});

console.log('Reinheit und Laufzeit');

pruefe('keine Mutation der Eingabedaten (tief eingefroren)', () => {
  const kalt = { schule: tiefEinfrieren(daten('schule')), jg: tiefEinfrieren(daten('jg5')) };
  const tag = d('2026-09-08');
  alleAufrufe(kalt.jg, kalt.schule, tag);
  // Die Daten stehen unverändert als Text da, umgewandelt wird nur in Kopien.
  assert.equal(kalt.jg.slots[0].von, '2026-08-31');
  assert.equal(typeof kalt.jg.slots[0].von, 'string');
  assert.equal(kalt.jg.slots[0].id, 'jg5-de-1');
  assert.equal(kalt.schule.ferien[0].von, '2026-10-12');
  assert.equal(Object.isFrozen(kalt.jg.slots), true);
});

pruefe('jede Funktion braucht für ein Datum unter 5 ms', () => {
  const tag = d('2026-09-08');
  const langsam = [];
  for (const [name, fn] of einzelAufrufe(jg5, schule, tag)) {
    const dauer = messen(fn);
    console.log('        ' + name + ': ' + dauer.toFixed(3) + ' ms');
    if (dauer >= 5) langsam.push(name + ' ' + dauer.toFixed(3) + ' ms');
  }
  assert.deepEqual(langsam, []);
});

console.log('');
console.log(bestanden + ' Prüfungen bestanden, ' + fehlgeschlagen.length + ' fehlgeschlagen.');
if (fehlgeschlagen.length > 0) process.exit(1);

// ----------------------------------------------------------------- Hilfsmittel

function einzelAufrufe(jg, schuleDaten, tag) {
  return [
    ['slotsAm', () => slotsAm(jg, tag)],
    ['naechsterSlotJeFach', () => naechsterSlotJeFach(jg, tag)],
    ['bausteineDesFachs', () => bausteineDesFachs(jg, 'de', tag)],
    ['wocheninfo', () => wocheninfo(schuleDaten, jg, tag)],
    ['rasterAm', () => rasterAm(jg, tag)],
    ['termineAm', () => termineAm(jg, schuleDaten, tag)],
    ['wocheTermine', () => wocheTermine(jg, schuleDaten, tag)],
    ['naechsteFerien', () => naechsteFerien(schuleDaten, tag)],
    ['abgabenAb (5)', () => abgabenAb(jg, tag, 5, schuleDaten)],
    ['abgabenAb (ganzes Jahr)', () => abgabenAb(jg, tag, 0, schuleDaten)],
    ['naechsterSchultag', () => naechsterSchultag(schuleDaten, tag)],
    ['naechsterSoulTag', () => naechsterSoulTag(schuleDaten, jg, tag)],
    ['inputsDesFachs', () => inputsDesFachs(jg, 'bio', tag)],
    ['stufenInfo', () => stufenInfo(jg, tag)]
  ];
}

function alleAufrufe(jg, schuleDaten, tag) {
  for (const [, fn] of einzelAufrufe(jg, schuleDaten, tag)) fn();
}

/** Mittlere Dauer eines Aufrufs in Millisekunden. */
function messen(fn, laeufe = 20) {
  fn(); // einmal warmlaufen, damit der erste Aufruf nicht alles bestimmt
  const start = process.hrtime.bigint();
  for (let i = 0; i < laeufe; i++) fn();
  const ende = process.hrtime.bigint();
  return Number(ende - start) / 1e6 / laeufe;
}

function tiefEinfrieren(wert) {
  if (wert && typeof wert === 'object') {
    for (const schluessel of Object.keys(wert)) tiefEinfrieren(wert[schluessel]);
    Object.freeze(wert);
  }
  return wert;
}

