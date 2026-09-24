// PDF weitergeben (AP-15, ARCHITEKTUR 5).
//
// Der Weg ist in AP-00 auf dem Geraet nachgemessen worden
// (`berichte/AP-00_ipad-ergebnis.md`):
//   1. `navigator.canShare({ files: [pdf] })` gibt true,
//   2. `navigator.share(...)` oeffnet das Teilen-Fenster,
//   3. nach der Auswahl loest das Versprechen auf.
// Mail, GoodNotes und Teams wurden als Ziele geprueft. **[geprueft am
// 22.09.2026, iPad Air M3, iPadOS 27]**
//
// Zwei Dinge hat AP-00 zusaetzlich festgehalten:
// - Solange das Teilen-Fenster offen ist, haengt das Versprechen. Die
//   Oberflaeche darf in dieser Zeit weder blockieren noch einen Fehler zeigen.
// - Wird das Fenster ohne Auswahl geschlossen, kommt ein Fehler mit
//   `name === 'AbortError'`. Das ist kein Fehler, sondern eine Entscheidung
//   des Kindes und wird still behandelt.
//
// `navigator.share` braucht eine frische Nutzeraktion (**[geprueft, MDN:
// transient activation]**). Deshalb wird das PDF **vorher** erzeugt (Knopf
// "PDF erstellen") und `teilePdf` direkt aus dem Tipp auf "Senden" gerufen.

// Blob-Adresse des zuletzt geoeffneten PDF. Sie bleibt gueltig, bis ein neues
// PDF geoeffnet wird: das Kind soll im neuen Tab in Ruhe auf Teilen tippen
// koennen, ohne dass die Adresse nach einer festen Zeit verschwindet
// (Gegenpruefung AP-15, Punkt 5). Ein PDF liegt bei rund 100 KB, mehr als
// eines haelt die App so nie fest.
let letzteAdresse = null;

/**
 * Gibt das PDF weiter.
 *
 * @param {Uint8Array|ArrayBuffer} bytes
 * @param {string} dateiname
 * @param {object} [text]  { titel, text } fuer das Teilen-Fenster
 * @returns {Promise<'geteilt'|'abgebrochen'|'rueckfall'|'fehler'>}
 */
export async function teilePdf(bytes, dateiname, { titel = '', text = '' } = {}) {
  let datei = null;
  try {
    datei = new File([bytes], dateiname, { type: 'application/pdf' });
  } catch (fehler) {
    // Ohne File-Konstruktor bleibt nur der Rueckfall.
    return rueckfall(bytes);
  }

  if (kannTeilen(datei)) {
    try {
      await navigator.share({ files: [datei], title: titel, text });
      return 'geteilt';
    } catch (fehler) {
      // Teilen-Fenster geschlossen, ohne etwas zu waehlen (AP-00).
      if (fehler && fehler.name === 'AbortError') return 'abgebrochen';
      // Alles andere: Rueckfall laut AP. Nach dem `await` ist die Nutzeraktion
      // aus dem Tipp meist verbraucht, `window.open` wird dann gesperrt und
      // es kommt 'fehler' [ungeprueft auf dem iPad]. Die App bietet dafuer
      // `oeffnePdf` an einem eigenen Knopf an, mit frischem Tipp.
      return rueckfall(bytes);
    }
  }

  return rueckfall(bytes);
}

/** true, wenn das Geraet Dateien teilen kann. */
export function kannTeilen(datei) {
  if (typeof navigator === 'undefined' || !navigator) return false;
  if (typeof navigator.share !== 'function') return false;
  if (typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files: [datei] }) === true;
  } catch (fehler) {
    return false;
  }
}

/**
 * Rueckfall nach AP-00: PDF als Blob-URL in einem neuen Fenster oeffnen.
 * Auf dem Testgeraet hat `window.open()` ein Fensterobjekt geliefert, kein
 * Popup-Blocker **[geprueft am 22.09.2026]**. Von dort fuehrt der Weg ueber
 * das Teilen-Symbol der PDF-Anzeige weiter.
 *
 * @returns {'rueckfall'|'fehler'}
 */
function rueckfall(bytes) {
  try {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const adresse = URL.createObjectURL(blob);
    const fenster = window.open(adresse, '_blank');
    if (!fenster) {
      URL.revokeObjectURL(adresse);
      return 'fehler';
    }
    if (letzteAdresse) URL.revokeObjectURL(letzteAdresse);
    letzteAdresse = adresse;
    return 'rueckfall';
  } catch (fehler) {
    return 'fehler';
  }
}

/**
 * PDF direkt im neuen Fenster oeffnen, ohne Teilen-Fenster. Fuer einen
 * eigenen Knopf, wenn `teilePdf` mit 'fehler' endet: der neue Tipp bringt die
 * frische Nutzeraktion mit, die `window.open` braucht. Muss deshalb direkt
 * aus dem Tipp-Ereignis gerufen werden.
 *
 * @param {Uint8Array|ArrayBuffer} bytes
 * @returns {'rueckfall'|'fehler'}
 */
export function oeffnePdf(bytes) {
  return rueckfall(bytes);
}
