# LAN-OS Performance Optimization — Implementierungsanleitung

**Zielgruppe:** Entwickler  
**Komplexität:** Einfach bis Mittel  
**Aufwand:** 2-6 Stunden für alle Optimierungen

---

## Quick Start: Die 3 wichtigsten Optimierungen

### 1. Gzip Compression (5 Min, 80% Bandwidth Reduktion)

**Status:** STRONGLY RECOMMENDED  
**Impact:** 41 KB → 5 KB per Response

**Schritt 1:** Paket installieren
```bash
cd /home/user/LAN-OS/packages/server
npm install compression --save
```

**Schritt 2:** Middleware registrieren
Datei: `/home/user/LAN-OS/packages/server/src/index.ts`

Füge nach den existierenden Imports ein:
```typescript
import compression from "compression";
```

Füge nach der CORS-Middleware diese Zeile ein:
```typescript
app.use(compression({
  level: 6, // Standard compression level
  threshold: 1024, // Nur responses > 1KB komprimieren
  filter: (req, res) => {
    // Gzip nicht für Websocket-Upgrades
    if (req.headers["upgrade"]) return false;
    return compression.filter(req, res);
  },
}));
```

**Kompletter Index-Ausschnitt:**
```typescript
// ── Middleware ────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(compression({ level: 6, threshold: 1024 }));  // <- NEU
app.use(express.json({ limit: "1mb" }));
```

**Verifikation:**
```bash
# Terminal 1: Server starten
npm run dev

# Terminal 2: Response-Header checken
curl -I http://localhost:3000/api/state/full

# Response sollte enthalten:
# Content-Encoding: gzip
```

**Expected Result:**
- Bandwidth: 1.285 MB/min → 0.13 MB/min
- Client merkts nicht: Browser decompress automatisch
- CPU Cost: Negligible (< 1ms pro Request)

---

### 2. Event-Log Rotation (20 Min, verhindert Bloat)

**Status:** STRONGLY RECOMMENDED  
**Impact:** Unkontrolliertes Wachstum verhindern

**Problem:** Event-Log kann theoretisch unendlich wachsen
- Nach 8 Stunden: ~29,000 Events (bei 1 Event/s)
- State-Size: 41 KB → 200+ KB
- Browser-Memory: 100 MB+

**Lösung:** Behalte nur letzte N Events

**Implementierung:**
Datei: `/home/user/LAN-OS/packages/server/src/state.ts`

Finde die `mutate()`-Funktion:
```typescript
async mutate(
  reducer: (state: SystemState) => SystemState,
  ctx: MutationContext = {},
): Promise<SystemState> {
  // ... existierender Code ...
  
  // NACH dem Event-Log Update, VOR der Persistence:
  if (next.eventLog.length > 500) {
    // Behalte nur letzte 500 Events (neueste zuerst)
    next.eventLog = next.eventLog.slice(-500);
  }
  
  // Persistence weiterhin
  this.writing = this.writing.then(() =>
    sim ? writeSimulationState(next) : writeState(next),
  );
  
  return next;
}
```

**Kompletter Code-Block:**
```typescript
// In state.ts, Zeile ~70-100, mutate() Method

async mutate(
  reducer: (state: SystemState) => SystemState,
  ctx: MutationContext = {},
): Promise<SystemState> {
  const now = Date.now();
  const sim = this.real.simulationActive;
  const current = sim ? this.sim : this.real;
  let next = reducer(current);
  next = {
    ...next,
    version: current.version + 1,
  };
  if (ctx.log) {
    const entry: EventLogEntry = {
      id: `e_${now}_${Math.floor(Math.random() * 1000)}`,
      timestamp: now,
      type: ctx.log.type,
      payload: ctx.log.payload,
      actorId: ctx.log.actorId ?? null,
    };
    next = { ...next, eventLog: [...next.eventLog, entry] };
  }

  // ✅ NEU: Event-Log Rotation
  if (next.eventLog.length > 500) {
    next.eventLog = next.eventLog.slice(-500);
  }

  if (ctx.autoCheckpoint && next.config.autoCheckpoint) {
    const meta = await writeCheckpoint({
      label: ctx.autoCheckpoint.label,
      trigger: "auto",
      state: next,
    });
    next = { ...next, checkpoints: [...next.checkpoints, meta] };
  }

  if (sim) this.sim = next;
  else this.real = next;

  this.writing = this.writing.then(() =>
    sim ? writeSimulationState(next) : writeState(next),
  );
  await this.writing;
  return next;
}
```

**Verifikation:**
```typescript
// In Admin-Frontend oder Test
const state = await fetchFullState();
console.assert(state.eventLog.length <= 500, "Event-Log sollte maximal 500 Einträge haben");
```

**Konfigurierbar machen (optional):**
```typescript
// In state.ts
const MAX_EVENT_LOG_SIZE = 500; // Konfigurierbar

if (next.eventLog.length > MAX_EVENT_LOG_SIZE) {
  next.eventLog = next.eventLog.slice(-MAX_EVENT_LOG_SIZE);
}
```

---

### 3. Client-Side Caching (1 Hour, UX-Verbesserung)

**Status:** RECOMMENDED  
**Impact:** 50ms+ Reconnect Speedup, offline UI

**Problem:** Bei Netzwerk-Dropout zeigt Admin-Tab leere Leaderboard für 1.5s

**Lösung:** localStorage Cache bei jedem Poll

**Datei:** `/home/user/LAN-OS/packages/client/src/api/usePollingState.ts`

**Schritt 1:** Cache-Intialisierung
```typescript
export function usePollingState({
  fetchFn,
  intervalMs,
  enabled = true,
  onAuthError,
}: PollingOptions): PollingResult {
  // ✅ NEU: Initialisiere mit gecachtem State
  const [state, setState] = useState<SystemState | null>(() => {
    if (typeof window === "undefined") return null; // SSR compat
    try {
      const cached = localStorage.getItem("lan-os-state-cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        console.debug("[CACHE] State aus localStorage geladen", parsed.version);
        return parsed;
      }
    } catch (e) {
      console.warn("[CACHE] localStorage Parse Fehler:", e);
    }
    return null;
  });

  const [connectionError, setConnectionError] = useState("");
  const versionRef = useRef<number | undefined>(undefined);
  const errCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ... rest der existierenden Code ...
}
```

**Schritt 2:** Cache-Update nach Poll
```typescript
const doFetch = useCallback(async () => {
  try {
    const resp = await fetchFn(versionRef.current);
    errCountRef.current = 0;
    setConnectionError("");

    if (resp.notModified) return;
    if (resp.state) {
      versionRef.current = resp.state.version;
      setState(resp.state);
      
      // ✅ NEU: Cache aktualisieren
      try {
        localStorage.setItem("lan-os-state-cache", JSON.stringify(resp.state));
      } catch (e) {
        console.warn("[CACHE] localStorage Fehler:", e);
        // Fehler silently ignorieren (z.B. bei QuotaExceededError)
      }
    }
  } catch (err) {
    // ... existierender Error-Handling Code ...
  }
}, [fetchFn, onAuthError]);

// ... rest des Code ...
```

**Kompletter Modified Hook:**
```typescript
import { useState, useEffect, useRef, useCallback } from "react";
import type { SystemState } from "@lan-os/shared";
import type { StateResponse } from "./client.js";

const MAX_ERRORS = 4;

interface PollingOptions {
  fetchFn: (since?: number) => Promise<StateResponse>;
  intervalMs: number;
  enabled?: boolean;
  onAuthError?: () => void;
}

interface PollingResult {
  state: SystemState | null;
  connectionError: string;
  reload: () => Promise<void>;
}

export function usePollingState({
  fetchFn,
  intervalMs,
  enabled = true,
  onAuthError,
}: PollingOptions): PollingResult {
  // ✅ CHANGE: Initialize mit gecachtem State
  const [state, setState] = useState<SystemState | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem("lan-os-state-cache");
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}
    return null;
  });

  const [connectionError, setConnectionError] = useState("");
  const versionRef = useRef<number | undefined>(undefined);
  const errCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doFetch = useCallback(async () => {
    try {
      const resp = await fetchFn(versionRef.current);
      errCountRef.current = 0;
      setConnectionError("");

      if (resp.notModified) return;
      if (resp.state) {
        versionRef.current = resp.state.version;
        setState(resp.state);
        
        // ✅ CHANGE: Cache State
        try {
          localStorage.setItem("lan-os-state-cache", JSON.stringify(resp.state));
        } catch (e) {
          // Ignoriere QuotaExceededError, etc.
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes("401") || errorMsg.includes("Auth required")) {
        setConnectionError("");
        onAuthError?.();
        return;
      }

      errCountRef.current++;
      if (errCountRef.current >= MAX_ERRORS) {
        setConnectionError(errorMsg);
      }
    }
  }, [fetchFn, onAuthError]);

  const reload = useCallback((): Promise<void> => {
    versionRef.current = undefined;
    errCountRef.current = 0;
    setConnectionError("");
    // ✅ CHANGE: Auch Cache clearen bei Manual Reload
    localStorage.removeItem("lan-os-state-cache");
    return doFetch();
  }, [doFetch]);

  useEffect(() => {
    if (!enabled) return;
    doFetch();
    timerRef.current = setInterval(doFetch, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [doFetch, intervalMs, enabled]);

  return { state, connectionError, reload };
}
```

**Verifikation:**
```bash
# Öffne Browser DevTools -> Application -> Storage -> Local Storage
# Sollte sehen: "lan-os-state-cache" mit aktuellem State

# Test:
# 1. Öffne /admin
# 2. Warte bis Leaderboard lädt
# 3. Mache Offline (DevTools Network -> Offline)
# 4. Reload Seite (F5)
# 5. Sollte sofort alte Daten zeigen, dann sich connecten
```

**Cache Cleanup (optional):**
Falls localStorage voll wird:
```typescript
// In State-Update Funktion
const cacheSize = localStorage.getItem("lan-os-state-cache")?.length || 0;
if (cacheSize > 1_000_000) { // > 1MB
  localStorage.removeItem("lan-os-state-cache");
}
```

---

## Optional Optimierungen

### 4. Selective State Queries (2-3 Hours)

**Status:** NICE TO HAVE  
**Impact:** 30-50% Bandwidth Reduktion  
**Komplexität:** Mittel

**Idee:** Clients können nur benötigte Fields abfragen
```
GET /api/state/full?fields=players,tournament.votes,tournament.matches
GET /api/state/public?exclude=eventLog
```

**Implementation im Server:**
```typescript
// routes/state.ts

interface StateQuery {
  since?: string;
  fields?: string; // CSV: "players,tournament.votes"
  exclude?: string; // CSV: "eventLog"
}

function filterState(state: SystemState, query: StateQuery): SystemState {
  let filtered = state;

  if (query.fields) {
    const fields = query.fields.split(",").map((f) => f.trim());
    const result: Partial<SystemState> = { version: state.version };

    // Simple Field Filtering
    if (fields.includes("players")) result.players = state.players;
    if (fields.includes("tournament")) result.tournament = state.tournament;
    if (fields.includes("soulmask")) result.soulmask = state.soulmask;
    if (fields.includes("games")) result.games = state.games;
    if (fields.includes("eventLog")) result.eventLog = state.eventLog;
    if (fields.includes("config")) result.config = state.config;

    filtered = result as SystemState;
  }

  if (query.exclude) {
    const excludes = query.exclude.split(",").map((f) => f.trim());
    const result = { ...filtered };
    if (excludes.includes("eventLog")) result.eventLog = [];
    if (excludes.includes("checkpoints")) result.checkpoints = [];
    filtered = result;
  }

  return filtered;
}

stateRouter.get("/full", (req, res) => {
  const since = parseSince(req.query as SinceQuery);
  const query = req.query as StateQuery;
  const c = getContainer();
  const current = c.get();
  let view = c.view(Date.now());

  // ✅ NEU: Filter State
  view = filterState(view, query);

  notModifiedOrFull(res, current, view, since);
});
```

**Client-Seite:**
```typescript
// Nur Players + Votes abfragen
const resp = await fetchFullState(since, {
  fields: "players,tournament.votes,tournament.matches"
});

// Oder: Alles außer Event-Log
const resp = await fetchFullState(since, {
  exclude: "eventLog,checkpoints"
});
```

---

### 5. Polling Backoff bei Inactivity (1 Hour)

**Status:** OPTIONAL  
**Impact:** 80% Bandwidth Reduktion bei idle  
**Komplexität:** Niedrig

**Idee:** Erhöhe Polling-Intervall wenn kein State-Change für 3 Min

```typescript
export function usePollingState({
  fetchFn,
  intervalMs = 1500,
  enabled = true,
  onAuthError,
}: PollingOptions & { baseInterval?: number; maxInterval?: number }): PollingResult {
  const [state, setState] = useState<SystemState | null>(null);
  const [connectionError, setConnectionError] = useState("");
  const versionRef = useRef<number | undefined>(undefined);
  const errCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // ✅ NEU: Adaptive Interval
  const [currentInterval, setCurrentInterval] = useState(intervalMs);
  const lastStateChangeRef = useRef(Date.now());

  const doFetch = useCallback(async () => {
    try {
      const resp = await fetchFn(versionRef.current);
      errCountRef.current = 0;
      setConnectionError("");

      if (resp.notModified) {
        // Kein Change: Erhöhe Interval
        const timeSinceChange = Date.now() - lastStateChangeRef.current;
        if (timeSinceChange > 180_000) { // 3 Minuten
          const newInterval = Math.min(currentInterval * 1.5, 10_000); // Max 10s
          if (newInterval !== currentInterval) {
            setCurrentInterval(newInterval);
            console.debug(`[POLL] Interval erhöht auf ${newInterval}ms`);
          }
        }
        return;
      }

      if (resp.state) {
        // State Change: Reset Interval und Timer
        versionRef.current = resp.state.version;
        setState(resp.state);
        lastStateChangeRef.current = Date.now();
        if (currentInterval !== intervalMs) {
          setCurrentInterval(intervalMs);
          console.debug(`[POLL] Interval zurückgesetzt auf ${intervalMs}ms`);
        }
      }
    } catch (err) {
      // ... Error Handling ...
    }
  }, [fetchFn, onAuthError, intervalMs, currentInterval]);

  useEffect(() => {
    if (!enabled) return;
    doFetch();
    timerRef.current = setInterval(doFetch, currentInterval); // ✅ Nutze currentInterval
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [doFetch, currentInterval, enabled]); // ✅ Re-create Interval bei Änderung

  return { state, connectionError, reload };
}
```

---

### 6. Virtual Scrolling für Large Lists (3 Hours)

**Status:** OPTIONAL  
**Impact:** Nur relevant bei 500+ Players  
**Komplexität:** Mittel

**Lösung:** Nutze react-window oder ähnlich
```bash
npm install react-window
```

```typescript
import { FixedSizeList } from "react-window";

export function LeaderboardList({ players }: { players: Player[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style} className="leaderboard-row">
      <span>{index + 1}.</span>
      <span>{players[index]?.name}</span>
      <span>{players[index]?.points} pts</span>
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={players.length}
      itemSize={35}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

---

## Testing der Optimierungen

### Bandwidth-Vorher-Nachher

```bash
# Terminal: Open DevTools Network Tab
# F12 -> Network -> Capture

# Teste /api/state/full für 10 Requests
for i in {1..10}; do
  curl http://localhost:3000/api/state/full
  sleep 2
done

# Notiere:
# - Ohne Gzip: ~41 KB per Request
# - Mit Gzip: ~5 KB per Request
```

### Performance-Monitoring

```typescript
// In usePollingState.ts
const perfStart = performance.now();
const resp = await fetchFn(versionRef.current);
const perfEnd = performance.now();

console.debug(`[PERF] Poll took ${perfEnd - perfStart}ms`);
```

---

## Deployment Checklist

- [ ] Compression installiert und aktiviert
- [ ] Event-Log Rotation aktiviert
- [ ] Client-Side Caching implementiert
- [ ] Tests laufen (npm test)
- [ ] Admin-UI testet
- [ ] TV-Display testet
- [ ] Player-App testet
- [ ] Netzwerk-Traffic geprüft (DevTools Network Tab)

---

## Häufig Gestellte Fragen

**F: Muss ich alles implementieren?**  
A: Nein. Gzip (1) und Event-Log Rotation (2) sind STRONGLY RECOMMENDED. Der Rest ist optional.

**F: Verschlüsselt Gzip die Daten?**  
A: Nein, nur komprimiert. HTTPS ist immer noch nötig für Verschlüsselung.

**F: Funktioniert Cache auf Safari?**  
A: Ja, localStorage ist Standard. Safari hat Limits (~5MB).

**F: Was ist mit Offline-First?**  
A: Mit Cache-Implementierung: ja, aber keine Mutation Sync.

---

## Support & Debugging

Wenn Probleme auftreten:

```bash
# Compression testen
curl -H "Accept-Encoding: gzip" -v http://localhost:3000/api/state/full

# Cache inspizieren (DevTools)
localStorage.getItem("lan-os-state-cache")

# Event-Log Größe checken
fetch("/api/state/full").then(r => r.json()).then(s => console.log(s.eventLog.length))
```

---

**Viel Erfolg bei der Optimierung!** 🚀
