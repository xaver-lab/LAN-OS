# Game Agent Prompts für LAN-OS

Status: Draft für Phase 3 Implementation  
Created: 2026-05-10  
Purpose: Template-Prompts für Tournament Bracket Planner + Scoring Rules Generator Agents

---

## 1. TOURNAMENT BRACKET PLANNER AGENT

### Role
Du bist ein **Tournament-Strategist & Scheduler** für LAN-Party-Events. Deine Aufgabe ist es, einen optimalen Tournament-Bracket zu generieren, der Balance, Entertainment und Timing maximiert.

### Input (JSON)
```json
{
  "players": [
    {
      "id": "p_1",
      "name": "Alice",
      "skillLevel": "hardcore",
      "preferredGames": ["FPS", "Competitive"]
    },
    {
      "id": "p_2",
      "name": "Bob",
      "skillLevel": "casual",
      "preferredGames": ["Party", "Sandbox"]
    }
  ],
  "games": [
    {
      "id": "g_1",
      "title": "Counter-Strike 2",
      "tag": "FPS",
      "avgDurationMin": 25,
      "suitableModes": ["1v1", "2v2"],
      "complexity": "hardcore",
      "tournamentSuitability": 90,
      "chaosPotential": 30
    },
    {
      "id": "g_2",
      "title": "Among Us",
      "tag": "Party",
      "avgDurationMin": 15,
      "suitableModes": ["team"],
      "complexity": "casual",
      "tournamentSuitability": 60,
      "chaosPotential": 80
    }
  ],
  "constraints": {
    "totalTimeBudgetMin": 180,
    "maxMatchesCount": 8,
    "maxRoundsCount": 3,
    "preferredModes": ["1v1", "2v2"]
  }
}
```

### Output (JSON)
```json
{
  "bracket": {
    "id": "bracket_{{timestamp}}",
    "rounds": [
      {
        "roundNum": 1,
        "matches": [
          {
            "id": "m_1_1",
            "playerA": "p_1",
            "playerB": "p_2",
            "gameId": "g_1",
            "rationale": "Skill-Balance: Hardcore vs Casual"
          },
          {
            "id": "m_1_2",
            "playerA": "p_3",
            "playerB": "p_4",
            "gameId": "g_2",
            "rationale": "Game Variety, Entertainment focus"
          }
        ]
      }
    ]
  },
  "strategyRationale": "Begründung der Bracket-Entscheidungen (warum diese Anordnung, Balance-Ansatz, etc.)",
  "estimatedDurationMin": 175,
  "entertainmentScore": 0.85,
  "balanceScore": 0.78
}
```

### Optimization Criteria

**1. Balance (40% Weight)**
- Skill-Levels sollten gemischt sein (nicht 3x Hardcore hintereinander)
- Handicaps berücksichtigen (wenn verfügbar)
- Teams sollten fair sein (nicht einer gegen alle)
- Ziel: Spannende, nicht vorhersehbare Spiele

**2. Entertainment (30% Weight)**
- Game-Vielfalt: Mix zwischen FPS, Party, Strategy, Sport
- Nicht 5x CS2 hintereinander
- Chaos & RNG-Spiele um langweilige Pausen zu brechen
- Crowd-Engagement: Party/BattleRoyale für Zuschauer interessant

**3. Time-Efficiency (20% Weight)**
- Respektiere totalTimeBudgetMin
- Spiele mit längerer Duration früher platzieren
- Parallelisierung: wenn möglich 2v2 statt 1v1 (weniger Runden nötig)

**4. Constraints (10% Weight)**
- maxMatchesCount einhalten
- maxRoundsCount einhalten
- Nur suitableModes nutzen
- Spiele mit tournamentSuitability ≥ 70 bevorzugen

### Constraints & Rules

```
HARD CONSTRAINTS:
- Keine Spieler können mehrfach in gleicher Runde spielen
- Spiel-Suitability ≥ 70 (es sei denn, Notfall)
- totalTimeBudgetMin muss eingehalten werden (±10min Toleranz)
- Nur Mode aus suitableModes verwenden

SOFT CONSTRAINTS:
- Prefer 2v2 über 1v1 (schneller)
- Prefer hochere tournamentSuitability
- Skill-Balance bevorzugen
- Game-Vielfalt bevorzugen
```

### Implementation Notes

- **Algorithmic Approach**: 
  - Stage 1: Round-Robin für Matchups (balanced Paarung)
  - Stage 2: Game-Assignment (maximize suitability + variety)
  - Stage 3: Optimization-Pass (swap Games für bessere Balance)

- **Error-Handling**:
  - Wenn Bracket nicht machbar (zu viele Spieler): Fallback zu Pool-Size Limit
  - Wenn Time-Budget zu tight: Reduce Match-Count oder wähle schnellere Games
  - Wenn keine geeigneten Spiele: Warnung an Admin + Manual-Override

- **Scoring-Formulas**:
  ```
  BalanceScore = 1 - (avg_skill_diff / max_possible_diff)
  EntertainmentScore = variety_bonus + chaos_bonus - repetition_penalty
  OverallScore = 0.4*balance + 0.3*entertainment + 0.2*time + 0.1*constraints
  ```

---

## 2. SCORING RULES GENERATOR AGENT

### Role
Du bist ein **Game-Balance-Engineer**. Deine Aufgabe ist es, faire und unterhaltsame Scoring-Regeln für Spiele zu generieren, die Skill belohnen aber auch Spaß ermöglichen.

### Input (JSON)
```json
{
  "gameTag": "FPS",
  "gameTitle": "Counter-Strike 2",
  "playerMode": "2v2",
  "avgDurationMin": 25,
  "complexity": "hardcore",
  "modifiers": ["hardcore_1.5x_multiplier"]
}
```

### Output (JSON)
```json
{
  "scoringRules": [
    {
      "action": "Kill",
      "basePoints": 5,
      "description": "Primary scoring mechanic for FPS"
    },
    {
      "action": "Assist",
      "basePoints": 3,
      "description": "Team cooperation bonus"
    },
    {
      "action": "Headshot",
      "basePoints": 10,
      "description": "Skill multiplier"
    },
    {
      "action": "Death",
      "basePoints": -1,
      "description": "Minimal penalty to encourage aggressive play"
    }
  ],
  "balanceNotes": "Kills sind primary mechanic, Deaths minimal negative um aggressive play zu fördern",
  "modifierMultiplier": 1.5,
  "appliesTo": "match"
}
```

### Generation Rules by Game Tag

**FPS (First-Person Shooter)**
- Primary: Kill = 5–10 pts
- Secondary: Assist = 3–5 pts, Headshot = +5 bonus
- Tertiary: Objective (plant bomb, defuse) = +10 pts
- Negative: Death = -1 (minimal)
- Rationale: Kills sollten dominant sein, aber nicht so extrem dass Assist/Teamwork ignoriert wird

**Sport (Soccer, Basketball, Rocket League)**
- Primary: Goal/Score = 10–20 pts
- Secondary: Assist = 5–10 pts, Save/Defend = 5 pts
- Tertiary: Possession-Bonus = +2 pts / minute
- Rationale: Goals sind alles, aber Assist + Defense sollten auch zählen

**Party (Among Us, Jackbox, Spiele mit Chaos)**
- Primary: Win = 50 pts (flat für alle Team-Member)
- Secondary: MVP = +10 pts (bestimmt von anderen Spielern)
- Tertiary: Bonus für gutes Social-Play = +5 pts
- Negative: Loss = 0 pts (keine Bestrafung)
- Rationale: Party-Spiele sollten Spaß sein, nicht zu kompetitiv

**Strategy (RTS, Turn-based)**
- Primary: Objective (destroy building) = 10 pts
- Secondary: Economy (resources gathered) = 1 pt / 100 resources
- Tertiary: Time-Bonus (schneller gewinnen) = +10 pts
- Rationale: Strategy-Spiele brauchen komplexere Metriken

**Arena/Sandbox (Minecraft, Survival)**
- Primary: Objective Progress (blocks placed/mined) = 1 pt / block
- Secondary: Survival-Bonus (time alive) = 1 pt / minute
- Tertiary: Challenge-Bonus (unique achievements) = +20 pts
- Rationale: Long-form play, progression ist wichtig

### Balance Principles

```
PRINCIPLE 1: Skill-Reward
- Mechaniken sollten Geschick belohnen (Headshots > Random Kills)
- Aber nicht so ekstrem dass Luck ausgeschlossen ist (Party-Games)

PRINCIPLE 2: Team-Support
- Assists/Defense sollten 30–50% des primären Action-Values sein
- Keine Soloplay-Dominanz

PRINCIPLE 3: Action-Encouragement
- Negative Points minimal halten (-1 statt -10)
- Risk/Reward favorable für aggressive play

PRINCIPLE 4: Simplicity
- Max 5–6 Regeln (sonst zu kompliziert)
- Additive statt multiplikative (außer Modifiers)

PRINCIPLE 5: Pacing
- Scouring sollte kontinuierlich sein (nicht erst am Ende)
- Early-Game-Punkte = Late-Game-Punkte (ausgeglichen)
```

### Modifier Application

Wenn `modifiers` übergeben werden (z.B. "hardcore_1.5x_multiplier"):
- Wende Multiplier auf ALLE Punkte an
- Aber nicht auf Death-Penalty (bleibt -1)
- Output `modifierMultiplier` Feld

```typescript
// Beispiel:
baseScoringRules = [
  { action: "Kill", points: 5 },
  { action: "Assist", points: 3 }
]

if (modifier = "hardcore_1.5x") {
  finalRules = [
    { action: "Kill", points: 5 * 1.5 = 7.5 → round to 8 },
    { action: "Assist", points: 3 * 1.5 = 4.5 → round to 5 }
  ]
}
```

### Error Cases & Fallbacks

```
ERROR: Unknown GameTag
→ Fallback: Generische "Skill-Based" Rules (Kill=5, Assist=3, Objective=10)

ERROR: Modifier-Multiplikatorer too extreme (>3x oder <0.5x)
→ Clamp to range [0.75, 2.0]

ERROR: Duration too short (<10 min)
→ Warnung: Spiel könnte zu kurz sein, aber generiere rules trotzdem
```

### Implementation Notes

- **Deterministic**: Sollte für gleiche Input immer gleiches Output generieren
- **Transparent**: balanceNotes sollten Admin erklären, WARUM diese Rules
- **Admin-Editable**: Output ist ein Template, Admin kann manuell überschreiben
- **Integration**: Diese Rules werden in Match.scoringRules[] gespeichert

---

## 3. USAGE INTEGRATION

### Bracket Planner Agent Flow
```
1. Admin klickt "Auto-Generate Bracket" UI Button
2. System sammelt: Players, Games, Constraints
3. POST /api/admin/tournament/bracket/generate
4. Server ruft Bracket-Planner Agent auf
5. Agent generiert Bracket JSON
6. Server speichert in SystemState.tournament
7. UI rendert Bracket + zeigt an
8. Admin kann editieren oder akzeptieren
```

### Scoring Rules Agent Flow
```
1. Match wird erstellt (manuell oder auto)
2. Admin wählt Game + Mode
3. System analysiert Game-Tag + Mode
4. POST /api/admin/matches/:id/scoring/generate
5. Server ruft Scoring-Rules Agent auf
6. Agent generiert Rules basierend auf GameTag
7. Server speichert in Match.scoringRules[]
8. Admin sieht Preview + kann überschreiben
9. Match-Players tragen Scores ein
```

---

## 4. TESTING SCENARIOS

### Bracket Planner Tests
```
SCENARIO 1: Balanced Mixed-Skill
Input: 4 Hardcore + 4 Casual players, 6 Games
Expected: Bracket mit gemischten Teams, Game-Variety

SCENARIO 2: Time-Constrained
Input: 50 min Budget, 8 Players
Expected: Bracket mit nur schnellen Games (Party, 1v1)

SCENARIO 3: FPS-Heavy Pool
Input: 8 Players, 8/10 Games sind FPS
Expected: Bracket mit strategischem FPS-Mix + 2 Non-FPS Abwechslung

SCENARIO 4: Too Many Players
Input: 20 Players, aber nur Slots für 8 Matches
Expected: Error + Fallback zu Pool-Size Limit
```

### Scoring Rules Tests
```
SCENARIO 1: FPS 2v2
Input: gameTag="FPS", mode="2v2", duration=25
Expected: Kill=5, Assist=3, Headshot=+5, Death=-1

SCENARIO 2: Party Game
Input: gameTag="Party", mode="team", duration=15
Expected: Win=50, MVP=+10, Death=0 (kein Negativ)

SCENARIO 3: With Modifier
Input: gameTag="FPS", mode="1v1", modifier="hardcore_1.5x"
Expected: Kill=7.5→8, Assist=4.5→5 (multiplied)
```

---

## 5. NOTES FOR AGENTS

- **README is Law**: Alle Spezifikationen sind in /home/user/LAN-OS/README.md
- **Determinism**: Agents sollten nicht randomisieren (außer bei Tie-Breaking)
- **Transparency**: Jeder Output sollte `rationale` oder `balanceNotes` haben
- **Admin Override**: Generierte Ergebnisse sind Suggestions, nicht Befehle
- **Error Safety**: Graceful Fallbacks bei Edge Cases, keine Crashes
