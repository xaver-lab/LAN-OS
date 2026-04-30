// Admin Tab: Tournament — Match-Freigabe, Score-Override, Modifier-Slot, MVP, Skip.

import React, { useState } from "react";
import type { SystemState, Match, Player } from "@lan-os/shared";
import {
  Card,
  NeonButton,
  NeonInput,
  NeonSelect,
  Badge,
} from "../../design/components/index.js";
import { post } from "../../api/client.js";

interface Props {
  state: SystemState;
  reload: () => void;
}

export function Tournament({ state, reload }: Props) {
  const [busy, setBusy] = useState(false);
  const [setupType, setSetupType] = useState<Match["type"]>("1v1");
  const [setupTeamA, setSetupTeamA] = useState<string[]>([]);
  const [setupTeamB, setSetupTeamB] = useState<string[]>([]);
  const [setupGameId, setSetupGameId] = useState("");
  const [setupModifiers, setSetupModifiers] = useState<string[]>([]);

  const activeMatch = state.matches.find(
    (m) => m.status === "active" || m.status === "result-pending",
  );

  const gameOptions = state.games
    .map((g) => ({ value: g.id, label: g.title }));

  async function setupMatch() {
    setBusy(true);
    try {
      await post("/admin/matches/setup", { type: setupType, teamA: setupTeamA, teamB: setupTeamB, gameId: setupGameId, modifiers: setupModifiers });
      reload();
    } catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function startMatch(matchId: string) {
    setBusy(true);
    try { await post(`/admin/matches/${matchId}/start`); reload(); }
    catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function confirmMatch(matchId: string) {
    setBusy(true);
    try { await post(`/admin/matches/${matchId}/confirm`); reload(); }
    catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function skipMatch(matchId: string) {
    setBusy(true);
    try { await post(`/admin/matches/${matchId}/skip`); reload(); }
    catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  function toggleTeam(team: "A" | "B", pid: string) {
    if (team === "A") setSetupTeamA((t) => t.includes(pid) ? t.filter((x) => x !== pid) : [...t, pid]);
    else setSetupTeamB((t) => t.includes(pid) ? t.filter((x) => x !== pid) : [...t, pid]);
  }

  const isMatchSetup    = state.tournamentState === "MATCH_SETUP";
  const isMatchActive   = state.tournamentState === "MATCH_ACTIVE";
  const isResultPending = state.tournamentState === "MATCH_RESULT_PENDING";
  const canSetup = state.tournamentState === "RESULT" || state.tournamentState === "LOBBY" || state.tournamentState === "MATCH_DONE";

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 900 }}>
      {(isMatchActive || isResultPending) && activeMatch && (
        <ActiveMatchCard match={activeMatch} state={state} busy={busy} onConfirm={() => confirmMatch(activeMatch.id)} onSkip={() => skipMatch(activeMatch.id)} reload={reload} />
      )}

      {canSetup && (
        <Card title="Match aufsetzen" accent="var(--neon)">
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>TYP</label>
              <div style={{ display: "flex", gap: 6 }}>
                {(["1v1", "2v2", "team", "ffa"] as Match["type"][]).map((t) => (
                  <NeonButton key={t} variant={setupType === t ? "primary" : "ghost"} onClick={() => setSetupType(t)} style={{ flex: 1, fontSize: 13, padding: "5px 8px" }}>{t}</NeonButton>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>SPIEL</label>
              <NeonSelect value={setupGameId} onChange={setSetupGameId} options={[{ value: "", label: "Spiel wählen…" }, ...gameOptions]} />
            </div>
            <TeamSelector label="TEAM A" players={state.players} selected={setupTeamA} onToggle={(id) => toggleTeam("A", id)} />
            <TeamSelector label="TEAM B" players={state.players} selected={setupTeamB} onToggle={(id) => toggleTeam("B", id)} />
            {state.modifiers.filter((m) => m.enabled).length > 0 && (
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>MODIFIER (opt.)</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {state.modifiers.filter((m) => m.enabled).map((m) => (
                    <button key={m.id} onClick={() => setSetupModifiers((ms) => ms.includes(m.id) ? ms.filter((x) => x !== m.id) : [...ms, m.id])}
                      style={{ background: setupModifiers.includes(m.id) ? "var(--neon-dim)" : "var(--bg3)", border: `1px solid ${setupModifiers.includes(m.id) ? "var(--neon)" : "var(--border)"}`, borderRadius: 4, padding: "4px 10px", color: setupModifiers.includes(m.id) ? "var(--neon)" : "var(--muted)", cursor: "pointer", fontSize: 12, fontFamily: "'Rajdhani', sans-serif" }}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <NeonButton onClick={setupMatch} disabled={busy || !setupGameId} fullWidth>Match aufsetzen</NeonButton>
          </div>
        </Card>
      )}

      {isMatchSetup && (
        <Card title="Match bereit" accent="var(--amber)">
          {state.matches.filter((m) => m.status === "open").map((m) => {
            const game = state.games.find((g) => g.id === m.gameId);
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700 }}>{game?.title ?? m.gameId}</span>
                  <span style={{ color: "var(--muted)", fontSize: 13, marginLeft: 8 }}>
                    {m.teamA.join(", ")} vs {m.teamB.join(", ")}
                  </span>
                </div>
                <NeonButton onClick={() => startMatch(m.id)} disabled={busy} variant="amber">▶ Starten</NeonButton>
                <NeonButton onClick={() => skipMatch(m.id)} disabled={busy} variant="danger" style={{ fontSize: 12, padding: "5px 10px" }}>Skip</NeonButton>
              </div>
            );
          })}
        </Card>
      )}

      <RecentMatches state={state} busy={busy} onConfirm={confirmMatch} />
    </div>
  );
}

function TeamSelector({ label, players, selected, onToggle }: { label: string; players: Player[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>{label}</label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {players.map((p) => (
          <button key={p.id} onClick={() => onToggle(p.id)}
            style={{ background: selected.includes(p.id) ? p.color + "33" : "var(--bg3)", border: `1px solid ${selected.includes(p.id) ? p.color : "var(--border)"}`, borderRadius: 4, padding: "4px 10px", color: selected.includes(p.id) ? p.color : "var(--muted)", cursor: "pointer", fontSize: 13, fontFamily: "'Rajdhani', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block" }} />
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function ActiveMatchCard({ match, state, busy, onConfirm, onSkip, reload }: { match: Match; state: SystemState; busy: boolean; onConfirm: () => void; onSkip: () => void; reload: () => void }) {
  const game = state.games.find((g) => g.id === match.gameId);
  const [scoreA, setScoreA] = useState(String(match.scores.A ?? ""));
  const [scoreB, setScoreB] = useState(String(match.scores.B ?? ""));
  const [mvpId, setMvpId] = useState(match.mvpPlayerId ?? "");
  const [saveBusy, setSaveBusy] = useState(false);

  const allPlayers = [...match.teamA, ...match.teamB].map((id) => state.players.find((p) => p.id === id)).filter(Boolean) as Player[];

  async function saveScores() {
    setSaveBusy(true);
    try {
      await post(`/admin/matches/${match.id}/scores`, { scoreA: Number(scoreA), scoreB: Number(scoreB) });
      if (mvpId) await post(`/admin/matches/${match.id}/mvp`, { mvpPlayerId: mvpId });
      reload();
    } catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setSaveBusy(false); }
  }

  return (
    <Card title="Aktives Match" accent="var(--magenta)">
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{game?.title ?? match.gameId}</span>
          <Badge variant="magenta">{match.type}</Badge>
          <Badge variant="muted">{match.status}</Badge>
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          Team A: {match.teamA.map((id) => state.players.find((p) => p.id === id)?.name ?? id).join(", ")}
          {" vs "}
          Team B: {match.teamB.map((id) => state.players.find((p) => p.id === id)?.name ?? id).join(", ")}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 100 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 2 }}>SCORE A</label>
            <NeonInput value={scoreA} onChange={setScoreA} type="number" />
          </div>
          <span style={{ color: "var(--muted)", marginTop: 16 }}>vs</span>
          <div style={{ width: 100 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 2 }}>SCORE B</label>
            <NeonInput value={scoreB} onChange={setScoreB} type="number" />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>MVP (opt.)</label>
          <NeonSelect value={mvpId} onChange={setMvpId} options={[{ value: "", label: "Kein MVP" }, ...allPlayers.map((p) => ({ value: p.id, label: p.name }))]} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <NeonButton onClick={saveScores} disabled={saveBusy} variant="secondary">Scores speichern</NeonButton>
          <NeonButton onClick={onConfirm} disabled={busy} variant="primary">✓ Bestätigen</NeonButton>
          <NeonButton onClick={onSkip} disabled={busy} variant="danger" style={{ fontSize: 12, padding: "5px 12px" }}>Skip</NeonButton>
        </div>
      </div>
    </Card>
  );
}

function RecentMatches({ state, busy, onConfirm }: { state: SystemState; busy: boolean; onConfirm: (id: string) => void }) {
  const recent = [...state.matches].reverse().slice(0, 5);
  if (recent.length === 0) return null;
  return (
    <Card title="Letzte Matches">
      <div style={{ display: "grid", gap: 6 }}>
        {recent.map((m) => {
          const game = state.games.find((g) => g.id === m.gameId);
          return (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: "var(--bg3)", borderRadius: 6, border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, flex: 1, color: "var(--muted)" }}>{game?.title ?? m.gameId}</span>
              <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>
                {m.scores.A ?? "–"} : {m.scores.B ?? "–"}
              </span>
              <Badge variant={m.status === "done" ? "neon" : m.status === "active" ? "magenta" : "muted"}>{m.status}</Badge>
              {m.status === "result-pending" && (
                <NeonButton variant="primary" disabled={busy} onClick={() => onConfirm(m.id)} style={{ fontSize: 12, padding: "3px 10px" }}>Confirm</NeonButton>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
