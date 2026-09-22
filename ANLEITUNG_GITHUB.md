# Anleitung: GitHub Pages einrichten

Für: Leo  
Stand: 22.09.2026

Diese Anleitung führt dich durch das Einrichten von zwei Repositorys und GitHub Pages für SOUL Companion.

## 1. GitHub Desktop: Konto-Einstellung aktivieren

1. Öffne **GitHub Desktop**.
2. Klicke auf **File** (Windows) oder **GitHub Desktop** (Mac) → **Options** [prüfen].
3. Wähle **Accounts** (linke Seitenleiste) [prüfen].
4. Bei deinem GitHub-Account: Prüfe die Einstellung **"Keep my email addresses private"** und aktiviere sie, falls deaktiviert.
   - Dies verhindert, dass deine private E-Mail-Adresse in Commits sichtbar wird.
5. Schließe das Fenster.

**Hinweis:** Wenn du die noreply-Adresse verwenden möchtest, notiere sie dir von deiner GitHub-Seite. Die siehst du unter GitHub.com → Einstellungen → Emails.

## 2. Zwei Repositorys auf GitHub.com anlegen

Wiederhole die nächsten Schritte zweimal: einmal für `soul-companion` (Live) und einmal für `soul-companion-beta` (Beta/Test).

### Repository erstellen

1. Gehe auf **GitHub.com** und melde dich an.
2. Klicke oben rechts auf dein Profilbild → **Your repositories** [prüfen].
3. Klicke auf **New** (grüner Button).
4. Gib folgende Daten ein:
   - **Repository name**: 
     - Erste Repo: `soul-companion`
     - Zweite Repo: `soul-companion-beta`
   - **Description** (optional): 
     - Erste Repo: "SOUL Companion – Informationsplattform für Schülerinnen und Schüler"
     - Zweite Repo: "SOUL Companion – Beta/Test"
   - **Public** (Sichtbarkeit): aktiviert (Radio-Button)
   - **Initialize this repository with:** deaktiviert (wir werden es lokal klonen und füllen)
5. Klicke **Create repository**.

### Repeat für `soul-companion-beta`

Wiederhole Schritte 1–5 für das zweite Repo.

## 3. Repositorys lokal klonen

1. Öffne **GitHub Desktop**.
2. Klicke **File** → **Clone repository** [prüfen].
3. Wähle **GitHub.com** (oben links).
4. Suche nach `soul-companion` in der Liste.
5. Unter **Local Path** stelle sicher, dass der Pfad ist: `C:\Users\leonart.schmitt\GitHub\soul-companion`
   - (GitHub Desktop schlägt einen Standard-Ordner vor, den du ggf. anpassen musst.)
6. Klicke **Clone**.
7. **Wiederhole Schritte 2–6 für `soul-companion-beta`** mit Pfad: `C:\Users\leonart.schmitt\GitHub\soul-companion-beta`

## 4. GitHub Pages konfigurieren (für beide Repos)

Wiederhole die nächsten Schritte einmal für jedes Repo.

### Im Webbrowser (GitHub.com)

1. Gehe auf die **Repository-Seite**: z. B. github.com/`{dein-username}`/`soul-companion`.
2. Klicke auf **Settings** (oben rechts) [prüfen].
3. Wähle **Pages** (linke Seitenleiste) [prüfen].
4. Unter **Source** / **Build and deployment**:
   - **Deploy from a branch** (Radio-Button) [prüfen].
   - **Branch**: wähle `main` [prüfen].
   - **Folder**: wähle `/docs` [prüfen].
5. Klicke **Save**.
6. Die Seite zeigt nach wenigen Sekunden eine Nachricht wie: "Your site is live at `https://{username}.github.io/soul-companion/`".
7. **Notiere diese URL!** (du brauchst sie später für Jamf).
8. Wiederhole diese Schritte für `soul-companion-beta`.

## 5. Erster Push: Repository mit Inhalten füllen

### Was wird gepusht und was nicht?

**Ins GitHub-Repo (wichtig):**
- ✅ `src/` – komplette App (HTML, JavaScript, CSS, Fonts, Icons)
- ✅ `content/` – Inhalte (Excel-Dateien, Markdown, JSON)
- ✅ `tools/` – Build-Skripte (build.mjs, serve.mjs, etc.)
- ✅ `README.md`, `ANLEITUNG_*.md` – Dokumentation
- ✅ `.gitignore`, `.nojekyll` – Konfiguration

**NICHT ins GitHub-Repo (automatisch ignoriert):**
- ❌ `node_modules/` – wird von `.gitignore` ignoriert
- ❌ `dist-intern/` – wird von `.gitignore` ignoriert
- ❌ `docs/` – wird vom Build erzeugt, wird veröffentlicht, aber im repo gespeichert
- ❌ Material/Lösungen – sind nicht im Repo (nur live intern)

### `soul-companion`-Repository

Das Repo ist nach dem Klonen leer. Du musst die App-Inhalte hochladen.

1. Öffne ein **Terminal / PowerShell** (Windows) oder **Terminal** (Mac).
2. Navigiere zum Repository:
   ```
   cd C:\Users\leonart.schmitt\GitHub\soul-companion
   ```

3. Stelle Git lokal ein (einmalig):
   ```
   git config user.email "noreply@github.com"
   git config user.name "Leo [dein Name]"
   ```
   (Verwende die noreply-Adresse von deiner GitHub-Seite: GitHub.com → Settings → Emails)

4. **Stelle sicher, dass diese Ordner/Dateien im Repo-Ordner existieren:**

   | Ordner/Datei | Gehalt | Quelle |
   |---|---|---|
   | `src/` | App-Quellcode (HTML, JS, CSS, Fonts, Icons) | AP-01 bis AP-20 stellen diese bereit |
   | `content/` | Inhalte (index.json, Excel, Markdown) | Du pflegst diese manuell oder AP-02 bereitet vor |
   | `tools/` | Build-Skripte (build.mjs, serve.mjs, package.json) | AP-02 bereitet diese vor |
   | `.gitignore` | Ignore-Regeln | Existiert bereits |
   | `README.md` | Dokumentation | Existiert bereits |
   | `ANLEITUNG_*.md` | Anleitungen | Existiert bereits |

   **Vor dem ersten Push:**
   - `src/`, `content/`, `tools/` müssen existieren (auch wenn teilweise noch unvollständig)
   - Falls noch nicht vorhanden: Warte auf die entsprechenden Arbeitspakete (AP-02, AP-03, etc.) oder kopiere von deinem lokalen Setup
   - Minimal können sie leer sein (außer `.gitkeep` Dateien), um die Struktur zu zeigen

5. Checked die Struktur:
   ```
   dir C:\Users\leonart.schmitt\GitHub\soul-companion
   ```
   Du solltest diese Ordner sehen: `src/`, `content/`, `tools/`, `docs/` + Dateien wie `README.md`, `.gitignore`.

6. Staged alle Dateien und pushe sie:
   ```
   git add .
   git commit -m "Initial commit: SOUL Companion Struktur und Inhalte"
   git push -u origin main
   ```

7. Prüfe auf GitHub.com: Die Dateien sollten nun im Repo sichtbar sein (unter github.com/`{dein-username}`/soul-companion).

### `soul-companion-beta`-Repository

Das Beta-Repo ist minimal und wird vom Build gefüllt. Hier wird nur eine README benötigt.

1. Navigiere zu:
   ```
   cd C:\Users\leonart.schmitt\GitHub\soul-companion-beta
   ```

2. Stelle Git lokal ein (wie oben).

3. Erstelle einen minimalen Start – zwei Dateien im Repo-Ordner:

   **Ordner erstellen:**
   ```
   mkdir docs
   ```

   **Datei `docs/.gitkeep` erstellen (leere Datei, damit der Ordner gepusht wird):**
   ```
   echo. > docs\.gitkeep
   ```
   (Windows PowerShell)

4. Erstelle `README.md` im Repo-Root mit diesem Inhalt:
   ```
   # SOUL Companion – Beta
   
   Testversion. Nicht an Schülerinnen und Schüler verteilen.
   
   Beschreibung: Diese Seite wird vom Build-Prozess in `docs/` erzeugt.
   Nach jedem Test-Build wird die App hier automatisch aktualisiert.
   ```

5. Stages und pushe:
   ```
   git add .
   git commit -m "Initial commit: Beta-Repo-Struktur"
   git push -u origin main
   ```

   Danach solltest du auf GitHub.com sehen:
   - `docs/.gitkeep` (leere Datei)
   - `README.md` (mit Testversion-Hinweis)

## 6. URLs notieren

Nach den ersten Pushes sind deine Live- und Beta-URLs live:

- **Live**: `https://{username}.github.io/soul-companion/`
- **Beta**: `https://{username}.github.io/soul-companion-beta/`

Diese URLs brauchst du für:
- **Jamf**: Web-Clips konfigurieren (mit `?jgst=5`, `?jgst=6`, `?jgst=7`)
- **Dokumentation**: Aktualisieren, falls Domänennamen sich ändern

---

## Häufige Fehler

- **"fatal: not a git repository"**: Du bist nicht im richtigen Ordner. Prüfe `cd` in den Repo-Ordner.
- **"Permission denied"**: Git und SSH-Schlüssel nicht korrekt konfiguriert. GitHub Desktop sollte das automatisch machen; sonst: GitHub Docs → Generating SSH keys.
- **Pages werden nicht angezeigt**: Warte 1–3 Minuten nach dem Push. Prüfe unter Settings → Pages, dass der Status "Your site is live" ist.

---

**Fertig!** Beide Repos sind jetzt eingerichtet. Du kannst sie lokal nutzen und die Inhalte pushen, sobald sie bereit sind.
