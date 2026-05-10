# LAN-OS Testing Guide

## E2E Test Suite

The project includes 157 E2E test cases covering all critical game paths:
- Tournament voting and match selection
- Scoring and leaderboard updates
- Player state transitions
- Soulmask role management
- Admin controls and exports

**Run E2E tests:**
```bash
npm run test:e2e
```

Expected: 150+ tests passing (3 known issues with complex voting scenarios)

---

## 8-Hour Dry-Run Stability Test

The most critical test for LAN-Party readiness. Simulates a full 8-hour event with realistic player voting, matching, and scoring.

### Prerequisites

1. Server must be running via PM2:
   ```bash
   pm2 start ecosystem.config.js
   ```

2. Verify server health:
   ```bash
   curl http://localhost:3000/health
   ```

### Running a Quick Test (6 minutes)

For rapid validation that the infrastructure works:

```bash
node long-duration-test-runner.js 0.1 20
# 0.1 = 6 minutes, 20 = simulate 20 players
```

Expected output:
- Server responds to health checks
- Memory stays under 150MB
- No errors in event log
- Report saved to `test-report-TIMESTAMP.json`

### Running Full 8-Hour Test

```bash
node long-duration-test-runner.js 8 60
# 8 = 8 hours, 60 = simulate 60 players
```

**Typical Duration**: ~8 hours (obviously)

**Expected Results**:
- Peak memory: < 256MB
- Checkpoints: 20-40 created during test
- Health check failures: 0
- Iterations: 5000+
- Status: ✓ PASS

### Test Report Output

After test completion, a JSON report is saved with:
- `duration_hours`: Actual test duration
- `iterations`: Number of voting/match rounds
- `players_simulated`: Configured player count
- `peak_memory_mb`: Highest memory usage reached
- `avg_memory_mb`: Average memory during test
- `health_check_failures`: Server unresponsiveness count
- `final_version`: State version after test
- `success`: true/false based on thresholds

**Pass Criteria**:
- ✓ Peak memory < 300MB
- ✓ Zero health check failures
- ✓ >= 10 iterations completed
- ✓ Server version incremented (checkpoints created)

### Long-Duration Test Thresholds

These are the memory and stability targets:

| Metric | Threshold | Notes |
|--------|-----------|-------|
| Peak Memory | < 300MB | Abort if exceeds 512MB |
| Average Memory | < 200MB | Indicates memory leaks if rising |
| Health Failures | 0 | Server must respond reliably |
| Checkpoints | 20+ (in 8h) | ~1 checkpoint per 24 minutes |
| Iterations | 5000+ (in 8h) | Normal pace ~10sec per round |

### Troubleshooting Failed Tests

#### Memory Growing Rapidly
- **Symptom**: Peak memory exceeds 256MB before 4-hour mark
- **Cause**: Likely memory leak in state management or event log
- **Fix**: Check event log pruning in `state-machine.ts`

#### Health Checks Failing
- **Symptom**: "Health check failed" warnings appear
- **Cause**: Server unresponsive (GC pauses, CPU saturation)
- **Fix**: Reduce player count or interval between rounds

#### No Checkpoints Created
- **Symptom**: `final_version` stays at 7 throughout test
- **Cause**: Auto-checkpoint disabled or path issues
- **Fix**: Verify `autoCheckpoint: true` in config and `packages/server/data/` writable

### Manual Load Testing

For interactive testing without waiting 8 hours, use curl:

```bash
# Trigger a voting round
curl -X POST http://localhost:3000/api/admin/track/TOURNAMENT \
  -H "Content-Type: application/json" \
  -d '{"active": true}'

# Check health
curl http://localhost:3000/health

# Get state snapshot
curl http://localhost:3000/api/state/public

# Export leaderboard
curl http://localhost:3000/api/admin/leaderboard/export?format=csv
```

### Performance Baseline

Expected system performance on mid-range hardware (8GB RAM, 4-core CPU):

| Load | Memory | CPU | Response Time |
|------|--------|-----|----------------|
| 40 players | 85MB | 15% | <100ms |
| 60 players | 120MB | 25% | <150ms |
| 80 players | 180MB | 35% | <200ms |

---

## Monitoring During LAN Event

Once deployed, monitor using:

```bash
# Real-time memory/CPU
pm2 monit

# Server logs
pm2 logs lan-os

# Health check (in a loop)
watch -n 1 'curl -s http://localhost:3000/health | python -m json.tool'
```

### Go/No-Go Checklist

Before starting the LAN event:

- [ ] 8h dry-run completed successfully
- [ ] Peak memory < 256MB
- [ ] Zero health check failures
- [ ] Server restarted cleanly (test pm2 restart)
- [ ] Leaderboard export working
- [ ] Admin dashboard shows live updates
- [ ] Soulmask role assignment functional
- [ ] TV display showing correct game data
- [ ] Player pages loading match voting UI

---

## Known Limitations

1. **Bot Simulation**: Dry-run uses synthetic voting patterns, not actual human behavior
   - Real players may vote differently
   - Network latency not simulated

2. **Test Duration**: 8-hour test runs very slowly (real-time)
   - For development, use 0.1h (6-minute) quick-test
   - Use overnight runs for full 8-hour validation

3. **Memory Profiling**: Peak memory only tracked at 5-second intervals
   - Short spikes may not be captured
   - Use `pm2 monit` for granular CPU/memory graphs

---

## Next Steps

- [ ] Run quick test: `node long-duration-test-runner.js 0.1 20`
- [ ] Run full 8h test overnight
- [ ] Archive test-report-*.json files for post-event analysis
- [ ] If test fails, file an issue with the report JSON attached

---

**Status**: All test infrastructure complete  
**Last Updated**: 2026-05-10  
**Critical Tests**: E2E (157 cases), 8h Dry-Run (stability)
