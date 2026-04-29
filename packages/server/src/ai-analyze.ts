// §15 AI Game Pre-Analysis — lokale Heuristik (kein externer Call ohne README-Vorgabe).
// Setzt sinnvolle Defaults pro Tag; kann vom Admin manuell „Re-Analyzed" werden.

import type { Game, GameComplexity, GameMode, GameTag } from "@lan-os/shared";

interface TagDefaults {
  avgDurationMin: number;
  recommendedPlayers: { min: number; max: number };
  suitableModes: GameMode[];
  complexity: GameComplexity;
  tournamentSuitability: number;
  chaosPotential: number;
}

const TAG_DEFAULTS: Record<GameTag, TagDefaults> = {
  FPS: {
    avgDurationMin: 25,
    recommendedPlayers: { min: 2, max: 10 },
    suitableModes: ["1v1", "2v2", "team"],
    complexity: "hardcore",
    tournamentSuitability: 90,
    chaosPotential: 30,
  },
  Sport: {
    avgDurationMin: 12,
    recommendedPlayers: { min: 2, max: 8 },
    suitableModes: ["1v1", "2v2", "team"],
    complexity: "medium",
    tournamentSuitability: 85,
    chaosPotential: 50,
  },
  Tactical: {
    avgDurationMin: 30,
    recommendedPlayers: { min: 2, max: 10 },
    suitableModes: ["2v2", "team"],
    complexity: "hardcore",
    tournamentSuitability: 88,
    chaosPotential: 25,
  },
  RTS: {
    avgDurationMin: 45,
    recommendedPlayers: { min: 2, max: 4 },
    suitableModes: ["1v1", "2v2"],
    complexity: "hardcore",
    tournamentSuitability: 80,
    chaosPotential: 20,
  },
  Sandbox: {
    avgDurationMin: 30,
    recommendedPlayers: { min: 1, max: 8 },
    suitableModes: ["team", "ffa"],
    complexity: "casual",
    tournamentSuitability: 50,
    chaosPotential: 70,
  },
  BattleRoyale: {
    avgDurationMin: 25,
    recommendedPlayers: { min: 2, max: 8 },
    suitableModes: ["ffa", "team"],
    complexity: "medium",
    tournamentSuitability: 75,
    chaosPotential: 75,
  },
  Coop: {
    avgDurationMin: 40,
    recommendedPlayers: { min: 2, max: 6 },
    suitableModes: ["team"],
    complexity: "medium",
    tournamentSuitability: 40,
    chaosPotential: 40,
  },
  Arena: {
    avgDurationMin: 12,
    recommendedPlayers: { min: 2, max: 8 },
    suitableModes: ["1v1", "ffa", "team"],
    complexity: "medium",
    tournamentSuitability: 90,
    chaosPotential: 60,
  },
  Party: {
    avgDurationMin: 10,
    recommendedPlayers: { min: 3, max: 8 },
    suitableModes: ["ffa", "team"],
    complexity: "casual",
    tournamentSuitability: 65,
    chaosPotential: 95,
  },
  Survival: {
    avgDurationMin: 60,
    recommendedPlayers: { min: 1, max: 6 },
    suitableModes: ["team"],
    complexity: "medium",
    tournamentSuitability: 30,
    chaosPotential: 55,
  },
  Strategy: {
    avgDurationMin: 50,
    recommendedPlayers: { min: 2, max: 4 },
    suitableModes: ["1v1", "2v2"],
    complexity: "hardcore",
    tournamentSuitability: 78,
    chaosPotential: 25,
  },
  Competitive: {
    avgDurationMin: 20,
    recommendedPlayers: { min: 2, max: 10 },
    suitableModes: ["1v1", "team"],
    complexity: "hardcore",
    tournamentSuitability: 95,
    chaosPotential: 35,
  },
};

export function analyzeGame(game: Game): Game {
  const d = TAG_DEFAULTS[game.tag];
  return {
    ...game,
    avgDurationMin: d.avgDurationMin,
    recommendedPlayers: d.recommendedPlayers,
    suitableModes: d.suitableModes,
    complexity: d.complexity,
    tournamentSuitability: d.tournamentSuitability,
    chaosPotential: d.chaosPotential,
    aiAnalyzed: true,
  };
}
