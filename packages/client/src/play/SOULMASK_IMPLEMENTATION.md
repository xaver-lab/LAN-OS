# Soulmask Player-UI Implementation

## Overview

Diese Implementation bietet eine spezialisierte Player-Interface für das Soulmask Co-op Survival Mode. Sie umfasst:

1. **Spieler-Rollen Display** — Aktuelle Rolle mit Icon, Farbe und Wechsel-Button
2. **Persönliche Tasks** — Filterbar nach Rolle, mit Checkbox-Toggle und Sortierung
3. **Global Goals** — Team-Tracking mit Progress-Bars und Contribution-Info
4. **Live-Updates** — Polling-basiert (2s Cadence), keine Flicker bei unverändertem State
5. **Morale-Meter** — Team-Morale visuell, abgeleitet aus done/total Tasks

---

## Dateien

### Player-Interface

- **`/packages/client/src/play/tabs/Soulmask.tsx`** (Hauptkomponente)
  - Role Display mit Icon + Farben (Builder, Fighter, etc.)
  - Task-Liste mit Checkbox-Toggle und Sortierung
  - Global Goals Cards mit Progress-Bars
  - Morale-Meter (Team-Level)
  - Role-Selector (wenn `soulmaskAllowPlayerCustomRoles=true`)

### Hooks & API

- **`/packages/client/src/api/client.ts`** (erweitert)
  - `setSoulmaskRole(roleId: string)` — POST zu `/player/soulmask/role`
  - `toggleTask(taskId: string, done: boolean)` — POST zu `/player/task/:taskId`

- **`/packages/client/src/api/useSoulmaskState.ts`** (neu)
  - Memoized derivation von player-spezifischen Soulmask-Daten
  - Verhindert UI-Flicker durch Smart Change Detection

- **`/packages/client/src/api/useSoulmaskTaskManager.ts`** (neu)
  - Toggle-Logik mit Optimistic Updates
  - Error Handling

### App Integration

- **`/packages/client/src/play/App.tsx`** (aktualisiert)
  - Neue Tab: `soulmask` mit Icon `🧬`
  - Import & Rendering von `<SoulmaskTab />`

---

## Features

### 1. Spieler-Rollen Display

```tsx
┌─────────────────────────────────────────┐
│ 🏗 Deine Rolle                          │
│ Builder                      [Wechseln] │
│                                         │
│ Team-Moral: ████████░░ 82%             │
└─────────────────────────────────────────┘
```

- **Icon-Mapping**: Builder🏗, Fighter⚔, Farmer🌾, Explorer🗺, Support🛡, Scout👁
- **Farben**: Vordefiniert pro Rolle (Amber, Magenta, Neon, Cyan, etc.)
- **Role Selector**: Auf Click „Wechseln" sichtbar (nur wenn Config erlaubt)
- **Morale**: Abgeleitet aus (done Tasks / total Tasks) * 100

### 2. Persönliche Tasks

```tsx
┌─────────────────────────────────────────────────────────┐
│ MEINE TASKS FÜR BUILDER                                 │
├─────────────────────────────────────────────────────────┤
│ ☐ Ressourcen sammeln              🏗 Builder    [OPEN]  │
│ ☐ Bunker reparieren               🏗 Builder    [OPEN]  │
│ ☑ Lagerhaus bauen                 🏗 Builder    [DONE]  │
│                                                          │
│                          Fortschritt: 1/3                │
└─────────────────────────────────────────────────────────┘
```

- **Filter**: Nur Tasks für current Role
- **Sortierung**: Active Tasks first, dann Done
- **Checkbox-Toggle**: On-Click → Server, dann Reload
- **Animation**: Strike-through bei Done, visueller Status-Change
- **Progress**: "X/Y Done" Footer

### 3. Global Goals

```tsx
┌─────────────────────────────────────────────────────────┐
│ TEAM-ZIELE (GLOBAL GOALS)                      75% █    │
├─────────────────────────────────────────────────────────┤
│ Base Defense                                    45%      │
│ ████░░░░░░░░░░░░░░ 12/27 Contributions                 │
│                                                          │
│ Resource Stockpile                             90%      │
│ ██████████████████░░ 23/25 Contributions               │
│                                                          │
│ Territory Expansion                            60%      │
│ ████████░░░░░░░░░░░░ 18/30 Contributions              │
└─────────────────────────────────────────────────────────┘
```

- **Live Progress-Bars**: Animiert bei Polling-Updates (0.4s Easing)
- **Color-Coded**: Jedes Goal hat Custom-Farbe
- **Contribution**: "X von Y Tasks fertig"
- **Responsive**: Passt sich an Container an

### 4. Live-Updates (Polling)

```
App.tsx (2000ms Polling)
    ↓
fetchPlayerState(...) via usePollingState
    ↓
useSoulmaskState (Memoized)
    ↓
No flicker (if version unchanged)
    ↓
<SoulmaskTab /> re-renders only if state changed
```

- **Polling**: 2s Cadence (konfigurierbar via `config.pollingIntervalMs.browser`)
- **Version-Aware**: Server antwortet mit `notModified` wenn keine Änderungen
- **Smart Memoization**: `useSoulmaskState` cached derived data
- **No Flicker**: Checkbox-State bleibt lokal während Toggle läuft

### 5. Role-Wechsel

```tsx
showRoleSelector && (
  <div>
    [🏗 Builder] [⚔ Fighter] [🌾 Farmer] [🗺 Explorer]
  </div>
)
```

- **Config-Check**: `state.config.soulmaskAllowPlayerCustomRoles`
- **Default + Custom Roles**: Alle verfügbar (6 defaults + custom)
- **Live Role Sync**: POST zu `/player/soulmask/role`, dann Reload
- **UI Feedback**: Disabled während Request läuft, Current Role highlighted

---

## Data Flow

### Task Toggle

```
Player clicks Checkbox
    ↓
toggleTaskAsync(taskId, done)
    ↓ (Optimistic Update: Optional)
local UI change → reload() fired
    ↓
POST /player/task/:taskId { done: boolean }
    ↓ (Server)
Update soulmaskData.tasks[id].done
Update morale (abgeleitet)
Return to Polling
    ↓ (Client)
usePollingState fetches next state
SoulmaskTab re-renders with new data
```

### Role Change

```
Player clicks Role Button
    ↓
changeRoleAsync(roleId)
    ↓
POST /player/soulmask/role { roleId }
    ↓ (Server)
Update soulmaskData.activeRoles[playerId] = roleId
Add RoleHistoryEntry
Return to Polling
    ↓ (Client)
usePollingState fetches new state
useSoulmaskState derives new myRoleTasks
SoulmaskTab re-renders with new filtered tasks
```

---

## Type Safety

```ts
// From @lan-os/shared/types.ts

interface SoulmaskTask {
  id: string;
  playerId: string;
  role: string;  // DefaultSoulmaskRole | CustomSoulmaskRole.id
  label: string;
  done: boolean;
  createdAt: number;
  doneAt: number | null;
}

interface GlobalGoal {
  id: string;
  label: string;
  progress: number;  // 0..100
  color: string;     // hex
}

interface SoulmaskData {
  sessionId: string;
  defaultRoles: DefaultSoulmaskRole[];  // Builder, Fighter, Farmer, etc.
  customRoles: CustomSoulmaskRole[];
  activeRoles: Record<string, string>;  // { playerId: roleId }
  roleHistory: RoleHistoryEntry[];
  tasks: SoulmaskTask[];
  globalGoals: GlobalGoal[];
  morale: number;  // Abgeleitet, 0..100
}
```

---

## Testing Checklist

### Setup
- [ ] Server läuft, SOULMASK Track ist aktiv (`soulmaskState !== 'IDLE'`)
- [ ] Player logged in mit `activeTracks` inkl. 'SOULMASK'
- [ ] Tasks sind assigned (playerId + role)
- [ ] Global Goals sind definiert

### Basic Rendering
- [ ] Soulmask-Tab sichtbar in Player UI
- [ ] Aktuelle Rolle angezeigt (Icon + Label + Farbe)
- [ ] Tasks laden und zeigen

### Task Toggle
- [ ] Checkbox klicken → lokal strikethrough
- [ ] Server aktualisiert
- [ ] Reload → neuer State angezeigt
- [ ] Morale steigt bei Done

### Role Wechsel
- [ ] „Wechseln"-Button angezeigt (wenn allowed)
- [ ] Click → Role Selector Modal
- [ ] Wähle neue Rolle
- [ ] Tasks filtern automatisch nach neuer Rolle
- [ ] Role History wird gepflegt (Server-side)

### Live Updates
- [ ] Andere Player toggle Task → nach 2s Update sichtbar
- [ ] Goal Progress steigt wenn Tasks done
- [ ] Morale-Meter aktualisiert live
- [ ] Kein Flicker bei unverändertem State

### Edge Cases
- [ ] Soulmask IDLE oder DONE → zeige "nicht aktiv" Message
- [ ] Keine Tasks → zeige "Keine Tasks" Placeholder
- [ ] Config.soulmaskAllowPlayerCustomRoles=false → kein Wechseln-Button
- [ ] Connection Error → zeige Banner, Retry möglich

---

## Performance

- **Polling**: 2s (konfigurierbar, gut für LAN)
- **Memoization**: `useSoulmaskState`, `useSoulmaskTaskManager`
- **Change Detection**: Version-aware Polling verhindert unnecessary renders
- **Animations**: 0.15s–0.4s Transitions (schnell, kein lag)

---

## Known Limitations

1. **Goal-Task Linking**: Aktuell werden Global Goals aggregiert über alle Tasks.
   Server-side könnte Goal-Referenzen in Tasks hinzufügen für präzisere Contribution.

2. **Optimistic Updates**: Optional, wird aktuell nicht im Soulmask-Tab genutzt.
   Kann für schnellere Feedback aktiviert werden.

3. **Role History**: Wird gepflegt (Server-side), aber nicht in UI angezeigt.
   Could add "Recent Roles" section wenn gewünscht.

---

## Integration mit bestehenden Tabs

- **Voting Tab**: Unabhängig, beide Tracks können parallel laufen
- **Match Result Tab**: Unabhängig (TOURNAMENT Track)
- **Tasks Tab**: Generisch (ist Parent, Soulmask ist spezializiert)
- **Status Tab**: Zeigt Online Status, kann aber mit Soulmask-Info ergänzt werden

---

## Next Steps / Erweiterungen

1. **Achievements**: Unlock spezielle Badges wenn bestimmte Goals erreicht
2. **Team Chat**: Schnell-Messages zwischen Spielern (z.B. „Ressourcen fertig!")
3. **Difficulty Modes**: Hard/Medium/Easy Tasks mit unterschiedlichen Rewards
4. **Role-based Buffs**: Bestimmte Rollen bekommen Morale-Bonuses für ihre Tasks
5. **Event Log**: Timeline von Role Switches, Goal Completions, etc.

---

## File Structure Summary

```
/packages/client/src/
├── play/
│   ├── App.tsx (aktualisiert: Soulmask-Tab)
│   ├── Login.tsx
│   ├── tabs/
│   │   ├── Soulmask.tsx (neu: Hauptkomponente)
│   │   ├── Voting.tsx
│   │   ├── MatchResult.tsx
│   │   ├── Tasks.tsx (alt: generisch)
│   │   └── Status.tsx
│   └── SOULMASK_IMPLEMENTATION.md (diese Datei)
├── api/
│   ├── client.ts (erweitert: setSoulmaskRole)
│   ├── usePollingState.ts (unverändert)
│   ├── useSoulmaskState.ts (neu: Memoized)
│   └── useSoulmaskTaskManager.ts (neu: Task Logic)
└── design/
    └── components/index.tsx (unverändert: alle benötigten Komponenten vorhanden)
```
