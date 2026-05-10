// TV App — Mode-Switch je tournamentState/soulmaskState.

import React, { useEffect } from "react";
import { fetchPublicState } from "../api/client.js";
import { usePollingState } from "../api/usePollingState.js";
import { ConnectionBanner, SimulationBanner } from "../design/components/index.js";
import { LobbyMode }        from "./modes/Lobby.js";
import { VotingMode }       from "./modes/Voting.js";
import { SpinMode }         from "./modes/Spin.js";
import { ResultMode }       from "./modes/Result.js";
import { MatchMode }        from "./modes/Match.js";
import { SoulmaskMode }     from "./modes/Soulmask.js";
import { TieBreakOverlay }  from "./modes/TieBreakOverlay.js";
import type { SystemState } from "@lan-os/shared";

export function App() {
  const { state, connectionError } = usePollingState({
    fetchFn: fetchPublicState,
    intervalMs: 500,
  });

  useEffect(() => {
    if (state?.uiPreferences?.tvTheme) {
      document.documentElement.setAttribute("data-theme", state.uiPreferences.tvTheme);
    }
  }, [state?.uiPreferences?.tvTheme]);

  if (!state) {
    return (
      <div className="grid-bg scanline" style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 48, fontWeight: 700, color: "var(--neon)", textShadow: "0 0 20px var(--neon), 0 0 60px var(--neon)", letterSpacing: "0.3em" }}>LAN OS</div>
        <div style={{ color: "var(--muted)", letterSpacing: "0.2em", fontSize: 14 }}>CONNECTING…</div>
      </div>
    );
  }

  const ts = state.tournamentState;
  const ss = state.soulmaskState;

  const tieBreak    = ts === "ELIMINATION_APPLIED";
  const spinActive  = ts === "SPIN";
  const resultReady = ts === "RESULT";
  const matchActive = ts === "MATCH_ACTIVE" || ts === "MATCH_RESULT_PENDING";
  const votingActive = ts === "VOTING";
  const soulmaskOnly = ss === "ACTIVE" && ts === "INACTIVE";

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative" }}>
      {connectionError && <ConnectionBanner error={connectionError} />}
      {state.simulationActive && <SimulationBanner />}

      {spinActive     && <SpinMode state={state} />}
      {resultReady    && !spinActive && <ResultMode state={state} />}
      {matchActive    && <MatchMode state={state} />}
      {votingActive   && !tieBreak && <VotingMode state={state} />}
      {soulmaskOnly   && <SoulmaskMode state={state} />}
      {!spinActive && !resultReady && !matchActive && !votingActive && !soulmaskOnly && (
        <LobbyMode state={state} />
      )}

      {tieBreak && <TieBreakOverlay state={state} />}

      {ss === "ACTIVE" && ts !== "INACTIVE" && matchActive && (
        <div style={{ position: "absolute", bottom: 20, right: 20, width: 280, background: "var(--bg2)", border: "1px solid var(--magenta)", borderRadius: 8, padding: 12, boxShadow: "0 0 20px #ff2d6b44", zIndex: 100 }}>
          <SoulmaskPip state={state} />
        </div>
      )}
    </div>
  );
}

function SoulmaskPip({ state }: { state: SystemState }) {
  const sm = state.soulmaskData;
  const done  = sm.tasks.filter((t) => t.done).length;
  const total = sm.tasks.length;
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--magenta)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 6 }}>SOULMASK</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
        <span style={{ color: "var(--muted)" }}>Tasks: {done}/{total}</span>
        <span style={{ color: "var(--magenta)" }}>Moral: {sm.morale}%</span>
      </div>
    </div>
  );
}
