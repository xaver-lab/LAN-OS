// Factory für leeren SYSTEM_STATE — Boot fällt darauf zurück, wenn kein Checkpoint existiert.

import {
  DEFAULT_CONFIG,
  DEFAULT_GAMES,
  DEFAULT_GLOBAL_GOALS,
  DEFAULT_MODIFIERS,
  DEFAULT_SOULMASK_ROLES,
  DEFAULT_UI_PREFERENCES,
} from "./constants.js";
import type { Game, GlobalGoal, SystemState } from "./types.js";
import { SCHEMA_VERSION } from "./types.js";

export function createEmptyState(now: number = Date.now()): SystemState {
  const games: Game[] = DEFAULT_GAMES.map((g, i) => ({
    id: `g_${i + 1}`,
    title: g.title,
    tag: g.tag,
    color: g.color,
    avgDurationMin: null,
    recommendedPlayers: null,
    suitableModes: [],
    complexity: "medium",
    tournamentSuitability: 0,
    chaosPotential: 0,
    aiAnalyzed: false,
    inActivePool: false,
    scoringRules: [],
  }));

  const goals: GlobalGoal[] = DEFAULT_GLOBAL_GOALS.map((g, i) => ({
    id: `goal_default_${i + 1}`,
    label: g.label,
    color: g.color,
    progress: 0,
  }));

  return {
    version: 1,
    schemaVersion: SCHEMA_VERSION,
    activeTracks: ["TOURNAMENT"],
    tournamentState: "LOBBY",
    soulmaskState: "IDLE",
    config: { ...DEFAULT_CONFIG },
    players: [],
    games,
    votingSession: null,
    spinSession: null,
    matches: [],
    modifiers: DEFAULT_MODIFIERS.map((m) => ({ ...m, rules: { ...m.rules } })),
    soulmaskData: {
      sessionId: "",
      defaultRoles: DEFAULT_SOULMASK_ROLES.slice(),
      customRoles: [],
      activeRoles: {},
      roleHistory: [],
      tasks: [],
      globalGoals: goals,
      morale: 0,
    },
    leaderboard: { top: [] },
    eventLog: [
      {
        id: `e_${now}`,
        timestamp: now,
        type: "system",
        payload: { event: "BOOT", schemaVersion: SCHEMA_VERSION },
        actorId: null,
      },
    ],
    checkpoints: [],
    uiPreferences: { ...DEFAULT_UI_PREFERENCES },
    simulationActive: false,
    tournament: null,
  };
}
