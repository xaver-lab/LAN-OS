// Player Tab: MatchResult — Score-Eingabe + MVP-Selection.

import React, { useState, useEffect } from "react";
import type { SystemState, Player } from "@lan-os/shared";
import { Card, NeonButton, NeonInput, Badge } from "../../design/components/index.js";
import { submitMatchScores, setMatchMvp } from "../../api/client.js";

interface Props {
  state: SystemState;
  playerId: string;
  reload: () => void;
}

export function MatchResultTab({ state, playerId, reload }: Props) {
  const pendingMatch = state.matches.find((m) => m.status === "result-pending");
  const activeMatch  = state.matches.find((m) => m.status === "active");
  const match = pendingMatch ?? activeMatch;

  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [mvpId, setMvpId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setScoreA("");
    setScoreB("");
    setMvpId(null);
    setSubmitted(false);
  }, [match?.id]);

  if (!match) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚔</div>
        <div>Kein aktives Match.</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>Warte auf den Admin…</div>
      </div>
    );
  }

  const isParticipant = [...match.teamA, ...match.teamB].includes(playerId);
  const game = state.games.find((g) => g.id === match.gameId);
  const allMatchPlayers = [...match.teamA, ...match.teamB]
    .map((id) => state.players.find((p) => p.id === id))
    .filter(Boolean) as Player[];

  async function handleSubmit() {
    if (!match) return;
    setBusy(true);
    try {
      await submitMatchScores(match.id, Number(scoreA), Number(scoreB));
      if (mvpId) await setMatchMvp(match.id, mvpId);
      setSubmitted(true);
      reload();
    } catch (e) {
      await reload();
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card accent={match.status === "result-pending" ? "var(--amber)" : "var(--magenta)"}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{game?.title ?? match.gameId}</span>
          <Badge variant={match.status === "result-pending" ? "amber" : "magenta"}>{match.status}</Badge>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center", margin: "16px 0" }}>
          <TeamBlock players={allMatchPlayers.filter((p) => match.teamA.includes(p.id))} label="Team A" />
          <span style={{ fontSize: 20, color: "var(--muted)", fontWeight: 700 }}>vs</span>
          <TeamBlock players={allMatchPlayers.filter((p) => match.teamB.includes(p.id))} label="Team B" />
        </div>
        {(match.scores.A !== null || match.scores.B !== null) && (
          <div style={{ textAlign: "center", fontSize: 32, fontFamily: "'JetBrains Mono', monospace", color: "var(--neon)", marginBottom: 12 }}>
            {match.scores.A ?? "?"} : {match.scores.B ?? "?"}
          </div>
        )}
      </Card>

      {isParticipant && match.status === "result-pending" && (
        submitted ? (
          <Card>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 36, color: "var(--neon)", marginBottom: 8 }}>✓</div>
              <div style={{ fontWeight: 700, color: "var(--neon)" }}>Ergebnis übermittelt!</div>
            </div>
          </Card>
        ) : (
          <Card title="Ergebnis eintragen" accent="var(--amber)">
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 3 }}>SCORE TEAM A</label>
                  <NeonInput value={scoreA} onChange={setScoreA} type="number" placeholder="0" />
                </div>
                <span style={{ color: "var(--muted)", marginTop: 16, fontSize: 20 }}>:</span>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 3 }}>SCORE TEAM B</label>
                  <NeonInput value={scoreB} onChange={setScoreB} type="number" placeholder="0" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>MVP (opt.)</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {allMatchPlayers.map((p) => (
                    <button key={p.id} onClick={() => setMvpId(mvpId === p.id ? null : p.id)}
                      style={{ background: mvpId === p.id ? "#ffb83022" : "var(--bg3)", border: `1px solid ${mvpId === p.id ? "var(--amber)" : "var(--border)"}`, borderRadius: 4, padding: "6px 12px", color: mvpId === p.id ? "var(--amber)" : "var(--muted)", cursor: "pointer", fontSize: 13, fontFamily: "'Rajdhani', sans-serif", fontWeight: mvpId === p.id ? 700 : 400, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block" }} />
                      {p.name}{mvpId === p.id && " ★"}
                    </button>
                  ))}
                </div>
              </div>
              <NeonButton onClick={handleSubmit} disabled={busy || !scoreA || !scoreB} fullWidth>Ergebnis senden</NeonButton>
            </div>
          </Card>
        )
      )}
      {!isParticipant && (
        <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center" }}>Du bist kein Teilnehmer dieses Matches.</div>
      )}
    </div>
  );
}

function TeamBlock({ players, label }: { players: Player[]; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {players.map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block" }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
