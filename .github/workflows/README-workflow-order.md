# Workflow order update

Daily order during daylight saving time:

1. Load All MLB Phase 1 Data - 3:15 AM ET
   - Loads all MLB source data
   - Updates legacy matchup prediction actuals
   - Loads Reds batter-vs-pitcher history
   - Saves legacy Reds matchup prediction snapshots
   - Snapshots V1 and V2 league-wide predictions
2. Load V3 Hit Actuals - runs after Phase 1 succeeds, with 8:15 AM ET backup
3. Run V3 Hit Model - runs after V3 actuals succeeds, with 8:35 AM ET backup
4. Refresh MLB Hit Board Performance - runs after V3 model succeeds, with 8:50 AM ET backup
5. Load Hit Prop Market Odds - 9:00 AM ET

Key changes:
- Daily Reds Data Load is retired and no longer scheduled.
- Its still-required BvP, legacy snapshot, and legacy actual-update steps now run inside Phase 1.
- V3 model no longer runs immediately after Phase 1.
- V3 model waits for Load V3 Hit Actuals.
- V3 model checks that previous-day actuals are closed before training.
- V3 feature validation checks v_mlb_ml_today_features_v3_wide.
- Odds remain at 9:00 AM ET because they are not required for V3 training.

Retirement procedure:
1. Upload the replacement Phase 1 workflow.
2. Replace Daily Reds Data Load with the manual-only retired workflow.
3. Run Phase 1 manually and verify all consolidated steps succeed.
4. Allow one scheduled Phase 1 cycle to complete.
5. Delete .github/workflows/daily-reds-batting.yml.
