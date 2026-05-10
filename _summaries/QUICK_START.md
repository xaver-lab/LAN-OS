# QUICK_START.md — 5-Minuten Blitz-Anleitung

**Für:** Eilige Admin, die sofort loslegen wollen
**Dauer:** 5 Minuten zum Starten + 10 min für erste Tests
**Vollständige Docs:** siehe SETUP.md und ADMIN_GUIDE.md

---

## 🚀 GO! (5 MINUTEN)

### 1. Terminal öffnen + Code
```bash
cd /home/user/LAN-OS
npm install
npm run build
npm run start 2>&1 | tee event.log
```

**Erfolgreich, wenn:**
```
╔════════════════════════════════════════╗
║       LAN OS — Server gestartet        ║
╠════════════════════════════════════════╣
║  http://localhost:3000/admin           ║
║  http://localhost:3000/play            ║
║  http://localhost:3000/tv              ║
╚════════════════════════════════════════╝
```

### 2. Browser öffnen (2 Fenster auf Admin-PC)
```
Fenster 1: http://localhost:3000/admin    (Admin-Panel)
Fenster 2: http://localhost:3000/tv       (TV-Display)
```

### 3. Admin-Panel Setup (30 Sekunden)
1. **Übersicht-Tab** → TOURNAMENT Track ✅
2. **Voting-Tab** → 4–8 Spiele ankreuzen, Timer 120s
3. **Turnier-Tab** → prüfe, dass Button sichtbar ist

### 4. Test-Spieler anmelden (2 Minuten)
```
Öffne neue Tabs: http://[ADMIN_IP]:3000/play

Beispiel-IP: http://192.168.1.10:3000/play
(von Admin-PC aus: http://localhost:3000/play)

Gib Namen ein: "Player1", "Player2", "Player3"
```

### 5. Erste Voting durchführen (1 Minute)
1. **Admin-Panel → Voting-Tab** → "Start Voting"
2. **Player-Browser** → Spiele ansehen + klicken zum Abstimmen
3. **TV-Display** → Live-Vote-Counter sehen?
4. Nach 120s: Rad spinnt automatisch

---

## ✅ QUICK CHECKLIST

- [ ] Server läuft (siehe Terminal-Output oben)
- [ ] Admin-Panel öffnet sich (`/admin`)
- [ ] TV-Display öffnet sich (`/tv`)
- [ ] Mind. 2–3 Test-Spieler angemeldet (Spieler-Tab zeigt sie)
- [ ] Voting gestartet + Spieler können abstimmen
- [ ] Rad spinnt nach Voting

---

## 🎮 ERSTE MATCH SPIELEN (2 MINUTEN)

Nach Voting + Rad-Spin:

1. **Admin-Panel → Turnier-Tab**
   - Game: ist automatisch aus Voting (z.B. "CS:GO")
   - Type: `1v1` (einfach)
   - Creation: `Shake` (zufällig)
   - **[Create & Start Match]** klicken

2. **Player-Browser**
   - Score-Input-Felder sichtbar?
   - 1–3 eingeben, "Submit" klicken

3. **Admin-Panel → Turnier-Tab**
   - Scores angezeigt?
   - **[Confirm Result]** klicken

4. **Übersicht-Tab**
   - Leaderboard aktualisiert?
   - Spieler-Punkte gestiegen?

---

## 🆘 SCHNELL-FIXES

| Problem | Fix |
|---------|-----|
| Server startet nicht | `npm run build` nochmal |
| Clients können nicht connecten | IP korrekt? (`ifconfig`) |
| Voting-Button inaktiv | Spieler nicht in Pool oder Spieler-Role ist "Zuschauer" |
| Match kann nicht starten | < 2 Spieler online? Refresh `/play` |
| Score-Input nicht sichtbar | Match-Status ist nicht "active" → "Create & Start" klicken |

---

## 📞 WEITERHILFE

- **Ausführliches Setup:** siehe `SETUP.md`
- **Alle Admin-Features:** siehe `ADMIN_GUIDE.md`
- **Fehlersuche:** siehe `TROUBLESHOOTING.md`
- **Checklist vor Event:** siehe `LAN_READY_CHECKLIST.md`

---

## 🎯 TYPISCHER EVENT-FLOW

```
1. Server starten (oben)
2. Admin-Panel + TV-Display öffnen
3. Tracks aktivieren (TOURNAMENT)
4. Spieler-Anmeldung (Self-Service via /play)
5. Voting starten
6. Rad spinnen
7. Match erstellen
8. Scores eingeben + bestätigen
9. (Wiederhole 5–8 bis Event vorbei)
10. Hard Checkpoint vor Event-Ende
11. Export Leaderboard
12. Server beenden
```

---

**Die nächsten 30 Minuten:**
1. Diesen Quick-Start durcharbeitet ✓
2. Dann ADMIN_GUIDE.md alle 6 Tabs erkunden
3. Dann SETUP.md für Firewall + Network Config
4. Dann TROUBLESHOOTING.md als Notfall-Reference bookmarken

**Viel Erfolg! 🎮**
