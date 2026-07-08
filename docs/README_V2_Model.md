# MLB Hit Lab -- V2 Recommended Model

## Objective

Opportunity-adjusted ranking model for selecting today's best hitters.

## Philosophy

V2 improves on V1 by incorporating expected opportunity while avoiding
duplication of signals already present inside Matchup Score.

## Core Inputs

-   V1 Matchup Score
-   Expected Plate Appearances
-   Lineup position
-   Existing V1 signals (indirectly)

## Current Recommendation

Default board sorting should use V2.

## Evaluation

Primary KPI: - Top Pick - Top 5 - Top 10 - Top 25 - Season hit rate

Historical backtesting should be rerun whenever logic changes.
