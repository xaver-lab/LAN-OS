// TV Mode: TieBreakOverlay — zeigt an, dass ein Gleichstand aufgelöst wird.

import React from "react";
import type { SystemState } from "@lan-os/shared";

interface Props {
  state: SystemState;
}

export function TieBreakOverlay({ state }: Props) {
  const vs = state.votingSession;
  const remaining = vs?.pool.filter((id) => !(vs.eliminated ?? []).includes(id)) ?? [];
  const games = remaining.map((id) => state.games.find((g) => g.id === id)).filter(Boolean);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(8,10,20,0.88)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        zIndex: 50,
        backdropFilter: "blur(6px)",
        animation: "fadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14,
          color: "var(--magenta)",
          letterSpacing: "0.3em",
          textShadow: "0 0 10px var(--magenta)",
        }}
      >
        TIE BREAK
      </div>
      <div
        style={{
          fontSize: 52,
          fontWeight: 700,
          color: "var(--text)",
          letterSpacing: "0.05em",
        }}
      >
        Gleichstand!
      </div>
      <div style={{ fontSize: 16, color: "var(--muted)", maxWidth: 500, textAlign: "center" }}>
        Der Admin wählt eine Auflösungsstrategie…
      </div>

      {/* Remaining games */}
      {games.length > 0 && (
        <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
          {games.map((g) => g && (
            <div
              key={g.id}
              style={{
                padding: "14px 28px",
                background: "var(--bg2)",
                border: "1px solid var(--magenta)",
                borderRadius: 8,
                fontSize: 20,
                fontWeight: 700,
                color: "var(--magenta)",
                boxShadow: "0 0 16px #ff2d6b44",
                animation: "pulse-neon 1.4s ease infinite",
              }}
            >
              {g.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
