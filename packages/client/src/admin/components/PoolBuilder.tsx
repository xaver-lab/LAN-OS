// Pool Builder Component — Visuelle Pool-Management UI mit Drag-n-Drop
// Features: Drag-n-Drop, Min/Max Validation, Quick-Stats, Preset-Pools, Shuffle

import React, { useState, useMemo, type ReactNode } from "react";
import type { Game, SystemState } from "@lan-os/shared";
import {
  Card,
  NeonButton,
  Badge,
  NeonBar,
} from "../../design/components/index.js";
import { post } from "../../api/client.js";

interface Props {
  state: SystemState;
  reload: () => void;
}

type DraggedItem = { type: "game"; gameId: string; source: "available" | "pool" } | null;

export function PoolBuilder({ state, reload }: Props) {
  const [pool, setPool] = useState<string[]>([]);
  const [draggedItem, setDraggedItem] = useState<DraggedItem>(null);
  const [dropHighlight, setDropHighlight] = useState<"available" | "pool" | null>(null);
  const [busy, setBusy] = useState(false);

  const minPool = state.config.votingMinPool ?? 4;
  const maxPool = state.config.votingMaxPool ?? 8;

  // Spiele mit inActivePool=true (verfügbar)
  const availableGames = useMemo(
    () => state.games.filter((g) => g.inActivePool),
    [state.games]
  );

  // Spiele die aktuell im Pool sind
  const poolGames = useMemo(
    () => pool.map((id: string) => availableGames.find((g: Game) => g.id === id)).filter(Boolean) as Game[],
    [pool, availableGames]
  );

  // Spiele die noch hinzufügbar sind (nicht im Pool)
  const unselectedGames = useMemo(
    () => availableGames.filter((g: Game) => !pool.includes(g.id)),
    [availableGames, pool]
  );

  // Quick-Stats berechnen
  const quickStats = useMemo(() => {
    if (poolGames.length === 0) {
      return {
        avgDuration: 0,
        avgComplexity: "N/A",
        chaosPotential: 0,
        tagBreakdown: [] as { tag: string; count: number; pct: number }[],
      };
    }

    const avgDurationMin = poolGames.reduce((sum: number, g: Game) => sum + (g.avgDurationMin ?? 20), 0) / poolGames.length;

    const complexityScores: Record<string, number> = { casual: 1, medium: 2, hardcore: 3 };
    const avgComplexityScore = poolGames.reduce((sum: number, g: Game) => sum + (complexityScores[g.complexity] ?? 2), 0) / poolGames.length;
    const complexityLabel = avgComplexityScore < 1.7 ? "Casual" : avgComplexityScore < 2.3 ? "Medium" : "Hardcore";

    const chaosPotential = poolGames.reduce((sum: number, g: Game) => sum + (g.chaosPotential ?? 50), 0) / poolGames.length;

    // Tag-Breakdown
    const tagCounts: Record<string, number> = {};
    poolGames.forEach((g: Game) => {
      tagCounts[g.tag] = (tagCounts[g.tag] ?? 0) + 1;
    });
    const tagBreakdown = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count, pct: Math.round((count / poolGames.length) * 100) }))
      .sort((a, b) => b.count - a.count);

    return {
      avgDuration: Math.round(avgDurationMin),
      avgComplexity: complexityLabel,
      chaosPotential: Math.round(chaosPotential),
      tagBreakdown,
    };
  }, [poolGames]);

  const isValidPool = pool.length >= minPool && pool.length <= maxPool;
  const isFull = pool.length >= maxPool;

  // Drag Handlers
  function handleDragStart(e: React.DragEvent<HTMLDivElement>, gameId: string, source: "available" | "pool") {
    setDraggedItem({ type: "game", gameId, source });
    e.dataTransfer!.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";
  }

  function handleDropOnPool(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDropHighlight(null);

    if (!draggedItem || draggedItem.type !== "game") return;

    // Aus Available zu Pool: nur wenn nicht voll
    if (draggedItem.source === "available" && !isFull) {
      setPool((p: string[]) => [...p, draggedItem.gameId]);
      setDraggedItem(null);
    }
    // Reordering im Pool
    else if (draggedItem.source === "pool" && draggedItem.gameId !== draggedItem.gameId) {
      // Reordering wird über einzelne Drop-Zonen gehandhabt
      setDraggedItem(null);
    }
  }

  function handleDropOnAvailable(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDropHighlight(null);

    if (!draggedItem || draggedItem.type !== "game" || draggedItem.source !== "pool") return;

    setPool((p: string[]) => p.filter((id: string) => id !== draggedItem.gameId));
    setDraggedItem(null);
  }

  // Actions
  async function startVoting(mode: "MULTI" | "ELIMINATION" = "MULTI") {
    if (!isValidPool) {
      alert(`Pool muss zwischen ${minPool} und ${maxPool} Spiele haben.`);
      return;
    }

    setBusy(true);
    try {
      await post("/admin/voting/start", {
        mode,
        pool,
        timerSec: state.config.votingTimerSec ?? 120,
      });
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function clearPool() {
    setPool([]);
  }

  function shufflePool() {
    setPool((p: string[]) => [...p].sort(() => Math.random() - 0.5));
  }

  function applyPreset(preset: "balanced" | "chaotic" | "fps-heavy") {
    const sorted = [...availableGames].sort((a: Game, b: Game) => {
      if (preset === "balanced") {
        // Ausgewogen: Mix aus allen Komplexitäten
        const complexityScores: Record<string, number> = { casual: 1, medium: 2, hardcore: 3 };
        const scoreA = complexityScores[a.complexity] ?? 2;
        const scoreB = complexityScores[b.complexity] ?? 2;
        return Math.abs(1.5 - scoreA) - Math.abs(1.5 - scoreB);
      } else if (preset === "chaotic") {
        // Chaotisch: höchster chaosPotential zuerst
        return (b.chaosPotential ?? 50) - (a.chaosPotential ?? 50);
      } else {
        // FPS-Heavy: FPS-Spiele zuerst
        return (a.tag === "FPS" ? -1 : 1) - (b.tag === "FPS" ? -1 : 1);
      }
    });

    const newPool = sorted.slice(0, maxPool).map((g: Game) => g.id);
    setPool(newPool);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* 2-Column Layout: Available | Pool */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* LEFT: Available Games */}
        <Card title="Verfügbare Spiele" accent="var(--cyan)">
          <div
            onDragOver={handleDragOver}
            onDragLeave={() => setDropHighlight(null)}
            onDrop={handleDropOnAvailable}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 8,
              maxHeight: 400,
              overflowY: "auto",
              padding: 8,
              borderRadius: 4,
              background: dropHighlight === "available" ? "rgba(0, 229, 255, 0.05)" : "transparent",
              border: `1px dashed ${dropHighlight === "available" ? "var(--cyan)" : "transparent"}`,
              transition: "all 0.15s",
            }}
          >
            {unselectedGames.length === 0 && (
              <div style={{ color: "var(--muted)", fontSize: 13, padding: 16, textAlign: "center" }}>
                {availableGames.length === 0
                  ? "Keine Spiele im aktiven Pool verfügbar."
                  : "Alle Spiele sind im Pool."}
              </div>
            )}
            {unselectedGames.map((g: Game) => (
              <GameCard
                key={g.id}
                game={g}
                draggable
                onDragStart={(e: React.DragEvent<HTMLDivElement>) => handleDragStart(e, g.id, "available")}
                isDragging={draggedItem?.gameId === g.id}
              />
            ))}
          </div>
        </Card>

        {/* RIGHT: Current Pool */}
        <Card title={`Voting Pool (${pool.length}/${maxPool})`} accent="var(--neon)">
          <div
            onDragOver={handleDragOver}
            onDragLeave={() => setDropHighlight(null)}
            onDrop={handleDropOnPool}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 8,
              maxHeight: 400,
              overflowY: "auto",
              padding: 8,
              borderRadius: 4,
              background:
                dropHighlight === "pool" || isFull
                  ? isFull
                    ? "rgba(255, 45, 107, 0.05)"
                    : "rgba(57, 255, 110, 0.05)"
                  : "transparent",
              border: `1px dashed ${
                dropHighlight === "pool"
                  ? "var(--neon)"
                  : isFull
                    ? "var(--magenta)"
                    : "transparent"
              }`,
              transition: "all 0.15s",
              opacity: isFull && draggedItem?.source === "available" ? 0.6 : 1,
            }}
          >
            {pool.length === 0 && (
              <div style={{ color: "var(--muted)", fontSize: 13, padding: 16, textAlign: "center" }}>
                Ziehe Spiele hierher um Pool zu füllen ({minPool}–{maxPool})
              </div>
            )}
            {poolGames.map((g: Game, idx: number) => (
              <div
                key={g.id}
                draggable
                onDragStart={(e: React.DragEvent<HTMLDivElement>) => handleDragStart(e, g.id, "pool")}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "var(--bg3)",
                  border: `1px solid var(--border)`,
                  borderRadius: 4,
                  cursor: "grab",
                  opacity: draggedItem?.gameId === g.id ? 0.5 : 1,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 16, color: "var(--muted)", flexShrink: 0 }}>≡</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {idx + 1}. {g.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 6, marginTop: 2 }}>
                    <span>{g.avgDurationMin ?? 20} min</span>
                    <span>{g.complexity}</span>
                    <span>suitability: {g.tournamentSuitability}%</span>
                  </div>
                </div>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: g.color,
                    flexShrink: 0,
                    boxShadow: `0 0 4px ${g.color}`,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Pool Actions */}
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            <NeonButton
              variant="secondary"
              onClick={clearPool}
              disabled={pool.length === 0}
              style={{ fontSize: 12, padding: "6px 12px" }}
            >
              Pool Löschen
            </NeonButton>
            <NeonButton
              variant="secondary"
              onClick={shufflePool}
              disabled={pool.length === 0}
              style={{ fontSize: 12, padding: "6px 12px" }}
            >
              Mischen 🔄
            </NeonButton>
          </div>
        </Card>
      </div>

      {/* Preset-Pools */}
      <Card title="Quick-Presets" accent="var(--amber)">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <NeonButton
            variant="amber"
            onClick={() => applyPreset("balanced")}
            disabled={availableGames.length < minPool}
            style={{ fontSize: 12, padding: "6px 12px" }}
          >
            Ausgewogen
          </NeonButton>
          <NeonButton
            variant="amber"
            onClick={() => applyPreset("chaotic")}
            disabled={availableGames.length < minPool}
            style={{ fontSize: 12, padding: "6px 12px" }}
          >
            Chaotisch
          </NeonButton>
          <NeonButton
            variant="amber"
            onClick={() => applyPreset("fps-heavy")}
            disabled={availableGames.length < minPool}
            style={{ fontSize: 12, padding: "6px 12px" }}
          >
            FPS-Heavy
          </NeonButton>
        </div>
      </Card>

      {/* Quick-Stats */}
      <Card title="Quick-Stats" accent="var(--magenta)">
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
                Durchschnittliche Dauer
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--neon)" }}>
                {quickStats.avgDuration}
                <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 4 }}>min</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
                Durchschn. Komplexität
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--cyan)" }}>
                {quickStats.avgComplexity}
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
              <span>Chaos-Level</span>
              <span style={{ fontWeight: 600 }}>
                {quickStats.chaosPotential > 60 ? "High" : quickStats.chaosPotential > 40 ? "Medium" : "Low"}
              </span>
            </div>
            <NeonBar value={quickStats.chaosPotential} max={100} height={8} color="var(--magenta)" />
          </div>

          {quickStats.tagBreakdown.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
                Entertainment-Mix
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {quickStats.tagBreakdown.map((tb: { tag: string; count: number; pct: number }) => (
                  <Badge key={tb.tag} variant="muted" style={{ fontSize: 11 }}>
                    {tb.tag} {tb.pct}%
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Start Voting Buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <NeonButton
          onClick={() => startVoting("MULTI")}
          disabled={!isValidPool || busy}
          style={{
            flex: 1,
            background: isValidPool ? "var(--neon-dim)" : "var(--bg3)",
            color: isValidPool ? "var(--neon)" : "var(--muted)",
            borderColor: isValidPool ? "var(--neon)" : "var(--border)",
          }}
        >
          Start Voting (Multi)
        </NeonButton>
        <NeonButton
          onClick={() => startVoting("ELIMINATION")}
          disabled={!isValidPool || busy}
          style={{
            flex: 1,
            background: isValidPool ? "var(--neon-dim)" : "var(--bg3)",
            color: isValidPool ? "var(--neon)" : "var(--muted)",
            borderColor: isValidPool ? "var(--neon)" : "var(--border)",
          }}
        >
          Start Voting (Elimination)
        </NeonButton>
      </div>

      {!isValidPool && pool.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--magenta)", padding: 8, background: "#ff2d6b11", borderRadius: 4 }}>
          Pool benötigt {minPool}–{maxPool} Spiele. Derzeit: {pool.length}
        </div>
      )}
    </div>
  );
}

// GameCard Komponente
interface GameCardProps {
  game: Game;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
}

function GameCard({ game, draggable, onDragStart, isDragging }: GameCardProps) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        padding: "10px 12px",
        background: isDragging ? "rgba(57, 255, 110, 0.08)" : "var(--bg3)",
        border: `1px solid ${isDragging ? "var(--neon)" : "var(--border)"}`,
        borderRadius: 4,
        cursor: draggable ? "grab" : "default",
        opacity: isDragging ? 0.6 : 1,
        transition: "all 0.15s",
        userSelect: "none",
      }}
    >
      {draggable && <span style={{ fontSize: 14, color: "var(--muted)", flexShrink: 0 }}>≡</span>}
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: game.color,
          flexShrink: 0,
          boxShadow: `0 0 6px ${game.color}`,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
          {game.title}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
          {game.tag}
        </div>
      </div>
      {!draggable && (
        <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "right", flexShrink: 0 }}>
          <div>{game.avgDurationMin ?? 20} min</div>
          <div>{game.complexity}</div>
        </div>
      )}
    </div>
  );
}
