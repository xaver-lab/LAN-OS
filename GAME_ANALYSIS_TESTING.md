# Game Analysis Tab - Testing Guide

## Prerequisites
- LAN-OS Server running
- Admin Panel accessible at `http://localhost:3000/admin`
- At least 3-5 test games in the system

## Test Scenario 1: Tab Navigation & Initialization

**Steps:**
1. Open Admin Panel → Navigate to "Games" tab (🎮)
2. Verify tab appears in tab bar after "Soulmask" and before "System"

**Expected Results:**
- Tab loads without errors
- Games list displays in responsive grid (auto-fit columns)
- Each game card shows: Title, Tag badge, Status indicator
- "N unanalyzed" counter displays in header
- "Analyze All Unanalyzed" button visible

---

## Test Scenario 2: Game Filtering

**Setup:** Ensure you have:
- 3 unanalyzed games
- 2+ analyzed games

**Steps:**
1. Click "Unanalyzed" filter tab
2. Verify only unanalyzed games display
3. Click "Analyzed" filter tab
4. Verify only analyzed games display
5. Click "All" filter tab
6. Verify all games display

**Expected Results:**
- Filter tabs switch active state (border highlight)
- Game count decreases/increases appropriately
- Cards are immediately updated without page reload

---

## Test Scenario 3: Game Sorting

**Setup:** Ensure games have different:
- Titles (alphabetic variation)
- Suitability scores
- Complexity levels

**Steps:**
1. Select "Name (A-Z)" sort
2. Verify games sort alphabetically by title
3. Select "Suitability (High-Low)" sort
4. Verify games sort by tournamentSuitability descending
5. Select "Complexity (Hard-Easy)" sort
6. Verify sort: casual(1) → medium(2) → hardcore(3)

**Expected Results:**
- Games reorder immediately
- Sort order persists when switching filters
- All sort options function correctly

---

## Test Scenario 4: Single Game Analysis

**Setup:** Identify 1 unanalyzed game

**Steps:**
1. Locate unanalyzed game card (has "Not Analyzed" badge)
2. Click "Analyze" button on card
3. Wait for loading state ("..." on button)
4. Verify button becomes disabled during request
5. After completion, verify game card now shows:
   - Tag badge with color
   - Duration (min)
   - Players range
   - Complexity badge (🎮/⚔️/🔥)
   - Suitability Progress-Bar (Neon)
   - Chaos Potential Progress-Bar (Magenta)

**Expected Results:**
- Button shows loading state during API call
- Game data populates from AI analysis
- Card updates without page reload
- Progress bars fill correctly
- No console errors

---

## Test Scenario 5: Bulk Game Analysis

**Setup:** Ensure 3+ unanalyzed games exist

**Steps:**
1. Verify "Analyze All Unanalyzed" button shows count
2. Click "Analyze All Unanalyzed"
3. Button changes to "Analyzing..."
4. Monitor as games analyze sequentially
5. After all complete, verify:
   - All previously unanalyzed games now show data
   - Unanalyzed counter = 0
   - Button returns to normal state

**Expected Results:**
- Bulk button triggers sequential analysis
- Games update in order
- No parallel requests (server load respect)
- Button re-enables after completion
- Can click again if new games added

---

## Test Scenario 6: Pool Toggle

**Setup:** Ensure at least 2 analyzed games

**Steps:**
1. Locate analyzed game card
2. Click "Add to Pool" button
3. Verify:
   - Button changes to "✓ In Pool"
   - Card border becomes Neon (#39ff6e)
   - Card shows box-shadow glow
   - Game will appear in voting pool
4. Click button again to toggle off
5. Verify:
   - Button returns to "Add to Pool"
   - Border returns to normal
   - Box-shadow removed

**Expected Results:**
- Toggle works on both directions
- Visual feedback immediate
- Neon glow appears/disappears
- API call succeeds without errors
- State persists across page refresh

---

## Test Scenario 7: Hover Effects

**Steps:**
1. Move mouse over game card
2. Verify smooth border color transition to Neon
3. Verify box-shadow glow effect applies
4. Move mouse away
5. Verify smooth transition back to original state
6. Test on both "In Pool" and "Not In Pool" cards

**Expected Results:**
- Hover effect is smooth (no flicker)
- Color transitions are noticeable
- Effect works on all cards
- Cursor changes to pointer

---

## Test Scenario 8: Game Info Modal

**Setup:** Have at least 1 analyzed game

**Steps:**
1. Click on game card (anywhere except buttons)
2. Verify modal opens with:
   - Semi-transparent dark overlay
   - Centered card with game info
   - Close button (✕) in top-right
3. Verify modal displays:
   - Title as H2
   - Tag badge with matching color
   - DURATION: shows "~X min"
   - PLAYERS: shows "X-Y" range
   - COMPLEXITY: badge with emoji
   - SUITABLE MODES: cyan badges for each mode
   - TOURNAMENT SUITABILITY: score + progress-bar
   - CHAOS POTENTIAL: score + progress-bar
   - Analysis status (✓ AI Analyzed or ⚠ Not Analyzed)
4. Click "Copy Details" button
5. Paste content somewhere (text editor)
6. Verify clipboard contains formatted game info
7. Click "Close" button
8. Verify modal closes

**Expected Results:**
- Modal appears with proper styling
- All game data displays correctly
- Copy-to-clipboard works
- Modal closes on button click
- Modal closes on outside click

---

## Test Scenario 9: Modal Outside Click

**Steps:**
1. Open modal (click game card)
2. Click on dark overlay outside modal
3. Verify modal closes

**Expected Results:**
- Modal closes without interaction issues
- Can reopen immediately

---

## Test Scenario 10: Empty States

**Setup:** Prepare test cases

**Test 10a - No Unanalyzed Games:**
- All games analyzed
- "Analyze All Unanalyzed" button should be disabled
- Button should show "Analyze All Unanalyzed" (not "Analyzing")

**Test 10b - No Games:**
- Empty games array
- Grid shows empty
- Counter shows "0 unanalyzed"
- All buttons disabled

**Expected Results:**
- Component handles edge cases gracefully
- No console errors
- Proper disabled states

---

## Test Scenario 11: Responsive Layout

**Steps:**
1. View on Desktop (1920px width)
   - Verify 3-4 game cards per row
2. Resize to Tablet (768px width)
   - Verify 2 game cards per row
3. Resize to Mobile (375px width)
   - Verify 1-2 game cards per row
4. Modal should remain centered at all widths

**Expected Results:**
- Grid uses `auto-fit minmax(250px, 1fr)`
- Layout adjusts without horizontal scroll
- Modal stays accessible at all sizes

---

## Test Scenario 12: Performance & Load

**Steps:**
1. Add 50+ games to system
2. Load Games tab
3. Measure:
   - Page load time
   - Filter/sort response time
   - Modal open/close time
4. Monitor console for performance issues

**Expected Results:**
- Filter/sort completes in <100ms (useMemo optimization)
- No memory leaks
- No console warnings or errors
- Smooth 60fps animations

---

## Test Scenario 13: Error Handling

**Setup:** Prepare failure scenarios

**Test 13a - Analyze Failure:**
1. Disconnect server or mock API failure
2. Click "Analyze" button
3. Verify:
   - Error message displayed in alert
   - Button returns to normal state
   - State doesn't change

**Test 13b - Pool Toggle Failure:**
1. Trigger API failure
2. Click "Add to Pool"
3. Verify:
   - Error alert shown
   - Button remains in previous state
   - No visual corruption

**Expected Results:**
- Errors caught and displayed to user
- UI remains stable after errors
- Can retry operations

---

## Test Scenario 14: Data Consistency

**Steps:**
1. Analyze a game
2. Check voting pool → game should appear
3. Remove from pool → game should disappear from voting
4. Re-add to pool → game reappears
5. Toggle tournament track off/on → games persist in pool status

**Expected Results:**
- Game pool status consistent across system
- Voting system respects pool settings
- Track toggling doesn't affect pool data

---

## Test Scenario 15: TypeScript Type Safety

**Steps:**
1. Review code for type annotations
2. Run TypeScript compiler: `npm run build`
3. Verify no `any` types
4. Verify props match interfaces

**Expected Results:**
- Full type coverage
- No TS compilation errors from GameAnalysis.tsx
- Props properly typed

---

## Regression Tests

After each change, verify:
- ✓ All tabs still load
- ✓ Admin Panel refreshes state properly
- ✓ No console errors
- ✓ Previous tabs still functional

---

## Performance Baselines

Ideal metrics:
- Tab load: <500ms
- Filter/sort: <100ms
- Modal open: <200ms
- Analysis API: 1-2s per game
- Bulk analysis: 5-10s for 5 games

---

## Known Limitations (v1.0)

- Bulk analysis is sequential (by design for server load)
- No game edit/create in this tab (exists in System tab)
- Copy-to-clipboard requires HTTPS or localhost
- No undo for pool toggling (but API calls are reversible)

---

## Sign-Off Checklist

- [ ] All scenarios tested and passing
- [ ] No console errors
- [ ] Responsive design verified
- [ ] API calls working
- [ ] Modal functionality complete
- [ ] Filter/sort functionality complete
- [ ] Pool management working
- [ ] Analysis triggers working
- [ ] Dark-Arcade theme applied correctly
- [ ] Performance acceptable

**Tested by:** _______________
**Date:** _______________
**Issues found:** _______________
