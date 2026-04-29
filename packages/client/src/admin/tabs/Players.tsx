// Admin Tab: Players — CRUD, warn, kick (mit Confirm), manual-add.

import React, { useState } from "react";
import type { SystemState, Player } from "@lan-os/shared";
import {
  Card,
  NeonButton,
  NeonInput,
  Badge,
  PulsingDot,
  ConfirmDialog,
} from "../../design/components/index.js";
import { post, del } from "../../api/client.js";

interface Props {
  state: SystemState;
  reload: () => void;
}

export function Players({ state, reload }: Props) {
  const [addName, setAddName] = useState("");
  const [addColor, setAddColor] = useState("");
  const [adding, setAdding] = useState(false);
  const [kickTarget, setKickTarget] = useState<Player | null>(null);
  const [warnTarget, setWarnTarget] = useState<Player | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function addPlayer() {
    if (!addName.trim()) return;
    setAdding(true);
    try {
      await post("/admin/players", { name: addName.trim(), color: addColor || undefined });
      setAddName("");
      setAddColor("");
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  }

  async function kickPlayer(playerId: string) {
    setBusy(playerId);
    try {
      await post(`/admin/players/${playerId}/kick`);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      setKickTarget(null);
    }
  }

  async function warnPlayer(playerId: string) {
    setBusy(playerId);
    try {
      await post(`/admin/players/${playerId}/warn`);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      setWarnTarget(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 900 }}>
      {/* Add Player */}
      <Card title="Player hinzufügen" accent="var(--cyan)">
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>
              NAME
            </label>
            <NeonInput value={addName} onChange={setAddName} placeholder="Spieler-Name" />
          </div>
          <div style={{ width: 130 }}>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>
              FARBE (opt.)
            </label>
            <NeonInput value={addColor} onChange={setAddColor} placeholder="#hex" />
          </div>
          <NeonButton variant="secondary" onClick={addPlayer} disabled={adding || !addName.trim()}>
            + Hinzufügen
          </NeonButton>
        </div>
      </Card>

      {/* Player List */}
      <Card title={`Players (${state.players.length})`}>
        <div style={{ display: "grid", gap: 6 }}>
          {state.players.length === 0 && (
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Keine Spieler.</div>
          )}
          {state.players.map((p) => (
            <PlayerRow
              key={p.id}
              player={p}
              busy={busy === p.id}
              onKick={() => setKickTarget(p)}
              onWarn={() => setWarnTarget(p)}
            />
          ))}
        </div>
      </Card>

      {/* Kick Confirm */}
      <ConfirmDialog
        open={!!kickTarget}
        title={`${kickTarget?.name} kicken?`}
        message="Der Spieler wird abgemeldet. Sein Session-Token wird ungültig. Punkte bleiben erhalten."
        confirmLabel="Kicken"
        dangerous
        onConfirm={() => kickTarget && kickPlayer(kickTarget.id)}
        onCancel={() => setKickTarget(null)}
      />

      {/* Warn Confirm */}
      <ConfirmDialog
        open={!!warnTarget}
        title={`Verwarnung für ${warnTarget?.name}?`}
        message="Eine Verwarnung wird hinzugefügt."
        confirmLabel="Verwarnen"
        dangerous
        onConfirm={() => warnTarget && warnPlayer(warnTarget.id)}
        onCancel={() => setWarnTarget(null)}
      />
    </div>
  );
}

function PlayerRow({
  player,
  busy,
  onKick,
  onWarn,
}: {
  player: Player;
  busy: boolean;
  onKick: () => void;
  onWarn: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        background: "var(--bg3)",
        border: "1px solid var(--border)",
        borderRadius: 6,
      }}
    >
      {/* Color dot + online */}
      <div style={{ position: "relative", width: 16, height: 16, flexShrink: 0 }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: player.color,
            display: "block",
            position: "absolute",
            top: 2,
            left: 2,
          }}
        />
        {player.online && (
          <span
            style={{
              position: "absolute",
              bottom: -1,
              right: -1,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--neon)",
              border: "1px solid var(--bg3)",
            }}
          />
        )}
      </div>

      {/* Name */}
      <span style={{ fontWeight: 600, fontSize: 14, minWidth: 100 }}>{player.name}</span>

      {/* Role */}
      <Badge variant="muted">{player.role}</Badge>

      {/* Points */}
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          color: "var(--neon)",
          marginLeft: 4,
        }}
      >
        {player.points}pt
      </span>

      {/* Warnings */}
      {player.warnings > 0 && (
        <Badge variant="amber">⚠ {player.warnings}</Badge>
      )}

      {/* Streak */}
      {player.streak.current > 0 && (
        <Badge variant="cyan">🔥 ×{player.streak.current}</Badge>
      )}

      {/* Actions */}
      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
        <NeonButton
          variant="amber"
          disabled={busy}
          onClick={onWarn}
          style={{ padding: "3px 10px", fontSize: 12 }}
        >
          Warn
        </NeonButton>
        <NeonButton
          variant="danger"
          disabled={busy}
          onClick={onKick}
          style={{ padding: "3px 10px", fontSize: 12 }}
        >
          Kick
        </NeonButton>
      </div>
    </div>
  );
}
