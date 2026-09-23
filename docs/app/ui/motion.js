// Bewegung (Planung/DESIGN.md, Abschnitt 9).
//
// Regeln: 150 ms für Zustände, 250 ms für Seitenwechsel und Einblenden,
// höchstens 300 ms. Nichts blinkt, nichts läuft endlos. Bei
// prefers-reduced-motion bleibt nur der Farbwechsel.
//
// Die Bewegung selbst steht in CSS (components.css und tones.css). Hier
// werden nur Klassen gesetzt und der Sonderfall "Strichanimation" vorbereitet,
// weil dafür die Länge des Pfades gebraucht wird.

/** true, wenn das Gerät auf "Bewegung reduzieren" steht. */
export function reduziert() {
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Rückmeldung beim Abschluss: der Haken zeichnet sich in 250 ms, dazu der
 * Effekt der Tonlage (DESIGN 4 und 9). Keine Punkte, keine Konfetti.
 *
 * @param {Element} element  ein Icon 'haken' aus ui/icons.js oder ein
 *                           Element, das einen solchen Pfad enthält
 * @returns {Promise<void>}  erfüllt, wenn die Bewegung vorbei ist
 */
export function hakenAnimation(element) {
  if (!element) return Promise.resolve();

  const pfad = element.tagName && element.tagName.toLowerCase() === 'path'
    ? element
    : element.querySelector('path');

  if (pfad) {
    pfad.classList.add('haken-zeichnung');
    // getTotalLength gibt es nur in einem gerenderten SVG. Ohne die Länge
    // bleibt der Standardwert aus components.css stehen.
    if (typeof pfad.getTotalLength === 'function') {
      try {
        const laenge = pfad.getTotalLength();
        if (laenge > 0) pfad.style.setProperty('--haken-laenge', String(Math.ceil(laenge)));
      } catch (fehler) {
        // Kein Layout vorhanden, dann eben ohne genaue Länge.
      }
    }
  }

  if (reduziert()) {
    element.classList.add('haken-fertig');
    return Promise.resolve();
  }

  element.classList.add('haken-laeuft');
  return warteAufEnde(element, 300);
}

/**
 * Inhalt blendet ein: Deckkraft und 8 px Versatz, 250 ms, kein Schieben.
 * @param {Element} element
 * @returns {Promise<void>}
 */
export function einblenden(element) {
  if (!element) return Promise.resolve();
  if (reduziert() || typeof element.animate !== 'function') return Promise.resolve();

  const lauf = element.animate(
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'none' }
    ],
    { duration: 250, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'both' }
  );

  return lauf.finished
    ? lauf.finished.then(() => undefined).catch(() => undefined)
    : Promise.resolve();
}

// Wartet auf das Ende der CSS-Animation, spätestens nach der Notbremse.
function warteAufEnde(element, notbremse) {
  return new Promise((fertig) => {
    let erledigt = false;
    const schliessen = () => {
      if (erledigt) return;
      erledigt = true;
      element.removeEventListener('animationend', schliessen);
      element.classList.remove('haken-laeuft');
      element.classList.add('haken-fertig');
      fertig();
    };
    element.addEventListener('animationend', schliessen);
    window.setTimeout(schliessen, notbremse);
  });
}
