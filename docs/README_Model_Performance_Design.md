# MLB Hit Lab -- Model Performance Page Design (Latest UX)

## Overview

The Model Performance page compares V1 Classic, V2 Recommended, and V3
ML in a clean, analytics-focused layout. The design emphasizes quick
comparison with minimal scrolling.

------------------------------------------------------------------------

## Page Layout

A stacked four-card layout:

1.  Model Scorecard
2.  Rolling Performance
3.  Score Buckets
4.  Feature Importance / Component Signal Check

Cards are stacked vertically for readability (especially on iPad).

------------------------------------------------------------------------

## Global Model Selector

Displayed at the top of the page:

`All | V1 | V2 | V3`

Behavior:

-   Card 1 respects the selector.
-   Card 4 respects the selector.
-   Cards 2 and 3 always show all models for comparison.

------------------------------------------------------------------------

# Card 1 -- Model Scorecard

**Title:** Cross-Model Bucket Performance

Displays one row per model.

  Model              Top Pick   Top 5   Top 10   Top 20   Top 25   Overall
  ---------------- ---------- ------- -------- -------- -------- ---------
  V1 Classic                                                     
  V2 Recommended                                                 
  V3 ML                                                          

Optional time selector:

-   Season
-   Last 30
-   Last 7

Purpose:

-   Quickly determine which model is performing best.

------------------------------------------------------------------------

# Card 2 -- Rolling Performance

**Full-width comparison table**

One row per rolling window.

  --------------------------------------------------------------------------------
  Window    TP V1  TP V2  TP V3 Top5 V1 Top5 V2 Top5 V3 Top10 V1 Top10 V2 Top10 V3
  -------- ------ ------ ------ ------- ------- ------- -------- -------- --------
  Last 7                                                                  

  Last 14                                                                 

  Last 30                                                                 

  Season                                                                  
  --------------------------------------------------------------------------------

Design Notes

-   One row per time window.
-   Models compared horizontally.
-   Highlight winner in each metric.
-   Always displays all three models.

Purpose:

-   Determine consistency over time.

------------------------------------------------------------------------

# Card 3 -- Score Buckets

**Full-width comparison table**

  Bucket Rank      V1   V2   V3
  ---------------- ---- ---- ----
  Highest Bucket             
  Bucket 2                   
  Bucket 3                   

Each model cell contains:

-   Hit Rate
-   Bucket Label / Range
-   Players
-   Hits (space permitting)

Purpose:

-   Compare calibration across models.

------------------------------------------------------------------------

# Card 4 -- Feature Importance

**Title**

Feature Importance

Component Signal Check

Behavior:

-   All mode = show top features for each model.
-   V1/V2/V3 mode = show selected model only.

Columns:

  Model   Feature   Signal     Value
  ------- --------- -------- -------

Signal bars should be normalized to the largest absolute signal value.

Purpose:

-   Explain WHY each model performs the way it does.

------------------------------------------------------------------------

# UX Principles

The page should answer four questions:

1.  Which model is winning?
2.  Is performance stable across rolling windows?
3.  Are model scores calibrated?
4.  Why is each model succeeding?

Cards 2 and 3 are permanent comparison cards.

Cards 1 and 4 are detail cards driven by the global selector.

This layout minimizes scrolling while maximizing readability and
comparison.
