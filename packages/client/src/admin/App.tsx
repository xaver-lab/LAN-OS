// Admin App — Tab-Layout mit 6 Tabs.
// Pollt /api/state/full mit 1000ms Cadence.

import React, { useState } from "react";
import { fetchFullState } from "../api/client.js";
import { usePollingState } from "../api/usePollingState.js";
import { Tabs, ConnectionBanner, SimulationBanner, Spinner } from "../design/components/index.js";
import { Overview } from "./tabs/Overview.js";
import { Players } from "./tabs/Players.js";
import { Voting } from "./tabs/Voting.js";
import { Tournament } from "./tabs/Tournament.js";
import { Bracket } from "./tabs/Bracket.js";
import { Soulmask } from "./tabs/Soulmask.js";
import { System } from "./tabs/System.js";

const TABS = [
  { id: "overview",   label: "Overview",    icon: "⬡" },
  { id: "players",    label: "Players",     icon: "◈" },
  { id: "voting",     label: "Voting",      icon: "◎" },
  { id: "tournament", label: "Tournament",  icon: "⚔" },
  { id: "bracket",    label: "Bracket",     icon: "⚊" },
  { id: "soulmask",   label: "Soulmask",    icon: "☩" },
  { id: "system",     label: "System",      icon: "⚙" },
];

export function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const { state, connectionError, reload } = usePollingState({
    fetchFn: fetchFullState,
    intervalMs: 1000,
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {connectionError && <ConnectionBanner error={connectionError} />}
      {state?.simulationActive && <SimulationBanner />}

      {/* Header */}
      <div
        style={{
          padding: "10px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg2)",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            color: "var(--neon)",
            fontSize: 15,
            letterSpacing: "0.15em",
            textShadow: "0 0 10px var(--neon)",
          }}
        >
          LAN OS
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--muted)",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.08em",
          }}
        >
          ADMIN
        </span>
        {state && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: "var(--muted)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            v{state.version}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{ padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg2)" }}
      >
        <Tabs tabs={TABS} active={activeTab} onSelect={setActiveTab} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {!state ? (
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, gap: 12 }}
          >
            <Spinner />
            <span style={{ color: "var(--muted)" }}>Verbinde…</span>
          </div>
        ) : (
          <>
            {activeTab === "overview"   && <Overview state={state} reload={reload} />}
            {activeTab === "players"    && <Players state={state} reload={reload} />}
            {activeTab === "voting"     && <Voting state={state} reload={reload} />}
            {activeTab === "tournament" && <Tournament state={state} reload={reload} />}
            {activeTab === "bracket"    && <Bracket state={state} reload={reload} />}
            {activeTab === "soulmask"   && <Soulmask state={state} reload={reload} />}
            {activeTab === "system"     && <System state={state} reload={reload} />}
          </>
        )}
      </div>
    </div>
  );
}
