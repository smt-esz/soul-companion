// Tests für src/app/dates.js. Ohne Framework, nur node und assert.
//
//   node tools/test-dates.mjs
//
// Die Fälle stammen aus AP-01, Akzeptanzkriterium 4. Sie prüfen vor allem
// die beiden Zeitumstellungen 2026 (29.03. und 25.10.) und die ISO-Wochen
// am Jahreswechsel 2026/2027.

import assert from 'node:assert/strict';
import {
  parseISODate, toISODate, addDays, diffDays, mondayOf, isoWeek, isWeekend,
  istFerientag, istSchultag, schultageBis, formatDatum, heute
} from '../src/app/dates.js';

const schule = {
  ferien: [
    { name: 'Herbstferien', von: '2026-10-12', bis: '2026-10-24' },
    { name: 'Brückentag', von: '2026-11-13', bis: '2026-11-13' }
  ]
};

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

console.log('parseISODate und toISODate');

pruefe('parseISODate 2026-03-29 ist der 29. (Beginn der Sommerzeit)', () => {
  const d = parseISODate('2026-03-29');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 2);
  assert.equal(d.getDate(), 29);
  assert.equal(d.getHours(), 0);
  assert.equal(toISODate(d), '2026-03-29');
});

pruefe('parseISODate 2026-10-25 ist der 25. (Ende der Sommerzeit)', () => {
  const d = parseISODate('2026-10-25');
  assert.equal(d.getDate(), 25);
  assert.equal(toISODate(d), '2026-10-25');
});

pruefe('parseISODate wirft bei Unsinn', () => {
  assert.throws(() => parseISODate('31.08.2026'));
  assert.throws(() => parseISODate('2026-02-30'));
  assert.throws(() => parseISODate('2026-13-01'));
  assert.throws(() => parseISODate(''));
  assert.throws(() => parseISODate(null));
});

pruefe('toISODate und parseISODate sind umkehrbar', () => {
  for (const text of ['2026-01-01', '2026-03-29', '2026-10-25', '2026-12-31', '2027-01-04']) {
    assert.equal(toISODate(parseISODate(text)), text);
  }
});

console.log('diffDays und addDays');

pruefe('diffDays(29.03.2026, 30.03.2026) = 1 (Tag mit 23 Stunden)', () => {
  assert.equal(diffDays(parseISODate('2026-03-29'), parseISODate('2026-03-30')), 1);
});

pruefe('diffDays(25.10.2026, 26.10.2026) = 1 (Tag mit 25 Stunden)', () => {
  assert.equal(diffDays(parseISODate('2026-10-25'), parseISODate('2026-10-26')), 1);
});

pruefe('diffDays rückwärts und auf sich selbst', () => {
  assert.equal(diffDays(parseISODate('2026-03-30'), parseISODate('2026-03-29')), -1);
  assert.equal(diffDays(parseISODate('2026-08-31'), parseISODate('2026-08-31')), 0);
  assert.equal(diffDays(parseISODate('2026-08-31'), parseISODate('2026-10-02')), 32);
});

pruefe('addDays über beide Zeitumstellungen bleibt auf 00:00', () => {
  const a = addDays(parseISODate('2026-03-28'), 1);
  assert.equal(toISODate(a), '2026-03-29');
  assert.equal(a.getHours(), 0);
  const b = addDays(parseISODate('2026-10-24'), 1);
  assert.equal(toISODate(b), '2026-10-25');
  assert.equal(b.getHours(), 0);
  assert.equal(toISODate(addDays(parseISODate('2026-12-31'), 1)), '2027-01-01');
  assert.equal(toISODate(addDays(parseISODate('2026-01-01'), -1)), '2025-12-31');
});

console.log('mondayOf, isoWeek, isWeekend');

pruefe('mondayOf', () => {
  assert.equal(toISODate(mondayOf(parseISODate('2026-08-31'))), '2026-08-31');
  assert.equal(toISODate(mondayOf(parseISODate('2026-09-06'))), '2026-08-31');
  assert.equal(toISODate(mondayOf(parseISODate('2026-09-04'))), '2026-08-31');
});

pruefe('isoWeek(2026-12-28) = { jahr: 2026, kw: 53 }', () => {
  assert.deepEqual(isoWeek(parseISODate('2026-12-28')), { jahr: 2026, kw: 53 });
});

pruefe('isoWeek(2027-01-04) = { jahr: 2027, kw: 1 }', () => {
  assert.deepEqual(isoWeek(parseISODate('2027-01-04')), { jahr: 2027, kw: 1 });
});

pruefe('isoWeek am Jahreswechsel gehört zur Woche des Donnerstags', () => {
  assert.deepEqual(isoWeek(parseISODate('2027-01-03')), { jahr: 2026, kw: 53 });
  assert.deepEqual(isoWeek(parseISODate('2026-01-01')), { jahr: 2026, kw: 1 });
  assert.deepEqual(isoWeek(parseISODate('2026-08-31')), { jahr: 2026, kw: 36 });
});

pruefe('isWeekend', () => {
  assert.equal(isWeekend(parseISODate('2026-09-11')), false);
  assert.equal(isWeekend(parseISODate('2026-09-12')), true);
  assert.equal(isWeekend(parseISODate('2026-09-13')), true);
  assert.equal(isWeekend(parseISODate('2026-09-14')), false);
});

console.log('Ferien und Schultage');

pruefe('istFerientag prüft die Grenzen mit', () => {
  assert.equal(istFerientag(parseISODate('2026-10-11'), schule), false);
  assert.equal(istFerientag(parseISODate('2026-10-12'), schule), true);
  assert.equal(istFerientag(parseISODate('2026-10-19'), schule), true);
  assert.equal(istFerientag(parseISODate('2026-10-24'), schule), true);
  assert.equal(istFerientag(parseISODate('2026-10-25'), schule), false);
});

pruefe('istFerientag mit einzelnem freien Tag', () => {
  assert.equal(istFerientag(parseISODate('2026-11-13'), schule), true);
  assert.equal(istFerientag(parseISODate('2026-11-12'), schule), false);
});

pruefe('istFerientag ohne Ferienliste', () => {
  assert.equal(istFerientag(parseISODate('2026-10-19'), {}), false);
  assert.equal(istFerientag(parseISODate('2026-10-19'), null), false);
});

pruefe('istSchultag mit Ferienliste', () => {
  assert.equal(istSchultag(parseISODate('2026-10-09'), schule), true);
  assert.equal(istSchultag(parseISODate('2026-10-10'), schule), false);
  assert.equal(istSchultag(parseISODate('2026-10-13'), schule), false);
  assert.equal(istSchultag(parseISODate('2026-10-26'), schule), true);
  assert.equal(istSchultag(parseISODate('2026-11-13'), schule), false);
});

pruefe('schultageBis über ein Wochenende', () => {
  // Von Freitag bis Dienstag: Samstag und Sonntag zählen nicht.
  assert.equal(schultageBis(parseISODate('2026-09-11'), parseISODate('2026-09-15'), schule), 2);
});

pruefe('schultageBis zählt in (von, bis]', () => {
  assert.equal(schultageBis(parseISODate('2026-09-07'), parseISODate('2026-09-11'), schule), 4);
  assert.equal(schultageBis(parseISODate('2026-09-11'), parseISODate('2026-09-11'), schule), 0);
  assert.equal(schultageBis(parseISODate('2026-09-15'), parseISODate('2026-09-11'), schule), 0);
});

pruefe('schultageBis überspringt die Herbstferien', () => {
  // 09.10. bis 26.10.: nur der 26.10. ist Schultag.
  assert.equal(schultageBis(parseISODate('2026-10-09'), parseISODate('2026-10-26'), schule), 1);
});

console.log('formatDatum');

pruefe('formatDatum(2026-09-22, lang) = Dienstag, 22. September 2026', () => {
  assert.equal(formatDatum(parseISODate('2026-09-22'), 'lang'), 'Dienstag, 22. September 2026');
});

pruefe('formatDatum in allen Stilen', () => {
  const d = parseISODate('2026-08-31');
  assert.equal(formatDatum(d, 'kurz'), '31.08.');
  assert.equal(formatDatum(d, 'datum'), '31.08.2026');
  assert.equal(formatDatum(d, 'lang'), 'Montag, 31. August 2026');
  assert.equal(formatDatum(d, 'tag'), 'Mo');
  assert.equal(formatDatum(d, 'tagLang'), 'Montag');
  assert.equal(formatDatum(d), '31.08.2026');
});

pruefe('formatDatum kennt alle Monate und Wochentage', () => {
  assert.equal(formatDatum(parseISODate('2026-03-01'), 'lang'), 'Sonntag, 1. März 2026');
  assert.equal(formatDatum(parseISODate('2026-12-24'), 'lang'), 'Donnerstag, 24. Dezember 2026');
  assert.equal(formatDatum(parseISODate('2027-01-04'), 'lang'), 'Montag, 4. Januar 2027');
});

pruefe('formatDatum wirft bei unbekanntem Stil', () => {
  assert.throws(() => formatDatum(parseISODate('2026-08-31'), 'irgendwas'));
});

console.log('heute');

pruefe('heute liefert ein Datum um 00:00 Uhr', () => {
  const d = heute();
  assert.ok(d instanceof Date);
  assert.equal(d.getHours(), 0);
  assert.equal(d.getMinutes(), 0);
  assert.equal(d.getSeconds(), 0);
  assert.equal(d.getMilliseconds(), 0);
});

console.log('');
console.log(bestanden + ' Prüfungen bestanden, ' + fehlgeschlagen.length + ' fehlgeschlagen.');
if (fehlgeschlagen.length > 0) process.exit(1);
