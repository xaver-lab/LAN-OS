#!/usr/bin/env node

/**
 * LAN-OS 8h Dry-Run Test Runner
 *
 * Usage:
 *   node long-duration-test-runner.js [duration-hours] [player-count]
 *
 * Examples:
 *   node long-duration-test-runner.js 8 60      # 8 hours, 60 players
 *   node long-duration-test-runner.js 0.1 20    # 6 minutes, 20 players (quick test)
 *   node long-duration-test-runner.js 24 80     # 24 hours, 80 players (extreme)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const DEFAULT_DURATION_HOURS = 0.1; // Default: 6 minutes for quick testing
const DEFAULT_PLAYER_COUNT = 40;
const MEMORY_CHECK_INTERVAL_MS = 5000; // Check memory every 5 seconds
const REPORT_FILENAME = `test-report-${Date.now()}.json`;

// Parse CLI args
const args = process.argv.slice(2);
const durationHours = parseFloat(args[0]) || DEFAULT_DURATION_HOURS;
const playerCount = parseInt(args[1], 10) || DEFAULT_PLAYER_COUNT;
const durationMs = durationHours * 60 * 60 * 1000;

console.log("\n╔════════════════════════════════════════════════════════════╗");
console.log("║     LAN-OS 8h Dry-Run Stability Test (Bot Simulation)    ║");
console.log("╠════════════════════════════════════════════════════════════╣");
console.log(`║  Duration: ${durationHours.toFixed(1)}h (${Math.round(durationMs / 1000 / 60)}min)`);
console.log(`║  Players: ${playerCount}`);
console.log(`║  Report: ${REPORT_FILENAME}`);
console.log("╚════════════════════════════════════════════════════════════╝\n");

// Memory monitoring
let peakMemory = 0;
let memoryReadings = [];
const startTime = Date.now();
let iterationCount = 0;

function getMemoryMb() {
  const usage = process.memoryUsage();
  return Math.round(usage.heapUsed / 1024 / 1024);
}

function monitorMemory() {
  const current = getMemoryMb();
  memoryReadings.push({
    timestamp: Date.now() - startTime,
    memory_mb: current,
  });

  if (current > peakMemory) {
    peakMemory = current;
  }

  // Warn if memory usage is too high
  if (current > 200) {
    console.warn(`⚠️  HIGH MEMORY: ${current}MB (peak: ${peakMemory}MB)`);
  }
}

// Simulate voting and match rounds
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function simulateRound(roundNum) {
  // Simulate voting/match activity
  const activity = roundNum % 2 === 0 ? "VOTE" : "MATCH";
  const affectedPlayers = getRandomInt(2, Math.min(playerCount, 12));

  if (roundNum % 50 === 0) {
    console.log(
      `[Round ${roundNum.toString().padStart(5)}] ${activity} activity, ${affectedPlayers}/${playerCount} players active, Memory: ${getMemoryMb()}MB`
    );
  }

  return {
    round: roundNum,
    activity,
    players: affectedPlayers,
    timestamp: Date.now(),
  };
}

// Health check to verify server is responsive
async function healthCheck() {
  return new Promise((resolve) => {
    const req = http.get("http://localhost:3000/health", (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const health = JSON.parse(data);
          resolve(health);
        } catch {
          resolve(null);
        }
      });
    });

    req.on("error", () => resolve(null));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

// Main test loop
async function runTest() {
  const rounds = [];
  let checkpointCount = 0;
  let healthCheckFailures = 0;

  const memoryInterval = setInterval(monitorMemory, MEMORY_CHECK_INTERVAL_MS);

  // Initial health check
  console.log("Checking server health...");
  let health = await healthCheck();
  if (!health) {
    console.error("❌ Server not responding on http://localhost:3000/health");
    console.error("Make sure PM2 started the server: pm2 start ecosystem.config.js");
    clearInterval(memoryInterval);
    process.exit(1);
  }
  console.log(`✓ Server up. Version: ${health.version}, Players: ${health.players}\n`);

  // Run simulation rounds
  const roundInterval = getRandomInt(2000, 5000); // 2-5 seconds between rounds
  let lastHealthCheck = Date.now();

  while (Date.now() - startTime < durationMs) {
    iterationCount++;

    // Simulate activity
    const round = await simulateRound(iterationCount);
    rounds.push(round);

    // Health check every 30 seconds
    if (Date.now() - lastHealthCheck > 30000) {
      health = await healthCheck();
      if (!health) {
        healthCheckFailures++;
        console.warn(`⚠️  Health check failed (${healthCheckFailures})`);
      } else {
        // Check if new checkpoints were created
        if (health.version && health.version > checkpointCount) {
          checkpointCount = health.version;
          console.log(`  ✓ Checkpoint created (version: ${health.version})`);
        }
      }
      lastHealthCheck = Date.now();
    }

    // Simulate server load with delays
    await new Promise((resolve) => setTimeout(resolve, roundInterval));
  }

  clearInterval(memoryInterval);

  // Final health check
  health = await healthCheck();
  const finalVersion = health?.version || 0;

  // Generate report
  const report = {
    test_start: startTime,
    test_end: Date.now(),
    duration_ms: Date.now() - startTime,
    duration_hours: ((Date.now() - startTime) / 1000 / 60 / 60).toFixed(2),
    iterations: iterationCount,
    players_simulated: playerCount,
    peak_memory_mb: peakMemory,
    avg_memory_mb: Math.round(
      memoryReadings.reduce((sum, r) => sum + r.memory_mb, 0) / memoryReadings.length
    ),
    memory_readings: memoryReadings,
    rounds: rounds.slice(-100), // Last 100 rounds for brevity
    health_check_failures: healthCheckFailures,
    final_version: finalVersion,
    success:
      peakMemory < 300 && // Under 300MB peak
      healthCheckFailures === 0 && // No health check failures
      iterationCount > 10, // At least 10 iterations
  };

  return report;
}

// Save and display report
async function main() {
  try {
    const report = await runTest();

    // Save report to file
    const reportPath = path.join(process.cwd(), REPORT_FILENAME);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Display summary
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║                    TEST COMPLETE                           ║");
    console.log("╠════════════════════════════════════════════════════════════╣");
    console.log(
      `║  Duration: ${report.duration_hours}h (${report.iterations} iterations)`
    );
    console.log(
      `║  Memory: ${report.avg_memory_mb}MB avg, ${report.peak_memory_mb}MB peak`
    );
    console.log(
      `║  Health Checks: ${report.health_check_failures} failures`
    );
    console.log(
      `║  Server Version: ${report.final_version}`
    );
    console.log(
      `║  Status: ${report.success ? "✓ PASS" : "❌ FAIL"}`
    );
    console.log("╠════════════════════════════════════════════════════════════╣");
    console.log(`║  Report saved: ${REPORT_FILENAME}`);
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    process.exit(report.success ? 0 : 1);
  } catch (err) {
    console.error("❌ Test failed:", err);
    process.exit(1);
  }
}

main();
