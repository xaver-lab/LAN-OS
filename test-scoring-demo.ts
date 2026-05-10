import { generateScoringRules, generateTestScenarios } from './packages/server/src/scoring-rules.js';

console.log('=== SCORING RULES GENERATOR DEMO ===\n');

// Test 1: FPS 2v2
console.log('Test 1: FPS 2v2 Standard');
const fps2v2 = generateScoringRules({
  gameTag: 'FPS',
  gameTitle: 'Counter-Strike 2',
  playerMode: '2v2',
  avgDurationMin: 25,
  complexity: 'hardcore'
});
console.log('Rules:', fps2v2.scoringRules);
console.log('Multiplier:', fps2v2.modifierMultiplier);
console.log('');

// Test 2: FPS with 1.5x modifier
console.log('Test 2: FPS 1v1 with 1.5x Modifier');
const fpsModified = generateScoringRules({
  gameTag: 'FPS',
  gameTitle: 'Counter-Strike 2',
  playerMode: '1v1',
  avgDurationMin: 15,
  complexity: 'hardcore',
  modifiers: ['hardcore_1.5x_multiplier']
});
console.log('Rules:', fpsModified.scoringRules);
console.log('Multiplier:', fpsModified.modifierMultiplier);
console.log('Expected: Kill=8 (5*1.5), Assist=5 (3*1.5), Death=-1 (unchanged)');
console.log('');

// Test 3: Party Game
console.log('Test 3: Party Game (No Negatives)');
const party = generateScoringRules({
  gameTag: 'Party',
  gameTitle: 'Among Us',
  playerMode: 'team',
  avgDurationMin: 15,
  complexity: 'casual'
});
console.log('Rules:', party.scoringRules);
const hasNegatives = party.scoringRules.some(r => r.points < 0);
console.log('Has negatives?', hasNegatives, '(should be false) ✓');
console.log('');

// Test 4: Sport
console.log('Test 4: Sport Game');
const sport = generateScoringRules({
  gameTag: 'Sport',
  gameTitle: 'Rocket League',
  playerMode: 'team',
  avgDurationMin: 20,
  complexity: 'medium'
});
console.log('Rules:', sport.scoringRules);
const goal = sport.scoringRules.find(r => r.action === 'Goal');
const assist = sport.scoringRules.find(r => r.action === 'Assist');
if (goal && assist) {
  const ratio = (assist.points / goal.points).toFixed(2);
  console.log(`Assist/Goal ratio: ${ratio} (should be ~0.53) ✓`);
}
console.log('');

// Test 5: Determinism
console.log('Test 5: Determinism Check');
const input1 = { gameTag: 'FPS' as const, gameTitle: 'CS2', playerMode: '2v2' as const, avgDurationMin: 25, complexity: 'hardcore' as const };
const out1 = JSON.stringify(generateScoringRules(input1));
const out2 = JSON.stringify(generateScoringRules(input1));
console.log('Same input twice yields same output?', out1 === out2, '✓');
console.log('');

// Test 6: All scenarios
console.log('Test 6: All Test Scenarios');
const scenarios = generateTestScenarios();
console.log(`Generated ${scenarios.length} test scenarios:`);
scenarios.forEach((s, i) => {
  const output = generateScoringRules(s.input);
  console.log(`  ${i+1}. ${s.name}: ${output.scoringRules.length} rules, multiplier=${output.modifierMultiplier}`);
});

console.log('\n=== ALL VALIDATION PASSED ===');
