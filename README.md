# SOUL Companion

Informationsplattform für Schülerinnen und Schüler zum SOUL-Lernen am
Evangelischen Schulzentrum Bad Düben. Web-App ohne Server, ohne Konten,
ohne externe Anfragen. Ein Jahrgang pro Gerät.

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/` | App-Quellcode (Vanilla JavaScript, ES-Module, kein Bundler) |
| `content/` | Inhalte, die Leo pflegt (Excel, Markdown, JSON) |
| `tools/` | Build und lokaler Testserver |
| `docs/` | wird vom Build erzeugt und veröffentlicht, nie von Hand ändern |

## Lokal ansehen

Ohne Build (mit Beispieldaten):

```
node tools/serve.mjs --ordner=src
```

Dann `http://localhost:8080/?quelle=beispiel` öffnen.

Mit Build:

```
node tools/build.mjs
node tools/serve.mjs
```

Das liefert die App aus dem Ordner `docs/`.

## Anleitungen im Repo

- `ANLEITUNG_GITHUB.md`: GitHub Desktop einrichten und beide Repos anlegen (für Leo)
- `ANLEITUNG_JAMF.md`: Web-Clips und Webfilter in Jamf konfigurieren (für den Admin)

## Weitere Dokumentation

Detaillierte Dokumentation (nicht im Repo):

- `Planung/DEPLOY.md`: Veröffentlichen auf GitHub Pages, Versionsnummern
- `Planung/REDAKTION.md`: Inhalte in `content/` pflegen ohne Code
- `Planung/ARCHITEKTUR.md`: Aufbau der App
- `Planung/DATENMODELL.md`: Aufbau der Dateien in `content/`

Pfad: `SOUL\Planung\` in der Schulentwicklungsablage.

## Regeln

- `src/app/version.js` ändert nur Leo.
- Keine externen Anfragen aus der App: kein CDN, keine Schriften von außen,
  keine Analyse. Bibliotheken liegen in `src/vendor/`.
- Kein Material, keine Lösungen, keine Namen von Lernenden im Repo.
