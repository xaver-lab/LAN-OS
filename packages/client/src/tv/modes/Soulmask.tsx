// TV Mode: Soulmask — Rollen, Goals, Morale, Live Task Feed.

import React from "react";
import type { SystemState } from "@lan-os/shared";
import { NeonBar, PulsingDot } from "../../design/components/index.js";

interface Props {
  state: SystemState;
}

export function SoulmaskMode({ state }: Props) {
  const sm = state.soulmaskData;
  const goals = sm.globalGoals;
  const doneTasks   = sm.tasks.filter((t) => t.done);
  const activeTasks = sm.tasks.filter((t) => !t.done);

  return (
    <div className="grid-bg scanline" style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto 1fr", gap: 0 }}>
      {/* Header */}
      <div style={{ gridColumn: "1 / -1", padding: "20px 40px", borderBottom: "1px solid var(--magenta)", background: "#ff2d6b0a", display: "flex", alignItems: "center", gap: 16 }}>
        <PulsingDot color="var(--magenta)" size={10} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: "var(--magenta)", textShadow: "0 0 12px var(--magenta)", letterSpacing: "0.2em" }}>SOULMASK</span>
        <span style={{ padding: "3px 10px", border: "1px solid var(--magenta)", borderRadius: 4, fontSize: 12, color: "var(--magenta)", fontFamily: "'JetBrains Mono', monospace" }}>{state.soulmaskState}</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>MORAL</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700, color: sm.morale >= 70 ? "var(--neon)" : sm.morale >= 40 ? "var(--amber)" : "var(--magenta)" }}>{sm.morale}%</span>
        </div>
      </div>

      {/* Left: Tasks */}
      <div style={{ padding: 32, borderRight: "1px solid var(--border)", overflowY: "auto" }}>
        <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "var(--muted)", letterSpacing: "0.15em", marginBottom: 16 }}>
          TASKS — {doneTasks.length}/{sm.tasks.length}
        </div>
        <NeonBar value={doneTasks.length} max={Math.max(sm.tasks.length, 1)} color="var(--magenta)" height={6} style={{ marginBottom: 20 }} />
        <div style={{ display: "grid", gap: 8 }}>
          {activeTasks.slice(0, 8).map((t) => {
            const assignee = state.players.find((p) => p.id === t.playerId);
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, border: "1px solid var(--border)", background: "transparent", display: "inline-block", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 14 }}>{t.label}</span>
                {assignee && <span style={{ fontSize: 12, color: assignee.color }}>{assignee.name}</span>}
              </div>
            );
          })}
          {doneTasks.slice(-3).map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: "var(--bg3)", border: "1px solid var(--neon)", borderRadius: 6, opacity: 0.6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, border: "1px solid var(--neon)", background: "var(--neon)", display: "inline-block", flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14, textDecoration: "line-through", color: "var(--muted)" }}>{t.label}</span>
              <span style={{ fontSize: 11, color: "var(--neon)" }}>✓</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Goals + Roles */}
      <div style={{ padding: 32, overflowY: "auto" }}>
        {goals.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "var(--muted)", letterSpacing: "0.15em", marginBottom: 16 }}>GLOBAL GOALS</div>
            <div style={{ display: "grid", gap: 14 }}>
              {goals.map((g) => (
                <div key={g.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                    <span>{g.label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: g.color || "var(--neon)", fontWeight: 700 }}>{g.progress}%</span>
                  </div>
                  <NeonBar value={g.progress} max={100} color={g.color || "var(--magenta)"} height={6} />
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(sm.activeRoles).length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "var(--muted)", letterSpacing: "0.15em", marginBottom: 14 }}>ROLLEN</div>
            <div style={{ display: "grid", gap: 8 }}>
              {Object.entries(sm.activeRoles).map(([pid, roleId]) => {
                const p = state.players.find((pl) => pl.id === pid);
                const roleLabel = sm.customRoles.find((r) => r.id === roleId)?.label ?? roleId;
                return (
                  <div key={pid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: "50%", background: p?.color ?? "#888", display: "inline-block", boxShadow: `0 0 6px ${p?.color ?? "#888"}` }} />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{p?.name ?? pid}</span>
                    <span style={{ color: "var(--magenta)", fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>{roleLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
