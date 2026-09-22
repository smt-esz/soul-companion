// Wissensseiten lesen: Kopfdaten und Markdown (AP-02, DATENMODELL 4, REDAKTION 4).
//
// Zwei Sicherheitsregeln aus AP_ALLGEMEIN.md 4 und ARCHITEKTUR 3.1:
//   - Rohes HTML in einer Wissensseite wird verworfen. Die App setzt das
//     erzeugte HTML per innerHTML ein, deshalb darf nur hier Erzeugtes hinein.
//   - Links duerfen nur auf App-Routen zeigen (#/...). Alles andere wird
//     entfernt, der Text bleibt stehen, und der Build warnt.
//
// Der Kopfdaten-Parser versteht nur die Teilmenge aus REDAKTION.md 4:
// Text, Zahl, Liste in eckigen Klammern und das Wort `alle`.

import { Marked } from 'marked';

/**
 * Trennt Kopfdaten und Rumpf.
 * @returns {{ kopf: object|null, rumpf: string, fehler: string|null }}
 */
export function trenneKopfdaten(text) {
  const ohneBom = text.replace(/^﻿/, '');
  const normiert = ohneBom.replace(/\r\n/g, '\n');
  if (!normiert.startsWith('---\n')) {
    return { kopf: null, rumpf: normiert, fehler: 'Kopfdaten fehlen (die Datei muss mit einer Zeile --- beginnen).' };
  }
  const ende = normiert.indexOf('\n---', 3);
  if (ende === -1) {
    return { kopf: null, rumpf: normiert, fehler: 'Kopfdaten sind nicht geschlossen (zweite Zeile --- fehlt).' };
  }
  const kopfText = normiert.slice(4, ende);
  const rumpf = normiert.slice(ende + 4).replace(/^[ \t]*\n/, '');
  const { werte, fehler } = leseKopfdaten(kopfText);
  if (fehler) return { kopf: null, rumpf, fehler };
  return { kopf: werte, rumpf, fehler: null };
}

/** Kleiner YAML-Teilmengen-Parser: nur `schluessel: wert` je Zeile. */
export function leseKopfdaten(kopfText) {
  const werte = {};
  const zeilen = kopfText.split('\n');
  for (let i = 0; i < zeilen.length; i++) {
    const zeile = zeilen[i];
    if (zeile.trim() === '' || zeile.trim().startsWith('#')) continue;
    const treffer = zeile.match(/^([A-Za-zäöüÄÖÜß][\wäöüÄÖÜß-]*)\s*:\s*(.*)$/);
    if (!treffer) {
      return {
        werte,
        fehler: 'Kopfdaten Zeile ' + (i + 2) + ': "' + zeile.trim()
          + '" ist kein Eintrag der Form schluessel: wert.'
      };
    }
    werte[treffer[1]] = leseWert(treffer[2]);
  }
  return { werte, fehler: null };
}

function leseWert(roh) {
  // Kommentar am Zeilenende abschneiden, aber nicht in Anfuehrungszeichen.
  let text = roh.trim();
  if (!text.startsWith('"') && !text.startsWith("'")) {
    const raute = text.indexOf(' #');
    if (raute !== -1) text = text.slice(0, raute).trim();
  }
  if (text === '') return '';
  if (text.startsWith('[') && text.endsWith(']')) {
    return text
      .slice(1, -1)
      .split(',')
      .map((teil) => entferneAnfuehrung(teil.trim()))
      .filter((teil) => teil !== '')
      .map((teil) => (/^-?\d+$/.test(teil) ? Number(teil) : teil));
  }
  const ohneAnfuehrung = entferneAnfuehrung(text);
  if (ohneAnfuehrung !== text) return ohneAnfuehrung;
  if (/^-?\d+$/.test(text)) return Number(text);
  if (text === 'true') return true;
  if (text === 'false') return false;
  return text;
}

function entferneAnfuehrung(text) {
  const doppelt = text.length >= 2 && text.startsWith('"') && text.endsWith('"');
  const einfach = text.length >= 2 && text.startsWith("'") && text.endsWith("'");
  return (doppelt || einfach) ? text.slice(1, -1) : text;
}

/**
 * Markdown zu HTML.
 * @returns {{ html: string, abschnitte: Array, absaetze: string[], warnungen: string[] }}
 */
export function zuHtml(markdown) {
  const warnungen = [];
  const abschnitte = [];
  const absaetze = [];
  const benutzteAnker = new Set();

  const renderer = {
    html(token) {
      const text = String(token.text ?? '').trim();
      if (text !== '') warnungen.push('HTML ist nicht erlaubt und wurde entfernt: ' + kurz(text));
      return '';
    },
    image(token) {
      warnungen.push('Bild ist nicht erlaubt und wurde entfernt: ' + kurz(String(token.href ?? '')));
      return '';
    },
    link(token) {
      const inhalt = this.parser.parseInline(token.tokens ?? []);
      const ziel = String(token.href ?? '');
      if (!ziel.startsWith('#/')) {
        warnungen.push('Link zeigt nicht auf eine Seite der App und wurde entfernt: ' + kurz(ziel));
        return inhalt;
      }
      const titel = token.title ? ' title="' + maskiere(token.title) + '"' : '';
      return '<a href="' + maskiere(ziel) + '"' + titel + '>' + inhalt + '</a>';
    },
    heading(token) {
      const inhalt = this.parser.parseInline(token.tokens ?? []);
      const titel = tokenText(token.tokens ?? []);
      const stufe = Math.min(Math.max(Number(token.depth) || 2, 2), 4);
      if (Number(token.depth) === 1) {
        warnungen.push('Ueberschrift mit einer Raute ist nicht vorgesehen (der Titel steht in den Kopfdaten): ' + kurz(titel));
      }
      const anker = eindeutigerAnker(titel, benutzteAnker);
      abschnitte.push({ titel, anker, stufe });
      return '<h' + stufe + ' id="' + maskiere(anker) + '">' + inhalt + '</h' + stufe + '>\n';
    },
    paragraph(token) {
      const text = tokenText(token.tokens ?? []).trim();
      if (text !== '') absaetze.push(text);
      return '<p>' + this.parser.parseInline(token.tokens ?? []) + '</p>\n';
    }
  };

  const marked = new Marked({ gfm: true, breaks: false }, { renderer });
  const html = marked.parse(markdown).trim();
  return { html, abschnitte, absaetze, warnungen };
}

/**
 * Zerlegt einen Markdown-Rumpf an den Ueberschriften mit zwei Rauten.
 * Fuer glossar.md und faq.md (DATENMODELL 4).
 * @returns {Array<{ titel: string, rumpf: string, zeile: number }>}
 */
export function zerlegeNachUeberschriften(rumpf, startZeile = 1) {
  const zeilen = rumpf.split('\n');
  const teile = [];
  let aktuell = null;
  let inCodeblock = false;
  for (let i = 0; i < zeilen.length; i++) {
    const zeile = zeilen[i];
    if (/^\s*(```|~~~)/.test(zeile)) inCodeblock = !inCodeblock;
    const treffer = inCodeblock ? null : zeile.match(/^##\s+(.+?)\s*$/);
    if (treffer) {
      aktuell = { titel: treffer[1].trim(), zeilenRumpf: [], zeile: startZeile + i };
      teile.push(aktuell);
      continue;
    }
    if (aktuell) aktuell.zeilenRumpf.push(zeile);
  }
  return teile.map((teil) => ({
    titel: teil.titel,
    rumpf: teil.zeilenRumpf.join('\n').trim(),
    zeile: teil.zeile
  }));
}

/** Reiner Text aus Markdown-Token, fuer Titel und Suchindex. */
export function tokenText(tokens) {
  let text = '';
  for (const token of tokens) {
    if (token.type === 'br') {
      text += ' ';
    } else if (token.type === 'image' || token.type === 'html') {
      // Bilder und HTML sind nicht erlaubt und gehoeren nicht in den Suchindex.
      continue;
    } else if (token.tokens && token.tokens.length > 0) {
      text += tokenText(token.tokens);
    } else if (token.text !== undefined) {
      text += String(token.text);
    }
  }
  return text.replace(/\s+/g, ' ');
}

/** Anker aus einem Titel: klein, ohne Umlaute, nur Buchstaben, Zahlen, Bindestrich. */
export function zuAnker(titel) {
  const klein = String(titel).toLowerCase();
  const ersetzt = klein
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  const anker = ersetzt.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return anker === '' ? 'abschnitt' : anker;
}

function eindeutigerAnker(titel, benutzt) {
  const basis = zuAnker(titel);
  let anker = basis;
  let zaehler = 2;
  while (benutzt.has(anker)) {
    anker = basis + '-' + zaehler;
    zaehler++;
  }
  benutzt.add(anker);
  return anker;
}

function maskiere(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function kurz(text) {
  const eine = String(text).replace(/\s+/g, ' ').trim();
  return eine.length > 60 ? eine.slice(0, 57) + '...' : eine;
}
