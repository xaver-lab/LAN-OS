// TV Mode: Match — laufendes Match: Teams, Live-Score.

import React from "react";
import type { SystemState, Player } from "@lan-os/shared";
import { PulsingDot } from "../../design/components/index.js";

interface Props {
  state: SystemState;
}

export function MatchMode({ state }: Props) {
  const match = state.matches.find((m) => m.status === "active" || m.status === "result-pending");
  if (!match) return null;

  const game  = state.games.find((g) => g.id === match.gameId);
  const teamA = match.teamA.map((id) => state.players.find((p) => p.id === id)).filter(Boolean) as Player[];
  const teamB = match.teamB.map((id) => state.players.find((p) => p.id === id)).filter(Boolean) as Player[];
  const modifiers = match.activeModifiers.map((id) => state.modifiers.find((m) => m.id === id)).filter(Boolean);
  const isResultPending = match.status === "result-pending";

  return (
    <div className="grid-bg scanline" style={{ width: "100%", height: "100%", display: "grid", gridTemplateRows: "auto 1fr auto" }}>
      {/* Header */}
      <div style={{ padding: "20px 40px", borderBottom: "1px solid var(--border)", background: "var(--bg2)", display: "flex", alignItems: "center", gap: 20 }}>
        {!isResultPending && <PulsingDot color="var(--magenta)" size={10} />}
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: isResultPending ? "var(--amber)" : "var(--magenta)", letterSpacing: "0.15em" }}>
          {isResultPending ? "ERGEBNIS AUSSTEHEND" : "MATCH AKTIV"}
        </span>
        <span style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", marginLeft: 20 }}>{game?.title ?? match.gameId}</span>
        <span style={{ marginLeft: "auto", padding: "3px 10px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 12, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>{match.type}</span>
      </div>

      {/* Main: Teams + Score */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "0 60px" }}>
        <TeamBlock players={teamA} align="left" />
        <div style={{ textAlign: "center", padding: "0 40px" }}>
          {match.scores.A !== null && match.scores.B !== null ? (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 96, fontWeight: 700, color: "var(--neon)", textShadow: "0 0 30px var(--neon)", letterSpacing: "0.05em" }}>
              {match.scores.A} : {match.scores.B}
            </div>
          ) : (
            <div style={{ fontSize: 64, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>— : —</div>
          )}
        </div>
        <TeamBlock players={teamB} align="right" />
      </div>

      {/* Footer: Modifiers */}
      <div style={{ padding: "12px 40px", borderTop: "1px solid var(--border)", background: "var(--bg2)", display: "flex", gap: 10, alignItems: "center" }}>
        {modifiers.length > 0 && (
          <>
            <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>MODIFIER:</span>
            {modifiers.map((m) => m && (
              <span key={m.id} style={{ padding: "2px 10px", background: "#ffb83018", border: "1px solid var(--amber)", borderRadius: 4, fontSize: 12, color: "var(--amber)", fontFamily: "'JetBrains Mono', monospace" }}>{m.label}</span>
            ))}
          </>
        )}
        {match.mvpPlayerId && (
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--amber)" }}>
            MVP: {state.players.find((p) => p.id === match.mvpPlayerId)?.name ?? "—"}
          </span>
        )}
      </div>
    </div>
  );
}

function TeamBlock({ players, align }: { players: Player[]; align: "left" | "right" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: align === "left" ? "flex-start" : "flex-end" }}>
      {players.map((p) => (
        <div key={p.id} style={{ display: "flex", flexDirection: align === "left" ? "row" : "row-reverse", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${p.color}33`, border: `2px solid ${p.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: p.color }}>
            {p.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{p.name}</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>{p.points} pts</div>
          </div>
        </div>
      ))}
    </div>
  );
}
