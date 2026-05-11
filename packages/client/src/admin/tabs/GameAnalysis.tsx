// Admin Tab: Game Analysis — AI Game-Analysis UI mit Auto-Tagging, Game-Library, Pool-Management

import React, { useState, useMemo } from "react";
import type { SystemState, Game, GameTag, GameComplexity } from "@lan-os/shared";
import {
  Card,
  NeonButton,
  Badge,
  NeonBar,
  Tabs,
} from "../../design/components/index.js";
import { post } from "../../api/client.js";

interface Props {
  state: SystemState;
  reload: () => void;
}

type FilterTab = "all" | "analyzed" | "unanalyzed";
type SortOption = "name" | "suitability" | "complexity";

const TAG_COLORS: Record<GameTag, string> = {
  FPS: "#ff2d6b",
  Sport: "#00e5ff",
  Tactical: "#ffa500",
  RTS: "#ffb830",
  Sandbox: "#7fff00",
  BattleRoyale: "#ff1493",
  Coop: "#00ff7f",
  Arena: "#ffff00",
  Party: "#ff69b4",
  Survival: "#8b4513",
  Strategy: "#6495ed",
  Competitive: "#dc143c",
};

const COMPLEXITY_ORDER: Record<GameComplexity, number> = {
  casual: 1,
  medium: 2,
  hardcore: 3,
};

export function GameAnalysis({ state, reload }: Props) {
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  // Filter games
  const filteredGames = useMemo(() => {
    return state.games.filter((g) => {
      if (filterTab === "analyzed") return g.aiAnalyzed;
      if (filterTab === "unanalyzed") return !g.aiAnalyzed;
      return true;
    });
  }, [state.games, filterTab]);

  // Sort games
  const sortedGames = useMemo(() => {
    const copy = [...filteredGames];
    copy.sort((a, b) => {
      if (sortBy === "name") return a.title.localeCompare(b.title);
      if (sortBy === "suitability")
        return b.tournamentSuitability - a.tournamentSuitability;
      if (sortBy === "complexity")
        return COMPLEXITY_ORDER[b.complexity] - COMPLEXITY_ORDER[a.complexity];
      return 0;
    });
    return copy;
  }, [filteredGames, sortBy]);

  const unanalyzedCount = state.games.filter((g) => !g.aiAnalyzed).length;

  async function analyzeGame(gameId: string) {
    setAnalyzing(gameId);
    try {
      await post(`/admin/games/${gameId}/reanalyze`, {});
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(null);
    }
  }

  async function analyzeAllUnanalyzed() {
    setAnalyzing("bulk");
    try {
      for (const game of state.games.filter((g) => !g.aiAnalyzed)) {
        await post(`/admin/games/${game.id}/reanalyze`, {});
      }
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(null);
    }
  }

  async function toggleInActivePool(gameId: string, inPool: boolean) {
    try {
      await post(`/admin/games/${gameId}/pool`, { inActivePool: !inPool });
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  const openModal = (game: Game) => {
    setSelectedGame(game);
    setShowModal(true);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header + Actions */}
      <Card title="Game Analysis" accent="var(--neon)">
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 14, color: "var(--muted)" }}>
              {unanalyzedCount} unanalyzed
            </span>
            <NeonButton
              variant={unanalyzedCount > 0 ? "primary" : "ghost"}
              onClick={analyzeAllUnanalyzed}
              disabled={analyzing !== null || unanalyzedCount === 0}
              style={{ padding: "6px 16px", fontSize: 13 }}
            >
              {analyzing === "bulk" ? "Analyzing..." : "Analyze All Unanalyzed"}
            </NeonButton>
          </div>
        </div>
      </Card>

      {/* Filter & Sort */}
      <Card>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--muted)",
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Filter
            </label>
            <Tabs
              tabs={[
                { id: "all", label: "All" },
                { id: "analyzed", label: "Analyzed" },
                { id: "unanalyzed", label: "Unanalyzed" },
              ]}
              active={filterTab}
              onSelect={(id) => setFilterTab(id as FilterTab)}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--muted)",
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                background: "var(--bg3)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                color: "var(--text)",
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 13,
                padding: "6px 10px",
                width: "100%",
                cursor: "pointer",
              }}
            >
              <option value="name">Name (A-Z)</option>
              <option value="suitability">Suitability (High-Low)</option>
              <option value="complexity">Complexity (Hard-Easy)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Games Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 12,
        }}
      >
        {sortedGames.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            analyzing={analyzing === game.id}
            onAnalyze={() => analyzeGame(game.id)}
            onTogglePool={() => toggleInActivePool(game.id, game.inActivePool)}
            onOpenModal={() => openModal(game)}
          />
        ))}
      </div>

      {/* Modal */}
      {showModal && selectedGame && (
        <GameModal
          game={selectedGame}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

interface GameCardProps {
  game: Game;
  analyzing: boolean;
  onAnalyze: () => void;
  onTogglePool: () => void;
  onOpenModal: () => void;
}

function GameCard({
  game,
  analyzing,
  onAnalyze,
  onTogglePool,
  onOpenModal,
}: GameCardProps) {
  const tagColor = TAG_COLORS[game.tag] || "var(--muted)";

  return (
    <div
      style={{
        background: "var(--bg2)",
        border: `1px solid ${game.inActivePool ? "var(--neon)" : "var(--border)"}`,
        borderRadius: 8,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: game.inActivePool ? "0 0 12px var(--neon)22" : "none",
      }}
      onClick={onOpenModal}
      onMouseEnter={(e) => {
        if (e.currentTarget) {
          e.currentTarget.style.borderColor = "var(--neon)";
          e.currentTarget.style.boxShadow = "0 0 12px var(--neon)22";
        }
      }}
      onMouseLeave={(e) => {
        if (e.currentTarget) {
          e.currentTarget.style.borderColor = game.inActivePool
            ? "var(--neon)"
            : "var(--border)";
          e.currentTarget.style.boxShadow = game.inActivePool
            ? "0 0 12px var(--neon)22"
            : "none";
        }
      }}
    >
      {/* Title + Tag Badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: 4,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {game.title}
          </div>
          <Badge variant="neon" style={{ background: `${tagColor}22`, color: tagColor, borderColor: tagColor }}>
            {game.tag}
          </Badge>
        </div>
        {game.aiAnalyzed && (
          <span style={{ fontSize: 12, color: "var(--neon)", fontWeight: 700 }}>
            ✓
          </span>
        )}
      </div>

      {/* Analysis Status Indicator */}
      {!game.aiAnalyzed && (
        <div
          style={{
            padding: "6px 10px",
            background: "#ffb83011",
            border: "1px solid var(--amber)",
            borderRadius: 4,
            fontSize: 11,
            color: "var(--amber)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Not Analyzed
        </div>
      )}

      {/* Game Info (if analyzed) */}
      {game.aiAnalyzed && (
        <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
          {/* Duration & Players */}
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ color: "var(--muted)" }}>
              <span style={{ color: "var(--text)" }}>
                {game.avgDurationMin || "?"}
              </span>{" "}
              min
            </div>
            {game.recommendedPlayers && (
              <div style={{ color: "var(--muted)" }}>
                <span style={{ color: "var(--text)" }}>
                  {game.recommendedPlayers.min}-{game.recommendedPlayers.max}
                </span>{" "}
                players
              </div>
            )}
          </div>

          {/* Complexity Badge */}
          <div>
            <Badge variant="muted">
              {game.complexity === "casual"
                ? "🎮 Casual"
                : game.complexity === "medium"
                  ? "⚔️ Medium"
                  : "🔥 Hardcore"}
            </Badge>
          </div>

          {/* Suitability Score */}
          <div>
            <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
                marginBottom: 4,
              }}
            >
              Suitability: {game.tournamentSuitability}/100
            </div>
            <NeonBar value={game.tournamentSuitability} max={100} height={5} />
          </div>

          {/* Chaos Score */}
          <div>
            <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
                marginBottom: 4,
              }}
            >
              Chaos: {game.chaosPotential}/100
            </div>
            <NeonBar
              value={game.chaosPotential}
              max={100}
              color="var(--magenta)"
              height={5}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, flexDirection: "column" }}>
        {!game.aiAnalyzed && (
          <NeonButton
            variant="primary"
            onClick={() => {
              onAnalyze();
            }}
            disabled={analyzing}
            style={{ fontSize: 12, padding: "6px 10px" }}
          >
            {analyzing ? "..." : "Analyze"}
          </NeonButton>
        )}

        {/* Pool Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePool();
          }}
          style={{
            padding: "6px 10px",
            background: game.inActivePool ? "var(--neon-dim)" : "var(--bg3)",
            color: game.inActivePool ? "var(--neon)" : "var(--muted)",
            border: `1px solid ${game.inActivePool ? "var(--neon)" : "var(--border)"}`,
            borderRadius: 4,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {game.inActivePool ? "✓ In Pool" : "Add to Pool"}
        </button>
      </div>
    </div>
  );
}

interface GameModalProps {
  game: Game;
  onClose: () => void;
}

function GameModal({ game, onClose }: GameModalProps) {
  const tagColor = TAG_COLORS[game.tag] || "var(--muted)";

  async function copyToClipboard() {
    const text = `
${game.title}
Tag: ${game.tag}
Duration: ${game.avgDurationMin || "?"} min
Players: ${game.recommendedPlayers ? `${game.recommendedPlayers.min}-${game.recommendedPlayers.max}` : "?"}
Complexity: ${game.complexity}
Modes: ${game.suitableModes.join(", ")}
Suitability: ${game.tournamentSuitability}/100
Chaos: ${game.chaosPotential}/100
`.trim();
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <Card
        style={{
          maxWidth: 500,
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: `0 0 30px ${tagColor}44`,
        }}
      >
        <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: `1px solid var(--border)`,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text)",
                margin: 0,
                marginBottom: 8,
              }}
            >
              {game.title}
            </h2>
            <Badge variant="neon" style={{ background: `${tagColor}22`, color: tagColor, borderColor: tagColor }}>
              {game.tag}
            </Badge>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              fontSize: 20,
              cursor: "pointer",
              padding: "0px 4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* Duration & Players */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
                DURATION
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                {game.avgDurationMin || "?"} min
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
                PLAYERS
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                {game.recommendedPlayers
                  ? `${game.recommendedPlayers.min}-${game.recommendedPlayers.max}`
                  : "?"}
              </div>
            </div>
          </div>

          {/* Complexity */}
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
              COMPLEXITY
            </div>
            <Badge variant="muted">
              {game.complexity === "casual"
                ? "🎮 Casual"
                : game.complexity === "medium"
                  ? "⚔️ Medium"
                  : "🔥 Hardcore"}
            </Badge>
          </div>

          {/* Modes */}
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
              SUITABLE MODES
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {game.suitableModes.map((mode) => (
                <Badge key={mode} variant="cyan">
                  {mode}
                </Badge>
              ))}
            </div>
          </div>

          {/* Scores */}
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                TOURNAMENT SUITABILITY: {game.tournamentSuitability}/100
              </div>
              <NeonBar value={game.tournamentSuitability} max={100} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                CHAOS POTENTIAL: {game.chaosPotential}/100
              </div>
              <NeonBar
                value={game.chaosPotential}
                max={100}
                color="var(--magenta)"
              />
            </div>
          </div>

          {/* Analysis Status */}
          <div
            style={{
              padding: 10,
              background: game.aiAnalyzed
                ? "var(--neon-dim)"
                : "#ffb83011",
              border: `1px solid ${game.aiAnalyzed ? "var(--neon)" : "var(--amber)"}`,
              borderRadius: 4,
              fontSize: 12,
              color: game.aiAnalyzed ? "var(--neon)" : "var(--amber)",
              fontFamily: "'JetBrains Mono', monospace",
              textAlign: "center",
            }}
          >
            {game.aiAnalyzed ? "✓ AI Analyzed" : "⚠ Not Analyzed"}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <NeonButton
            variant="secondary"
            onClick={copyToClipboard}
            style={{ flex: 1, fontSize: 13, padding: "8px 12px" }}
          >
            Copy Details
          </NeonButton>
          <NeonButton
            onClick={onClose}
            style={{ flex: 1, fontSize: 13, padding: "8px 12px" }}
          >
            Close
          </NeonButton>
        </div>
        </div>
      </Card>
    </div>
  );
}
