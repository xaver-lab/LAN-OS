// §11 Session-Management — sessionToken + playerId aus localStorage.
// Bei Seiten-Reload automatisch aus localStorage wiederhergestellt.

import { useState, useCallback } from "react";
import { setToken } from "./client.js";

const LS_TOKEN = "lan_os_token";
const LS_PLAYER_ID = "lan_os_player_id";
const LS_PLAYER_NAME = "lan_os_player_name";

export interface Session {
  token: string;
  playerId: string;
  playerName: string;
}

interface SessionResult {
  session: Session | null;
  saveSession: (s: Session) => void;
  clearSession: () => void;
}

function loadSession(): Session | null {
  const token = localStorage.getItem(LS_TOKEN);
  const playerId = localStorage.getItem(LS_PLAYER_ID);
  const playerName = localStorage.getItem(LS_PLAYER_NAME);
  if (token && playerId) {
    setToken(token);
    return { token, playerId, playerName: playerName ?? "" };
  }
  return null;
}

export function useSession(): SessionResult {
  const [session, setSession] = useState<Session | null>(loadSession);

  const saveSession = useCallback((s: Session) => {
    localStorage.setItem(LS_TOKEN, s.token);
    localStorage.setItem(LS_PLAYER_ID, s.playerId);
    localStorage.setItem(LS_PLAYER_NAME, s.playerName);
    setToken(s.token);
    setSession(s);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_PLAYER_ID);
    localStorage.removeItem(LS_PLAYER_NAME);
    setToken("");
    setSession(null);
  }, []);

  return { session, saveSession, clearSession };
}
