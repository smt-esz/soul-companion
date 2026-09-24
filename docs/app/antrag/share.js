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

/** Rueckfall: PDF im neuen Fenster. Der Hinweis steht daneben in der App. */
const RUECKFALL_SEKUNDEN = 60;

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
      // Alles andere: nicht verschlucken, aber auch nicht aufgeben.
      const ergebnis = rueckfall(bytes);
      return ergebnis === 'rueckfall' ? 'rueckfall' : 'fehler';
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
    // Die Adresse muss leben, solange das Fenster sie laedt. Danach freigeben,
    // damit der Speicher nicht vollaeuft.
    window.setTimeout(() => URL.revokeObjectURL(adresse), RUECKFALL_SEKUNDEN * 1000);
    return fenster ? 'rueckfall' : 'fehler';
  } catch (fehler) {
    return 'fehler';
  }
}
