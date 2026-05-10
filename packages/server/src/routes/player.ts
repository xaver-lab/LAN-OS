// Player-Aktionen: Vote, Score-Submit-Vorschlag, Task-Toggle, MVP-Vote.
// Auth via X-Session-Token Header.

import { Router } from "express";
import {
  assignSoulmaskRole,
  setMatchMvp,
  submitScores,
  submitVote,
  toggleSoulmaskTask,
  TransitionError,
} from "@lan-os/shared";
import { getContainer } from "../state.js";

export const playerRouter = Router();

function authPlayer(req: import("express").Request): string | null {
  const token = (req.headers["x-session-token"] as string) ?? "";
  if (!token) return null;
  const c = getContainer();
  const player = c.get().players.find((p) => p.sessionToken === token);
  return player?.id ?? null;
}

function unauthorized(res: import("express").Response) {
  res.status(401).json({ error: "Auth required." });
}

function handleErr(res: import("express").Response, err: unknown): void {
  if (err instanceof TransitionError) {
    res.status(400).json({ error: err.message });
    return;
  }
  res
    .status(500)
    .json({ error: err instanceof Error ? err.message : String(err) });
}

playerRouter.post("/vote", async (req, res) => {
  const playerId = authPlayer(req);
  if (!playerId) return unauthorized(res);
  try {
    const { gameIds } = req.body ?? {};
    if (!Array.isArray(gameIds)) {
      res.status(400).json({ error: "gameIds[] required" });
      return;
    }
    const c = getContainer();
    await c.mutate((s) => submitVote(s, playerId, gameIds), {
      log: {
        type: "vote",
        payload: { playerId, gameIds, voteMode: c.get().votingSession?.mode },
        actorId: playerId,
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

playerRouter.post("/match/:matchId/scores", async (req, res) => {
  const playerId = authPlayer(req);
  if (!playerId) return unauthorized(res);
  try {
    const { scoreA, scoreB, perPlayer } = req.body ?? {};
    const matchId = req.params["matchId"]!;
    const c = getContainer();
    await c.mutate(
      (s) => submitScores(s, { matchId, scoreA, scoreB, perPlayer }),
      {
        log: {
          type: "match-start",
          payload: { matchId, source: "player" },
          actorId: playerId,
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

playerRouter.post("/match/:matchId/mvp", async (req, res) => {
  const playerId = authPlayer(req);
  if (!playerId) return unauthorized(res);
  try {
    const { mvpPlayerId } = req.body ?? {};
    const matchId = req.params["matchId"]!;
    const c = getContainer();
    await c.mutate((s) => setMatchMvp(s, matchId, mvpPlayerId ?? null), {
      log: {
        type: "admin-action",
        payload: { actionType: "set-mvp", matchId, mvpPlayerId },
        actorId: playerId,
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

playerRouter.post("/task/:taskId", async (req, res) => {
  const playerId = authPlayer(req);
  if (!playerId) return unauthorized(res);
  try {
    const { done } = req.body ?? {};
    const taskId = req.params["taskId"]!;
    const c = getContainer();
    await c.mutate(
      (s) => toggleSoulmaskTask(s, taskId, Boolean(done), Date.now()),
      {
        log: {
          type: "soulmask-task",
          payload: { taskId, action: done ? "done" : "reopen" },
          actorId: playerId,
        },
      },
    );
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});

playerRouter.post("/soulmask/role", async (req, res) => {
  const playerId = authPlayer(req);
  if (!playerId) return unauthorized(res);
  try {
    const { roleId } = req.body ?? {};
    if (!roleId) {
      res.status(400).json({ error: "roleId required" });
      return;
    }
    const c = getContainer();
    await c.mutate((s) => assignSoulmaskRole(s, playerId, roleId, Date.now()), {
      log: {
        type: "admin-action",
        payload: { actionType: "soulmask-assign-role", playerId, roleId },
        actorId: playerId,
      },
    });
    res.json({ ok: true });
  } catch (err) {
    handleErr(res, err);
  }
});
