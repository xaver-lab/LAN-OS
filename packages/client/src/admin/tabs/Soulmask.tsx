// Admin Tab: Soulmask — Roles, Custom-Roles, Tasks, Goals, Quick-Switch.

import React, { useState } from "react";
import type { SystemState } from "@lan-os/shared";
import {
  Card,
  NeonButton,
  NeonInput,
  NeonSelect,
  Badge,
  NeonBar,
  ColorPicker,
} from "../../design/components/index.js";
import { post } from "../../api/client.js";

interface Props {
  state: SystemState;
  reload: () => void;
}

export function Soulmask({ state, reload }: Props) {
  const sm = state.soulmaskData;
  const smState = state.soulmaskState;
  const [busy, setBusy] = useState(false);

  const [rolePlayerId, setRolePlayerId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#39ff6e");
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [newTaskPlayerId, setNewTaskPlayerId] = useState("");
  const [newTaskRole, setNewTaskRole] = useState("");
  const [taskLabelError, setTaskLabelError] = useState("");
  const [newGoalLabel, setNewGoalLabel] = useState("");

  async function act(path: string, body?: unknown) {
    setBusy(true);
    try { await post(path, body); reload(); }
    catch (e) { await reload(); alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  const playerOptions = state.players.map((p) => ({ value: p.id, label: p.name }));

  // Available roles: custom roles or default roles
  const availableRoles: { value: string; label: string }[] = sm.customRoles.length > 0
    ? sm.customRoles.map((r) => ({ value: r.id, label: r.label }))
    : sm.defaultRoles.map((r) => ({ value: r, label: r }));

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 900 }}>
      {/* State Controls */}
      <Card title={`Soulmask — ${smState}`} accent="var(--magenta)">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {smState === "IDLE" && (
            <NeonButton onClick={() => act("/admin/soulmask/start")} disabled={busy}>▶ Starten</NeonButton>
          )}
          {smState === "ACTIVE" && (
            <>
              <NeonButton variant="amber" onClick={() => act("/admin/soulmask/pause")} disabled={busy}>⏸ Pause</NeonButton>
              <NeonButton variant="danger" onClick={() => act("/admin/soulmask/end")} disabled={busy}>■ Beenden</NeonButton>
            </>
          )}
          {smState === "PAUSED" && (
            <>
              <NeonButton onClick={() => act("/admin/soulmask/resume")} disabled={busy}>▶ Fortsetzen</NeonButton>
              <NeonButton variant="danger" onClick={() => act("/admin/soulmask/end")} disabled={busy}>■ Beenden</NeonButton>
            </>
          )}
        </div>
      </Card>

      {/* Role Assignment */}
      <Card title="Rollen zuweisen">
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 3 }}>SPIELER</label>
            <NeonSelect value={rolePlayerId} onChange={setRolePlayerId} options={[{ value: "", label: "Spieler…" }, ...playerOptions]} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 3 }}>ROLLE</label>
            <NeonSelect value={roleName} onChange={setRoleName} options={[{ value: "", label: "Rolle…" }, ...availableRoles]} />
          </div>
          <NeonButton
            variant="secondary"
            disabled={busy || !rolePlayerId || !roleName}
            onClick={() => act(`/admin/soulmask/players/${rolePlayerId}/role`, { roleId: roleName })}
          >
            Zuweisen
          </NeonButton>
        </div>

        {/* Current assignments */}
        {Object.entries(sm.activeRoles).length > 0 && (
          <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(sm.activeRoles).map(([pid, roleId]) => {
              const p = state.players.find((pl) => pl.id === pid);
              const roleLabel = sm.customRoles.find((r) => r.id === roleId)?.label ?? roleId;
              return (
                <div key={pid} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 4, padding: "4px 10px" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: p?.color ?? "#888", display: "inline-block" }} />
                  <span style={{ fontSize: 13 }}>{p?.name ?? pid}</span>
                  <span style={{ color: "var(--magenta)", fontSize: 12 }}>→ {roleLabel}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Custom Roles */}
      <Card title="Custom Rollen">
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 3 }}>LABEL</label>
            <NeonInput value={newRoleLabel} onChange={setNewRoleLabel} placeholder="Rolle…" />
          </div>
          <div style={{ width: 150 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 3 }}>FARBE</label>
            <ColorPicker value={newRoleColor} onChange={setNewRoleColor} />
          </div>
          <NeonButton
            variant="secondary"
            disabled={busy || !newRoleLabel.trim()}
            onClick={() => {
              act("/admin/soulmask/custom-roles", { label: newRoleLabel.trim(), color: newRoleColor, icon: null }).then(() => { setNewRoleLabel(""); setNewRoleColor("#39ff6e"); });
            }}
          >
            + Rolle
          </NeonButton>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {sm.customRoles.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg3)", border: `1px solid ${r.color}66`, borderRadius: 4, padding: "4px 10px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, display: "inline-block" }} />
              <span style={{ fontSize: 13 }}>{r.label}</span>
            </div>
          ))}
          {sm.customRoles.length === 0 && <span style={{ color: "var(--muted)", fontSize: 13 }}>Keine Custom-Rollen.</span>}
        </div>
      </Card>

      {/* Tasks */}
      <Card title={`Tasks (${sm.tasks.filter((t) => t.done).length}/${sm.tasks.length} erledigt)`}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ flex: 2, minWidth: 160 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 3 }}>TASK-LABEL</label>
            <NeonInput
              value={newTaskLabel}
              onChange={(v) => {
                if (v.length <= 100) {
                  setNewTaskLabel(v);
                  if (taskLabelError) setTaskLabelError("");
                }
              }}
              placeholder="Was muss getan werden…"
              style={{ borderColor: taskLabelError ? "#ff2d6b" : undefined }}
            />
            {taskLabelError && (
              <div style={{ fontSize: 11, color: "#ff2d6b", marginTop: 3 }}>
                {taskLabelError}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 3 }}>SPIELER</label>
            <NeonSelect
              value={newTaskPlayerId}
              onChange={setNewTaskPlayerId}
              options={[{ value: "", label: "Spieler wählen…" }, ...playerOptions]}
            />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 3 }}>ROLLE</label>
            <NeonSelect
              value={newTaskRole}
              onChange={setNewTaskRole}
              options={[{ value: "", label: "Rolle wählen…" }, ...availableRoles]}
            />
          </div>
          <NeonButton
            variant="secondary"
            disabled={
              busy ||
              !newTaskLabel.trim() ||
              !newTaskPlayerId ||
              !newTaskRole
            }
            onClick={async () => {
              const label = newTaskLabel.trim();
              if (!label || label.length > 100 || !newTaskPlayerId || !newTaskRole) {
                setTaskLabelError("Alle Felder erforderlich");
                return;
              }
              await act("/admin/soulmask/tasks", {
                playerId: newTaskPlayerId,
                label,
                role: newTaskRole,
              });
              setNewTaskLabel("");
              setNewTaskPlayerId("");
              setNewTaskRole("");
              setTaskLabelError("");
            }}
          >
            + Task
          </NeonButton>
        </div>
        <div style={{ display: "grid", gap: 5 }}>
          {sm.tasks.map((t) => {
            const assignee = state.players.find((p) => p.id === t.playerId);
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 5 }}>
                <button
                  onClick={() => act(`/admin/soulmask/tasks/${t.id}`, { done: !t.done })}
                  style={{ width: 16, height: 16, borderRadius: 3, border: `1px solid ${t.done ? "var(--neon)" : "var(--border)"}`, background: t.done ? "var(--neon)" : "transparent", cursor: "pointer", flexShrink: 0 }}
                />
                <span style={{ flex: 1, fontSize: 13, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--muted)" : "var(--text)" }}>
                  {t.label}
                </span>
                {assignee && <Badge variant="muted">{assignee.name}</Badge>}
                <span style={{ fontSize: 11, color: "var(--muted)" }}>{t.role}</span>
                <button
                  onClick={() => {
                    if (confirm(`Task "${t.label}" löschen?`)) {
                      act(`/admin/soulmask/tasks/${t.id}`, {});
                    }
                  }}
                  style={{
                    width: 20,
                    height: 20,
                    border: "1px solid var(--border)",
                    borderRadius: 3,
                    background: "transparent",
                    color: "#ff2d6b",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                  title="Task löschen"
                >
                  ✕
                </button>
              </div>
            );
          })}
          {sm.tasks.length === 0 && <span style={{ color: "var(--muted)", fontSize: 13 }}>Keine Tasks.</span>}
        </div>
      </Card>

      {/* Goals */}
      <Card title="Global Goals">
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ flex: 2, minWidth: 160 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 3 }}>LABEL</label>
            <NeonInput value={newGoalLabel} onChange={setNewGoalLabel} placeholder="Ziel-Label…" />
          </div>
          <NeonButton
            variant="secondary"
            disabled={busy || !newGoalLabel.trim()}
            onClick={() => {
              act("/admin/soulmask/goals", { label: newGoalLabel.trim(), color: "#39ff6e" }).then(() => setNewGoalLabel(""));
            }}
          >
            + Ziel
          </NeonButton>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {sm.globalGoals.map((g) => (
            <div key={g.id} style={{ display: "grid", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>{g.label}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: g.color || "var(--neon)" }}>
                  {g.progress}%
                </span>
              </div>
              <NeonBar value={g.progress} max={100} color={g.color || "var(--neon)"} height={5} />
            </div>
          ))}
          {sm.globalGoals.length === 0 && <span style={{ color: "var(--muted)", fontSize: 13 }}>Keine Ziele definiert.</span>}
        </div>
      </Card>
    </div>
  );
}
