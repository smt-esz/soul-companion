# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primär Schülerinnen und Schüler der Jahrgänge 5 bis 7 am Evangelischen Schulzentrum Bad Düben, die nach dem SOUL-Konzept lernen. Ein Jahrgang pro Gerät (Schulgerät, Web-Clip per Jamf). Eltern lesen ebenfalls mit.

## Product Purpose

Informationsplattform zum SOUL-Lernen: Lernende finden Wochenraster, Bausteinzeiträume und Fächerinformationen an einem Ort. Erfolg heißt, dass Lernende sich selbstständig orientieren können, ohne nachzufragen.

## Positioning

Web-App ohne Server, ohne Konten und ohne externe Anfragen (kein CDN, keine externen Schriften, keine Analyse). Datenschutz ist ein Kernversprechen, das ein üblicher Lern-Dienst nicht einhalten kann.

## Operating Context

Inhalte pflegt Leo in `content/` (Excel, Markdown, JSON); ein Build (`tools/build.mjs`) erzeugt `docs/`, das über GitHub Pages veröffentlicht wird. Verteilung über Jamf-Web-Clips und Webfilter (siehe `ANLEITUNG_JAMF.md`).

## Capabilities and Constraints

- Vanilla JavaScript, ES-Module, kein Bundler; Bibliotheken liegen in `src/vendor/`.
- Keine externen Anfragen aus der App.
- Kein Material, keine Lösungen, keine Namen von Lernenden im Repo.
- `src/app/version.js` ändert nur Leo.
- Fächer werden farbcodiert dargestellt (einheitliche Fach-Badges) als Orientierung im Wochenraster.

## Brand Commitments

Schulträger: Evangelisches Schulzentrum Bad Düben. Sprache klar und einfach, passend für Jahrgang 5 bis 7. Weitere Marken- oder Stilvorgaben sind nicht festgelegt.

## Evidence on Hand

Echte Inhalte und Beispieldaten in `content/` und `src/`. Keine Testimonials oder Nutzungszahlen vorhanden; keine erfinden.

## Product Principles

1. Datenschutz vor Komfort: nichts verlässt das Gerät.
2. Verständlich für Jg. 5 bis 7 zuerst; Eltern sind Mitlesende, nicht die Zielgruppe der Gestaltung.
3. Farbe trägt Bedeutung (Fach), nicht Dekoration.
4. Inhalte lassen sich ohne Code pflegen.

## Accessibility & Inclusion

Klare Sprache für Jugendliche der Jahrgänge 5 bis 7. Konkreter Standard (z. B. WCAG AA) ist nicht festgelegt.
