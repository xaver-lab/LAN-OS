// §11 Self-Service Player-Anmeldung + Re-Connect.

import { randomBytes } from "node:crypto";
import {
  PLAYER_COLOR_PALETTE,
  type Player,
  type PlayerRole,
  type Track,
  type SystemState,
} from "@lan-os/shared";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

function genToken(): string {
  return randomBytes(24).toString("hex");
}

function genPlayerId(): string {
  return `p_${Date.now()}_${randomBytes(3).toString("hex")}`;
}

function pickColor(state: SystemState, requested?: string): string {
  const used = new Set(state.players.map((p) => p.color.toLowerCase()));
  if (requested) {
    const r = requested.toLowerCase();
    if (!used.has(r) && /^#[0-9a-f]{6}$/i.test(requested)) return requested;
  }
  for (const c of PLAYER_COLOR_PALETTE) {
    if (!used.has(c.toLowerCase())) return c;
  }
  // Fallback: random hex
  return `#${randomBytes(3).toString("hex")}`;
}

export interface LoginArgs {
  name: string;
  colorWish?: string;
  role?: PlayerRole;
  activeTracks?: Track[];
}

export interface LoginResult {
  state: SystemState;
  player: Player;
}

/** §11.1 — neuer Player oder Reconnect-by-name (manuell angelegte Player). */
export function loginPlayer(
  state: SystemState,
  args: LoginArgs,
  now: number,
): LoginResult {
  const trimmed = args.name.trim();
  if (!trimmed) throw new AuthError("Name darf nicht leer sein.");
  if (trimmed.length > 24) throw new AuthError("Name max. 24 Zeichen.");

  const existing = state.players.find(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) {
    // §11.3: manuell angelegte Player ohne Token bekommen einen, sobald sie sich verbinden.
    if (!existing.sessionToken) {
      const updated: Player = {
        ...existing,
        sessionToken: genToken(),
        lastSeen: now,
      };
      const players = state.players.map((p) =>
        p.id === existing.id ? updated : p,
      );
      return { state: { ...state, players }, player: updated };
    }
    throw new AuthError("Name bereits vergeben.");
  }

  const color = pickColor(state, args.colorWish);
  const player: Player = {
    id: genPlayerId(),
    name: trimmed,
    color,
    points: 0,
    role: args.role ?? "Spieler",
    activeTracks: args.activeTracks ?? ["TOURNAMENT"],
    online: true,
    lastSeen: now,
    sessionToken: genToken(),
    warnings: 0,
    playtimeSec: 0,
    streak: { current: 0, best: 0, lastBonusAt: 0 },
  };
  return {
    state: { ...state, players: [...state.players, player] },
    player,
  };
}

/** §11.2 Reconnect-by-token. */
export function reconnectByToken(
  state: SystemState,
  token: string,
  now: number,
): LoginResult {
  const player = state.players.find((p) => p.sessionToken === token);
  if (!player) throw new AuthError("Token ungültig.");
  const updated: Player = { ...player, lastSeen: now };
  const players = state.players.map((p) =>
    p.id === player.id ? updated : p,
  );
  return { state: { ...state, players }, player: updated };
}

/** §11.2b Reconnect-by-name — Spieler mit Namen verbinden sich erneut. */
export function reconnectByName(
  state: SystemState,
  name: string,
  now: number,
): LoginResult {
  const trimmed = name.trim();
  if (!trimmed) throw new AuthError("Name darf nicht leer sein.");
  const player = state.players.find(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (!player) throw new AuthError("Spieler nicht gefunden.");
  const updated: Player = { ...player, lastSeen: now, online: true };
  const players = state.players.map((p) =>
    p.id === player.id ? updated : p,
  );
  return { state: { ...state, players }, player: updated };
}

/** Admin: erstellt Player ohne Token (manuelles Hinzufügen). */
export function manualAddPlayer(
  state: SystemState,
  args: { name: string; color?: string; role?: Player["role"] },
  now: number,
): LoginResult {
  const trimmed = args.name.trim();
  if (!trimmed) throw new AuthError("Name darf nicht leer sein.");
  if (
    state.players.some(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    throw new AuthError("Name bereits vergeben.");
  }
  const color = pickColor(state, args.color);
  const player: Player = {
    id: genPlayerId(),
    name: trimmed,
    color,
    points: 0,
    role: args.role ?? "Spieler",
    activeTracks: ["TOURNAMENT"],
    online: false,
    lastSeen: 0,
    sessionToken: "",
    warnings: 0,
    playtimeSec: 0,
    streak: { current: 0, best: 0, lastBonusAt: 0 },
  };
  return {
    state: { ...state, players: [...state.players, player] },
    player,
  };
}

/** §11.4 Kick — invalidiert sessionToken, setzt online=false (per lastSeen=0). */
export function kickPlayer(state: SystemState, playerId: string): SystemState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, sessionToken: "", lastSeen: 0 } : p,
    ),
  };
}
