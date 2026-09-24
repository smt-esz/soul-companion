// Icons (Planung/DESIGN.md, Abschnitt 6).
//
//   icon('kalender')                        // schmueckend, aria-hidden
//   icon('warnung', { label: 'Warnung' })   // mit Bedeutung, aria-label
//   icon('fach-bio', { groesse: 32, label: 'Biologie' })
//
// Eigene Icons: 24 x 24, Strich 2, runde Enden, currentColor, nichts gefuellt.
// Fachsymbole: 96 x 96, gefuellte Flaechen, ebenfalls currentColor.
// Alle Icons liegen als Daten hier, damit kein Modul SVG schreibt.

const NS = 'http://www.w3.org/2000/svg';

// Kurzschreibweisen fuer die Formen.
const pfad = (d) => ({ art: 'path', d });
const strecke = (x1, y1, x2, y2) => ({ art: 'line', x1, y1, x2, y2 });
const kreis = (cx, cy, r) => ({ art: 'circle', cx, cy, r });
const rechteck = (x, y, breite, hoehe, rundung = 2) => ({ art: 'rect', x, y, breite, hoehe, rundung });
// Ein Punkt: sehr kurze Strecke, die durch die runde Kappe rund wird.
const punkt = (x, y) => strecke(x, y, x, y + 0.01);

// Zahnradzaehne: acht Striche nach aussen, angelehnt an das SOUL-Logo.
function zahnradZaehne() {
  const striche = [];
  for (let n = 0; n < 8; n++) {
    const winkel = (n * Math.PI) / 4;
    const cos = Math.cos(winkel);
    const sin = Math.sin(winkel);
    const rund = (wert) => Math.round(wert * 100) / 100;
    striche.push(strecke(
      rund(12 + 5.5 * cos), rund(12 + 5.5 * sin),
      rund(12 + 8.3 * cos), rund(12 + 8.3 * sin)
    ));
  }
  return striche;
}

// Fuenfzackiger Stern, Mittelpunkt 12/12.4, aussen 9, innen 3.9.
const STERN = 'M12 3.4 14.29 9.24 20.56 9.62 15.71 13.61 17.29 19.68 12 16.3 '
  + '6.71 19.68 8.29 13.61 3.44 9.62 9.71 9.24Z';

const ICONS = {
  kalender: [rechteck(3, 5, 18, 16, 3), strecke(8, 3, 8, 7), strecke(16, 3, 16, 7), strecke(3, 10, 21, 10)],

  plan: [rechteck(3, 4, 18, 16, 2), strecke(3, 9.5, 21, 9.5), strecke(9, 9.5, 9, 20), strecke(15, 9.5, 15, 20)],

  // Faecher als vier Faecher (Ablagen).
  faecher: [rechteck(3, 3, 8, 8, 2), rechteck(13, 3, 8, 8, 2), rechteck(3, 13, 8, 8, 2), rechteck(13, 13, 8, 8, 2)],

  // Aufstieg als Treppe.
  stufen: [pfad('M3 20.5h4.5v-5.5h5.5v-5.5h5.5v-5.5h2.5')],

  antrag: [
    pfad('M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z'),
    pfad('M14 3v5h5'),
    strecke(9, 13, 15, 13),
    strecke(9, 17, 13, 17)
  ],

  wissen: [
    pfad('M12 7.5C10 5.5 7 5 4 5v13c3 0 6 .5 8 2.5'),
    pfad('M12 7.5C14 5.5 17 5 20 5v13c-3 0-6 .5-8 2.5')
  ],

  suche: [kreis(11, 11, 7), strecke(16, 16, 21, 21)],

  einstellungen: [
    strecke(3, 7, 13, 7), strecke(17, 7, 21, 7),
    strecke(3, 12, 7, 12), strecke(11, 12, 21, 12),
    strecke(3, 17, 11, 17), strecke(15, 17, 21, 17),
    kreis(15, 7, 2), kreis(9, 12, 2), kreis(13, 17, 2)
  ],

  // Zahnrad und Gluehbirne: Formsprache des SOUL-Logos, neu gezeichnet
  // (DESIGN 1, AP-04: nicht aus dem Logo ausgeschnitten).
  zahnrad: [kreis(12, 12, 5.5), kreis(12, 12, 2.2), ...zahnradZaehne()],

  gluehbirne: [
    pfad('M12 4.5a5 5 0 0 0-3 9c.6.5.9 1.1.9 1.8v.2h4.2v-.2c0-.7.3-1.3.9-1.8a5 5 0 0 0-3-9z'),
    strecke(10, 17.6, 14, 17.6),
    strecke(10.8, 20.2, 13.2, 20.2),
    strecke(2.8, 11.5, 4.8, 11.5),
    strecke(19.2, 11.5, 21.2, 11.5),
    strecke(4.8, 4.8, 6.2, 6.2),
    strecke(19.2, 4.8, 17.8, 6.2)
  ],

  haken: [pfad('M5 12.5l4.5 4.5L19 7')],

  'pfeil-rechts': [strecke(4, 12, 19, 12), pfad('M13 6l6 6-6 6')],

  'pfeil-links': [strecke(20, 12, 5, 12), pfad('M11 6l-6 6 6 6')],

  schliessen: [strecke(6, 6, 18, 18), strecke(18, 6, 6, 18)],

  info: [kreis(12, 12, 9), strecke(12, 11, 12, 16.5), punkt(12, 7.5)],

  warnung: [pfad('M12 4.2 21 19.8H3z'), strecke(12, 10, 12, 14.5), punkt(12, 17.4)],

  // Wolke mit Strich: keine Verbindung.
  offline: [
    pfad('M6.5 18.5h10a4 4 0 0 0 .5-8 6 6 0 0 0-11-1.6A3.9 3.9 0 0 0 6.5 18.5z'),
    strecke(3.5, 3.5, 20.5, 20.5)
  ],

  update: [pfad('M20 12a8 8 0 1 1-2.3-5.6'), pfad('M20 3.5V9h-5.5')],

  teilen: [
    strecke(12, 3.5, 12, 14.5),
    pfad('M7.8 7.7 12 3.5l4.2 4.2'),
    pfad('M5 12.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.5')
  ],

  kopieren: [
    rechteck(9, 9, 11, 11, 2),
    pfad('M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5')
  ],

  stift: [
    pfad('M4 20l1-4.2L16.3 4.5a2.12 2.12 0 0 1 3 3L8.2 19 4 20z'),
    strecke(14.5, 6.4, 17.6, 9.5)
  ],

  fragezeichen: [
    kreis(12, 12, 9),
    pfad('M9.3 9.3a2.8 2.8 0 0 1 5.5.9c0 1.9-2.8 2.3-2.8 4'),
    punkt(12, 17.4)
  ],

  // Wurzel, Stamm, Krone: die drei Stufen aus DESIGN 8, einfache Formen.
  // Die Bodenlinie liegt ganz oben, alles darunter ist Wurzel.
  wurzel: [
    strecke(3.5, 5.5, 20.5, 5.5),
    strecke(12, 5.5, 12, 20.5),
    pfad('M12 9.5c0 2.4-1.9 3.3-2.9 5.1s-1.1 2.9-1.1 4.4'),
    pfad('M12 9.5c0 2.4 1.9 3.3 2.9 5.1s1.1 2.9 1.1 4.4'),
    pfad('M12 15.5c0 1.6-1.1 2.2-1.7 3.2'),
    pfad('M12 15.5c0 1.6 1.1 2.2 1.7 3.2')
  ],

  stamm: [
    strecke(3.5, 21, 20.5, 21),
    strecke(12, 21, 12, 4.5),
    strecke(12, 12.5, 7.8, 8.3),
    strecke(12, 9.5, 16.2, 5.3)
  ],

  krone: [
    kreis(12, 8.5, 6),
    strecke(12, 14.5, 12, 21),
    strecke(5, 21, 19, 21)
  ],

  uhr: [kreis(12, 12, 9), pfad('M12 6.8V12l3.6 2.2')],

  stern: { fuellung: true, formen: [pfad(STERN)] },

  'stern-leer': [pfad(STERN)],

  person: [kreis(12, 8, 4), pfad('M4.5 20.5a7.5 7.5 0 0 1 15 0')],

  personen: [
    kreis(9.5, 8.5, 3.5),
    pfad('M3 20.5a6.5 6.5 0 0 1 13 0'),
    pfad('M16 5.4a3.5 3.5 0 0 1 0 6.2'),
    pfad('M17.6 14.6a6.5 6.5 0 0 1 3.4 5.9')
  ],

  schloss: [
    rechteck(4, 10.5, 16, 10, 2),
    pfad('M8 10.5V7a4 4 0 0 1 8 0v3.5'),
    strecke(12, 14.5, 12, 17)
  ]
};

// --------------------------------------------------------------- Fachsymbole
//
// Mathematik, Deutsch, Biologie und Geografie stammen aus der
// Raumbeschilderung. Die Pfade sind unveraendert uebernommen, nur <style>
// und die festen Fuellfarben sind weg, gefuellt wird mit currentColor.
// Quelle: SOUL Fachräume.pptx, vermutlich Microsoft-Office-Symbol,
// Nutzungsrecht [ungeprüft]  (DESIGN 2.2, offener Punkt).
//
// Englisch liegt im pptx nur als PNG vor. Das Symbol hier ist nach demselben
// Motiv (Union-Jack-Skizze) neu gezeichnet: Rechteck, Diagonalkreuz,
// gerades Kreuz, nur Linien in der Strichstaerke der anderen Symbole.

const FACH_ICONS = {
  // Quelle: SOUL Fachräume.pptx, ppt/media/image2.svg (Icons_Mathematics_M),
  // vermutlich Microsoft-Office-Symbol, Nutzungsrecht [ungeprüft]
  'fach-ma': [
    pfad('M12.067 13 12.067 81 82.067 81 82.067 13ZM80.067 46 48.067 46 48.067 15 80.067 15ZM46.067 15 46.067 46 14.067 46 14.067 15ZM14.067 48 46.067 48 46.067 79 14.067 79ZM48.067 79 48.067 48 80.067 48 80.067 79Z'),
    pfad('M29.067 39 31.067 39 31.067 31 39.067 31 39.067 29 31.067 29 31.067 21 29.067 21 29.067 29 21.067 29 21.067 31 29.067 31 29.067 39Z'),
    rechteck(55.067, 29, 18, 2, 0),
    pfad('M37.774 56.707 36.36 55.293 30.067 61.586 23.774 55.293 22.36 56.707 28.653 63 22.36 69.293 23.774 70.707 30.067 64.414 36.36 70.707 37.774 69.293 31.481 63 37.774 56.707Z'),
    rechteck(55.067, 63, 18, 2, 0),
    kreis(64.067, 58, 2),
    kreis(64.067, 70, 2)
  ],

  // Quelle: SOUL Fachräume.pptx, ppt/media/image4.svg (Icons_OpenBook_M),
  // vermutlich Microsoft-Office-Symbol, Nutzungsrecht [ungeprüft]
  'fach-de': [
    rechteck(56, 32, 15, 2, 0),
    rechteck(56, 38, 15, 2, 0),
    rechteck(56, 44, 10, 2, 0),
    pfad('M87 24 81 24 81 19.6C81.0001 19.1729 80.7289 18.7928 80.325 18.654 69.8402 15.154 58.5083 15.1154 48 18.544 37.4918 15.1151 26.1599 15.1533 15.675 18.653 15.2707 18.7919 14.9994 19.1725 15 19.6L15 24 9 24C8.44771 24 8 24.4477 8 25L8 73C8 73.5523 8.44771 74 9 74L41.1 74C41.5195 75.7591 43.0916 77.0002 44.9 77L51.1 77C52.9084 77.0002 54.4805 75.7591 54.9 74L87 74C87.5523 74 88 73.5523 88 73L88 25C88 24.4477 87.5523 24 87 24ZM79 20.32 79 66.22C69.2196 63.256 58.7804 63.256 49 66.22L49 20.32C58.7608 17.2266 69.2392 17.2266 79 20.32ZM17 20.32C26.7608 17.2266 37.2392 17.2266 47 20.32L47 66.22C37.2196 63.256 26.7804 63.256 17 66.22ZM86 72 54 72C53.4477 72 53 72.4477 53 73L53 73.1C53 74.1493 52.1493 75 51.1 75L44.9 75C43.8507 75 43 74.1493 43 73.1L43 73C43 72.4477 42.5523 72 42 72L10 72 10 26 15 26 15 67.6C14.9998 68.1523 15.4474 68.6001 15.9997 68.6003 16.1104 68.6003 16.2203 68.582 16.325 68.546 26.4995 65.1527 37.5005 65.1527 47.675 68.546 47.6915 68.5497 47.7082 68.5524 47.725 68.554 47.7989 68.5757 47.8751 68.5885 47.952 68.592 47.968 68.592 47.984 68.6 48 68.6 48.016 68.6 48.025 68.595 48.037 68.594 48.1131 68.5916 48.1886 68.5802 48.262 68.56 48.278 68.56 48.295 68.554 48.312 68.549L48.325 68.549C58.4995 65.1557 69.5005 65.1557 79.675 68.549 79.7798 68.5836 79.8896 68.6008 80 68.6 80.5523 68.6 81 68.1523 81 67.6L81 26 86 26Z')
  ],

  // Eigene Zeichnung nach dem Motiv des PNG (ppt/media/image5.png):
  // Flagge mit Diagonalkreuz und geradem Kreuz, nur Linien.
  'fach-en': {
    strich: true,
    formen: [
      rechteck(12, 24, 72, 48, 0),
      strecke(12, 24, 84, 72),
      strecke(84, 24, 12, 72),
      strecke(48, 24, 48, 72),
      strecke(12, 48, 84, 48)
    ]
  },

  // Quelle: SOUL Fachräume.pptx, ppt/media/image7.svg (Icons_GMO_M),
  // vermutlich Microsoft-Office-Symbol, Nutzungsrecht [ungeprüft]
  'fach-bio': [
    pfad('M55 59.689 55 48.489C54.9968 47.162 55.5243 45.8889 56.465 44.953L58.707 42.711C59.0997 42.3226 59.1032 41.6895 58.7148 41.2968 58.5261 41.1059 58.2685 40.999 58 41L48.813 41 48.813 34.978C48.8811 31.2142 50.7752 27.7185 53.891 25.606 55.106 25.662 56.619 25.757 58.307 25.757 62.727 25.757 68.242 25.086 72.1 21.22 78.649 14.473 77.062 2.169 77.062 2.169 75.9635 2.04891 74.859 1.99248 73.754 2 69.639 2 62.619 2.72 58.209 7.13 53.709 11.746 53.051 19.267 53.021 23.764 50.4095 25.5067 48.4528 28.0696 47.46 31.048 47.1493 30.5961 46.8135 30.1621 46.454 29.748 46.388 29.669 46.32 29.586 46.254 29.504 46.5 25.823 46.923 19.73 42.854 15.088 39.644 11.428 34.301 10.743 30.754 10.743 29.5496 10.7354 28.3463 10.8173 27.154 10.988 27.154 10.988 25.797 21.503 31.254 26.688 35.384 30.614 39.868 31 43.277 31 43.85 31 44.377 30.991 44.884 30.984L44.922 31.03C45.9798 32.1098 46.6456 33.5127 46.813 35.015L46.813 41 38 41C37.4477 41.0001 37.0001 41.4479 37.0002 42.0002 37.0003 42.2653 37.1056 42.5195 37.293 42.707L39.535 44.949C40.4757 45.8849 41.0032 47.158 41 48.485L41 59.685 23.483 85.167C21.9184 87.4424 22.4946 90.5553 24.77 92.12 25.6027 92.6926 26.5894 92.9994 27.6 93L68.4 93C71.1614 93.0006 73.4005 90.7625 73.401 88.001 73.4012 86.9891 73.0944 86.0009 72.521 85.167ZM59.623 8.544C63.577 4.59 70.174 4 73.754 4 74.292 4 74.778 4.013 75.196 4.032 75.342 7.39 75.145 15.211 70.685 19.807 67.995 22.507 64.062 23.757 58.307 23.757 57.695 23.757 57.107 23.744 56.542 23.724 60.104 19.568 63.012 16.924 65.604 15.487 66.0872 15.2194 66.2621 14.6107 65.9945 14.1275 65.7269 13.6443 65.1182 13.4694 64.635 13.737 61.845 15.283 58.777 18.054 55.073 22.364 55.319 16.06 56.837 11.4 59.623 8.544ZM29.023 12.8C29.513 12.768 30.099 12.742 30.749 12.742 33.506 12.742 38.549 13.218 41.349 16.406 44.349 19.828 44.523 24.251 44.361 27.684 42.3932 24.4823 39.8027 21.7081 36.743 19.526 36.2855 19.2166 35.6638 19.3367 35.3545 19.7942 35.0563 20.2353 35.1558 20.8326 35.581 21.153 38.5029 23.2487 40.9662 25.9189 42.82 29 39.48 28.957 35.957 28.4 32.627 25.239 29.125 21.907 28.911 15.693 29.023 12.8ZM42.823 60.569C42.9385 60.4017 43.0002 60.2032 43 60L43 48.486C43.0001 46.6289 42.2623 44.8479 40.949 43.535L40.431 43.017C40.4271 43.0131 40.4272 43.0067 40.4311 43.0029 40.433 43.0011 40.4354 43 40.438 43L55.562 43C55.5675 43.0001 55.5719 43.0046 55.5719 43.0101 55.5718 43.0127 55.5708 43.0152 55.569 43.017L55.051 43.535C53.7377 44.8479 52.9999 46.6289 53 48.486L53 60C52.9999 60.2025 53.0613 60.4002 53.176 60.567L58.974 69 49 69 49 46 47 46 47 69 37.026 69ZM71.051 89.4C70.5397 90.3905 69.5147 91.0092 68.4 91L27.6 91C25.9431 91.0001 24.5999 89.657 24.5998 88.0002 24.5998 87.3931 24.784 86.8002 25.128 86.3L35.651 71 47 71 47 76C47 76.5523 47.4477 77 48 77 48.5523 77 49 76.5523 49 76L49 71 60.349 71 70.868 86.3C71.5113 87.2153 71.5821 88.4154 71.051 89.4Z')
  ],

  // Quelle: SOUL Fachräume.pptx, ppt/media/image9.svg (Icons_Globe_M),
  // vermutlich Microsoft-Office-Symbol, Nutzungsrecht [ungeprüft]
  'fach-geo': [
    pfad('M58.049 5.755C57.5348 5.55314 56.9544 5.80632 56.7525 6.3205 56.5506 6.83468 56.8038 7.41514 57.318 7.617 76.0863 14.9732 85.3377 36.1512 77.9815 54.9195 70.6253 73.6878 49.4473 82.9392 30.679 75.583 30.1648 75.3811 29.5844 75.6343 29.3825 76.1485 29.1806 76.6627 29.4338 77.2431 29.948 77.445 34.1116 79.0783 38.5289 79.9701 43 80.08L43 87.1 30.5 87.1C28.2909 87.1 26.5 88.8909 26.5 91.1L28.5 91.1C28.5 89.9954 29.3954 89.1 30.5 89.1L57.5 89.1C58.6046 89.1 59.5 89.9954 59.5 91.1L61.5 91.1C61.5 88.8909 59.7091 87.1 57.5 87.1L45 87.1 45 80.062C66.2472 79.5203 83.0324 61.8569 82.4907 40.6097 82.0961 25.1327 72.4655 11.3991 58.049 5.755Z'),
    rechteck(19.5, 92.1, 49, 2, 0),
    pfad('M31.631 71.654C48.2296 78.4849 67.223 70.5666 74.0539 53.968 80.8848 37.3693 72.9665 18.3759 56.3679 11.545 39.7693 4.71416 20.7759 12.6324 13.945 29.231 7.05799 45.6951 14.8218 64.625 31.2859 71.512 31.4007 71.56 31.5157 71.6073 31.631 71.654ZM45.305 41.054 56.165 14.667C61.41 23.677 62.115 35.519 57.994 46.276ZM57.233 48.126C52.588 58.666 43.752 66.581 33.685 69.29L44.544 42.905ZM43.456 40.3 30.767 35.072C35.412 24.532 44.248 16.617 54.315 13.908ZM42.7 42.144 31.835 68.531C26.59 59.521 25.885 47.679 30.006 36.922ZM35.42 70.868C45.571 67.708 54.386 59.574 59.082 48.889L71.8 54.123C65.5368 67.9869 50.0247 75.1268 35.42 70.868ZM72.562 52.274 59.843 47.039C64.03 36.139 63.493 24.162 58.507 14.772 71.8786 22.0272 77.8715 38.0175 72.562 52.274ZM44.039 11.1C46.9293 11.101 49.8045 11.5162 52.577 12.333 42.427 15.494 33.613 23.627 28.918 34.311L16.211 29.082C21.1472 18.1401 32.0352 11.1044 44.039 11.1ZM15.439 30.926 28.158 36.161C23.971 47.056 24.508 59.038 29.494 68.428 16.122 61.1731 10.1287 45.1827 15.438 30.926Z')
  ]
};

/** Alle Namen, die icon() kennt (Reihenfolge wie in DESIGN 6). */
export const ICON_NAMEN = Object.keys(ICONS);
export const FACH_ICON_NAMEN = Object.keys(FACH_ICONS);

/**
 * Baut ein SVG-Element.
 * @param {string} name     Name aus ICON_NAMEN oder FACH_ICON_NAMEN
 * @param {object} [optionen]
 * @param {number} [optionen.groesse]  Kantenlaenge in px, Standard 24
 * @param {string} [optionen.label]    Wenn gesetzt: Icon mit Bedeutung
 *                                     (role="img" und aria-label). Ohne
 *                                     label ist das Icon aria-hidden.
 * @param {string} [optionen.klasse]   zusaetzliche CSS-Klasse
 * @returns {SVGElement}
 */
export function icon(name, optionen = {}) {
  const { groesse = 24, label = null, klasse = null } = optionen;
  const eintrag = ICONS[name] || FACH_ICONS[name];
  if (!eintrag) throw new Error('Icon gibt es nicht: ' + name);

  const istFach = Boolean(FACH_ICONS[name]);
  const daten = Array.isArray(eintrag) ? { formen: eintrag } : eintrag;
  const formen = daten.formen;
  // Fachsymbole sind gefuellt, eigene Icons gestrichelt. daten.strich und
  // daten.fuellung drehen das fuer einzelne Icons um.
  const gefuellt = daten.fuellung === true || (istFach && daten.strich !== true);
  const kasten = istFach ? 96 : 24;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + kasten + ' ' + kasten);
  svg.setAttribute('width', String(groesse));
  svg.setAttribute('height', String(groesse));
  svg.setAttribute('class', klasse ? 'icon ' + klasse : 'icon');

  if (gefuellt) {
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('stroke', 'none');
  } else {
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    // Strich 2, in beiden Kaesten. Im 96er Kasten sind auch die uebernommenen
    // Fachsymbole 2 Einheiten stark (Balken, Rahmen), das passt zusammen.
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
  }

  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
    const titel = document.createElementNS(NS, 'title');
    titel.textContent = label;
    svg.append(titel);
  } else {
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
  }

  for (const form of formen) svg.append(zuElement(form));
  return svg;
}

function zuElement(form) {
  if (form.art === 'path') {
    const el = document.createElementNS(NS, 'path');
    el.setAttribute('d', form.d);
    return el;
  }
  if (form.art === 'line') {
    const el = document.createElementNS(NS, 'line');
    el.setAttribute('x1', String(form.x1));
    el.setAttribute('y1', String(form.y1));
    el.setAttribute('x2', String(form.x2));
    el.setAttribute('y2', String(form.y2));
    return el;
  }
  if (form.art === 'circle') {
    const el = document.createElementNS(NS, 'circle');
    el.setAttribute('cx', String(form.cx));
    el.setAttribute('cy', String(form.cy));
    el.setAttribute('r', String(form.r));
    return el;
  }
  const el = document.createElementNS(NS, 'rect');
  el.setAttribute('x', String(form.x));
  el.setAttribute('y', String(form.y));
  el.setAttribute('width', String(form.breite));
  el.setAttribute('height', String(form.hoehe));
  if (form.rundung) el.setAttribute('rx', String(form.rundung));
  return el;
}
