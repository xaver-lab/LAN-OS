// Admin Tab: Soulmask — Rollen-Zuordnung, Custom-Rollen, Task-Management, Global Goals, Morale-Meter

import React, { useState } from "react";
import type { SystemState } from "@lan-os/shared";
import {
  Card,
  NeonButton,
  NeonInput,
  NeonSelect,
  Badge,
  NeonBar,
} from "../../design/components/index.js";
import { post, del } from "../../api/client.js";

interface Props {
  state: SystemState;
  reload: () => void;
}

export function Soulmask({ state, reload }: Props) {
  const sm = state.soulmaskData;
  const smState = state.soulmaskState;
  const [busy, setBusy] = useState(false);

  // State für Rollen-Zuordnung
  const [rolePlayerId, setRolePlayerId] = useState("");
  const [roleId, setRoleId] = useState("");

  // State für Custom-Rollen
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#39ff6e");

  // State für Tasks
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [newTaskPlayerId, setNewTaskPlayerId] = useState("");
  const [newTaskRoleId, setNewTaskRoleId] = useState("");

  // State für Goals
  const [newGoalLabel, setNewGoalLabel] = useState("");
  const [newGoalColor, setNewGoalColor] = useState("#39ff6e");
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingGoalProgress, setEditingGoalProgress] = useState(0);

  async function act(path: string, body?: unknown) {
    setBusy(true);
    try {
      await post(path, body);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(path: string) {
    setBusy(true);
    try {
      await del(path);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const playerOptions = state.players.map((p) => ({ value: p.id, label: p.name }));

  // Alle verfügbaren Rollen (Default + Custom)
  const allRoles = [
    ...sm.defaultRoles.map((r) => ({ value: r, label: r, color: getDefaultRoleColor(r) })),
    ...sm.customRoles.map((r) => ({ value: r.id, label: r.label, color: r.color })),
  ];

  // Morale-Berechnung
  const totalTasks = sm.tasks.length;
  const doneTasks = sm.tasks.filter((t) => t.done).length;
  const moralePercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Farbe für Morale-Bar basierend auf Prozentsatz
  function getMoraleColor(): string {
    if (moralePercent === 100) return "#39ff6e"; // Grün
    if (moralePercent >= 50) return "#ffb830"; // Orange
    return "#ff2d6b"; // Rot
  }

  function getDefaultRoleColor(role: string): string {
    const roleColors: Record<string, string> = {
      Builder: "#00e5ff",
      Fighter: "#ff2d6b",
      Farmer: "#39ff6e",
      Explorer: "#ffb830",
      Support: "#9d4edd",
      Scout: "#fb5607",
    };
    return roleColors[role] || "#39ff6e";
  }

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 1400 }}>
      {/* State Controls */}
      <Card title={`Soulmask — ${smState}`} accent="var(--magenta)">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {smState === "IDLE" && (
            <NeonButton onClick={() => act("/admin/soulmask/start")} disabled={busy}>
              ▶ Starten
            </NeonButton>
          )}
          {smState === "ACTIVE" && (
            <>
              <NeonButton variant="amber" onClick={() => act("/admin/soulmask/pause")} disabled={busy}>
                ⏸ Pause
              </NeonButton>
              <NeonButton variant="danger" onClick={() => act("/admin/soulmask/end")} disabled={busy}>
                ■ Beenden
              </NeonButton>
            </>
          )}
          {smState === "PAUSED" && (
            <>
              <NeonButton onClick={() => act("/admin/soulmask/resume")} disabled={busy}>
                ▶ Fortsetzen
              </NeonButton>
              <NeonButton variant="danger" onClick={() => act("/admin/soulmask/end")} disabled={busy}>
                ■ Beenden
              </NeonButton>
            </>
          )}
        </div>
      </Card>

      {/* Morale-Meter (prominent oben) */}
      <Card title={`🎯 Morale-Meter — ${doneTasks}/${totalTasks} Tasks erledigt`} accent={getMoraleColor()}>
        <div style={{ display: "grid", gap: 8 }}>
          <NeonBar value={moralePercent} max={100} color={getMoraleColor()} height={12} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: "var(--muted)" }}>Gesamt-Moral:</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", color: getMoraleColor(), fontWeight: "bold" }}>
              {moralePercent}%
            </span>
          </div>
        </div>
      </Card>

      {/* 4-Column Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {/* Column 1: Rollen-Zuordnung */}
        <Card title="👥 Rollen zuweisen">
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                SPIELER
              </label>
              <NeonSelect
                value={rolePlayerId}
                onChange={setRolePlayerId}
                options={[{ value: "", label: "Spieler…" }, ...playerOptions]}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                ROLLE
              </label>
              <NeonSelect
                value={roleId}
                onChange={setRoleId}
                options={[{ value: "", label: "Rolle…" }, ...allRoles.map((r) => ({ value: r.value, label: r.label }))]}
              />
            </div>
            <NeonButton
              variant="secondary"
              disabled={busy || !rolePlayerId || !roleId}
              onClick={() => act("/admin/soulmask/role", { playerId: rolePlayerId, roleId }).then(() => {
                setRolePlayerId("");
                setRoleId("");
              })}
            >
              Rolle zuweisen
            </NeonButton>
          </div>

          {/* Aktuelle Zuweisungen */}
          {Object.entries(sm.activeRoles).length > 0 && (
            <div style={{ marginTop: 12, display: "grid", gap: 6, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: "bold" }}>AKTIVE ZUWEISUNGEN</span>
              {Object.entries(sm.activeRoles).map(([pid, rid]) => {
                const p = state.players.find((pl) => pl.id === pid);
                const role = allRoles.find((r) => r.value === rid);
                return (
                  <div
                    key={pid}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "var(--bg3)",
                      border: `1px solid ${role?.color || "var(--border)"}33`,
                      borderRadius: 4,
                      padding: "6px 8px",
                      fontSize: 12,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: p?.color ?? "#888",
                        display: "inline-block",
                      }}
                    />
                    <span style={{ flex: 1 }}>{p?.name ?? pid}</span>
                    <span style={{ color: role?.color || "var(--neon)", fontSize: 11, fontWeight: "bold" }}>
                      {role?.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Column 2: Custom-Rollen */}
        <Card title="🎨 Custom-Rollen">
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                LABEL
              </label>
              <NeonInput value={newRoleLabel} onChange={setNewRoleLabel} placeholder="Rolle…" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                FARBE
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="color"
                  value={newRoleColor}
                  onChange={(e) => setNewRoleColor(e.target.value)}
                  style={{
                    width: 44,
                    height: 32,
                    border: `1px solid var(--border)`,
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                />
                <NeonInput value={newRoleColor} onChange={setNewRoleColor} placeholder="#hex" style={{ flex: 1 }} />
              </div>
            </div>
            <NeonButton
              variant="secondary"
              disabled={busy || !newRoleLabel.trim()}
              onClick={() => {
                act("/admin/soulmask/custom-roles", {
                  label: newRoleLabel.trim(),
                  color: newRoleColor,
                  icon: null,
                }).then(() => {
                  setNewRoleLabel("");
                  setNewRoleColor("#39ff6e");
                });
              }}
            >
              + Neue Rolle
            </NeonButton>
          </div>

          {/* Custom-Rollen Liste */}
          {sm.customRoles.length > 0 && (
            <div style={{ marginTop: 12, display: "grid", gap: 6, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: "bold" }}>DEFINED</span>
              {sm.customRoles.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "var(--bg3)",
                    border: `1px solid ${r.color}66`,
                    borderRadius: 4,
                    padding: "6px 8px",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: r.color,
                      display: "inline-block",
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 12 }}>{r.label}</span>
                  <NeonButton
                    variant="danger"
                    style={{ padding: "2px 6px", fontSize: 10, height: 24 }}
                    disabled={busy}
                    onClick={() => remove(`/admin/soulmask/custom-roles/${r.id}`)}
                  >
                    ✕
                  </NeonButton>
                </div>
              ))}
            </div>
          )}
          {sm.customRoles.length === 0 && (
            <div style={{ marginTop: 12, color: "var(--muted)", fontSize: 12, textAlign: "center" }}>
              Keine Custom-Rollen.
            </div>
          )}
        </Card>

        {/* Column 3: Tasks */}
        <Card title={`✓ Tasks (${doneTasks}/${totalTasks})`}>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                TASK-LABEL
              </label>
              <NeonInput value={newTaskLabel} onChange={setNewTaskLabel} placeholder="Task…" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                SPIELER
              </label>
              <NeonSelect
                value={newTaskPlayerId}
                onChange={setNewTaskPlayerId}
                options={[{ value: "", label: "Spieler…" }, ...playerOptions]}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                ROLLE
              </label>
              <NeonSelect
                value={newTaskRoleId}
                onChange={setNewTaskRoleId}
                options={[{ value: "", label: "Rolle…" }, ...allRoles.map((r) => ({ value: r.value, label: r.label }))]}
              />
            </div>
            <NeonButton
              variant="secondary"
              disabled={busy || !newTaskLabel.trim() || !newTaskPlayerId || !newTaskRoleId}
              onClick={() => {
                act("/admin/soulmask/tasks", {
                  playerId: newTaskPlayerId,
                  label: newTaskLabel.trim(),
                  role: newTaskRoleId,
                }).then(() => {
                  setNewTaskLabel("");
                  setNewTaskPlayerId("");
                  setNewTaskRoleId("");
                });
              }}
            >
              + Task erstellen
            </NeonButton>
          </div>

          {/* Tasks Grid */}
          {sm.tasks.length > 0 && (
            <div style={{ marginTop: 12, display: "grid", gap: 4, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              {sm.tasks.map((t) => {
                const assignee = state.players.find((p) => p.id === t.playerId);
                const role = allRoles.find((r) => r.value === t.role);
                return (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 8px",
                      background: "var(--bg3)",
                      border: `1px solid ${t.done ? "var(--neon)33" : "var(--border)"}`,
                      borderRadius: 4,
                      opacity: t.done ? 0.6 : 1,
                    }}
                  >
                    <button
                      onClick={() => act(`/admin/soulmask/tasks/${t.id}`, { done: !t.done })}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 3,
                        border: `1px solid ${t.done ? "var(--neon)" : "var(--border)"}`,
                        background: t.done ? "var(--neon)" : "transparent",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                      title={t.done ? "Abhaken" : "Abhaken"}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontSize: 11,
                        textDecoration: t.done ? "line-through" : "none",
                        color: t.done ? "var(--muted)" : "var(--text)",
                      }}
                    >
                      {t.label}
                    </span>
                    {assignee && (
                      <Badge variant="muted" style={{ fontSize: 10 }}>
                        {assignee.name}
                      </Badge>
                    )}
                    <NeonButton
                      variant="danger"
                      style={{ padding: "2px 6px", fontSize: 10, height: 20 }}
                      disabled={busy}
                      onClick={() => remove(`/admin/soulmask/tasks/${t.id}`)}
                    >
                      ✕
                    </NeonButton>
                  </div>
                );
              })}
            </div>
          )}
          {sm.tasks.length === 0 && (
            <div style={{ marginTop: 12, color: "var(--muted)", fontSize: 12, textAlign: "center" }}>
              Keine Tasks.
            </div>
          )}
        </Card>

        {/* Column 4: Global Goals */}
        <Card title="🎯 Global Goals">
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                LABEL
              </label>
              <NeonInput value={newGoalLabel} onChange={setNewGoalLabel} placeholder="Ziel…" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                FARBE
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="color"
                  value={newGoalColor}
                  onChange={(e) => setNewGoalColor(e.target.value)}
                  style={{
                    width: 44,
                    height: 32,
                    border: `1px solid var(--border)`,
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                />
                <NeonInput value={newGoalColor} onChange={setNewGoalColor} placeholder="#hex" style={{ flex: 1 }} />
              </div>
            </div>
            <NeonButton
              variant="secondary"
              disabled={busy || !newGoalLabel.trim()}
              onClick={() => {
                act("/admin/soulmask/goals", {
                  label: newGoalLabel.trim(),
                  color: newGoalColor,
                }).then(() => {
                  setNewGoalLabel("");
                  setNewGoalColor("#39ff6e");
                });
              }}
            >
              + Neues Goal
            </NeonButton>
          </div>

          {/* Goals Liste */}
          {sm.globalGoals.length > 0 && (
            <div style={{ marginTop: 12, display: "grid", gap: 8, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              {sm.globalGoals.map((g) => (
                <div key={g.id} style={{ display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                    <span style={{ fontWeight: "bold" }}>{g.label}</span>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: g.color || "var(--neon)",
                          fontSize: 11,
                          fontWeight: "bold",
                        }}
                      >
                        {editingGoalId === g.id ? editingGoalProgress : g.progress}%
                      </span>
                      <NeonButton
                        variant="danger"
                        style={{ padding: "2px 6px", fontSize: 10, height: 20 }}
                        disabled={busy}
                        onClick={() => remove(`/admin/soulmask/goals/${g.id}`)}
                      >
                        ✕
                      </NeonButton>
                    </div>
                  </div>

                  {editingGoalId === g.id ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={editingGoalProgress}
                        onChange={(e) => setEditingGoalProgress(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <NeonButton
                        style={{ padding: "4px 8px", fontSize: 10, height: 24 }}
                        disabled={busy}
                        onClick={() => {
                          act(`/admin/soulmask/goals/${g.id}`, { progress: editingGoalProgress }).then(() => {
                            setEditingGoalId(null);
                          });
                        }}
                      >
                        OK
                      </NeonButton>
                    </div>
                  ) : (
                    <>
                      <NeonBar value={g.progress} max={100} color={g.color || "var(--neon)"} height={6} />
                      <NeonButton
                        variant="secondary"
                        style={{ padding: "4px 8px", fontSize: 10, height: 24 }}
                        disabled={busy}
                        onClick={() => {
                          setEditingGoalId(g.id);
                          setEditingGoalProgress(g.progress);
                        }}
                      >
                        Edit Progress
                      </NeonButton>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {sm.globalGoals.length === 0 && (
            <div style={{ marginTop: 12, color: "var(--muted)", fontSize: 12, textAlign: "center" }}>
              Keine Goals definiert.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
