// TV Mode: Lobby — Leaderboard Top5, Active Players, Playtime.

import React from "react";
import type { SystemState } from "@lan-os/shared";
import { PulsingDot, NeonBar } from "../../design/components/index.js";

interface Props {
  state: SystemState;
}

export function LobbyMode({ state }: Props) {
  // leaderboard.top is string[] of player IDs
  const leaderEntries = state.leaderboard.top.slice(0, 5).map((pid) => {
    const p = state.players.find((pl) => pl.id === pid);
    return { playerId: pid, player: p, points: p?.points ?? 0 };
  });
  const onlinePlayers = state.players.filter((p) => p.online);
  const maxPoints = Math.max(...leaderEntries.map((e) => e.points), 1);

  // Derive last winner from last done match
  const lastDoneMatch = [...state.matches].reverse().find((m) => m.status === "done");
  const lastWinnerGame = lastDoneMatch ? state.games.find((g) => g.id === lastDoneMatch.gameId) : null;

  return (
    <div className="grid-bg scanline" style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto 1fr auto", gap: 0, padding: 0 }}>
      {/* Header */}
      <div style={{ gridColumn: "1 / -1", padding: "20px 40px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 24, background: "var(--bg2)", position: "relative", zIndex: 1 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 28, color: "var(--neon)", textShadow: "0 0 15px var(--neon)", letterSpacing: "0.25em" }}>LAN OS</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <PulsingDot />
          <span style={{ color: "var(--muted)", fontSize: 14, letterSpacing: "0.1em" }}>{onlinePlayers.length} ONLINE</span>
        </div>
        <div style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "var(--muted)" }}>LOBBY</div>
      </div>

      {/* Leaderboard */}
      <div style={{ padding: 40, borderRight: "1px solid var(--border)", position: "relative", zIndex: 1, overflowY: "auto" }}>
        <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "var(--muted)", letterSpacing: "0.15em", marginBottom: 24 }}>LEADERBOARD</div>
        {leaderEntries.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 16 }}>Noch keine Punkte.</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {leaderEntries.map((entry, i) => {
              const rankColor = i === 0 ? "var(--amber)" : i === 1 ? "var(--muted)" : i === 2 ? "#cd7f32" : "var(--muted)";
              return (
                <div key={entry.playerId} style={{ display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 700, color: rankColor, width: 40, textAlign: "center" }}>#{i + 1}</span>
                    {entry.player && <span style={{ width: 14, height: 14, borderRadius: "50%", background: entry.player.color, boxShadow: `0 0 8px ${entry.player.color}`, display: "inline-block", flexShrink: 0 }} />}
                    <span style={{ flex: 1, fontSize: 22, fontWeight: 700, color: i === 0 ? "var(--text)" : "var(--muted)" }}>{entry.player?.name ?? entry.playerId}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: i === 0 ? "var(--neon)" : "var(--text)", textShadow: i === 0 ? "0 0 10px var(--neon)" : "none" }}>{entry.points}</span>
                  </div>
                  <NeonBar value={entry.points} max={maxPoints} color={i === 0 ? "var(--neon)" : "var(--cyan)"} height={4} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div style={{ display: "grid", gridTemplateRows: "auto 1fr", position: "relative", zIndex: 1 }}>
        {/* Last Winner */}
        {lastDoneMatch && lastWinnerGame && (
          <div style={{ padding: "24px 40px", borderBottom: "1px solid var(--border)", background: "#ffb83010" }}>
            <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "var(--amber)", letterSpacing: "0.15em", marginBottom: 10 }}>LAST MATCH</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--amber)" }}>{lastWinnerGame.title}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
              {lastDoneMatch.scores.A ?? "?"} : {lastDoneMatch.scores.B ?? "?"}
              {lastDoneMatch.mvpPlayerId && ` · MVP: ${state.players.find((p) => p.id === lastDoneMatch.mvpPlayerId)?.name ?? "?"}`}
            </div>
          </div>
        )}

        {/* Active Players */}
        <div style={{ padding: "24px 40px", overflowY: "auto" }}>
          <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "var(--muted)", letterSpacing: "0.15em", marginBottom: 16 }}>ACTIVE PLAYERS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {state.players.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", background: p.online ? "var(--bg3)" : "transparent", border: `1px solid ${p.online ? p.color : "var(--border)"}`, borderRadius: 20, opacity: p.online ? 1 : 0.4, transition: "all 0.3s" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, boxShadow: p.online ? `0 0 6px ${p.color}` : "none", display: "inline-block" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: p.online ? "var(--text)" : "var(--muted)" }}>{p.name}</span>
                {p.online && <PulsingDot size={6} color={p.color} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ gridColumn: "1 / -1", padding: "10px 40px", borderTop: "1px solid var(--border)", background: "var(--bg2)", display: "flex", alignItems: "center", gap: 24, position: "relative", zIndex: 1 }}>
        <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>Tournament: {state.tournamentState}</span>
        {state.soulmaskState !== "IDLE" && <span style={{ fontSize: 12, color: "var(--magenta)", fontFamily: "'JetBrains Mono', monospace" }}>Soulmask: {state.soulmaskState}</span>}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>v{state.version}</span>
      </div>
    </div>
  );
}
