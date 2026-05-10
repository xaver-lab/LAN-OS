# LAN-READY DEPLOYMENT CHECKLIST

**Projekt:** LAN-OS (LAN Party Event Plattform)
**Target:** 50-100 Spieler, ~8h Continuous Operation
**Event-Datum:** in ~30 Tagen
**Status:** Production Readiness Assessment

---

## ✅ PHASE 1: INFRASTRUCTURE SETUP

### 1.1 Server Optimization (Express.js)
- [ ] **Connection Limits prüfen** — Express läuft auf Port 3000, `0.0.0.0:3000`
  - Aktuell: `app.listen(3000, "0.0.0.0")` — OK für LAN
  - TODO: Bei 100+ Concurrent Clients: Node.js ulimit erhöhen
  - `ulimit -n 2048` vor Server-Start (mindestens)
  - Alternativ: Reverse-Proxy (nginx) für Connection-Pooling

- [ ] **JSON Payload Limit** — aktuell `limit: "1mb"`
  - Für 100 Spieler + Match-State: ca. 500KB max
  - OK, aber bei Checkpoint-Restore prüfen

- [ ] **Memory Management**
  - State hält alles in RAM (in-memory StateContainer)
  - Estimated: ~50 Spieler = 10–15 MB RAM für State + Checkpoints
  - Server-Limits: `node --max-old-space-size=512` (min)
  - Monitoring: Memory nach 8h Laufzeit prüfen

- [ ] **CORS-Konfiguration**
  - Aktuell: `cors({ origin: true, credentials: true })`
  - LAN-only ✅ — OK für lokal-only Setup
  - KEIN Internet-Traffic

---

### 1.2 Persistence & Backup Strategy
- [ ] **JSON Persistence** — `./data/state.json` + `./data/checkpoints/`
  - Atomic writes mit tmp-rename: ✅ Crash-Safe
  - Auto-Checkpoints: nach `MATCH_DONE`, vor `MATCH_ACTIVE`, bei Boot-Recovery
  - `config.autoCheckpoint: true` (default) ✅

- [ ] **Backup-Strategie für 8h Event**
  - Nach jedem Match: Auto-Checkpoint (Label: `r1_m1`, `r2_m3`, etc.)
  - Mit 50–100 Spieler + 20–30 Matches = ~30–50 Checkpoints à 1–2 MB
  - Total Checkpoint-Storage: **50–100 MB** (akzeptabel)
  - Alte Checkpoints: manuell löschen nach Event via Admin-UI

- [ ] **Data Directory Location**
  - Env-Var: `LAN_OS_DATA_DIR` (default: `./data`)
  - **Empfehlung:** vor Event auf separates Laufwerk legen
    ```bash
    export LAN_OS_DATA_DIR=/mnt/backup/lan-os-data
    npm run start
    ```

---

### 1.3 Crash Recovery & Auto-Restart
- [ ] **Crash Detection** — beim Boot:
  - Wenn `tournamentState === "MATCH_ACTIVE"` → auf `MATCH_SETUP` zurückgesetzt
  - EventLog-Eintrag: "Crash während laufendem Match erkannt"
  - ✅ Implementiert in `boot.ts`

- [ ] **Auto-Restart Script** — MUSS noch erstellt werden
  - Script: `/home/user/LAN-OS/run-lan-os.sh` (siehe SETUP.md)
  - Mit PM2 oder systemd wrapper
  - Heartbeat-Check: Jede 60 Sekunden prüfen, ob Server läuft
  - Bei Crash: Auto-Restart + Admin-Notification per Console

---

### 1.4 Logging & Error Tracking
- [ ] **Server Logs**
  - Aktuell: Console-Output (stdout)
  - TODO: Log-File erfassen für Debugging
  - `npm run start 2>&1 | tee lan-os-$(date +%Y%m%d_%H%M%S).log`

- [ ] **Error Routes**
  - 404-Handler: `/api/*` → 404 JSON
  - 500-Handler: Global error catch → schreibt in Console + EventLog
  - TODO: Admin-Dashboard: System-Tab zeigt letzten Error

- [ ] **Event Log** — in State persistiert
  - Alle Mutations werden geloggt (EventLog[])
  - Admin-UI: "System Log" anzeigen (letzte 50 Einträge)
  - Export-Function: EventLog als CSV für Post-Event-Analyse

---

## ✅ PHASE 2: CLIENT DEPLOYMENT

### 2.1 Production Build
- [ ] **`npm run build` erfolgreich durchlaufen**
  - Kommando: `npm run build` (root)
  - Leads to:
    - `packages/shared/dist/` (Types)
    - `packages/server/dist/` (compiled TypeScript)
    - `packages/client/dist/` (Vite bundle: tv.html, play.html, admin.html)
  - Vite-Config: Multiple entry points mit rollupOptions ✅

- [ ] **Dist-Folder struktur**
  ```
  packages/client/dist/
    ├── index.html (fallback)
    ├── tv.html (TV-Interface)
    ├── play.html (Player-Browser)
    ├── admin.html (Admin-Panel)
    ├── assets/
    │   ├── *.js (bundled React)
    │   ├── *.css (Vite-generiert)
    └── [weitere Assets]
  ```

- [ ] **Asset Optimization**
  - Gzip-Größe der Bundles: < 5MB Total
  - React 18.3 + Vite 5.4 = gut optimiert
  - TODO: Vite-Analyzer für Bundle-Size prüfen
    ```bash
    npm install --save-dev rollup-plugin-visualizer
    # Dann in vite.config.ts visualizer-Plugin add
    ```

---

### 2.2 Browser Compatibility
- [ ] **Chrome (Desktop)** ✅
  - React 18 + Vite — alle modernen Features
  - Test: `/play`, `/tv`, `/admin` laden?

- [ ] **Firefox (Desktop)** ✅
  - Getestet mit Polling-Endpoints

- [ ] **Safari (Desktop & iOS)**
  - CSS Grid / Flexbox — Standard
  - LocalStorage für sessionToken — Standard
  - TODO: auf Tablet testen (iPad, Samsung Tab)

- [ ] **Mobile Devices (Player-Tablets)**
  - Responsive Design — TODO: Vite-Build prüfen
  - Touch-Handling: Voting-UI responsive?
  - Test: auf 2–3 Tablets mindestens 1h laufen lassen

---

### 2.3 Cross-Device Testing
- [ ] **Setup vor Event**
  - Admin-PC: `/admin` + `/tv` (2 Browser-Fenster)
  - 5–10 Spieler-Devices (mix Phones/Tablets/Laptops)
  - Alle im selben LAN-Subnet

- [ ] **Netzwerk-Tests**
  - Können alle Clients Server via `http://[ADMIN_IP]:3000` erreichen?
  - Polling-Endpoints antworten? GET `/api/state/public` (TV)
  - API-Latenz: < 100ms (LAN-Lokal)

---

## ✅ PHASE 3: NETWORK SETUP

### 3.1 LAN-Konfiguration (No Internet Dependency)
- [ ] **Admin-PC Network**
  - IP-Adresse notieren: `ifconfig` oder `ipconfig`
  - Alle Clients müssen über diese IP den Server erreichen
  - z.B.: `http://192.168.1.10:3000/play`

- [ ] **Firewall Ports**
  - Port 3000 (TCP): nur innerhalb LAN offen
  - Windows Firewall: `netsh advfirewall firewall add rule name="LAN-OS" dir=in action=allow protocol=tcp localport=3000`
  - macOS: System Settings → Security & Privacy → Firewall (Port 3000 whitelisten)
  - Linux: UFW oder iptables nicht nötig (lokal)

- [ ] **WiFi Network Stability**
  - Router-Model notieren (für Troubleshooting)
  - DHCP-Pool groß genug? (100+ Devices = 100+ IP-Adressen)
  - SSID: keine versteckte SSID (manueller Connect wäre kompliziert)
  - 5GHz-Band bevorzugt (weniger Interferenzen)

---

### 3.2 WiFi Stress-Testing
- [ ] **Simulation: 50–100 Devices gleichzeitig**
  - TODO: vor Event testen
  - Script: 20 Browser-Tabs öffnen, alle polle `/api/state/public` alle 2s
  - Beobachten: Response-Zeit stabili, Memory-Auslastung auf Server?

- [ ] **Continuous 8h Uptime Test**
  - TODO: Mini-Dry-Run (mindestens 2–3h)
  - Prüfpunkte: Alle 30 min State abspeichern (Checkpoint)
  - Memory-Leak? ProcessInfo nach 8h vs. Start vergleichen

---

### 3.3 Router Stability
- [ ] **Restart-Readiness**
  - Falls Router-Neustart nötig: Wiederaufnahme aller Clients < 2 min
  - Test: Router neu starten, Clients reconnecten automatisch

- [ ] **Idle-Timeout Vermeiden**
  - Router Idle-Timeout: ≥ 30 min (üblicherweise default)
  - Falls < 30 min: in Router-Admin anpassen
  - Polling-Intervalle sind 1–2 Sekunden → kein Timeout-Problem

---

## ✅ PHASE 4: DATA MANAGEMENT

### 4.1 Checkpoint System
- [ ] **Auto-Checkpoint Intervals**
  - Nach `MATCH_DONE` → `checkpoint_r1_m1_<ts>.json`
  - Vor `MATCH_ACTIVE` Start → `checkpoint_prematch_r1_<ts>.json`
  - Trigger: automatisch (`trigger: "auto"`)

- [ ] **Manual Checkpoints**
  - Admin-UI: System-Tab → "Backup jetzt"
  - Erstellt: `checkpoint_<label>_<ts>.json`
  - Trigger: `manual`

- [ ] **Checkpoint-Cleanup**
  - Alte Checkpoints nicht löschen bis nach Event
  - Nach Event: manuell via Admin-UI oder Bash
  - ```bash
    cd ./data/checkpoints
    ls -lt | tail -n +11 | awk '{print $NF}' | xargs rm
    # Behält letzte 10 Checkpoints
    ```

---

### 4.2 Reset-Script zwischen Events
- [ ] **Hard Reset** (TODO: Skript schreiben)
  - Admin-UI: System-Tab → "Hard Reset (doppel-confirm)"
  - Setzt State auf: `createEmptyState()`
  - Löscht: alle Players, Matches, Votes
  - Behält: Config-Settings + UI-Prefs
  - Checkpoints: NICHT löschen (für Forensik)

- [ ] **Partial Reset** (zwischen Matches)
  - Nur `players[].points` zurücksetzen? → einzelner Player
  - Nur `tournamentState` zurücksetzen → zu LOBBY
  - via Admin-UI möglich

---

### 4.3 Export-Function (Finale Leaderboard)
- [ ] **Export-Format**
  - JSON-Export: `players[].{name, points, playtimeSec, role}`
  - CSV-Export: Tab-separiert für Excel
  - Screenshot: TV-Leaderboard final
  - TODO: Admin-UI → System-Tab → "Export Leaderboard"

---

### 4.4 Archive-Strategy für Old Checkpoints
- [ ] **Post-Event Archivierung**
  - Checkpoints nach Event in `.tar.gz` packen:
    ```bash
    tar czf lan-os-backup-$(date +%Y%m%d).tar.gz ./data/
    ```
  - Externe Festplatte oder USB-Stick zur Sicherung

---

## ✅ PHASE 5: MONITORING & ALERTS

### 5.1 Health-Check Endpoint
- [ ] **GET /health — TODO: implementieren**
  - Response: `{ status: "ok", uptime: 12345, version: "3.0", memory: "45MB" }`
  - Polling: 30 Sekunden (Admin-Dashboard)
  - Bei Failure: Notification auf Admin-Screen

---

### 5.2 Error-Alerts
- [ ] **Console-Output**
  - Alle Errors gehen auf Console (stdout)
  - Server-Log-File erfassen: `npm run start 2>&1 | tee server.log`
  - Wird live im Terminal sichtbar

- [ ] **Admin-Dashboard Status Panel**
  - TODO: Admin-UI System-Tab erweitern
  - Zeige: uptime, lastError, playerCount, matchCount
  - Auto-refresh alle 2 Sekunden

---

### 5.3 Uptime-Timer
- [ ] **Server-Uptime auf TV Display**
  - TODO: TV-UI erweitern
  - "Server online seit: HH:MM:SS"
  - Berechnet: `Date.now() - bootTimestamp`
  - Zeige auf Lobby-Screen oben rechts

---

## ✅ PHASE 6: DOCUMENTATION

### 6.1 SETUP.md ✅ (wird separat erstellt)
- [ ] Schritt-für-Schritt Server-Start
- [ ] Ports + Firewall öffnen
- [ ] Client-Devices verbinden
- [ ] Erste Anmeldung (Admin + Spieler)

### 6.2 TROUBLESHOOTING.md ✅ (wird separat erstellt)
- [ ] Häufige Fehler + Fixes
- [ ] Network-Probleme
- [ ] Crash-Recovery
- [ ] State-Restore aus Checkpoint

### 6.3 QUICK_START.md ✅ (wird separat erstellt)
- [ ] 5-Minuten-Blitz-Anleitung
- [ ] Nur wichtigste Schritte

### 6.4 ADMIN_GUIDE.md ✅ (wird separat erstellt)
- [ ] Admin-Panel Walkthrough
- [ ] Jeder Tab erklärt

---

## ✅ PHASE 7: PRE-EVENT TESTING

### 7.1 Full Dry-Run (50 Spieler Simulation)
- [ ] **Test-Szenario**
  - 50+ Browser-Tabs simulieren: `for i in {1..50}; do curl http://localhost:3000/play & done`
  - Alternativ: 10–20 echte Devices, jeden mehrfach verbunden
  - Laufdauer: mindestens 2 Stunden (kürzer geht, aber 8h Test besser)

- [ ] **Voting → Match-Cycle**
  1. Admin startet Voting (Mode: MULTI)
  2. 50 Clients geben Stimmen ab
  3. Wheel spinnt
  4. Match-Setup (shake-Auswahl)
  5. Scores eingeben
  6. Confirm
  7. Points gebucht
  - Prüfung: alle Spieler sehen aktualisierte Leaderboard?

- [ ] **Soulmask parallel**
  - Soulmask starten während Tournament läuft
  - Tasks vergeben + abhaken
  - Morale-Meter updates?

---

### 7.2 Failover-Test: Server Restart während Match
- [ ] **Szenario**
  1. Match `MATCH_ACTIVE`
  2. Server `kill -9` oder `Ctrl+C`
  3. Sofort neu starten: `npm run start`
  4. Boot-Sequenz: Crash-Recovery greift?
  5. State auf `MATCH_SETUP` zurückgesetzt?
  6. Clients reconnecten?
  7. Match kann manuell neu gestartet werden?

---

### 7.3 Backup-Restore Test
- [ ] **Szenario**
  1. Nach 3 Matches: manueller Checkpoint `backup-mid-event`
  2. Weitere 2 Matches spielen
  3. Admin: System-Tab → Restore aus `backup-mid-event`
  4. State zurück auf Zustand nach 3 Matches?
  5. Später-gespielte Matches weg?
  6. Punkte-Ausstände korrekt?

---

### 7.4 UI-Test: Alle 3 Interfaces
- [ ] **Player-Interface (`/play`)**
  - Login mit 5 verschiedenen Namen?
  - Voting absolvieren?
  - Match-Score-Eingabe?
  - Leaderboard abrufen?

- [ ] **TV-Interface (`/tv`)**
  - Lobby-Mode: Leaderboard + Event-Feed?
  - Voting-Mode: Live-Votes + Counter?
  - Spin-Mode: Wheel lädt + rotiert?
  - Match-Mode: Teams + Live-Score?
  - Performance: smooth auf 1920x1080 (oder höher)?

- [ ] **Admin-Interface (`/admin`)**
  - Alle 6 Tabs funktionsfähig?
  - Spieler hinzufügen/editieren?
  - Voting starten/stoppen?
  - Match-Score überschreiben?
  - Checkpoint-Liste?

---

## ✅ PHASE 8: FINAL CHECKS (7 TAGE VOR EVENT)

### 8.1 Infrastructure Readiness
- [ ] Admin-PC Hardware-Check
  - CPU/RAM ausreichend? (Node ~200MB RAM baseline + State)
  - Lüfter sauber (für 8h Laufzeit)
  - SSD/HDD: genug Platz für `./data/checkpoints`? (mindestens 500MB)
  - Netzteil: USV (UPS) für 8h kontinuierliche Nutzung?

- [ ] Network Check
  - DHCP-Pool überprüft?
  - WiFi-Router: Wärmeableitung okay?
  - Backup-WiFi-Netzwerk vorhanden (Hotspot von Handy)?

---

### 8.2 Software Readiness
- [ ] Production Build lädt schnell?
  - `npm run build` < 2 Minuten
  - `dist/` Größe überprüft
  
- [ ] Server startet schnell?
  - `npm run start` < 5 Sekunden bis "Server gestartet"
  - `./data/` Verzeichnis erstellt?

- [ ] Error-Logging funktioniert?
  - Starten mit `npm run start 2>&1 | tee server.log`
  - `server.log` wird geschrieben?

---

### 8.3 Documentation Complete?
- [ ] [ ] SETUP.md existiert + lesbar?
- [ ] [ ] TROUBLESHOOTING.md existiert?
- [ ] [ ] QUICK_START.md existiert?
- [ ] [ ] ADMIN_GUIDE.md existiert?

---

### 8.4 Contingency Planning
- [ ] Fallback-Szenarien identifiziert:
  - [ ] WiFi-Ausfall → Backup-Hotspot
  - [ ] Server-Crash → Auto-Restart-Script
  - [ ] Player-Device offline → bleibt online für 30s, dann offline-Status
  - [ ] Match-Score-Konflikt → Admin-Override

- [ ] Durchführungs-SOP geschrieben:
  - [ ] Startup-Checkliste für Tag-des-Events
  - [ ] Troubleshooting-Entscheidungsbaum
  - [ ] Notfall-Kontakt-Person (Dev/Admin)

---

## 📊 DEPLOYMENT READINESS SUMMARY

| Phase | Status | % Complete | Blocker? |
|-------|--------|-----------|----------|
| 1. Infrastructure | READY | 85% | Auto-Restart Script fehlt |
| 2. Client Build | READY | 90% | Asset-Size Audit pending |
| 3. Network | READY | 80% | 100-Device WiFi-Test ausstehend |
| 4. Data Management | READY | 80% | Export-Funktion TODO |
| 5. Monitoring | PARTIAL | 60% | Health-Endpoint + Admin-Dashboard-UI TODO |
| 6. Documentation | NOT STARTED | 0% | SETUP/TROUBLESHOOTING/GUIDES fehlen |
| 7. Pre-Event Testing | NOT STARTED | 0% | Full Dry-Run ausstehend |
| 8. Final Checks | NOT STARTED | 0% | 7-Tage-Checklist ausstehend |

---

## 🎯 PRODUCTION-READY VERDICT

### ✅ GO / ⚠️ CONDITIONAL GO / 🛑 NO-GO

**CURRENT STATUS: ⚠️ CONDITIONAL GO**

### Blockers (MUST FIX before Event):
1. **Auto-Restart Script** — Server-Resilienz
2. **Health-Check Endpoint + Admin-Status-UI** — Monitoring
3. **Export Leaderboard Function** — Post-Event-Daten
4. **Full 8h Dry-Run** — Confidence für Produktion
5. **Documentation** — Operational Readiness

### Recommendations:
- [ ] Nächste 7–10 Tage: blockers beheben
- [ ] 7 Tage vor Event: Full Dry-Run (2–4h mindestens)
- [ ] 3 Tage vor Event: Final Network + WiFi Test
- [ ] 1 Tag vor Event: Smoke Test (10 Clients, 3 Matches)

---

## 📝 NOTES FOR DAY-OF-EVENT

- **Server-Start Command:**
  ```bash
  export LAN_OS_DATA_DIR=/path/to/backup-location
  npm run start 2>&1 | tee lan-os-$(date +%Y%m%d_%H%M%S).log
  ```

- **Monitoring During Event:**
  - Alle 30 min: `ps aux | grep node` (Prozess läuft?)
  - Alle 60 min: Check `/api/health` response
  - Admin-Dashboard offen halten für Live-Stats

- **Contingency:**
  - Server-Crash → `npm run start` & Auto-Recover aktiv
  - Spieler-Verbindung weg → 30s Timeout, dann offline
  - Match-Score-Fehler → Admin-Override im Turnier-Tab

---

**Document Version:** 1.0 (2026-05-10)
**Next Review:** Before Event Start
