# Workflow order update

Daily order during daylight saving time:

1. Daily Reds Data Load - 3:00 AM ET
2. Load All MLB Phase 1 Data - 3:15 AM ET
3. Load V3 Hit Actuals - runs after Phase 1 succeeds, with 8:15 AM ET backup
4. Run V3 Hit Model - runs after V3 actuals succeeds, with 8:35 AM ET backup
5. Refresh MLB Hit Board Performance - runs after V3 model succeeds, with 8:50 AM ET backup
6. Load Hit Prop Market Odds - 9:00 AM ET

Key changes:
- V3 model no longer runs immediately after Phase 1.
- V3 model waits for Load V3 Hit Actuals.
- V3 model checks that previous-day actuals are closed before training.
- V3 feature validation checks v_mlb_ml_today_features_v3_wide.
- Odds moved to 9:00 AM ET because they are not required for V3 training.
