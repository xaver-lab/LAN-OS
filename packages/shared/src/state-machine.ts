// §5 State Machine — pure transition functions. Mutiert keinen externen State,
// gibt einen neuen SystemState zurück. Server-Routen rufen diese Funktionen auf.

import { DEFAULT_SOULMASK_ROLES, SPIN_DURATION_MS } from "./constants.js";
import { computeMatchPoints, deriveOutcomes } from "./points.js";
import type {
  Game,
  Match,
  MatchType,
  Modifier,
  Player,
  SoulmaskTask,
  Streak,
  SystemState,
  TieBreakState,
  VotingMode,
  WheelVariant,
} from "./types.js";
import {
  checkPoolAfterEliminate,
  checkPoolForStart,
  hasAnyVotes,
  resolveEliminationOutcome,
  resolveMultiOutcome,
  validateVote,
} from "./voting.js";

export class TransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransitionError";
  }
}

/* ────────────────────────────── Helpers ────────────────────────────── */

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function findPlayer(state: SystemState, id: string): Player {
  const p = state.players.find((p) => p.id === id);
  if (!p) throw new TransitionError(`Spieler ${id} nicht gefunden.`);
  return p;
}

function findGame(state: SystemState, id: string): Game {
  const g = state.games.find((g) => g.id === id);
  if (!g) throw new TransitionError(`Spiel ${id} nicht gefunden.`);
  return g;
}

function findMatch(state: SystemState, id: string): Match {
  const m = state.matches.find((m) => m.id === id);
  if (!m) throw new TransitionError(`Match ${id} nicht gefunden.`);
  return m;
}

function nextRoundNumber(state: SystemState): number {
  if (state.matches.length === 0) return 1;
  return Math.max(...state.matches.map((m) => m.roundNumber)) + 1;
}

function mustHaveTrack(state: SystemState, track: "TOURNAMENT" | "SOULMASK") {
  if (!state.activeTracks.includes(track)) {
    throw new TransitionError(`Track ${track} ist nicht aktiv.`);
  }
}

/* ────────────────────────────── Tracks ────────────────────────────── */

export function setTrackActive(
  state: SystemState,
  track: "TOURNAMENT" | "SOULMASK",
  active: boolean,
): SystemState {
  const next = clone(state);
  const has = next.activeTracks.includes(track);
  if (active && !has) next.activeTracks.push(track);
  if (!active && has) {
    next.activeTracks = next.activeTracks.filter((t) => t !== track);
    if (track === "TOURNAMENT") next.tournamentState = "INACTIVE";
    if (track === "SOULMASK") next.soulmaskState = "IDLE";
  } else if (active) {
    if (track === "TOURNAMENT" && next.tournamentState === "INACTIVE") {
      next.tournamentState = "LOBBY";
    }
  }
  return next;
}

/* ────────────────────────────── Tournament Transitions ────────────────────────────── */

export interface StartVotingArgs {
  mode: VotingMode;
  pool: string[];
  /** Wenn 0/null → kein Timer. */
  timerSec?: number | null;
}

export function startVoting(
  state: SystemState,
  args: StartVotingArgs,
  now: number,
): SystemState {
  mustHaveTrack(state, "TOURNAMENT");
  if (
    state.tournamentState !== "LOBBY" &&
    state.tournamentState !== "MATCH_DONE" &&
    state.tournamentState !== "RESULT"
  ) {
    throw new TransitionError(
      `VOTING kann nur aus LOBBY/MATCH_DONE/RESULT gestartet werden (aktuell: ${state.tournamentState}).`,
    );
  }
  const guard = checkPoolForStart(args.pool, state.config, state.games);
  if (!guard.ok) throw new TransitionError(guard.reason!);

  const next = clone(state);
  next.tournamentState = "VOTING";
  // Pool-Flags an Games sync.
  next.games = next.games.map((g) => ({
    ...g,
    inActivePool: args.pool.includes(g.id),
  }));
  next.config.votingMode = args.mode;
  const timer = args.timerSec ?? state.config.votingTimerSec;
  next.votingSession = {
    mode: args.mode,
    startedAt: now,
    endsAt: timer && timer > 0 ? now + timer * 1000 : null,
    pool: args.pool.slice(),
    votes: {},
    eliminated: [],
    tieBreakState: "none",
  };
  next.spinSession = null;
  return next;
}

export function submitVote(
  state: SystemState,
  playerId: string,
  gameIds: string[],
): SystemState {
  if (state.tournamentState !== "VOTING" || !state.votingSession) {
    throw new TransitionError("VOTING-State erforderlich.");
  }
  const player = findPlayer(state, playerId);
  if (player.role === "Zuschauer") {
    throw new TransitionError("Zuschauer haben keine Voting-Stimme.");
  }
  const guard = validateVote(state.votingSession, gameIds, state.config);
  if (!guard.ok) throw new TransitionError(guard.reason!);

  const next = clone(state);
  next.votingSession!.votes[playerId] = gameIds.slice();
  return next;
}

/**
 * Beendet die Voting-Phase (Timer abgelaufen oder Admin-Trigger).
 * Bestimmt Folgezustand: ELIMINATION_APPLIED / SPIN / RESULT / ERROR_GUARD
 * gemäss §5.1 + §5.2.
 */
export function endVoting(state: SystemState, now: number): SystemState {
  if (state.tournamentState !== "VOTING" || !state.votingSession) {
    throw new TransitionError("VOTING-State erforderlich.");
  }
  const next = clone(state);
  const session = next.votingSession!;

  if (!hasAnyVotes(session)) {
    // §5.2 letzter Eintrag: kein einziger Vote → Admin-Notification.
    next.tournamentState = "ERROR_GUARD";
    session.tieBreakState = "pending-admin";
    return next;
  }

  if (session.mode === "MULTI") {
    const outcome = resolveMultiOutcome(session);
    if (outcome.topGames.length === 1) {
      // Direkter Gewinner — kein SPIN.
      next.tournamentState = "RESULT";
      next.spinSession = {
        candidates: outcome.topGames,
        winnerId: outcome.topGames[0]!,
        wheelVariant: state.uiPreferences.wheelVariant,
        startedAt: now,
        durationMs: 0,
      };
      return next;
    }
    // Tie auf Platz 1 → SPIN über Tied-Set (§6.1).
    next.tournamentState = "SPIN";
    next.spinSession = {
      candidates: outcome.topGames,
      winnerId: null,
      wheelVariant: state.uiPreferences.wheelVariant,
      startedAt: now,
      durationMs: SPIN_DURATION_MS,
    };
    session.tieBreakState = "auto-spin";
    return next;
  }

  // ELIMINATION
  const outcome = resolveEliminationOutcome(session);
  if (outcome.topGames.length > 1) {
    // Tie auf höchste Strike-Anzahl → Admin-Override (§5.2).
    next.tournamentState = "ELIMINATION_APPLIED";
    session.tieBreakState = "pending-admin";
    return next;
  }
  // Eindeutige Elimination
  const eliminated = outcome.topGames[0]!;
  session.eliminated.push(eliminated);
  const remaining = session.pool.filter(
    (g) => !session.eliminated.includes(g),
  );
  const guard = checkPoolAfterEliminate(remaining);
  if (!guard.ok) {
    // §5.2 letzter Eintrag: Pool < 2 nach Elimination → ERROR_GUARD.
    next.tournamentState = "ERROR_GUARD";
    session.tieBreakState = "pending-admin";
    return next;
  }
  // Übergang ELIMINATION_APPLIED → SPIN
  next.tournamentState = "SPIN";
  next.spinSession = {
    candidates: remaining,
    winnerId: null,
    wheelVariant: state.uiPreferences.wheelVariant,
    startedAt: now,
    durationMs: SPIN_DURATION_MS,
  };
  return next;
}

export type TieBreakAction = "override" | "multi-eliminate";

export interface TieBreakArgs {
  action: TieBreakAction;
  /** Bei "override": die vom Admin gewählte Game-ID. */
  overrideGameId?: string;
}

/** Admin-Override für Tie-Break (§5.2). */
export function resolveTieBreak(
  state: SystemState,
  args: TieBreakArgs,
  now: number,
): SystemState {
  if (!state.votingSession) {
    throw new TransitionError("Keine Voting-Session aktiv.");
  }
  const next = clone(state);
  const session = next.votingSession!;

  if (state.tournamentState === "ELIMINATION_APPLIED") {
    const outcome = resolveEliminationOutcome(state.votingSession);
    if (args.action === "override") {
      const eliminated = args.overrideGameId;
      if (!eliminated || !outcome.topGames.includes(eliminated)) {
        throw new TransitionError(
          "Override-Game muss aus dem Tied-Set stammen.",
        );
      }
      session.eliminated.push(eliminated);
    } else {
      // multi-eliminate: alle tied raus, sofern Rest ≥ 2.
      const remainingAfter = session.pool.filter(
        (g) =>
          !session.eliminated.includes(g) &&
          !outcome.topGames.includes(g),
      );
      if (remainingAfter.length < 2) {
        throw new TransitionError(
          "Multi-Eliminate würde Pool unter 2 reduzieren.",
        );
      }
      session.eliminated.push(...outcome.topGames);
    }
    session.tieBreakState = args.action === "override"
      ? "none"
      : "auto-multi-eliminate";

    const remaining = session.pool.filter(
      (g) => !session.eliminated.includes(g),
    );
    const guard = checkPoolAfterEliminate(remaining);
    if (!guard.ok) {
      next.tournamentState = "ERROR_GUARD";
      return next;
    }
    next.tournamentState = "SPIN";
    next.spinSession = {
      candidates: remaining,
      winnerId: null,
      wheelVariant: next.uiPreferences.wheelVariant,
      startedAt: now,
      durationMs: SPIN_DURATION_MS,
    };
    return next;
  }

  if (state.tournamentState === "ERROR_GUARD") {
    if (args.action === "override" && args.overrideGameId) {
      // Admin setzt direkt einen Gewinner.
      next.tournamentState = "RESULT";
      next.spinSession = {
        candidates: [args.overrideGameId],
        winnerId: args.overrideGameId,
        wheelVariant: next.uiPreferences.wheelVariant,
        startedAt: now,
        durationMs: 0,
      };
      session.tieBreakState = "none";
      return next;
    }
    // multi-eliminate als „Voting verlängern" → zurück nach VOTING.
    next.tournamentState = "VOTING";
    if (next.votingSession) {
      const extra = state.config.votingTimerSec * 1000;
      next.votingSession.endsAt = now + extra;
      next.votingSession.tieBreakState = "none";
    }
    return next;
  }

  throw new TransitionError(
    `Tie-Break in State ${state.tournamentState} nicht erlaubt.`,
  );
}

/** Erlaubt dem Admin, ein Voting komplett abzubrechen (zurück zu LOBBY). */
export function cancelVoting(state: SystemState): SystemState {
  if (
    state.tournamentState !== "VOTING" &&
    state.tournamentState !== "ELIMINATION_APPLIED" &&
    state.tournamentState !== "ERROR_GUARD"
  ) {
    throw new TransitionError(
      "Cancel nur in VOTING/ELIMINATION_APPLIED/ERROR_GUARD erlaubt.",
    );
  }
  const next = clone(state);
  next.tournamentState = "LOBBY";
  next.votingSession = null;
  next.spinSession = null;
  next.games = next.games.map((g) => ({ ...g, inActivePool: false }));
  return next;
}

/* ────────────────────────────── Spin ────────────────────────────── */

export function startSpin(
  state: SystemState,
  variant: WheelVariant,
  now: number,
): SystemState {
  if (
    state.tournamentState !== "ELIMINATION_APPLIED" &&
    state.tournamentState !== "VOTING"
  ) {
    throw new TransitionError(
      "Spin kann nur direkt nach Voting/Elimination gestartet werden.",
    );
  }
  if (!state.votingSession) {
    throw new TransitionError("Keine Voting-Session aktiv.");
  }
  const candidates = state.votingSession.pool.filter(
    (g) => !state.votingSession!.eliminated.includes(g),
  );
  const guard = checkPoolAfterEliminate(candidates);
  if (!guard.ok) throw new TransitionError(guard.reason!);
  const next = clone(state);
  next.tournamentState = "SPIN";
  next.spinSession = {
    candidates,
    winnerId: null,
    wheelVariant: variant,
    startedAt: now,
    durationMs: SPIN_DURATION_MS,
  };
  return next;
}

export function finishSpin(
  state: SystemState,
  winnerId: string,
): SystemState {
  if (state.tournamentState !== "SPIN" || !state.spinSession) {
    throw new TransitionError("SPIN-State erforderlich.");
  }
  if (!state.spinSession.candidates.includes(winnerId)) {
    throw new TransitionError("Winner muss aus Kandidaten stammen.");
  }
  const next = clone(state);
  next.tournamentState = "RESULT";
  next.spinSession!.winnerId = winnerId;
  return next;
}

/* ────────────────────────────── Match Lifecycle ────────────────────────────── */

export interface SetupMatchArgs {
  type: MatchType;
  gameId: string;
  teamA: string[];
  teamB: string[];
  creationMethod: "manual" | "shake";
  modifiers?: string[];
}

export function setupMatch(
  state: SystemState,
  args: SetupMatchArgs,
): SystemState {
  if (
    state.tournamentState !== "RESULT" &&
    state.tournamentState !== "MATCH_DONE" &&
    state.tournamentState !== "LOBBY"
  ) {
    throw new TransitionError(
      `MATCH_SETUP nur aus RESULT/MATCH_DONE/LOBBY (aktuell: ${state.tournamentState}).`,
    );
  }
  findGame(state, args.gameId);
  for (const id of [...args.teamA, ...args.teamB]) findPlayer(state, id);

  // Validierung Team-Größen je MatchType.
  if (args.type === "1v1") {
    if (args.teamA.length !== 1 || args.teamB.length !== 1) {
      throw new TransitionError("1v1 erfordert je 1 Spieler pro Team.");
    }
  } else if (args.type === "2v2") {
    if (args.teamA.length !== 2 || args.teamB.length !== 2) {
      throw new TransitionError("2v2 erfordert je 2 Spieler pro Team.");
    }
  } else if (args.type === "team") {
    if (args.teamA.length === 0 || args.teamB.length === 0) {
      throw new TransitionError(
        "Team-Match erfordert mind. 1 Spieler pro Team.",
      );
    }
  } else if (args.type === "ffa") {
    if (args.teamA.length === 0) {
      throw new TransitionError("FFA erfordert mind. 1 Spieler.");
    }
  }

  const next = clone(state);
  const id = `m_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const match: Match = {
    id,
    roundNumber: nextRoundNumber(state),
    type: args.type,
    gameId: args.gameId,
    creationMethod: args.creationMethod,
    status: "open",
    teamA: args.teamA.slice(),
    teamB: args.type === "ffa" ? [] : args.teamB.slice(),
    scores: {
      A: null,
      B: null,
      perPlayer: args.type === "ffa"
        ? Object.fromEntries(args.teamA.map((p) => [p, 0]))
        : null,
    },
    confirmed: false,
    confirmedAt: null,
    mvpPlayerId: null,
    activeModifiers: args.modifiers?.slice() ?? [],
    pointsAwarded: null,
    roundResults: [],
    scoringRules: findGame(state, args.gameId).scoringRules.slice(),
  };
  next.matches.push(match);
  next.tournamentState = "MATCH_SETUP";
  return next;
}

export function startMatch(state: SystemState, matchId: string): SystemState {
  if (state.tournamentState !== "MATCH_SETUP") {
    throw new TransitionError("MATCH_SETUP-State erforderlich.");
  }
  const next = clone(state);
  const match = findMatch(next, matchId);
  match.status = "active";
  next.tournamentState = "MATCH_ACTIVE";
  return next;
}

export interface SubmitScoresArgs {
  matchId: string;
  scoreA?: number;
  scoreB?: number;
  perPlayer?: Record<string, number>;
}

export function submitScores(
  state: SystemState,
  args: SubmitScoresArgs,
): SystemState {
  if (state.tournamentState !== "MATCH_ACTIVE") {
    throw new TransitionError("MATCH_ACTIVE-State erforderlich.");
  }
  const next = clone(state);
  const match = findMatch(next, args.matchId);
  if (match.type === "ffa") {
    if (!args.perPlayer) {
      throw new TransitionError("FFA: perPlayer-Scores erforderlich.");
    }
    match.scores.perPlayer = { ...args.perPlayer };
  } else {
    if (args.scoreA === undefined || args.scoreB === undefined) {
      throw new TransitionError("scoreA und scoreB erforderlich.");
    }
    match.scores.A = args.scoreA;
    match.scores.B = args.scoreB;
  }
  match.status = "result-pending";
  next.tournamentState = "MATCH_RESULT_PENDING";
  return next;
}

export function setMatchMvp(
  state: SystemState,
  matchId: string,
  mvpPlayerId: string | null,
): SystemState {
  const next = clone(state);
  const match = findMatch(next, matchId);
  if (mvpPlayerId !== null) {
    const participants =
      match.type === "ffa"
        ? match.teamA
        : [...match.teamA, ...match.teamB];
    if (!participants.includes(mvpPlayerId)) {
      throw new TransitionError("MVP muss Match-Teilnehmer sein.");
    }
  }
  match.mvpPlayerId = mvpPlayerId;
  return next;
}

export function setMatchModifiers(
  state: SystemState,
  matchId: string,
  modifierIds: string[],
): SystemState {
  const next = clone(state);
  const match = findMatch(next, matchId);
  if (match.status === "done") {
    throw new TransitionError(
      "Modifier können nach 'done' nicht mehr verändert werden (Override → System).",
    );
  }
  for (const id of modifierIds) {
    if (!next.modifiers.find((m) => m.id === id)) {
      throw new TransitionError(`Unbekannter Modifier: ${id}.`);
    }
  }
  match.activeModifiers = modifierIds.slice();
  return next;
}

export function confirmMatch(
  state: SystemState,
  matchId: string,
  now: number,
): SystemState {
  if (state.tournamentState !== "MATCH_RESULT_PENDING") {
    throw new TransitionError("MATCH_RESULT_PENDING-State erforderlich.");
  }
  const next = clone(state);
  const match = findMatch(next, matchId);

  const outcomes = deriveOutcomes(match);
  const activeMods: Modifier[] = next.modifiers.filter((m) =>
    match.activeModifiers.includes(m.id),
  );
  const streakBefore: Record<string, Streak> = {};
  for (const o of outcomes) {
    const p = findPlayer(next, o.playerId);
    streakBefore[o.playerId] = { ...p.streak };
  }
  const result = computeMatchPoints({
    outcomes,
    modifiers: activeMods,
    streakBefore,
  });
  match.pointsAwarded = result.award;
  match.confirmed = true;
  match.confirmedAt = now;
  match.status = "done";

  // Punkte buchen + Streaks updaten.
  for (const [playerId, pts] of Object.entries(result.award.perPlayer)) {
    const p = findPlayer(next, playerId);
    p.points += pts;
    p.streak = result.streakAfter[playerId] ?? p.streak;
  }

  next.tournamentState = "MATCH_DONE";
  return next;
}

/**
 * §7.6 Score-Override durch Admin nach 'done'. Punkte werden neu berechnet,
 * alte Auszahlung wird vom Caller im EventLog markiert.
 */
export function overrideMatchScores(
  state: SystemState,
  args: SubmitScoresArgs,
  now: number,
): SystemState {
  const next = clone(state);
  const match = findMatch(next, args.matchId);
  // Alte Punkte zurückziehen.
  if (match.pointsAwarded) {
    for (const [playerId, pts] of Object.entries(
      match.pointsAwarded.perPlayer,
    )) {
      const p = findPlayer(next, playerId);
      p.points -= pts;
    }
  }
  if (match.type === "ffa") {
    if (!args.perPlayer) {
      throw new TransitionError("FFA: perPlayer-Scores erforderlich.");
    }
    match.scores.perPlayer = { ...args.perPlayer };
  } else {
    if (args.scoreA === undefined || args.scoreB === undefined) {
      throw new TransitionError("scoreA und scoreB erforderlich.");
    }
    match.scores.A = args.scoreA;
    match.scores.B = args.scoreB;
  }
  // Neu berechnen — Streaks auf vorherigen Stand zurücksetzen ist nicht praktikabel,
  // also: nur Punkte neu vergeben, Streaks bleiben wie sie sind.
  const outcomes = deriveOutcomes(match);
  const activeMods: Modifier[] = next.modifiers.filter((m) =>
    match.activeModifiers.includes(m.id),
  );
  const streakBefore: Record<string, Streak> = {};
  for (const o of outcomes) {
    const p = findPlayer(next, o.playerId);
    streakBefore[o.playerId] = { ...p.streak };
  }
  const result = computeMatchPoints({
    outcomes,
    modifiers: activeMods,
    streakBefore,
  });
  match.pointsAwarded = result.award;
  match.confirmedAt = now;
  for (const [playerId, pts] of Object.entries(result.award.perPlayer)) {
    const p = findPlayer(next, playerId);
    p.points += pts;
  }
  return next;
}

export function skipRound(state: SystemState): SystemState {
  if (
    state.tournamentState !== "MATCH_SETUP" &&
    state.tournamentState !== "MATCH_ACTIVE" &&
    state.tournamentState !== "MATCH_RESULT_PENDING"
  ) {
    throw new TransitionError(
      "Skip nur in MATCH_SETUP/ACTIVE/RESULT_PENDING erlaubt.",
    );
  }
  const next = clone(state);
  // Letztes Match auf 'open' setzen → bleibt im Log, aber Track geht zurück nach LOBBY.
  next.tournamentState = "LOBBY";
  next.votingSession = null;
  next.spinSession = null;
  return next;
}

/* ────────────────────────────── Soulmask Track ────────────────────────────── */

export function startSoulmask(state: SystemState, now: number): SystemState {
  mustHaveTrack(state, "SOULMASK");
  if (state.soulmaskState !== "IDLE" && state.soulmaskState !== "DONE") {
    throw new TransitionError(
      `Soulmask-Start nur aus IDLE/DONE (aktuell: ${state.soulmaskState}).`,
    );
  }
  const next = clone(state);
  next.soulmaskState = "ACTIVE";
  if (!next.soulmaskData.sessionId) {
    next.soulmaskData.sessionId = `sm_${now}`;
  }
  if (next.soulmaskData.defaultRoles.length === 0) {
    next.soulmaskData.defaultRoles = DEFAULT_SOULMASK_ROLES.slice();
  }
  return next;
}

export function pauseSoulmask(state: SystemState): SystemState {
  if (state.soulmaskState !== "ACTIVE") {
    throw new TransitionError("ACTIVE-State erforderlich.");
  }
  const next = clone(state);
  next.soulmaskState = "PAUSED";
  return next;
}

export function resumeSoulmask(state: SystemState): SystemState {
  if (state.soulmaskState !== "PAUSED") {
    throw new TransitionError("PAUSED-State erforderlich.");
  }
  const next = clone(state);
  next.soulmaskState = "ACTIVE";
  return next;
}

export function endSoulmask(state: SystemState): SystemState {
  if (
    state.soulmaskState !== "ACTIVE" &&
    state.soulmaskState !== "PAUSED"
  ) {
    throw new TransitionError("ACTIVE oder PAUSED erforderlich.");
  }
  const next = clone(state);
  next.soulmaskState = "DONE";
  return next;
}

export function assignSoulmaskRole(
  state: SystemState,
  playerId: string,
  roleId: string,
  now: number,
): SystemState {
  findPlayer(state, playerId);
  // roleId muss Default-Rolle oder existierende Custom-Rolle sein.
  const isDefault = state.soulmaskData.defaultRoles.includes(roleId as never);
  const isCustom = state.soulmaskData.customRoles.some((r) => r.id === roleId);
  if (!isDefault && !isCustom) {
    throw new TransitionError(`Unbekannte Rolle: ${roleId}.`);
  }
  const next = clone(state);
  const prev = next.soulmaskData.activeRoles[playerId];
  next.soulmaskData.activeRoles[playerId] = roleId;
  if (prev && prev !== roleId) {
    next.soulmaskData.roleHistory.push({
      playerId,
      fromRole: prev,
      toRole: roleId,
      at: now,
    });
  }
  return next;
}

export interface AddCustomRoleArgs {
  id: string;
  label: string;
  color: string;
  icon: string | null;
}

export function addSoulmaskCustomRole(
  state: SystemState,
  args: AddCustomRoleArgs,
): SystemState {
  if (state.soulmaskData.customRoles.some((r) => r.id === args.id)) {
    throw new TransitionError(`Custom-Rolle ${args.id} existiert bereits.`);
  }
  const next = clone(state);
  next.soulmaskData.customRoles.push({ ...args });
  return next;
}

export function removeSoulmaskCustomRole(
  state: SystemState,
  roleId: string,
): SystemState {
  const next = clone(state);
  next.soulmaskData.customRoles = next.soulmaskData.customRoles.filter(
    (r) => r.id !== roleId,
  );
  // Spieler, die diese Rolle hatten, werden auf "Builder" zurückgesetzt.
  for (const [pid, rid] of Object.entries(next.soulmaskData.activeRoles)) {
    if (rid === roleId) next.soulmaskData.activeRoles[pid] = "Builder";
  }
  return next;
}

export interface AddTaskArgs {
  playerId: string;
  role: string;
  label: string;
}

export function addSoulmaskTask(
  state: SystemState,
  args: AddTaskArgs,
  now: number,
): SystemState {
  findPlayer(state, args.playerId);
  const next = clone(state);
  const task: SoulmaskTask = {
    id: `t_${now}_${Math.floor(Math.random() * 1000)}`,
    playerId: args.playerId,
    role: args.role,
    label: args.label,
    done: false,
    createdAt: now,
    doneAt: null,
  };
  next.soulmaskData.tasks.push(task);
  return next;
}

export function toggleSoulmaskTask(
  state: SystemState,
  taskId: string,
  done: boolean,
  now: number,
): SystemState {
  const next = clone(state);
  const task = next.soulmaskData.tasks.find((t) => t.id === taskId);
  if (!task) throw new TransitionError(`Task ${taskId} nicht gefunden.`);
  task.done = done;
  task.doneAt = done ? now : null;
  return next;
}

export function removeSoulmaskTask(
  state: SystemState,
  taskId: string,
): SystemState {
  const next = clone(state);
  next.soulmaskData.tasks = next.soulmaskData.tasks.filter(
    (t) => t.id !== taskId,
  );
  return next;
}

export function setGoalProgress(
  state: SystemState,
  goalId: string,
  progress: number,
): SystemState {
  if (progress < 0 || progress > 100) {
    throw new TransitionError("Progress muss 0..100 sein.");
  }
  const next = clone(state);
  const goal = next.soulmaskData.globalGoals.find((g) => g.id === goalId);
  if (!goal) throw new TransitionError(`Goal ${goalId} nicht gefunden.`);
  goal.progress = progress;
  return next;
}

export interface AddGoalArgs {
  label: string;
  color: string;
}

export function addGlobalGoal(
  state: SystemState,
  args: AddGoalArgs,
  now: number,
): SystemState {
  const next = clone(state);
  next.soulmaskData.globalGoals.push({
    id: `goal_${now}_${Math.floor(Math.random() * 1000)}`,
    label: args.label,
    progress: 0,
    color: args.color,
  });
  return next;
}

export function removeGlobalGoal(
  state: SystemState,
  goalId: string,
): SystemState {
  const next = clone(state);
  next.soulmaskData.globalGoals = next.soulmaskData.globalGoals.filter(
    (g) => g.id !== goalId,
  );
  return next;
}

/* ────────────────────────────── Player Deletion ────────────────────────────── */

/**
 * Löscht einen Spieler vollständig aus dem System:
 * - Entfernt ihn aus der Spielerliste
 * - Markiert alle Matches, an denen er teilgenommen hat, mit noticedPlayerDeletion
 * - Entfernt ihn aus Soulmask-Rollen
 */
export function deletePlayer(
  state: SystemState,
  playerId: string,
): SystemState {
  const next = clone(state);

  // Spieler aus Liste entfernen
  next.players = next.players.filter((p) => p.id !== playerId);

  // Alle Matches, an denen dieser Spieler beteiligt war, als "player deleted" markieren
  next.matches = next.matches.map((m) => {
    const isInTeamA = m.teamA.includes(playerId);
    const isInTeamB = m.teamB.includes(playerId);

    if (isInTeamA || isInTeamB) {
      return { ...m, noticedPlayerDeletion: true };
    }
    return m;
  });

  // Entferne Spieler aus Soulmask-Rollen
  const updatedRoles = { ...next.soulmaskData.activeRoles };
  delete updatedRoles[playerId];
  next.soulmaskData.activeRoles = updatedRoles;

  // Entferne Spieler aus Soulmask-Tasks
  next.soulmaskData.tasks = next.soulmaskData.tasks.filter(
    (t) => t.playerId !== playerId,
  );

  return next;
}
