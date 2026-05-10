# UI-Überprüfung Plan — LAN OS Button & Interaktionen

## Context
Das LAN OS System wurde vollständig implementiert, aber einige Buttons funktionieren nicht. Diese Analyse soll systematisch alle UI-Module überprüfen und fehlerhafte Interaktionen identifizieren.

**Stack**: React + TypeScript + Express Server
**UI-Module**: 
- Admin (`packages/client/src/admin/`) — 6 Tabs
- Player (`packages/client/src/play/`) — 4 Tabs + Login
- TV (`packages/client/src/tv/`) — 6 Modi

---

## Überprüfungs-Strategie

### Phase 1: Statische Analyse (Code-Review)
Überprüfung aller Button-Implementierungen ohne UI-Interaktion:

1. **Admin-UI** (`packages/client/src/admin/`)
   - Overview.tsx: Button für Theme-Wechsel, Track-Toggle
   - Players.tsx: Add Player, Edit, Delete Buttons
   - Voting.tsx: Start Voting, Set Pool, Set Timer Buttons
   - Tournament.tsx: Match-Buttons (Setup, Start, Submit Scores, Confirm)
   - Soulmask.tsx: Add Role, Assign Task, Complete Task Buttons
   - System.tsx: Backup, Restore, Reset Buttons

2. **Player-UI** (`packages/client/src/play/`)
   - Login.tsx: Login Button
   - Voting.tsx: Vote Buttons (Grid-Abstimmung)
   - MatchResult.tsx: MVP-Select, Score-Submit Button
   - Tasks.tsx: Complete Task Button
   - Status.tsx: Leaderboard-Anzeige

3. **TV-UI** (`packages/client/src/tv/`)
   - Alle Modi: Lobby, Voting, Spin, Result, Match, Soulmask
   - Navigation Buttons zwischen Modi
   - Wheel-Spin Button (3 Varianten)

### Phase 2: Funktionale Überprüfung (Live UI-Test)
1. Dev-Server starten: `pnpm run dev`
2. Jedes UI-Modul einzeln laden und testen:
   - `/admin` → alle 6 Tabs, alle Buttons
   - `/play` → Login, dann alle 4 Tabs
   - `/tv` → alle 6 Modi und Übergänge
3. Fehlerhafte Buttons dokumentieren:
   - Button wird nicht angezeigt
   - Button ist deaktiviert, sollte aber aktiv sein
   - Button-Click funktioniert nicht (API-Call scheitert oder keine sichtbare Reaktion)
   - Falsche Zustandsübergänge

### Phase 3: Root-Cause-Analyse
Für jeden fehlerhaften Button überprüfen:
1. **onClick-Handler**: Existiert und ist korrekt?
2. **API-Endpoint**: Server-Antwort funktioniert?
3. **State-Update**: Gibt es einen Hook (usePollingState)?
4. **Error Handling**: Fehler-Feedback sichtbar?
5. **Auth/Permissions**: Session-Token vorhanden?

---

## Kritische Überprüfungs-Punkte

### Häufige Fehler-Quellen:
1. **Fehlende onClick-Props** auf Buttons
2. **Falsche API-Endpoint-URLs** (z.B. `/api/admin/...` vs `/api/...`)
3. **Async-Fehler nicht behandelt** (Promise rejection without catch)
4. **State nicht aktualisiert** nach API-Call
5. **Conditional Rendering** — Button versteckt wegen falscher State-Bedingung
6. **Disabled-Attribut** — Button existiert, aber `disabled={true}`

### Server-seitige Häufigkeiten:
1. Route nicht registriert oder Typo in Route-Pfad
2. Fehlerhafte State-Mutation (Daten werden nicht persistiert)
3. Auth-Fehler (Session-Token ungültig)

---

## Testfall-Matrix

| UI-Modul | Tab/Modus | Button | Aktion | Expected | Priorität |
|----------|-----------|--------|--------|----------|-----------|
| Admin | Overview | Theme-Button | Click | Theme ändert sich | HIGH |
| Admin | Players | Add Player | Click | Dialog öffnet sich | HIGH |
| Admin | Players | Delete Player | Click | Bestätigung, dann Delete | HIGH |
| Admin | Voting | Start Voting | Click | State → VOTING | HIGH |
| Admin | Tournament | Setup Match | Click | Match-Setup-Dialog | HIGH |
| Admin | Tournament | Start Match | Click | State → ACTIVE | HIGH |
| Admin | System | Backup | Click | JSON Download | MEDIUM |
| Admin | System | Restore | Click | File-Upload | MEDIUM |
| Play | Login | Login Button | Click | → Voting Tab | HIGH |
| Play | Voting | Vote Button | Click | Vote gesendet, Counting aktualisiert | HIGH |
| Play | MatchResult | Submit Button | Click | Score gesendet | HIGH |
| TV | Voting → Spin | Spin Button | Click | Wheel dreht, Animation läuft | HIGH |

---

## Ausführungs-Schritte (Reihenfolge)

1. ✅ **Code-Struktur überprüfen** — Glob alle .tsx Buttons
2. 🔄 **Dev-Server starten** — `pnpm run dev`
3. 🔄 **Admin-UI testen** — Browser → http://localhost:3000/admin
4. 🔄 **Player-UI testen** — Browser → http://localhost:3000/play
5. 🔄 **TV-UI testen** — Browser → http://localhost:3000/tv
6. 🔄 **Fehler dokumentieren** — File, Button, Symptom, Root-Cause
7. 🔄 **Bugs fixen** — Pro Button
8. ✅ **Regression-Test** — Alle Tests erneut durchlaufen

---

## Verifikation

Nach Fixes:
- [ ] Alle HIGH-Priority Buttons funktionieren
- [ ] Admin-UI: Alle State-Übergänge sichtbar (Overview Tab zeigt aktuelle State)
- [ ] Player-UI: Vote-Flow funktioniert end-to-end
- [ ] TV-UI: Alle Modi erreichbar und Spin-Animation läuft
- [ ] Keine Console-Errors während Nutzung
- [ ] Server-Logs zeigen erfolgreiche API-Calls

---

## Zu überprüfende Dateien

**Client-Komponenten:**
- `packages/client/src/admin/tabs/*.tsx` — 6 Tab-Dateien
- `packages/client/src/play/tabs/*.tsx` — 4 Tab-Dateien
- `packages/client/src/tv/modes/*.tsx` — TV-Modi

**API-Hooks:**
- `packages/client/src/api/usePollingState.ts` — State-Updates
- `packages/client/src/api/useSession.ts` — Auth

**Server-Routes:**
- `packages/server/src/routes/*.ts` — Alle API-Endpoints

---

## Phase 1: Statische Analyse — ERGEBNISSE

✅ **Überprüfte Dateien:**
- Overview.tsx, Players.tsx, Voting.tsx, Tournament.tsx, Soulmask.tsx, System.tsx
- Login.tsx, Voting.tsx (Player), MatchResult.tsx
- Spin.tsx, Voting.tsx (TV)

### Vorläufige Erkenntnisse:

#### Admin-UI Buttons (gut strukturiert):
- **Overview**: TrackToggle Buttons → POST `/admin/track/{TOURNAMENT|SOULMASK}` ✓
- **Overview**: Theme/Wheel-Selects → POST `/admin/ui/preferences` ✓
- **Players**: Add Button → POST `/admin/players` ✓
- **Players**: Warn/Kick Buttons → POST `/admin/players/{id}/{warn|kick}` ✓
- **Voting**: Start/End/Cancel/Tie-Break → POST `/admin/voting/{start|end|cancel|tie-break}` ✓
- **Tournament**: Setup/Start/Confirm/Skip Match → POST `/admin/matches/{setup|{id}/start|{id}/confirm|{id}/skip}` ✓
- **Tournament**: Save Scores → POST `/admin/matches/{id}/{scores|mvp}` ✓
- **Soulmask**: Start/Pause/Resume/End → POST `/admin/soulmask/{start|pause|resume|end}` ✓
- **Soulmask**: Assign Role/Add Task/Add Goal → POST `/admin/soulmask/{players/{id}/role|tasks|goals}` ✓
- **System**: Create/Restore/Delete Checkpoint → POST/DEL `/admin/system/checkpoint{/{id}/restore|}` ✓
- **System**: Hard Reset (2-step confirm) → POST `/admin/system/reset` ✓
- **System**: Simulation Toggle → POST `/admin/system/simulation` ✓
- **System**: Reanalyze → POST `/admin/games/{gameId}/reanalyze` ✓

#### Player-UI Buttons:
- **Login**: Login/Reconnect Buttons → `login()` / `reconnect()` (api/client.js) ✓
- **Voting**: Vote Button → `submitVote()` (api/client.js) ✓
- **MatchResult**: Submit Scores → `submitMatchScores()` / `setMatchMvp()` (api/client.js) ✓
- **Tasks**: Task Toggle Button → `toggleTask()` (api/client.js) ✓
- **Status**: Nur Anzeige (Leaderboard, Stats) — keine Buttons

#### TV-UI:
- **Mode Navigation**: Automatisch anhand von `tournamentState`/`soulmaskState` (kein UI-Button)
- **Spin**: Animation lädt Games aus `state.spinSession`, 3 Wheel-Varianten (Anzeige-only) ✓
- **Voting/Lobby/Match/Result/Soulmask**: Alle Anzeige-only, werden vom Admin/Server gesteuert ✓

### Zu überprüfen:
✅ **Alle Player-Tabs überprüft** — 5 Tabs total (Login, Voting, MatchResult, Tasks, Status)
✅ **TV-Modi Navigation** — Automatisch anhand State-Übergänge (kein Button)
✅ **Spin-Session** — Server-gesteuert über `state.spinSession`, Client zeigt Wheel-Animation

### Kritische Fehlerquellen (Hypothesen):
1. **API-Endpoints** — Manche Routen könnten 404 zurückgeben
   - Verdächtig: `/api/admin/voting/end` (wird POST verwendet?)
   - Verdächtig: `/api/admin/matches/{id}/mvp` (wird separate Route benötigt?)
   - Verdächtig: Task-Toggle-Endpoint (`/api/player/tasks/{id}` oder `/api/soulmask/tasks/{id}`?)

2. **State-Polling Bug** — `usePollingState` könnte falsch cachen
   - Problem: `since=N` Parameter wird nicht korrekt gespeichert?
   - Problem: State wird nicht aktualisiert nach API-Call?

3. **Browser/Network**
   - CORS-Fehler?
   - API-Basis-URL falsch (`/api` vs `/api/`)?

4. **Component Rendering**
   - Buttons sind hidden/disabled durch falsche State-Bedingung
   - onClick-Handler gibt es, aber wird nicht aufgerufen

---

## Nächste Phase: Praktische Tests Erforderlich

**Blockierend für Fehlerbehandlung:**
1. Dev-Server hochfahren: `pnpm run dev` (oder `npm run dev`)
2. Browser öffnen: http://localhost:3000
3. **Browser DevTools öffnen** (F12):
   - Network Tab → Alle API-Calls beobachten (200 vs 404 vs 500?)
   - Console Tab → Fehler-Messages lesen
4. **Jede UI überprüfen**:
   - Admin → alle Buttons klicken → Network-Responses überprüfen
   - Player → Login → Voting → Button-Klicks testen
   - TV → sollte automatisch umschalten
5. **Server-Logs** anschauen (Terminal wo `pnpm dev` läuft)
6. **Fehler dokumentieren** mit: File, Button, Symptom, Network-Response
