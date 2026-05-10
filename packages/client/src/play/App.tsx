// Player App — Login → Polling → 4 Tabs.

import React, { useState, useCallback } from "react";
import { fetchPlayerState } from "../api/client.js";
import { usePollingState } from "../api/usePollingState.js";
import { useSession } from "../api/useSession.js";
import { Login } from "./Login.js";
import { Tabs, ConnectionBanner, SimulationBanner, Spinner } from "../design/components/index.js";
import { VotingTab }     from "./tabs/Voting.js";
import { MatchResultTab } from "./tabs/MatchResult.js";
import { TasksTab }       from "./tabs/Tasks.js";
import { StatusTab }      from "./tabs/Status.js";

const PLAYER_TABS = [
  { id: "voting",       label: "Voting",   icon: "◎" },
  { id: "match-result", label: "Match",    icon: "⚔" },
  { id: "tasks",        label: "Tasks",    icon: "☑" },
  { id: "status",       label: "Status",   icon: "★" },
];

export function App() {
  const { session, saveSession, clearSession } = useSession();
  const [activeTab, setActiveTab] = useState("voting");
  const [kickedMessage, setKickedMessage] = useState<string | null>(null);

  const fetchFn = useCallback(
    (since?: number) => {
      if (!session) return Promise.resolve({ state: undefined, notModified: false });
      return fetchPlayerState(session.playerId, since);
    },
    [session],
  );

  const handleAuthError = useCallback(() => {
    // Spieler wurde gekickt oder Token ist ungültig
    setKickedMessage("Du wurdest gekickt. Bitte melde dich neu an.");
    clearSession();
  }, [clearSession]);

  const { state, connectionError, reload } = usePollingState({
    fetchFn,
    intervalMs: 2000,
    enabled: !!session,
    onAuthError: handleAuthError,
  });

  if (kickedMessage) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 16 }}>
        <div style={{ fontSize: 18, color: "var(--magenta)", fontWeight: "bold", textAlign: "center", maxWidth: 400 }}>
          {kickedMessage}
        </div>
        <button
          onClick={() => {
            setKickedMessage(null);
          }}
          style={{
            background: "var(--neon)",
            color: "var(--bg)",
            border: "none",
            borderRadius: 4,
            padding: "8px 16px",
            cursor: "pointer",
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: "bold",
          }}
        >
          Zurück zum Login
        </button>
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={saveSession} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {connectionError && <ConnectionBanner error={connectionError} />}
      {state?.simulationActive && <SimulationBanner />}

      {/* Header */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg2)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            color: "var(--neon)",
            fontSize: 14,
            letterSpacing: "0.15em",
            textShadow: "0 0 8px var(--neon)",
          }}
        >
          LAN OS
        </span>

        {/* Track badges — design-feedback #16 */}
        {state && (
          <div style={{ display: "flex", gap: 6 }}>
            {state.tournamentState !== "INACTIVE" && (
              <span style={{ fontSize: 11, padding: "2px 6px", background: "var(--neon-dim)", color: "var(--neon)", border: "1px solid var(--neon)", borderRadius: 3, fontFamily: "'JetBrains Mono', monospace" }}>
                TOURNAMENT
              </span>
            )}
            {state.soulmaskState !== "IDLE" && state.soulmaskState !== "DONE" && (
              <span style={{ fontSize: 11, padding: "2px 6px", background: "#ff2d6b18", color: "var(--magenta)", border: "1px solid var(--magenta)", borderRadius: 3, fontFamily: "'JetBrains Mono', monospace" }}>
                SOULMASK
              </span>
            )}
          </div>
        )}

        {/* Player name */}
        {state && (
          <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--muted)" }}>
            {state.players.find((p) => p.id === session.playerId)?.name ?? session.playerName}
          </span>
        )}

        <button
          onClick={clearSession}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 4,
            color: "var(--muted)",
            fontSize: 11,
            padding: "3px 8px",
            cursor: "pointer",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg2)" }}>
        <Tabs tabs={PLAYER_TABS} active={activeTab} onSelect={setActiveTab} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {!state ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, gap: 12 }}>
            <Spinner />
            <span style={{ color: "var(--muted)" }}>Verbinde…</span>
          </div>
        ) : (
          <>
            {activeTab === "voting"       && <VotingTab state={state} playerId={session.playerId} reload={reload} />}
            {activeTab === "match-result" && <MatchResultTab state={state} playerId={session.playerId} reload={reload} />}
            {activeTab === "tasks"        && <TasksTab state={state} playerId={session.playerId} reload={reload} />}
            {activeTab === "status"       && <StatusTab state={state} playerId={session.playerId} />}
          </>
        )}
      </div>
    </div>
  );
}
