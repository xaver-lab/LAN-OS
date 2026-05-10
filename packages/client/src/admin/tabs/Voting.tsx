// Admin Tab: Voting — Mode, Pool-Builder, Timer, Wheel-Variant, Tie-Break-Override.

import React, { useState } from "react";
import type { SystemState, VotingMode } from "@lan-os/shared";
import {
  Card,
  NeonButton,
  NeonInput,
  NeonSelect,
  Badge,
  ConfirmDialog,
} from "../../design/components/index.js";
import { post } from "../../api/client.js";

interface Props {
  state: SystemState;
  reload: () => void;
}

export function Voting({ state, reload }: Props) {
  const [mode, setMode] = useState<VotingMode>("MULTI");
  const [pool, setPool] = useState<string[]>([]);
  const [timerSec, setTimerSec] = useState("120");
  const [busy, setBusy] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [tieOverride, setTieOverride] = useState("");

  const vs = state.votingSession;
  const isActive = !!vs;

  async function startVoting() {
    if (pool.length < state.config.votingMinPool) { alert(`Mindestens ${state.config.votingMinPool} Spiele im Pool nötig.`); return; }
    setBusy(true);
    try { await post("/admin/voting/start", { mode, pool, timerSec: Number(timerSec) }); reload(); }
    catch (e) { await reload(); alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function endVoting() {
    setBusy(true);
    try { await post("/admin/voting/end"); reload(); }
    catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function cancelVoting() {
    setBusy(true);
    try { await post("/admin/voting/cancel"); reload(); }
    catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); setCancelConfirm(false); }
  }

  async function resolveTie(overrideGameId: string) {
    setBusy(true);
    try { await post("/admin/voting/tie-break", { action: "override", overrideGameId }); reload(); }
    catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  function randomPoolGame() {
    return poolGames[Math.floor(Math.random() * poolGames.length)]?.id ?? "";
  }

  function togglePoolGame(gameId: string) {
    setPool((p) => p.includes(gameId) ? p.filter((x) => x !== gameId) : [...p, gameId]);
  }

  const poolGames    = state.games.filter((g) => g.inActivePool);
  const poolOptions  = poolGames.map((g) => ({ value: g.id, label: g.title }));

  async function toggleGamePool(gameId: string, active: boolean) {
    setBusy(true);
    try { await post(`/admin/games/${gameId}/pool`, { inActivePool: active }); reload(); }
    catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 900 }}>
      <Card title="Spielerpool verwalten" accent="var(--muted)">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6 }}>
          {state.games.length === 0 && <div style={{ color: "var(--muted)", fontSize: 13 }}>Keine Spiele in der Bibliothek.</div>}
          {state.games.map((g) => (
            <button key={g.id} onClick={() => toggleGamePool(g.id, !g.inActivePool)} disabled={busy}
              style={{ background: g.inActivePool ? "var(--neon-dim)" : "var(--bg3)", border: `1px solid ${g.inActivePool ? "var(--neon)" : "var(--border)"}`, borderRadius: 6, padding: "8px 12px", color: g.inActivePool ? "var(--neon)" : "var(--muted)", cursor: "pointer", textAlign: "left", fontSize: 13, fontFamily: "'Rajdhani', sans-serif", fontWeight: g.inActivePool ? 700 : 400, transition: "all 0.15s", opacity: busy ? 0.5 : 1 }}>
              {g.inActivePool ? "✓ " : ""}{g.title}
            </button>
          ))}
        </div>
      </Card>
      {isActive && (
        <Card title="Aktive Voting-Session" accent="var(--cyan)">
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Badge variant="cyan">{vs.mode}</Badge>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{vs.pool.length} Spiele im Pool</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {vs.pool.map((gameId) => {
                const g = state.games.find((x) => x.id === gameId);
                return <Badge key={gameId} variant="muted">{g?.title ?? gameId}</Badge>;
              })}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <NeonButton variant="secondary" onClick={endVoting} disabled={busy}>Abstimmung beenden</NeonButton>
              <NeonButton variant="danger" onClick={() => setCancelConfirm(true)} disabled={busy}>Abbrechen</NeonButton>
            </div>
          </div>
        </Card>
      )}

      {(state.tournamentState === "ELIMINATION_APPLIED" || state.tournamentState === "ERROR_GUARD") && (
        <Card title={state.tournamentState === "ERROR_GUARD" ? "Fehler: Keine Stimmen" : "Tie-Break"} accent="var(--magenta)">
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              {state.tournamentState === "ERROR_GUARD"
                ? "Keine Stimmen abgegeben — Spiel manuell wählen oder Abstimmung abbrechen:"
                : "Gleichstand — Spiel für Weiterkommen wählen:"}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <NeonButton onClick={() => { const g = randomPoolGame(); if (g) resolveTie(g); }} disabled={busy || poolGames.length === 0} variant="secondary">Zufällig</NeonButton>
              <NeonButton variant="danger" onClick={cancelVoting} disabled={busy}>Abstimmung abbrechen</NeonButton>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <NeonSelect value={tieOverride} onChange={setTieOverride} options={[{ value: "", label: "Spiel wählen…" }, ...poolOptions]} />
              <NeonButton onClick={() => tieOverride && resolveTie(tieOverride)} disabled={busy || !tieOverride}>Überschreiben</NeonButton>
            </div>
          </div>
        </Card>
      )}

      {!isActive && (
        <Card title="Neue Abstimmung starten" accent="var(--neon)">
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>MODUS</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["MULTI", "ELIMINATION"] as VotingMode[]).map((m) => (
                  <NeonButton key={m} variant={mode === m ? "primary" : "ghost"} onClick={() => setMode(m)} style={{ flex: 1 }}>{m}</NeonButton>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>TIMER (Sekunden)</label>
              <NeonInput value={timerSec} onChange={setTimerSec} type="number" placeholder="120" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>POOL AUSWAHL ({pool.length} gewählt)</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                {poolGames.length === 0 && <div style={{ color: "var(--muted)", fontSize: 13 }}>Keine Spiele im aktiven Pool.</div>}
                {poolGames.map((g) => {
                  const selected = pool.includes(g.id);
                  return (
                    <button key={g.id} onClick={() => togglePoolGame(g.id)}
                      style={{ background: selected ? "var(--neon-dim)" : "var(--bg3)", border: `1px solid ${selected ? "var(--neon)" : "var(--border)"}`, borderRadius: 6, padding: "8px 12px", color: selected ? "var(--neon)" : "var(--text)", cursor: "pointer", textAlign: "left", fontSize: 13, fontFamily: "'Rajdhani', sans-serif", fontWeight: selected ? 700 : 400, transition: "all 0.15s" }}>
                      {g.title}
                    </button>
                  );
                })}
              </div>
            </div>
            <NeonButton onClick={startVoting} disabled={busy || pool.length < state.config.votingMinPool} fullWidth>Abstimmung starten</NeonButton>
          </div>
        </Card>
      )}

      <ConfirmDialog open={cancelConfirm} title="Abstimmung abbrechen?" message="Die laufende Abstimmung wird abgebrochen. Alle Votes werden verworfen." confirmLabel="Abbrechen" dangerous onConfirm={cancelVoting} onCancel={() => setCancelConfirm(false)} />
    </div>
  );
}
