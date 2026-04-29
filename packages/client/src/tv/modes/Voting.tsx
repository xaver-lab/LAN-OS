// TV Mode: Voting — MULTI + ELIMINATION Layouts.

import React from "react";
import type { SystemState } from "@lan-os/shared";
import { PulsingDot } from "../../design/components/index.js";

interface Props {
  state: SystemState;
}

export function VotingMode({ state }: Props) {
  const vs = state.votingSession;
  if (!vs) return null;

  const poolGames = vs.pool.map((id) => state.games.find((g) => g.id === id)).filter(Boolean);
  const votes = vs.votes;
  const onlinePlayers = state.players.filter((p) => p.online);
  const votedCount = Object.keys(votes).length;

  const tally: Record<string, number> = {};
  for (const gameId of vs.pool) tally[gameId] = 0;
  for (const playerVotes of Object.values(votes)) {
    for (const gid of playerVotes) {
      if (tally[gid] !== undefined) tally[gid]++;
    }
  }
  const maxTally = Math.max(...Object.values(tally), 1);
  const eliminated = vs.eliminated ?? [];

  const NEON_COLORS = ["#39ff6e", "#00e5ff", "#ff2d6b", "#ffb830", "#b040ff", "#ff6b2b", "#00ffcc", "#fff700"];

  return (
    <div className="grid-bg scanline" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: 0 }}>
      {/* Header */}
      <div style={{ padding: "20px 40px", borderBottom: "1px solid var(--border)", background: "var(--bg2)", display: "flex", alignItems: "center", gap: 20 }}>
        <PulsingDot color="var(--cyan)" size={10} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: "var(--cyan)", letterSpacing: "0.2em", textShadow: "0 0 12px var(--cyan)" }}>{vs.mode} VOTING</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 20, alignItems: "center" }}>
          <span style={{ fontSize: 14, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>{votedCount}/{onlinePlayers.length} VOTES</span>
          {vs.endsAt && <TimerWidget endsAt={vs.endsAt} />}
        </div>
      </div>

      {/* Game Grid */}
      <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${vs.mode === "MULTI" ? 220 : 300}px, 1fr))`, gap: 16 }}>
          {poolGames.map((game, idx) => {
            if (!game) return null;
            const count = tally[game.id] ?? 0;
            const isEliminated = eliminated.includes(game.id);
            const pct = (count / maxTally) * 100;
            const color = NEON_COLORS[idx % NEON_COLORS.length]!;
            return (
              <div key={game.id} style={{ background: isEliminated ? "var(--bg)" : "var(--bg2)", border: `1px solid ${isEliminated ? "var(--border)" : count > 0 ? "var(--cyan)" : "var(--border)"}`, borderRadius: 10, padding: 20, opacity: isEliminated ? 0.35 : 1, transition: "all 0.3s", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, width: `${pct}%`, background: "var(--cyan)", boxShadow: "0 0 8px var(--cyan)", transition: "width 0.6s ease" }} />
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{game.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700, color: count > 0 ? "var(--cyan)" : "var(--muted)", textShadow: count > 0 ? "0 0 10px var(--cyan)" : "none" }}>{count}</span>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>votes</span>
                  {isEliminated && <span style={{ marginLeft: "auto", fontSize: 20 }}>✕</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Player Vote Status */}
      <div style={{ padding: "12px 40px", borderTop: "1px solid var(--border)", background: "var(--bg2)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {onlinePlayers.map((p) => {
          const hasVoted = votes[p.id] !== undefined;
          return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 12, background: hasVoted ? `${p.color}22` : "var(--bg3)", border: `1px solid ${hasVoted ? p.color : "var(--border)"}`, transition: "all 0.3s" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, display: "inline-block" }} />
              <span style={{ fontSize: 12, color: hasVoted ? p.color : "var(--muted)" }}>{p.name}</span>
              {hasVoted && <span style={{ fontSize: 10, color: p.color }}>✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimerWidget({ endsAt }: { endsAt: number }) {
  const [remaining, setRemaining] = React.useState(Math.max(0, endsAt - Date.now()));
  React.useEffect(() => {
    const t = setInterval(() => setRemaining(Math.max(0, endsAt - Date.now())), 250);
    return () => clearInterval(t);
  }, [endsAt]);
  const secs = Math.ceil(remaining / 1000);
  const isLow = secs < 15;
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 700, color: isLow ? "var(--magenta)" : "var(--neon)", textShadow: isLow ? "0 0 12px var(--magenta)" : "0 0 10px var(--neon)" }}>
      {Math.floor(secs / 60).toString().padStart(2, "0")}:{(secs % 60).toString().padStart(2, "0")}
    </span>
  );
}
