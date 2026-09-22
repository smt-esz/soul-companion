# Testdaten fuer den Build

Diese Dateien erzeugt `node tools/test-build.mjs` bei jedem Lauf neu.
Von Hand aendern lohnt nicht, die Vorlagen stehen in `tools/test-build.mjs`.

- `gut/` laeuft ohne Fehler durch, nur mit Warnungen.
- `fehler/` enthaelt absichtlich sechs Fehler (ueberlappende Slots, Termin in den
  Ferien, unbekanntes Fach, fehlender Baustein, Tippfehler im Wochentag,
  Kommafehler in antrag.json).

Alle Inhalte sind erfundene Testwerte, kein SOUL-Inhalt.
