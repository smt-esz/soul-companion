// Modul "Antrag" (AP-14): Liste und neuer Antrag (#/antrag), Antrag
// bearbeiten (#/antrag/:id) und Übergabe-Modus (#/antrag/:id/uebergabe/:schritt).
//
// Regeln aus AP_ALLGEMEIN und ARCHITEKTUR 3.3/5:
// - Kein Wortlaut im Code. Titel, Fragen, Kriterien und Aussagen stehen in
//   content/antrag.json und kommen über den Snapshot des Antrags. Hier stehen
//   nur Beschriftungen der Bedienung.
// - Die Zustandsmaschine liegt in antrag/engine.js, die Felder in
//   antrag/felder.js, die Zeichenfläche in antrag/signature.js. Dieses Modul
//   setzt zusammen, speichert und wechselt die Seite.
// - Gespeichert wird bei jeder Eingabe, entprellt um 300 ms (AP-14). Ein
//   Speicherfehler wird deutlich gemeldet, nicht verschluckt.
// - content/antrag.json steht nicht in ctx (ARCHITEKTUR 3.2), deshalb lädt
//   das Modul sie über data.loadAntrag() (ARCHITEKTUR 3.7). data.js hält das
//   Ergebnis im Speicher, es wird also höchstens einmal geladen.

import { registerModule } from '../module.js';
import * as data from '../data.js';
import { formatDatum, parseISODate, toISODate } from '../dates.js';
import * as update from '../update.js';
import { el, etikett, hinweis, karte, knopf, leer, leerZustand } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { hakenAnimation } from '../ui/motion.js';
import * as engine from '../antrag/engine.js';
import { schrittFelder, schrittVorschau } from '../antrag/felder.js';
import { dateiname, erzeugeAntragPdf } from '../antrag/pdf.js';
import { teilePdf } from '../antrag/share.js';
import { APP_VERSION } from '../version.js';

registerModule({
  id: 'antrag',
  titel: 'Antrag',
  icon: 'antrag',
  nav: { position: 50, sichtbar: true },
  routes: [
    { pattern: '#/antrag', render: renderListe },
    { pattern: '#/antrag/:id', render: renderAntrag },
    { pattern: '#/antrag/:id/uebergabe/:schritt', render: renderUebergabe }
  ]
});

const ENTPRELLUNG = 300;

// Der laufende Antrag als Arbeitskopie. Die Engine arbeitet ohne Seiteneffekt,
// deshalb hält das Modul den jeweils neuesten Stand und schreibt ihn entprellt
// in den Speicher.
let arbeitsKopie = null;
let speicherTimer = null;
let meldeBereich = null;

// Übergabe-Modus: gesperrt wird beim Betreten, freigegeben beim Verlassen
// (ARCHITEKTUR 5). Das Verlassen erkennt der Hashwechsel, damit auch ein
// Wechsel in ein anderes Modul die Sperre löst.
let uebergabeLaeuft = false;

// ===================================================== Route #/antrag

async function renderListe(container, params, ctx) {
  const config = await ladeConfig();
  meldeBereich = el('div', { class: 'antrag-meldung' });

  const kinder = [
    el('h1', { text: 'Antrag', tabindex: '-1' }),
    meldeBereich
  ];

  if (!hatStufen(config)) {
    kinder.push(leerZustand({ text: 'Der Antrag ist noch nicht eingerichtet.', motiv: 'zahnrad' }));
    anfuegen(container, kinder);
    return;
  }

  kinder.push(datenschutzHinweis(config));
  kinder.push(offeneAntraege(ctx, config));
  kinder.push(neuerAntragAbschnitt(ctx, config));
  kinder.push(vorlagenAbschnitt(ctx, config));
  anfuegen(container, kinder);
}

/**
 * Leerer Antrag als PDF, zum Ausdrucken oder fuer GoodNotes (AP-15).
 * Gleiche Teilen-Logik wie der fertige Antrag, nur ohne Inhalt.
 */
function vorlagenAbschnitt(ctx, config) {
  const meldung = el('div', { class: 'antrag-vorlage-meldung' });
  const stufen = Object.keys(config.stufen || {}).sort();

  const knoepfe = stufen.map((nummer) => vorlagenKnopf(nummer, config, meldung));

  return el('section', { class: 'antrag-vorlagen' }, [
    el('h2', { text: 'Leerer Antrag' }),
    el('p', {
      text: 'Du kannst den Antrag auch leer als PDF holen, zum Ausdrucken oder zum Ausfüllen mit dem Stift.'
    }),
    el('div', { class: 'antrag-knopfreihe' }, knoepfe),
    meldung
  ]);
}

/**
 * Ein Knopf je Stufe, zwei Schritte: erst erstellen, dann senden. Dieselbe
 * Reihenfolge wie beim fertigen Antrag, weil `navigator.share` eine frische
 * Nutzeraktion braucht (AP-15, share.js).
 */
function vorlagenKnopf(zielstufe, config, meldung) {
  const stufe = config.stufen[zielstufe];
  const beschriftung = 'Leeren Antrag Stufe ' + zielstufe
    + (stufe && stufe.zielname ? ' (' + stufe.zielname + ')' : '') + ' als PDF';
  let bytes = null;

  const taste = knopf({
    text: beschriftung,
    icon: 'antrag',
    art: 'neben',
    onTap: () => (bytes ? senden() : erstellen())
  });

  async function erstellen() {
    taste.disabled = true;
    leer(meldung);
    try {
      bytes = await erzeugeAntragPdf({
        antrag: { zielstufe },
        config,
        jgst: null,
        leer: true,
        appVersion: APP_VERSION
      });
    } catch (fehler) {
      taste.disabled = false;
      meldung.append(hinweis({ art: 'warnung', text: 'Das PDF konnte nicht erstellt werden.' }));
      return;
    }
    taste.disabled = false;
    taste.querySelector('span').textContent = 'Stufe ' + zielstufe + ': senden (Mail, GoodNotes, ...)';
    meldung.append(hinweis({ art: 'erfolg', text: 'PDF ist fertig.' }));
  }

  async function senden() {
    const name = dateiname({ antrag: { zielstufe }, leer: true });
    const ergebnis = await teilePdf(bytes, name, {
      titel: name,
      text: 'Leerer Antrag auf Stufe ' + zielstufe + '.'
    });
    if (ergebnis === 'abgebrochen') return;
    leer(meldung);
    if (ergebnis === 'rueckfall') {
      meldung.append(hinweis({ art: 'info', text: 'Tippe im PDF auf Teilen und wähle Mail.' }));
      return;
    }
    if (ergebnis === 'fehler') {
      meldung.append(hinweis({ art: 'warnung', text: 'Das Senden hat nicht geklappt. Versuche es noch einmal.' }));
    }
  }

  return taste;
}

/**
 * Was passiert und an wen der Antrag geht (DATENSCHUTZ 6, AP-14).
 * Der Satz zum Versand kommt aus der Konfiguration, damit der Wortlaut an
 * einer Stelle steht.
 */
function datenschutzHinweis(config) {
  return el('section', { class: 'antrag-datenschutz' }, [
    el('p', {
      text: 'Du füllst den Antrag hier aus. Für den Team-Check und die Empfehlung gibst du das iPad kurz weiter, '
        + 'die anderen unterschreiben dann auf dem Bildschirm.'
    }),
    el('p', {
      text: 'Am Ende entsteht ein PDF mit deinem Namen, deiner Klasse, deiner Begründung, den Namen und Klassen '
        + 'der beiden Lernenden, dem Kürzel deiner Lernbegleitung und allen Unterschriften.'
    }),
    el('p', { text: String(config.hinweisVersand || '') }),
    el('p', { text: 'Gespeichert wird alles nur auf diesem iPad.' })
  ]);
}

function offeneAntraege(ctx, config) {
  const liste = ctx.store.antraege.list().filter(Boolean);
  if (liste.length === 0) {
    return el('section', {}, [
      el('h2', { text: 'Deine Anträge' }),
      leerZustand({ text: 'Du hast gerade keinen Antrag offen.', motiv: 'gluehbirne' })
    ]);
  }

  return el('section', {}, [
    el('h2', { text: 'Deine Anträge' }),
    el('div', { class: 'antrag-liste' }, liste.map((antrag) => antragKarte(antrag, ctx, config)))
  ]);
}

function antragKarte(antrag, ctx, config) {
  const stufe = engine.stufeVon(config, antrag);
  const stand = engine.fortschritt(antrag, config);
  const teile = [datumText(antrag.erstellt)];
  if (stand.gesamt > 0) {
    teile.push(stand.erledigt >= stand.gesamt
      ? 'Alle Schritte fertig'
      : 'Schritt ' + Math.min(stand.erledigt + 1, stand.gesamt) + ' von ' + stand.gesamt);
  }
  return karte({
    titel: (stufe && stufe.titel) || ('Antrag auf Stufe ' + antrag.zielstufe),
    unter: teile.join(' · '),
    onTap: () => ctx.navigate('#/antrag/' + antrag.id)
  });
}

/** Neuer Antrag: erst die Zielstufe, dann Name und Klasse. */
function neuerAntragAbschnitt(ctx, config) {
  const formularBereich = el('div', { class: 'antrag-neu-formular' });
  const stufen = Object.keys(config.stufen || {}).sort();

  const knoepfe = stufen.map((nummer) => {
    const stufe = config.stufen[nummer];
    const name = stufe && stufe.zielname ? ' (' + stufe.zielname + ')' : '';
    return knopf({
      text: 'Antrag auf Stufe ' + nummer + name,
      icon: 'antrag',
      art: 'haupt',
      onTap: () => zeigeKopfFormular(formularBereich, ctx, config, nummer)
    });
  });

  return el('section', {}, [
    el('h2', { text: 'Neuen Antrag stellen' }),
    el('div', { class: 'antrag-knopfreihe' }, knoepfe),
    formularBereich
  ]);
}

function zeigeKopfFormular(bereich, ctx, config, zielstufe) {
  leer(bereich);
  const stufe = config.stufen[zielstufe];
  const jgst = ctx.jg && ctx.jg.jgst !== undefined ? String(ctx.jg.jgst) : '';
  const klassen = ctx.jg && Array.isArray(ctx.jg.klassen) ? ctx.jg.klassen : [];

  let name = '';
  let klasse = '';

  const nameFeld = el('input', { id: 'antrag-kopf-name', type: 'text', class: 'antrag-eingabe' });
  nameFeld.addEventListener('input', () => {
    name = nameFeld.value;
    pruefe();
  });

  const klassenKnoepfe = klassen.map((buchstabe) => {
    const taste = el('button', {
      type: 'button',
      class: 'antrag-klasse',
      'aria-pressed': 'false',
      text: jgst + buchstabe,
      onclick: () => {
        klasse = buchstabe;
        for (const andere of klassenKnoepfe) {
          andere.setAttribute('aria-pressed', String(andere === taste));
        }
        pruefe();
      }
    });
    return taste;
  });

  const anlegen = knopf({
    text: 'Antrag anlegen',
    art: 'haupt',
    deaktiviert: true,
    onTap: () => antragAnlegen(ctx, config, zielstufe, name, klasse)
  });

  function pruefe() {
    anlegen.disabled = !(String(name).trim() && klasse);
  }

  anfuegen(bereich, [
    el('h3', { text: (stufe && stufe.titel) || ('Antrag auf Stufe ' + zielstufe) }),
    stufe && stufe.unterzeile ? el('p', { text: stufe.unterzeile }) : null,
    el('div', { class: 'antrag-feld' }, [
      el('label', { for: 'antrag-kopf-name', text: 'Dein Name' }),
      nameFeld
    ]),
    el('div', { class: 'antrag-feld' }, [
      el('p', { class: 'antrag-feld-titel', text: 'Deine Klasse' }),
      el('div', { class: 'antrag-klassen', role: 'group', 'aria-label': 'Klasse wählen' }, klassenKnoepfe)
    ]),
    el('p', { class: 'text-klein text-neben', text: 'Das Datum trägt die App selbst ein.' }),
    anlegen
  ]);
  nameFeld.focus();
}

function antragAnlegen(ctx, config, zielstufe, name, klasse) {
  const heuteISO = toISODate(ctx.heute);
  // store vergibt die ID und legt den Eintrag an, die Engine füllt die Form
  // samt Snapshot der Texte (AP-14).
  const angelegt = ctx.store.antraege.create(zielstufe, config.configVersion);
  const voll = engine.neuerAntrag(config, zielstufe, heuteISO, angelegt.id);
  voll.kopf = { name: String(name).trim(), klasse: String(klasse) };
  ctx.store.antraege.update(angelegt.id, voll);
  const ergebnis = ctx.store.save();
  if (!ergebnis.ok) {
    zeigeSpeicherfehler(ergebnis);
    return;
  }
  ctx.navigate('#/antrag/' + angelegt.id);
}

// ===================================================== Route #/antrag/:id

async function renderAntrag(container, params, ctx) {
  const config = await ladeConfig();
  const antrag = ctx.store.antraege.get(params && params.id);
  if (!antrag || !hatStufen(config)) {
    anfuegen(container, [
      el('h1', { text: 'Antrag nicht gefunden', tabindex: '-1' }),
      el('p', { text: 'Diesen Antrag gibt es auf diesem iPad nicht.' }),
      zurueckZeile(ctx.navigate)
    ]);
    return;
  }

  arbeitsKopie = antrag;
  zeichneAntrag(container, ctx, config, null);
}

function zeichneAntrag(container, ctx, config, animiereSchritt) {
  leer(container);
  meldeBereich = el('div', { class: 'antrag-meldung' });

  const antrag = arbeitsKopie;
  const lage = engine.configFuer(antrag, config);
  const stufe = lage.stufe;
  const schritte = engine.schritteVon(stufe).filter((schritt) => schritt.typ !== 'nurPdf');

  const kinder = [
    el('header', { class: 'antrag-kopf' }, [
      el('h1', { text: (stufe && stufe.titel) || ('Antrag auf Stufe ' + antrag.zielstufe), tabindex: '-1' }),
      stufe && stufe.unterzeile ? el('p', { text: stufe.unterzeile }) : null
    ]),
    meldeBereich,
    lage.veraltet ? hinweis({ art: 'info', text: lage.hinweis }) : null,
    kopfKarte(antrag, ctx),
    el('ol', { class: 'antrag-schritte' }, schritte.map(
      (schritt) => schrittKarte(schritt, ctx, config, container)
    )),
    abschlussAbschnitt(antrag, config, ctx, container),
    loeschAbschnitt(antrag, ctx),
    zurueckZeile(ctx.navigate)
  ];

  anfuegen(container, kinder);

  if (animiereSchritt) {
    const marke = container.querySelector('[data-schritt="' + animiereSchritt + '"] .antrag-schritt-haken');
    if (marke) hakenAnimation(marke);
  }
}

/** Name, Klasse und Datum. Name und Klasse bleiben änderbar, Datum nicht. */
function kopfKarte(antrag, ctx) {
  const jgst = ctx.jg && ctx.jg.jgst !== undefined ? String(ctx.jg.jgst) : '';
  const nameFeld = el('input', { id: 'antrag-name', type: 'text', class: 'antrag-eingabe' });
  nameFeld.value = String((antrag.kopf && antrag.kopf.name) || '');
  nameFeld.addEventListener('input', () => {
    arbeitsKopie = Object.assign({}, arbeitsKopie, {
      kopf: Object.assign({}, arbeitsKopie.kopf, { name: nameFeld.value })
    });
    planeSpeichern(ctx);
  });

  return el('section', { class: 'antrag-kopfkarte' }, [
    el('div', { class: 'antrag-feld' }, [
      el('label', { for: 'antrag-name', text: 'Dein Name' }),
      nameFeld
    ]),
    el('dl', {}, [
      el('dt', { text: 'Klasse' }),
      el('dd', { text: jgst + ((antrag.kopf && antrag.kopf.klasse) || '') }),
      el('dt', { text: 'Datum' }),
      el('dd', { text: datumText(antrag.erstellt) })
    ])
  ]);
}

function schrittKarte(schritt, ctx, config, container) {
  const antrag = arbeitsKopie;
  const status = engine.schrittStatus(antrag, config, schritt.id);
  const daten = (antrag.schritte && antrag.schritte[schritt.id]) || {};
  const rolle = rollenName(config, schritt.rolle);

  const kopf = el('div', { class: 'antrag-schritt-kopf' }, [
    el('h2', { class: 'antrag-schritt-titel', text: 'Schritt ' + (schritt.nr || '') + ': ' + (schritt.titel || '') }),
    el('div', { class: 'antrag-schritt-marken' }, [
      status === 'abgeschlossen'
        ? el('span', { class: 'antrag-schritt-haken' }, [icon('haken', { groesse: 24, label: 'abgeschlossen' })])
        : null,
      status === 'abgeschlossen' ? icon('schloss', { groesse: 20, label: 'gesperrt' }) : null,
      etikett(statusWort(status), status)
    ])
  ]);

  const koerper = el('div', { class: 'antrag-schritt-inhalt' });

  if (schritt.hinweis) koerper.append(el('p', { class: 'antrag-schritt-hinweis', text: schritt.hinweis }));
  if (schritt.rolle && schritt.rolle !== 'kind') {
    koerper.append(el('p', { class: 'text-klein text-neben', text: 'Ausfüllen: ' + rolle }));
  }

  if (status === 'abgeschlossen') {
    koerper.append(schrittVorschau({ schritt, daten, antrag }));
    koerper.append(zuruecksetzenKnopf(schritt, ctx, config, container));
  } else if (status === 'gesperrt') {
    koerper.append(hinweis({ art: 'info', text: 'Schließe zuerst die Schritte davor ab.' }));
  } else if (schritt.rolle === 'kind') {
    koerper.append(eigenerSchritt(schritt, daten, ctx, config, container));
  } else {
    koerper.append(el('p', {}, [
      knopf({
        text: 'iPad an ' + rolle + ' geben',
        icon: 'personen',
        art: 'haupt',
        onTap: () => ctx.navigate('#/antrag/' + antrag.id + '/uebergabe/' + schritt.id)
      })
    ]));
  }

  return el('li', {
    class: 'antrag-schritt',
    dataset: { schritt: schritt.id, status }
  }, [kopf, koerper]);
}

/** Schritt, den das Kind selbst ausfüllt: Felder plus Abschluss-Knopf. */
function eigenerSchritt(schritt, daten, ctx, config, container) {
  const fehlerBereich = el('div', { class: 'antrag-fehler' });
  const bereich = el('div', {}, [
    schrittFelder({
      schritt,
      daten,
      antrag: arbeitsKopie,
      heuteISO: toISODate(ctx.heute),
      onAendern: (patch) => {
        arbeitsKopie = engine.aktualisiere(arbeitsKopie, schritt.id, patch, toISODate(ctx.heute));
        planeSpeichern(ctx);
      }
    }),
    fehlerBereich,
    el('p', {}, [
      knopf({
        text: 'Schritt abschließen',
        icon: 'haken',
        art: 'haupt',
        onTap: () => schrittAbschliessen(schritt, ctx, config, container, fehlerBereich)
      })
    ])
  ]);
  return bereich;
}

function schrittAbschliessen(schritt, ctx, config, container, fehlerBereich) {
  sofortSpeichern(ctx);
  const pruefung = engine.pruefeSchritt(arbeitsKopie, config, schritt.id);
  if (!pruefung.ok) {
    zeigeFehler(fehlerBereich, pruefung.fehler);
    return;
  }
  arbeitsKopie = engine.abschliessen(arbeitsKopie, config, schritt.id, toISODate(ctx.heute));
  sofortSpeichern(ctx);
  zeichneAntrag(container, ctx, config, schritt.id);
}

/**
 * Rückfrage vor dem Zurücksetzen (AP-14).
 * Der Satz aus dem AP nennt die Rolle. Für die Schritte des Kindes wird daraus
 * "du", sonst stünde dort "Dann muss Du ...", und der Schritt ohne Unterschrift
 * bekommt einen eigenen Satz.
 */
function ruecksetzSatz(schritt, rolle) {
  const mitUnterschrift = Array.isArray(schritt.felder) && schritt.felder.includes('unterschrift');
  if (!mitUnterschrift) return 'Dann ist dieser Schritt wieder leer.';
  if (schritt.rolle === 'kind') return 'Dann musst du noch einmal unterschreiben.';
  return 'Dann muss ' + rolle + ' noch einmal unterschreiben.';
}

function zuruecksetzenKnopf(schritt, ctx, config, container) {
  const bereich = el('div', { class: 'antrag-ruecksetzen' });
  bereich.append(knopf({
    text: 'Zurücksetzen',
    icon: 'stift',
    art: 'neben',
    onTap: () => {
      leer(bereich);
      bereich.append(
        hinweis({ art: 'warnung', text: ruecksetzSatz(schritt, rollenName(config, schritt.rolle)) }),
        el('div', { class: 'antrag-knopfreihe' }, [
          knopf({
            text: 'Ja, zurücksetzen',
            art: 'haupt',
            onTap: () => {
              arbeitsKopie = engine.zuruecksetzen(arbeitsKopie, schritt.id, toISODate(ctx.heute));
              sofortSpeichern(ctx);
              zeichneAntrag(container, ctx, config, null);
            }
          }),
          knopf({
            text: 'Abbrechen',
            art: 'neben',
            onTap: () => zeichneAntrag(container, ctx, config, null)
          })
        ])
      );
    }
  }));
  return bereich;
}

/**
 * Nach Schritt 4: Hinweis, Empfaenger, PDF erstellen, senden (AP-15).
 *
 * Zwei Knoepfe, nicht einer: `navigator.share` braucht eine frische
 * Nutzeraktion. Das Erzeugen des PDF dauert einen Moment, deshalb entsteht es
 * mit Knopf 1, und Knopf 2 teilt sofort (AP-15, `antrag/share.js`).
 */
function abschlussAbschnitt(antrag, config, ctx, container) {
  if (!engine.bereitFuerPdf(antrag, config)) return null;

  const pdfBereich = el('div', { class: 'antrag-pdf' });
  const sendeBereich = el('div', { class: 'antrag-senden' });
  let bytes = null;
  let name = '';

  const sendeKnopf = knopf({
    text: 'Senden (Mail, GoodNotes, ...)',
    icon: 'teilen',
    art: 'haupt',
    onTap: () => senden()
  });

  const erstelleKnopf = knopf({
    text: 'PDF erstellen',
    icon: 'antrag',
    art: 'haupt',
    onTap: () => erstellen()
  });

  async function erstellen() {
    erstelleKnopf.disabled = true;
    leer(pdfBereich);
    pdfBereich.append(hinweis({ art: 'info', text: 'Dein PDF wird erstellt.' }));
    try {
      bytes = await erzeugeAntragPdf({
        antrag: arbeitsKopie,
        config,
        jgst: jahrgang(ctx),
        leer: false,
        appVersion: APP_VERSION
      });
      name = dateiname({ antrag: arbeitsKopie, jgst: jahrgang(ctx) });
    } catch (fehler) {
      erstelleKnopf.disabled = false;
      leer(pdfBereich);
      pdfBereich.append(hinweis({
        art: 'warnung',
        text: 'Das PDF konnte nicht erstellt werden. Sage es deiner Lernbegleitung.'
      }));
      return;
    }

    arbeitsKopie = Object.assign({}, arbeitsKopie, { pdfErzeugt: toISODate(ctx.heute) });
    sofortSpeichern(ctx);
    erstelleKnopf.disabled = false;

    leer(pdfBereich);
    pdfBereich.append(hinweis({ art: 'erfolg', text: 'PDF ist fertig.' }));
    leer(sendeBereich);
    sendeBereich.append(el('p', {}, [sendeKnopf]));
  }

  async function senden() {
    const ergebnis = await teilePdf(bytes, name, {
      titel: name,
      text: 'Mein Antrag auf Stufe ' + arbeitsKopie.zielstufe + '.'
    });

    if (ergebnis === 'abgebrochen') {
      // Bewusst abgebrochen, das ist kein Fehler (AP-00). Der Knopf bleibt.
      return;
    }
    if (ergebnis === 'rueckfall') {
      leer(pdfBereich);
      pdfBereich.append(hinweis({ art: 'info', text: 'Tippe im PDF auf Teilen und wähle Mail.' }));
      geschafft();
      return;
    }
    if (ergebnis === 'fehler') {
      leer(pdfBereich);
      pdfBereich.append(hinweis({
        art: 'warnung',
        text: 'Das Senden hat nicht geklappt. Versuche es noch einmal oder sage es deiner Lernbegleitung.'
      }));
      return;
    }
    geschafft();
  }

  /** Vermerken, Haken zeigen, Loeschen anbieten (AP-15). */
  function geschafft() {
    arbeitsKopie = Object.assign({}, arbeitsKopie, { geteilt: toISODate(ctx.heute) });
    sofortSpeichern(ctx);

    leer(sendeBereich);
    const marke = el('span', { class: 'antrag-geteilt-haken' }, [icon('haken', { groesse: 32, label: 'verschickt' })]);
    sendeBereich.append(
      el('p', { class: 'antrag-geteilt' }, [marke, el('span', { text: 'Verschickt.' })]),
      loeschFrage()
    );
    hakenAnimation(marke);
  }

  function loeschFrage() {
    const frage = el('div', { class: 'antrag-loeschfrage' });
    frage.append(
      el('p', { text: 'Antrag auf diesem iPad löschen? Du hast ihn verschickt.' }),
      el('div', { class: 'antrag-knopfreihe' }, [
        knopf({
          text: 'Ja, löschen',
          art: 'haupt',
          onTap: () => {
            abbrechenSpeichern();
            ctx.store.antraege.remove(arbeitsKopie.id);
            arbeitsKopie = null;
            ctx.navigate('#/antrag');
          }
        }),
        knopf({
          text: 'Später',
          art: 'neben',
          onTap: () => {
            leer(frage);
            frage.append(el('p', { class: 'text-klein text-neben', text: 'Gut, der Antrag bleibt hier stehen.' }));
          }
        })
      ])
    );
    return frage;
  }

  return el('section', { class: 'antrag-abschluss' }, [
    el('h2', { text: 'Fertig ausgefüllt' }),
    el('p', {
      text: 'Dein Antrag geht an deine Klassenleitung. Er enthält deinen Namen, deine Begründung, '
        + 'die Namen und Unterschriften aus dem Team-Check und die Empfehlung deiner Lernbegleitung.'
    }),
    el('p', { text: String((config && config.hinweisVersand) || '') }),
    empfaengerAbschnitt(antrag, config, ctx),
    el('p', {}, [erstelleKnopf]),
    pdfBereich,
    sendeBereich
  ]);
}

/** Adresse der Klassenleitung gross, mit Knopf zum Kopieren (AP-15). */
function empfaengerAbschnitt(antrag, config, ctx) {
  const jgst = jahrgang(ctx);
  const klasse = String((antrag.kopf && antrag.kopf.klasse) || '');
  const nachJahrgang = (config && config.empfaenger && config.empfaenger[String(jgst)]) || {};
  const adresse = String(nachJahrgang[klasse] || '').trim();

  if (!adresse) {
    return el('div', { class: 'antrag-empfaenger' }, [
      el('p', { class: 'antrag-empfaenger-titel', text: 'Empfänger' }),
      hinweis({ art: 'info', text: 'Frag deine Klassenleitung nach ihrer Mail-Adresse.' })
    ]);
  }

  const rueckmeldung = el('p', { class: 'text-klein text-neben', role: 'status' });
  return el('div', { class: 'antrag-empfaenger' }, [
    el('p', { class: 'antrag-empfaenger-titel', text: 'Empfänger' }),
    // Markierbar, damit auch ohne Zwischenablage kopiert werden kann.
    el('p', { class: 'antrag-adresse', text: adresse }),
    knopf({
      text: 'Adresse kopieren',
      icon: 'teilen',
      art: 'neben',
      onTap: async () => {
        leer(rueckmeldung);
        try {
          await navigator.clipboard.writeText(adresse);
          rueckmeldung.textContent = 'Kopiert.';
        } catch (fehler) {
          rueckmeldung.textContent = 'Das Kopieren geht hier nicht. Markiere die Adresse von Hand.';
        }
      }
    }),
    rueckmeldung
  ]);
}

function jahrgang(ctx) {
  return ctx && ctx.jg && ctx.jg.jgst !== undefined ? ctx.jg.jgst : null;
}

function loeschAbschnitt(antrag, ctx) {
  const bereich = el('div');
  return el('section', { class: 'antrag-loeschen' }, [
    el('p', {}, [
      knopf({
        text: 'Antrag löschen',
        icon: 'schliessen',
        art: 'text',
        onTap: () => {
          leer(bereich);
          bereich.append(
            hinweis({ art: 'warnung', text: 'Der Antrag ist dann weg, auch die Unterschriften.' }),
            el('div', { class: 'antrag-knopfreihe' }, [
              knopf({
                text: 'Ja, löschen',
                art: 'haupt',
                onTap: () => {
                  abbrechenSpeichern();
                  ctx.store.antraege.remove(antrag.id);
                  arbeitsKopie = null;
                  ctx.navigate('#/antrag');
                }
              }),
              knopf({ text: 'Abbrechen', art: 'neben', onTap: () => leer(bereich) })
            ])
          );
        }
      })
    ]),
    bereich
  ]);
}

// ============================================ Route #/antrag/:id/uebergabe/:schritt

async function renderUebergabe(container, params, ctx) {
  const config = await ladeConfig();
  const antrag = ctx.store.antraege.get(params && params.id);
  const stufe = engine.stufeVon(config, antrag);
  const schritt = engine.schrittDefinition(stufe, params && params.schritt);

  if (!antrag || !schritt || !engine.kannBearbeiten(antrag, config, schritt.id)) {
    anfuegen(container, [
      el('h1', { text: 'Dieser Schritt ist gerade nicht dran', tabindex: '-1' }),
      el('p', { text: 'Gehe zurück zum Antrag.' }),
      zurueckZeile(ctx.navigate, antrag ? '#/antrag/' + antrag.id : '#/antrag')
    ]);
    return;
  }

  arbeitsKopie = antrag;
  uebergabeStarten();
  zeichneUebergabe(container, ctx, config, schritt, 0);
}

function zeichneUebergabe(container, ctx, config, schritt, personIndex) {
  leer(container);
  meldeBereich = el('div', { class: 'antrag-meldung' });

  const antrag = arbeitsKopie;
  const stufe = engine.stufeVon(config, antrag);
  const rolle = rollenName(config, schritt.rolle);
  const mehrere = schritt.typ === 'personen' && Number(schritt.anzahl) > 1;
  const letzte = !mehrere || personIndex >= Number(schritt.anzahl) - 1;

  const fehlerBereich = el('div', { class: 'antrag-fehler' });
  const fertig = knopf({
    text: 'Fertig, iPad zurückgeben',
    icon: 'haken',
    art: 'haupt',
    deaktiviert: true,
    onTap: () => uebergabeAbschliessen(ctx, config, schritt, fehlerBereich)
  });
  const weiter = knopf({
    text: 'Weiter zu Person ' + (personIndex + 2),
    icon: 'pfeil-rechts',
    art: 'haupt',
    deaktiviert: true,
    onTap: () => {
      sofortSpeichern(ctx);
      zeichneUebergabe(container, ctx, config, schritt, personIndex + 1);
    }
  });

  const pruefeStand = () => {
    const alles = engine.pruefeSchritt(arbeitsKopie, config, schritt.id).ok;
    fertig.disabled = !alles;
    weiter.disabled = !personVollstaendig(arbeitsKopie, schritt, personIndex);
  };

  const felder = schrittFelder({
    schritt,
    daten: (antrag.schritte && antrag.schritte[schritt.id]) || {},
    antrag,
    heuteISO: toISODate(ctx.heute),
    person: mehrere ? personIndex : null,
    onAendern: (patch) => {
      arbeitsKopie = engine.aktualisiere(arbeitsKopie, schritt.id, patch, toISODate(ctx.heute));
      planeSpeichern(ctx);
      pruefeStand();
    }
  });
  pruefeStand();

  const seite = el('div', { class: 'uebergabe' }, [
    el('div', { class: 'uebergabe-inhalt' }, [
      el('h1', { class: 'uebergabe-titel', text: 'Jetzt ist ' + rolle + ' dran', tabindex: '-1' }),
      el('p', { class: 'uebergabe-wer text-klein text-neben', text: kindZeile(antrag, stufe, ctx) }),
      meldeBereich,
      el('section', { class: 'uebergabe-schritt' }, [
        el('h2', { text: 'Schritt ' + (schritt.nr || '') + ': ' + (schritt.titel || '') }),
        schritt.hinweis ? el('p', { text: schritt.hinweis }) : null,
        mehrere ? el('p', { class: 'text-klein text-neben', text: 'Person ' + (personIndex + 1) + ' von ' + schritt.anzahl }) : null,
        felder,
        fehlerBereich
      ])
    ]),
    el('div', { class: 'uebergabe-fussleiste' }, [
      letzte ? fertig : weiter,
      knopf({
        text: 'Abbrechen',
        art: 'neben',
        onTap: () => {
          sofortSpeichern(ctx);
          ctx.navigate('#/antrag/' + antrag.id);
        }
      })
    ])
  ]);

  container.append(seite);
}

function uebergabeAbschliessen(ctx, config, schritt, fehlerBereich) {
  sofortSpeichern(ctx);
  const pruefung = engine.pruefeSchritt(arbeitsKopie, config, schritt.id);
  if (!pruefung.ok) {
    zeigeFehler(fehlerBereich, pruefung.fehler);
    return;
  }
  arbeitsKopie = engine.abschliessen(arbeitsKopie, config, schritt.id, toISODate(ctx.heute));
  sofortSpeichern(ctx);
  ctx.navigate('#/antrag/' + arbeitsKopie.id);
}

/** Ist Person n vollständig? Für den Knopf "Weiter zu Person 2". */
function personVollstaendig(antrag, schritt, index) {
  if (schritt.typ !== 'personen') return true;
  const daten = (antrag.schritte && antrag.schritte[schritt.id]) || {};
  const person = (Array.isArray(daten.personen) ? daten.personen : [])[index] || {};
  return Boolean(String(person.name || '').trim())
    && Boolean(String(person.klasse || '').trim())
    && Boolean(person.unterschrift);
}

function kindZeile(antrag, stufe, ctx) {
  const jgst = ctx.jg && ctx.jg.jgst !== undefined ? String(ctx.jg.jgst) : '';
  const name = (antrag.kopf && antrag.kopf.name) || '';
  const klasse = (antrag.kopf && antrag.kopf.klasse) || '';
  const ziel = (stufe && stufe.zielname) ? 'Stufe ' + antrag.zielstufe + ', ' + stufe.zielname : 'Stufe ' + antrag.zielstufe;
  return [name, klasse ? jgst + klasse : '', ziel].filter(Boolean).join(' · ');
}

function uebergabeStarten() {
  if (uebergabeLaeuft) return;
  uebergabeLaeuft = true;
  // Die Marke am body schaltet die Einblend-Animation des Inhalts ab. Ohne
  // das bliebe ein Transform stehen, an dem das Vollbild kleben würde
  // (components.css, Abschnitt Uebergabe-Modus).
  document.body.dataset.uebergabe = '1';
  update.sperren('antrag');
  window.addEventListener('hashchange', uebergabeBeenden);
}

function uebergabeBeenden() {
  if (!uebergabeLaeuft) return;
  uebergabeLaeuft = false;
  delete document.body.dataset.uebergabe;
  window.removeEventListener('hashchange', uebergabeBeenden);
  update.freigeben('antrag');
}

// ===================================================== Speichern

/**
 * Speichern, entprellt um 300 ms (AP-14). Jede Eingabe schiebt den Zeitpunkt
 * nach hinten, spätestens beim Abschließen eines Schritts wird sofort
 * geschrieben.
 */
function planeSpeichern(ctx) {
  if (speicherTimer) window.clearTimeout(speicherTimer);
  speicherTimer = window.setTimeout(() => {
    speicherTimer = null;
    schreibe(ctx);
  }, ENTPRELLUNG);
}

function sofortSpeichern(ctx) {
  if (speicherTimer) {
    window.clearTimeout(speicherTimer);
    speicherTimer = null;
  }
  schreibe(ctx);
}

function abbrechenSpeichern() {
  if (speicherTimer) {
    window.clearTimeout(speicherTimer);
    speicherTimer = null;
  }
}

function schreibe(ctx) {
  if (!arbeitsKopie) return;
  if (!ctx.store.antraege.get(arbeitsKopie.id)) return;
  ctx.store.antraege.update(arbeitsKopie.id, arbeitsKopie);
  // update() speichert schon. Der zweite Aufruf liefert das Ergebnis, damit
  // ein voller Speicher nicht stillschweigend untergeht (AP-14).
  const ergebnis = ctx.store.save();
  if (!ergebnis.ok) zeigeSpeicherfehler(ergebnis);
}

function zeigeSpeicherfehler(ergebnis) {
  if (!meldeBereich) return;
  leer(meldeBereich);
  meldeBereich.append(hinweis({
    art: 'warnung',
    text: 'Deine Eingabe konnte nicht gespeichert werden. Der Speicher des iPads ist voll. '
      + 'Sage es deiner Lernbegleitung, bevor du weitermachst.'
  }));
}

// ===================================================== Hilfsmittel

let configVersprechen = null;

function ladeConfig() {
  if (!configVersprechen) {
    configVersprechen = data.loadAntrag().catch(() => ({}));
  }
  return configVersprechen;
}

function hatStufen(config) {
  return Boolean(config && config.stufen && Object.keys(config.stufen).length > 0);
}

function anfuegen(container, kinder) {
  container.append(...kinder.filter(Boolean));
}

function zurueckZeile(navigate, ziel = '#/antrag') {
  return el('p', { class: 'antrag-zurueck' }, [
    knopf({ text: 'Zurück', icon: 'pfeil-links', art: 'neben', onTap: () => navigate(ziel) })
  ]);
}

function zeigeFehler(bereich, fehler) {
  leer(bereich);
  if (!Array.isArray(fehler) || fehler.length === 0) return;
  bereich.append(el('ul', { class: 'antrag-fehler-liste', role: 'alert' },
    fehler.map((text) => el('li', { text }))));
}

const STATUS_WORT = {
  offen: 'Offen',
  in_arbeit: 'In Arbeit',
  abgeschlossen: 'Fertig',
  gesperrt: 'Später'
};

function statusWort(status) {
  return STATUS_WORT[status] || '';
}

function rollenName(config, rolle) {
  const rollen = (config && config.rollen) || {};
  return rollen[rolle] || String(rolle || '');
}

function datumText(iso) {
  try {
    return formatDatum(parseISODate(String(iso)), 'datum');
  } catch (fehler) {
    return String(iso || '');
  }
}
