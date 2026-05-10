# Test Data Analysis Report
## LAN-OS State Snapshot (2026-05-10 11:47 UTC)

### Dateibestand

**File:** `/home/user/LAN-OS/data/state.json`  
**Size:** ~8KB  
**Last Modified:** aktuell  
**Schema Version:** 3.0 (README v3 konform)

---

## 1. SYSTEM-STATE ÜBERSICHT

### Version & Metadata
```
version: 7
schemaVersion: "3.0"
```
**Interpretation:** System hat 7 State-Mutations erlebt (Player-Anmeldungen, Konfigurationen). Entspricht Spec v3.

### Aktive Tracks
```
activeTracks: ["TOURNAMENT"]
```
**Status:** Nur TOURNAMENT aktiv, SOULMASK offline. Test-Scenario 2 (Soulmask) daher nicht aktivierbar.

### Tournament State
```
tournamentState: "RESULT"
```
**Status:** System im `RESULT`-State (Gewinner gerade angezeigt). Ideal für Score-Validierung.

### Soulmask State
```
soulmaskState: "IDLE"
```
**Status:** SOULMASK Track nicht aktiv, aber State-Machine vorhanden.

---

## 2. PLAYER-DATEN (2 Players)

### Player 1: TestSpieler
```
id: "p_1777488611170_840432"
name: "TestSpieler"
color: "#39ff6e" (helles Grün)
points: 0
role: "Spieler"
activeTracks: ["TOURNAMENT"]
online: true
lastSeen: 1777488611170
warnings: 0
playtimeSec: 0
streak: { current: 0, best: 0, lastBonusAt: 0 }
```

**Validierung:**
- ✅ Name eindeutig
- ✅ Farbe in Standard-Palette
- ✅ Role=Spieler (nicht Admin/Zuschauer)
- ✅ activeTracks=TOURNAMENT (korrekt)
- ✅ Punkte=0 (noch keine Matches)
- ✅ Streak initial 0

### Player 2: Xaver
```
id: "p_1777489094114_59f0f9"
name: "Xaver"
color: "#00e5ff" (Cyan)
points: 0
role: "Spieler"
activeTracks: ["TOURNAMENT"]
online: true (lastSeen aktuell)
warnings: 1 (wurde verwarnt)
playtimeSec: 0
```

**Validierung:**
- ✅ Name eindeutig
- ✅ Warning-System funktioniert (wird von Admin bereitgestellt)
- ⚠️ Online-Status sollte regelmäßig aktualisiert werden

---

## 3. GAME-POOL (8 Games)

### Analyse nach Tag

| Nr | Title | Tag | Color | InPool | Analyzed | Duration | Complexity |
|----|-------|-----|-------|--------|----------|----------|------------|
| 1 | Counter-Strike 2 | FPS | #ff6b35 | ✅ | ❌ | null | medium |
| 2 | Rocket League | Sport | #00aaff | ✅ | ❌ | null | medium |
| 3 | Valorant | Tactical | #ff4655 | ✅ | ❌ | null | medium |
| 4 | Elden Ring | Sandbox | #9c27b0 | ❌ | ❌ | null | hardcore |
| 5 | Among Us | Party | #1abc9c | ❌ | ❌ | null | casual |
| 6 | StarCraft II | Strategy | #34495e | ❌ | ❌ | null | hardcore |
| 7 | Minecraft | Sandbox | #8b7355 | ❌ | ❌ | null | casual |
| 8 | Dota 2 | Strategy | #924e3d | ❌ | ❌ | null | hardcore |

**Findings:**
- ✅ 3 Games in Active-Pool (CS2, RL, Valorant)
- ❌ 5 Games NICHT analysiert (avgDurationMin, tournamentSuitability, chaosPotential all = null/0)
- ⚠️ Game-Analysis muss noch implementiert werden (siehe Critical Issue #2)
- ✅ Alle Tags korrekt (FPS, Sport, Tactical, Party, Strategy, Sandbox)
- ✅ Komplexität variiert (casual, medium, hardcore) - gute Balancierung

**Pool-Status:**
- Min Pool: 4, aktuell: 3 → **FAIL:** "Start Voting" Button sollte disabled sein
- Max Pool: 8, vorhanden: 3 → OK
- **Empfehlung:** Mindestens 1 Game hinzufügen für Testing

---

## 4. CONFIGURATION

```json
{
  "votingMode": "MULTI",
  "votingTimerSec": 120,
  "votingMinPool": 4,
  "votingMaxPool": 8,
  "votingMaxVotesPerPlayer": null,
  "autoCheckpoint": true,
  "pollingIntervalMs": {
    "tv": 1000,
    "browser": 2000,
    "admin": 1000
  },
  "heartbeatTimeoutSec": 30,
  "soulmaskAllowPlayerCustomRoles": true
}
```

**Validierung:**
- ✅ votingMode=MULTI (ELIMINATION auch möglich)
- ✅ votingTimerSec=120s (30-300s range OK)
- ✅ votingMinPool=4, Max=8 (README konform)
- ✅ votingMaxVotesPerPlayer=null (unbegrenzt MULTI)
- ✅ autoCheckpoint=true (State wird gepuffert)
- ✅ Polling-Intervalle korrekt (TV 1s, Browser 2s, Admin 1s)
- ✅ heartbeatTimeoutSec=30 (offline nach 30s inaktivität)

---

## 5. VOTING SESSION & SPIN

```json
"votingSession": null
"spinSession": null
```

**Status:** Derzeit keine aktive Voting/Spin-Session. System im RESULT-State wartet auf nächste Action.

---

## 6. MATCHES

```json
"matches": []
```

**Status:** Keine abgeschlossenen Matches noch. Ideal für Test-Scenario 1 (Fresh Tournament).

---

## 7. MODIFIERS

```json
"modifiers": []
```

**Status:** Modifier-Library ist leer. **Issue:** Sollte mit Defaults initialisiert sein:
- Risk-Reward: Casual 0.75x, Balanced 1.0x, Hardcore 1.5x
- Balance: +30 Underdog, -30 Favorite
- Chaos: Double Points 2.0x, No Voice Chat, Random Variation

**Fix Empfehlung:**
```typescript
// packages/shared/src/factory.ts
export function createInitialState(): SystemState {
  return {
    // ... existing code
    modifiers: [
      { id: "rr-casual", category: "risk-reward", label: "Casual 0.75x", rules: { multiplier: 0.75 }, ... },
      { id: "rr-hardcore", category: "risk-reward", label: "Hardcore 1.5x", rules: { multiplier: 1.5 }, ... },
      // ... etc
    ]
  }
}
```

---

## 8. SOULMASK DATA

```json
"soulmaskData": null
```

**Status:** SOULMASK-Track ist deaktiviert (activeTracks=["TOURNAMENT"] nur). Wird initialisiert sobald Track aktiviert.

**Expected Structure (wenn aktiviert):**
```json
{
  "sessionId": "sm_...",
  "defaultRoles": ["Builder", "Fighter", "Farmer", "Explorer", "Support", "Scout"],
  "customRoles": [],
  "activeRoles": {},
  "roleHistory": [],
  "tasks": [],
  "globalGoals": [
    { "id": "g1", "label": "Base Camp", "progress": 0, "color": "#ffeb3b" },
    { "id": "g2", "label": "Ressourcen", "progress": 0, "color": "#4caf50" },
    { "id": "g3", "label": "Gegner", "progress": 0, "color": "#f44336" },
    { "id": "g4", "label": "Territorium", "progress": 0, "color": "#00bcd4" }
  ],
  "morale": 0
}
```

---

## 9. LEADERBOARD

```json
"leaderboard": {
  "top": ["p_1777488611170_840432", "p_1777489094114_59f0f9"]
}
```

**Status:** Beide Players mit 0 Punkten, Order unklar (wahrscheinlich nach Join-Time sortiert).

---

## 10. EVENT LOG

```json
"eventLog": []
```

**Status:** Event-Log ist leer. Sollte mit Startup-Event gefüllt werden:
```json
{
  "id": "evt_...",
  "timestamp": 1777488611170,
  "type": "system",
  "payload": { "action": "boot", "checkpoint": "initial" },
  "actorId": null
}
```

---

## 11. CHECKPOINTS

```json
"checkpoints": []
```

**Status:** Keine Checkpoints vorhanden. Kann manuell vom Admin erstellt werden. Auto-Checkpoint ist aktiviert (autoCheckpoint=true).

---

## 12. UI PREFERENCES

```json
"uiPreferences": {
  "tvTheme": "dark-arcade",
  "wheelVariant": "pie"
}
```

**Validierung:**
- ✅ tvTheme=dark-arcade (Options: dark-arcade, synthwave, arctic)
- ✅ wheelVariant=pie (Options: pie, orbital, fortune)

---

## FEHLERHAFTE PUNKTE (Test-Report Mapping)

| Issue | State-Evidence | Test-Case | Severity |
|-------|---|-----------|----------|
| Pool <4 Games | inActivePool Zähler = 3 | 5.1.3 | 🔴 CRITICAL |
| Keine Modifiers | modifiers=[] | 3.1.2 | 🟡 HIGH |
| Game-Analysis fehlt | tournamentSuitability=0, avgDurationMin=null | 4.4 | 🟡 HIGH |
| Soulmask nicht aktiv | activeTracks=["TOURNAMENT"] | 2.1 | 🟡 MEDIUM |
| Kein EventLog | eventLog=[] | Alle Tests | 🟡 MEDIUM |

---

## TEST-RECOMMENDATIONS BASIEREND AUF STATE

### Sofort durchführbar
1. ✅ Scoring-Tests (0 Punkte = Clean Slate für Match-Testing)
2. ✅ Voting-Tests (3 Games im Pool, 2 Players können abstimmen)
3. ✅ Error-Case Tests (Duplikat-Namen können nicht getestet werden, aber Validierung vorhanden)

### Mit State-Modifikation durchführbar
1. ⚠️ Tournament-Flow (Need: 4+ Games in Pool)
2. ⚠️ Pool-Builder (Need: ausreichend verfügbare Games)
3. ⚠️ Modifier-Tests (Need: modifiers[] initialisieren)
4. ⚠️ Soulmask-Tests (Need: activeTracks.include("SOULMASK"))

### Nicht durchführbar ohne Server
1. ❌ Live Polling-Tests
2. ❌ UI-Integration Tests
3. ❌ Mobile Responsiveness
4. ❌ Performance Profiling

---

## RECOMMENDATIONS

### 1. State vorbereiten für Umfassendes Testing
```bash
# Games in Pool aufstocken
curl -X POST http://localhost:3000/api/admin/toggle-game-pool \
  -H "Content-Type: application/json" \
  -d '{"gameId": "g_4", "inActivePool": true}' \
  -d '{"gameId": "g_5", "inActivePool": true}'

# Modifiers initialisieren
curl -X POST http://localhost:3000/api/admin/init-modifiers

# Soulmask Track aktivieren
curl -X POST http://localhost:3000/api/admin/toggle-track \
  -H "Content-Type: application/json" \
  -d '{"track": "SOULMASK", "enabled": true}'
```

### 2. Weitere Test-Player hinzufügen
```
Player 3: "Alex" (Farbe: #ff9800)
Player 4: "Dana" (Farbe: #9c27b0)
```

### 3. Match erstellen für Scoring-Tests
```
Type: 1v1
Team A: TestSpieler (25 Punkte)
Team B: Xaver (20 Punkte)
Winner: Team A
Modifiers: None (Baseline)
→ Expect: TestSpieler +100, Xaver +10
```

---

## CONCLUSION

**State ist konsistent mit Spec v3 und prüfbar, aber:**
- ⚠️ Zu wenige Spiele im Pool (<4 minimum)
- ❌ Keine Modifiers initialisiert
- ❌ Game-Analysis nicht durchgeführt
- ❌ Soulmask nicht aktiviert

**Nächste Schritte:**
1. Server starten
2. Pool aufstocken
3. Modifiers initialisieren
4. Vollständige Teste durchführen
