// Player Tab: MatchResult — Score-Eingabe + MVP-Selection + Points-Calculation.

import React, { useState, useEffect } from "react";
import type { SystemState, Player, Match, Modifier } from "@lan-os/shared";
import { computeMatchPoints, deriveOutcomes } from "@lan-os/shared";
import { Card, NeonButton, NeonInput, Badge } from "../../design/components/index.js";
import { submitMatchScores, setMatchMvp } from "../../api/client.js";

interface Props {
  state: SystemState;
  playerId: string;
  reload: () => void;
}

export function MatchResultTab({ state, playerId, reload }: Props) {
  const pendingMatch = state.matches.find((m) => m.status === "result-pending");
  const activeMatch = state.matches.find((m) => m.status === "active");
  const match = pendingMatch ?? activeMatch;

  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [perPlayerScores, setPerPlayerScores] = useState<Record<string, string>>({});
  const [mvpId, setMvpId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pointsBreakdown, setPointsBreakdown] = useState<{ rule: string; pts: number }[]>([]);

  useEffect(() => {
    setScoreA("");
    setScoreB("");
    setPerPlayerScores({});
    setMvpId(null);
    setSubmitted(false);
    setPointsBreakdown([]);
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

  const isFfa = match.type === "ffa";
  const modifiers = match.activeModifiers
    .map((modId) => state.modifiers?.find((m) => m.id === modId))
    .filter(Boolean) as Modifier[];

  // Automatisch Points berechnen
  useEffect(() => {
    if (!match || submitted) return;

    let hasAllScores = false;
    if (isFfa) {
      hasAllScores = allMatchPlayers.every((p) => perPlayerScores[p.id] !== undefined && perPlayerScores[p.id] !== "");
    } else {
      hasAllScores = scoreA !== "" && scoreB !== "";
    }

    if (!hasAllScores) {
      setPointsBreakdown([]);
      return;
    }

    try {
      // Simuliere Match-Scores-Zustand für Berechnung
      const tempMatch: Match = {
        ...match,
        scores: {
          A: isFfa ? null : Number(scoreA),
          B: isFfa ? null : Number(scoreB),
          perPlayer: isFfa ? Object.fromEntries(allMatchPlayers.map((p) => [p.id, Number(perPlayerScores[p.id] ?? 0)])) : null,
        },
        mvpPlayerId: mvpId,
      };

      const outcomes = deriveOutcomes(tempMatch);
      const streakBefore = Object.fromEntries(
        allMatchPlayers.map((p) => [p.id, p.streak])
      );

      const result = computeMatchPoints({
        outcomes,
        modifiers,
        streakBefore,
      });

      setPointsBreakdown(result.award.breakdown);
    } catch (err) {
      console.error("Points calculation error:", err);
      setPointsBreakdown([]);
    }
  }, [scoreA, scoreB, perPlayerScores, mvpId, match, isFfa, allMatchPlayers, modifiers, submitted]);

  async function handleSubmit() {
    if (!match) return;
    setBusy(true);
    try {
      if (isFfa) {
        const perPlayer = Object.fromEntries(
          allMatchPlayers.map((p) => [p.id, Number(perPlayerScores[p.id] ?? 0)])
        );
        await submitMatchScores(match.id, 0, 0, perPlayer);
      } else {
        await submitMatchScores(match.id, Number(scoreA), Number(scoreB));
      }
      if (mvpId) await setMatchMvp(match.id, mvpId);
      setSubmitted(true);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    !busy &&
    (isFfa
      ? allMatchPlayers.every((p) => perPlayerScores[p.id] !== undefined && perPlayerScores[p.id] !== "")
      : scoreA !== "" && scoreB !== "");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card accent={match.status === "result-pending" ? "var(--amber)" : "var(--magenta)"}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{game?.title ?? match.gameId}</span>
          <Badge variant={match.status === "result-pending" ? "amber" : "magenta"}>{match.status}</Badge>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center", margin: "16px 0" }}>
          {!isFfa ? (
            <>
              <TeamBlock players={allMatchPlayers.filter((p) => match.teamA.includes(p.id))} label="Team A" />
              <span style={{ fontSize: 20, color: "var(--muted)", fontWeight: 700 }}>vs</span>
              <TeamBlock players={allMatchPlayers.filter((p) => match.teamB.includes(p.id))} label="Team B" />
            </>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, letterSpacing: "0.08em" }}>FFA</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {allMatchPlayers.map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block" }} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {(match.scores.A !== null || match.scores.B !== null || (match.scores.perPlayer && Object.keys(match.scores.perPlayer).length > 0)) && (
          <div style={{ textAlign: "center", fontSize: 32, fontFamily: "'JetBrains Mono', monospace", color: "var(--neon)", marginBottom: 12 }}>
            {isFfa ? "Scores eingegeben" : `${match.scores.A ?? "?"} : ${match.scores.B ?? "?"}`}
          </div>
        )}

        {modifiers.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>MODIFIERS</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {modifiers.map((m) => (
                <Badge key={m.id} variant={m.category === "chaos" ? "magenta" : m.category === "balance" ? "cyan" : "amber"}>
                  {m.label}
                </Badge>
              ))}
            </div>
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
          <>
            <Card title="Ergebnis eintragen" accent="var(--amber)">
              <div style={{ display: "grid", gap: 14 }}>
                {isFfa ? (
                  <div>
                    <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 8 }}>SCORES (pro Spieler)</label>
                    <div style={{ display: "grid", gap: 8 }}>
                      {allMatchPlayers.map((p) => (
                        <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block", flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                          <NeonInput
                            value={perPlayerScores[p.id] ?? ""}
                            onChange={(v) => setPerPlayerScores((prev) => ({ ...prev, [p.id]: v }))}
                            type="number"
                            placeholder="0"
                            style={{ width: 80 }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
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
                )}
                <div>
                  <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>MVP (opt.)</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {allMatchPlayers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setMvpId(mvpId === p.id ? null : p.id)}
                        style={{
                          background: mvpId === p.id ? "#ffb83022" : "var(--bg3)",
                          border: `1px solid ${mvpId === p.id ? "var(--amber)" : "var(--border)"}`,
                          borderRadius: 4,
                          padding: "6px 12px",
                          color: mvpId === p.id ? "var(--amber)" : "var(--muted)",
                          cursor: "pointer",
                          fontSize: 13,
                          fontFamily: "'Rajdhani', sans-serif",
                          fontWeight: mvpId === p.id ? 700 : 400,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block" }} />
                        {p.name}
                        {mvpId === p.id && " ★"}
                      </button>
                    ))}
                  </div>
                </div>
                <NeonButton onClick={handleSubmit} disabled={!canSubmit} fullWidth>
                  Ergebnis senden
                </NeonButton>
              </div>
            </Card>

            {pointsBreakdown.length > 0 && (
              <Card title="Punkte-Berechnung" accent="var(--cyan)">
                <div style={{ display: "grid", gap: 6 }}>
                  {pointsBreakdown.map((entry, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                      <span style={{ color: "var(--muted)" }}>{entry.rule}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: entry.pts >= 0 ? "var(--neon)" : "var(--magenta)" }}>
                        {entry.pts >= 0 ? "+" : ""}{entry.pts}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
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
