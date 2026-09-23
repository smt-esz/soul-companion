// Unterschriftsfeld (AP-14, ARCHITEKTUR 5).
//
// Eine Zeichenfläche mit Pointer Events, damit Finger und Apple Pencil
// denselben Weg nehmen. Ausgabe als PNG-DataURL, genau 600 x 200, Graustufen,
// Hintergrund durchsichtig.
//
// Zwei Größen, die man auseinanderhalten muss:
// - Zeichengröße 600 x 200. In dieser Einheit wird gezeichnet und gespeichert.
// - Anzeigegröße. Die Fläche darf schmaler sein, CSS skaliert sie. Der
//   Zwischenspeicher der Fläche ist mit devicePixelRatio multipliziert, damit
//   auf dem iPad nichts ausfranst.
//
// `touch-action: none` steht in components.css (.unterschrift-flaeche). Ohne
// das scrollt iPadOS beim Zeichnen die Seite. **[ungeprüft]** auf dem Gerät.

const BREITE = 600;
const HOEHE = 200;

// Graustufen: fast schwarz, damit die Unterschrift im PDF sauber druckt.
const FARBE = '#1A1A1A';

// Strichstärke in Zeichenkoordinaten. Mit Druck (Pencil) wird daraus
// DRUCK_MIN bis DRUCK_MAX, ohne Druck bleibt es bei BASIS.
const BASIS = 2.4;
const DRUCK_MIN = 1.2;
const DRUCK_MAX = 4.2;

export class Unterschrift {
  /**
   * @param {Element} container  Element, in das die Fläche gehängt wird
   * @param {object} [optionen]  { breite, hoehe, onAenderung }
   */
  constructor(container, optionen = {}) {
    this.breite = Number(optionen.breite) || BREITE;
    this.hoehe = Number(optionen.hoehe) || HOEHE;
    this.onAenderung = typeof optionen.onAenderung === 'function' ? optionen.onAenderung : null;

    this.gezeichnet = false;
    this.strich = null;
    this.zeiger = null;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'unterschrift-flaeche';
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Feld zum Unterschreiben');

    this.verhaeltnis = geraeteVerhaeltnis();
    this.canvas.width = Math.round(this.breite * this.verhaeltnis);
    this.canvas.height = Math.round(this.hoehe * this.verhaeltnis);
    // Anzeigegröße als Seitenverhältnis, die Breite macht CSS.
    this.canvas.style.aspectRatio = this.breite + ' / ' + this.hoehe;

    this.ctx = this.canvas.getContext('2d');
    if (this.ctx) {
      this.ctx.scale(this.verhaeltnis, this.verhaeltnis);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = FARBE;
    }

    this.aufZeigerAb = (ereignis) => this.beginne(ereignis);
    this.aufZeigerBewegt = (ereignis) => this.ziehe(ereignis);
    this.aufZeigerAuf = (ereignis) => this.beende(ereignis);

    this.canvas.addEventListener('pointerdown', this.aufZeigerAb);
    this.canvas.addEventListener('pointermove', this.aufZeigerBewegt);
    this.canvas.addEventListener('pointerup', this.aufZeigerAuf);
    this.canvas.addEventListener('pointercancel', this.aufZeigerAuf);
    this.canvas.addEventListener('pointerleave', this.aufZeigerAuf);

    if (container) container.append(this.canvas);
  }

  /** true, solange nichts gezeichnet wurde. */
  leer() {
    return !this.gezeichnet;
  }

  /** Löscht die Fläche. */
  loeschen() {
    if (this.ctx) this.ctx.clearRect(0, 0, this.breite, this.hoehe);
    this.gezeichnet = false;
    this.strich = null;
    return this;
  }

  /**
   * PNG-DataURL, genau 600 x 200, durchsichtiger Hintergrund.
   * @returns {string|null} null, solange nichts gezeichnet wurde
   */
  alsPng() {
    if (!this.gezeichnet) return null;
    // Die Fläche selbst ist für Retina größer. Für die Ausgabe wird sie einmal
    // auf die vereinbarten 600 x 200 heruntergezeichnet (AP-14).
    if (this.canvas.width === this.breite && this.canvas.height === this.hoehe) {
      return this.canvas.toDataURL('image/png');
    }
    const ziel = document.createElement('canvas');
    ziel.width = this.breite;
    ziel.height = this.hoehe;
    const ctx = ziel.getContext('2d');
    if (!ctx) return this.canvas.toDataURL('image/png');
    ctx.drawImage(this.canvas, 0, 0, this.breite, this.hoehe);
    return ziel.toDataURL('image/png');
  }

  /** Nimmt alle Zuhörer zurück. */
  zerstoeren() {
    this.canvas.removeEventListener('pointerdown', this.aufZeigerAb);
    this.canvas.removeEventListener('pointermove', this.aufZeigerBewegt);
    this.canvas.removeEventListener('pointerup', this.aufZeigerAuf);
    this.canvas.removeEventListener('pointercancel', this.aufZeigerAuf);
    this.canvas.removeEventListener('pointerleave', this.aufZeigerAuf);
    return this;
  }

  // ----------------------------------------------------------- Zeichnen

  beginne(ereignis) {
    if (!this.ctx) return;
    if (ereignis.button !== undefined && ereignis.button > 0) return;
    ereignis.preventDefault();
    this.zeiger = ereignis.pointerId;
    try {
      this.canvas.setPointerCapture(ereignis.pointerId);
    } catch (fehler) {
      // Ohne Capture geht es auch, nur weniger zuverlässig am Rand.
    }
    const punkt = this.punktVon(ereignis);
    this.strich = { letzter: punkt, mitte: punkt };
    // Ein einzelner Tipp ist auch ein Zeichen: gleich einen Punkt setzen.
    this.ctx.beginPath();
    this.ctx.lineWidth = this.staerke(ereignis);
    this.ctx.moveTo(punkt.x, punkt.y);
    this.ctx.lineTo(punkt.x + 0.01, punkt.y);
    this.ctx.stroke();
    this.gezeichnet = true;
  }

  ziehe(ereignis) {
    if (!this.ctx || !this.strich) return;
    if (this.zeiger !== null && ereignis.pointerId !== this.zeiger) return;
    ereignis.preventDefault();

    // Geglättet über quadratische Kurven durch die Mittelpunkte: der Strich
    // bekommt keine Ecken, auch wenn die Ereignisse grob kommen.
    for (const punkt of this.punkteVon(ereignis)) {
      const mitte = { x: (this.strich.letzter.x + punkt.x) / 2, y: (this.strich.letzter.y + punkt.y) / 2 };
      this.ctx.beginPath();
      this.ctx.lineWidth = this.staerke(ereignis);
      this.ctx.moveTo(this.strich.mitte.x, this.strich.mitte.y);
      this.ctx.quadraticCurveTo(this.strich.letzter.x, this.strich.letzter.y, mitte.x, mitte.y);
      this.ctx.stroke();
      this.strich.letzter = punkt;
      this.strich.mitte = mitte;
    }
    this.gezeichnet = true;
  }

  beende(ereignis) {
    if (!this.strich) return;
    if (this.zeiger !== null && ereignis && ereignis.pointerId !== this.zeiger) return;
    this.strich = null;
    this.zeiger = null;
    if (this.onAenderung) this.onAenderung(this);
  }

  // Punkte eines Ereignisses. Safari und Chrome liefern über
  // getCoalescedEvents die Zwischenschritte, das macht schnelle Striche rund.
  punkteVon(ereignis) {
    if (typeof ereignis.getCoalescedEvents === 'function') {
      try {
        const liste = ereignis.getCoalescedEvents();
        if (liste && liste.length > 0) return liste.map((einzeln) => this.punktVon(einzeln));
      } catch (fehler) {
        // Dann eben nur das Ereignis selbst.
      }
    }
    return [this.punktVon(ereignis)];
  }

  // Bildschirmkoordinaten in Zeichenkoordinaten (600 x 200) umrechnen.
  punktVon(ereignis) {
    const kasten = this.canvas.getBoundingClientRect();
    const breite = kasten.width || this.breite;
    const hoehe = kasten.height || this.hoehe;
    return {
      x: (ereignis.clientX - kasten.left) * (this.breite / breite),
      y: (ereignis.clientY - kasten.top) * (this.hoehe / hoehe)
    };
  }

  // Der Pencil meldet einen echten Druck. Maus und Finger melden oft 0 oder
  // genau 0.5, dann bleibt die Stärke fest (AP-14).
  staerke(ereignis) {
    const druck = Number(ereignis && ereignis.pressure);
    if (!Number.isFinite(druck) || druck <= 0 || druck === 0.5) return BASIS;
    return DRUCK_MIN + (DRUCK_MAX - DRUCK_MIN) * Math.min(druck, 1);
  }
}

function geraeteVerhaeltnis() {
  const wert = typeof window !== 'undefined' ? Number(window.devicePixelRatio) : 1;
  if (!Number.isFinite(wert) || wert <= 0) return 1;
  // Mehr als 3 bringt nichts und kostet Speicher.
  return Math.min(wert, 3);
}

export default Unterschrift;
