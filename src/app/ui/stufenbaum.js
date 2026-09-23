// Baum der drei Stufen (DESIGN 8, AP-13).
//
// Drei Ebenen übereinander: Krone oben, Stamm in der Mitte, Wurzel unten im
// Boden. Flach, drei Farbtöne aus Teal und Navy, der Boden ist eine Linie.
// Der Baum steht nur auf der Stufen-Seite, nie als Schmuck anderswo.
//
// Bedienung (AP-13, Akzeptanzkriterium 2):
// - Finger und Maus: tippen auf eine Ebene.
// - Tastatur: jede Ebene ist mit Tab erreichbar, Enter und Leertaste wählen,
//   Pfeil hoch und runter springen zur nächsten Ebene.
// - VoiceOver: jede Ebene ist ein Knopf mit `aria-label` "Stufe 1, Wurzel".
//   `aria-pressed` sagt, welche Ebene gerade offen ist. Die Beschriftung im
//   Bild ist `aria-hidden`, damit der Name nicht doppelt vorgelesen wird.
//
// Die App fragt nie "in welcher Stufe bist du". `aktuelleStufe` bleibt
// deshalb leer, das Feld gibt es nur, falls die Angabe später einmal aus
// einer Quelle kommt (DESIGN 8, AP-13 Akzeptanzkriterium 4).

const NS = 'http://www.w3.org/2000/svg';

// Namen und Reihenfolge stehen in DESIGN 8 und in schule.stufen. Wer
// schule.stufen übergibt, bekommt die Namen von dort.
const STUFEN_STANDARD = [
  { id: 1, name: 'Wurzel', symbol: 'wurzel' },
  { id: 2, name: 'Stamm', symbol: 'stamm' },
  { id: 3, name: 'Krone', symbol: 'krone' }
];

// Von oben nach unten: Krone, Stamm, Wurzel. Die Wurzel liegt unter der
// Bodenlinie (y = 174).
const EBENEN = [
  { index: 2, form: 'M100 10a58 58 0 0 1 48 90H52A58 58 0 0 1 100 10z', schriftY: 62 },
  { index: 1, form: 'M76 106h48v62H76z', schriftY: 142 },
  { index: 0, form: 'M100 174c26 0 46 14 46 30H54c0-16 20-30 46-30z', schriftY: 196 }
];

// Drei Punkte in der Krone. Reiner Schmuck, nur in der Tonlage verspielt
// sichtbar (DESIGN 4: "Baum farbig" bei Jg 5, "keine Motive außer Baum" bei
// Jg 7). Sie liegen in der Krone, damit sie nichts überdecken.
const SCHMUCK = [
  { cx: 78, cy: 44, r: 7 },
  { cx: 122, cy: 44, r: 7 },
  { cx: 100, cy: 30, r: 6 }
];

/**
 * Baum mit Wurzel, Stamm und Krone.
 *
 * @param {object} optionen
 *   stufen         Liste aus schule.stufen (optional, sonst DESIGN 8)
 *   gewaehlt       id der Ebene, deren Inhalt gerade daneben steht
 *   hervorheben    id der Zielstufe, die aufleuchtet ("Was muss ich tun?")
 *   aktuelleStufe  id der Stufe, die als "du bist hier" gilt (die App setzt
 *                  das nicht, siehe Kopf der Datei)
 *   onEbene        Funktion(id), wird beim Tippen und mit der Tastatur gerufen
 *   klein          true macht den Baum schmal (Kopf der Aufstiegsseite)
 *   beschriftung   Text für das ganze Bild, sonst "Baum der drei Stufen"
 * @returns {SVGElement}
 */
export function stufenBaum(optionen = {}) {
  const {
    stufen = STUFEN_STANDARD,
    gewaehlt = null,
    hervorheben = null,
    aktuelleStufe = null,
    onEbene = null,
    klein = false,
    beschriftung = 'Baum der drei Stufen'
  } = optionen;

  const liste = Array.isArray(stufen) && stufen.length === 3 ? stufen : STUFEN_STANDARD;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 220');
  svg.setAttribute('class', klein ? 'stufen-baum stufen-baum--klein' : 'stufen-baum');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', beschriftung);

  const gruppen = [];

  for (const ebene of EBENEN) {
    const stufe = liste[ebene.index] || STUFEN_STANDARD[ebene.index];
    const gruppe = document.createElementNS(NS, 'g');
    gruppe.setAttribute('class', 'stufen-ebene');
    gruppe.setAttribute('data-ebene', String(stufe.id));
    gruppe.setAttribute('aria-label', 'Stufe ' + stufe.id + ', ' + stufe.name);

    if (onEbene) {
      gruppe.setAttribute('role', 'button');
      gruppe.setAttribute('tabindex', '0');
      gruppe.setAttribute('aria-pressed', String(String(gewaehlt) === String(stufe.id)));
    } else {
      // Ohne Auswahl ist der Baum ein Bild, kein Bedienelement.
      gruppe.setAttribute('role', 'img');
    }

    if (String(aktuelleStufe) === String(stufe.id)) gruppe.setAttribute('aria-current', 'true');
    if (String(hervorheben) === String(stufe.id)) gruppe.setAttribute('data-hervorheben', 'true');

    const form = document.createElementNS(NS, 'path');
    form.setAttribute('d', ebene.form);
    form.setAttribute('class', 'stufen-form');
    gruppe.append(form);

    if (ebene.index === 2) {
      for (const punkt of SCHMUCK) {
        const kreis = document.createElementNS(NS, 'circle');
        kreis.setAttribute('cx', String(punkt.cx));
        kreis.setAttribute('cy', String(punkt.cy));
        kreis.setAttribute('r', String(punkt.r));
        kreis.setAttribute('class', 'stufen-schmuck');
        kreis.setAttribute('aria-hidden', 'true');
        gruppe.append(kreis);
      }
    }

    const schrift = document.createElementNS(NS, 'text');
    schrift.setAttribute('x', '100');
    schrift.setAttribute('y', String(ebene.schriftY));
    schrift.setAttribute('text-anchor', 'middle');
    schrift.setAttribute('class', 'stufen-schrift');
    schrift.setAttribute('aria-hidden', 'true');
    schrift.textContent = stufe.name;
    gruppe.append(schrift);

    svg.append(gruppe);
    gruppen.push(gruppe);
  }

  // Der Boden kommt zuletzt, damit die Linie über der Wurzel liegt.
  const boden = document.createElementNS(NS, 'line');
  boden.setAttribute('x1', '20');
  boden.setAttribute('y1', '174');
  boden.setAttribute('x2', '180');
  boden.setAttribute('y2', '174');
  boden.setAttribute('class', 'stufen-boden');
  boden.setAttribute('aria-hidden', 'true');
  svg.append(boden);

  if (onEbene) verdrahte(gruppen, onEbene);
  return svg;
}

/**
 * Setzt `aria-pressed` neu, ohne den Baum neu zu bauen.
 * Der Fokus bleibt so auf der Ebene stehen, die gerade gewählt wurde.
 * @param {SVGElement} svg  Rückgabe von stufenBaum
 * @param {number|string} id
 */
export function markiereEbene(svg, id) {
  if (!svg) return;
  for (const gruppe of svg.querySelectorAll('[data-ebene]')) {
    if (!gruppe.hasAttribute('aria-pressed')) continue;
    gruppe.setAttribute('aria-pressed', String(gruppe.getAttribute('data-ebene') === String(id)));
  }
}

function verdrahte(gruppen, onEbene) {
  gruppen.forEach((gruppe, i) => {
    const id = gruppe.getAttribute('data-ebene');
    gruppe.addEventListener('click', () => onEbene(zahl(id)));
    gruppe.addEventListener('keydown', (ereignis) => {
      if (ereignis.key === 'Enter' || ereignis.key === ' ' || ereignis.key === 'Spacebar') {
        ereignis.preventDefault();
        onEbene(zahl(id));
        return;
      }
      // Die Reihenfolge im Bild ist Krone, Stamm, Wurzel. "Nach unten" heißt
      // deshalb der nächste Eintrag in der Liste.
      const schritt = ereignis.key === 'ArrowDown' || ereignis.key === 'ArrowRight' ? 1
        : ereignis.key === 'ArrowUp' || ereignis.key === 'ArrowLeft' ? -1
          : 0;
      if (schritt === 0) return;
      const ziel = gruppen[i + schritt];
      if (!ziel) return;
      ereignis.preventDefault();
      ziel.focus();
    });
  });
}

function zahl(wert) {
  const n = Number(wert);
  return Number.isFinite(n) ? n : wert;
}

export default stufenBaum;
