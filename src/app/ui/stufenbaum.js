// Baum der drei Stufen (DESIGN 8, AP-13).
//
// Drei Ebenen übereinander: Krone oben, Stamm in der Mitte, Wurzel unten.
// Jede Ebene ist eine Kachel in der Farbe des Namensschilds, darauf das echte
// SOUL-Symbol (assets/stufen/*.svg). Der Baum steht nur auf der Stufen-Seite,
// nie als Schmuck anderswo.
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

// Von oben nach unten: Krone, Stamm, Wurzel. Masse in Einheiten der viewBox
// (280 x 312). Die Bilder sitzen alle auf einer senkrechten Achse (x = 205) und
// greifen ueber die Kachelraender, so dass sie uebereinander einen Baum ergeben.
// Links stehen Name und Stufe.
const KACHEL_X = 0;
const KACHEL_B = 280;
const EBENEN = [
  { index: 2, y: 0, h: 116, bild: 'krone', bx: 156.9, by: 26, bb: 96.3, bh: 92 },
  { index: 1, y: 124, h: 96, bild: 'stamm', bx: 184.4, by: 116, bb: 41.1, bh: 100 },
  { index: 0, y: 228, h: 84, bild: 'wurzel', bx: 157.5, by: 222, bb: 95, bh: 66 }
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
  svg.setAttribute('viewBox', '0 0 280 312');
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

    const form = document.createElementNS(NS, 'rect');
    form.setAttribute('x', String(KACHEL_X));
    form.setAttribute('y', String(ebene.y));
    form.setAttribute('width', String(KACHEL_B - KACHEL_X));
    form.setAttribute('height', String(ebene.h));
    form.setAttribute('rx', '18');
    form.setAttribute('class', 'stufen-form');
    gruppe.append(form);

    const bild = document.createElementNS(NS, 'image');
    bild.setAttribute('href', 'assets/stufen/' + ebene.bild + '.svg');
    bild.setAttribute('x', String(ebene.bx));
    bild.setAttribute('y', String(ebene.by));
    bild.setAttribute('width', String(ebene.bb));
    bild.setAttribute('height', String(ebene.bh));
    bild.setAttribute('class', 'stufen-bild');
    bild.setAttribute('aria-hidden', 'true');
    gruppe.append(bild);

    const nummer = document.createElementNS(NS, 'text');
    nummer.setAttribute('x', '22');
    nummer.setAttribute('y', String(ebene.y + ebene.h / 2 - 12));
    nummer.setAttribute('class', 'stufen-nummer');
    nummer.setAttribute('aria-hidden', 'true');
    nummer.textContent = 'STUFE ' + stufe.id;
    gruppe.append(nummer);

    const schrift = document.createElementNS(NS, 'text');
    schrift.setAttribute('x', '22');
    schrift.setAttribute('y', String(ebene.y + ebene.h / 2 + 14));
    schrift.setAttribute('class', 'stufen-schrift');
    schrift.setAttribute('aria-hidden', 'true');
    schrift.textContent = stufe.name;
    gruppe.append(schrift);

    svg.append(gruppe);
    gruppen.push(gruppe);
  }

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
