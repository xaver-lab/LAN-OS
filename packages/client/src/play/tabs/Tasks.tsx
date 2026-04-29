// Player Tab: Tasks — Soulmask-Tasks abhaken.

import React, { useState } from "react";
import type { SystemState } from "@lan-os/shared";
import { Card, Badge, NeonBar } from "../../design/components/index.js";
import { toggleTask } from "../../api/client.js";

interface Props {
  state: SystemState;
  playerId: string;
  reload: () => void;
}

export function TasksTab({ state, playerId, reload }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const sm = state.soulmaskData;
  const smState = state.soulmaskState;

  if (smState === "IDLE" || smState === "DONE") {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>☑</div>
        <div>Soulmask ist {smState === "IDLE" ? "noch nicht aktiv" : "beendet"}.</div>
      </div>
    );
  }

  const myTasks = sm.tasks.filter((t) => t.playerId === playerId);
  const doneTasks   = myTasks.filter((t) => t.done);
  const activeTasks = myTasks.filter((t) => !t.done);
  const goals = sm.globalGoals;

  async function toggle(taskId: string, done: boolean) {
    setBusy(taskId);
    try { await toggleTask(taskId, done); reload(); }
    catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {goals.length > 0 && (
        <Card title="Global Goals" accent="var(--magenta)">
          <div style={{ display: "grid", gap: 10 }}>
            {goals.map((g) => (
              <div key={g.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>{g.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: g.color || "var(--neon)" }}>{g.progress}%</span>
                </div>
                <NeonBar value={g.progress} max={100} color={g.color || "var(--neon)"} height={5} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title={`Meine Tasks (${doneTasks.length}/${myTasks.length})`} accent="var(--cyan)">
        {myTasks.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "12px 0" }}>Keine Tasks für dich.</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {activeTasks.map((t) => (
              <TaskRow key={t.id} label={t.label} done={false} onToggle={() => toggle(t.id, true)} busy={busy === t.id} />
            ))}
            {doneTasks.length > 0 && activeTasks.length > 0 && <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />}
            {doneTasks.map((t) => (
              <TaskRow key={t.id} label={t.label} done={true} onToggle={() => toggle(t.id, false)} busy={busy === t.id} />
            ))}
          </div>
        )}
      </Card>

      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
        <Badge variant={smState === "ACTIVE" ? "neon" : "amber"}>{smState}</Badge>
        <Badge variant="magenta">Moral: {sm.morale}%</Badge>
      </div>
    </div>
  );
}

function TaskRow({ label, done, onToggle, busy }: { label: string; done: boolean; onToggle: () => void; busy: boolean }) {
  return (
    <button onClick={onToggle} disabled={busy}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: done ? "var(--bg3)" : "var(--bg2)", border: `1px solid ${done ? "var(--neon)" : "var(--border)"}`, borderRadius: 6, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1, textAlign: "left", width: "100%", transition: "all 0.15s" }}>
      <span style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${done ? "var(--neon)" : "var(--border)"}`, background: done ? "var(--neon)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, color: "var(--bg)" }}>
        {done && "✓"}
      </span>
      <span style={{ fontSize: 14, fontWeight: 500, textDecoration: done ? "line-through" : "none", color: done ? "var(--muted)" : "var(--text)" }}>
        {label}
      </span>
    </button>
  );
}
