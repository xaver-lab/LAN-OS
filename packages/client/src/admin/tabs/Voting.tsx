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
import { PoolBuilder } from "../components/PoolBuilder.js";
import { post } from "../../api/client.js";

interface Props {
  state: SystemState;
  reload: () => void;
}

export function Voting({ state, reload }: Props) {
  const [timerSec, setTimerSec] = useState("120");
  const [busy, setBusy] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [tieOverride, setTieOverride] = useState("");

  const vs = state.votingSession;
  const isActive = !!vs;

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

  async function resolveTie(action: "re-vote" | "manual" | "random", overrideGameId?: string) {
    setBusy(true);
    try { await post("/admin/voting/tie-break", { action, overrideGameId }); reload(); }
    catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  const poolGames    = state.games.filter((g) => g.inActivePool);
  const poolOptions  = poolGames.map((g) => ({ value: g.id, label: g.title }));

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 900 }}>
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

      {state.tournamentState === "ELIMINATION_APPLIED" && (
        <Card title="Tie-Break" accent="var(--magenta)">
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Gleichstand — Wähle Auflösungsstrategie:</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <NeonButton onClick={() => resolveTie("random")} disabled={busy} variant="secondary">Zufällig</NeonButton>
              <NeonButton onClick={() => resolveTie("re-vote")} disabled={busy} variant="secondary">Re-Vote</NeonButton>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <NeonSelect value={tieOverride} onChange={setTieOverride} options={[{ value: "", label: "Manuell wählen…" }, ...poolOptions]} />
              <NeonButton onClick={() => tieOverride && resolveTie("manual", tieOverride)} disabled={busy || !tieOverride}>Überschreiben</NeonButton>
            </div>
          </div>
        </Card>
      )}

      {!isActive && (
        <>
          <Card title="Pool-Builder" accent="var(--neon)">
            <PoolBuilder state={state} reload={reload} />
          </Card>

          <Card title="Zusätzliche Einstellungen" accent="var(--cyan)">
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>TIMER (Sekunden)</label>
                <NeonInput value={timerSec} onChange={setTimerSec} type="number" placeholder="120" />
              </div>
            </div>
          </Card>
        </>
      )}

      <ConfirmDialog open={cancelConfirm} title="Abstimmung abbrechen?" message="Die laufende Abstimmung wird abgebrochen. Alle Votes werden verworfen." confirmLabel="Abbrechen" dangerous onConfirm={cancelVoting} onCancel={() => setCancelConfirm(false)} />
    </div>
  );
}
