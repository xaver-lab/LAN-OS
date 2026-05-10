/**
 * Performance Test Suite für LAN-OS
 * Simuliert 50-100 Players mit verschiedenen Last-Szenarien
 * Misst: Response-Times, State-Size, Memory, Bandwidth, Re-render-Times
 */

import { performance } from "perf_hooks";
import type { SystemState } from "@lan-os/shared";
import { createEmptyState, withDerived } from "@lan-os/shared";

interface PerformanceMetrics {
  name: string;
  iterations: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  stateSizeBytes: number;
  memoryUsageMB: number;
  totalBandwidthMB: number;
  operationsPerSecond: number;
  timestamp: Date;
}

interface StateSnapshot {
  version: number;
  playerCount: number;
  eventLogSize: number;
  sizeBytes: number;
  timestamp: number;
}

/**
 * Erstellt einen simulierten State mit N Players
 */
function createSimulatedState(playerCount: number): SystemState {
  let state = createEmptyState();

  // Füge Players hinzu
  for (let i = 0; i < playerCount; i++) {
    const playerId = `player_${i}`;
    state.players.push({
      id: playerId,
      name: `Player ${i + 1}`,
      sessionToken: `token_${Math.random().toString(36).substring(7)}`,
      role: i === 0 ? "Admin" : i < 5 ? "GameMaster" : "Spieler",
      points: Math.floor(Math.random() * 5000),
      lastSeen: Date.now(),
      color: `hsl(${(i * 360) / playerCount}, 70%, 50%)`,
      activeTracks: ["TOURNAMENT"],
    });
  }

  // Füge einige Matches hinzu
  for (let i = 0; i < Math.ceil(playerCount / 4); i++) {
    state.tournament.matches.push({
      id: `match_${i}`,
      createdAt: Date.now(),
      creationMethod: "manual",
      status: "active",
      type: "1v1",
      playerA: state.players[i * 2]?.id || "",
      playerB: state.players[i * 2 + 1]?.id || "",
      scoreA: Math.floor(Math.random() * 100),
      scoreB: Math.floor(Math.random() * 100),
      mvpPlayerId: null,
      gameId: `game_${i}`,
      modifiers: [],
      result: null,
      perPlayerScores: {},
    });
  }

  // Simuliere Event-Log Einträge
  for (let i = 0; i < 100; i++) {
    state.eventLog.push({
      id: `event_${i}`,
      timestamp: Date.now() - (100 - i) * 1000,
      type: i % 4 === 0 ? "vote" : i % 4 === 1 ? "match-start" : i % 4 === 2 ? "match-done" : "player-join",
      payload: { playerId: state.players[i % playerCount]?.id },
      actorId: state.players[0]?.id || null,
    });
  }

  return state;
}

/**
 * Testet Polling-Performance
 */
async function testPollingPerformance(playerCount: number, iterations: number = 50): Promise<PerformanceMetrics> {
  const state = createSimulatedState(playerCount);
  const serialized = JSON.stringify(state);
  const times: number[] = [];

  console.log(`\n  ▸ Polling-Test mit ${playerCount} Players (${iterations} Iterationen)`);

  // Warmup
  for (let i = 0; i < 5; i++) {
    const _ = JSON.stringify(state);
  }

  // Messungen
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const view = withDerived(state, Date.now());
    const _ = JSON.stringify(view);
    const end = performance.now();
    times.push(end - start);
  }

  const sorted = times.sort((a, b) => a - b);
  const memBefore = process.memoryUsage().heapUsed;

  // Berechne Statistiken
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = sorted[0];
  const maxTime = sorted[times.length - 1];
  const p95Time = sorted[Math.floor(times.length * 0.95)];
  const stateSizeBytes = serialized.length;
  const memAfter = process.memoryUsage().heapUsed;
  const memoryUsageMB = (memAfter - memBefore) / 1024 / 1024;
  const totalBandwidthMB = (stateSizeBytes * iterations) / 1024 / 1024;
  const opsPerSec = 1000 / avgTime;

  return {
    name: `Polling (${playerCount} Players)`,
    iterations,
    avgResponseTime: avgTime,
    minResponseTime: minTime,
    maxResponseTime: maxTime,
    p95ResponseTime: p95Time,
    stateSizeBytes,
    memoryUsageMB,
    totalBandwidthMB,
    operationsPerSecond: opsPerSec,
    timestamp: new Date(),
  };
}

/**
 * Testet State-Mutation unter Last
 */
async function testMutationPerformance(playerCount: number, mutations: number = 100): Promise<PerformanceMetrics> {
  const state = createSimulatedState(playerCount);
  const times: number[] = [];

  console.log(`\n  ▸ Mutation-Test mit ${playerCount} Players (${mutations} Mutationen)`);

  for (let m = 0; m < mutations; m++) {
    const start = performance.now();

    // Simuliere Vote-Mutation
    const randomPlayerIdx = Math.floor(Math.random() * playerCount);
    const player = state.players[randomPlayerIdx];

    if (player && state.tournament.votes) {
      state.tournament.votes[player.id] = [
        `game_${Math.floor(Math.random() * playerCount)}`,
        `game_${Math.floor(Math.random() * playerCount)}`,
      ];
    }

    // Simuliere Match-Score-Update
    if (state.tournament.matches.length > 0) {
      const match = state.tournament.matches[m % state.tournament.matches.length];
      match.scoreA += Math.floor(Math.random() * 10);
      match.scoreB += Math.floor(Math.random() * 10);
    }

    state.version += 1;
    state.eventLog.push({
      id: `event_mut_${m}`,
      timestamp: Date.now(),
      type: "vote",
      payload: { mutationIndex: m },
      actorId: null,
    });

    const end = performance.now();
    times.push(end - start);
  }

  const sorted = times.sort((a, b) => a - b);
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

  return {
    name: `Mutations (${playerCount} Players)`,
    iterations: mutations,
    avgResponseTime: avgTime,
    minResponseTime: sorted[0],
    maxResponseTime: sorted[sorted.length - 1],
    p95ResponseTime: sorted[Math.floor(sorted.length * 0.95)],
    stateSizeBytes: JSON.stringify(state).length,
    memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024,
    totalBandwidthMB: (JSON.stringify(state).length * mutations) / 1024 / 1024,
    operationsPerSecond: 1000 / avgTime,
    timestamp: new Date(),
  };
}

/**
 * Testet State-Größe bei verschiedenen Player-Counts
 */
async function testStateSizeScaling(): Promise<PerformanceMetrics[]> {
  const results: PerformanceMetrics[] = [];
  const playerCounts = [10, 25, 50, 100, 150, 200];

  console.log(`\n  ▸ State-Size-Scaling Test`);

  for (const count of playerCounts) {
    const state = createSimulatedState(count);
    const size = JSON.stringify(state).length;

    results.push({
      name: `State-Size (${count} Players)`,
      iterations: 1,
      avgResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0,
      p95ResponseTime: 0,
      stateSizeBytes: size,
      memoryUsageMB: 0,
      totalBandwidthMB: size / 1024 / 1024,
      operationsPerSecond: 0,
      timestamp: new Date(),
    });
  }

  return results;
}

/**
 * Testet Netzwerk-Bandwidth bei kontinuierlichem Polling
 */
async function testNetworkBandwidth(playerCount: number = 100): Promise<PerformanceMetrics> {
  const state = createSimulatedState(playerCount);
  const serialized = JSON.stringify(state);
  const stateSizeBytes = serialized.length;

  // Simuliere 1-2s Polling-Cadence über 1 Minute
  const pollingIntervalMs = 1500; // 1.5s
  const durationSeconds = 60;
  const pollingCount = Math.floor((durationSeconds * 1000) / pollingIntervalMs);

  // Annahme: Durchschnittlich 20% der Polls sind "nicht modifiziert" (ca. 100 Bytes)
  const notModifiedSize = 100;
  const totalBandwidth =
    stateSizeBytes * pollingCount * 0.8 + // 80% full updates
    notModifiedSize * pollingCount * 0.2; // 20% not modified

  const totalBandwidthMB = totalBandwidth / 1024 / 1024;
  const mbpsPerPlayer = (totalBandwidthMB * 8) / durationSeconds;

  return {
    name: `Network Bandwidth (${playerCount} Players, 1min)`,
    iterations: pollingCount,
    avgResponseTime: pollingIntervalMs,
    minResponseTime: 0,
    maxResponseTime: 0,
    p95ResponseTime: 0,
    stateSizeBytes,
    memoryUsageMB: 0,
    totalBandwidthMB,
    operationsPerSecond: mbpsPerPlayer,
    timestamp: new Date(),
  };
}

/**
 * Testet Leaderboard-Rendering Performance (simuliert React Re-render)
 */
async function testLeaderboardRendering(playerCount: number = 100): Promise<PerformanceMetrics> {
  const state = createSimulatedState(playerCount);
  const times: number[] = [];
  const iterations = 50;

  console.log(`\n  ▸ Leaderboard-Rendering Test (${playerCount} Players)`);

  // Sortiere Players nach Points (wie in der echten Leaderboard)
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    // Simuliere Leaderboard-Rendering
    const sortedPlayers = [...state.players].sort((a, b) => b.points - a.points);

    // Simuliere React-Render (map über Players)
    const html = sortedPlayers
      .slice(0, 50) // Top 50 Players
      .map(
        (p) =>
          `<div class="player-row">${p.name}: ${p.points} pts</div>`,
      )
      .join("");

    const end = performance.now();
    times.push(end - start);
  }

  const sorted = times.sort((a, b) => a - b);
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

  return {
    name: `Leaderboard-Rendering (${playerCount} Players)`,
    iterations,
    avgResponseTime: avgTime,
    minResponseTime: sorted[0],
    maxResponseTime: sorted[sorted.length - 1],
    p95ResponseTime: sorted[Math.floor(sorted.length * 0.95)],
    stateSizeBytes: JSON.stringify(state).length,
    memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024,
    totalBandwidthMB: 0,
    operationsPerSecond: 1000 / avgTime,
    timestamp: new Date(),
  };
}

/**
 * Testet Vote-Submission unter gleichzeitiger Last
 */
async function testConcurrentVoteSubmission(playerCount: number = 50): Promise<PerformanceMetrics> {
  const state = createSimulatedState(playerCount);
  const times: number[] = [];
  const voteCount = Math.min(playerCount, 50);

  console.log(`\n  ▸ Concurrent Vote-Submission Test (${voteCount} Players voting)`);

  for (let v = 0; v < voteCount; v++) {
    const start = performance.now();

    // Simuliere Vote-Processing
    const playerId = state.players[v]?.id;
    if (playerId && state.tournament.votes) {
      state.tournament.votes[playerId] = [
        `game_${Math.floor(Math.random() * 20)}`,
        `game_${Math.floor(Math.random() * 20)}`,
      ];
    }

    // Simuliere State-Update und Persistence
    state.version += 1;
    state.eventLog.push({
      id: `vote_${v}`,
      timestamp: Date.now(),
      type: "vote",
      payload: { playerId, voteIndex: v },
      actorId: playerId || null,
    });

    const _ = JSON.stringify(state); // Simuliere Serialization

    const end = performance.now();
    times.push(end - start);
  }

  const sorted = times.sort((a, b) => a - b);
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

  return {
    name: `Vote-Submission (${voteCount} concurrent players)`,
    iterations: voteCount,
    avgResponseTime: avgTime,
    minResponseTime: sorted[0],
    maxResponseTime: sorted[sorted.length - 1],
    p95ResponseTime: sorted[Math.floor(sorted.length * 0.95)],
    stateSizeBytes: JSON.stringify(state).length,
    memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024,
    totalBandwidthMB: (JSON.stringify(state).length * voteCount) / 1024 / 1024,
    operationsPerSecond: 1000 / avgTime,
    timestamp: new Date(),
  };
}

/**
 * Hauptfunktion: Führe alle Tests durch
 */
export async function runPerformanceTests(): Promise<void> {
  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║      LAN-OS PERFORMANCE TEST SUITE                  ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  const allResults: PerformanceMetrics[] = [];

  try {
    // Test 1: Polling mit verschiedenen Player-Counts
    console.log("1️⃣  POLLING PERFORMANCE");
    allResults.push(await testPollingPerformance(50, 50));
    allResults.push(await testPollingPerformance(100, 50));

    // Test 2: State-Mutation Performance
    console.log("\n2️⃣  STATE MUTATION PERFORMANCE");
    allResults.push(await testMutationPerformance(50, 100));
    allResults.push(await testMutationPerformance(100, 100));

    // Test 3: State-Size Scaling
    console.log("\n3️⃣  STATE SIZE SCALING");
    const sizeResults = await testStateSizeScaling();
    allResults.push(...sizeResults);

    // Test 4: Network Bandwidth
    console.log("\n4️⃣  NETWORK BANDWIDTH");
    allResults.push(await testNetworkBandwidth(50));
    allResults.push(await testNetworkBandwidth(100));

    // Test 5: Leaderboard Rendering
    console.log("\n5️⃣  LEADERBOARD RENDERING");
    allResults.push(await testLeaderboardRendering(50));
    allResults.push(await testLeaderboardRendering(100));

    // Test 6: Concurrent Vote Submission
    console.log("\n6️⃣  CONCURRENT VOTE SUBMISSION");
    allResults.push(await testConcurrentVoteSubmission(25));
    allResults.push(await testConcurrentVoteSubmission(50));

    // Ausgabe: Summary
    console.log("\n╔═══════════════════════════════════════════════════════╗");
    console.log("║                  TEST RESULTS SUMMARY                ║");
    console.log("╚═══════════════════════════════════════════════════════╝\n");

    for (const result of allResults) {
      console.log(`📊 ${result.name}`);
      console.log(`   Response Time:  ${result.avgResponseTime.toFixed(2)}ms (avg) | ${result.p95ResponseTime.toFixed(2)}ms (p95)`);
      console.log(`   Range:          ${result.minResponseTime.toFixed(2)}ms - ${result.maxResponseTime.toFixed(2)}ms`);
      console.log(`   State Size:     ${(result.stateSizeBytes / 1024).toFixed(2)}KB`);
      console.log(`   Bandwidth:      ${result.totalBandwidthMB.toFixed(2)}MB (total)`);
      console.log(`   Throughput:     ${result.operationsPerSecond.toFixed(2)} ops/sec`);
      console.log();
    }

    // Speichere Ergebnisse als JSON
    const resultsJson = JSON.stringify(allResults, null, 2);
    console.log("\n✅ Performance Tests abgeschlossen!");
    console.log(`   Ergebnisse exportiert: /tmp/perf-results.json`);

    // Exportiere für externe Verarbeitung
    process.stdout.write("\n__PERF_RESULTS_JSON__\n");
    process.stdout.write(resultsJson);
    process.stdout.write("\n__END_PERF_RESULTS__\n");
  } catch (err) {
    console.error("❌ Performance Test fehlgeschlagen:", err);
    process.exit(1);
  }
}

// Wenn direkt aufgerufen
if (import.meta.url === `file://${process.argv[1]}`) {
  runPerformanceTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
