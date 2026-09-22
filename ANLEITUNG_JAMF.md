# Anleitung für iPad-Admin: SOUL Companion in Jamf konfigurieren

Für: Jamf-Administrator  
Stand: 22.09.2026

Diese Anleitung beschreibt, wie SOUL Companion als Web-Clips in Jamf verteilt wird.

## Kurzbeschreibung

SOUL Companion ist eine Informationsplattform für Schülerinnen und Schüler zum SOUL-Lernen. Die App wird als Web-Clip (Safari Web-App) auf den iPads verfügbar gemacht. Ein Jahrgang pro Gerät.

- **Anbieter**: Evangelisches Schulzentrum Bad Düben
- **Typ**: Web-App (lokal keine Daten, funktioniert offline)
- **Zielgruppe**: Schülerinnen und Schüler Jahrgänge 5, 6, 7
- **Host**: GitHub Pages (öffentliches Repo)

## Konfiguration in Jamf

### 1. Web-Clips anlegen

Lege **drei Web-Clips** an, einen pro Jahrgang. Jeder Clip wird einer Jahrgangsgruppe zugeordnet.

#### Web-Clip 1: SOUL Companion Jahrgang 5

1. **Jamf Pro** → **Devices** → **Managed Content** → **Web Clips** → **+** (oder: **Apps** → **Web Clips** → **New**) [prüfen].
2. **General** (Reiter [prüfen]):
   - **Display Name**: `SOUL`
   - **URL**: `https://{username}.github.io/soul-companion/?jgst=5`  
     (Ersetze `{username}` mit dem GitHub-Benutzernamen von Leo)
   - **Icon URL**: `https://{username}.github.io/soul-companion/icon-180.png`

3. **iOS / iPadOS** (Reiter [prüfen]):
   - **Web Clip URL**: Wiederholen der URL oben, falls nötig [prüfen].
   - **Display as**: `Web App`  
     (Dies öffnet die App im Vollbild-Modus, nicht in Safari. **[ungeprüft]** Ob der URL-Parameter `?jgst=5` durch diese Option erhalten bleibt, sollte vor der Verteilung auf einem Testgerät getestet werden.)
   - **Allow user to delete**: `No` (optional, um Löschen zu verhindern)
   - **Allow scaling**: `No` (optional)
   - **Allow fullscreen**: `Yes` (ermöglicht Vollbildmodus)
   - **Hide Safari navigation bar**: `Yes` (empfohlen für App-ähnliches Aussehen)

4. Speichern.

#### Web-Clip 2: SOUL Companion Jahrgang 6

Wiederhole die Schritte 1–4, aber mit:
- **Display Name**: `SOUL`
- **URL**: `https://{username}.github.io/soul-companion/?jgst=6`
- **Icon URL**: (gleich wie oben)

#### Web-Clip 3: SOUL Companion Jahrgang 7

Wiederhole die Schritte 1–4, aber mit:
- **Display Name**: `SOUL`
- **URL**: `https://{username}.github.io/soul-companion/?jgst=7`
- **Icon URL**: (gleich wie oben)

### 2. Web-Clips Jahrgangsgruppen zuordnen

Nach dem Anlegen der drei Web-Clips ordne sie den entsprechenden Gerätegruppen zu:

1. **Jamf Pro** → **Devices** → **Device Groups** [prüfen].
2. Für jede Jahrgangsgruppe (z. B. "Jahrgang 5", "Jahrgang 6", "Jahrgang 7"):
   - Öffne die Gruppe.
   - **Mobile Device Management** (oder ähnlich) → **Applications** / **Managed Content** [prüfen].
   - Füge den entsprechenden Web-Clip hinzu (z. B. "SOUL Companion Jahrgang 5" zur Gruppe "Jahrgang 5").

Oder: Bei der Web-Clip-Erstellung direkt die Gerätegruppe auswählen (Reiter **Scope** oder **Device Groups**) [prüfen].

### 3. Webfilter konfigurieren

Stelle sicher, dass alle iPads Zugriff auf GitHub Pages haben:

1. **Jamf Pro** → **Policies** → (bestehendes Policy, das die iPads konfiguriert, oder neues) [prüfen].
2. Suche nach **Web Content Filter** oder **Web Filtering** [prüfen].
3. **Whitelist** oder **Exceptions**:
   - Füge die Domain `*.github.io` hinzu (erlaubt alle Subdomains).
4. Speichern.

**Hinweis**: Falls bereits eine Website-Blacklist/Whitelist aktiv ist, stelle sicher, dass `*.github.io` nicht blockiert wird.

### 4. Zuordnung überprüfen

Nach der Konfiguration:

1. Teste auf **mindestens einem Gerät pro Jahrgang**, bevor du auf alle Geräte verteilst.
2. Prüfe:
   - Der Web-Clip "SOUL" erscheint auf dem Home-Bildschirm.
   - Tippen auf den Clip öffnet die App im Vollbild-Modus.
   - Die App lädt und zeigt die Informationen für den richtigen Jahrgang.
   - Offline-Funktionalität (Safari lädt die gecachten Inhalte, falls Verbindung unterbrochen).

## Fragen an dich vor der Verteilung (aus dem Datenschutz-Review)

Bitte kläre folgende Punkte für die Dokumentation:

1. **Webfilter `*.github.io` freigegeben?**  
   Können alle Schüler-iPads auf `*.github.io` zugreifen, oder muss diese Domain explizit freigegeben werden?

2. **Mail-Funktion auf Schüler-iPads aktiv?**  
   Die App ermöglicht das Versenden von Anträgen als PDF per Mail. Dafür muss die Mail-App auf den Geräten konfiguriert sein. Ist das der Fall?
   - Falls ja: Gibt es Einschränkungen auf die E-Mail-Empfänger (z. B. nur interne Domain)?

3. **Website-Daten löschen per MDM-Profil?**  
   Falls Jamf ein Profil mit "Website-Daten löschen" oder "Safari-Cache leeren" aktiv, könnten die App-Daten regelmäßig gelöscht werden. Kann das passieren?

4. **iPad-Zurücksetzen zum Schuljahresende?**  
   Werden die Geräte zu Schuljahresende zurückgesetzt? Das löscht auch lokal gespeicherte Anträge. (Unkritisch, aber wichtig zu wissen.)

5. **Safari-Inhaltsfilter oder andere Einschränkungen?**  
   Gibt es weitere Einschränkungen in Safari (z. B. erlaubte Plugins, Kamera, Mikro), die die App betreffen könnten?

Bitte antworte Leo per Mail: leo@esz-baddueben.de [prüfen – Name und Mailadresse prüfen]

## Hinweise

- **Icon**: Das App-Icon (`icon-180.png`) liegt im Repo unter `src/assets/`. Die URL oben verweist auf die veröffentlichte Version auf GitHub Pages.
- **URL-Parameter**: Der Parameter `?jgst=5|6|7` teilt der App mit, welcher Jahrgang auf dem Gerät aktiv ist. **[ungeprüft]** Vor der Verteilung sollte getestet werden, ob dieser Parameter bei Verwendung als Web-Clip korrekt weitergeleitet wird.
- **Offline**: Die App funktioniert offline (gecachte Daten). Das ist absichtlich.
- **Konten/Login**: Nicht erforderlich. Die App speichert Daten lokal auf dem Gerät.

---

**Fragen?** Kontaktiere Leo vor der Verteilung an alle Schüler-Geräte. Ein Test auf ein bis zwei Geräten ist dringend empfohlen (siehe Abschnitt 4).
