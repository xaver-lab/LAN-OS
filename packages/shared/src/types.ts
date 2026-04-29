// Datenmodell — 1:1-Mapping aus README §4.2 (SPEC v3, schemaVersion 3.0).

export const SCHEMA_VERSION = "3.0" as const;

export type Track = "TOURNAMENT" | "SOULMASK";

export type TournamentState =
  | "LOBBY"
  | "VOTING"
  | "ELIMINATION_APPLIED"
  | "SPIN"
  | "RESULT"
  | "MATCH_SETUP"
  | "MATCH_ACTIVE"
  | "MATCH_RESULT_PENDING"
  | "MATCH_DONE"
  | "INACTIVE"
  | "ERROR_GUARD";

export type SoulmaskState = "IDLE" | "ACTIVE" | "PAUSED" | "DONE";

export type VotingMode = "MULTI" | "ELIMINATION";

export type WheelVariant = "pie" | "orbital" | "fortune";

export type TvTheme = "dark-arcade" | "synthwave" | "arctic";

export type PlayerRole =
  | "Spieler"
  | "Zuschauer"
  | "GameMaster"
  | "Admin"
  | "SoulmaskLead"
  | "ShowOperator";

export type GameTag =
  | "FPS"
  | "Sport"
  | "Tactical"
  | "RTS"
  | "Sandbox"
  | "BattleRoyale"
  | "Coop"
  | "Arena"
  | "Party"
  | "Survival"
  | "Strategy"
  | "Competitive";

export type MatchType = "1v1" | "2v2" | "team" | "ffa";

export type MatchStatus = "open" | "active" | "result-pending" | "done";

export type MatchCreationMethod = "manual" | "shake";

export type ModifierCategory = "risk-reward" | "balance" | "chaos";

export type ModifierApplyTo = "match" | "round" | "session";

export type GameComplexity = "casual" | "medium" | "hardcore";

export type GameMode = "1v1" | "2v2" | "team" | "ffa";

export type TieBreakState =
  | "none"
  | "pending-admin"
  | "auto-spin"
  | "auto-multi-eliminate";

export type EventLogType =
  | "vote"
  | "spin"
  | "match-start"
  | "match-done"
  | "admin-action"
  | "modifier-set"
  | "soulmask-task"
  | "system"
  | "player-join"
  | "player-leave";

export type CheckpointTrigger = "auto" | "manual";

export interface Streak {
  current: number;
  best: number;
  lastBonusAt: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  points: number;
  role: PlayerRole;
  activeTracks: Track[];
  /** ABGELEITET (siehe §4.3) — wird beim Read frisch berechnet. */
  online: boolean;
  lastSeen: number;
  sessionToken: string;
  warnings: number;
  playtimeSec: number;
  streak: Streak;
}

export interface Game {
  id: string;
  title: string;
  tag: GameTag;
  color: string;
  avgDurationMin: number | null;
  recommendedPlayers: { min: number; max: number } | null;
  suitableModes: GameMode[];
  complexity: GameComplexity;
  tournamentSuitability: number;
  chaosPotential: number;
  aiAnalyzed: boolean;
  inActivePool: boolean;
}

export interface VotingSession {
  mode: VotingMode;
  startedAt: number;
  endsAt: number | null;
  pool: string[];
  /** MULTI: gameId[]; ELIMINATION: array.length === 1. */
  votes: Record<string, string[]>;
  eliminated: string[];
  tieBreakState: TieBreakState;
}

export interface SpinSession {
  candidates: string[];
  winnerId: string | null;
  wheelVariant: WheelVariant;
  startedAt: number;
  durationMs: number;
}

export interface MatchScores {
  A: number | null;
  B: number | null;
  perPlayer: Record<string, number> | null;
}

export interface PointsBreakdownEntry {
  rule: string;
  pts: number;
}

export interface PointsAwarded {
  perPlayer: Record<string, number>;
  breakdown: PointsBreakdownEntry[];
}

export interface Match {
  id: string;
  roundNumber: number;
  type: MatchType;
  gameId: string;
  creationMethod: MatchCreationMethod;
  status: MatchStatus;
  teamA: string[];
  teamB: string[];
  scores: MatchScores;
  confirmed: boolean;
  confirmedAt: number | null;
  mvpPlayerId: string | null;
  activeModifiers: string[];
  pointsAwarded: PointsAwarded | null;
}

export interface ModifierRules {
  multiplier?: number;
  handicap?: number;
  chaosFlag?: boolean;
  /** Frei-Form für UI-Anzeige (nicht logikrelevant). */
  note?: string;
}

export interface Modifier {
  id: string;
  category: ModifierCategory;
  label: string;
  rules: ModifierRules;
  appliesTo: ModifierApplyTo;
  enabled: boolean;
}

export type DefaultSoulmaskRole =
  | "Builder"
  | "Fighter"
  | "Farmer"
  | "Explorer"
  | "Support"
  | "Scout";

export interface CustomSoulmaskRole {
  id: string;
  label: string;
  color: string;
  icon: string | null;
}

export interface RoleHistoryEntry {
  playerId: string;
  fromRole: string;
  toRole: string;
  at: number;
}

export interface SoulmaskTask {
  id: string;
  playerId: string;
  /** roleId = DefaultSoulmaskRole | CustomSoulmaskRole.id */
  role: string;
  label: string;
  done: boolean;
  createdAt: number;
  doneAt: number | null;
}

export interface GlobalGoal {
  id: string;
  label: string;
  progress: number;
  color: string;
}

export interface SoulmaskData {
  sessionId: string;
  defaultRoles: DefaultSoulmaskRole[];
  customRoles: CustomSoulmaskRole[];
  activeRoles: Record<string, string>;
  roleHistory: RoleHistoryEntry[];
  tasks: SoulmaskTask[];
  globalGoals: GlobalGoal[];
  /** ABGELEITET (siehe §4.3). */
  morale: number;
}

export interface EventLogEntry {
  id: string;
  timestamp: number;
  type: EventLogType;
  payload: Record<string, unknown>;
  actorId: string | null;
}

export interface CheckpointMeta {
  label: string;
  filename: string;
  createdAt: number;
  trigger: CheckpointTrigger;
  stateVersion: number;
}

export interface PollingIntervalConfig {
  tv: number;
  browser: number;
  admin: number;
}

export interface SystemConfig {
  votingMode: VotingMode;
  votingTimerSec: number;
  votingMinPool: number;
  votingMaxPool: number;
  votingMaxVotesPerPlayer: number | null;
  autoCheckpoint: boolean;
  pollingIntervalMs: PollingIntervalConfig;
  heartbeatTimeoutSec: number;
  soulmaskAllowPlayerCustomRoles: boolean;
}

export interface UiPreferences {
  tvTheme: TvTheme;
  wheelVariant: WheelVariant;
}

export interface Leaderboard {
  /** ABGELEITET — sortiert desc nach players[].points. */
  top: string[];
}

export interface SystemState {
  version: number;
  schemaVersion: typeof SCHEMA_VERSION;
  activeTracks: Track[];
  tournamentState: TournamentState;
  soulmaskState: SoulmaskState;
  config: SystemConfig;
  players: Player[];
  games: Game[];
  votingSession: VotingSession | null;
  spinSession: SpinSession | null;
  matches: Match[];
  modifiers: Modifier[];
  soulmaskData: SoulmaskData;
  leaderboard: Leaderboard;
  eventLog: EventLogEntry[];
  checkpoints: CheckpointMeta[];
  uiPreferences: UiPreferences;
  /** Nicht in §4.2 spezifiziert — vom Coding Agent für §16.7 ergänzt (Plan-Approval). */
  simulationActive: boolean;
}
