import { Router } from "express";
import { AuthError, loginPlayer, reconnectByToken, reconnectByName } from "../auth.js";
import { getContainer } from "../state.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  try {
    const c = getContainer();
    const { name, colorWish, role, activeTracks } = req.body ?? {};
    const now = Date.now();
    let createdPlayerId: string | null = null;
    let createdPlayerName = "";
    let token = "";
    await c.mutate(
      (s) => {
        const result = loginPlayer(s, { name, colorWish, role, activeTracks }, now);
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
    const { name, token } = req.body ?? {};

    // Support both old token-based and new name-based reconnect
    if (name) {
      let playerId = "";
      let sessionToken = "";
      let playerName = "";
      await c.mutate((s) => {
        const result = reconnectByName(s, name, Date.now());
        playerId = result.player.id;
        sessionToken = result.player.sessionToken;
        playerName = result.player.name;
        return result.state;
      });
      res.json({ sessionToken, playerId, playerName });
    } else if (token) {
      let playerId = "";
      await c.mutate((s) => {
        const result = reconnectByToken(s, token, Date.now());
        playerId = result.player.id;
        return result.state;
      });
      res.json({ sessionToken: token, playerId });
    } else {
      res.status(400).json({ error: "name or token required" });
    }
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
