// HTTP-Client — alle API-Aufrufe gegen den Server.
// Auth-Token wird automatisch als X-Session-Token Header gesendet.

const BASE = "/api";

let sessionToken = "";

export function setToken(token: string) {
  sessionToken = token;
}

function headers(extra: Record<string, string> = {}): HeadersInit {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (sessionToken) h["X-Session-Token"] = sessionToken;
  return h;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({ error: "Ungültige Server-Antwort" }));
  if (!res.ok) {
    // Spezial-Behandlung für 401: enthält den Status im Error-Prefix
    const errorMsg = json?.error ?? `HTTP ${res.status}`;
    const errorWithStatus = `${errorMsg} (HTTP ${res.status})`;
    throw new Error(errorWithStatus);
  }
  return json as T;
}

export async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { headers: headers() });
  return parseResponse<T>(res);
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parseResponse<T>(res);
}

export async function put<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "PUT",
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parseResponse<T>(res);
}

export async function del<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "DELETE",
    headers: headers(),
  });
  return parseResponse<T>(res);
}

// ── Typed API helpers ─────────────────────────────────────────────────────

import type { SystemState } from "@lan-os/shared";

export interface StateResponse {
  state?: SystemState;
  notModified?: boolean;
  version?: number;
}

/** Poll state for public TV view. */
export function fetchPublicState(since?: number): Promise<StateResponse> {
  return get<StateResponse>("/state/public", since != null ? { since: String(since) } : undefined);
}

/** Poll state for player view. */
export function fetchPlayerState(playerId: string, since?: number): Promise<StateResponse> {
  return get<StateResponse>(
    `/state/player/${playerId}`,
    since != null ? { since: String(since) } : undefined,
  );
}

/** Poll full state for admin. */
export function fetchFullState(since?: number): Promise<StateResponse> {
  return get<StateResponse>("/state/full", since != null ? { since: String(since) } : undefined);
}

// Auth
export function login(name: string, colorWish?: string) {
  return post<{ sessionToken: string; playerId: string; name: string }>("/auth/login", {
    name,
    colorWish,
  });
}

export function reconnect(name: string) {
  return post<{ sessionToken: string; playerId: string; playerName?: string }>("/auth/reconnect", { name });
}

// Player actions
export function submitVote(gameIds: string[]) {
  return post<{ ok: boolean }>("/player/vote", { gameIds });
}

export function submitMatchScores(
  matchId: string,
  scoreA: number,
  scoreB: number,
  perPlayer?: Record<string, number>,
) {
  return post<{ ok: boolean }>(`/player/match/${matchId}/scores`, {
    scoreA,
    scoreB,
    perPlayer,
  });
}

export function setMatchMvp(matchId: string, mvpPlayerId: string | null) {
  return post<{ ok: boolean }>(`/player/match/${matchId}/mvp`, { mvpPlayerId });
}

export function toggleTask(taskId: string, done: boolean) {
  return post<{ ok: boolean }>(`/player/task/${taskId}`, { done });
}
