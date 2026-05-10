# Pool Builder - Testing Guide

## Setup

1. **Ensure Games Exist** in System State:
   - Admin Panel → Games Tab
   - Add 8+ Games mit verschiedenen Tags und Komplexitäten
   - Mark mindestens 6 mit `inActivePool=true`

2. **Navigate** zu Admin → Voting Tab

---

## Test Scenarios

### Test 1: Basic Drag-n-Drop

**Preconditions:**
- 6+ Games mit `inActivePool=true`
- Voting-Tab offen
- Pool ist leer

**Steps:**
1. Beobachte Links "Verfügbare Spiele" (alle Games)
2. Beobachte Rechts "Voting Pool" (leer)
3. **Drag** ein Game von Links zu Rechts
4. **Expected**: Game verschwindet von Links, erscheint in Rechts
5. **Verify Counter**: Zeigt "1/8" (oder max-config)

**Pass**: Drag-n-Drop funktioniert, Counter aktualisiert sich

---

### Test 2: Min/Max Validation

**Steps:**
1. Ziehe 3 Games in den Pool
2. Versuche Voting zu starten
3. **Expected**: Buttons disabled, rote Validierungsmeldung "Pool benötigt 4–8 Spiele. Derzeit: 3"
4. Ziehe 1 Game mehr (4 total)
5. **Expected**: Buttons werden neon-grün (enabled)
6. Ziehe bis zum Maximum (8)
7. **Expected**: Buttons bleiben grün
8. Versuche 9. Game zu ziehen
9. **Expected**: 9. Game kann nicht mehr in Pool gezogen werden (Drop wird verweigert)

**Pass**: Min/Max Validation funktioniert korrekt

---

### Test 3: Quick-Stats

**Preconditions:**
- Pool mit 5 verschiedenen Games (mix: FPS, Sport, Strategy)
- Games mit unterschiedlichen `avgDurationMin` (z.B. 15, 20, 25, 30 min)
- Games mit unterschiedlichen `complexity` (casual, medium, hardcore)

**Steps:**
1. Beobachte "Quick-Stats" Panel
2. **Verify Durchschnittliche Dauer**: z.B. "~22 min" (Mittelwert)
3. **Verify Komplexität**: z.B. "Medium" (aggregiert)
4. **Verify Chaos-Level**: Balken mit Prozent (z.B. 55%)
5. **Verify Entertainment-Mix**: Tag-Breakdown mit Prozenten
6. Entferne ein Game
7. **Expected**: Alle Stats aktualisieren sich sofort

**Pass**: Quick-Stats berechnen sich korrekt und updaten live

---

### Test 4: Pool Actions

#### Clear Pool
1. Fülle Pool mit 5 Games
2. Click "Pool Löschen"
3. **Expected**: Pool wird komplett geleert, Counter = "0/8"

#### Shuffle
1. Fülle Pool mit 4 Games: A, B, C, D (in dieser Reihenfolge)
2. Click "Mischen 🔄"
3. **Expected**: Reihenfolge ändert sich (z.B. C, A, D, B)
4. Click nochmal
5. **Expected**: Reihenfolge ändert sich wieder

**Pass**: Actions funktionieren

---

### Test 5: Preset-Pools

#### Balanced
1. Clear Pool
2. Click "Ausgewogen"
3. **Expected**: Pool wird mit 8 Games gefüllt, Mix aus allen Komplexitäten
4. **Verify Quick-Stats**: Komplexität sollte ~"Medium" sein

#### Chaotic
1. Clear Pool
2. Click "Chaotisch"
3. **Expected**: Pool wird mit 8 Games gefüllt
4. **Verify Quick-Stats**: Chaos-Level sollte "High" sein (>60)

#### FPS-Heavy
1. Clear Pool
2. Click "FPS-Heavy"
3. **Expected**: Pool wird mit FPS-Games prioritisiert
4. **Verify Entertainment-Mix**: FPS-Anteil sollte hoch sein (z.B. 50%+)

**Pass**: Presets generieren korrekte Pools

---

### Test 6: Start Voting

#### MULTI Mode
1. Fülle Pool mit 5 Games (valid)
2. Click "Start Voting (Multi)"
3. **Expected**: POST `/api/admin/voting/start` mit `mode: "MULTI"`
4. **Verify Response**: Voting-Session wird aktiv
5. **Verify UI**: Pool-Builder verschwindet, "Aktive Voting-Session" Card erscheint

#### ELIMINATION Mode
1. Fülle Pool neu mit 6 Games
2. Click "Start Voting (Elimination)"
3. **Expected**: POST `/api/admin/voting/start` mit `mode: "ELIMINATION"`
4. **Verify**: Voting startet mit Elimination-Modus

**Pass**: Start Voting funktioniert für beide Modi

---

### Test 7: Visual Feedback

#### Drag Highlight
1. Starte Drag über ein Game
2. **Expected**: Game wird semi-transparent (opacity 0.6)
3. Hover über Drop-Zone (rechts)
4. **Expected**: Drop-Zone wird highlight (Farb-Tint + dashed Border)

#### Drag Disabled
1. Fülle Pool komplett (8/8)
2. Versuche 9. Game zu ziehen
3. **Expected**: Game wird leicht transparent, Drop-Zone wird rot
4. **Expected**: Drag wird abgelehnt (Game bleibt in Available)

**Pass**: Visual Feedback ist intuitiv und hilfreich

---

### Test 8: Pool ist voll (8/8)

1. Fülle Pool bis 8
2. **Verify**: "Clear Pool" ist still enabled
3. **Verify**: "Shuffle" ist enabled
4. **Verify**: Preset-Buttons sind disabled (oder generieren über existing)
5. **Verify**: "Start Voting" Buttons sind ENABLED (neon-grün)
6. Click "Start Voting"
7. **Expected**: Voting startet erfolgreich

**Pass**: Full-Pool-Handling ist korrekt

---

### Test 9: Edge Case - No Available Games

1. Setze alle Games `inActivePool: false` (via API oder Admin Panel)
2. Öffne Voting Tab
3. **Expected**: "Verfügbare Spiele" zeigt "Keine Spiele im aktiven Pool verfügbar."
4. **Expected**: Preset-Buttons sind disabled

**Pass**: Graceful Handling wenn keine Games verfügbar

---

### Test 10: Responsive Layout (Mobile)

1. Öffne Browser DevTools (F12)
2. Toggle Device Emulation (iPhone, iPad)
3. **Expected**: 2-Column Layout wird zu Single-Column Stack
4. Pool-Builder sollte lesbar bleiben

**Pass**: Layout responsive (optional für MVP)

---

## Browser Console Checks

### Network Tab
1. Open DevTools → Network Tab
2. Ziehe Game in Pool
3. **Expected**: Kein Network Request (local state only)
4. Click "Start Voting"
5. **Expected**: POST `/api/admin/voting/start` mit payload:
   ```json
   {
     "mode": "MULTI" or "ELIMINATION",
     "pool": ["g_123", "g_456", ...],
     "timerSec": 120
   }
   ```

### Console Warnings
1. Open DevTools → Console
2. Drag Games, Shuffle, Click Buttons
3. **Expected**: Keine React Warnings/Errors
4. **Expected**: Keine TypeScript Errors

---

## Performance Test

1. Erstelle 50 Games
2. Mark 30 als `inActivePool=true`
3. Öffne Voting Tab
4. **Expected**: UI lädt schnell (<1s)
5. Drag 8 Games in Pool
6. **Expected**: Pool-Building flussig (keine Lag)
7. Quick-Stats aktualisiert sich sofort (<100ms)

**Pass**: Performance ist akzeptabel

---

## Success Criteria

✅ Alle Tests 1-10 bestanden  
✅ Keine Console Errors/Warnings  
✅ Network Requests korrekt  
✅ Performance akzeptabel  
✅ Voting startet erfolgreich nach Pool-Selection

---

## Known Limitations (MVP)

- Pool-Reordering (Drag within Pool): Nicht implementiert
  - Zukünftige Feature: Drag von Position X zu Y reordern
- No Pool-Persistence: Wenn Tab neu geladen → Pool leer
  - Zukünftige Feature: SessionStorage für Pool
- Preset-Pools sind deterministisch (nicht randomisiert)
  - Zukünftige Feature: Randomisiertes Preset fallback
