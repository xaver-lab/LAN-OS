// Player Tab: Soulmask — Role Display, Personal Tasks, Global Goals, Live Morale.
// Live-polling basiert (2s Cadence), zeigt aktuelle Rolle, eigene Tasks, Team-Goals.

import React, { useState, useMemo } from "react";
import type { SystemState, SoulmaskTask, GlobalGoal, DefaultSoulmaskRole } from "@lan-os/shared";
import { Card, Badge, NeonBar, NeonButton } from "../../design/components/index.js";
import { toggleTask, setSoulmaskRole } from "../../api/client.js";

interface Props {
  state: SystemState;
  playerId: string;
  reload: () => void;
}

// ── Icon-Mapping für Rollen ────────────────────────────────────────────────
const ROLE_ICONS: Record<string, string> = {
  Builder: "🏗",
  Fighter: "⚔",
  Farmer: "🌾",
  Explorer: "🗺",
  Support: "🛡",
  Scout: "👁",
};

const ROLE_COLORS: Record<string, string> = {
  Builder: "#ffb830",  // amber
  Fighter: "#ff2d6b",  // magenta
  Farmer: "#39ff6e",   // neon
  Explorer: "#00e5ff", // cyan
  Support: "#80ffea",  // arctic
  Scout: "#f72fff",    // synthwave pink
};

// Derive Morale aus completed/total Tasks
function calculateMorale(tasks: SoulmaskTask[]): number {
  if (tasks.length === 0) return 100;
  const done = tasks.filter((t) => t.done).length;
  return Math.round((done / tasks.length) * 100);
}

// Role-Contribution für Global Goals: "X von Y Tasks fertig für dieses Goal"
function getRoleTaskStats(
  tasks: SoulmaskTask[],
  role: string
): { completed: number; total: number } {
  const roleTasksForGoal = tasks.filter((t) => t.role === role);
  const completed = roleTasksForGoal.filter((t) => t.done).length;
  return { completed, total: roleTasksForGoal.length };
}

export function SoulmaskTab({ state, playerId, reload }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const sm = state.soulmaskData;
  const smState = state.soulmaskState;
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  // Hole aktuelle Rolle des Players
  const currentRole = sm.activeRoles[playerId];

  // Alle Tasks für diesen Player
  const myTasks = sm.tasks.filter((t) => t.playerId === playerId);

  // Tasks für aktuelle Rolle filtern
  const myRoleTasks = myTasks.filter((t) => t.role === currentRole);

  // Sortierung: Pending first, dann Done
  const activeTasks = myRoleTasks.filter((t) => !t.done);
  const doneTasks = myRoleTasks.filter((t) => t.done);
  const sortedTasks = [...activeTasks, ...doneTasks];

  // Global Goals mit Role-Contribution
  const goals = sm.globalGoals;

  // View-State
  if (smState === "IDLE" || smState === "DONE") {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🧬</div>
        <div style={{ fontSize: 18, marginBottom: 4 }}>Soulmask</div>
        <div style={{ fontSize: 14 }}>
          {smState === "IDLE" ? "Noch nicht aktiv." : "Session beendet."}
        </div>
      </div>
    );
  }

  async function toggleMyTask(taskId: string, done: boolean) {
    setBusy(taskId);
    try {
      await toggleTask(taskId, done);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function changeRole(newRole: string) {
    setBusy("role-change");
    try {
      await setSoulmaskRole(newRole);
      setShowRoleSelector(false);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  // Morale berechnen (aus ALL tasks)
  const morale = calculateMorale(sm.tasks);

  // Verfügbare Rollen für Selector
  const availableRoles = [
    ...sm.defaultRoles,
    ...sm.customRoles.map((r) => r.id),
  ];

  const roleColor = ROLE_COLORS[currentRole] || "var(--neon)";
  const roleIcon = ROLE_ICONS[currentRole] || "?";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* 1. Header: Aktuelle Rolle + Morale */}
      <Card accent={roleColor} style={{ background: `linear-gradient(135deg, var(--bg2) 0%, ${roleColor}08 100%)` }}>
        <div style={{ display: "grid", gap: 12 }}>
          {/* Rolle-Display */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  fontSize: 40,
                  lineHeight: 1,
                  filter: `drop-shadow(0 0 8px ${roleColor})`,
                }}
              >
                {roleIcon}
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" }}>
                  Deine Rolle
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: roleColor, letterSpacing: "0.05em" }}>
                  {currentRole}
                </div>
              </div>
            </div>

            {state.config.soulmaskAllowPlayerCustomRoles && (
              <NeonButton
                variant="secondary"
                onClick={() => setShowRoleSelector(!showRoleSelector)}
                disabled={busy === "role-change"}
              >
                Wechseln
              </NeonButton>
            )}
          </div>

          {/* Role Selector (hidden per default) */}
          {showRoleSelector && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                gap: 8,
                padding: "12px",
                background: "var(--bg3)",
                borderRadius: 6,
                borderTop: `1px solid ${roleColor}`,
              }}
            >
              {availableRoles.map((role) => {
                const isCustom = sm.customRoles.some((r) => r.id === role);
                const customRole = isCustom
                  ? sm.customRoles.find((r) => r.id === role)
                  : null;
                const c = customRole ? customRole.color : ROLE_COLORS[role as DefaultSoulmaskRole] || "var(--neon)";
                const icon = customRole ? "✦" : ROLE_ICONS[role as DefaultSoulmaskRole] || "?";

                return (
                  <button
                    key={role}
                    onClick={() => changeRole(role)}
                    disabled={busy === "role-change" || role === currentRole}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 4,
                      border: `2px solid ${c}`,
                      background: role === currentRole ? c + "22" : "transparent",
                      color: c,
                      fontWeight: 600,
                      cursor: role === currentRole ? "default" : "pointer",
                      opacity: role === currentRole ? 1 : 0.6,
                      transition: "all 0.15s",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    <span>{role}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Morale-Meter */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                marginBottom: 6,
                color: "var(--muted)",
              }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Team-Moral
              </span>
              <span style={{ color: roleColor, fontWeight: 700 }}>{morale}%</span>
            </div>
            <NeonBar
              value={morale}
              max={100}
              color={morale >= 70 ? "#39ff6e" : morale >= 40 ? "#ffb830" : "#ff2d6b"}
              height={8}
            />
          </div>
        </div>
      </Card>

      {/* 2. Persönliche Tasks */}
      <Card title={`Meine Tasks für ${currentRole}`} accent="var(--cyan)">
        {sortedTasks.length === 0 ? (
          <div
            style={{
              color: "var(--muted)",
              fontSize: 13,
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            Keine Tasks für diese Rolle.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {activeTasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                done={false}
                onToggle={() => toggleMyTask(t.id, true)}
                busy={busy === t.id}
              />
            ))}
            {activeTasks.length > 0 && doneTasks.length > 0 && (
              <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
            )}
            {doneTasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                done={true}
                onToggle={() => toggleMyTask(t.id, false)}
                busy={busy === t.id}
              />
            ))}
            {/* Progress: X von Y fertig */}
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <span style={{ color: "var(--muted)" }}>Fortschritt</span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--cyan)",
                  fontWeight: 700,
                }}
              >
                {doneTasks.length}/{sortedTasks.length}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* 3. Global Goals mit Role-Contribution */}
      {goals.length > 0 && (
        <Card title="Team-Ziele (Global Goals)" accent="var(--magenta)">
          <div style={{ display: "grid", gap: 14 }}>
            {goals.map((goal) => {
              // Für jede Rolle: Count der Tasks
              const roleStats = availableRoles.map((role) => {
                const { completed, total } = getRoleTaskStats(
                  sm.tasks.filter((t) => {
                    // Tasks, die zu diesem Goal gehören (über label-matching oder goal-id)
                    // Simplified: alle Tasks eines Spielers in einer Rolle zählen
                    return true;
                  }),
                  role
                );
                return { role, completed, total };
              });

              // Aggregiert: Alle Tasks für dieses Goal (simplified)
              const allTasksForGoal = sm.tasks; // in realer App würde Goal-Referenz existieren
              const completedCount = allTasksForGoal.filter((t) => t.done).length;
              const totalCount = allTasksForGoal.length || 1;

              return (
                <div key={goal.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                        {goal.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--muted)",
                          marginTop: 2,
                        }}
                      >
                        {completedCount}/{totalCount} Contributions
                      </div>
                    </div>
                    <Badge variant="magenta" style={{ color: goal.color || "var(--magenta)" }}>
                      {goal.progress}%
                    </Badge>
                  </div>
                  <NeonBar
                    value={goal.progress}
                    max={100}
                    color={goal.color || "var(--magenta)"}
                    height={6}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 4. Status-Footer */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
        <Badge variant={smState === "ACTIVE" ? "neon" : "amber"}>{smState}</Badge>
        <Badge variant="magenta">Moral: {morale}%</Badge>
        <Badge variant="cyan">
          {sortedTasks.length} Tasks
        </Badge>
      </div>
    </div>
  );
}

// ── TaskRow ─────────────────────────────────────────────────────────────────
function TaskRow({
  task,
  done,
  onToggle,
  busy,
}: {
  task: { id: string; label: string; role: string; done: boolean };
  done: boolean;
  onToggle: () => void;
  busy: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={busy}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        background: done ? "var(--bg3)" : "var(--bg2)",
        border: `1px solid ${done ? "var(--neon)" : "var(--border)"}`,
        borderRadius: 6,
        cursor: busy ? "wait" : "pointer",
        opacity: busy ? 0.6 : 1,
        textAlign: "left",
        width: "100%",
        transition: "all 0.15s",
      }}
    >
      {/* Checkbox */}
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          border: `2px solid ${done ? "var(--neon)" : "var(--border)"}`,
          background: done ? "var(--neon)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 11,
          fontWeight: 700,
          color: done ? "var(--bg)" : "transparent",
          transition: "all 0.15s",
        }}
      >
        {done && "✓"}
      </span>

      {/* Label + Role */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            textDecoration: done ? "line-through" : "none",
            color: done ? "var(--muted)" : "var(--text)",
            transition: "all 0.15s",
          }}
        >
          {task.label}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
          {ROLE_ICONS[task.role as DefaultSoulmaskRole] || "?"} {task.role}
        </div>
      </div>

      {/* Status-Badge */}
      <Badge
        variant={done ? "neon" : "ghost"}
        style={{
          fontSize: 11,
          padding: "2px 6px",
          flexShrink: 0,
        }}
      >
        {done ? "✓ DONE" : "OPEN"}
      </Badge>
    </button>
  );
}
