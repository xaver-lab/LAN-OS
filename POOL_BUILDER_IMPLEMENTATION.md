# Pool Builder Implementation - Game Pool Management UI

## Übersicht

Der **Pool Builder** ist eine neue visuelle Komponente für das Admin-Panel, die es Administratoren ermöglicht, den Voting-Pool für Spiele zu verwalten.

**Datei**: `/home/user/LAN-OS/packages/client/src/admin/components/PoolBuilder.tsx`
**Integration**: Admin Voting-Tab via `import { PoolBuilder }`

---

## Features Implementiert

### 1. **2-Column Drag-n-Drop Layout**

- **Linke Spalte**: "Verfügbare Spiele" - alle Spiele mit `inActivePool=true`
- **Rechte Spalte**: "Voting Pool" - aktuell im Pool ausgewählte Spiele (4-8)
- Drag-Handle Icon (≡) für bessere UX
- Visual Feedback beim Draggen (opacity, border-highlight)
- Drop-Zonen heben sich farblich ab während Drag aktiv

### 2. **Min/Max Pool Validation**

- Minimum Pool-Größe: `config.votingMinPool` (default 4)
- Maximum Pool-Größe: `config.votingMaxPool` (default 8)
- Validierungsmeldung wenn außerhalb Range
- Start-Buttons deaktiviert bis Pool valid ist
- Visual Feedback: Neon-Grün wenn valid, Rot wenn zu voll

### 3. **Game Cards mit Metadaten**

Jede Karte zeigt:
- **Thumbnail**: Farb-Badge basierend auf `Game.color` (mit Glow-Effekt)
- **Titel**: Game-Name
- **Tag**: Spiel-Kategorie (FPS, Sport, etc.)
- **Hover-Info** (im Pool):
  - Durchschnittliche Dauer
  - Komplexität (casual/medium/hardcore)
  - Tournament Suitability Score

### 4. **Pool Actions**

- **Clear Pool**: Leert Pool komplett
- **Shuffle**: Randomisiert Reihenfolge (behält Größe)
- **Preset-Pools** (Quick-Actions):
  - "Ausgewogen": Mix aus allen Komplexitäten
  - "Chaotisch": Höchster `chaosPotential` zuerst
  - "FPS-Heavy": FPS-Games favorisiert

### 5. **Quick-Stats Panel**

Zeigt Statistiken für den aktuellen Pool:

| Stat | Quelle |
|---|---|
| **Durchschnittliche Dauer** | Mittel aus `avgDurationMin` |
| **Durchschn. Komplexität** | Aggregiert aus `complexity` Scores |
| **Chaos-Level** | Mittel aus `chaosPotential` (bar) |
| **Entertainment-Mix** | Tag-Breakdown mit Prozentanteilen |

**Chaos-Levels**: Low (<40), Medium (40-60), High (>60)

### 6. **Start Voting Buttons**

Zwei separate Buttons:
- **Start Voting (MULTI)** - Mehrfach-Abstimmung
- **Start Voting (ELIMINATION)** - Strike/Elimination Modus

Features:
- POST `/api/admin/voting/start` mit `{ mode, pool, timerSec }`
- Button wird grün/neon wenn Pool valid ist
- Zeigt visuell ungültigen Zustand (grau, disabled)

---

## Technische Implementierung

### State Management

```typescript
const [pool, setPool] = useState<string[]>([]);                    // Game IDs im Pool
const [draggedItem, setDraggedItem] = useState<DraggedItem>(null); // Aktives Drag-Item
const [dropHighlight, setDropHighlight] = useState<...>(null);     // Visuelles Feedback
const [busy, setBusy] = useState(false);                           // Loading-State
```

### Drag-n-Drop Logik

```typescript
function handleDragStart(e, gameId, source) {
  // source: "available" oder "pool"
  // Speichert Item + Source
}

function handleDropOnPool(e) {
  // Nur aus Available: fügt zu Pool hinzu (wenn nicht voll)
  // Aus Pool: Reordering (für zukünftige Iterationen)
}

function handleDropOnAvailable(e) {
  // Aus Pool: entfernt Game
}
```

### Quick-Stats Berechnung

```typescript
const quickStats = useMemo(() => {
  // Durchschnittsdauer
  const avgDurationMin = poolGames.reduce((sum, g) => 
    sum + (g.avgDurationMin ?? 20), 0) / poolGames.length;

  // Komplexität (1=casual, 2=medium, 3=hardcore)
  const avgComplexityScore = poolGames.reduce((sum, g) => 
    sum + complexityScores[g.complexity], 0) / poolGames.length;

  // Chaos-Level
  const chaosPotential = poolGames.reduce((sum, g) => 
    sum + (g.chaosPotential ?? 50), 0) / poolGames.length;

  // Tag-Breakdown
  const tagCounts = {}; // Count pro Tag
  return { avgDuration, avgComplexity, chaosPotential, tagBreakdown };
}, [poolGames]);
```

---

## Design Pattern

### Dark-Arcade Theme

- **Farben**: Neon-Grün (primary), Cyan (secondary), Magenta (danger)
- **Typography**: Rajdhani für Buttons, JetBrains Mono für Labels
- **Effekte**: Glow-Schatten, Scanlines (optional), Grid-Background
- **Responsive**: 2-Column Grid → Stack auf Mobile (via CSS Grid)

### Visual Feedback

| Zustand | Visual |
|---|---|
| Dragging | opacity 0.5, border neon-grün |
| Drop-Zone aktiv | background tint, dashed border |
| Pool voll | border rot/magenta, opacity 0.6 |
| Valid Pool | buttons neon-grün |
| Invalid Pool | buttons grau, disabled |

---

## Integration in Voting Tab

Die PoolBuilder wird im Admin Voting-Tab eingebunden:

```typescript
// /admin/tabs/Voting.tsx
import { PoolBuilder } from "../components/PoolBuilder.js";

export function Voting({ state, reload }: Props) {
  return (
    <>
      <Card title="Pool-Builder">
        <PoolBuilder state={state} reload={reload} />
      </Card>
      {/* Additional settings... */}
    </>
  );
}
```

**Alt-Code**: Das alte "Pool Auswahl" Checkbox-Grid wurde durch PoolBuilder ersetzt.

---

## API Integration

### POST `/api/admin/voting/start`

```json
{
  "mode": "MULTI" | "ELIMINATION",
  "pool": ["g_123", "g_456", ...],
  "timerSec": 120
}
```

### Backend Requirements

- `/admin/voting/start` muss Pool-Größe validieren (§5.3 README)
- Games müssen mit `inActivePool=true` gekennzeichnet sein
- Config `votingMinPool`, `votingMaxPool` müssen im State sein

---

## Testen

### Happy Path

1. **Open** Admin Panel → Voting Tab
2. **Drag** Games von Left zu Right
3. **Verify** Counter aktualisiert sich (z.B. "3/8 Games")
4. **Shuffle** → Reihenfolge ändert sich
5. **Watch** Quick-Stats aktualisieren (Durchschnittsdauer, Chaos-Level)
6. **Click** "Start Voting (MULTI)" → Voting startet, Modal schließt

### Edge Cases

- Pool < 4 Spiele → Button disabled, Validierungsmeldung
- Pool > 8 Spiele → Drop-Zone wird rot, Drag deaktiviert
- Clear Pool → Counter zurück auf "0/8", Stats leeren
- Preset "Ausgewogen" → Auto-fills mit Mix-Pool

---

## Performance

- `useMemo` für `availableGames`, `unselectedGames`, `poolGames`, `quickStats`
- Nur re-render wenn `state.games` oder `pool` sich ändert
- Drag-Operationen sind O(1) (nur Array-Push/Filter)
- Stats sind O(n) aber mit useMemo cached

---

## Zukünftige Enhancements

1. **Reordering im Pool**: Drag-to-reorder wenn Item im Pool zu anderem Pool-Item
2. **Favoriten**: Mark Games als Favorit für schnelles Re-Selection
3. **Pool Templates**: Speichern/Laden von Pool-Konfigurationen
4. **Analytics**: Historische Pool-Zusammensetzung anzeigen
5. **Game Search**: Text-Filter für Available Games

---

## Files Modified

- ✅ `/home/user/LAN-OS/packages/client/src/admin/components/PoolBuilder.tsx` (NEW)
- ✅ `/home/user/LAN-OS/packages/client/src/admin/tabs/Voting.tsx` (Updated: PoolBuilder integriert)
- ✅ Design Components: Card, NeonButton, Badge, NeonBar (bereits vorhanden)

---

## Typing & Compatibility

- **TypeScript**: Fully typed (`Game`, `SystemState`, `VotingMode`)
- **React**: 18.x (hooks: useState, useMemo)
- **Imports**: Nutzt bestehende API-Client (`post`) und Design-System
- **No Breaking Changes**: Rückwärts kompatibel mit existierendem Code
