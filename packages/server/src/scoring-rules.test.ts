/**
 * Test Suite für Scoring Rules Generator
 *
 * Spec: /home/user/LAN-OS/.claude/Game Agent Prompts.md §2 + §4
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  generateScoringRules,
  generateTestScenarios,
  type GenerateScoringRulesInput,
} from "./scoring-rules.js";

describe("Scoring Rules Generator", () => {
  describe("FPS Games", () => {
    it("should generate FPS 2v2 with kill focus", () => {
      const input: GenerateScoringRulesInput = {
        gameTag: "FPS",
        gameTitle: "Counter-Strike 2",
        playerMode: "2v2",
        avgDurationMin: 25,
        complexity: "hardcore",
      };

      const output = generateScoringRules(input);

      expect(output.scoringRules).toHaveLength(5);
      expect(output.scoringRules[0].action).toBe("Kill");
      expect(output.scoringRules[0].points).toBe(5);
      expect(output.scoringRules[1].action).toBe("Assist");
      expect(output.scoringRules[1].points).toBe(3);
      expect(output.scoringRules[4].action).toBe("Death");
      expect(output.scoringRules[4].points).toBe(-1);
      expect(output.modifierMultiplier).toBe(1.0);
      expect(output.appliesTo).toBe("match");
      expect(output.balanceNotes).toContain("Kills are primary metric");
    });

    it("should apply 1.5x hardcore modifier to FPS", () => {
      const input: GenerateScoringRulesInput = {
        gameTag: "FPS",
        gameTitle: "Counter-Strike 2",
        playerMode: "1v1",
        avgDurationMin: 15,
        complexity: "hardcore",
        modifiers: ["hardcore_1.5x_multiplier"],
      };

      const output = generateScoringRules(input);

      const kill = output.scoringRules.find((r) => r.action === "Kill");
      expect(kill?.points).toBe(8); // 5 * 1.5 = 7.5 → 8

      const assist = output.scoringRules.find((r) => r.action === "Assist");
      expect(assist?.points).toBe(5); // 3 * 1.5 = 4.5 → 5

      // Death bleibt -1 (nicht multipliziert)
      const death = output.scoringRules.find((r) => r.action === "Death");
      expect(death?.points).toBe(-1);

      expect(output.modifierMultiplier).toBe(1.5);
      expect(output.balanceNotes).toContain("1.5x multiplier");
    });
  });

  describe("Sport Games", () => {
    it("should generate Sport game with goal focus", () => {
      const input: GenerateScoringRulesInput = {
        gameTag: "Sport",
        gameTitle: "Rocket League",
        playerMode: "team",
        avgDurationMin: 20,
        complexity: "medium",
      };

      const output = generateScoringRules(input);

      const goal = output.scoringRules.find((r) => r.action === "Goal");
      expect(goal?.points).toBe(15);

      const assist = output.scoringRules.find((r) => r.action === "Assist");
      expect(assist?.points).toBe(8); // 50% of goal

      const save = output.scoringRules.find((r) => r.action === "Save");
      expect(save?.points).toBe(5);

      expect(output.balanceNotes).toContain("Goals are dominant");
      expect(output.balanceNotes).toContain("Assists and Defense");
    });
  });

  describe("Party Games", () => {
    it("should generate Party game with flat win, no loss penalty", () => {
      const input: GenerateScoringRulesInput = {
        gameTag: "Party",
        gameTitle: "Among Us",
        playerMode: "team",
        avgDurationMin: 15,
        complexity: "casual",
      };

      const output = generateScoringRules(input);

      const win = output.scoringRules.find((r) => r.action === "Win");
      expect(win?.points).toBe(50);

      const mvp = output.scoringRules.find((r) => r.action === "MVP");
      expect(mvp?.points).toBe(10);

      // Party games sollten NO negative Penalties haben
      const negatives = output.scoringRules.filter((r) => r.points < 0);
      expect(negatives).toHaveLength(0);

      expect(output.balanceNotes).toContain("no individual loss");
    });
  });

  describe("Strategy Games", () => {
    it("should generate Strategy game with complex metrics", () => {
      const input: GenerateScoringRulesInput = {
        gameTag: "Strategy",
        gameTitle: "Age of Empires IV",
        playerMode: "1v1",
        avgDurationMin: 45,
        complexity: "hardcore",
      };

      const output = generateScoringRules(input);

      const objective = output.scoringRules.find((r) => r.action === "Objective");
      expect(objective?.points).toBe(10);

      const economy = output.scoringRules.find((r) => r.action === "Economy");
      expect(economy?.points).toBe(1);

      const timeBonus = output.scoringRules.find(
        (r) => r.action === "Time-Bonus"
      );
      expect(timeBonus?.points).toBe(10);

      expect(output.balanceNotes).toContain("Economy");
    });
  });

  describe("Modifier Application", () => {
    it("should clamp extreme modifiers to [0.75, 2.0]", () => {
      const input: GenerateScoringRulesInput = {
        gameTag: "FPS",
        gameTitle: "Test Game",
        playerMode: "1v1",
        avgDurationMin: 20,
        complexity: "hardcore",
        modifiers: ["extreme_5x_multiplier"], // Should be clamped
      };

      const output = generateScoringRules(input);

      // Even if modifier is 5x, it should be clamped to 2.0
      expect(output.modifierMultiplier).toBeLessThanOrEqual(2.0);
      expect(output.modifierMultiplier).toBeGreaterThanOrEqual(0.75);
    });

    it("should apply double points correctly", () => {
      const input: GenerateScoringRulesInput = {
        gameTag: "Arena",
        gameTitle: "Halo",
        playerMode: "team",
        avgDurationMin: 30,
        complexity: "hardcore",
        modifiers: ["ch-double"],
      };

      const output = generateScoringRules(input);

      const kill = output.scoringRules.find((r) => r.action === "Kill");
      expect(kill?.points).toBe(10); // 5 * 2

      expect(output.modifierMultiplier).toBe(2.0);
    });

    it("should apply casual 0.75x modifier", () => {
      const input: GenerateScoringRulesInput = {
        gameTag: "FPS",
        gameTitle: "Counter-Strike 2",
        playerMode: "2v2",
        avgDurationMin: 25,
        complexity: "casual",
        modifiers: ["rr-casual"],
      };

      const output = generateScoringRules(input);

      const kill = output.scoringRules.find((r) => r.action === "Kill");
      expect(kill?.points).toBe(4); // 5 * 0.75 = 3.75 → 4

      expect(output.modifierMultiplier).toBe(0.75);
    });
  });

  describe("Arena Games", () => {
    it("should generate Arena game with streak bonus", () => {
      const input: GenerateScoringRulesInput = {
        gameTag: "Arena",
        gameTitle: "Halo Infinite",
        playerMode: "team",
        avgDurationMin: 30,
        complexity: "hardcore",
      };

      const output = generateScoringRules(input);

      const streak = output.scoringRules.find((r) => r.action === "Streak");
      expect(streak?.points).toBe(10);

      const kill = output.scoringRules.find((r) => r.action === "Kill");
      expect(kill?.points).toBe(5);
    });
  });

  describe("Sandbox Games", () => {
    it("should generate Sandbox game with progress metrics", () => {
      const input: GenerateScoringRulesInput = {
        gameTag: "Sandbox",
        gameTitle: "Minecraft",
        playerMode: "ffa",
        avgDurationMin: null,
        complexity: "casual",
      };

      const output = generateScoringRules(input);

      const progress = output.scoringRules.find((r) => r.action === "Progress");
      expect(progress?.points).toBe(1);

      const structure = output.scoringRules.find(
        (r) => r.action === "Structure-Complete"
      );
      expect(structure?.points).toBe(20);

      expect(output.balanceNotes).toContain("Progress-based");
    });
  });

  describe("Survival Games", () => {
    it("should generate Survival game with time-based rewards", () => {
      const input: GenerateScoringRulesInput = {
        gameTag: "Survival",
        gameTitle: "DayZ",
        playerMode: "ffa",
        avgDurationMin: null,
        complexity: "hardcore",
      };

      const output = generateScoringRules(input);

      const survivalMin = output.scoringRules.find(
        (r) => r.action === "Survival-Minute"
      );
      expect(survivalMin?.points).toBe(1);

      const challenge = output.scoringRules.find(
        (r) => r.action === "Challenge-Completed"
      );
      expect(challenge?.points).toBe(20);

      const death = output.scoringRules.find((r) => r.action === "Death");
      expect(death?.points).toBe(-5); // Slightly higher penalty for survival
    });
  });

  describe("Battle Royale Games", () => {
    it("should generate BR game with placement rewards", () => {
      const input: GenerateScoringRulesInput = {
        gameTag: "BattleRoyale",
        gameTitle: "Warzone",
        playerMode: "team",
        avgDurationMin: 25,
        complexity: "medium",
      };

      const output = generateScoringRules(input);

      const survival = output.scoringRules.find(
        (r) => r.action === "Survival-Minute"
      );
      expect(survival?.points).toBe(1);

      const top10 = output.scoringRules.find((r) => r.action === "Top10");
      expect(top10?.points).toBe(10);

      const victory = output.scoringRules.find((r) => r.action === "Victory");
      expect(victory?.points).toBe(50);
    });
  });

  describe("Fallback & Error Handling", () => {
    it("should fallback to Competitive rules for unknown GameTag", () => {
      const input: GenerateScoringRulesInput = {
        gameTag: "UnknownTag" as any,
        gameTitle: "Mystery Game",
        playerMode: "1v1",
        avgDurationMin: 30,
        complexity: "medium",
      };

      const output = generateScoringRules(input);

      // Should still generate something valid
      expect(output.scoringRules.length).toBeGreaterThan(0);
      expect(output.balanceNotes).toContain("Generic skill-based");
      expect(output.appliesTo).toBe("match");
    });

    it("should warn about short game duration", () => {
      const input: GenerateScoringRulesInput = {
        gameTag: "FPS",
        gameTitle: "Quick Game",
        playerMode: "1v1",
        avgDurationMin: 5, // Too short
        complexity: "casual",
      };

      const output = generateScoringRules(input);

      expect(output.balanceNotes).toContain("Warning");
      expect(output.balanceNotes).toContain("very short");
    });
  });

  describe("Test Scenarios", () => {
    it("should have valid test scenarios", () => {
      const scenarios = generateTestScenarios();

      expect(scenarios.length).toBeGreaterThan(0);

      scenarios.forEach((scenario) => {
        const output = generateScoringRules(scenario.input);

        expect(output.scoringRules).toBeDefined();
        expect(output.scoringRules.length).toBeGreaterThan(0);
        expect(output.balanceNotes).toBeDefined();
        expect(output.balanceNotes.length).toBeGreaterThan(0);
        expect(output.modifierMultiplier).toBeGreaterThanOrEqual(0.75);
        expect(output.modifierMultiplier).toBeLessThanOrEqual(2.0);

        // Verify all rules have points
        output.scoringRules.forEach((rule) => {
          expect(rule.action).toBeDefined();
          expect(typeof rule.points).toBe("number");
        });
      });
    });
  });

  describe("Assist-to-Primary Ratio", () => {
    it("FPS: Assist should be 30-50% of Kill", () => {
      const input: GenerateScoringRulesInput = {
        gameTag: "FPS",
        gameTitle: "CS2",
        playerMode: "2v2",
        avgDurationMin: 25,
        complexity: "hardcore",
      };

      const output = generateScoringRules(input);

      const kill = output.scoringRules.find((r) => r.action === "Kill");
      const assist = output.scoringRules.find((r) => r.action === "Assist");

      if (kill && assist) {
        const ratio = assist.points / kill.points;
        expect(ratio).toBeGreaterThanOrEqual(0.3);
        expect(ratio).toBeLessThanOrEqual(0.5);
      }
    });

    it("Sport: Assist should be 50% of Goal", () => {
      const input: GenerateScoringRulesInput = {
        gameTag: "Sport",
        gameTitle: "Rocket League",
        playerMode: "team",
        avgDurationMin: 20,
        complexity: "medium",
      };

      const output = generateScoringRules(input);

      const goal = output.scoringRules.find((r) => r.action === "Goal");
      const assist = output.scoringRules.find((r) => r.action === "Assist");

      if (goal && assist) {
        const ratio = assist.points / goal.points;
        expect(ratio).toBeCloseTo(0.5, 0.1);
      }
    });
  });

  describe("Determinism", () => {
    it("should generate same output for same input", () => {
      const input: GenerateScoringRulesInput = {
        gameTag: "FPS",
        gameTitle: "Counter-Strike 2",
        playerMode: "2v2",
        avgDurationMin: 25,
        complexity: "hardcore",
        modifiers: ["hardcore_1.5x_multiplier"],
      };

      const output1 = generateScoringRules(input);
      const output2 = generateScoringRules(input);

      expect(JSON.stringify(output1)).toBe(JSON.stringify(output2));
    });
  });
});
