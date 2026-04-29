// §7.4 + §8.2 — Punkteberechnung mit Modifier-Anwendungs-Reihenfolge.

import { POINTS, STREAK_THRESHOLDS } from "./constants.js";
import type {
  Match,
  Modifier,
  PointsAwarded,
  PointsBreakdownEntry,
  Streak,
} from "./types.js";

export type MatchOutcome = "win" | "draw" | "loss";

export interface PlayerOutcome {
  playerId: string;
  outcome: MatchOutcome;
  scoreDiff: number;
  isMvp: boolean;
}

/** Bestimmt Win/Draw/Loss + Score-Diff pro Spieler in einem Match. */
export function deriveOutcomes(match: Match): PlayerOutcome[] {
  const result: PlayerOutcome[] = [];
  if (match.type === "ffa") {
    const perPlayer = match.scores.perPlayer ?? {};
    const ranked = Object.entries(perPlayer)
      .map(([playerId, score]) => ({ playerId, score: Number(score) }))
      .sort((a, b) => b.score - a.score);
    if (ranked.length === 0) return [];
    const topScore = ranked[0]!.score;
    for (let i = 0; i < ranked.length; i++) {
      const cur = ranked[i]!;
      let outcome: MatchOutcome;
      if (cur.score === topScore) outcome = i === 0 ? "win" : "draw";
      else outcome = "loss";
      // FFA: scoreDiff = Abstand zum Sieger (0 für Sieger).
      const scoreDiff = topScore - cur.score;
      result.push({
        playerId: cur.playerId,
        outcome,
        scoreDiff,
        isMvp: cur.playerId === match.mvpPlayerId,
      });
    }
    return result;
  }

  const a = match.scores.A ?? 0;
  const b = match.scores.B ?? 0;
  const diff = Math.abs(a - b);
  let teamAOutcome: MatchOutcome;
  let teamBOutcome: MatchOutcome;
  if (a === b) {
    teamAOutcome = teamBOutcome = "draw";
  } else if (a > b) {
    teamAOutcome = "win";
    teamBOutcome = "loss";
  } else {
    teamAOutcome = "loss";
    teamBOutcome = "win";
  }
  for (const playerId of match.teamA) {
    result.push({
      playerId,
      outcome: teamAOutcome,
      scoreDiff: diff,
      isMvp: playerId === match.mvpPlayerId,
    });
  }
  for (const playerId of match.teamB) {
    result.push({
      playerId,
      outcome: teamBOutcome,
      scoreDiff: diff,
      isMvp: playerId === match.mvpPlayerId,
    });
  }
  return result;
}

interface AppliedModifierBucket {
  riskRewardMultiplier: number;
  chaosMultiplier: number;
  balanceHandicap: number;
  appliedLabels: string[];
}

function bucketModifiers(modifiers: Modifier[]): AppliedModifierBucket {
  const bucket: AppliedModifierBucket = {
    riskRewardMultiplier: 1,
    chaosMultiplier: 1,
    balanceHandicap: 0,
    appliedLabels: [],
  };
  for (const m of modifiers) {
    if (!m.enabled) continue;
    bucket.appliedLabels.push(m.label);
    if (m.category === "risk-reward" && m.rules.multiplier !== undefined) {
      bucket.riskRewardMultiplier *= m.rules.multiplier;
    } else if (m.category === "chaos") {
      if (m.rules.multiplier !== undefined) {
        bucket.chaosMultiplier *= m.rules.multiplier;
      }
    } else if (m.category === "balance" && m.rules.handicap !== undefined) {
      bucket.balanceHandicap += m.rules.handicap;
    }
  }
  return bucket;
}

/**
 * Aktualisiert eine Streak nach §7.4: +1 bei Win, RESET bei Loss, UNVERÄNDERT bei Draw.
 * Liefert die geänderte Streak + ggf. ausgezahlten Bonus (einmalig pro Schwellen-Stand).
 */
export function applyStreak(
  streak: Streak,
  outcome: MatchOutcome,
): { next: Streak; streakBonus: number; rule: string | null } {
  let next: Streak = { ...streak };
  let streakBonus = 0;
  let rule: string | null = null;

  if (outcome === "win") {
    next.current = streak.current + 1;
    if (next.current > next.best) next.best = next.current;
    // Bonus auszahlen, wenn neuer Schwellenwert erreicht wurde.
    for (const threshold of STREAK_THRESHOLDS) {
      if (
        next.current >= threshold.count &&
        streak.lastBonusAt < threshold.count
      ) {
        streakBonus += threshold.bonus;
        rule = `Streak ${threshold.count} Wins`;
        next.lastBonusAt = threshold.count;
      }
    }
  } else if (outcome === "loss") {
    next.current = 0;
    next.lastBonusAt = 0;
  } /* draw → unverändert */
  return { next, streakBonus, rule };
}

export interface ComputePointsInput {
  outcomes: PlayerOutcome[];
  modifiers: Modifier[];
  /**
   * Streak-Stände der beteiligten Spieler VOR diesem Match.
   * Wird kopiert; nicht mutiert.
   */
  streakBefore: Record<string, Streak>;
}

export interface ComputePointsResult {
  award: PointsAwarded;
  /** Aktualisierte Streaks pro Spieler (nach Match). */
  streakAfter: Record<string, Streak>;
}

/**
 * §8.2 Anwendungs-Reihenfolge:
 *   basePoints (win/draw/loss)
 *   + scoreBonus (Diff ≥ 5)
 *   + mvpBonus
 *   + streakBonus
 *   × risk-reward-multiplier
 *   × chaos-multiplier
 *   + balance-handicap
 * = finalPoints
 */
export function computeMatchPoints(
  input: ComputePointsInput,
): ComputePointsResult {
  const { outcomes, modifiers, streakBefore } = input;
  const bucket = bucketModifiers(modifiers);
  const perPlayer: Record<string, number> = {};
  const breakdown: PointsBreakdownEntry[] = [];
  const streakAfter: Record<string, Streak> = {};

  for (const o of outcomes) {
    let base: number = POINTS.loss;
    let baseRule = "Niederlage";
    if (o.outcome === "win") {
      base = POINTS.win;
      baseRule = "Sieg";
    } else if (o.outcome === "draw") {
      base = POINTS.draw;
      baseRule = "Unentschieden";
    }
    let subtotal = base;
    breakdown.push({ rule: `${o.playerId}: ${baseRule}`, pts: base });

    if (
      o.outcome === "win" &&
      o.scoreDiff >= POINTS.scoreDiffThreshold
    ) {
      subtotal += POINTS.scoreDiffBonus;
      breakdown.push({
        rule: `${o.playerId}: Sieger-Bonus (Diff ≥ ${POINTS.scoreDiffThreshold})`,
        pts: POINTS.scoreDiffBonus,
      });
    }

    if (o.isMvp) {
      subtotal += POINTS.mvp;
      breakdown.push({ rule: `${o.playerId}: MVP`, pts: POINTS.mvp });
    }

    const prevStreak: Streak = streakBefore[o.playerId] ?? {
      current: 0,
      best: 0,
      lastBonusAt: 0,
    };
    const streakResult = applyStreak(prevStreak, o.outcome);
    streakAfter[o.playerId] = streakResult.next;
    if (streakResult.streakBonus > 0 && streakResult.rule) {
      subtotal += streakResult.streakBonus;
      breakdown.push({
        rule: `${o.playerId}: ${streakResult.rule}`,
        pts: streakResult.streakBonus,
      });
    }

    // Multiplikatoren
    let withMultipliers = subtotal * bucket.riskRewardMultiplier;
    if (bucket.chaosMultiplier !== 1) {
      withMultipliers *= bucket.chaosMultiplier;
    }
    // Additiver Handicap am Schluss
    const final = Math.round(withMultipliers + bucket.balanceHandicap);
    perPlayer[o.playerId] = final;

    if (
      bucket.riskRewardMultiplier !== 1 ||
      bucket.chaosMultiplier !== 1 ||
      bucket.balanceHandicap !== 0
    ) {
      breakdown.push({
        rule: `${o.playerId}: Modifier (rr×${bucket.riskRewardMultiplier} · chaos×${bucket.chaosMultiplier} · bal${bucket.balanceHandicap >= 0 ? "+" : ""}${bucket.balanceHandicap})`,
        pts: final - subtotal,
      });
    }
  }

  return {
    award: { perPlayer, breakdown },
    streakAfter,
  };
}
