# MLB Hit Lab -- Hit Board Design

## Purpose

The MLB Hit Board is the flagship experience for discovering the
highest-probability hitters each day.

## Views

-   **ML Prediction (Recommended)** --- default experience using V2
    ranking with V1 retained for benchmarking.
-   Future: V3-only probability view.

## Principles

-   Sort by V2 Recommended Rank.
-   Keep V1 Matchup Score visible for transparency.
-   Today's Outlook summarizes the top V2/V3 consensus plays.
-   Clicking a player opens the detail drawer.

## Primary Columns

-   Recommended Rank
-   Player
-   Team
-   Recommended (V2)
-   Matchup Score (V1)
-   V1 Rank
-   Expected PA
-   Recent Form
-   Batter Split
-   SP Vulnerability

## UX Goals

-   Minimal clicks
-   Explain recommendations
-   Surface consensus between models
