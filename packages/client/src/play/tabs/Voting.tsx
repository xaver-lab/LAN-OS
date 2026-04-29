// Player Tab: Voting — MULTI + ELIMINATION, Stimmen-Limit-Anzeige.

import React, { useState } from "react";
import type { SystemState } from "@lan-os/shared";
import { NeonButton, Badge, Card } from "../../design/components/index.js";
import { submitVote } from "../../api/client.js";

interface Props {
  state: SystemState;
  playerId: string;
  reload: () => void;
}

export function VotingTab({ state, playerId, reload }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [voted, setVoted] = useState(false);

  const vs = state.votingSession;

  if (!vs) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
        <div>Keine aktive Abstimmung.</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>Warte auf den Admin…</div>
      </div>
    );
  }

  const alreadyVoted = voted || (vs.votes[playerId] !== undefined);
  const maxVotes = vs.mode === "MULTI" ? (state.config.votingMaxVotesPerPlayer ?? 3) : 1;

  function toggle(gameId: string) {
    if (alreadyVoted) return;
    if (selected.includes(gameId)) {
      setSelected((s) => s.filter((x) => x !== gameId));
    } else {
      if (vs!.mode === "ELIMINATION") {
        setSelected([gameId]);
      } else if (selected.length < maxVotes) {
        setSelected((s) => [...s, gameId]);
      }
    }
  }

  async function handleVote() {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      await submitVote(selected);
      setVoted(true);
      setSelected([]);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const poolGames = vs.pool.map((id) => state.games.find((g) => g.id === id)).filter(Boolean);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Badge variant="cyan">{vs.mode}</Badge>
        <span style={{ fontSize: 14, color: "var(--text)", fontWeight: 600 }}>Spiel auswählen</span>
        {vs.mode === "MULTI" && !alreadyVoted && (
          <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto" }}>
            {selected.length}/{maxVotes} Stimmen
          </span>
        )}
      </div>

      {alreadyVoted ? (
        <Card>
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 36, color: "var(--neon)", marginBottom: 10 }}>✓</div>
            <div style={{ fontWeight: 700, color: "var(--neon)", fontSize: 16 }}>Vote abgegeben!</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Warte auf das Ergebnis…</div>
          </div>
        </Card>
      ) : (
        <>
          <div style={{ display: "grid", gap: 8 }}>
            {poolGames.map((game) => {
              if (!game) return null;
              const isSelected = selected.includes(game.id);
              return (
                <button key={game.id} onClick={() => toggle(game.id)}
                  style={{ background: isSelected ? "var(--neon-dim)" : "var(--bg2)", border: `1px solid ${isSelected ? "var(--neon)" : "var(--border)"}`, borderRadius: 8, padding: "14px 18px", color: isSelected ? "var(--neon)" : "var(--text)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s", boxShadow: isSelected ? "0 0 12px var(--neon-dim)" : "none" }}>
                  <span style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${isSelected ? "var(--neon)" : "var(--border)"}`, background: isSelected ? "var(--neon)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, color: "var(--bg)" }}>
                    {isSelected && "✓"}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{game.title}</span>
                  <span style={{ marginLeft: "auto" }}>
                    <Badge variant="muted">{game.tag}</Badge>
                  </span>
                </button>
              );
            })}
          </div>
          <NeonButton onClick={handleVote} disabled={busy || selected.length === 0} fullWidth style={{ marginTop: 4 }}>
            {busy ? "Sende…" : `Abstimmen (${selected.length})`}
          </NeonButton>
        </>
      )}
    </div>
  );
}
