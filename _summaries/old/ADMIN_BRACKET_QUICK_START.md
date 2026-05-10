# Tournament Bracket Planner — Admin Quick Start Guide

**Target Audience:** Event Admins using the LAN-OS `/admin` interface

---

## What is the Bracket Planner?

The **Bracket Planner** is an AI-powered tournament scheduling tool that automatically generates fair, entertaining, and time-efficient match brackets for your LAN party.

**In 30 seconds:**
1. Set your time budget (e.g., 120 minutes)
2. Choose difficulty filter (casual, medium, hardcore, or all)
3. Click "Auto-Generate Bracket"
4. Get a ready-to-use bracket with quality scores
5. Optionally edit or regenerate

---

## Step-by-Step Guide

### 1. Navigate to Bracket Tab

In the Admin Control Panel (`/admin`), find the **Tournament** section and open the **Bracket** tab.

You'll see a form with:
- **TIME BUDGET (MIN)** input field
- **DIFFICULTY FILTER** dropdown
- **Players** counter (e.g., "4 aktive Spieler")
- **Games** counter (e.g., "6 verfügbare Spiele")
- **Auto-Generate Bracket** button

### 2. Configure Parameters

**TIME BUDGET:**
- Enter the total time you want the bracket to take (in minutes)
- Minimum: 30 minutes
- Recommended: 90–150 minutes for 4–8 matches
- Examples:
  - Quick Event: 45 min (mostly Party games)
  - Standard: 120 min (mix of games)
  - Long Event: 180 min (includes RTS, long games)

**DIFFICULTY FILTER:**
- **All** — Mix casual and hardcore games (most balanced)
- **Casual** — Party, Sandbox, easy-to-learn games
- **Medium** — Sport, BattleRoyale, balanced skill requirement
- **Hardcore** — FPS, Tactical, RTS, competitive games

### 3. Generate Bracket

Click the **"Auto-Generate Bracket"** button.

**What Happens:**
1. System analyzes all active players and games
2. Agent generates skill-balanced matchups (Round-Robin)
3. Assigns games for variety and entertainment
4. Calculates scores: Balance, Entertainment, Time Efficiency
5. Displays bracket with quality rating

**Expected Wait:** <100ms (instant)

### 4. Review Results

You'll see:

**Bracket Info:**
- Status: **draft** (not active yet)
- Created: timestamp
- Rationale: Full explanation of the algorithm's decisions

**Bracket Visualization:**
- Rounds (usually Round 1)
- Match cards showing:
  - Players (names with colors)
  - Game (title)
  - Status (pending)

**Quality Scores:**
- **Balance**: How fair the skill-matching is (0–100%)
- **Entertainment**: Game diversity + chaos factor (0–100%)
- **Overall**: Weighted average of all factors (0–100%)

**Estimated Duration:** How long the bracket will take

### 5. Actions You Can Take

#### ✅ Accept & Use the Bracket

The bracket is now ready to use. You can:
1. Click on individual matches to view details
2. Start the tournament
3. Proceed with match scheduling

#### ✏️ Edit a Match

Click on any match card to open the edit modal:
- Change Player A or Player B
- Change the assigned Game
- Save or delete the match

Use this if:
- A player needs to sit out
- You want to swap games for variety
- You need to balance teams differently

#### 🔄 Regenerate with Different Settings

Click "Auto-Generate Bracket" again with new parameters:
- Increase time budget → longer bracket, more matches
- Change difficulty filter → different game pool
- Regenerate multiple times to compare options

#### ❌ Cancel & Try Different Settings

If the bracket doesn't satisfy you:
1. Change the parameters
2. Click "Auto-Generate" again
3. The new bracket replaces the old one

---

## Understanding Quality Scores

### Balance (40% Weight)

**What it measures:** How fairly matched the players are

**Scale:**
- 90–100%: Excellent (perfect skill distribution)
- 75–89%: Good (fair matches)
- 50–74%: Acceptable (some imbalance)
- <50%: Poor (too many mismatches)

**How to improve:**
- Have more players with diverse skills
- Run multiple rounds instead of one bracket

### Entertainment (30% Weight)

**What it measures:** Game variety + fun factor

**Scale:**
- 80–100%: Excellent (diverse games, high chaos)
- 60–79%: Good (decent variety)
- 40–59%: Fair (some repetition)
- <40%: Poor (too many same games)

**How to improve:**
- Add more games to the active pool
- Include Party games for chaos/fun
- Avoid having 5+ of the same game type

### Time Efficiency (20% Weight)

**What it measures:** How well the bracket fits your time budget

**Scale:**
- 90–100%: Perfect (matches your budget exactly)
- 70–89%: Good (within ±10% of budget)
- 50–69%: Acceptable (slightly over/under)
- <50%: Poor (drastically doesn't fit)

**How to improve:**
- Adjust time budget to realistic amount
- Choose faster games (Party < Sport < FPS)
- Reduce match count if time is limited

### Overall Score (Weighted)

**Formula:** 0.4×Balance + 0.3×Entertainment + 0.2×Time + 0.1×Constraints

**Interpretation:**
- 80–100%: Excellent bracket, ready to use
- 70–79%: Good bracket, minor issues
- 60–69%: Acceptable but could improve
- <60%: Consider regenerating with different settings

---

## Common Scenarios & Solutions

### Scenario 1: "I Have 10 Minutes Per Game"

**Goal:** Fit 8 games into 80 minutes

**Action:**
1. Set TIME BUDGET to 80
2. Set DIFFICULTY FILTER to "casual" (faster games)
3. Click Auto-Generate
4. If TimeScore is <50%, manually reduce to 6 matches

### Scenario 2: "I Want Competitive Matches"

**Goal:** Only hardcore players, skill-balanced

**Action:**
1. First, add only hardcore players to tournament
2. Set DIFFICULTY FILTER to "hardcore"
3. Set TIME BUDGET to 150 (long, intense games)
4. Auto-Generate
5. Check Balance score — aim for >85%

### Scenario 3: "I Want Maximum Fun & Chaos"

**Goal:** Party games, high entertainment

**Action:**
1. Add Party games (Among Us, Jackbox) to active pool
2. Set DIFFICULTY FILTER to "casual"
3. Set TIME BUDGET to 60–90
4. Auto-Generate
5. Check Entertainment score — aim for >80%

### Scenario 4: "I Have Too Many Players"

**Problem:** 20 players, but bracket only has 8 matches

**Solutions:**
- Generate 2 brackets in parallel (manual edit)
- Or increase TIME BUDGET significantly → allows more matches
- Or run multiple tournament rounds

### Scenario 5: "Bracket Quality Score Is Low"

**If Balance <70%:**
- Ensure you have players with different skill levels
- Run multiple rounds to give everyone fair chances

**If Entertainment <60%:**
- Add more games to the active pool
- Include diverse game tags (FPS, Party, Sport, etc.)

**If TimeScore <50%:**
- Adjust your TIME BUDGET to be more realistic
- Or reduce match count manually

---

## Admin Tips & Tricks

### Tip 1: Pre-Plan Your Game Pool

Before generating:
1. Go to Games tab in Admin
2. Mark games as "in Active Pool" (toggle)
3. Only checked games will be used for bracket
4. This gives you control over which games appear

### Tip 2: Use Difficulty Filter Strategically

- **All** = balanced mix (safest for mixed-skill events)
- **Casual** = fast, fun, good for time constraints
- **Hardcore** = intense, long, competitive only
- **Medium** = sweet spot for most LANs

### Tip 3: Regenerate to Compare Options

```
Budget 120, Filter All
  → Overall 78%

Budget 120, Filter Casual
  → Overall 81%

Choose the higher score!
```

### Tip 4: Edit Judiciously

Don't manually rebalance too much:
- Auto-algorithm is proven
- Manual changes can break fairness
- Only edit for specific player conflicts

### Tip 5: Record Good Brackets

If you generate a great bracket (80%+ Overall):
1. Take a screenshot
2. Save the Time Budget + Filter settings
3. Reuse same config for future events

---

## Troubleshooting

### "Error: At least 2 active tournament players required"

**Cause:** Not enough players in tournament track

**Fix:**
1. Go to Players tab
2. Add more players
3. Make sure they have role "Spieler"
4. Make sure TOURNAMENT track is activated for them

### "Error: No games available in active pool"

**Cause:** No games marked as "in Active Pool"

**Fix:**
1. Go to Games tab
2. Toggle games to "in Active Pool"
3. At least 2 games recommended

### "Time Score is very low (e.g., 15%)"

**Cause:** Bracket duration much shorter than budget

**Fix:**
- Option 1: Lower your time budget to match reality
- Option 2: Manually add slower games (RTS, Strategy)
- Option 3: Add more matches (manually edit)

### "I only see 2 matches but I have 8 players"

**Cause:** Round-Robin pairs players; 8 players = 4 matches

**Note:** This is normal! The bracket is "Round 1". To include all players:
1. Increase TIME BUDGET (more time = more matches)
2. Or manually add Round 2, 3 (for tournament progression)

### "The same game appears 3 times in a row"

**Cause:** Limited game pool or high frequency

**Fix:**
1. Add more games to active pool
2. Or change DIFFICULTY FILTER to expand choices
3. Manually swap one game assignment

---

## Best Practices for Event Flow

### Pre-Event (1 hour before)

1. **Prepare Game Pool**
   - Confirm which games are playable
   - Toggle them in Games tab
   - Remove broken/unavailable games

2. **Gather Players**
   - Have players self-register in `/play`
   - Ensure at least 4 players for good bracket

3. **Generate Bracket**
   - Time Budget: 120–180 min (full event)
   - Difficulty: "all" (mixed)
   - Aim for Overall Score >75%

4. **Review & Adjust**
   - Check balance (fairness)
   - Check entertainment (variety)
   - Make minor edits if needed

5. **Announce**
   - Show bracket on TV display
   - Let players see their first match
   - Explain the structure

### During Event

1. Start Match
2. Monitor scores
3. After match: confirm result
4. Repeat for next match

### Post-Event

- Archive bracket (checkpoint)
- Review quality metrics
- Save good settings for next LAN

---

## FAQ

**Q: Can I generate multiple brackets in parallel?**  
A: Yes, but LAN-OS stores one active bracket. Workaround: generate, screenshot, then regenerate.

**Q: Can I adjust how balance is calculated?**  
A: Not in current MVP. Algorithm is 40/30/20/10 weighted. Future: admin config.

**Q: What if a player joins mid-tournament?**  
A: Regenerate the bracket with new player list, or manually add them to an upcoming match.

**Q: How long does generation take?**  
A: <100ms. Instant for human perception.

**Q: Can I save and restore brackets?**  
A: Indirectly through System Checkpoints (full state backup).

**Q: What's the maximum number of matches?**  
A: Default max 8 matches. Configurable by developers.

---

## Support

For issues or feature requests:
1. Check IMPLEMENTATION_SUMMARY.md for technical details
2. Review BRACKET_PLANNER_TEST_EXAMPLES.md for expected behaviors
3. Contact dev team with:
   - Input parameters (time budget, filter)
   - Player count
   - Game count
   - Expected vs actual behavior

---

**Happy Bracketing!**  
Generated bracket, reviewed quality score, adjusted if needed, started tournament. ✅

