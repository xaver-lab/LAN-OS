// §4.3 Abgeleitete Werte — werden bei jeder Read-Antwort frisch berechnet.

import type { Match, SoulmaskData, SystemState } from "./types.js";

/** §11.4: online = (now - lastSeen) < heartbeatTimeoutSec. */
export function isPlayerOnline(
  lastSeen: number,
  heartbeatTimeoutSec: number,
  now: number,
): boolean {
  return now - lastSeen < heartbeatTimeoutSec * 1000;
}

/** Sortiert players[].id desc nach points. */
export function computeLeaderboard(state: SystemState): string[] {
  return state.players
    .slice()
    .sort((a, b) => b.points - a.points)
    .map((p) => p.id);
}

/** §9.5: morale = done-tasks / total-tasks * 100. */
export function computeMorale(data: SoulmaskData): number {
  if (data.tasks.length === 0) return 0;
  const done = data.tasks.filter((t) => t.done).length;
  return Math.round((done / data.tasks.length) * 100);
}

/** §4.3: TV-„Last Game Winner" = letztes Match mit status='done', höchstem confirmedAt. */
export function findLastDoneMatch(matches: Match[]): Match | null {
  const done = matches.filter((m) => m.status === "done" && m.confirmedAt);
  if (done.length === 0) return null;
  return done.reduce((acc, m) =>
    (m.confirmedAt ?? 0) > (acc.confirmedAt ?? 0) ? m : acc,
  );
}

/** Liefert eine View des States mit allen abgeleiteten Werten frisch berechnet. */
export function withDerived(state: SystemState, now: number): SystemState {
  const heartbeat = state.config.heartbeatTimeoutSec;
  return {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      online: isPlayerOnline(p.lastSeen, heartbeat, now),
    })),
    soulmaskData: {
      ...state.soulmaskData,
      morale: computeMorale(state.soulmaskData),
    },
    leaderboard: { top: computeLeaderboard(state) },
  };
}
