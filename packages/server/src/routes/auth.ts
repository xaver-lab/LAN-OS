import { Router } from "express";
import { AuthError, loginPlayer, reconnectByToken } from "../auth.js";
import { getContainer } from "../state.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  try {
    const c = getContainer();
    const { name, colorWish } = req.body ?? {};
    const now = Date.now();
    let createdPlayerId: string | null = null;
    let createdPlayerName = "";
    let token = "";
    await c.mutate(
      (s) => {
        const result = loginPlayer(s, { name, colorWish }, now);
        createdPlayerId = result.player.id;
        createdPlayerName = result.player.name;
        token = result.player.sessionToken;
        return result.state;
      },
      {
        log: {
          type: "player-join",
          payload: { name },
        },
      },
    );
    if (!createdPlayerId) {
      res.status(500).json({ error: "Login failed." });
      return;
    }
    res.json({
      sessionToken: token,
      playerId: createdPlayerId,
      name: createdPlayerName,
    });
  } catch (err) {
    handleErr(res, err);
  }
});

authRouter.post("/reconnect", async (req, res) => {
  try {
    const c = getContainer();
    const { token } = req.body ?? {};
    if (!token) {
      res.status(400).json({ error: "token required" });
      return;
    }
    let playerId = "";
    await c.mutate((s) => {
      const result = reconnectByToken(s, token, Date.now());
      playerId = result.player.id;
      return result.state;
    });
    res.json({ sessionToken: token, playerId });
  } catch (err) {
    handleErr(res, err);
  }
});

function handleErr(res: import("express").Response, err: unknown): void {
  if (err instanceof AuthError) {
    res.status(400).json({ error: err.message });
    return;
  }
  res
    .status(500)
    .json({ error: err instanceof Error ? err.message : String(err) });
}
