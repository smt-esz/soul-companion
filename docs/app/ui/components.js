// Bausteine für die Oberfläche.
// In AP-01 nur el() und leer(). Die Komponenten aus DESIGN 7 kommen in AP-04.

/**
 * Erzeugt ein Element.
 *
 *   el('p', { text: 'Hallo' })
 *   el('button', { type: 'button', class: 'knopf', onclick: fn }, [kind])
 *
 * Regeln (CSP, siehe ARCHITEKTUR 3.1):
 * - Daten kommen immer als textContent in die Seite, nie als innerHTML.
 * - style wird nur als Objekt angenommen und über element.style gesetzt,
 *   nie als style="..."-Zeichenkette.
 *
 * Werte null, undefined und false lassen das Attribut weg.
 * true setzt es als leeres Attribut (z. B. hidden: true).
 */
export function el(tag, attribute = {}, kinder = []) {
  const element = document.createElement(tag);
  for (const [schluessel, wert] of Object.entries(attribute || {})) {
    if (wert === null || wert === undefined || wert === false) continue;
    if (schluessel === 'text') {
      element.textContent = String(wert);
      continue;
    }
    if (schluessel === 'class' || schluessel === 'klasse') {
      element.className = String(wert);
      continue;
    }
    if (schluessel === 'style') {
      if (typeof wert !== 'object') {
        throw new Error('style bitte als Objekt angeben, nicht als Text.');
      }
      Object.assign(element.style, wert);
      continue;
    }
    if (schluessel === 'dataset') {
      Object.assign(element.dataset, wert);
      continue;
    }
    if (schluessel.startsWith('on') && typeof wert === 'function') {
      element.addEventListener(schluessel.slice(2), wert);
      continue;
    }
    element.setAttribute(schluessel, wert === true ? '' : String(wert));
  }
  anhaengen(element, kinder);
  return element;
}

/** Leert ein Element. */
export function leer(element) {
  if (!element) return element;
  while (element.firstChild) element.removeChild(element.firstChild);
  return element;
}

function anhaengen(element, kinder) {
  const liste = Array.isArray(kinder) ? kinder : [kinder];
  for (const kind of liste) {
    if (kind === null || kind === undefined || kind === false) continue;
    if (Array.isArray(kind)) {
      anhaengen(element, kind);
      continue;
    }
    element.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  }
}
