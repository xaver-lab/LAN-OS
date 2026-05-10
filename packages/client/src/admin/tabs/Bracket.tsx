// Admin Tab: Bracket Setup — Auto-Generate, Visualisierung, Manual Edit.

import React, { useState } from "react";
import type { SystemState, TournamentBracket, BracketMatch, Game, Player } from "@lan-os/shared";
import {
  Card,
  NeonButton,
  NeonInput,
  NeonSelect,
  Badge,
  ConfirmDialog,
} from "../../design/components/index.js";
import { post, put } from "../../api/client.js";

interface Props {
  state: SystemState;
  reload: () => void;
}

interface EditMatchModalState {
  open: boolean;
  bracketId: string | null;
  roundNum: number;
  matchId: string;
  playerA: string;
  playerB: string;
  gameId: string;
}

export function Bracket({ state, reload }: Props) {
  const [busy, setBusy] = useState(false);
  const [timeBudgetMin, setTimeBudgetMin] = useState("120");
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "casual" | "medium" | "hardcore">("all");
  const [editModal, setEditModal] = useState<EditMatchModalState>({
    open: false,
    bracketId: null,
    roundNum: 0,
    matchId: "",
    playerA: "",
    playerB: "",
    gameId: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; matchId: string }>({
    open: false,
    matchId: "",
  });

  const bracket = state.tournament;
  const activePlayers = state.players.filter((p) => p.role === "Spieler" && p.activeTracks.includes("TOURNAMENT"));
  const availableGames = state.games.filter((g) => g.inActivePool);

  async function generateBracket() {
    setBusy(true);
    try {
      await post("/admin/tournament/bracket/generate", {
        timeBudgetMin: Number(timeBudgetMin),
        difficultyFilter,
      });
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function openEditModal(bracketId: string, roundNum: number, match: BracketMatch) {
    setEditModal({
      open: true,
      bracketId,
      roundNum,
      matchId: match.id,
      playerA: match.playerA,
      playerB: match.playerB,
      gameId: match.gameId,
    });
  }

  function closeEditModal() {
    setEditModal((s) => ({ ...s, open: false }));
  }

  async function saveEditedMatch() {
    if (!editModal.bracketId) return;
    setBusy(true);
    try {
      await put(`/admin/tournament/bracket/${editModal.bracketId}/match/${editModal.matchId}`, {
        playerA: editModal.playerA,
        playerB: editModal.playerB,
        gameId: editModal.gameId,
      });
      reload();
      closeEditModal();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteMatch() {
    if (!editModal.bracketId) return;
    setBusy(true);
    try {
      await post(`/admin/tournament/bracket/${editModal.bracketId}/match/${deleteConfirm.matchId}/delete`);
      reload();
      closeEditModal();
      setDeleteConfirm({ open: false, matchId: "" });
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 1200 }}>
      {/* Generation Controls */}
      <Card title="Bracket Generation" accent="var(--neon)">
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
                TIME BUDGET (MIN)
              </label>
              <NeonInput
                value={timeBudgetMin}
                onChange={setTimeBudgetMin}
                type="number"
                placeholder="120"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
                DIFFICULTY FILTER
              </label>
              <NeonSelect
                value={difficultyFilter}
                onChange={(v) => setDifficultyFilter(v as any)}
                options={[
                  { value: "all", label: "All" },
                  { value: "casual", label: "Casual" },
                  { value: "medium", label: "Medium" },
                  { value: "hardcore", label: "Hardcore" },
                ]}
              />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12, color: "var(--muted)" }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Players:</div>
              <div>{activePlayers.length} aktive Spieler</div>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Games:</div>
              <div>{availableGames.length} verfügbare Spiele</div>
            </div>
          </div>
          <NeonButton
            onClick={generateBracket}
            disabled={busy || activePlayers.length < 2}
            fullWidth
            style={{ marginTop: 8 }}
          >
            {busy ? "Generating..." : "Auto-Generate Bracket"}
          </NeonButton>
        </div>
      </Card>

      {/* Bracket Visualization */}
      {bracket ? (
        <BracketVisualization
          bracket={bracket}
          state={state}
          onEditMatch={openEditModal}
        />
      ) : (
        <Card title="Status" accent="var(--border)">
          <div style={{ color: "var(--muted)", textAlign: "center", padding: "20px 10px" }}>
            No bracket generated yet. Use the generation controls above.
          </div>
        </Card>
      )}

      {/* Edit Modal */}
      <EditMatchModal
        open={editModal.open}
        editModal={editModal}
        setEditModal={setEditModal}
        players={state.players}
        games={availableGames}
        onSave={saveEditedMatch}
        onDelete={() => setDeleteConfirm({ open: true, matchId: editModal.matchId })}
        onClose={closeEditModal}
        busy={busy}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Match"
        message="Are you sure you want to delete this match from the bracket?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        dangerous
        onConfirm={deleteMatch}
        onCancel={() => setDeleteConfirm({ open: false, matchId: "" })}
      />
    </div>
  );
}

function BracketVisualization({
  bracket,
  state,
  onEditMatch,
}: {
  bracket: TournamentBracket;
  state: SystemState;
  onEditMatch: (bracketId: string, roundNum: number, match: BracketMatch) => void;
}) {
  return (
    <Card title={`Bracket (${bracket.status})`} accent="var(--cyan)">
      <div style={{ display: "grid", gap: 16 }}>
        {/* Bracket Info */}
        <div style={{ display: "flex", gap: 12, fontSize: 13, color: "var(--muted)" }}>
          <div>
            <span style={{ fontWeight: 600 }}>Status:</span> {bracket.status}
          </div>
          <div>
            <span style={{ fontWeight: 600 }}>Created:</span>{" "}
            {new Date(bracket.createdAt).toLocaleString()}
          </div>
          {bracket.createdBy && (
            <div>
              <span style={{ fontWeight: 600 }}>By:</span> {bracket.createdBy}
            </div>
          )}
        </div>

        {/* Rounds Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`,
            gap: 16,
          }}
        >
          {bracket.rounds.map((round) => (
            <RoundCard
              key={round.roundNum}
              round={round}
              bracket={bracket}
              state={state}
              onEditMatch={onEditMatch}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

function RoundCard({
  round,
  bracket,
  state,
  onEditMatch,
}: {
  round: any; // BracketRound
  bracket: TournamentBracket;
  state: SystemState;
  onEditMatch: (bracketId: string, roundNum: number, match: any) => void;
}) {
  return (
    <div
      style={{
        background: "var(--bg3)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          background: "var(--bg2)",
          borderBottom: "1px solid var(--border)",
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--cyan)",
        }}
      >
        Round {round.roundNum} ({round.matches.length} matches)
      </div>
      <div style={{ padding: 12, display: "grid", gap: 10 }}>
        {round.matches.map((match: BracketMatch) => (
          <MatchCard
            key={match.id}
            match={match}
            bracket={bracket}
            roundNum={round.roundNum}
            state={state}
            onEdit={() => onEditMatch(bracket.id, round.roundNum, match)}
          />
        ))}
      </div>
    </div>
  );
}

function MatchCard({
  match,
  bracket,
  roundNum,
  state,
  onEdit,
}: {
  match: BracketMatch;
  bracket: TournamentBracket;
  roundNum: number;
  state: SystemState;
  onEdit: () => void;
}) {
  const playerA = state.players.find((p) => p.id === match.playerA);
  const playerB = state.players.find((p) => p.id === match.playerB);
  const game = state.games.find((g) => g.id === match.gameId);

  const statusColors: Record<string, string> = {
    pending: "var(--amber)",
    active: "var(--magenta)",
    done: "var(--neon)",
  };

  const statusBgColors: Record<string, string> = {
    pending: "#ffb83018",
    active: "#ff2d6b18",
    done: "var(--neon-dim)",
  };

  return (
    <button
      onClick={onEdit}
      style={{
        background: statusBgColors[match.status] || "var(--bg2)",
        border: `1px solid ${statusColors[match.status] || "var(--border)"}`,
        borderRadius: 4,
        padding: "10px 12px",
        textAlign: "left",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 8px ${statusColors[match.status] || "transparent"}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Badge variant={match.status as any}>{match.status.toUpperCase()}</Badge>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>ID: {match.id.slice(0, 8)}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        <span style={{ color: playerA?.color || "var(--text)" }}>{playerA?.name || match.playerA}</span>
        <span style={{ color: "var(--muted)", margin: "0 6px" }}>vs</span>
        <span style={{ color: playerB?.color || "var(--text)" }}>{playerB?.name || match.playerB}</span>
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>
        {game?.title || match.gameId}
      </div>
    </button>
  );
}

function EditMatchModal({
  open,
  editModal,
  setEditModal,
  players,
  games,
  onSave,
  onDelete,
  onClose,
  busy,
}: {
  open: boolean;
  editModal: EditMatchModalState;
  setEditModal: React.Dispatch<React.SetStateAction<EditMatchModalState>>;
  players: Player[];
  games: Game[];
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
  busy: boolean;
}) {
  if (!open) return null;

  const allPlayers = players.filter((p) => p.role === "Spieler");
  const playerOptions = allPlayers.map((p) => ({ value: p.id, label: p.name }));
  const gameOptions = games.map((g) => ({ value: g.id, label: g.title }));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8,10,20,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 28,
          maxWidth: 520,
          width: "90%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          animation: "fadeIn 0.2s ease",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: 18,
          }}
        >
          Edit Match — Round {editModal.roundNum}
        </div>

        <div style={{ display: "grid", gap: 14, marginBottom: 24 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
              PLAYER A
            </label>
            <NeonSelect
              value={editModal.playerA}
              onChange={(v) => setEditModal((s) => ({ ...s, playerA: v }))}
              options={playerOptions}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
              PLAYER B
            </label>
            <NeonSelect
              value={editModal.playerB}
              onChange={(v) => setEditModal((s) => ({ ...s, playerB: v }))}
              options={playerOptions}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
              GAME
            </label>
            <NeonSelect
              value={editModal.gameId}
              onChange={(v) => setEditModal((s) => ({ ...s, gameId: v }))}
              options={gameOptions}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
          <NeonButton
            variant="danger"
            onClick={onDelete}
            disabled={busy}
            style={{ fontSize: 12, padding: "5px 12px" }}
          >
            Delete Match
          </NeonButton>
          <div style={{ display: "flex", gap: 10 }}>
            <NeonButton variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </NeonButton>
            <NeonButton variant="primary" onClick={onSave} disabled={busy}>
              Save
            </NeonButton>
          </div>
        </div>
      </div>
    </div>
  );
}
