// HTTP-Client — alle API-Aufrufe gegen den Server.
// Auth-Token wird automatisch als X-Session-Token Header gesendet.
const BASE = "/api";
let sessionToken = "";
export function setToken(token) {
    sessionToken = token;
}
function headers(extra = {}) {
    const h = {
        "Content-Type": "application/json",
        ...extra,
    };
    if (sessionToken)
        h["X-Session-Token"] = sessionToken;
    return h;
}
async function parseResponse(res) {
    const json = await res.json().catch(() => ({ error: "Ungültige Server-Antwort" }));
    if (!res.ok) {
        // Spezial-Behandlung für 401: enthält den Status im Error-Prefix
        const errorMsg = json?.error ?? `HTTP ${res.status}`;
        const errorWithStatus = `${errorMsg} (HTTP ${res.status})`;
        throw new Error(errorWithStatus);
    }
    return json;
}
export async function get(path, params) {
    const url = new URL(BASE + path, window.location.origin);
    if (params) {
        for (const [k, v] of Object.entries(params))
            url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), { headers: headers() });
    return parseResponse(res);
}
export async function post(path, body) {
    const res = await fetch(BASE + path, {
        method: "POST",
        headers: headers(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return parseResponse(res);
}
export async function put(path, body) {
    const res = await fetch(BASE + path, {
        method: "PUT",
        headers: headers(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return parseResponse(res);
}
export async function del(path) {
    const res = await fetch(BASE + path, {
        method: "DELETE",
        headers: headers(),
    });
    return parseResponse(res);
}
/** Poll state for public TV view. */
export function fetchPublicState(since) {
    return get("/state/public", since != null ? { since: String(since) } : undefined);
}
/** Poll state for player view. */
export function fetchPlayerState(playerId, since) {
    return get(`/state/player/${playerId}`, since != null ? { since: String(since) } : undefined);
}
/** Poll full state for admin. */
export function fetchFullState(since) {
    return get("/state/full", since != null ? { since: String(since) } : undefined);
}
// Auth
export function login(name, colorWish, role, activeTracks) {
    return post("/auth/login", {
        name,
        colorWish,
        role,
        activeTracks,
    });
}
export function reconnect(name) {
    return post("/auth/reconnect", { name });
}
// Player actions
export function submitVote(gameIds) {
    return post("/player/vote", { gameIds });
}
export function submitMatchScores(matchId, scoreA, scoreB, perPlayer) {
    return post(`/player/match/${matchId}/scores`, {
        scoreA,
        scoreB,
        perPlayer,
    });
}
export function setMatchMvp(matchId, mvpPlayerId) {
    return post(`/player/match/${matchId}/mvp`, { mvpPlayerId });
}
export function toggleTask(taskId, done) {
    return post(`/player/task/${taskId}`, { done });
}
export function setSoulmaskRole(roleId) {
    return post("/player/soulmask/role", { roleId });
}
// Admin Bracket API
export function generateBracket(timeBudgetMin, difficultyFilter) {
    return post("/admin/tournament/bracket/generate", {
        timeBudgetMin,
        difficultyFilter,
    });
}
export function getBracket() {
    return get("/admin/tournament/bracket");
}
export function updateBracketMatch(bracketId, matchId, playerA, playerB, gameId) {
    return put(`/admin/tournament/bracket/${bracketId}/match/${matchId}`, {
        playerA,
        playerB,
        gameId,
    });
}
export function deleteBracketMatch(bracketId, matchId) {
    return post(`/admin/tournament/bracket/${bracketId}/match/${matchId}/delete`);
}
//# sourceMappingURL=client.js.map