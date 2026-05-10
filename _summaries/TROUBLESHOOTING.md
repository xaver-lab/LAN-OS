# TROUBLESHOOTING.md — Common Issues & Fixes

**Für:** LAN-Party Event Operator + Technical Support
**Ziel:** Schnelle Diagnostik + Behebung vor/während Event
**Escalation:** Falls unten nicht gelöst → Developer kontaktieren

---

## 🔴 CRITICAL ISSUES (Server offline, Event stoppt)

### Problem 1: Server crashed / stellt keine Verbindung her

**Symptome:**
- Browser zeigt "Connection refused"
- Terminal-Output stoppt plötzlich
- Admin-PC antwortet auf Ping, aber Server antwortet nicht

**Schnell-Diagnose (30 Sekunden):**
```bash
# 1. Ist Node-Prozess noch am Leben?
ps aux | grep "npm\|node\|start"

# 2. Läuft was auf Port 3000?
lsof -i :3000        # macOS/Linux
netstat -ano | findstr :3000  # Windows

# 3. Letzter Log-Eintrag?
tail -20 lan-os-event*.log
```

**Fixes (in dieser Reihenfolge):**

#### Fix 1a: Server einfach neustarten
```bash
# Falls Server-Process noch läuft (Zombie)
pkill -f "npm run start"
sleep 2

# Erneut starten
cd /home/user/LAN-OS
npm run start 2>&1 | tee lan-os-restart-$(date +%s).log
```

**Erwartetes Output:**
```
╔════════════════════════════════════════╗
║       LAN OS — Server gestartet        ║
╠════════════════════════════════════════╣
║  http://localhost:3000/admin           ║
║  http://localhost:3000/play            ║
║  http://localhost:3000/tv              ║
╚════════════════════════════════════════╝
```

#### Fix 1b: Port 3000 ist belegt
```bash
# Andere Prozesse auf Port 3000 finden + killen
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Oder anderen Port verwenden
PORT=8080 npm run start
# Dann alle Clients neu laden: http://192.168.1.10:8080/play
```

#### Fix 1c: Node-Prozess hung/memoryissue
```bash
# Speicher überprüfen
free -h          # Linux
vm_stat          # macOS
wmic OS get TotalVisibleMemorySize,FreePhysicalMemory  # Windows

# Falls aus Speicher: alte Node-Prozesse killen
pkill -f node
pkill -f npm

# Build + Restart
npm run build
npm run start
```

#### Fix 1d: Festplatte voll (keine Checkpoint-Writes möglich)
```bash
# Festplatte prüfen
df -h /
du -sh /home/user/LAN-OS

# Falls voll: alte Checkpoints löschen
cd /home/user/LAN-OS/data/checkpoints
ls -lt | head -5  # Neueste 5 behalten
ls -lt | tail -n +6 | awk '{print $NF}' | xargs rm
```

---

### Problem 2: Clients können Server nicht erreichen

**Symptome:**
- Browser zeigt "This site can't be reached"
- Spieler-Devices: "Connection refused" oder "Timeout"
- Admin-Panel offen, aber Spieler-Browser nicht

**Schnell-Diagnose (1 Minute):**
```bash
# 1. Admin-PC IP herausfinden
ifconfig | grep "inet " | grep -v 127.0.0.1

# 2. Von anderem Gerät im LAN:
ping [ADMIN_IP]
curl http://[ADMIN_IP]:3000/api/state/public

# 3. Firewall überprüfen
lsof -i :3000  # sollte node zeigen
```

**Fixes:**

#### Fix 2a: Falsche Admin-IP verwendet
```bash
# Richtige IP bestimmen
# macOS/Linux:
hostname -I
ifconfig | grep "inet " | head -1

# Windows:
ipconfig | grep "IPv4"

# Beispiel: 192.168.1.10
# Spieler benutzen: http://192.168.1.10:3000/play (NICHT localhost!)
```

#### Fix 2b: Firewall blockiert Port 3000
```bash
# macOS: System Preferences → Security & Privacy → Firewall Options
# node manuell hinzufügen

# Linux (UFW):
sudo ufw allow 3000/tcp
sudo ufw status

# Windows (PowerShell als Admin):
New-NetFirewallRule -DisplayName "LAN-OS-3000" `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000
```

#### Fix 2c: Netzwerk-Konfiguration (DHCP / IP-Auflösung)
```bash
# Router prüfen:
# - DHCP Pool groß genug? (100+ Devices)
# - Alle Clients im selben Subnet? (192.168.1.x)

# Manuell IP zuweisen (Alternative zu DHCP):
# Admin-PC: 192.168.1.1 (statisch setzen)
# Spieler-Devices: 192.168.1.100–200 (DHCP oder manuell)

# Netzwerk neustarten (Notfall):
sudo systemctl restart networking  # Linux
# macOS: System Preferences → Network → Advanced → DNS (Flush)
# Windows: ipconfig /all → dann ipconfig /release & ipconfig /renew
```

---

## 🟠 MAJOR ISSUES (Funktionalität beeinträchtigt, aber Event läuft)

### Problem 3: Spieler-Anmeldung funktioniert nicht

**Symptome:**
- Player-Browser (`/play`) lädt, aber Anmeldeformular funktioniert nicht
- "Anmelden"-Button klickt nicht
- Fehler: "Name already taken"

**Schnell-Diagnose:**
```bash
# Browser-Console öffnen (F12)
# Errors in der Console?
# Netzwerk-Request prüfen: POST /api/auth/register
```

**Fixes:**

#### Fix 3a: Name ist bereits vergeben
```bash
# Anderer Name eingeben
# Oder über Admin-Panel: Spieler-Tab → bereits vorhandenen Spieler editieren
```

#### Fix 3b: Netzwerk-Request schlägt fehl
```bash
# Browser-Console:
# Prüfe: Status-Code bei POST /api/auth/register
# - 409: Name exists (Fix 3a)
# - 500: Server-Fehler → siehe Server-Log

# Server-Log prüfen:
tail -50 lan-os-event*.log | grep "error\|POST.*register"
```

#### Fix 3c: localStorage deaktiviert
```bash
# Im Browser:
# F12 → Console → localStorage.getItem('sessionToken')
# Falls Error: localStorage in Privacy-Einstellungen aktivieren

# Alternative (im Browser-Konsole):
localStorage.setItem('sessionToken', 'test123')
localStorage.getItem('sessionToken')
```

---

### Problem 4: Voting funktioniert, aber Votes werden nicht gezählt

**Symptome:**
- Spieler klickt auf Spiel zum Abstimmen
- Stimme wird nicht in Live-Vote-Count angezeigt
- TV-Display zeigt Voting, aber Zahlen steigen nicht

**Schnell-Diagnose:**
```bash
# Browser-Console (Player):
# POST /api/player/vote Requests prüfen

# Admin-Panel:
# Voting-Tab → "Aktive Votes" zeigen?

# Server-Log:
# grep "vote\|VOTING" lan-os-event*.log
```

**Fixes:**

#### Fix 4a: Voting nicht aktiv (tournamentState nicht VOTING)
```bash
# Admin-Panel prüfen:
# Voting-Tab → "Voting starten" Knopf sichtbar?
# Evtl. System nicht in VOTING-State
# → Manual: "Voting starten" Button drücken
```

#### Fix 4b: Spieler-Role ist "Zuschauer"
```bash
# Admin-Panel → Spieler-Tab
# Spieler-Role prüfen: sollte "Spieler" sein (nicht "Zuschauer")
# Falls Zuschauer: Role ändern + Save
```

#### Fix 4c: Voting-Pool zu klein
```bash
# Admin-Panel → Voting-Tab
# Pool anzeigen: mindestens 4 Spiele erforderlich
# Falls < 4: mehr Spiele hinzufügen (Häkchen setzen)
```

---

### Problem 5: Match-Erstellung schlägt fehl

**Symptome:**
- "Match starten" Button reagiert nicht
- Fehler: "Cannot shake teams, not enough players"
- oder: "Match type invalid"

**Schnell-Diagnose:**
```bash
# Admin-Panel → Turnier-Tab
# Match-Type: 1v1, 2v2, team, ffa?
# Ausreichend online-Spieler?
# Server-Log: grep "match\|shake" lan-os-event*.log
```

**Fixes:**

#### Fix 5a: Nicht genug online-Spieler
```bash
# Admin-Panel → Spieler-Tab
# "Online"-Filter: wie viele sind online?
# 1v1 benötigt mindestens 2 Spieler
# 2v2 benötigt mindestens 4 Spieler

# Offline-Spieler: 30 Sekunden inaktiv → automatisch offline
# → Spieler-Device: neuer Tap oder Refresh `/play`
```

#### Fix 5b: Match-Type unterstützt nicht die Spieler-Anzahl
```bash
# Beispiel: 3 Spieler online, Match-Type 2v2 unmöglich
# Möglichkeiten:
# - 1v1 + 1 sitzt aus
# - team (3v0 oder 2v1)
# - Mehr Spieler hinzufügen / warten

# Admin-Panel: Manuell teams zusammenstellen (statt shake)
```

#### Fix 5c: Shake-Algorithmus-Bug
```bash
# Workaround: Manual Match-Creation
# Admin-Panel → Turnier-Tab
# Teams manuell zusammenstellen (nicht "shake")
# "Match starten" klicken
```

---

### Problem 6: Score-Eingabe funktioniert nicht

**Symptomen:**
- Spieler sieht Match-Screen, aber Score-Input-Felder sind disabled
- Button "Score einreichen" funktioniert nicht
- oder: Score wird eingegeben, aber nicht saved

**Schnell-Diagnose:**
```bash
# Player-Browser:
# Match-Screen öffnen (sollte sichtbar sein)
# Console: POST /api/player/score Requests

# Admin-Panel → Turnier-Tab:
# Match-Status: "active" oder "result-pending"?
```

**Fixes:**

#### Fix 6a: Match-Status nicht ACTIVE
```bash
# Admin-Panel → Turnier-Tab
# Match auswählen: Status muss "active" sein
# Falls "open": Admin klickt "Match starten"
# Falls "done": Match vorbei, neues Match erstellen
```

#### Fix 6b: Spieler nicht im Match-Team
```bash
# Admin-Panel → Turnier-Tab
# Match: teamA + teamB aufgelistet?
# Spieler in einem Team?
# Falls nicht: Match-Teams editieren + speichern
```

#### Fix 6c: Netzwerk-Latenz / API-Fehler
```bash
# Player-Console: POST /api/player/score → Status-Code?
# 401: Session-Token ungültig → neuer Login erforderlich
# 400: Request-Body invalid → Browser-Console für Details
# 500: Server-Error → Admin-System-Tab prüfen

# Workaround: Score über Admin-Panel eingeben
# Admin-Panel → Turnier-Tab → "Score-Override"
```

---

## 🟡 MINOR ISSUES (Ärgerlich, aber workaround vorhanden)

### Problem 7: TV-Display lädt langsam / laggt

**Symptome:**
- TV zeigt alte Daten
- Voting-Vote-Counter aktualisiert sich mit Verzögerung
- Match-Live-Score ist nicht live

**Schnell-Diagnose:**
```bash
# Browser-Console (TV-Display):
# Network-Tab: Response-Zeit von /api/state/public?
# Sollte < 500ms sein

# Server-Performance:
# ps aux | grep node: CPU + Memory-Auslastung?
```

**Fixes:**

#### Fix 7a: Polling-Intervall zu lang
```bash
# Ist im Code auf 1000ms (1 Sekunde) für TV gesetzt
# Das ist OK für LAN
# Netzwerk-Latenz überprüfen: ping 192.168.1.10 (sollte < 10ms sein)
```

#### Fix 7b: Server überlastet
```bash
# Server-Log: Dauer von State-Mutations prüfen
# Falls Mutations > 100ms: State ist zu groß oder Komponente langsam

# Workaround: kurz warten + Server gibt sich erholen

# Oder: Node.js Max-Memory erhöhen
# node --max-old-space-size=1024 dist/index.js
```

#### Fix 7c: Browser-Cache-Problem
```bash
# TV-Browser: Hard Refresh
# Ctrl+Shift+R (Chrome/Firefox)
# Cmd+Shift+R (macOS)

# Oder: neue URL mit Cache-Buster
# http://192.168.1.10:3000/tv?nocache=1234567890
```

---

### Problem 8: Wheel (Glücksrad) dreht sich nicht / laggt

**Symptome:**
- Spin-Start klicken, aber Wheel-Animation startet nicht
- Wheel dreht sich, aber ruckelig / nicht smooth
- Spin friert ein ("spinning forever")

**Schnell-Diagnose:**
```bash
# Browser (TV):
# Console: CSS Animations oder JavaScript-Fehler?
# Performance-Tab: Frame-Rate während Spin?
```

**Fixes:**

#### Fix 8a: GPU-Rendering-Problem
```bash
# Chrome Dev Tools:
# Performance-Tab → start recording → spin → stop
# Prüfe: Frame-Drops?

# Workaround: Browser-Hardware-Beschleunigung
# Chrome Settings → Advanced → System
# "Use hardware acceleration" = ON
```

#### Fix 8b: Wheel-Variante wechseln
```bash
# Admin-Panel → Voting-Tab
# "Wheel-Variante": pie, orbital, oder fortune
# Prübe: welche variant ist am schnellsten?
# (pie ist meist am schnellsten)
```

#### Fix 8c: Spin steckt fest
```bash
# Browser neu laden (TV: Ctrl+R)
# Oder: Admin-Panel → Voting-Tab → "Spin überspringen"
# Setzt State zurück auf RESULT
```

---

### Problem 9: Leaderboard zeigt falsche Punkte

**Symptomen:**
- Spieler-Punkte nach Match nicht aktualisiert
- Leaderboard-Ranking stimmt nicht überein
- Points addieren sich nicht korrekt

**Schnell-Diagnose:**
```bash
# Admin-Panel → Übersicht-Tab:
# Mini-Leaderboard prüfen
# Matches im Turnier-Tab: Points-Breakdown anzeigen?

# Server-Log:
# grep "pointsAwarded\|match-done" lan-os-event*.log
```

**Fixes:**

#### Fix 9a: Match nicht bestätigt
```bash
# Admin-Panel → Turnier-Tab
# Match-Status: "result-pending"?
# Falls ja: "Confirm Result" klicken
# Erst dann werden Points gebucht
```

#### Fix 9b: Modifier verfälscht Points
```bash
# Admin-Panel → Turnier-Tab → Match
# Modifier angezeigt? (z.B. "Hardcore ×1.5")
# Points-Breakdown anzeigen: 
#   base: 100 × modifier ×1.5 = 150

# Modifier deaktivieren (falls unerwünscht):
# Match-Settings → Modifier entfernen → Confirm
```

#### Fix 9c: Streak-Bonus falsch
```bash
# Spieler-Screen (`/play`):
# Eigener Streak anzeigen? ("3 in a row")
# Admin-Spieler-Tab: Streak-Status für Spieler?

# Streak-Logik:
# +1 bei Win, RESET bei Loss, unverändert bei Draw
# Bonus bei 3 Wins (+50) oder 5 Wins (+150) — einmalig
```

---

### Problem 10: Checkpoint kann nicht restored werden

**Symptome:**
- Restore-Button klickt nicht
- Error: "Cannot restore"
- State bleibt unverändert nach Restore

**Schnell-Diagnose:**
```bash
# Admin-Panel → System-Tab:
# Checkpoint-Liste angezeigt?
# Datei-Namen: checkpoint_*.json?

# Datei-System:
# ls -la /home/user/LAN-OS/data/checkpoints/
```

**Fixes:**

#### Fix 10a: Kein Checkpoint vorhanden
```bash
# Mindestens einen Checkpoint erstellen:
# Admin-Panel → System-Tab → "Backup jetzt"
# Dann Restore versuchen
```

#### Fix 10b: Checkpoint-Datei beschädigt
```bash
# Datei manuell prüfen:
# cat /home/user/LAN-OS/data/checkpoints/checkpoint_*.json | jq .

# Falls JSON-Parse-Error: Datei ist corrupt
# Workaround: älteren Checkpoint aus Liste wählen
# oder: neueste gültige Datei finden:
find /home/user/LAN-OS/data/checkpoints -name "checkpoint_*.json" \
  -exec sh -c 'jq . "$1" >/dev/null 2>&1 && echo "$1"' _ {} \;
```

#### Fix 10c: Restore setzt Match-State nicht korrekt
```bash
# Bekannte Einschränkung (MVP):
# Wenn Checkpoint während MATCH_ACTIVE erstellt wurde:
# Nach Restore: Match steht auf MATCH_SETUP (nicht MATCH_ACTIVE)
# → Admin muss Match manuell neustarten

# Workaround: Checkpoint VOR Match-Start erstellen
# (Pre-Match-Checkpoint: automatisch erstellt)
```

---

## 🟢 INFORMATION (Nicht unbedingt Problem, aber zu wissen)

### Frage 1: Wie lange dauert Auto-Checkpoint-Schreiben?

**Antwort:** ~100–500ms (abhängig von State-Größe)
- State-Größe mit 50 Spieler ≈ 200–500 KB
- Atomic Write: schreiben auf Disk + rename
- Läuft asynchron, blockiert nicht Server

---

### Frage 2: Offline-Spieler: wann als offline betrachtet?

**Antwort:** Nach 30 Sekunden ohne Polling-Request
- `config.heartbeatTimeoutSec = 30` (Standardwert)
- Spieler-Browser muss `/api/state/player/:id` alle 2 Sekunden polle
- Falls Browser zugemacht: Spieler nach 30s offline
- Offline-Spieler: teilnehmen nicht an neuem Voting/Match

**Workaround:** Browser nicht schließen, nur minimieren

---

### Frage 3: Was passiert mit Punkten nach Hard Reset?

**Antwort:** Alle Punkte werden auf 0 zurückgesetzt
- Admin-Panel → System-Tab → "Hard Reset" (doppel-confirm!)
- State wird auf `createEmptyState()` zurückgesetzt
- Spieler bleiben aber in der Liste (können editiert werden)
- Checkpoints werden NICHT gelöscht (können genutzt werden um zu restoren)

**Sicherer:** Erst Checkpoint erstellen, dann Reset

---

### Frage 4: Können mehrere Admin-Browser offen sein?

**Antwort:** Ja, aber nur einer sollte Mutations schreiben
- Admin 1: `/admin` (macht Changes)
- Admin 2: `/admin` (nur Übersicht lesen?)
- Bei gleichzeitigen Changes: letzter gewinnt (State-Version schützt vor Conflicts)

**Empfehlung:** Nur ein Admin-Panel aktiv während Event

---

### Frage 5: Wo finde ich Debug-Infos?

**Antwort:**
```bash
# Server-Log:
tail -100 lan-os-event*.log

# Browser-Console (F12):
# Player-Browser: LocalStorage, API-Requests
# TV-Display: Polling-Requests, Render-Fehler
# Admin-Panel: State-Mutations, Error-Messages

# System-Tab (Admin):
# EventLog anzeigen (letzter 50 Einträge)
# Checkpoint-Liste
# Version + Memory-Info (TODO: noch implementieren)
```

---

## 🔗 ESCALATION DECISION TREE

```
├─ Server startet nicht
│  ├─ Port 3000 belegt? → Fix 1b
│  ├─ Node nicht installiert? → SETUP.md Schritt 1
│  └─ Build fehlgeschlagen? → npm run build (sauberer Build)
│
├─ Clients können nicht connecten
│  ├─ Falsche Admin-IP? → Fix 2a
│  ├─ Firewall blockiert Port 3000? → Fix 2b
│  └─ Netzwerk-Problem (DHCP/WiFi)? → Fix 2c
│
├─ Voting/Matching funktioniert nicht
│  ├─ Server läuft, aber Funktionen broken? → Server-Log prüfen + Restart
│  ├─ Einzelner Spieler betroffen? → Fix 3a–3c
│  └─ Alle Spieler betroffen? → Admin-Panel → System-Tab → Hard Reset + Restore
│
├─ Daten-Verlust / Fehler im State
│  ├─ Checkpoint vorhanden? → Restore versuchen (Fix 10a–10c)
│  ├─ Checkpoint auch beschädigt? → älterer Checkpoint
│  └─ Alles weg? → Hard Reset + von vorne beginnen
│
└─ Performance-Problem / Lag
   ├─ TV-Display laggt? → Fix 7a–7c
   ├─ Wheel dreht sich nicht? → Fix 8a–8c
   └─ Server-Speicher-Leak? → Server neu starten + Logs prüfen
```

---

## 📞 WENN ALLES ELSE FAILS

**Notfall-Optionen (in dieser Reihenfolge):**

1. **Server neustarten**
   ```bash
   pkill -f "npm\|node"
   cd /home/user/LAN-OS
   npm run start
   ```

2. **Hard Reset + Recovery**
   ```bash
   # Admin-Panel → System-Tab
   # 1. Checkpoint "pre-event" finden
   # 2. Restore aus Checkpoint
   # 3. Voting starten und von dort weitermachen
   ```

3. **Fallback: alte Checkpoints prüfen**
   ```bash
   ls -lrt /home/user/LAN-OS/data/checkpoints/
   # Ältester = letzter stabiler State?
   # → Restore aus diesem Checkpoint
   ```

4. **Zeitüberschreitung: manuell Points nachtragen**
   ```bash
   # Falls State völlig corrupted:
   # Admin-Panel → Spieler-Tab
   # Jeden Spieler: manuell Punkte korrigieren
   # Admin-Panel → System-Tab → "Backup jetzt"
   # (für nächstes Mal)
   ```

5. **Letzter Ausweg: alle Devices refreshen + neu connecten**
   ```bash
   # Clients:
   # Ctrl+Shift+R (hard refresh) auf allen Devices
   
   # Admin-Panel:
   # Reload + neu connecten
   
   # TV-Display:
   # Reload + neu connecten
   ```

---

**Document Version:** 1.0 (2026-05-10)
**Last Updated:** 2026-05-10
**Escalation Contact:** TBD (Developer)
