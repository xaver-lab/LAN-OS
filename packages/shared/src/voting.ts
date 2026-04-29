import type { Game, SystemConfig, VotingMode, VotingSession } from "./types.js";

export class VotingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VotingError";
  }
}

export interface PoolGuardResult {
  ok: boolean;
  reason?: string;
}

/** §5.3 Voting Pool Guards — min/max Pool, Check vor Voting-Start. */
export function checkPoolForStart(
  pool: string[],
  config: SystemConfig,
  games: Game[],
): PoolGuardResult {
  if (pool.length < config.votingMinPool) {
    return {
      ok: false,
      reason: `Pool zu klein (${pool.length} < min ${config.votingMinPool}).`,
    };
  }
  if (pool.length > config.votingMaxPool) {
    return {
      ok: false,
      reason: `Pool zu gross (${pool.length} > max ${config.votingMaxPool}).`,
    };
  }
  const knownIds = new Set(games.map((g) => g.id));
  for (const id of pool) {
    if (!knownIds.has(id)) {
      return { ok: false, reason: `Unbekanntes Spiel im Pool: ${id}.` };
    }
  }
  return { ok: true };
}

/** §5.3 — nach Elimination muss ≥ 2 Spiele übrig sein. */
export function checkPoolAfterEliminate(remaining: string[]): PoolGuardResult {
  if (remaining.length < 2) {
    return {
      ok: false,
      reason: `Nach Elimination nur noch ${remaining.length} Spiel(e) übrig (min 2).`,
    };
  }
  return { ok: true };
}

/** Validiert eine Vote-Submission gegen den aktuellen Modus und das Limit. */
export function validateVote(
  session: VotingSession,
  gameIds: string[],
  config: SystemConfig,
): PoolGuardResult {
  if (session.mode === "ELIMINATION") {
    if (gameIds.length !== 1) {
      return {
        ok: false,
        reason: "ELIMINATION-Modus: genau eine Strike-Stimme erlaubt.",
      };
    }
  } else {
    // MULTI
    const limit = config.votingMaxVotesPerPlayer;
    if (limit !== null && gameIds.length > limit) {
      return {
        ok: false,
        reason: `MULTI-Modus: max ${limit} Stimmen pro Spieler.`,
      };
    }
    const unique = new Set(gameIds);
    if (unique.size !== gameIds.length) {
      return { ok: false, reason: "Doppelte Stimmen für dasselbe Spiel." };
    }
  }
  for (const gid of gameIds) {
    if (!session.pool.includes(gid)) {
      return { ok: false, reason: `Spiel ${gid} nicht im Pool.` };
    }
    if (session.eliminated.includes(gid)) {
      return { ok: false, reason: `Spiel ${gid} bereits eliminiert.` };
    }
  }
  return { ok: true };
}

export interface VoteCounts {
  /** gameId → Anzahl Stimmen */
  counts: Record<string, number>;
  /** Anzahl Spieler, die abgestimmt haben */
  voters: number;
}

export function tallyVotes(session: VotingSession): VoteCounts {
  const counts: Record<string, number> = {};
  for (const gid of session.pool) counts[gid] = 0;
  let voters = 0;
  for (const gameIds of Object.values(session.votes)) {
    if (gameIds.length === 0) continue;
    voters += 1;
    for (const gid of gameIds) {
      counts[gid] = (counts[gid] ?? 0) + 1;
    }
  }
  return { counts, voters };
}

export interface VotingOutcome {
  /** Spiele mit der jeweils relevanten Höchstzahl. */
  topGames: string[];
  /** Restliche Spiele nach möglicher Elimination (für SPIN). */
  remaining: string[];
  /** Stimmen-Anzahl der Top-Games. */
  topCount: number;
}

/** Ermittelt den/die Sieger im MULTI-Mode (höchste Stimmenzahl). */
export function resolveMultiOutcome(session: VotingSession): VotingOutcome {
  const { counts } = tallyVotes(session);
  const active = session.pool.filter((g) => !session.eliminated.includes(g));
  let max = -1;
  for (const gid of active) {
    const c = counts[gid] ?? 0;
    if (c > max) max = c;
  }
  const topGames = active.filter((gid) => (counts[gid] ?? 0) === max);
  return { topGames, remaining: active, topCount: Math.max(0, max) };
}

/** Ermittelt das eliminierte Spiel im ELIMINATION-Mode (höchste Strike-Anzahl). */
export function resolveEliminationOutcome(
  session: VotingSession,
): VotingOutcome {
  const { counts } = tallyVotes(session);
  const active = session.pool.filter((g) => !session.eliminated.includes(g));
  let max = -1;
  for (const gid of active) {
    const c = counts[gid] ?? 0;
    if (c > max) max = c;
  }
  const topGames = active.filter((gid) => (counts[gid] ?? 0) === max);
  const remaining = active.filter((gid) => !topGames.includes(gid));
  return { topGames, remaining, topCount: Math.max(0, max) };
}

/** Hilfsfunktion: gibt es überhaupt Stimmen? */
export function hasAnyVotes(session: VotingSession): boolean {
  return Object.values(session.votes).some((v) => v.length > 0);
}

export const VOTING_MODES: VotingMode[] = ["MULTI", "ELIMINATION"];
