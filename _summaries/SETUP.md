# SETUP.md — LAN-OS Server & Client Deployment

**Für:** LAN-Party Event Operator (Admin)
**Dauer:** ~15 Minuten zum Einrichten
**Target:** Express Server auf Admin-PC + Browser Clients im LAN

---

## 🚀 QUICK START (5 MINUTES)

```bash
# 1. Repository klonen (falls noch nicht geschehen)
cd /path/to/LAN-OS
git pull origin main

# 2. Dependencies installieren
npm install

# 3. Production Build erstellen
npm run build

# 4. Server starten
npm run start
```

**Server läuft auf:** `http://localhost:3000`
- TV-Display: `http://localhost:3000/tv`
- Player-Browser: `http://localhost:3000/play`
- Admin-Panel: `http://localhost:3000/admin`

---

## 📋 DETAILED SETUP (Schritt für Schritt)

### SCHRITT 1: Admin-PC Vorbereitung

#### 1.1 Node.js installieren (falls noch nicht geschehen)
```bash
# macOS (homebrew)
brew install node

# Linux (apt)
sudo apt-get install nodejs npm

# Windows
# Download: https://nodejs.org (LTS version)
# oder via chocolatey: choco install nodejs
```

**Verifizierung:**
```bash
node --version  # sollte v20+ sein
npm --version   # sollte v10+ sein
```

#### 1.2 Admin-PC IP-Adresse herausfinden
```bash
# macOS / Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig

# Example Output: 192.168.1.10 (merken für Spieler-Devices!)
```

---

### SCHRITT 2: LAN-OS Repository & Dependencies

```bash
# Repository klonen (oder existierendes aktualisieren)
git clone https://github.com/your-org/LAN-OS.git
cd LAN-OS

# Dependencies installieren (workspace-mode)
npm install

# Falls npm install fehlschlägt:
npm install --legacy-peer-deps
```

**Verifizierung:**
```bash
# Sollte alle 3 Packages zeigen
npm list --depth=0 --workspaces
# Output sollte sein:
# lan-os (root)
# ├── packages/server
# ├── packages/client
# └── packages/shared
```

---

### SCHRITT 3: Production Build

```bash
# Kompiliert TypeScript + bundelt Client mit Vite
npm run build

# Prüfe, dass dist-Verzeichnis erstellt wurde:
ls -la packages/client/dist/
# Sollte zeigen: tv.html, play.html, admin.html + assets/

# Build-Zeit: ~30–60 Sekunden (normal)
```

**Wenn Build fehlschlägt:**
```bash
# Sauberer Build (alles neu compilieren)
rm -rf packages/*/dist
npm run build

# Oder einzeln debuggen:
npm run build:shared
npm run build:server
npm run build:client
```

---

### SCHRITT 4: Data Directory vorbereiten

```bash
# Optional: separates Backup-Verzeichnis für Checkpoints
mkdir -p /mnt/backup/lan-os-data
# oder
mkdir -p ~/LAN-OS-Backup

# Server verwendet default: ./data (im Repo-Root)
# Oder via Umgebungsvariable:
export LAN_OS_DATA_DIR=/mnt/backup/lan-os-data
```

---

### SCHRITT 5: Firewall öffnen (Port 3000)

#### macOS
```bash
# Firewall prüfen
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getstatus

# Erlauben (falls nötig):
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off
# oder spezifisch für node:
# System Settings → Security & Privacy → Firewall Options
```

#### Windows
```bash
# PowerShell (Admin)
New-NetFirewallRule -DisplayName "LAN-OS Port 3000" `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000

# Verifizierung:
netstat -ano | findstr :3000
```

#### Linux (UFW)
```bash
# UFW (falls aktiv)
sudo ufw allow 3000/tcp
sudo ufw status

# oder direkt iptables (ohne UFW):
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

---

### SCHRITT 6: Server starten

**⚠️ WICHTIG:** Verwende **NICHT** `npm run dev` während des Events!
- `npm run dev` benötigt `tsx` im npm-PATH (kann in Monorepo-Setups fehlschlagen)
- **Immer verwenden:** `npm run start` (oder `npm run start:fresh` für sauberer Rebuild)

```bash
# Standard-Start (Port 3000) — EMPFOHLEN
npm run start

# Mit Logging in Datei (empfohlen für Event)
npm run start 2>&1 | tee lan-os-event-$(date +%Y%m%d_%H%M%S).log

# Sauberer Start (Build + Start in einem Schritt)
npm run start:fresh

# Mit benutzerdefiniertem Port (falls 3000 belegt)
PORT=8080 npm run start

# Mit benutzerdefiniertem Data-Dir
LAN_OS_DATA_DIR=/mnt/backup/lan-os-data npm run start
```

**Erfolgreiches Start-Signal:**
```
╔════════════════════════════════════════╗
║       LAN OS — Server gestartet        ║
╠════════════════════════════════════════╣
║  http://localhost:3000/admin           ║
║  http://localhost:3000/play            ║
║  http://localhost:3000/tv              ║
╚════════════════════════════════════════╝
```

**Falls Server nicht startet:**
- Port 3000 belegt? `lsof -i :3000` (macOS/Linux) oder `netstat -ano | findstr :3000` (Windows)
- Node nicht installiert? → Schritt 1.1 wiederholen
- Build fehlgeschlagen? → Schritt 3 erneut versuchen

---

## 🖥️ SCHRITT 7: Admin-PC Browser-Setup

### 7.1 Admin-Interface & TV-Display starten
```bash
# Öffne zwei Browser-Fenster / Tabs auf Admin-PC:

# Fenster 1 (oder Tab): Admin-Panel
http://localhost:3000/admin

# Fenster 2 (oder 2. Monitor): TV-Display
http://localhost:3000/tv
```

### 7.2 Admin-Panel Konfiguration (erste Anmeldung)
1. Öffne `/admin` im Browser
2. **Übersicht Tab:**
   - Tracks aktivieren: `TOURNAMENT` ✅ (Standard)
   - Optional: `SOULMASK` ✅ (für Co-op-Modus)
3. **Spieler Tab:**
   - Keine Spieler initial (werden durch Self-Service-Anmeldung hinzugefügt)
   - Oder manuell hinzufügen zur Vorbereitung
4. **Voting Tab:**
   - Voting-Mode wählen: `MULTI` (empfohlen) oder `ELIMINATION`
   - Spiel-Pool zusammenstellen (Häkchen setzen)
   - Timer: 120 Sekunden (default, anpassbar)
   - Wheel-Variante: `pie` (Standard) oder `orbital` / `fortune`
5. **Turnier Tab:**
   - Match-Erstellungs-Methode: `shake` (zufällig) oder `manual`
6. **System Tab:**
   - Prüfe: keine Error-Messages
   - `autoCheckpoint: enabled`

---

## 📱 SCHRITT 8: Spieler-Devices verbinden

### 8.1 Spieler-Device Browser öffnen
```
URL: http://[ADMIN_IP]:3000/play
Beispiel: http://192.168.1.10:3000/play
```

### 8.2 Self-Service Player-Anmeldung
1. **Name eingeben** (z.B. "Player1")
   - Muss eindeutig sein (Fehler, wenn bereits verwendet)
2. **Optional:** Farbe wählen
   - Wird auto-vergeben aus Palette (Wunsch wird berücksichtigt)
3. **"Anmelden" klicken**
4. **Session-Token** wird im Browser-LocalStorage gespeichert
5. Player erscheint in Admin-Panel → **Spieler Tab**

### 8.3 Multiple Spieler (Simulation vor Event)
- Für jeden Spieler: neuen Browser-Tab + `/play` öffnen
- Unterschiedliche Namen eingeben
- Alle sollten im Admin-Spieler-Tab sichtbar sein

---

## ✅ SCHRITT 9: Schnelltest (Funktionalität prüfen)

### 9.1 Server & Network Check
```bash
# Von anderem Gerät im LAN prüfen:
curl -s http://192.168.1.10:3000/api/state/public | jq .
# Sollte JSON mit State ausgeben
```

### 9.2 Voting durchführen
1. **Admin-Panel → Voting Tab:**
   - Pool zusammenstellen (4–8 Spiele)
   - "Voting starten" klicken
2. **Player-Browser (`/play`):**
   - Pool mit Spielen sehen?
   - Auf Spiele klicken zum Abstimmen?
3. **TV-Display (`/tv`):**
   - Live-Votes mit Avataren sichtbar?
   - Counter aktualisiert sich?

### 9.3 Match durchführen
1. **Voting beenden** → Rad spinnt
2. **Admin-Panel → Turnier Tab:**
   - Match-Type wählen (1v1, 2v2, team, ffa)
   - Teams zusammenstellen oder "shake" für zufällig
   - "Match starten" klicken
3. **Player-Browser (`/play`):**
   - Score-Eingabe-Feld zeigen?
4. **TV-Display (`/tv`):**
   - Live-Match mit Teams sichtbar?

### 9.4 Match-Ergebnis bestätigen
1. **Player-Browser:** Scores eingeben
2. **Admin-Panel → Turnier Tab:** "Score bestätigen"
3. **Leaderboard aktualisiert?**
4. **Admin-System Tab:** Checkpoint erstellt?

---

## 🔧 TROUBLESHOOTING QUICK REFERENCE

| Problem | Lösung |
|---------|--------|
| "Port 3000 already in use" | `lsof -i :3000` (kill alte Prozesse) oder `PORT=8080 npm run start` |
| "Cannot find module" | `npm install` erneut laufen |
| Clients können Server nicht erreichen | Admin-IP überprüfen (`ifconfig`), Firewall Port 3000 öffnen |
| Server startet, aber Seiten laden nicht | `npm run build` erneut ausführen |
| Spieler-Anmeldung funktioniert nicht | Browser-Console prüfen (F12), localStorage aktivieren |
| Voting startet nicht | Pool hat < 4 Spiele? → mindestens 4 im Pool setzen |
| Match kann nicht bestätigt werden | Beide Teams müssen Scores eingegeben haben |

---

## 🚀 AUTO-START SCRIPT (optional, für Event-Day)

**Datei:** `/home/user/LAN-OS/run-lan-os.sh`

```bash
#!/bin/bash

set -e

# LAN-OS Auto-Start mit Logging + Auto-Restart

PROJECT_DIR="/home/user/LAN-OS"
DATA_DIR="${LAN_OS_DATA_DIR:=$PROJECT_DIR/data}"
LOG_DIR="/home/user/lan-os-logs"
PORT="${PORT:=3000}"

mkdir -p "$DATA_DIR"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/lan-os-$(date +%Y%m%d_%H%M%S).log"

echo "═══════════════════════════════════════════════════════════"
echo "LAN-OS Server Start — $(date)"
echo "═══════════════════════════════════════════════════════════"
echo "Project Dir:  $PROJECT_DIR"
echo "Data Dir:     $DATA_DIR"
echo "Log File:     $LOG_FILE"
echo "Port:         $PORT"
echo "═══════════════════════════════════════════════════════════"
echo ""

cd "$PROJECT_DIR"

# Build falls noch nicht geschehen
echo "Checking build..."
if [ ! -d "packages/client/dist" ]; then
    echo "Build not found, compiling..."
    npm run build
fi

# Server starten mit Logging
echo "Starting server..."
LAN_OS_DATA_DIR="$DATA_DIR" PORT="$PORT" npm run start 2>&1 | tee -a "$LOG_FILE"
```

**Executable machen + starten:**
```bash
chmod +x /home/user/LAN-OS/run-lan-os.sh
/home/user/LAN-OS/run-lan-os.sh
```

---

## 📊 SYSTEMANFORDERUNGEN (Minimum)

| Komponente | Empfehlung |
|-----------|-----------|
| **CPU** | Intel i5 / AMD Ryzen 5 (2020+) |
| **RAM** | 8 GB (4 GB Minimum) |
| **SSD/HDD** | 1 GB freier Platz (für Checkpoints) |
| **Network** | WiFi 5GHz oder Ethernet |
| **Node.js** | v20+ (LTS empfohlen) |
| **Browser** | Chrome, Firefox, Safari, Edge (modern) |

---

## ⏱️ STARTUP CHECKLIST (Tag des Events, 30 Minuten vorher)

- [ ] Admin-PC hochgefahren, verbunden mit LAN
- [ ] Terminal öffnen, in `/home/user/LAN-OS` navigieren
- [ ] `npm run start 2>&1 | tee event.log` ausführen
- [ ] Server-Start-Message prüfen ("Server gestartet")
- [ ] Admin-Browser: `/admin` öffnen
- [ ] TV-Browser/Monitor: `/tv` öffnen
- [ ] Tracks aktivieren (TOURNAMENT ✅)
- [ ] 2–3 Test-Spieler anmelden (zur Verifikation)
- [ ] Voting starten + kurz testen
- [ ] Match durchführen + Result confirm
- [ ] Leaderboard prüfen
- [ ] Checkpoint-Liste zeigt Einträge?
- [ ] System-Tab: keine Error-Messages?
- [ ] **READY!** 🎮

---

## 📞 NOTFALL-CONTACTS (während Event)

- **Server crasht:** Neue Shell, `npm run start` erneut
- **Spieler können sich nicht verbinden:** Admin-IP + Port 3000 prüfen, Firewall
- **Voting/Match funktioniert nicht:** Admin-System-Tab prüfen, ggf. Browser neuladen
- **Performance-Probleme:** `ps aux | grep node` — Memory/CPU?
- **Daten-Verlust:** Checkpoint in Admin-System-Tab → Restore

---

**Document Version:** 1.0 (2026-05-10)
**Last Updated:** 2026-05-10
