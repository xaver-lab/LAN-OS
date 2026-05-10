// Admin-Aktionen — alle Capabilities aus README §16.
// Kein Auth-Layer im MVP (LAN-only, lokal); kann später ergänzt werden.

import { Router } from "express";
import {
  addGlobalGoal,
  addSoulmaskCustomRole,
  addSoulmaskTask,
  analyzeMatchResults,
  assignSoulmaskRole,
  cancelVoting,
  confirmMatch,
  createEmptyState,
  deletePlayer,
  endSoulmask,
  endVoting,
  finishSpin,
  overrideMatchScores,
  pauseSoulmask,
  removeGlobalGoal,
  removeSoulmaskCustomRole,
  removeSoulmaskTask,
  resolveTieBreak,
  resumeSoulmask,
  setGoalProgress,
  setMatchModifiers,
  setMatchMvp,
  setTrackActive,
  setupMatch,
  skipRound,
  startMatch,
  startSoulmask,
  startSpin,
  startVoting,
  submitScores,
  submitVote,
  TransitionError,
  type Game,
  type Modifier,
  type SystemState,
  type WheelVariant,
} from "@lan-os/shared";
import { analyzeGame } from "../ai-analyze.js";
import { manualAddPlayer, kickPlayer } from "../auth.js";
import {
  deleteCheckpoint,
  listCheckpointFiles,
  readCheckpoint,
  writeCheckpoint,
} from "../persistence.js";
import { getContainer, makeFreshSimState } from "../state.js";
import { generateBracketFromState } from "../bracket-planner.js";
import {
  generateScoringRules,
  type GenerateScoringRulesInput,
} from "../scoring-rules.js";

export const adminRouter = Router();

function handleErr(res: import("express").Response, err: unknown): void {
  if (err instanceof TransitionError) {
    res.status(400).json({ error: err.message });
    return;
  }
  res
    .status(500)
    .json({ error: err instanceof Error ? err.message : String(err) });
}

/* ───────────── Übersicht: Track-Toggles + UI-Prefs ───────────── */

adminRouter.post("/track/:track", async (req, res) => {
  try {
    const c = getContainer();
    const track = req.params["track"]!;
    if (track !== "TOURNAMENT" && track !== "SOULMASK") {
      res.status(400).json({ error: "Unknown track." });
      return;
    }
    const { active } = req.body ?? {};
    await c.mutate((s) => setTrackActive(s, track, Boolean(active)), {
      log: {
        type: "admin-action",
        payload: { actionType: "track-toggle", track, active },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/ui-prefs", async (req, res) => {
  try {
    const c = getContainer();
    const { tvTheme, wheelVariant } = req.body ?? {};
    await c.mutate(
      (s) => ({
        ...s,
        uiPreferences: {
          ...s.uiPreferences,
          tvTheme: tvTheme ?? s.uiPreferences.tvTheme,
          wheelVariant: wheelVariant ?? s.uiPreferences.wheelVariant,
        },
      }),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "ui-prefs", tvTheme, wheelVariant },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/config", async (req, res) => {
  try {
    const c = getContainer();
    const patch = req.body ?? {};
    await c.mutate(
      (s) => ({ ...s, config: { ...s.config, ...patch } }),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "config-update", patch },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

/* ───────────── Spieler ───────────── */

adminRouter.post("/players", async (req, res) => {
  try {
    const c = getContainer();
    const { name, color, role } = req.body ?? {};
    let createdId = "";
    await c.mutate(
      (s) => {
        const result = manualAddPlayer(s, { name, color, role }, Date.now());
        createdId = result.player.id;
        return result.state;
      },
      {
        log: {
          type: "admin-action",
          payload: { actionType: "player-manual-add", name },
        },
      },
    );
    res.json({ ok: true, playerId: createdId });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.patch("/players/:id", async (req, res) => {
  try {
    const c = getContainer();
    const id = req.params["id"]!;
    const patch = req.body ?? {};
    await c.mutate(
      (s) => ({
        ...s,
        players: s.players.map((p) => {
          if (p.id !== id) return p;
          return {
            ...p,
            name: patch.name ?? p.name,
            color: patch.color ?? p.color,
            role: patch.role ?? p.role,
            activeTracks: patch.activeTracks ?? p.activeTracks,
          };
        }),
      }),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "player-edit", playerId: id, patch },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/players/:id/warn", async (req, res) => {
  try {
    const c = getContainer();
    const id = req.params["id"]!;
    await c.mutate(
      (s) => ({
        ...s,
        players: s.players.map((p) =>
          p.id === id ? { ...p, warnings: p.warnings + 1 } : p,
        ),
      }),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "player-warn", playerId: id },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/players/:id/reset-points", async (req, res) => {
  try {
    const c = getContainer();
    const id = req.params["id"]!;
    await c.mutate(
      (s) => ({
        ...s,
        players: s.players.map((p) =>
          p.id === id
            ? {
                ...p,
                points: 0,
                streak: { current: 0, best: 0, lastBonusAt: 0 },
              }
            : p,
        ),
      }),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "player-reset-points", playerId: id },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/players/:id/kick", async (req, res) => {
  try {
    const c = getContainer();
    const id = req.params["id"]!;
    await c.mutate((s) => kickPlayer(s, id), {
      log: {
        type: "player-leave",
        payload: { playerId: id, reason: "admin-kick" },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.delete("/players/:id", async (req, res) => {
  try {
    const c = getContainer();
    const id = req.params["id"]!;
    await c.mutate((s) => deletePlayer(s, id), {
      log: {
        type: "player-leave",
        payload: { playerId: id, reason: "admin-delete" },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

/* ───────────── Voting ───────────── */

adminRouter.post("/voting/start", async (req, res) => {
  try {
    const c = getContainer();
    const { mode, pool, timerSec } = req.body ?? {};
    await c.mutate(
      (s) => startVoting(s, { mode, pool, timerSec }, Date.now()),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "voting-start", mode, pool, timerSec },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/voting/end", async (req, res) => {
  try {
    const c = getContainer();
    await c.mutate((s) => endVoting(s, Date.now()), {
      log: {
        type: "admin-action",
        payload: { actionType: "voting-end" },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/voting/cancel", async (req, res) => {
  try {
    const c = getContainer();
    await c.mutate((s) => cancelVoting(s), {
      log: {
        type: "admin-action",
        payload: { actionType: "voting-cancel" },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/voting/tie-break", async (req, res) => {
  try {
    const c = getContainer();
    const { action, overrideGameId } = req.body ?? {};
    await c.mutate(
      (s) => resolveTieBreak(s, { action, overrideGameId }, Date.now()),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "tie-break", action, overrideGameId },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/voting/admin-vote", async (req, res) => {
  try {
    const c = getContainer();
    const { playerId, gameIds } = req.body ?? {};
    await c.mutate((s) => submitVote(s, playerId, gameIds), {
      log: {
        type: "vote",
        payload: { playerId, gameIds, source: "admin" },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

/* ───────────── Spin ───────────── */

adminRouter.post("/spin/start", async (req, res) => {
  try {
    const c = getContainer();
    const { variant } = req.body ?? {};
    const wheelVariant: WheelVariant =
      variant ?? c.get().uiPreferences.wheelVariant;
    await c.mutate((s) => startSpin(s, wheelVariant, Date.now()), {
      log: {
        type: "admin-action",
        payload: { actionType: "spin-start", variant: wheelVariant },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/spin/finish", async (req, res) => {
  try {
    const c = getContainer();
    const { winnerId } = req.body ?? {};
    await c.mutate((s) => finishSpin(s, winnerId), {
      log: {
        type: "spin",
        payload: {
          candidates: c.get().spinSession?.candidates,
          winnerId,
          wheelVariant: c.get().spinSession?.wheelVariant,
        },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

/* ───────────── Matches ───────────── */

adminRouter.post("/matches/setup", async (req, res) => {
  try {
    const c = getContainer();
    const args = req.body ?? {};
    await c.mutate((s) => setupMatch(s, args), {
      log: {
        type: "admin-action",
        payload: { actionType: "match-setup", args },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/matches/:matchId/start", async (req, res) => {
  try {
    const c = getContainer();
    const matchId = req.params["matchId"]!;
    await c.mutate((s) => startMatch(s, matchId), {
      log: {
        type: "match-start",
        payload: { matchId },
      },
      autoCheckpoint: { label: "pre-match" },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/matches/:matchId/scores", async (req, res) => {
  try {
    const c = getContainer();
    const matchId = req.params["matchId"]!;
    await c.mutate(
      (s) => submitScores(s, { matchId, ...req.body }),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "match-submit-scores", matchId },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/matches/:matchId/mvp", async (req, res) => {
  try {
    const c = getContainer();
    const matchId = req.params["matchId"]!;
    const { mvpPlayerId } = req.body ?? {};
    await c.mutate((s) => setMatchMvp(s, matchId, mvpPlayerId ?? null), {
      log: {
        type: "admin-action",
        payload: { actionType: "match-mvp", matchId, mvpPlayerId },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/matches/:matchId/modifiers", async (req, res) => {
  try {
    const c = getContainer();
    const matchId = req.params["matchId"]!;
    const { modifierIds } = req.body ?? {};
    await c.mutate(
      (s) => setMatchModifiers(s, matchId, modifierIds ?? []),
      {
        log: {
          type: "modifier-set",
          payload: { matchId, modifierIds },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/matches/:matchId/confirm", async (req, res) => {
  try {
    const c = getContainer();
    const matchId = req.params["matchId"]!;
    await c.mutate((s) => confirmMatch(s, matchId, Date.now()), {
      log: {
        type: "match-done",
        payload: { matchId },
      },
      autoCheckpoint: { label: "match-done" },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/matches/:matchId/override", async (req, res) => {
  try {
    const c = getContainer();
    const matchId = req.params["matchId"]!;
    await c.mutate(
      (s) => overrideMatchScores(s, { matchId, ...req.body }, Date.now()),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "match-score-override", matchId },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/matches/:matchId/skip", async (req, res) => {
  try {
    const c = getContainer();
    await c.mutate((s) => skipRound(s), {
      log: {
        type: "admin-action",
        payload: { actionType: "round-skip" },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

/* ───────────── Modifier-Library ───────────── */

adminRouter.post("/modifiers", async (req, res) => {
  try {
    const c = getContainer();
    const mod: Modifier = req.body;
    await c.mutate(
      (s) => ({ ...s, modifiers: [...s.modifiers, mod] }),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "modifier-add", modifierId: mod.id },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.patch("/modifiers/:id", async (req, res) => {
  try {
    const c = getContainer();
    const id = req.params["id"]!;
    const patch = req.body ?? {};
    await c.mutate(
      (s) => ({
        ...s,
        modifiers: s.modifiers.map((m) =>
          m.id === id ? { ...m, ...patch, rules: { ...m.rules, ...(patch.rules ?? {}) } } : m,
        ),
      }),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "modifier-update", modifierId: id, patch },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.delete("/modifiers/:id", async (req, res) => {
  try {
    const c = getContainer();
    const id = req.params["id"]!;
    await c.mutate(
      (s) => ({ ...s, modifiers: s.modifiers.filter((m) => m.id !== id) }),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "modifier-delete", modifierId: id },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

/* ───────────── Soulmask ───────────── */

adminRouter.post("/soulmask/start", async (req, res) => {
  try {
    const c = getContainer();
    await c.mutate((s) => startSoulmask(s, Date.now()), {
      log: {
        type: "admin-action",
        payload: { actionType: "soulmask-start" },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/soulmask/pause", async (req, res) => {
  try {
    const c = getContainer();
    await c.mutate((s) => pauseSoulmask(s), {
      log: {
        type: "admin-action",
        payload: { actionType: "soulmask-pause" },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/soulmask/resume", async (req, res) => {
  try {
    const c = getContainer();
    await c.mutate((s) => resumeSoulmask(s), {
      log: {
        type: "admin-action",
        payload: { actionType: "soulmask-resume" },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/soulmask/end", async (req, res) => {
  try {
    const c = getContainer();
    await c.mutate((s) => endSoulmask(s), {
      log: {
        type: "admin-action",
        payload: { actionType: "soulmask-end" },
      },
      autoCheckpoint: { label: "soulmask-done" },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/soulmask/role", async (req, res) => {
  try {
    const c = getContainer();
    const { playerId, roleId } = req.body ?? {};
    await c.mutate(
      (s) => assignSoulmaskRole(s, playerId, roleId, Date.now()),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "soulmask-assign-role", playerId, roleId },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/soulmask/custom-roles", async (req, res) => {
  try {
    const c = getContainer();
    const { id, label, color, icon } = req.body ?? {};
    await c.mutate(
      (s) => addSoulmaskCustomRole(s, { id, label, color, icon: icon ?? null }),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "soulmask-custom-role-add", id, label },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.delete("/soulmask/custom-roles/:id", async (req, res) => {
  try {
    const c = getContainer();
    const id = req.params["id"]!;
    await c.mutate((s) => removeSoulmaskCustomRole(s, id), {
      log: {
        type: "admin-action",
        payload: { actionType: "soulmask-custom-role-remove", id },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/soulmask/tasks", async (req, res) => {
  try {
    const c = getContainer();
    const { playerId, role, label } = req.body ?? {};
    await c.mutate(
      (s) => addSoulmaskTask(s, { playerId, role, label }, Date.now()),
      {
        log: {
          type: "soulmask-task",
          payload: { playerId, role, label, action: "create" },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.delete("/soulmask/tasks/:id", async (req, res) => {
  try {
    const c = getContainer();
    const id = req.params["id"]!;
    await c.mutate((s) => removeSoulmaskTask(s, id), {
      log: {
        type: "soulmask-task",
        payload: { taskId: id, action: "delete" },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/soulmask/goals", async (req, res) => {
  try {
    const c = getContainer();
    const { label, color } = req.body ?? {};
    await c.mutate((s) => addGlobalGoal(s, { label, color }, Date.now()), {
      log: {
        type: "admin-action",
        payload: { actionType: "soulmask-goal-add", label },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.patch("/soulmask/goals/:id", async (req, res) => {
  try {
    const c = getContainer();
    const id = req.params["id"]!;
    const { progress } = req.body ?? {};
    await c.mutate((s) => setGoalProgress(s, id, Number(progress)), {
      log: {
        type: "admin-action",
        payload: { actionType: "soulmask-goal-progress", id, progress },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.delete("/soulmask/goals/:id", async (req, res) => {
  try {
    const c = getContainer();
    const id = req.params["id"]!;
    await c.mutate((s) => removeGlobalGoal(s, id), {
      log: {
        type: "admin-action",
        payload: { actionType: "soulmask-goal-remove", id },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

/* ───────────── Games / AI ───────────── */

adminRouter.post("/games", async (req, res) => {
  try {
    const c = getContainer();
    const game: Game = {
      id: `g_${Date.now()}`,
      title: req.body.title,
      tag: req.body.tag,
      color: req.body.color ?? "#39ff6e",
      avgDurationMin: null,
      recommendedPlayers: null,
      suitableModes: [],
      complexity: "medium",
      tournamentSuitability: 0,
      chaosPotential: 0,
      aiAnalyzed: false,
      inActivePool: false,
      scoringRules: [],
    };
    await c.mutate(
      (s) => ({ ...s, games: [...s.games, analyzeGame(game)] }),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "game-add", title: game.title },
        },
      },
    );
    res.json({ ok: true, gameId: game.id });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.delete("/games/:id", async (req, res) => {
  try {
    const c = getContainer();
    const id = req.params["id"]!;
    await c.mutate(
      (s) => ({ ...s, games: s.games.filter((g) => g.id !== id) }),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "game-delete", id },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/games/:id/reanalyze", async (req, res) => {
  try {
    const c = getContainer();
    const id = req.params["id"]!;
    await c.mutate(
      (s) => ({
        ...s,
        games: s.games.map((g) => (g.id === id ? analyzeGame(g) : g)),
      }),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "game-reanalyze", id },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/games/:id/pool", async (req, res) => {
  try {
    const c = getContainer();
    const id = req.params["id"]!;
    const { inActivePool } = req.body ?? {};
    await c.mutate(
      (s) => ({
        ...s,
        games: s.games.map((g) =>
          g.id === id ? { ...g, inActivePool: Boolean(inActivePool) } : g,
        ),
      }),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "game-pool", id, inActivePool },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

/* ───────────── System / Persistence ───────────── */

adminRouter.post("/system/checkpoint", async (req, res) => {
  try {
    const c = getContainer();
    const { label } = req.body ?? {};
    const meta = await writeCheckpoint({
      label: label ?? "manual",
      trigger: "manual",
      state: c.get(),
    });
    await c.mutate(
      (s) => ({ ...s, checkpoints: [...s.checkpoints, meta] }),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "checkpoint-create", label: meta.label },
        },
      },
    );
    res.json({ ok: true, checkpoint: meta });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.get("/system/checkpoints", async (_req, res) => {
  try {
    const c = getContainer();
    res.json({ checkpoints: c.get().checkpoints });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/system/restore", async (req, res) => {
  try {
    const c = getContainer();
    const { filename } = req.body ?? {};
    const cp = await readCheckpoint(filename);
    if (!cp) {
      res.status(404).json({ error: "Checkpoint not found." });
      return;
    }
    // Restore: in LOBBY-State zurück (§13.5), Match-States auf 'open'/SETUP.
    const restored: SystemState = {
      ...cp,
      tournamentState: "LOBBY",
      votingSession: null,
      spinSession: null,
      matches: cp.matches.map((m) =>
        m.status === "active" || m.status === "result-pending"
          ? { ...m, status: "open" }
          : m,
      ),
      version: cp.version + 1,
      eventLog: [
        ...cp.eventLog,
        {
          id: `e_${Date.now()}`,
          timestamp: Date.now(),
          type: "system",
          payload: { event: "RESTORE", filename },
          actorId: null,
        },
      ],
    };
    await c.replace(restored);
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.delete("/system/checkpoints/:filename", async (req, res) => {
  try {
    const filename = req.params["filename"]!;
    await deleteCheckpoint(filename);
    const c = getContainer();
    await c.mutate(
      (s) => ({
        ...s,
        checkpoints: s.checkpoints.filter((cp) => cp.filename !== filename),
      }),
      {
        log: {
          type: "admin-action",
          payload: { actionType: "checkpoint-delete", filename },
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/system/simulation", async (req, res) => {
  try {
    const c = getContainer();
    const { active } = req.body ?? {};
    await c.setSimulation(Boolean(active));
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/system/reset", async (req, res) => {
  try {
    const c = getContainer();
    const { confirm1, confirm2 } = req.body ?? {};
    if (!confirm1 || !confirm2) {
      res.status(400).json({ error: "Two confirmations required." });
      return;
    }
    const fresh = createEmptyState();
    await c.replace(fresh);
    await c.replace(makeFreshSimState(), true);
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.get("/system/info", (_req, res) => {
  const c = getContainer();
  const s = c.get();
  res.json({
    schemaVersion: s.schemaVersion,
    stateVersion: s.version,
    onlinePlayers: s.players.filter((p) => p.online).length,
    simulationActive: s.simulationActive,
    uptimeSec: process.uptime(),
  });
});

/* ───────────── Scoring Rules Generator ───────────── */

adminRouter.post("/matches/:matchId/scoring/generate", async (req, res) => {
  try {
    const c = getContainer();
    const matchId = req.params["matchId"]!;
    const input: GenerateScoringRulesInput = req.body ?? {};

    const s = c.get();
    const match = s.matches.find((m) => m.id === matchId);

    if (!match) {
      res.status(404).json({ error: "Match not found" });
      return;
    }

    const game = s.games.find((g) => g.id === match.gameId);

    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    // Generate scoring rules basierend auf Game-Tag
    const generatedRules = generateScoringRules({
      gameTag: game.tag,
      gameTitle: game.title,
      playerMode: match.type,
      avgDurationMin: game.avgDurationMin,
      complexity: game.complexity,
      modifiers: match.activeModifiers,
    });

    // Update Match mit generierten Scoring Rules
    await c.mutate(
      (s) => ({
        ...s,
        matches: s.matches.map((m) =>
          m.id === matchId
            ? {
                ...m,
                scoringRules: generatedRules.scoringRules,
              }
            : m
        ),
      }),
      {
        log: {
          type: "admin-action",
          payload: {
            actionType: "scoring-rules-generate",
            matchId,
            gameTag: game.tag,
            modifierMultiplier: generatedRules.modifierMultiplier,
          },
        },
      }
    );

    res.json({
      ok: true,
      scoringRules: generatedRules.scoringRules,
      balanceNotes: generatedRules.balanceNotes,
      modifierMultiplier: generatedRules.modifierMultiplier,
    });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/matches/:matchId/analysis", async (req, res) => {
  try {
    const c = getContainer();
    const matchId = req.params["matchId"]!;
    const {
      duration,
      competitiveness,
      balanceRating,
      predictability,
      insights,
      qualityTier,
    } = req.body ?? {};

    const s = c.get();
    const match = s.matches.find((m) => m.id === matchId);

    if (!match) {
      res.status(404).json({ error: "Match not found" });
      return;
    }

    await c.mutate(
      (s) =>
        analyzeMatchResults(
          s,
          matchId,
          {
            duration: Number(duration) || 0,
            competitiveness: Math.min(
              100,
              Math.max(0, Number(competitiveness) || 50)
            ),
            balanceRating: Math.min(
              100,
              Math.max(0, Number(balanceRating) || 50)
            ),
            predictability: Math.min(
              100,
              Math.max(0, Number(predictability) || 0)
            ),
            insights: Array.isArray(insights) ? insights : [],
            qualityTier:
              qualityTier &&
              ["poor", "fair", "good", "excellent"].includes(qualityTier)
                ? qualityTier
                : "fair",
          },
          Date.now()
        ),
      {
        log: {
          type: "admin-action",
          payload: {
            actionType: "match-analysis",
            matchId,
            competitiveness,
            balanceRating,
          },
          actorId: null,
        },
      }
    );

    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

/* ───────────── Tournament Bracket ───────────── */

adminRouter.post("/tournament/bracket/generate", async (req, res) => {
  try {
    const c = getContainer();
    const { timeBudgetMin = 120, difficultyFilter = "all" } = req.body ?? {};

    // Validiere Input
    if (!timeBudgetMin || timeBudgetMin < 30) {
      res.status(400).json({ error: "Time budget must be at least 30 minutes" });
      return;
    }

    // Generiere Bracket mit Agent-Logik
    const generationResult = generateBracketFromState(c.get(), {
      timeBudgetMin,
      difficultyFilter,
    });

    // Speichere im State
    await c.mutate(
      (s) => ({
        ...s,
        tournament: generationResult.bracket,
      }),
      {
        log: {
          type: "admin-action",
          payload: {
            actionType: "bracket-generate",
            timeBudgetMin,
            difficultyFilter,
            scores: {
              balance: generationResult.balanceScore,
              entertainment: generationResult.entertainmentScore,
              overall: generationResult.overallScore,
            },
          },
        },
      }
    );

    res.json({
      ok: true,
      bracket: generationResult.bracket,
      scores: {
        balance: generationResult.balanceScore,
        entertainment: generationResult.entertainmentScore,
        overall: generationResult.overallScore,
      },
      estimatedDurationMin: generationResult.estimatedDurationMin,
      rationale: generationResult.strategyRationale,
    });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.get("/tournament/bracket", (_req, res) => {
  try {
    const c = getContainer();
    const s = c.get();
    res.json({ bracket: s.tournament });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.put("/tournament/bracket/:bracketId/match/:matchId", async (req, res) => {
  try {
    const c = getContainer();
    const { bracketId, matchId } = req.params;
    const { playerA, playerB, gameId } = req.body ?? {};

    await c.mutate(
      (s) => {
        if (!s.tournament || s.tournament.id !== bracketId) {
          throw new Error("Bracket not found");
        }

        const bracket = { ...s.tournament };
        let found = false;

        bracket.rounds = bracket.rounds.map((round) => ({
          ...round,
          matches: round.matches.map((match) => {
            if (match.id === matchId) {
              found = true;
              return {
                ...match,
                playerA: playerA ?? match.playerA,
                playerB: playerB ?? match.playerB,
                gameId: gameId ?? match.gameId,
              };
            }
            return match;
          }),
        }));

        if (!found) {
          throw new Error("Match not found in bracket");
        }

        return { ...s, tournament: bracket };
      },
      {
        log: {
          type: "admin-action",
          payload: { actionType: "bracket-edit-match", matchId, playerA, playerB, gameId },
        },
      }
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.post("/tournament/bracket/:bracketId/match/:matchId/delete", async (req, res) => {
  try {
    const c = getContainer();
    const { bracketId, matchId } = req.params;

    await c.mutate(
      (s) => {
        if (!s.tournament || s.tournament.id !== bracketId) {
          throw new Error("Bracket not found");
        }

        const bracket = { ...s.tournament };
        bracket.rounds = bracket.rounds.map((round) => ({
          ...round,
          matches: round.matches.filter((m) => m.id !== matchId),
        }));

        return { ...s, tournament: bracket };
      },
      {
        log: {
          type: "admin-action",
          payload: { actionType: "bracket-delete-match", matchId },
        },
      }
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

adminRouter.get("/leaderboard/export", (req, res) => {
  try {
    const c = getContainer();
    const s = c.get();
    const format = (req.query.format as string) ?? "json";

    const leaderboard = s.leaderboard.top.map((pid, idx) => {
      const p = s.players.find((pl) => pl.id === pid);
      return {
        rank: idx + 1,
        name: p?.name ?? "Unknown",
        points: p?.points ?? 0,
        streak: p?.streak?.current ?? 0,
        role: p?.role ?? "N/A",
      };
    });

    if (format === "csv") {
      const csv = ["Rank,Name,Points,Streak,Role"];
      csv.push(
        ...leaderboard.map(
          (l) => `${l.rank},"${l.name}",${l.points},${l.streak},"${l.role}"`
        )
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="leaderboard-${Date.now()}.csv"`
      );
      res.send(csv.join("\n"));
    } else {
      res.json(leaderboard);
    }
  } catch (err) {
    handleErr(res, err);
  }
});
