// In-Memory State Container + Mutation-Pipeline.

import {
  createEmptyState,
  withDerived,
  type EventLogEntry,
  type EventLogType,
  type SystemState,
} from "@lan-os/shared";
import {
  writeCheckpoint,
  writeSimulationState,
  writeState,
} from "./persistence.js";

export interface MutationContext {
  /** EventLog-Eintrag, wird an state.eventLog angehängt. */
  log?: {
    type: EventLogType;
    payload: Record<string, unknown>;
    actorId?: string | null;
  };
  /** Wenn true, wird ein Auto-Checkpoint erstellt. */
  autoCheckpoint?: { label: string };
}

class StateContainer {
  private real: SystemState;
  private sim: SystemState;
  private writing: Promise<void> = Promise.resolve();

  constructor(initial: SystemState, simulation: SystemState) {
    this.real = initial;
    this.sim = simulation;
  }

  private active(): SystemState {
    return this.real.simulationActive ? this.sim : this.real;
  }

  /** Liefert den aktuellen State (real oder simulation, je nach Flag). */
  get(): SystemState {
    return this.active();
  }

  /** Liefert den State mit abgeleiteten Werten frisch berechnet. */
  view(now: number): SystemState {
    return withDerived(this.active(), now);
  }

  /** Direkter Zugriff auf real (für admin-system-tab unabhängig vom Sim-Flag). */
  getReal(): SystemState {
    return this.real;
  }

  /**
   * Mutiert den State über einen Reducer. version wird inkrementiert,
   * EventLog angehängt, atomic geschrieben, ggf. Checkpoint erzeugt.
   */
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

    // Persist (queued sequentially via writing promise to avoid concurrent renames).
    this.writing = this.writing.then(() =>
      sim ? writeSimulationState(next) : writeState(next),
    );
    await this.writing;
    return next;
  }

  /** Replace whole state — used for boot, restore, reset. */
  async replace(newState: SystemState, sim = false): Promise<void> {
    if (sim) {
      this.sim = newState;
      this.writing = this.writing.then(() => writeSimulationState(newState));
    } else {
      this.real = newState;
      this.writing = this.writing.then(() => writeState(newState));
    }
    await this.writing;
  }

  /** Toggle simulation flag (lebt am realen State). */
  async setSimulation(active: boolean): Promise<void> {
    this.real = {
      ...this.real,
      simulationActive: active,
      version: this.real.version + 1,
    };
    this.writing = this.writing.then(() => writeState(this.real));
    await this.writing;
  }

  /** Setzt lastSeen für einen Player ohne version-Bump (Heartbeat). */
  touchPlayer(playerId: string, now: number): void {
    const target = this.real.simulationActive ? this.sim : this.real;
    const idx = target.players.findIndex((p) => p.id === playerId);
    if (idx < 0) return;
    target.players[idx] = { ...target.players[idx]!, lastSeen: now };
  }
}

let container: StateContainer | null = null;

export function initContainer(real: SystemState, sim: SystemState): void {
  container = new StateContainer(real, sim);
}

export function getContainer(): StateContainer {
  if (!container) {
    throw new Error("State container not initialized. Call initContainer first.");
  }
  return container;
}

/** Helper for boot.ts. */
export function makeFreshSimState(): SystemState {
  const s = createEmptyState();
  return { ...s, simulationActive: false };
}
