// Leaderboard Component — Live-Anzeige mit Polling und Streak-Icons.

import React from "react";
import type { SystemState } from "@lan-os/shared";
import { Card, NeonBar } from "../../design/components/index.js";

interface Props {
  state: SystemState;
  playerId?: string;
  maxEntries?: number;
}

export function LeaderboardWidget({ state, playerId, maxEntries = 10 }: Props) {
  // Sortiere nach Punkten (desc) — leaderboard.top hat die IDs bereits sortiert
  const leaderEntries = state.leaderboard.top.slice(0, maxEntries).map((pid) => {
    const p = state.players.find((pl) => pl.id === pid);
    return {
      playerId: pid,
      player: p,
      points: p?.points ?? 0,
      streak: p?.streak,
    };
  });

  const maxPoints = Math.max(...leaderEntries.map((e) => e.points), 1);

  return (
    <Card title="Leaderboard" style={{ overflow: "hidden" }}>
      <div style={{ display: "grid", gap: 8 }}>
        {leaderEntries.length === 0 && (
          <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
            Noch keine Punkte.
          </div>
        )}
        {leaderEntries.map((entry, i) => {
          const isMe = entry.playerId === playerId;
          const rankColor =
            i === 0 ? "#ffd700" : // Gold
            i === 1 ? "#c0c0c0" : // Silver
            i === 2 ? "#cd7f32" : // Bronze
            "var(--muted)";

          return (
            <div
              key={entry.playerId}
              style={{
                display: "grid",
                gap: 4,
                padding: "10px 12px",
                background: isMe ? "var(--neon-dim)" : "var(--bg3)",
                border: `1px solid ${isMe ? "var(--neon)" : "var(--border)"}`,
                borderRadius: 6,
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: rankColor, width: 24, fontWeight: 700 }}>
                  #{i + 1}
                </span>
                {entry.player && (
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: entry.player.color,
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                )}
                <span style={{ flex: 1, fontWeight: isMe ? 700 : 500, fontSize: 14 }}>
                  {entry.player?.name ?? entry.playerId}
                </span>
                {entry.streak && entry.streak.current >= 3 && (
                  <span style={{ fontSize: 12, marginRight: 4 }}>🔥 ×{entry.streak.current}</span>
                )}
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    color: isMe ? "var(--neon)" : "var(--text)",
                    fontWeight: 700,
                  }}
                >
                  {entry.points}
                </span>
              </div>
              <NeonBar
                value={entry.points}
                max={maxPoints}
                color={isMe ? "var(--neon)" : rankColor === "var(--muted)" ? "var(--cyan)" : rankColor}
                height={3}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
