#!/bin/bash

echo "═══════════════════════════════════════════════════════════"
echo "  LAN-OS E2E TEST REPORT VERIFICATION"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check State File
echo "1. Checking state.json..."
if [ -f "data/state.json" ]; then
    echo "   ✅ state.json exists"
    
    # Check schema version
    version=$(jq .schemaVersion data/state.json)
    echo "   ✅ Schema version: $version"
    
    # Count players
    players=$(jq '.players | length' data/state.json)
    echo "   ✅ Players: $players"
    
    # Count games
    games=$(jq '.games | length' data/state.json)
    echo "   ✅ Games: $games"
    
    # Check tournament state
    state=$(jq .tournamentState data/state.json)
    echo "   ✅ Tournament State: $state"
else
    echo "   ❌ state.json not found"
fi
echo ""

# Check Test Report
echo "2. Checking Test Report..."
if [ -f "E2E_TEST_REPORT.md" ]; then
    echo "   ✅ E2E_TEST_REPORT.md exists"
    lines=$(wc -l < E2E_TEST_REPORT.md)
    echo "   ✅ Report lines: $lines"
    
    # Count test scenarios
    scenarios=$(grep -c "^## [0-9].*TEST SCENARIO" E2E_TEST_REPORT.md)
    echo "   ✅ Test Scenarios: $scenarios"
    
    # Count pass/fail
    passes=$(grep -c "✅ PASS" E2E_TEST_REPORT.md)
    fails=$(grep -c "❌ FAIL" E2E_TEST_REPORT.md)
    partials=$(grep -c "⚠️ PARTIAL" E2E_TEST_REPORT.md)
    
    echo "   ✅ Results: $passes PASS, $fails FAIL, $partials PARTIAL"
else
    echo "   ❌ E2E_TEST_REPORT.md not found"
fi
echo ""

# Check Summary
echo "3. Checking Test Summary..."
if [ -f "TEST_SUMMARY.md" ]; then
    echo "   ✅ TEST_SUMMARY.md exists"
    lines=$(wc -l < TEST_SUMMARY.md)
    echo "   ✅ Summary lines: $lines"
else
    echo "   ❌ TEST_SUMMARY.md not found"
fi
echo ""

# Check Source Code
echo "4. Checking Source Code..."
if [ -f "packages/shared/src/types.ts" ]; then
    echo "   ✅ types.ts exists"
fi
if [ -f "packages/shared/src/state-machine.ts" ]; then
    echo "   ✅ state-machine.ts exists"
fi
if [ -f "packages/shared/src/points.ts" ]; then
    echo "   ✅ points.ts exists (Scoring)"
fi
if [ -f "packages/shared/src/voting.ts" ]; then
    echo "   ✅ voting.ts exists"
fi
echo ""

# README Check
echo "5. Checking README..."
if [ -f "README.md" ]; then
    version=$(grep "Schema-Version:" README.md | head -1)
    echo "   ✅ $version"
    
    sections=$(grep -c "^## " README.md)
    echo "   ✅ Major Sections: $sections"
fi
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "  TEST REPORT VERIFICATION COMPLETE"
echo "═══════════════════════════════════════════════════════════"
