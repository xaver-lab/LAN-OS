// Admin Tab: Overview — Track-Toggles, Stats, Quick-Actions, Mini-Leaderboard, Theme-Picker.

import React, { useState } from "react";
import type { SystemState, TvTheme, WheelVariant } from "@lan-os/shared";
import {
  Card,
  NeonButton,
  Badge,
  NeonSelect,
  PulsingDot,
} from "../../design/components/index.js";
import { post } from "../../api/client.js";

interface Props {
  state: SystemState;
  reload: () => void;
}

const THEME_OPTIONS: { value: TvTheme; label: string }[] = [
  { value: "dark-arcade", label: "Dark Arcade" },
  { value: "synthwave",   label: "Synthwave" },
  { value: "arctic",      label: "Arctic" },
];

const WHEEL_OPTIONS: { value: WheelVariant; label: string }[] = [
  { value: "pie",     label: "Pie Wheel" },
  { value: "orbital", label: "Orbital" },
  { value: "fortune", label: "Fortune" },
];

export function Overview({ state, reload }: Props) {
  const [busy, setBusy] = useState(false);

  async function toggleTrack(track: "TOURNAMENT" | "SOULMASK") {
    setBusy(true);
    try {
      const isOn =
        track === "TOURNAMENT"
          ? state.activeTracks.includes("TOURNAMENT")
          : state.activeTracks.includes("SOULMASK");
      await post(`/admin/track/${track}`, { active: !isOn });
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function setTheme(theme: TvTheme) {
    await post("/admin/ui/preferences", { tvTheme: theme }).catch(() => {});
    reload();
  }

  async function setWheelVariant(variant: WheelVariant) {
    await post("/admin/ui/preferences", { wheelVariant: variant }).catch(() => {});
    reload();
  }

  const tournamentOn = state.activeTracks.includes("TOURNAMENT");
  const soulmaskOn   = state.activeTracks.includes("SOULMASK");
  const onlinePlayers = state.players.filter((p) => p.online).length;

  // leaderboard.top is string[] of player IDs — look up points
  const leaderTop = state.leaderboard.top.slice(0, 5).map((pid) => {
    const p = state.players.find((pl) => pl.id === pid);
    return { playerId: pid, player: p, points: p?.points ?? 0 };
  });

  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", maxWidth: 900 }}>
      {/* Track Toggles */}
      <Card title="Tracks" accent="var(--neon)" style={{ gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <TrackToggle
            label="TOURNAMENT"
            active={tournamentOn}
            stateLabel={state.tournamentState}
            onToggle={() => toggleTrack("TOURNAMENT")}
            busy={busy}
          />
          <TrackToggle
            label="SOULMASK"
            active={soulmaskOn}
            stateLabel={state.soulmaskState}
            onToggle={() => toggleTrack("SOULMASK")}
            busy={busy}
          />
        </div>
      </Card>

      {/* Stats */}
      <Card title="Status">
        <div style={{ display: "grid", gap: 10 }}>
          <StatRow label="Online Players" value={`${onlinePlayers} / ${state.players.length}`} />
          <StatRow label="Tournament State" value={state.tournamentState} />
          <StatRow label="Soulmask State" value={state.soulmaskState} />
          <StatRow label="State Version" value={String(state.version)} mono />
          <StatRow label="Schema" value={state.schemaVersion} mono />
        </div>
      </Card>

      {/* Mini Leaderboard */}
      <Card title="Leaderboard Top 5">
        {leaderTop.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Noch keine Punkte</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {leaderTop.map((e, i) => (
              <div key={e.playerId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "var(--muted)", fontSize: 13, width: 20 }}>#{i + 1}</span>
                {e.player && (
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: e.player.color, flexShrink: 0, display: "inline-block" }} />
                )}
                <span style={{ flex: 1, fontSize: 14 }}>{e.player?.name ?? e.playerId}</span>
                <span style={{ color: "var(--neon)", fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>
                  {e.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* UI Preferences */}
      <Card title="UI Preferences">
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>TV THEME</label>
            <NeonSelect value={state.uiPreferences.tvTheme} onChange={(v) => setTheme(v as TvTheme)} options={THEME_OPTIONS} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>WHEEL VARIANT</label>
            <NeonSelect value={state.uiPreferences.wheelVariant} onChange={(v) => setWheelVariant(v as WheelVariant)} options={WHEEL_OPTIONS} />
          </div>
        </div>
      </Card>
    </div>
  );
}

function TrackToggle({ label, active, stateLabel, onToggle, busy }: {
  label: string; active: boolean; stateLabel: string; onToggle: () => void; busy: boolean;
}) {
  return (
    <div style={{ flex: 1, minWidth: 200, background: "var(--bg3)", border: `1px solid ${active ? "var(--neon)" : "var(--border)"}`, borderRadius: 8, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
      {active ? <PulsingDot /> : <span style={{ width: 8, height: 8, background: "var(--muted)", borderRadius: "50%", display: "inline-block" }} />}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, letterSpacing: "0.08em", fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>{stateLabel}</div>
      </div>
      <NeonButton variant={active ? "danger" : "primary"} onClick={onToggle} disabled={busy} style={{ padding: "5px 14px", fontSize: 13 }}>
        {active ? "Stop" : "Start"}
      </NeonButton>
    </div>
  );
}

function StatRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 13, color: "var(--muted)" }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--text)", fontFamily: mono ? "'JetBrains Mono', monospace" : undefined }}>{value}</span>
    </div>
  );
}
