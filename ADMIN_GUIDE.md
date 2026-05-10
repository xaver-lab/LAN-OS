# ADMIN_GUIDE.md — Admin-Panel Walkthrough

**Für:** Event-Administrator / Turnierleiter
**Dauer:** 5 Minuten zum Lernen, dann intuitive Navigation
**URL:** http://localhost:3000/admin (oder http://[ADMIN_IP]:3000/admin)

---

## 📍 MAIN LAYOUT

```
┌─────────────────────────────────────────────────────────┐
│         LAN OS ADMIN CONTROL PANEL                      │
├─────────────────────────────────────────────────────────┤
│ [Übersicht] [Spieler] [Voting] [Turnier] [Soulmask] [System] │  ← TAB-NAVIGATION
├─────────────────────────────────────────────────────────┤
│                                                         │
│               [TAB CONTENT HIER]                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 TAB 1: ÜBERSICHT (Overview)

**Punkt:** Schnelleinsicht in System-Status + Track-Steuerung

### Elemente:

#### 1.1 Track-Toggles (Oben)
```
🎮 TOURNAMENT [Toggle: ON/OFF]
🌍 SOULMASK   [Toggle: ON/OFF]
```
- **TOURNAMENT:** Standard aktiviert (Voting + Match-System)
- **SOULMASK:** Optional (Co-op Modus mit Rollen + Tasks)
- Beide können gleichzeitig laufen!

#### 1.2 Quick-Stats (Mitte)
```
Online Players:        42/50
Active Matches:        1
Tournament State:      VOTING
Last Match Winner:     "Player1" (CS:GO)
Server Uptime:         02:34:15
Memory Usage:          145 MB
```
- Aktualisiert sich automatisch alle 1 Sekunde
- Wenn "Online Players" < 5: Warnung anzeigen

#### 1.3 UI-Preferences (Unten)
```
TV Theme:    [Dark Arcade ▼]    (dark-arcade / synthwave / arctic)
Wheel Style: [Pie ▼]             (pie / orbital / fortune)
```
- Diese Einstellungen beeinflussen TV-Display live
- Keine permanente Persistierung (nur für aktuelle Session)

#### 1.4 Mini-Leaderboard (Rechts)
```
TOP 5 Players:
1. Player1    1500 pts
2. Player2     950 pts
3. Player3     800 pts
4. Player4     650 pts
5. Player5     450 pts
```

---

## 👥 TAB 2: SPIELER (Players Management)

**Punkt:** Spieler-Verwaltung (Hinzufügen, Bearbeiten, Kicking)

### Layout:
```
┌──────────────────────────────────────────────────────────┐
│ Filter: [Online ▼] [Role: Alle ▼]  [Search...]          │
├──────────────────────────────────────────────────────────┤
│ Name        | Role      | Points | Online | Actions      │
├──────────────────────────────────────────────────────────┤
│ Player1     | Spieler   | 1500   | ✓      | [E] [Warn] [K]│
│ Player2     | Spieler   |  950   | ✗      | [E] [Warn] [K]│
│ Admin       | Admin     | 2000   | ✓      | [E]           │
│ Spectator1  | Zuschauer |    0   | ✓      | [E] [Warn] [K]│
└──────────────────────────────────────────────────────────┘

[+ Add Player Manually]
```

### Aktionen pro Spieler:

#### Action [E] — Edit
**Öffnet Dialog:**
```
Name:        [Player1          ]
Color:       [🟢 Green ▼]
Role:        [Spieler ▼]
Tracks:      ☑ TOURNAMENT  ☑ SOULMASK
Points:      [1500]

[Save] [Cancel]
```
- **Name:** nur ändern, wenn noch nicht im Event registriert
- **Color:** auto-vergeben, aber änderbar aus Palette
- **Role:** 
  - `Spieler` = normaler Turniereilnehmer
  - `Zuschauer` = darf nicht wählen/spielen
  - `GameMaster` = darf Matches freigeben
  - `ShowOperator` = darf Rad spinnen
  - `SoulmaskLead` = darf Rollen/Tasks verwalten
  - `Admin` = Vollzugriff
- **Tracks:** welchen Tracks der Spieler zugeordnet ist

#### Action [Warn] — Warning geben
- `warnings` Counter +1
- Nach 3 Warnings: optional automatisch Kick

#### Action [K] — Kick (DANGER!)
- Bestätigungs-Dialog: "Wirklich kicken?"
- Spieler wird `online: false` gesetzt
- sessionToken wird invalidiert
- Spieler kann sich neu anmelden (wird als neuer Spieler betrachtet)

#### [+ Add Player Manually]
**Dialog:**
```
Name:   [New Player   ]
Color:  [Auto ▼]
Role:   [Spieler ▼]

[Add] [Cancel]
```
- Für Spieler, die sich nicht selbst anmelden können (z.B. Turnierleiter vor Event)
- Nach Manual-Add: Spieler kann sich mit gleichem Namen anmelden → existierender Spieler wird aktualisiert

---

## 🗳️ TAB 3: VOTING (Abstimmung & Rad)

**Punkt:** Voting-Session steuern, Spiel-Pool zusammenstellen, Rad-Variant wählen

### Layout:

#### 3.1 Voting-Modus
```
Voting Mode:  [MULTI ▼]  (MULTI oder ELIMINATION)

ℹ️ MULTI: Jeder gibt mehrere Stimmen ab → höchste Stimmenzahl gewinnt
ℹ️ ELIMINATION: Jeder gibt 1 Strike-Stimme ab → der meiste Strikes raus, dann Rad
```

#### 3.2 Spiel-Pool (Game Pool)
```
Verfügbare Spiele:
┌─────────────────────────────────────────────────────┐
│ ☐ CS:GO              [FPS]          Turniereignung: 85 │
│ ☑ League of Legends  [Strategy]     Turniereignung: 92 │
│ ☑ Dota 2             [Strategy]     Turniereignung: 90 │
│ ☐ Valorant           [FPS]          Turniereignung: 88 │
│ ☑ Rocket League      [Sports]       Turniereignung: 75 │
│ ☑ SSF6                [Fighting]     Turniereignung: 72 │
│ ☑ Starcraft 2        [RTS]          Turniereignung: 95 │
│ ☐ Minecraft          [Sandbox]      Turniereignung: 40 │
└─────────────────────────────────────────────────────┘

✓ 6 Spiele im aktiven Pool (Min: 4, Max: 8)
```
- **Häkchen setzen** = ins Voting-Pool
- **Min Pool:** 4 Spiele
- **Max Pool:** 8 Spiele
- Turniereignung (AI-Score): Hinweis für gute Spiele

#### 3.3 Voting-Parameter
```
Voting Timer:       [120] Sekunden    (Slider: 30–300)
Max Votes per Player (MULTI): [∞] (null = unbegrenzt)

[Start Voting] [Stop Voting] [Cancel Voting]
```

#### 3.4 Wheel-Style
```
Wheel Variant: [Pie ▼]  (pie / orbital / fortune)
```

#### 3.5 Live-Voting-Infos (während Voting läuft)
```
Status: VOTING (aktiv)
Timer: 87 Sekunden verbleibend

Spiel-Votes:
┌────────────────────────────────────────┐
│ League of Legends  ▪▪▪▪▪▪▪ 12 Votes  │
│ Dota 2             ▪▪▪▪▪▪ 10 Votes  │
│ Starcraft 2        ▪▪▪▪▪ 8 Votes   │
│ Rocket League      ▪▪▪ 4 Votes     │
└────────────────────────────────────────┘

[End Voting Now] [Extend Timer +30s] [Cancel]
```

#### 3.6 Tie-Break Dialog (falls 2+ Spiele gleich viele Votes)
```
⚠️ TIE DETECTED!

League of Legends: 12 Votes
Dota 2:           12 Votes

[Spin über beide] [Manual Override → League] [Cancel]
```

---

## 🎮 TAB 4: TURNIER (Match Management)

**Punkt:** Matches erstellen, steuern, Scores eingeben, Modifier, MVP

### Layout:

#### 4.1 Match-Erstellung
```
Neuen Match starten:

Game:         [Starcraft 2 ▼]    (aus letzter Voting/RESULT)
Match-Type:   [1v1 ▼]            (1v1 / 2v2 / team / ffa)
Creation:     [Shake ▼]          (Shake = zufällig / Manual = manuell)

Wenn Manual:
┌─────────────────────────────────────────┐
│ Team A:  ☑ Player1 ☑ Player3           │
│ Team B:  ☑ Player2 ☑ Player4           │
└─────────────────────────────────────────┘

[Create Match] [Cancel]
```

#### 4.2 Aktiver Match (MATCH_SETUP / MATCH_ACTIVE)
```
CURRENT MATCH:

Game:          Starcraft 2
Type:          1v1
Status:        MATCH_ACTIVE  ← aktueller State

Teams:
├─ Team A: Player1 (250 Points)
└─ Team B: Player2 (180 Points)

Scores:
┌────────────────────────────────────────┐
│ Team A: [3]                            │
│ Team B: [1]                            │
└────────────────────────────────────────┘

Modifiers (optional):
[+ Add Modifier]
- Hardcore ×1.5
  [Remove]

MVP (optional):
[Assign MVP: Player1 ▼]

[Start Match] [Submit Scores] [Confirm Result] [Cancel] [Reset Scores]
```

#### 4.3 Match-History
```
PREVIOUS MATCHES:

Round 1, Match 1: CS:GO 1v1
├─ Player1 vs Player2
├─ Scores: 3-2
├─ Result: DONE (100 + 25 pts awarded)
└─ [Details] [Replay]

Round 1, Match 2: Valorant 2v2
├─ (Player3 + Player4) vs (Player5 + Player6)
├─ Scores: 7-5
├─ Result: DONE (80 + 50 pts awarded)
└─ [Details] [Replay]
```

#### 4.4 Modifier-System
```
Available Modifiers:
┌─────────────────────────────────────────────────────────┐
│ Hardcore           [Risk-Reward] ×1.5       [+]         │
│ Casual             [Risk-Reward] ×0.75      [+]         │
│ Underdog Bonus     [Balance]     +25 pts    [+]         │
│ Double Points      [Chaos]       ×2.0       [+]         │
│ No Voice Chat      [Chaos]       -          [+]         │
│ Streamer Mode      [Chaos]       -          [+]         │
└─────────────────────────────────────────────────────────┘

Selected for this Match:
- Hardcore ×1.5
- Underdog Bonus +25
  [Edit] [Remove]
```

---

## 🌍 TAB 5: SOULMASK (Co-op Track)

**Punkt:** Rollen verwalten, Tasks, Global Goals, Morale

### Layout (nur sichtbar wenn SOULMASK Track aktiv):

#### 5.1 Rollen-Zuordnung
```
Current Roles:
┌──────────────────────────────────────┐
│ Player1 → Builder   [Change ▼]       │
│ Player2 → Fighter   [Change ▼]       │
│ Player3 → Farmer    [Change ▼]       │
│ Player4 → Scout     [Change ▼]       │
│ Player5 → Unassigned [Assign ▼]      │
└──────────────────────────────────────┘

Default Roles Available:
🏗 Builder | ⚔ Fighter | 🌾 Farmer | 🧭 Explorer | 🛡 Support | 👁 Scout

[+ Add Custom Role]  [Edit Custom Roles]
```

#### 5.2 Tasks-Management
```
Tasks (pro Spieler + Rolle):

Player1 (Builder):
☐ Build walls
☑ Gather wood
☐ Repair gate
[+ Add Task]

Player2 (Fighter):
☐ Kill boars (3)
☑ Defend base
☑ Scout north
[+ Add Task]

[+ New Task] [Bulk Assign Tasks]
```

#### 5.3 Global Goals
```
Global Goals:

Progress-Meter:
┌─────────────────────────────────────┐
│ Base Camp aufbauen    [████████░░] 80%  [Edit]
│ Ressourcen sammeln    [██████░░░░] 60%  [Edit]
│ Gegner eliminieren    [██████████] 100% [Edit]
│ Territorium erkunden  [███░░░░░░░] 30%  [Edit]
└─────────────────────────────────────┘

Morale (abgeleitet): 68% (basiert auf Task-Completion)

[+ Add Custom Goal] [Reset All Progress]
```

#### 5.4 Role-History (Audit)
```
Role Changes (Timeline):
├─ 14:23 Player1: Scout → Builder
├─ 14:05 Player2: Fighter → Scout
├─ 13:42 Player3: unassigned → Fighter
└─ ...
```

---

## ⚙️ TAB 6: SYSTEM (Backup, Restore, Settings)

**Punkt:** Server-Status, Backup/Restore, Reset, Simulation Mode

### Layout:

#### 6.1 Server-Status
```
SERVER STATUS:

Uptime:           02:45:23
Memory Usage:     156 MB / 512 MB
State Version:    342
Schema Version:   3.0
Last Mutation:    14:32:47 (Voting ended)
EventLog Size:    245 entries
```

#### 6.2 Backup / Checkpoint-Management
```
[Backup Now]  [Download Logs]

Recent Checkpoints:
┌────────────────────────────────────────────────────────────┐
│ checkpoint_r2_1234567890.json    (manual)   2 min ago │ [▶ Restore] [🗑] │
│ checkpoint_prematch_r2_1234567889.json (auto) 5 min ago │ [▶ Restore] [🗑] │
│ checkpoint_r1_m3_1234567888.json    (auto)   12 min ago │ [▶ Restore] [🗑] │
│ checkpoint_r1_m2_1234567887.json    (auto)   17 min ago │ [▶ Restore] [🗑] │
│ checkpoint_start_event_1234567886.json (manual) 45 min ago │ [▶ Restore] [🗑] │
└────────────────────────────────────────────────────────────┘
```

**Restore-Dialog:**
```
⚠️ RESTORE CHECKPOINT?

Will restore state to: 2 minutes ago
Tournament State: VOTING → MATCH_SETUP
Players: 42 (no change)
Matches deleted: 0

[Confirm Restore] [Cancel]
```

#### 6.3 Simulation Mode (Test-Daten)
```
Simulation Mode: [Toggle: OFF]

ℹ️ Wenn aktiviert:
- Alle Mutations gehen in separaten State
- Echter State bleibt unverändert
- Ideal für Pre-Event-Tests
- simulationState wird separat persistiert

Simulation State:
─────────────────────────────────────────
Players: 8 (Test-Daten)
Matches: 3 (Test)
Tournament State: MATCH_ACTIVE

[Reset Simulation] [Copy to Real State] [Discard]
```

#### 6.4 Hard Reset (DANGER ZONE)
```
⚠️ HARD RESET

Setzt System vollständig zurück auf Default.

Wird GELÖSCHT:
- Alle Spieler
- Alle Matches
- Alle Punkte
- Voting-Session
- Soulmask-Data

Bleibt ERHALTEN:
- Config-Einstellungen
- UI-Preferences
- Checkpoints (für Recovery)
- EventLog (für Audit)

[Ich bin mir sicher → Bestätigung erforderlich]
↓
[CONFIRM HARD RESET]
```

#### 6.5 EventLog / System Log
```
Last 50 EventLog Entries:

14:32:47 [SYSTEM] Voting ended (MULTI)
14:32:45 [VOTE] Player1 voted for CS:GO
14:32:44 [VOTE] Player2 voted for Valorant
14:32:43 [VOTE] Player3 voted for CS:GO
14:30:00 [ADMIN-ACTION] Voting started (Mode: MULTI, Pool: 6 games)
14:25:15 [MATCH-DONE] CS:GO 1v1 confirmed: Player1 won (+100 pts)
14:24:30 [MATCH-START] CS:GO 1v1: Player1 vs Player2
13:59:42 [SYSTEM] Server started (recovered from MATCH_ACTIVE)
13:59:41 [PLAYER-JOIN] Player1 joined
...

[Export as CSV] [Download Log] [Clear Log]
```

---

## 🎯 QUICK WORKFLOW: Typische Event-Sequenz

### Minute 1: System Starten
1. **Übersicht-Tab:** TOURNAMENT Track an ✓
2. **Spieler-Tab:** Erste Test-Spieler anmelden (mind. 2–4)
3. **System-Tab:** "Backup jetzt" → Startzustand sichern

### Minute 5: Erstes Voting
1. **Voting-Tab:** 
   - Mode wählen (MULTI)
   - 4–8 Spiele in Pool (Häkchen setzen)
   - Timer auf 120s
   - "Start Voting" klicken
2. **Player-Browser:** Alle Spieler sehen Pool + abstimmen

### Minute 7: Rad spinnen
1. **Voting-Tab:** Timer läuft ab oder "End Voting Now"
2. Rad spinnt automatisch (falls Tie) oder nach Admin-Click

### Minute 8: Match starten
1. **Turnier-Tab:**
   - Game aus Voting-Ergebnis
   - Type: 1v1 / 2v2 / ffa?
   - Creation: Shake oder Manual?
   - "Create & Start Match"

### Minute 10: Match läuft
1. **Player-Browser:** Spieler sehen Score-Eingabe
2. **TV-Display:** Live-Match mit Teams + Live-Score
3. **Admin:** wartet auf Score-Eingabe

### Minute 12: Scores eingegeben
1. **Turnier-Tab:**
   - Scores angezeigt
   - MVP optional zuweisen
   - Modifier optional hinzufügen
   - "Confirm Result" klicken

### Minute 13: Punkte gebucht
1. **Übersicht-Tab:** Leaderboard aktualisiert
2. **System-Tab:** Auto-Checkpoint erstellt
3. Zurück zu Schritt 1 für nächstes Voting

---

## 🎮 KEYBOARD SHORTCUTS (TODO: implementieren)

| Shortcut | Action |
|----------|--------|
| `Alt+T` | Toggle TOURNAMENT Track |
| `Alt+S` | Toggle SOULMASK Track |
| `Alt+V` | Go to Voting Tab |
| `Alt+M` | Go to Match Tab |
| `Space` | Start Voting / Start Spin / Confirm Match |
| `Esc` | Cancel aktuelle Dialog |

---

## 💡 PRO TIPS

1. **Checkpoints strategisch nutzen:**
   - Vor jeder neuen Voting-Runde: Checkpoint setzen
   - Falls Fehler: schnell zurückspulen

2. **Spieler-Verwaltung:**
   - Offline-Spieler nach 2–3 Runden weg → können neu joinen
   - "Warn" akkumuliert sich → bei 3 Warns kicken

3. **Voting-Timing:**
   - 120s ist gut für 20–30 Spieler
   - 180s für > 50 Spieler (mehr Zeit zum Abstimmen)
   - < 4 Spiele: Admin kann Spiele hinzufügen während Voting

4. **Match-Fairness:**
   - Modifier `Underdog Bonus` ausgleichen
   - MVP sollte von Mitspielern votiert werden (nicht Admin)

5. **Soulmask parallel:**
   - Funktioniert gleichzeitig mit Tournament
   - Lead braucht Monitor 2 für Soulmask-Verwaltung

---

**Document Version:** 1.0 (2026-05-10)
**Last Updated:** 2026-05-10
