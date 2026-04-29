// Player Tab: Status — eigener Punktestand, Streak, Playtime, Leaderboard.

import React from "react";
import type { SystemState } from "@lan-os/shared";
import { Card, NeonBar, Badge } from "../../design/components/index.js";

interface Props {
  state: SystemState;
  playerId: string;
}

export function StatusTab({ state, playerId }: Props) {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) {
    return <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>Spieler nicht gefunden.</div>;
  }

  // leaderboard.top is string[] of player IDs
  const leaderEntries = state.leaderboard.top.map((pid) => {
    const p = state.players.find((pl) => pl.id === pid);
    return { playerId: pid, player: p, points: p?.points ?? 0 };
  });

  const rank = leaderEntries.findIndex((e) => e.playerId === playerId) + 1;
  const maxPoints = Math.max(...leaderEntries.map((e) => e.points), 1);
  const playtimeMins = Math.floor(me.playtimeSec / 60);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card accent="var(--neon)">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${me.color}33`, border: `2px solid ${me.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: me.color, flexShrink: 0 }}>
            {me.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{me.name}</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>{me.role}</div>
          </div>
          {rank > 0 && (
            <div style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: rank <= 3 ? "var(--amber)" : "var(--muted)" }}>
              #{rank}
            </div>
          )}
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
            <span style={{ color: "var(--muted)" }}>Punkte</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--neon)", fontWeight: 700 }}>{me.points}</span>
          </div>
          <NeonBar value={me.points} max={maxPoints} color="var(--neon)" height={6} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 16px", flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: me.streak.current > 0 ? "var(--amber)" : "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
              {me.streak.current > 0 ? `🔥 ×${me.streak.current}` : "—"}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Streak</div>
          </div>
          <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 16px", flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--cyan)", fontFamily: "'JetBrains Mono', monospace" }}>{me.streak.best}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Best Streak</div>
          </div>
          <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 16px", flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", fontFamily: "'JetBrains Mono', monospace" }}>{playtimeMins}m</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Playtime</div>
          </div>
        </div>
        {me.warnings > 0 && (
          <Badge variant="amber" style={{ width: "100%", justifyContent: "center" }}>
            ⚠ {me.warnings} Verwarnung{me.warnings > 1 ? "en" : ""}
          </Badge>
        )}
      </Card>

      <Card title="Leaderboard">
        <div style={{ display: "grid", gap: 6 }}>
          {leaderEntries.length === 0 && <div style={{ color: "var(--muted)", fontSize: 13 }}>Noch keine Punkte.</div>}
          {leaderEntries.map((entry, i) => {
            const isMe = entry.playerId === playerId;
            return (
              <div key={entry.playerId} style={{ display: "grid", gap: 4, padding: "8px 12px", background: isMe ? "var(--neon-dim)" : "var(--bg3)", border: `1px solid ${isMe ? "var(--neon)" : "var(--border)"}`, borderRadius: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: i < 3 ? "var(--amber)" : "var(--muted)", width: 20 }}>#{i + 1}</span>
                  {entry.player && <span style={{ width: 8, height: 8, borderRadius: "50%", background: entry.player.color, display: "inline-block", flexShrink: 0 }} />}
                  <span style={{ flex: 1, fontWeight: isMe ? 700 : 500, fontSize: 14 }}>{entry.player?.name ?? entry.playerId}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: isMe ? "var(--neon)" : "var(--text)", fontWeight: 700 }}>{entry.points}</span>
                </div>
                <NeonBar value={entry.points} max={maxPoints} color={isMe ? "var(--neon)" : "var(--cyan)"} height={3} />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
