/**
 * Scoring Rules Generator — Game-Balance-Engineering
 * Generiert faire und unterhaltsame Scoring-Regeln für verschiedene Game-Tags
 *
 * Spec: /home/user/LAN-OS/.claude/Game Agent Prompts.md §2
 */

import type { GameTag, GameComplexity, MatchType, ScoringRule } from "@lan-os/shared";

/** Input für die Scoring Rules Generation */
export interface GenerateScoringRulesInput {
  gameTag: GameTag;
  gameTitle: string;
  playerMode: MatchType;
  avgDurationMin: number | null;
  complexity: GameComplexity;
  modifiers?: string[];
}

/** Output der Scoring Rules Generation */
export interface GenerateScoringRulesOutput {
  scoringRules: ScoringRule[];
  balanceNotes: string;
  modifierMultiplier: number;
  appliesTo: "match";
}

/**
 * Base Scoring Rules pro Game-Tag
 * Deterministic, konstante Regeln die nicht randomisiert werden
 */
const SCORING_RULES_BY_TAG: Record<GameTag, ScoringRule[]> = {
  // First-Person Shooter: Kills dominant, Assists wichtig für Teamwork
  FPS: [
    {
      action: "Kill",
      points: 5,
      description: "Primary scoring mechanic for FPS games",
    },
    {
      action: "Assist",
      points: 3,
      description: "Team cooperation bonus (30-50% of kill)",
    },
    {
      action: "Headshot",
      points: 5,
      description: "Skill multiplier bonus on top of kill",
    },
    {
      action: "Objective",
      points: 10,
      description: "Plant bomb/defuse/objective action",
    },
    {
      action: "Death",
      points: -1,
      description: "Minimal penalty to encourage aggressive play",
    },
  ],

  // Tactical Shooters (Valorant, etc): Ähnlich wie FPS aber mehr Economy/Ult
  Tactical: [
    {
      action: "Kill",
      points: 5,
      description: "Primary elimination metric",
    },
    {
      action: "Assist",
      points: 3,
      description: "Team support bonus",
    },
    {
      action: "Ultimate-Ability",
      points: 8,
      description: "Skill cooldown usage",
    },
    {
      action: "Site-Plant",
      points: 10,
      description: "Objective completion",
    },
    {
      action: "Death",
      points: -1,
      description: "Minimal penalty",
    },
  ],

  // Sport Games: Goals sind alles, aber Assists + Defense wichtig
  Sport: [
    {
      action: "Goal",
      points: 15,
      description: "Primary scoring action",
    },
    {
      action: "Assist",
      points: 8,
      description: "Support for goal (50% of primary)",
    },
    {
      action: "Save",
      points: 5,
      description: "Defensive action (goalkeeper/defender)",
    },
    {
      action: "Possession-Minute",
      points: 2,
      description: "Time-based bonus per 5 min possession",
    },
  ],

  // Battle Royale: Survival + Kills + Placement
  BattleRoyale: [
    {
      action: "Kill",
      points: 5,
      description: "Combat elimination",
    },
    {
      action: "Survival-Minute",
      points: 1,
      description: "Time alive bonus (1 per minute)",
    },
    {
      action: "Top10",
      points: 10,
      description: "Top 10 finish bonus",
    },
    {
      action: "Victory",
      points: 50,
      description: "Match victory",
    },
  ],

  // Party/Chaos Games: Win flat, kein negativ
  Party: [
    {
      action: "Win",
      points: 50,
      description: "Team victory (flat bonus for all)",
    },
    {
      action: "MVP",
      points: 10,
      description: "Best player bonus (determined by vote/admin)",
    },
    {
      action: "Funny-Play",
      points: 5,
      description: "Good social play bonus",
    },
  ],

  // Strategy/RTS: Komplexe Metriken mit Ressourcen + Zeit
  Strategy: [
    {
      action: "Objective",
      points: 10,
      description: "Building destroyed / objective completed",
    },
    {
      action: "Economy",
      points: 1,
      description: "1 point per 100 resources gathered",
    },
    {
      action: "Time-Bonus",
      points: 10,
      description: "Speed bonus for early victory",
    },
    {
      action: "Tech-Advancement",
      points: 5,
      description: "Tech tree progression bonus",
    },
  ],

  // RTS (Real-Time Strategy): Alias für Strategy
  RTS: [
    {
      action: "Objective",
      points: 10,
      description: "Building destroyed / objective completed",
    },
    {
      action: "Economy",
      points: 1,
      description: "1 point per 100 resources gathered",
    },
    {
      action: "Time-Bonus",
      points: 10,
      description: "Speed bonus for early victory",
    },
    {
      action: "Tech-Advancement",
      points: 5,
      description: "Tech tree progression bonus",
    },
  ],

  // Sandbox/Creative: Progress-based scoring
  Sandbox: [
    {
      action: "Progress",
      points: 1,
      description: "1 point per block placed/mined",
    },
    {
      action: "Structure-Complete",
      points: 20,
      description: "Large structure completed",
    },
    {
      action: "Creativity-Bonus",
      points: 15,
      description: "Unique/aesthetic build bonus",
    },
  ],

  // Survival Games: Time alive + Resources
  Survival: [
    {
      action: "Survival-Minute",
      points: 1,
      description: "1 point per minute alive",
    },
    {
      action: "Resource-Gathered",
      points: 1,
      description: "1 point per significant resource",
    },
    {
      action: "Challenge-Completed",
      points: 20,
      description: "Special survival objective",
    },
    {
      action: "Death",
      points: -5,
      description: "Minimal penalty for death",
    },
  ],

  // Arena Games: Fast-paced, elimination-focused
  Arena: [
    {
      action: "Kill",
      points: 5,
      description: "Combat elimination",
    },
    {
      action: "Streak",
      points: 10,
      description: "3+ kills without death",
    },
    {
      action: "Objective",
      points: 8,
      description: "Arena objective (flag, rune, etc)",
    },
    {
      action: "Death",
      points: -1,
      description: "Minimal penalty",
    },
  ],

  // Cooperative games: Team success, no individual loss
  Coop: [
    {
      action: "Team-Win",
      points: 50,
      description: "Mission completed together",
    },
    {
      action: "Role-Objective",
      points: 10,
      description: "Class-specific objective",
    },
    {
      action: "Support-Action",
      points: 5,
      description: "Revive/heal/buff teammate",
    },
  ],

  // Competitive (Generic fallback)
  Competitive: [
    {
      action: "Win",
      points: 100,
      description: "Match victory",
    },
    {
      action: "Score-Diff-Bonus",
      points: 25,
      description: "5+ point margin bonus",
    },
    {
      action: "Loss",
      points: 10,
      description: "Participation points",
    },
  ],
};

/**
 * Extractiert Multiplikatoren aus Modifier-Array
 *
 * Bekannte Modifiers:
 * - "hardcore_1.5x_multiplier" → 1.5
 * - "casual_0.75x" → 0.75
 * - "double_points" / "ch-double" → 2.0
 */
function extractModifierMultiplier(modifiers?: string[]): number {
  if (!modifiers || modifiers.length === 0) return 1.0;

  for (const mod of modifiers) {
    // Format: "hardcore_1.5x_multiplier" oder "rr-hardcore"
    if (mod.includes("2")) return clampMultiplier(2.0);
    if (mod.includes("1.5") || mod.includes("hardcore")) {
      return clampMultiplier(1.5);
    }
    if (mod.includes("0.75") || mod.includes("casual")) {
      return clampMultiplier(0.75);
    }
    if (mod.includes("double")) return clampMultiplier(2.0);
  }

  return 1.0;
}

/**
 * Clamp Multiplikatoren zu safety range [0.75, 2.0]
 */
function clampMultiplier(multiplier: number): number {
  return Math.max(0.75, Math.min(2.0, multiplier));
}

/**
 * Rundet Punkte intelligent
 * 5 * 1.5 = 7.5 → 8 (aufrunden)
 * 3 * 1.5 = 4.5 → 5 (aufrunden)
 */
function roundPoints(points: number): number {
  return Math.round(points);
}

/**
 * Appliziert Modifier Multiplikatoren auf Scoring Rules
 * WICHTIG: Death-Penalty wird nicht multipliziert (bleibt hart)
 */
function applyModifierMultiplier(
  rules: ScoringRule[],
  multiplier: number
): ScoringRule[] {
  if (multiplier === 1.0) return rules;

  return rules.map((rule) => {
    // Death-Penalty wird nicht multipliziert
    if (rule.action === "Death" || rule.points < 0) {
      return rule; // Unverändert
    }

    return {
      ...rule,
      points: roundPoints(rule.points * multiplier),
    };
  });
}

/**
 * Warnt bei ungültigen Eingaben
 */
function validateInput(input: GenerateScoringRulesInput): string[] {
  const warnings: string[] = [];

  if (!input.gameTitle || input.gameTitle.trim() === "") {
    warnings.push("Warning: gameTitle is empty, using generic rules");
  }

  if (input.avgDurationMin !== null && input.avgDurationMin < 10) {
    warnings.push(
      `Warning: Game duration (${input.avgDurationMin}min) is very short, scoring might be compressed`
    );
  }

  return warnings;
}

/**
 * Generiert Scoring Rules basierend auf Game-Tag, Complexity, etc.
 *
 * Input:
 *   - gameTag: FPS, Sport, Party, etc.
 *   - gameTitle: "Counter-Strike 2", "Rocket League", etc.
 *   - playerMode: 1v1, 2v2, team, ffa
 *   - avgDurationMin: durchschnittliche Spieldauer
 *   - complexity: casual, medium, hardcore
 *   - modifiers: ["hardcore_1.5x_multiplier", ...]
 *
 * Output:
 *   - scoringRules: array of ScoringRule
 *   - balanceNotes: Erklärung der Regeln
 *   - modifierMultiplier: angewendeter Multiplikatoren
 *
 * Fallback: Wenn GameTag unknown → generische Skill-Based Rules
 */
export function generateScoringRules(
  input: GenerateScoringRulesInput
): GenerateScoringRulesOutput {
  const warnings = validateInput(input);

  // Hole Base-Rules für diesen Game-Tag
  let baseRules = SCORING_RULES_BY_TAG[input.gameTag];

  // Fallback für unknown GameTag
  if (!baseRules) {
    console.warn(`Unknown GameTag: ${input.gameTag}, using Competitive fallback`);
    baseRules = SCORING_RULES_BY_TAG.Competitive;
  }

  // Extrahiere Modifier-Multiplikatoren
  const modifierMultiplier = extractModifierMultiplier(input.modifiers);

  // Appliziere Modifier auf die Regeln
  const finalRules = applyModifierMultiplier(baseRules, modifierMultiplier);

  // Generiere Balance-Notes basierend auf Kontext
  const balanceNotes = generateBalanceNotes(
    input.gameTag,
    input.complexity,
    modifierMultiplier,
    input.playerMode,
    warnings
  );

  return {
    scoringRules: finalRules,
    balanceNotes,
    modifierMultiplier,
    appliesTo: "match",
  };
}

/**
 * Generiert Human-Readable Balance-Erklärung
 */
function generateBalanceNotes(
  gameTag: GameTag,
  complexity: GameComplexity,
  modifierMultiplier: number,
  playerMode: MatchType,
  warnings: string[]
): string {
  const parts: string[] = [];

  // Basis-Erklärung pro Game-Tag
  switch (gameTag) {
    case "FPS":
      parts.push(
        "Kills are primary metric, Assists encourage teamwork (30% of kill value)"
      );
      parts.push("Headshots reward precision play");
      parts.push("Minimal death penalty (-1) to encourage aggressive gameplay");
      break;

    case "Tactical":
      parts.push("Elimination-focused with tactical cooldown rewards");
      parts.push("Site objectives (plant/defuse) worth 2x elimination");
      break;

    case "Sport":
      parts.push("Goals are dominant metric, Assists and Defense support");
      parts.push(
        "Possession-time provides consistent passive scoring opportunity"
      );
      break;

    case "BattleRoyale":
      parts.push("Survival time generates passive points (1 per minute)");
      parts.push(
        "Kills and top-10 placements provide multipliers on base score"
      );
      break;

    case "Party":
      parts.push(
        "Team victory (50pts) is flat, no individual loss penalties"
      );
      parts.push("MVP bonus (+10) for standout social play");
      parts.push("Designed for fun, not hardcore competition");
      break;

    case "Strategy":
      parts.push(
        "Economy (resources) provides steady income (1 pt per 100 res)"
      );
      parts.push("Objectives worth 10pts, Time-Bonus rewards early victory");
      parts.push("Tech progression incentivizes diverse strategies");
      break;

    case "Sandbox":
      parts.push("Progress-based (1 pt per block) for long-form gameplay");
      parts.push(
        "Structure completion (20pts) and Creativity (15pts) encourage building"
      );
      break;

    case "Survival":
      parts.push("Survival-time (1 pt/min) is core mechanic");
      parts.push("Resource gathering provides steady points");
      parts.push("Challenge completion (20pts) for milestone objectives");
      break;

    case "Arena":
      parts.push("Fast-paced elimination scoring (5pts per kill)");
      parts.push(
        "Streaks (10pts for 3+ kills) reward momentum and skill chains"
      );
      break;

    case "Coop":
      parts.push("Team-based win (50pts) with no individual loss");
      parts.push(
        "Role-specific objectives (10pts) encourage class diversity"
      );
      break;

    default:
      parts.push(
        "Generic skill-based rules: wins, score differential, participation"
      );
  }

  // Mode-spezifische Notizen
  if (playerMode === "1v1") {
    parts.push(`Mode: 1v1 — individual skill paramount`);
  } else if (playerMode === "2v2") {
    parts.push(`Mode: 2v2 — balanced team/individual contributions`);
  } else if (playerMode === "team") {
    parts.push(`Mode: Team — collective success rewarded`);
  } else if (playerMode === "ffa") {
    parts.push(`Mode: FFA — every player for themselves`);
  }

  // Complexity-Modulation
  if (complexity === "hardcore") {
    parts.push(`Complexity: Hardcore — skill ceiling high`);
  } else if (complexity === "casual") {
    parts.push(`Complexity: Casual — accessible to all`);
  } else {
    parts.push(`Complexity: Medium — balanced skill expression`);
  }

  // Modifier-Info
  if (modifierMultiplier !== 1.0) {
    parts.push(
      `Modifier Applied: ${modifierMultiplier}x multiplier (${modifierMultiplier > 1 ? "increases" : "decreases"} all points except death penalties)`
    );
  }

  // Warnungen
  if (warnings.length > 0) {
    parts.push(`Warnings: ${warnings.join("; ")}`);
  }

  return parts.join("\n");
}

/**
 * Test Helper: Generiert Rules für verschiedene Scenarios
 */
export function generateTestScenarios(): Array<{
  input: GenerateScoringRulesInput;
  name: string;
}> {
  return [
    {
      name: "FPS 2v2 Standard",
      input: {
        gameTag: "FPS",
        gameTitle: "Counter-Strike 2",
        playerMode: "2v2",
        avgDurationMin: 25,
        complexity: "hardcore",
      },
    },
    {
      name: "FPS 1v1 Hardcore 1.5x",
      input: {
        gameTag: "FPS",
        gameTitle: "Counter-Strike 2",
        playerMode: "1v1",
        avgDurationMin: 15,
        complexity: "hardcore",
        modifiers: ["hardcore_1.5x_multiplier"],
      },
    },
    {
      name: "Sport Team",
      input: {
        gameTag: "Sport",
        gameTitle: "Rocket League",
        playerMode: "team",
        avgDurationMin: 20,
        complexity: "medium",
      },
    },
    {
      name: "Party Game Casual",
      input: {
        gameTag: "Party",
        gameTitle: "Among Us",
        playerMode: "team",
        avgDurationMin: 15,
        complexity: "casual",
      },
    },
    {
      name: "Strategy RTS 1v1",
      input: {
        gameTag: "Strategy",
        gameTitle: "Age of Empires IV",
        playerMode: "1v1",
        avgDurationMin: 45,
        complexity: "hardcore",
      },
    },
    {
      name: "Survival with Casual Modifier",
      input: {
        gameTag: "Survival",
        gameTitle: "Minecraft",
        playerMode: "ffa",
        avgDurationMin: null,
        complexity: "casual",
        modifiers: ["rr-casual"],
      },
    },
    {
      name: "Unknown GameTag Fallback",
      input: {
        gameTag: "UnknownTag" as GameTag,
        gameTitle: "Unknown Game",
        playerMode: "1v1",
        avgDurationMin: 20,
        complexity: "medium",
      },
    },
    {
      name: "Double Points Chaos",
      input: {
        gameTag: "Arena",
        gameTitle: "Halo",
        playerMode: "team",
        avgDurationMin: 30,
        complexity: "hardcore",
        modifiers: ["ch-double"],
      },
    },
  ];
}
