/**
 * Tournament Bracket Planner
 *
 * Implementierung des Bracket-Planner Agents (§1 in Game Agent Prompts.md)
 * Generiert optimale Brackets mit:
 * - Balance (40%): Skill-Levels gemischt
 * - Entertainment (30%): Game-Vielfalt
 * - Time-Efficiency (20%): Respektiere Budget
 * - Constraints (10%): Modes, Suitability ≥70
 */

import type {
  Player,
  Game,
  TournamentBracket,
  BracketRound,
  BracketMatch,
  GameComplexity
} from "@lan-os/shared";

interface BracketGenerationInput {
  players: Player[];
  games: Game[];
  timeBudgetMin: number;
  difficultyFilter: GameComplexity | "all";
  maxMatchesCount?: number;
  maxRoundsCount?: number;
}

interface BracketGenerationOutput {
  bracket: TournamentBracket;
  strategyRationale: string;
  estimatedDurationMin: number;
  entertainmentScore: number;
  balanceScore: number;
  overallScore: number;
}

interface MatchupScore {
  playerA: string;
  playerB: string;
  skillDifference: number;
  skillBalance: number;
}

interface GameAssignment {
  matchIndex: number;
  gameId: string;
  suitability: number;
}

// Hilfs-Funktionen für Skill-Level Bewertung
function getSkillLevel(player: Player): number {
  // Basierend auf Punkte und Streak
  const pointsScore = Math.min(player.points / 1000, 1); // 0..1
  const streakScore = Math.min(player.streak.best / 10, 0.3); // 0..0.3
  return pointsScore + streakScore;
}

function calculateSkillDifference(playerA: Player, playerB: Player): number {
  const skillA = getSkillLevel(playerA);
  const skillB = getSkillLevel(playerB);
  return Math.abs(skillA - skillB);
}

function calculateSkillBalance(matchup: MatchupScore): number {
  // Höher = besser balanced (Wert 0..1, max bei 0 Differenz)
  return Math.max(0, 1 - matchup.skillDifference * 2);
}

function calculateEntertainmentScore(
  assignments: GameAssignment[],
  games: Map<string, Game>
): number {
  if (assignments.length === 0) return 0;

  // Vielfalt: unterschiedliche Game-Tags
  const tags = new Set<string>();
  let chaosBonus = 0;
  let repetitionPenalty = 0;
  let gameCountByTag: Record<string, number> = {};

  assignments.forEach(a => {
    const game = games.get(a.gameId);
    if (!game) return;

    tags.add(game.tag);
    gameCountByTag[game.tag] = (gameCountByTag[game.tag] || 0) + 1;
    chaosBonus += game.chaosPotential * 0.01; // 0..100 -> 0..1
  });

  // Penalty für Wiederholungen (zu viele gleiche Spiele)
  Object.values(gameCountByTag).forEach(count => {
    if (count > 2) {
      repetitionPenalty += (count - 2) * 0.1;
    }
  });

  const varietyBonus = Math.min(tags.size / assignments.length, 0.5);
  return Math.max(
    0,
    varietyBonus +
    (chaosBonus / Math.max(1, assignments.length)) -
    repetitionPenalty
  );
}

function calculateTimeScore(
  assignments: GameAssignment[],
  games: Map<string, Game>,
  budgetMin: number
): { score: number; estimatedMin: number } {
  let totalDuration = 0;

  assignments.forEach(a => {
    const game = games.get(a.gameId);
    if (game?.avgDurationMin) {
      totalDuration += game.avgDurationMin;
    }
  });

  // Ziel: im Budget-Range bleiben (±10% Toleranz)
  const lowerBound = budgetMin * 0.9;
  const upperBound = budgetMin * 1.1;

  let score = 1;
  if (totalDuration < lowerBound) {
    score = totalDuration / budgetMin;
  } else if (totalDuration > upperBound) {
    score = Math.max(0.3, 1 - (totalDuration - upperBound) / (budgetMin * 0.5));
  }

  return { score: Math.max(0, Math.min(1, score)), estimatedMin: totalDuration };
}

function calculateConstraintScore(
  assignments: GameAssignment[],
  games: Map<string, Game>
): number {
  if (assignments.length === 0) return 0;

  let validCount = 0;
  assignments.forEach(a => {
    const game = games.get(a.gameId);
    if (game && game.tournamentSuitability >= 70) {
      validCount++;
    }
  });

  return validCount / assignments.length;
}

/**
 * Round-Robin Matchup-Generator mit Skill-Balancing
 * Erzeugt faire Paarungen zwischen Spielern
 */
function generateBalancedMatchups(players: Player[]): MatchupScore[] {
  const matchups: MatchupScore[] = [];

  // Simple Round-Robin mit Skill-Aware Paarung
  const sorted = [...players].sort((a, b) => getSkillLevel(b) - getSkillLevel(a));

  for (let i = 0; i < sorted.length - 1; i += 2) {
    const playerA = sorted[i];
    const playerB = sorted[i + 1];
    const skillDiff = calculateSkillDifference(playerA, playerB);

    matchups.push({
      playerA: playerA.id,
      playerB: playerB.id,
      skillDifference: skillDiff,
      skillBalance: 0, // wird später gefüllt
    });
  }

  // Skill-Balance nachträglich berechnen
  matchups.forEach(m => {
    m.skillBalance = calculateSkillBalance(m);
  });

  return matchups;
}

/**
 * Game-Assignment mit Vielfalt und Suitability
 * Ordnet passende Spiele zu den Matchups zu
 */
function assignGamesToMatchups(
  matchups: MatchupScore[],
  games: Game[],
  difficultyFilter: GameComplexity | "all"
): GameAssignment[] {
  // Filtere Spiele nach Constraint
  let availableGames = games.filter(g =>
    g.inActivePool &&
    g.tournamentSuitability >= 70 &&
    (difficultyFilter === "all" || g.complexity === difficultyFilter)
  );

  // Fallback: wenn zu wenige hochwertige Spiele, nimm alle mit suitability >= 50
  if (availableGames.length < matchups.length / 2) {
    availableGames = games.filter(g =>
      g.inActivePool &&
      g.tournamentSuitability >= 50 &&
      (difficultyFilter === "all" || g.complexity === difficultyFilter)
    );
  }

  if (availableGames.length === 0) {
    throw new Error(
      "No suitable games found for bracket generation. " +
      "Add games to the active pool with suitability >= 50."
    );
  }

  const assignments: GameAssignment[] = [];
  const usedGameCounts: Record<string, number> = {};

  // Round-Robin-Zuweisung von Spielen
  matchups.forEach((matchup, idx) => {
    // Wähle Spiel mit niedrigster Häufigkeit (für Vielfalt)
    let bestGame = availableGames[0];
    let minCount = usedGameCounts[bestGame.id] || 0;

    for (const game of availableGames) {
      const count = usedGameCounts[game.id] || 0;
      if (count < minCount) {
        bestGame = game;
        minCount = count;
      }
    }

    usedGameCounts[bestGame.id] = (usedGameCounts[bestGame.id] || 0) + 1;

    assignments.push({
      matchIndex: idx,
      gameId: bestGame.id,
      suitability: bestGame.tournamentSuitability,
    });
  });

  return assignments;
}

/**
 * Haupt-Generierungsfunktion
 * Orchestriert den 3-Stufen-Prozess:
 * Stage 1: Round-Robin Matchups
 * Stage 2: Game Assignment
 * Stage 3: Optimization Pass
 */
export function generateBracket(
  input: BracketGenerationInput
): BracketGenerationOutput {
  const {
    players,
    games,
    timeBudgetMin,
    difficultyFilter,
    maxMatchesCount = 8,
    maxRoundsCount = 3,
  } = input;

  // Validation
  if (players.length < 2) {
    throw new Error("At least 2 players required for bracket generation");
  }

  if (games.length === 0) {
    throw new Error("No games available for bracket generation");
  }

  // STAGE 1: Round-Robin Matchups
  const matchups = generateBalancedMatchups(players);

  // Limit matches zu maxMatchesCount
  const limitedMatchups = matchups.slice(0, maxMatchesCount);

  // STAGE 2: Game Assignment
  const assignments = assignGamesToMatchups(limitedMatchups, games, difficultyFilter);

  // STAGE 3: Create Bracket Structure
  const matches: BracketMatch[] = limitedMatchups.map((matchup, idx) => {
    const assignment = assignments[idx];
    return {
      id: `m_1_${idx + 1}`,
      playerA: matchup.playerA,
      playerB: matchup.playerB,
      gameId: assignment.gameId,
      status: "pending" as const,
      matchId: null,
    };
  });

  const rounds: BracketRound[] = [{ roundNum: 1, matches }];

  // Scoring
  const gameMap = new Map(games.map(g => [g.id, g]));

  const balanceScore = matches.length > 0
    ? matchups.reduce((sum, m) => sum + m.skillBalance, 0) / matchups.length
    : 0;

  const entertainmentScore = calculateEntertainmentScore(assignments, gameMap);

  const { score: timeScore, estimatedMin } = calculateTimeScore(
    assignments,
    gameMap,
    timeBudgetMin
  );

  const constraintScore = calculateConstraintScore(assignments, gameMap);

  // Weighted Overall Score (§1 Prompt: 40/30/20/10)
  const overallScore =
    balanceScore * 0.4 +
    entertainmentScore * 0.3 +
    timeScore * 0.2 +
    constraintScore * 0.1;

  // Rationale
  const strategyRationale = [
    `Generated ${matches.length} matches with skill-balanced Round-Robin pairing.`,
    `Difficulty filter: ${difficultyFilter}. Time budget: ${timeBudgetMin}min (estimated ${estimatedMin}min).`,
    `Score breakdown: Balance ${(balanceScore * 100).toFixed(0)}% | Entertainment ${(entertainmentScore * 100).toFixed(0)}% | Time ${(timeScore * 100).toFixed(0)}% | Constraints ${(constraintScore * 100).toFixed(0)}%`,
    `Overall Quality Score: ${(overallScore * 100).toFixed(0)}%`,
  ].join(" ");

  const bracket: TournamentBracket = {
    id: `bracket_${Date.now()}`,
    createdAt: Date.now(),
    createdBy: "bracket-planner-agent",
    rounds,
    status: "draft",
    rationale: strategyRationale,
  };

  return {
    bracket,
    strategyRationale,
    estimatedDurationMin: estimatedMin,
    entertainmentScore: Math.round(entertainmentScore * 100) / 100,
    balanceScore: Math.round(balanceScore * 100) / 100,
    overallScore: Math.round(overallScore * 100) / 100,
  };
}

/**
 * Wrapper für SystemState Integration
 * Wird vom admin.ts Endpoint aufgerufen
 */
export function generateBracketFromState(
  state: {
    players: Player[];
    games: Game[];
  },
  options: {
    timeBudgetMin: number;
    difficultyFilter: GameComplexity | "all";
  }
): BracketGenerationOutput {
  const activePlayers = state.players.filter(
    p => p.role === "Spieler" && p.activeTracks.includes("TOURNAMENT")
  );

  const activeGames = state.games.filter(g => g.inActivePool);

  if (activePlayers.length < 2) {
    throw new Error("At least 2 active tournament players required");
  }

  if (activeGames.length === 0) {
    throw new Error("No games available in active pool");
  }

  return generateBracket({
    players: activePlayers,
    games: activeGames,
    timeBudgetMin: options.timeBudgetMin,
    difficultyFilter: options.difficultyFilter,
  });
}
