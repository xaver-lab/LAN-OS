import type {
  DefaultSoulmaskRole,
  GameTag,
  GlobalGoal,
  Modifier,
  SystemConfig,
  UiPreferences,
} from "./types.js";

export const DEFAULT_SOULMASK_ROLES: DefaultSoulmaskRole[] = [
  "Builder",
  "Fighter",
  "Farmer",
  "Explorer",
  "Support",
  "Scout",
];

export const DEFAULT_GLOBAL_GOALS: Omit<GlobalGoal, "id">[] = [
  { label: "Base Camp aufbauen", progress: 0, color: "#ffd700" },
  { label: "Ressourcen sammeln", progress: 0, color: "#39ff6e" },
  { label: "Gegner eliminieren", progress: 0, color: "#ff2d6b" },
  { label: "Territorium erkunden", progress: 0, color: "#00e5ff" },
];

export const DEFAULT_CONFIG: SystemConfig = {
  votingMode: "MULTI",
  votingTimerSec: 120,
  votingMinPool: 4,
  votingMaxPool: 8,
  votingMaxVotesPerPlayer: null,
  autoCheckpoint: true,
  pollingIntervalMs: { tv: 1000, browser: 2000, admin: 1000 },
  heartbeatTimeoutSec: 30,
  soulmaskAllowPlayerCustomRoles: true,
};

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  tvTheme: "dark-arcade",
  wheelVariant: "pie",
};

/** Punkte-Konstanten aus README §7.4. */
export const POINTS = {
  win: 100,
  draw: 50,
  loss: 10,
  scoreDiffBonus: 25,
  scoreDiffThreshold: 5,
  mvp: 50,
  streak3: 50,
  streak5: 150,
} as const;

/** Streak-Schwellen aus README §7.4. */
export const STREAK_THRESHOLDS = [
  { count: 3, bonus: POINTS.streak3 },
  { count: 5, bonus: POINTS.streak5 },
] as const;

/** Wheel-Animation aus README §6.2 — Easing-Out, 3.6–3.8s. */
export const SPIN_DURATION_MS = 3700;

/** Default-Modifier-Library — kann vom Admin erweitert werden (§8.3). */
export const DEFAULT_MODIFIERS: Modifier[] = [
  {
    id: "rr-hardcore",
    category: "risk-reward",
    label: "Hardcore × 1.5",
    rules: { multiplier: 1.5, note: "Erhöhtes Risiko, mehr Punkte" },
    appliesTo: "match",
    enabled: true,
  },
  {
    id: "rr-casual",
    category: "risk-reward",
    label: "Casual × 0.75",
    rules: { multiplier: 0.75, note: "Lockerer Modus, weniger Punkte" },
    appliesTo: "match",
    enabled: true,
  },
  {
    id: "bal-underdog",
    category: "balance",
    label: "Underdog Bonus +30",
    rules: { handicap: 30, note: "Punkte-Bonus für klar unterlegene Seite" },
    appliesTo: "match",
    enabled: true,
  },
  {
    id: "bal-handicap-strong",
    category: "balance",
    label: "Handicap −20 für Top-Spieler",
    rules: { handicap: -20, note: "Punkte-Abzug für stärkste Spieler" },
    appliesTo: "match",
    enabled: true,
  },
  {
    id: "ch-double",
    category: "chaos",
    label: "Double Points × 2",
    rules: { multiplier: 2, chaosFlag: true, note: "Alle Punkte verdoppelt" },
    appliesTo: "match",
    enabled: true,
  },
  {
    id: "ch-no-voice",
    category: "chaos",
    label: "No Voice Chat",
    rules: { chaosFlag: true, note: "Show-Regel: keine Sprachkommunikation" },
    appliesTo: "match",
    enabled: true,
  },
  {
    id: "ch-random-rule",
    category: "chaos",
    label: "Random Rule Variation",
    rules: { chaosFlag: true, note: "Show-Regel: zufällige Regel-Variation" },
    appliesTo: "match",
    enabled: true,
  },
];

/** Default-Spiele-Pool aus dem Mockup (kann vom Admin gepflegt werden). */
export const DEFAULT_GAMES: Array<{
  title: string;
  tag: GameTag;
  color: string;
}> = [
  { title: "Counter-Strike 2", tag: "FPS", color: "#ff6b35" },
  { title: "Rocket League", tag: "Sport", color: "#00aaff" },
  { title: "Valorant", tag: "Tactical", color: "#ff4655" },
  { title: "Age of Empires IV", tag: "RTS", color: "#ffd700" },
  { title: "Minecraft", tag: "Sandbox", color: "#78c832" },
  { title: "Warzone", tag: "BattleRoyale", color: "#a855f7" },
  { title: "Halo Infinite", tag: "Arena", color: "#3ad6c8" },
  { title: "Among Us", tag: "Party", color: "#e84a5f" },
];

/** Default-Player-Farb-Palette für Self-Service-Anmeldung (§11.1). */
export const PLAYER_COLOR_PALETTE = [
  "#39ff6e",
  "#00e5ff",
  "#ff2d6b",
  "#ffb830",
  "#a855f7",
  "#ff6b35",
  "#00aaff",
  "#78c832",
  "#ffd700",
  "#3ad6c8",
  "#e84a5f",
  "#ff4655",
];
