// Admin Tab: System — Backup/Restore, Simulation, Hard-Reset (2× Confirm), Schema-Info, AI-Re-Analyze.

import React, { useState, useEffect } from "react";
import type { SystemState } from "@lan-os/shared";
import {
  Card,
  NeonButton,
  NeonInput,
  Badge,
  ConfirmDialog,
  Spinner,
} from "../../design/components/index.js";
import { post, del, get } from "../../api/client.js";

interface Props {
  state: SystemState;
  reload: () => void;
}

interface CheckpointMeta {
  id: string;
  label: string;
  createdAt: number;
  version: number;
}

export function System({ state, reload }: Props) {
  const [checkpoints, setCheckpoints] = useState<CheckpointMeta[]>([]);
  const [cpLabel, setCpLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<CheckpointMeta | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CheckpointMeta | null>(null);
  const [resetStep, setResetStep] = useState(0);   // 0 = idle, 1 = first confirm, 2 = second confirm
  const [reanalyzeGameId, setReanalyzeGameId] = useState("");
  const [games, setGames] = useState(state.games);

  useEffect(() => {
    loadCheckpoints();
  }, []);

  async function loadCheckpoints() {
    try {
      const data = await get<{ checkpoints: CheckpointMeta[] }>("/admin/system/checkpoints");
      setCheckpoints(data.checkpoints);
    } catch { /* silent */ }
  }

  async function act(path: string, body?: unknown) {
    setBusy(true);
    try { await post(path, body); reload(); }
    catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function createCheckpoint() {
    setBusy(true);
    try {
      await post("/admin/system/checkpoint", { label: cpLabel || undefined });
      setCpLabel("");
      await loadCheckpoints();
    } catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function restoreCheckpoint(id: string) {
    setBusy(true);
    try {
      await post(`/admin/system/checkpoint/${id}/restore`);
      reload();
      setRestoreTarget(null);
    } catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function deleteCheckpoint(id: string) {
    setBusy(true);
    try {
      await del(`/admin/system/checkpoint/${id}`);
      await loadCheckpoints();
      setDeleteTarget(null);
    } catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function hardReset() {
    setBusy(true);
    try {
      await post("/admin/system/reset", { confirm: true });
      reload();
      setResetStep(0);
    } catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function reanalyze(gameId: string) {
    setBusy(true);
    try {
      await post(`/admin/games/${gameId}/reanalyze`);
      reload();
    } catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 900 }}>
      {/* Schema Info */}
      <Card title="System Info">
        <div style={{ display: "grid", gap: 8 }}>
          {[
            ["Schema Version", state.schemaVersion],
            ["State Version", String(state.version)],
            ["Matches", String(state.matches.length)],
            ["Players", String(state.players.length)],
            ["Games", String(state.games.length)],
            ["Event Log Entries", String(state.eventLog.length)],
            ["Simulation Mode", state.simulationActive ? "AKTIV" : "Aus"],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{label}</span>
              <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Simulation Mode */}
      <Card title="Simulation Mode" accent={state.simulationActive ? "var(--amber)" : undefined}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>
            Im Simulation-Modus werden alle Änderungen in einem separaten State-Container gespeichert.
            Kein echter State wird beeinflusst.
          </div>
          <NeonButton
            variant={state.simulationActive ? "danger" : "amber"}
            onClick={() => act("/admin/system/simulation", { active: !state.simulationActive })}
            disabled={busy}
          >
            {state.simulationActive ? "Simulation deaktivieren" : "Simulation aktivieren"}
          </NeonButton>
        </div>
      </Card>

      {/* Checkpoints */}
      <Card title="Backups / Checkpoints" accent="var(--cyan)">
        <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 3 }}>LABEL (opt.)</label>
            <NeonInput value={cpLabel} onChange={setCpLabel} placeholder="Checkpoint-Label" />
          </div>
          <NeonButton variant="secondary" onClick={createCheckpoint} disabled={busy}>
            💾 Backup erstellen
          </NeonButton>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          {checkpoints.length === 0 && (
            <span style={{ color: "var(--muted)", fontSize: 13 }}>Keine Checkpoints vorhanden.</span>
          )}
          {checkpoints.map((cp) => (
            <div key={cp.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 5 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{cp.label}</span>
                <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 8 }}>
                  {new Date(cp.createdAt).toLocaleString()} — v{cp.version}
                </span>
              </div>
              <NeonButton variant="secondary" onClick={() => setRestoreTarget(cp)} disabled={busy} style={{ fontSize: 12, padding: "3px 10px" }}>
                Restore
              </NeonButton>
              <NeonButton variant="danger" onClick={() => setDeleteTarget(cp)} disabled={busy} style={{ fontSize: 12, padding: "3px 10px" }}>
                ✕
              </NeonButton>
            </div>
          ))}
        </div>
      </Card>

      {/* AI Re-Analyze */}
      <Card title="AI Game-Analyse">
        <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
          Führt die lokale Heuristik-Analyse für alle oder ein bestimmtes Spiel erneut aus.
          Berechnet avgDurationMin, recommendedPlayers, tournamentSuitability, chaosPotential.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <NeonButton variant="secondary" onClick={() => reanalyze("all")} disabled={busy}>
            Alle analysieren
          </NeonButton>
          {state.games.map((g) => (
            <NeonButton key={g.id} variant="ghost" onClick={() => reanalyze(g.id)} disabled={busy} style={{ fontSize: 12, padding: "4px 10px" }}>
              {g.title}
            </NeonButton>
          ))}
        </div>
      </Card>

      {/* Hard Reset */}
      <Card title="Hard Reset" accent="var(--magenta)">
        <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
          Löscht alle Spieler, Matches, Punkte und Event-Log. State wird auf den Ausgangszustand zurückgesetzt.
          <strong style={{ color: "var(--magenta)" }}> Diese Aktion ist nicht rückgängig zu machen.</strong>
        </div>
        {resetStep === 0 && (
          <NeonButton variant="danger" onClick={() => setResetStep(1)}>
            ⚠ Hard Reset
          </NeonButton>
        )}
        {resetStep === 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "var(--magenta)", fontSize: 13, fontWeight: 700 }}>Sicher? Alle Daten gehen verloren!</span>
            <NeonButton variant="danger" onClick={() => setResetStep(2)}>Ja, weiter</NeonButton>
            <NeonButton variant="ghost" onClick={() => setResetStep(0)}>Abbrechen</NeonButton>
          </div>
        )}
        {resetStep === 2 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "var(--magenta)", fontSize: 13, fontWeight: 700 }}>Letzte Chance — wirklich alles löschen?</span>
            <NeonButton variant="danger" onClick={hardReset} disabled={busy}>RESET AUSFÜHREN</NeonButton>
            <NeonButton variant="ghost" onClick={() => setResetStep(0)}>Abbrechen</NeonButton>
          </div>
        )}
      </Card>

      {/* Restore Confirm */}
      <ConfirmDialog
        open={!!restoreTarget}
        title={`Checkpoint "${restoreTarget?.label}" wiederherstellen?`}
        message="Der aktuelle State wird durch diesen Checkpoint ersetzt. Nicht gespeicherte Änderungen gehen verloren."
        confirmLabel="Wiederherstellen"
        onConfirm={() => restoreTarget && restoreCheckpoint(restoreTarget.id)}
        onCancel={() => setRestoreTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Checkpoint "${deleteTarget?.label}" löschen?`}
        message="Der Checkpoint wird permanent gelöscht."
        confirmLabel="Löschen"
        dangerous
        onConfirm={() => deleteTarget && deleteCheckpoint(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
