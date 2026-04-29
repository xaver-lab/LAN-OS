# 📘 README.md – LAN PARTY EVENT SYSTEM (SPEC v3)

> **Single Source of Truth.** Alle Architektur-, State- und Feature-Entscheidungen leben hier.
> Geändert in v3: konsolidiert aus README v2 + feature.md + Design-Mockup (Claude Design „LAN OS.html").
> Schema-Version: `3.0`.

---

## 🎯 1. SYSTEM OVERVIEW

Das System ist eine lokale **LAN-Party Event Plattform**, die drei Dinge gleichzeitig abbildet:

- 🎮 **Turnier-System** (kompetitiv, Punkte, Matches)
- 🎡 **Voting + Glücksrad System** (Spielauswahl + Show Mechanik)
- 🌍 **Survival Mode „Soulmask"** (Co-op Gameplay + Rollen + Tasks)

Zusätzlich:

- 📺 TV Display (Event Screen)
- 📱 Browser UI (User Interaction)
- 🧑‍💼 Admin Control Panel (Systemsteuerung)

### 🧠 DESIGN ZIEL

Das System ist kein Tool, sondern:

> 🎯 „LAN Party Operating System für Spiele, Entscheidungen und Event-Flow"

### 🏛️ DEPLOYMENT-ARCHITEKTUR

**Variante A — Browser-Clients + lokaler Server auf Admin-PC.**

- Admin-PC läuft einen **lokalen Server** (Tech-Wahl liegt beim Coding Agent: Node / Bun / Python o. ä.). Server hält den `SYSTEM_STATE`, persistiert Checkpoints lokal und liefert über LAN aus.
- Alle UIs sind Browser-Endpoints auf der LAN-IP des Admin-PC:
  - `/tv` — TV-Display (auf großem Bildschirm)
  - `/play` — Player-Browser-UI (eigenes Gerät / Player-PC)
  - `/admin` — Admin Control Panel (zweites Browser-Fenster auf Admin-PC, idealerweise zweiter Monitor)
- **Admin öffnet zwei Browser-Fenster:** `/tv` und `/admin`.
- Keine native App, kein Cloud-Sync, kein Internet-Zugang erforderlich.
- Cross-Plattform: jeder Client mit modernem Browser (Phones, Tablets, Laptops im LAN).

---

## 👥 2. SYSTEM ROLLEN (DEVELOPMENT / AGENTS)

Diese Rollen existieren ausschließlich zur Entwicklung.

### 🧠 Coding Agent (IMPLEMENTATION ENGINE)
- vollständige Implementierung
- State Machine Umsetzung
- UI Integration
- Persistenz
- API / Server Logik
- **Harte Regeln:** liest nur README.md · keine eigenen Features · keine Architekturänderungen · keine Annahmen · bei Unklarheit → STOP + Frage

### 📄 Planning Agent (ARCHITECT)
- Systemstruktur, Datenmodell, State Machine, Feature-Logik
- **Darf nicht:** UI designen · Code schreiben · Implementierungsdetails festlegen

### 🎨 Design Agent (UX / UI ENGINE)
- alle UI Layouts (TV / Browser / Admin)
- User Flows, visuelle Hierarchie
- **Darf nicht:** Logik verändern · State Machine ändern · neue Features erfinden

---

## 🎮 3. LAN PARTY ROLLEN (EVENT REAL WORLD)

Rollen am echten Event. Werden im Datenmodell als `players[].role` abgebildet.

| Rolle | Rechte | Einschränkungen |
|---|---|---|
| 👤 **Spieler** | Voting, Match spielen, Score eingeben, Soulmask-Tasks bearbeiten | kein Systemzugriff, keine Admin-Rechte |
| 🧑‍✈️ **Turnierleiter (GameMaster)** | Turnier starten/stoppen, Matches freigeben, Konflikte lösen, Ergebnis-Validierung | – |
| 📺 **Show Operator** | TV-Mode steuern, Glücksrad starten, Voting-Phase starten, Show-Timing | – |
| 🧭 **Admin (System Owner)** | Vollzugriff: Start/Stop, Backup/Restore, Crash Recovery, Reset, Mode Override | – |
| 🧱 **Soulmask Lead** | Rollenverteilung, Task-Erstellung, Goals, Progress-Kontrolle | – |
| 👀 **Zuschauer** | nur TV-View | **keine Voting-Stimme**, keine Match-Teilnahme |

> **Hinweis:** Eine Person kann mehrere Rollen haben — die Datenstruktur unterstützt dies nicht direkt; kombinierte Rollen werden über separate Rollen-Werte ausgedrückt (z. B. `Admin` impliziert `GameMaster`-Rechte).

---

## 🏗️ 4. SYSTEM ARCHITEKTUR

### 4.1 Top-Level: Zwei parallele Tracks

Das System hat **zwei orthogonale Tracks**, die unabhängig aktiv/inaktiv sein können — auch **gleichzeitig**:

- `TOURNAMENT` — Voting / Spin / Match-Loop (kompetitiv)
- `SOULMASK` — Co-op Survival (parallel laufend)

`activeTracks: Set<'TOURNAMENT' | 'SOULMASK'>` steuert, welcher Track aktiv ist.
Ein Player kann an einem oder beiden Tracks teilnehmen (`players[].activeTracks`).

### 4.2 Vollständiges Datenmodell

```yaml
SYSTEM_STATE:
  version: int                           # inkrementiert pro Mutation, für Polling-Diff
  schemaVersion: '3.0'

  activeTracks: Set<'TOURNAMENT' | 'SOULMASK'>

  tournamentState:                       # State Machine Pointer (Tournament Track)
    'LOBBY' | 'VOTING' | 'ELIMINATION_APPLIED' |
    'SPIN' | 'RESULT' | 'MATCH_SETUP' |
    'MATCH_ACTIVE' | 'MATCH_RESULT_PENDING' |
    'MATCH_DONE' | 'INACTIVE'

  soulmaskState:                         # State Machine Pointer (Soulmask Track)
    'IDLE' | 'ACTIVE' | 'PAUSED' | 'DONE'

  config:
    votingMode: 'MULTI' | 'ELIMINATION'  # pro Voting-Runde wählbar
    votingTimerSec: int                  # 30..300, default 120
    votingMinPool: int                   # default 4
    votingMaxPool: int                   # default 8
    votingMaxVotesPerPlayer: int|null    # MULTI-Modus, default null = unbegrenzt
    autoCheckpoint: bool                 # default true
    pollingIntervalMs:
      tv: 1000
      browser: 2000
      admin: 1000
    heartbeatTimeoutSec: int             # default 30 (offline wenn lastSeen älter)
    soulmaskAllowPlayerCustomRoles: bool # default true

  players[]:
    id: string                           # serverseitig generiert
    name: string                         # Self-Service-Eingabe, eindeutig
    color: hex                           # auto-vergeben aus Palette
    points: int                          # Gesamt-Punktestand
    role: 'Spieler' | 'Zuschauer' | 'GameMaster' | 'Admin'
        | 'SoulmaskLead' | 'ShowOperator'
    activeTracks: Set<'TOURNAMENT' | 'SOULMASK'>
    online: bool                         # ABGELEITET: now - lastSeen < heartbeatTimeoutSec
    lastSeen: timestamp
    sessionToken: string                 # bei Anmeldung erzeugt, für Re-Connect
    warnings: int                        # default 0
    playtimeSec: int                     # akkumulierte Online-Zeit
    streak:
      current: int                       # +1 bei Win, RESET bei Loss, UNVERÄNDERT bei Draw
      best: int
      lastBonusAt: int                   # Streak-Stand bei letzter Bonus-Auszahlung

  games[]:                               # Game-Card mit AI-Metadaten
    id: string
    title: string
    tag: 'FPS' | 'Sport' | 'Tactical' | 'RTS' | 'Sandbox' |
         'BattleRoyale' | 'Coop' | 'Arena' | 'Party' |
         'Survival' | 'Strategy' | 'Competitive'
    color: hex
    avgDurationMin: int | null
    recommendedPlayers: { min: int, max: int } | null
    suitableModes: ['1v1' | '2v2' | 'team' | 'ffa'][]
    complexity: 'casual' | 'medium' | 'hardcore'
    tournamentSuitability: int           # AI-Score 0..100
    chaosPotential: int                  # AI-Score 0..100
    aiAnalyzed: bool
    inActivePool: bool                   # ist im aktuellen Voting-Pool

  votingSession:                         # nur != null während VOTING-State
    mode: 'MULTI' | 'ELIMINATION'
    startedAt: timestamp
    endsAt: timestamp | null             # null = kein Timer
    pool: gameId[]
    votes: { playerId: gameId[] }        # MULTI: array; ELIMINATION: array.length===1
    eliminated: gameId[]                 # nur ELIMINATION
    tieBreakState: 'none' | 'pending-admin' | 'auto-spin' | 'auto-multi-eliminate'

  spinSession:                           # nur != null während SPIN
    candidates: gameId[]
    winnerId: gameId | null
    wheelVariant: 'pie' | 'orbital' | 'fortune'
    startedAt: timestamp
    durationMs: int

  matches[]:
    id: string
    roundNumber: int
    type: '1v1' | '2v2' | 'team' | 'ffa'
    gameId: string
    creationMethod: 'manual' | 'shake'
    status: 'open' | 'active' | 'result-pending' | 'done'
    teamA: playerId[]
    teamB: playerId[]
    scores:
      A: int | null                      # Team-Match
      B: int | null
      perPlayer: { playerId: int } | null # FFA
    confirmed: bool
    confirmedAt: timestamp | null
    mvpPlayerId: string | null
    activeModifiers: modifierId[]
    pointsAwarded:                       # nach Confirmation befüllt
      perPlayer: { playerId: int }
      breakdown: [{ rule: string, pts: int }]

  modifiers[]:                           # Modifier-Library
    id: string
    category: 'risk-reward' | 'balance' | 'chaos'
    label: string
    rules: object                        # multiplier / handicap / chaosFlag
    appliesTo: 'match' | 'round' | 'session'
    enabled: bool

  soulmaskData:                          # aktiv solange SOULMASK-Track an
    sessionId: string
    defaultRoles:                        # immer verfügbar
      ['Builder', 'Fighter', 'Farmer', 'Explorer', 'Support', 'Scout']
    customRoles[]:                       # User-definierte Zusatz-Rollen
      id: string
      label: string
      color: hex
      icon: string | null
    activeRoles: { playerId: roleId }    # roleId = Default-Name oder customRoles[].id
    roleHistory[]:                       # Audit / Show-Layer
      playerId: string
      fromRole: roleId
      toRole: roleId
      at: timestamp
    tasks[]:
      id: string
      playerId: string
      role: roleId
      label: string
      done: bool
      createdAt: timestamp
      doneAt: timestamp | null
    globalGoals[]:                       # default 4: Base/Ressourcen/Gegner/Territorium
      id: string
      label: string
      progress: int                      # 0..100
      color: hex
    morale: int                          # 0..100, ABGELEITET aus completed/total

  leaderboard:                           # ABGELEITET aus players[].points
    top: playerId[]                      # sortiert desc

  eventLog[]:                            # append-only History (für Timeline + Audit)
    id: string
    timestamp: timestamp
    type: 'vote' | 'spin' | 'match-start' | 'match-done' |
          'admin-action' | 'modifier-set' | 'soulmask-task' |
          'system' | 'player-join' | 'player-leave'
    payload: object
    actorId: string | null

  checkpoints[]:                         # nur Metadata, JSON-Files extern
    label: string                        # z. B. 'r2', 'pre-match', 'manual-1747'
    filename: string                     # checkpoint_<label>_<unixTs>.json
    createdAt: timestamp
    trigger: 'auto' | 'manual'
    stateVersion: int

  uiPreferences:                         # zentrale UI-Settings (nicht logikrelevant)
    tvTheme: 'dark-arcade' | 'synthwave' | 'arctic'   # default 'dark-arcade'
    wheelVariant: 'pie' | 'orbital' | 'fortune'        # default 'pie'
```

### 4.3 Abgeleitete Werte (NICHT persistieren)

- `players[].online` — aus `lastSeen`
- `leaderboard.top` — aus `players[].points` desc
- `soulmaskData.morale` — aus `tasks[]` done/total
- „Last Game Winner" für TV — aus `matches[]` mit `status='done'` und höchstem `confirmedAt`

---

## 🔄 5. STATE MACHINE

### 5.1 Tournament Track

```
                  ┌────────────────┐
                  │     LOBBY      │◄────────────────┐
                  └───────┬────────┘                 │
                          │ admin: start voting       │
                          ▼                           │
                  ┌────────────────┐                  │
                  │    VOTING      │                  │
                  │ (mode = MULTI  │                  │
                  │  or ELIMIN.)   │                  │
                  └───────┬────────┘                  │
              ┌───────────┴───────────┐               │
              │                        │               │
       MULTI: timer/end          ELIMINATION:          │
        + winner found           timer/all voted       │
              │                        │               │
              │                        ▼               │
              │              ┌───────────────────┐     │
              │              │ ELIMINATION_      │     │
              │              │   APPLIED         │     │
              │              └─────────┬─────────┘     │
              │           ┌────────────┼────────────┐  │
              │           │            │            │  │
              │      remain≥2     remain=1      remain=0
              │                                  /tie  │
              │           │            │            │  │
              ▼           ▼            ▼            ▼  │
                  ┌────────────────┐  ┌─────────┐ ┌──────────┐
                  │     SPIN       │  │ RESULT  │ │ ERROR_   │
                  └───────┬────────┘  │(no spin)│ │ GUARD    │
                          │ wheel done └─────┬───┘ └────┬─────┘
                          ▼                  │  admin override │
                  ┌────────────────┐         │                  │
                  │     RESULT     │◄────────┘                  │
                  └───────┬────────┘                            │
              ┌───────────┴───────────┐                         │
              │                        │                         │
       admin: re-vote          admin: start match                │
              │                        │                         │
              │                        ▼                         │
              │              ┌────────────────────┐              │
              │              │   MATCH_SETUP      │              │
              │              │ (type, teams,      │              │
              │              │  modifiers)        │              │
              │              └─────────┬──────────┘              │
              │                        │ admin: start            │
              │                        ▼                         │
              │              ┌────────────────────┐              │
              │              │   MATCH_ACTIVE     │              │
              │              └─────────┬──────────┘              │
              │                        │ scores entered          │
              │                        ▼                         │
              │              ┌──────────────────────┐            │
              │              │ MATCH_RESULT_PENDING │            │
              │              └─────────┬────────────┘            │
              │                        │ confirm                 │
              │                        ▼                         │
              │              ┌────────────────────┐              │
              │              │   MATCH_DONE       │              │
              │              └─────────┬──────────┘              │
              │            ┌───────────┴────────────┐            │
              │            │                         │            │
              │     admin: next round         admin: re-vote     │
              │            │                         │            │
              └────────────┘                         │            │
                                                     └────────────┘
```

### 5.2 Tie-Break-Regeln

| Situation | Default-Verhalten |
|---|---|
| MULTI: Tie auf höchstem Platz | SPIN über alle Tied-Spiele |
| ELIMINATION: Tie auf höchster Strike-Anzahl | `tieBreakState = 'pending-admin'` → Admin-Dialog: „Override" oder „Multi-Eliminate" (alle tied raus, sofern Rest ≥ 2) |
| ELIMINATION: Pool nach Eliminierung < 2 | `ERROR_GUARD` → Admin-Override (Eliminierung rückgängig oder Pool aufstocken) |
| Voting: kein einziger Vote abgegeben (Timer abgelaufen) | Admin-Notification, Voting verlängern oder mit aktuellem Pool zu SPIN |

### 5.3 Voting Pool Guards

- min **4** Spiele, max **8** Spiele im Pool (Defaults aus `config.votingMinPool/MaxPool`)
- nach Elimination muss ≥ 2 Spiele übrig sein
- Pool-Zusammenstellung: aus `games[]` mit `inActivePool=true`, vom Admin im Voting-Tab gepflegt

### 5.4 Soulmask Track (separater State)

```
        ┌──────────┐
        │   IDLE   │◄──────────┐
        └────┬─────┘           │
             │ lead: start     │
             ▼                  │
        ┌──────────┐           │
        │  ACTIVE  │           │ lead: end
        └────┬─────┘           │
             │ lead: pause     │
             ▼                  │
        ┌──────────┐           │
        │  PAUSED  │───────────┘
        └────┬─────┘   lead: end
             │ lead: resume
             ▲           ┌──────────┐
             └───────────│   DONE   │
                          └──────────┘
```

### 5.5 SYSTEM_BOOT (Startup-Sequenz)

1. Server lädt letzten Checkpoint (oder leeren State)
2. Konsistenz-Check (Schema-Version, Track-States gültig)
3. Auf Crash-Recovery prüfen: war `MATCH_ACTIVE`? → State auf `MATCH_SETUP` zurücksetzen, Admin-Hinweis
4. Polling-Endpoints aktiv → Clients verbinden sich

---

## 🎡 6. VOTING & GLÜCKSRAD SYSTEM

### 6.1 Zwei Voting-Modi (gleichwertig)

#### 🟢 MULTI-VOTE (Standard für offene Auswahl)
- jeder Spieler darf **mehrere** Stimmen abgeben (1 Stimme pro Spiel pro Spieler)
- Limit pro Spieler: `config.votingMaxVotesPerPlayer` (default `null` = unbegrenzt im Pool)
- **Gewinner = höchste Stimmenzahl direkt**
- bei Tie auf Platz 1 → SPIN über Tied-Set (sonst kein SPIN)

#### 🔴 ELIMINATION-VOTE (Strike-Modus)
- jeder Spieler gibt **genau 1 Strike-Stimme** ab
- Spiel mit den meisten Strikes wird **entfernt**
- Restliche Spiele → **SPIN entscheidet**
- bei Tie → siehe §5.2

### 6.2 Glücksrad

- 3 Wheel-Varianten (siehe `uiPreferences.wheelVariant`):
  - `pie` — klassisches Tortendiagramm mit externen Labels
  - `orbital` — Spiele-Cards rotieren um Zentrum, Karten bleiben aufrecht
  - `fortune` — Casino-Gold-Theme, dramatischer Spin
- Animation: 3.6–3.8 s, Easing-Out
- Ergebnis wird in `spinSession.winnerId` festgeschrieben → State → `RESULT`

### 6.3 Voting-Regeln (Zusammenfassung)

| Regel | Wert |
|---|---|
| Min Pool | 4 Spiele |
| Max Pool | 8 Spiele |
| Stimmen pro Spieler (MULTI) | unbegrenzt im Pool (config) |
| Stimmen pro Spieler (ELIMINATION) | genau 1 |
| Timer | optional, 30–300 s, default 120 s |
| Eliminierung vor Spin (ELIMINATION) | Pflicht |
| Min nach Elimination | 2 Spiele |
| Zuschauer-Stimmen | nicht erlaubt |

---

## 🎮 7. TURNIER-SYSTEM (MATCH SYSTEM)

### 7.1 Match-Typen

| Typ | Beschreibung |
|---|---|
| `1v1` | zwei Spieler, je 1 pro Team |
| `2v2` | je 2 Spieler pro Team |
| `team` | frei konfigurierbar (n vs n) |
| `ffa` | Free-for-All, jeder mit eigenem Score |

### 7.2 Match-Erstellung

- **`manual`** — Admin oder Spieler legen Teams fest
- **`shake`** — Random-Verteilung aller online-Spieler (mit `TOURNAMENT` aktiv) gemäß Match-Typ

### 7.3 Match-Lifecycle

```
open  →  active  →  result-pending  →  done
```

- `open` = angelegt, noch nicht gestartet
- `active` = läuft, Score-Eingabe offen
- `result-pending` = Scores eingegeben, Confirmation offen (Admin oder Players)
- `done` = confirmed, Punkte gebucht, EventLog-Eintrag

### 7.4 Punktesystem

| Event | Punkte |
|---|---|
| Sieg | **+100** |
| Unentschieden | **+50** |
| Niederlage | **+10** |
| Score-Differenz ≥ 5 (Sieger-Bonus) | **+25** |
| MVP der Runde (manuell oder Vote) | **+50** |
| Streak: 3 Wins in Folge | **+50** (einmalig pro Streak) |
| Streak: 5 Wins in Folge | **+150** (einmalig pro Streak) |

**Streak-Verhalten:** `streak.current` +1 bei Win, **RESET auf 0 bei Loss**, **UNVERÄNDERT bei Draw**.
Bonus wird ausgezahlt, wenn `streak.current` einen Schwellenwert erreicht und `streak.lastBonusAt` < Schwelle ist.

**Modifier-Multiplikatoren** (siehe §8) wirken **am Ende** auf die akkumulierten Punkte.

### 7.5 MVP

- Auswahl: `manual` (Admin) oder `vote` (alle Match-Teilnehmer stimmen)
- ein MVP pro Match, optional (`mvpPlayerId` darf null sein)

### 7.6 Score-Editierbarkeit

- Scores nach `done`-Status nur durch Admin überschreibbar (Override-Action)
- Override schreibt EventLog-Eintrag `admin-action: match-score-override`
- Punktestand wird neu berechnet, alte Auszahlung in EventLog markiert

---

## 🌀 8. MODIFIER SYSTEM

Modifier sind **pro-Match-Settings**, die im `MATCH_SETUP` zugewiesen werden und sich entweder auf die Punkteberechnung (Multiplikator/Handicap) oder rein auf den Show-Layer (Chaos-Regel) auswirken.

### 8.1 Kategorien

| Kategorie | Wirkung | Beispiele |
|---|---|---|
| `risk-reward` | Punkt-Multiplikator | Hardcore × 1.5 · Casual × 0.75 |
| `balance` | Handicap | starke Spieler bekommen weniger Punkte · 1v2 mit Bonus für Underdog |
| `chaos` | Show-Regel + optional Multiplikator | Double Points × 2 · No Voice Chat · Random Rule Variation |

### 8.2 Anwendungs-Reihenfolge bei Punkteberechnung

```
basePoints (win/draw/loss)
  + scoreBonus (Diff ≥ 5)
  + mvpBonus
  + streakBonus
  × risk-reward-multiplier
  × chaos-multiplier (falls gesetzt)
  + balance-handicap (additiv, kann negativ sein)
= finalPoints (in pointsAwarded.perPlayer)
```

### 8.3 Steuerung

- Admin kann Modifier **vor Match-Start** setzen
- Admin kann Modifier **während** `MATCH_ACTIVE` anpassen — Auswirkung wird erst bei Confirmation gebucht
- Modifier-Library lebt in `modifiers[]`, kann durch Admin erweitert werden

---

## 🌍 9. SOULMASK SYSTEM (Co-op Track)

### 9.1 Rollen

**6 Default-Rollen** (immer verfügbar):

| Rolle | Icon | Fokus |
|---|---|---|
| Builder | 🏗 | Aufbau, Verteidigung |
| Fighter | ⚔ | Kampf, Bosskämpfe |
| Farmer | 🌾 | Ressourcen sammeln |
| Explorer | 🧭 | Erkundung, Karten |
| Support | 🛡 | Heilung, Buffs, Team-Logistik |
| Scout | 👁 | Aufklärung, Späher |

**Custom-Rollen** sind erlaubt: SoulmaskLead **oder Player selbst** (gesteuert über `config.soulmaskAllowPlayerCustomRoles`) kann eine Rolle anlegen — `{ id, label, color, icon }`. Custom-Rollen sind den Defaults gleichgestellt.

### 9.2 Quick Role-Switch

- SoulmaskLead kann `activeRoles[playerId]` **jederzeit** ändern (auch mid-session in `ACTIVE`)
- alte Zuweisung wird in `roleHistory` archiviert
- laufende Tasks werden **NICHT** automatisch reassigned — Lead entscheidet manuell

### 9.3 Tasks

- Tasks werden vom SoulmaskLead **manuell** vergeben
- pro Task: Spieler, Rolle, Label, Status (`done` / offen)
- keine zwingende Logik / kein Skill-System im MVP

### 9.4 Global Goals

4 Default-Goals:

| Goal | Farbe |
|---|---|
| Base Camp aufbauen | gelb |
| Ressourcen sammeln | grün |
| Gegner eliminieren | rot |
| Territorium erkunden | cyan |

Custom-Goals erlaubt. Progress wird vom Lead manuell gesetzt (0–100).

### 9.5 Morale

- Abgeleiteter Wert: `done-tasks / total-tasks * 100`
- wird auf TV-Soulmask-Screen als Co-op-Moral-Meter angezeigt

---

## 🖥️ 10. UI ARCHITEKTUR (logische Bereiche)

> UI-Layout / Visual Design / Theming = **Design Zone** (siehe §16). Hier nur die logischen Sektionen pro Client.

### 📱 Browser UI (`/play`)

**Sektionen** (logisch):
- **Login** (Self-Service-Anmeldung, siehe §11)
- **Voting** — Pool sehen + abstimmen (Modus-abhängig)
- **Match Result** — Match-Erstellung + Score-Eingabe
- **Tasks** — Soulmask Tasks ansehen + abhaken
- **Status** — Eigener Punktestand, Leaderboard, Playtime, Event Flow

**Design-Regel:** max 2 Klicks pro Aktion, sofortige Feedback-UI.

### 📺 TV UI (`/tv`)

**Modes** (gemäß `tournamentState` + `soulmaskState`):
- **LOBBY-Mode** — Leaderboard Top 5, aktuelle Runde, aktive Spieler, Playtime, Last Game Winner, Event Feed
- **VOTING-Mode** — Pool-Grid mit Live-Votes, Avatar-Stimmen, Counter, Countdown
- **SPIN-Mode** — Fullscreen Glücksrad-Animation, Sound, Fokus nur auf Wheel
- **RESULT-Mode** — Gewinner-Spiel groß, Übergang zu „Start Match"
- **MATCH-Mode** — laufendes Match anzeigen (Teams, Live-Score)
- **SOULMASK-Mode** (parallel zu Tournament-Modes möglich) — Rollen, Global Goals, Morale, Live Task Feed

### 🧑‍💼 Admin UI (`/admin`)

**Tabs** (logische Capability-Bereiche):

| Tab | Capabilities |
|---|---|
| **Übersicht** | Mode-Switch (Track aktivieren/deaktivieren), Stats-Grid, Quick Actions, Mini-Leaderboard |
| **Spieler** | Liste · Edit (Name, Farbe, Rolle, Track-Zuweisung) · Warn (+1 warning) · Punkte-Reset · Kick (mit Confirm) · manuell hinzufügen |
| **Voting** | Voting-Modus wählen (MULTI/ELIMINATION) · Pool zusammenstellen · Timer-Slider 30–300 s · Voting Start/Stop · Wheel-Variante wählen |
| **Turnier** | Match freigeben/beenden · Score-Override · Modifier setzen · MVP wählen · Runde skippen · Match-Erstell-Methode (manual/shake) |
| **Soulmask** | Track aktivieren/deaktivieren · Rollen zuweisen · Custom-Rollen anlegen · Tasks verwalten · Goals + Progress · Mid-Session Role-Switch |
| **System** | Backup jetzt · Restore aus Checkpoint-Liste · Simulation Mode toggle · System Reset (Hard, mit Confirm) · System Log · Schema-Version |

**Danger Zone:** alle destruktiven Aktionen (Hard Reset, Player Kick, Score Override) erfordern Confirm-Step.

---

## 🧑‍🎤 11. SELF-SERVICE PLAYER-ANMELDUNG

### 11.1 Flow

1. Player öffnet `/play` im Browser
2. Login-Screen: Name (Pflicht), optional Farb-Wunsch
3. Server prüft:
   - **Name** muss eindeutig sein → wenn belegt: Fehlermeldung, Eingabe wiederholen
   - **Color** wird aus Default-Palette als nächste freie vergeben (Wunsch berücksichtigt, falls frei)
4. Player-Eintrag wird angelegt (`role: 'Spieler'`, `activeTracks: {'TOURNAMENT'}` als Default)
5. Server gibt `sessionToken` zurück → Browser speichert in `localStorage`
6. Player ist online, erscheint im Admin-Player-Tab und Voting-Pool

### 11.2 Re-Connect

- Bei Reload sendet Browser `sessionToken` mit
- Server matched bestehenden Player → fortsetzen, `lastSeen` aktualisieren
- Token ungültig (z. B. nach Hard Reset) → zurück auf Login-Screen

### 11.3 Admin-Override

- Admin kann jederzeit Player im Admin-Panel manuell anlegen, editieren, kicken
- Manuell angelegte Player erhalten initial keinen Token; bekommen einen, sobald sie sich erstmals verbinden (per Name-Match)

### 11.4 Player-Status (online/offline)

- `online = (now - lastSeen) < heartbeatTimeoutSec` (default 30 s)
- offline-Player **bleiben** im State (Punkte / History bleiben)
- offline-Player nehmen **nicht** teil an: aktivem Voting · neuen Match-Setups · Shake-Random-Verteilung

---

## 📜 12. EVENT LOG & TIMELINE

`eventLog[]` ist ein append-only Audit-Log. Liefert die Datenquelle für:

- TV „Last Game Winner"-Widget
- TV Event-Timeline / „Weak Tree"
- Admin System Log
- Forensik / Crash-Replay

### Event-Typen

| Type | Auslöser | Payload |
|---|---|---|
| `vote` | Stimme abgegeben | playerId, gameId, voteMode |
| `spin` | Spin abgeschlossen | candidates[], winnerId, wheelVariant |
| `match-start` | Match `active` | matchId, type, gameId |
| `match-done` | Match confirmed | matchId, scores, mvpPlayerId, points-breakdown |
| `admin-action` | Admin-Trigger | actionType, target, details |
| `modifier-set` | Modifier zugewiesen | matchId, modifierId |
| `soulmask-task` | Task created/done | taskId, playerId, action |
| `system` | Boot, Restore, Schema-Migration | details |
| `player-join` | Self-Service-Anmeldung | playerId, name |
| `player-leave` | Kick / Disconnect > timeout | playerId, reason |

---

## 💾 13. PERSISTENCE SYSTEM

### 13.1 Anforderungen

- lokale Speicherung am Admin-PC (JSON-Files)
- system restartfähig
- Crash Recovery
- State Restore aus Checkpoint

### 13.2 Auto-Checkpoints

- nach jedem `*_DONE`-State (`MATCH_DONE`, `SOULMASK_DONE`)
- vor `MATCH_ACTIVE`-Start (Pre-Match-Snapshot)
- nach State-Recovery beim Boot
- nur wenn `config.autoCheckpoint = true`

### 13.3 Manuelle Checkpoints

- Admin → System-Tab → „Backup jetzt"
- bekommt optional Label

### 13.4 Format

- Filename: `checkpoint_<label>_<unixTs>.json`
- Inhalt: vollständiger `SYSTEM_STATE` + `schemaVersion`
- Files liegen lokal, Metadata im State (`checkpoints[]`)

### 13.5 Restore

- Admin wählt Checkpoint aus Liste
- State wird geladen, Server geht in `LOBBY`-State
- **MVP-Einschränkung:** keine Mid-Match-Wiederaufnahme (Match-States werden auf `open`/`SETUP` zurückgesetzt)

---

## 🔁 14. REALTIME / POLLING STRATEGIE

### 14.1 Cadence

| Client | Intervall | Endpoint | Inhalt |
|---|---|---|---|
| TV | 1000 ms | `/state/public` | TV-relevanter Subset (kein Player-Token, keine Admin-Logs) |
| Browser (Player) | 2000 ms | `/state/player/:id` | Player-spezifische Sicht (eigene Tasks, Match-Eingabe-Felder) |
| Admin | 1000 ms | `/state/full` | vollständiger State |

### 14.2 State-Versionierung

- `state.version` wird **bei jeder Mutation** inkrementiert
- Clients senden ihre zuletzt gesehene `version` mit
- Server antwortet:
  - bei gleicher Version: `304-like` (kein Diff)
  - bei kleinerer Version: vollständiger State (oder Diff in v3.x+)

### 14.3 Heartbeat

- Browser-Polling sendet implizit `lastSeen`
- offline-Detection wie in §11.4

### 14.4 WebSockets / Push

- **NICHT** im MVP (siehe §17 ungeplante Features)

---

## 🤖 15. AI GAME PRE-ANALYSIS

### Ziel

Jedes Spiel im `games[]`-Pool wird einmalig automatisch analysiert, um bessere Match-Empfehlungen zu ermöglichen.

### Funktionen

- automatische Tag-Klassifizierung
- Schätzung: durchschnittliche Spieldauer, empfohlene Spieleranzahl, geeignete Modi (1v1/Team/FFA)
- Komplexität (`casual` / `medium` / `hardcore`)
- AI-Scores: `tournamentSuitability` (0–100), `chaosPotential` (0–100)
- optional Web-Recherche (Regeln, typische Matches)

### Trigger

- automatisch beim Anlegen eines neuen Game-Eintrags
- manuell über Admin-Action „Re-Analyze"

### Ergebnis

- Felder im `games[]`-Eintrag gefüllt
- `aiAnalyzed = true`
- Match-Erstellung nutzt diese Felder als Default-Vorschläge

---

## ⚙️ 16. ADMIN CONTROL LOGIC

Vollständige Admin-Capabilities — nicht UI, sondern logische Aktionen:

### 16.1 Übersicht
- Track-Aktivierung: `TOURNAMENT` / `SOULMASK` an/aus
- Quick-Stats (online Players, aktive Matches, current State)

### 16.2 Spieler
- Liste mit Filter (online/offline, role, track)
- Edit: name, color, role, activeTracks
- Warn (+1)
- Punkte-Reset (einzelner Player)
- Kick (mit Confirm) — setzt online=false und invalidiert sessionToken
- Manuell hinzufügen

### 16.3 Voting
- Modus wählen
- Pool zusammenstellen (toggle `inActivePool`)
- Voting Start / Stop
- Timer-Slider
- Wheel-Variante wählen
- Tie-Break-Override

### 16.4 Turnier
- Match freigeben / beenden / abbrechen
- Score-Override
- Modifier zuweisen
- MVP wählen
- Runde skippen
- Erstellungs-Methode wählen (manual/shake)

### 16.5 Soulmask
- Track aktivieren/deaktivieren
- Rollen zuweisen / wechseln
- Custom-Rollen anlegen
- Tasks erstellen / abhaken / löschen
- Goals erstellen / Progress setzen

### 16.6 System
- Backup jetzt (manueller Checkpoint)
- Restore aus Checkpoint-Liste
- Simulation Mode toggle (Test-Daten, isoliert vom echten State)
- Hard Reset (alles zurück auf Default, doppelter Confirm)
- System Log anzeigen
- Schema-Version + System-Info

### 16.7 Simulation Mode

- separater State-Container für Tests
- Voting + Match-Flow durchspielen ohne echte Punkte zu vergeben
- nützlich für Pre-Event-Trockenlauf
- kein Persistence-Write außerhalb Simulation-Storage

---

## 🚫 17. UNGEPLANTE FEATURES (MVP-EXCLUSION)

- Remote Access (außerhalb LAN)
- Multi-PC Hosting (mehrere Server-Knoten)
- Echtzeit WebSocket System
- Auto-Healing AI Loop
- Cloud Sync
- Native Desktop App / Mobile App
- Mid-Match-Restore aus Checkpoint
- Skill-Based Matchmaking
- Automatische Turnierbäume / Brackets

---

## 🧩 18. DEVELOPMENT WORKFLOW

### Pipeline
```
Planning Agent  →  Design Agent  →  Coding Agent
```

### Regeln
- README.md ist die einzige Wahrheit
- alle Änderungen gehen in README zurück
- keine externe Interpretation erlaubt
- bei Unklarheit → STOP + Frage

---

## 🧠 19. IMPLEMENTATION RULES

- kein Feature außerhalb dieser README
- keine Annahmen — bei Unklarheit fragen
- keine UI-Änderungen ohne Design-Sektion
- keine State-Änderungen ohne Planning-Sektion
- keine Datenmodell-Erweiterung ohne Planning-Sektion

---

## 🧩 20. AGENT OUTPUT ZONES

### 20.1 Planning Zone
**Verantwortlich:** Planning Agent
**Darf:** Features erkennen / ergänzen, Systemlogik erweitern, State Machine anpassen, Datenmodell erweitern.
**Regel:** Alles muss logisch aus dem bestehenden System ableitbar sein.

### 20.2 Design Zone
**Verantwortlich:** Design Agent
**Darf:** UI-Layouts, Buttons, Screen-Aufteilungen, User Flow, Interaction Design.
**Wichtig:** keine Logikänderung, keine State-Machine-Änderung, nur UI/UX.

### 20.3 Implementation Zone
**Verantwortlich:** Coding Agent
**Darf:** nur implementieren — keine neuen Features erfinden, strikt nach Planning + Design.

---

## 📑 ANHANG — Änderungslog v2 → v3

- ➕ Deployment-Architektur (Variante A: Browser + lokaler Server) explizit dokumentiert
- ➕ `activeTracks` (TOURNAMENT + SOULMASK parallel betreibbar)
- ➕ Vollständiges Datenmodell mit Schemas für `players`, `games`, `matches`, `votingSession`, `spinSession`, `soulmaskData`, `modifiers`, `eventLog`, `checkpoints`
- ➕ State Machine mit Sub-States, Tie-Break-Regeln, Guards
- ➕ Beide Voting-Modi (MULTI + ELIMINATION) als gleichwertige Optionen
- ➕ Punktesystem konsolidiert (Win 100 / Draw 50 / Loss 10 / Bonus 25 / MVP 50 / Streak 50/150)
- ➕ Modifier-System mit Anwendungs-Reihenfolge
- ➕ Soulmask: 6 Default-Rollen + Custom-Rollen + Quick-Role-Switch
- ➕ Self-Service Player-Anmeldung
- ➕ Polling-Cadence + State-Versionierung + Heartbeat
- ➕ Persistence: Checkpoint-Format + Auto/Manual-Trigger
- ➕ Event Log als Single Source für Timeline + Last Winner
- ➕ AI Game Pre-Analysis als formales Konzept
- ➕ Admin-Capabilities pro Tab strukturiert
- ➕ Simulation Mode
- 🔄 Voting widerspruchsfrei: ELIMINATION als Modus-Variante, nicht widersprüchlicher Sub-State
- 🔄 Soulmask-Rollen konsolidiert (6 statt inkonsistent 4/5/6)
- 🔄 UI-Architektur auf logische Bereiche gekürzt (UI-Layout = Design Zone)
