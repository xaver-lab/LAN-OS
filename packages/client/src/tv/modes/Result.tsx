// TV Mode: Result — Gewinner gross, nach Voting/Spin.

import React from "react";
import type { SystemState } from "@lan-os/shared";

interface Props {
  state: SystemState;
}

export function ResultMode({ state }: Props) {
  const spin = state.spinSession;
  const winner = spin?.winnerId ? state.games.find((g) => g.id === spin.winnerId) : null;

  return (
    <div className="grid-bg scanline" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <div style={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace", color: "var(--muted)", letterSpacing: "0.3em", animation: "fadeIn 0.4s ease" }}>NÄCHSTES SPIEL</div>
      {winner ? (
        <>
          <div style={{ fontSize: 72, fontWeight: 700, color: "var(--neon)", textShadow: "0 0 30px var(--neon), 0 0 80px var(--neon)", letterSpacing: "0.03em", textAlign: "center", padding: "0 40px", animation: "fadeIn 0.6s ease" }}>
            {winner.title}
          </div>
          <div style={{ display: "flex", gap: 8, animation: "fadeIn 0.8s ease" }}>
            <span style={{ padding: "4px 12px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em" }}>
              {winner.tag}
            </span>
            <span style={{ padding: "4px 12px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
              {winner.complexity}
            </span>
          </div>
          {(winner.avgDurationMin || winner.recommendedPlayers) && (
            <div style={{ fontSize: 14, color: "var(--muted)", textAlign: "center", maxWidth: 500, lineHeight: 1.6, animation: "fadeIn 1s ease" }}>
              {winner.avgDurationMin && `~${winner.avgDurationMin}min`}
              {winner.avgDurationMin && winner.recommendedPlayers && " · "}
              {winner.recommendedPlayers && `${winner.recommendedPlayers.min}–${winner.recommendedPlayers.max} Spieler`}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 36, color: "var(--muted)" }}>Kein Gewinner gesetzt.</div>
      )}
    </div>
  );
}
