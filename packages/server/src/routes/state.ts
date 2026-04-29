// §14 Realtime / Polling — drei Polling-Endpoints + Heartbeat.

import { Router } from "express";
import type { SystemState } from "@lan-os/shared";
import { getContainer } from "../state.js";

export const stateRouter = Router();

interface SinceQuery {
  since?: string;
}

function notModifiedOrFull(
  res: import("express").Response,
  current: SystemState,
  view: SystemState,
  since: number | null,
): void {
  if (since !== null && since === current.version) {
    res.json({ notModified: true, version: current.version });
    return;
  }
  res.json({ state: view });
}

/** §14.1 TV-Subset — kein sessionToken, kein Admin-Log. */
stateRouter.get("/public", (req, res) => {
  const since = parseSince(req.query as SinceQuery);
  const c = getContainer();
  const current = c.get();
  const full = c.view(Date.now());
  const view: SystemState = {
    ...full,
    players: full.players.map((p) => ({
      ...p,
      sessionToken: "",
    })),
    eventLog: full.eventLog
      .filter((e) => e.type !== "admin-action")
      .slice(-200),
  };
  notModifiedOrFull(res, current, view, since);
});

/** §14.1 Player-Sicht — eigene Tasks, Match-Eingabe, Heartbeat-Update. */
stateRouter.get("/player/:id", (req, res) => {
  const since = parseSince(req.query as SinceQuery);
  const c = getContainer();
  const token = (req.headers["x-session-token"] as string) ?? "";
  const current = c.get();
  const player = current.players.find((p) => p.id === req.params["id"]);
  if (!player || !token || player.sessionToken !== token) {
    res.status(401).json({ error: "Auth required." });
    return;
  }
  // Heartbeat
  c.touchPlayer(player.id, Date.now());
  const full = c.view(Date.now());
  const view: SystemState = {
    ...full,
    players: full.players.map((p) =>
      p.id === player.id ? p : { ...p, sessionToken: "" },
    ),
  };
  notModifiedOrFull(res, current, view, since);
});

/** §14.1 Admin — vollständiger State. */
stateRouter.get("/full", (req, res) => {
  const since = parseSince(req.query as SinceQuery);
  const c = getContainer();
  const current = c.get();
  const view = c.view(Date.now());
  notModifiedOrFull(res, current, view, since);
});

function parseSince(q: SinceQuery): number | null {
  if (q.since === undefined) return null;
  const n = Number.parseInt(q.since, 10);
  return Number.isFinite(n) ? n : null;
}
