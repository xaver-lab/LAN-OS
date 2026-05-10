#!/usr/bin/env node
/**
 * Performance Test Runner für LAN-OS
 * Läuft ohne npm/tsc Abhängigkeiten als reines Node.js-Skript
 */

const { performance } = require("perf_hooks");
const crypto = require("crypto");

// ──────────────────────────────────────────────────────────────────────────
// Minimale Shared-Types Simulation
// ──────────────────────────────────────────────────────────────────────────

function createEmptyState() {
  return {
    schemaVersion: "3.0",
    version: 0,
    simulationActive: false,
    players: [],
    tournament: {
      state: "LOBBY",
      matches: [],
      votes: {},
      wheelVariant: "pie",
      wheelConfig: null,
      bracket: null,
      tieBreak: { state: "none" },
    },
    soulmask: {
      state: "IDLE",
      tasks: [],
      roleSelectorOpened: false,
      selectedRole: null,
    },
    games: [],
    config: {
      matchDurationMin: 30,
      wheelRotationSpeedMs: 5000,
      autoCheckpoint: true,
      tvTheme: "dark-arcade",
      votingMode: "MULTI",
    },
    eventLog: [],
    checkpoints: [],
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Test-Utilities
// ──────────────────────────────────────────────────────────────────────────

function createSimulatedState(playerCount) {
  let state = createEmptyState();

  // Players
  for (let i = 0; i < playerCount; i++) {
    const playerId = `player_${i}`;
    state.players.push({
      id: playerId,
      name: `Player ${i + 1}`,
      sessionToken: crypto.randomBytes(16).toString("hex"),
      role: i === 0 ? "Admin" : i < 5 ? "GameMaster" : "Spieler",
      points: Math.floor(Math.random() * 5000),
      lastSeen: Date.now(),
      color: `hsl(${(i * 360) / playerCount}, 70%, 50%)`,
      activeTracks: ["TOURNAMENT"],
    });
  }

  // Matches
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

  // Games
  for (let i = 0; i < 20; i++) {
    state.games.push({
      id: `game_${i}`,
      title: `Game ${i + 1}`,
      description: "Test game",
      difficulty: "medium",
      tags: ["Competitive"],
      matchType: "1v1",
      averagePlaytimeMins: 30,
    });
  }

  // EventLog
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

function percentile(arr, p) {
  const sorted = arr.sort((a, b) => a - b);
  const index = Math.ceil((sorted.length * p) / 100) - 1;
  return sorted[Math.max(0, index)];
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}

// ──────────────────────────────────────────────────────────────────────────
// Performance Tests
// ──────────────────────────────────────────────────────────────────────────

async function testPollingPerformance(playerCount, iterations = 50) {
  const state = createSimulatedState(playerCount);
  const serialized = JSON.stringify(state);
  const times = [];

  console.log(`\n  ▸ Polling-Test mit ${playerCount} Players (${iterations} Iterationen)`);

  // Warmup
  for (let i = 0; i < 5; i++) {
    JSON.stringify(state);
  }

  // Messungen
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const view = JSON.parse(JSON.stringify(state)); // Deep clone simuliert withDerived
    const _ = JSON.stringify(view);
    const end = performance.now();
    times.push(end - start);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const p95Time = percentile([...times], 95);
  const stateSizeBytes = serialized.length;
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
    totalBandwidthMB,
    operationsPerSecond: opsPerSec,
  };
}

async function testMutationPerformance(playerCount, mutations = 100) {
  const state = createSimulatedState(playerCount);
  const times = [];

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

    // Match-Score-Update
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

    const _ = JSON.stringify(state);
    const end = performance.now();
    times.push(end - start);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const p95Time = percentile([...times], 95);

  return {
    name: `Mutations (${playerCount} Players)`,
    iterations: mutations,
    avgResponseTime: avgTime,
    minResponseTime: minTime,
    maxResponseTime: maxTime,
    p95ResponseTime: p95Time,
    stateSizeBytes: JSON.stringify(state).length,
    totalBandwidthMB: (JSON.stringify(state).length * mutations) / 1024 / 1024,
    operationsPerSecond: 1000 / avgTime,
  };
}

async function testStateSizeScaling() {
  const results = [];
  const playerCounts = [10, 25, 50, 100, 150, 200];

  console.log(`\n  ▸ State-Size-Scaling Test`);

  for (const count of playerCounts) {
    const state = createSimulatedState(count);
    const size = JSON.stringify(state).length;

    results.push({
      name: `State-Size (${count} Players)`,
      iterations: 1,
      stateSizeBytes: size,
      totalBandwidthMB: size / 1024 / 1024,
      playerCount: count,
    });
  }

  return results;
}

async function testNetworkBandwidth(playerCount = 100) {
  const state = createSimulatedState(playerCount);
  const serialized = JSON.stringify(state);
  const stateSizeBytes = serialized.length;

  // Simuliere 1-2s Polling-Cadence über 1 Minute
  const pollingIntervalMs = 1500;
  const durationSeconds = 60;
  const pollingCount = Math.floor((durationSeconds * 1000) / pollingIntervalMs);

  const notModifiedSize = 100;
  const totalBandwidth = stateSizeBytes * pollingCount * 0.8 + notModifiedSize * pollingCount * 0.2;
  const totalBandwidthMB = totalBandwidth / 1024 / 1024;
  const mbpsPerPlayer = (totalBandwidthMB * 8) / durationSeconds;

  return {
    name: `Network Bandwidth (${playerCount} Players, 1min)`,
    iterations: pollingCount,
    stateSizeBytes,
    totalBandwidthMB,
    bandwidthMbps: mbpsPerPlayer,
    avgResponseTime: pollingIntervalMs,
  };
}

async function testLeaderboardRendering(playerCount = 100) {
  const state = createSimulatedState(playerCount);
  const times = [];
  const iterations = 50;

  console.log(`\n  ▸ Leaderboard-Rendering Test (${playerCount} Players)`);

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    const sortedPlayers = [...state.players].sort((a, b) => b.points - a.points);
    const html = sortedPlayers
      .slice(0, 50)
      .map((p) => `<div>${p.name}: ${p.points}</div>`)
      .join("");

    const end = performance.now();
    times.push(end - start);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const p95Time = percentile([...times], 95);

  return {
    name: `Leaderboard-Rendering (${playerCount} Players)`,
    iterations,
    avgResponseTime: avgTime,
    minResponseTime: minTime,
    maxResponseTime: maxTime,
    p95ResponseTime: p95Time,
    operationsPerSecond: 1000 / avgTime,
  };
}

async function testConcurrentVoteSubmission(playerCount = 50) {
  const state = createSimulatedState(playerCount);
  const times = [];
  const voteCount = Math.min(playerCount, 50);

  console.log(`\n  ▸ Concurrent Vote-Submission Test (${voteCount} Players voting)`);

  for (let v = 0; v < voteCount; v++) {
    const start = performance.now();

    const playerId = state.players[v]?.id;
    if (playerId && state.tournament.votes) {
      state.tournament.votes[playerId] = [
        `game_${Math.floor(Math.random() * 20)}`,
        `game_${Math.floor(Math.random() * 20)}`,
      ];
    }

    state.version += 1;
    state.eventLog.push({
      id: `vote_${v}`,
      timestamp: Date.now(),
      type: "vote",
      payload: { playerId, voteIndex: v },
      actorId: playerId || null,
    });

    const _ = JSON.stringify(state);
    const end = performance.now();
    times.push(end - start);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const p95Time = percentile([...times], 95);

  return {
    name: `Vote-Submission (${voteCount} concurrent)`,
    iterations: voteCount,
    avgResponseTime: avgTime,
    minResponseTime: minTime,
    maxResponseTime: maxTime,
    p95ResponseTime: p95Time,
    operationsPerSecond: 1000 / avgTime,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Main Test Runner
// ──────────────────────────────────────────────────────────────────────────

async function runAllTests() {
  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║      LAN-OS PERFORMANCE TEST SUITE                  ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  const allResults = [];

  try {
    // Test 1: Polling
    console.log("1️⃣  POLLING PERFORMANCE");
    allResults.push(await testPollingPerformance(50, 50));
    allResults.push(await testPollingPerformance(100, 50));

    // Test 2: Mutations
    console.log("\n2️⃣  STATE MUTATION PERFORMANCE");
    allResults.push(await testMutationPerformance(50, 100));
    allResults.push(await testMutationPerformance(100, 100));

    // Test 3: State-Size
    console.log("\n3️⃣  STATE SIZE SCALING");
    const sizeResults = await testStateSizeScaling();
    allResults.push(...sizeResults);

    // Test 4: Bandwidth
    console.log("\n4️⃣  NETWORK BANDWIDTH");
    allResults.push(await testNetworkBandwidth(50));
    allResults.push(await testNetworkBandwidth(100));

    // Test 5: Leaderboard
    console.log("\n5️⃣  LEADERBOARD RENDERING");
    allResults.push(await testLeaderboardRendering(50));
    allResults.push(await testLeaderboardRendering(100));

    // Test 6: Votes
    console.log("\n6️⃣  CONCURRENT VOTE SUBMISSION");
    allResults.push(await testConcurrentVoteSubmission(25));
    allResults.push(await testConcurrentVoteSubmission(50));

    // Summary
    console.log("\n╔═══════════════════════════════════════════════════════╗");
    console.log("║                  TEST RESULTS SUMMARY                ║");
    console.log("╚═══════════════════════════════════════════════════════╝\n");

    for (const result of allResults) {
      if (result.playerCount) {
        // State-Size results
        console.log(`📊 ${result.name}`);
        console.log(`   State Size:     ${formatBytes(result.stateSizeBytes)}`);
      } else if (result.bandwidthMbps !== undefined) {
        // Bandwidth results
        console.log(`📊 ${result.name}`);
        console.log(`   Total BW (1min): ${result.totalBandwidthMB?.toFixed(3)}MB`);
        console.log(`   Throughput:     ${result.bandwidthMbps.toFixed(2)}Mbps`);
        console.log(`   State Size:     ${formatBytes(result.stateSizeBytes)}`);
      } else if (result.avgResponseTime !== undefined) {
        console.log(`📊 ${result.name}`);
        console.log(
          `   Response Time:  ${result.avgResponseTime.toFixed(2)}ms (avg) | ${(result.p95ResponseTime || 0).toFixed(2)}ms (p95)`
        );
        console.log(
          `   Range:          ${(result.minResponseTime || 0).toFixed(2)}ms - ${(result.maxResponseTime || 0).toFixed(2)}ms`
        );
        if (result.stateSizeBytes) {
          console.log(`   State Size:     ${formatBytes(result.stateSizeBytes)}`);
        }
        if (result.totalBandwidthMB) {
          console.log(`   Bandwidth:      ${result.totalBandwidthMB.toFixed(3)}MB`);
        }
        if (result.operationsPerSecond) {
          console.log(`   Throughput:     ${result.operationsPerSecond.toFixed(0)} ops/sec`);
        }
      }
      console.log();
    }

    console.log("✅ Performance Tests abgeschlossen!");
  } catch (err) {
    console.error("❌ Performance Test fehlgeschlagen:", err);
    process.exit(1);
  }
}

runAllTests();
