# MLB Hit Lab Roadmap

**Version:** 1.1  
**Last Updated:** July 31, 2026

---

# Vision

MLB Hit Lab is evolving from a single hit-prediction experience into a trusted, explainable, and context-aware baseball intelligence platform.

The near-term priority remains improving the V3 hit model and completing the platform capabilities already planned. Future releases will simplify the product experience by combining the MLB Hit Board and Team Hit Board, then expand the product into additional prediction markets such as total bases and home runs.

This roadmap is organized into four horizons.

---

# Product Direction

The product should gradually move toward one primary Hit Board experience.

The future main board will support:

1. **Today's View** — the default experience showing the top 25 players across MLB.
2. **Game View** — a selectable matchup view showing players from one chosen game.
3. **Prediction Target** — a top-right selector that changes the board between:
   - over 0.5 hits probability
   - total bases probability
   - home run probability

The underlying modeling platform should support these experiences through shared data, features, evaluation, serving, and monitoring, even when the prediction targets use separate trained models.

---

# Horizon 1 — Near-Term Commitments
## Objective: Complete the Current V3 Roadmap and Improve Reliability

The near-term scope remains the work already identified for the V3 hit model and supporting platform.

## Explainability

Continue improving model explainability so users understand *why* a player is recommended.

Goals:

- SHAP feature importance
- feature contribution reporting
- human-readable driver summaries
- clear positive drivers and risk factors
- consistent explanations across the MLB and game-specific views

Example:

```text
Prediction: 71.4%

Primary Drivers
+ Excellent matchup vs fastballs
+ Positive xBA edge
+ Strong recent form

Negative Drivers
- Elevated strikeout risk
- Below-average park factor
```

---

## Prediction Confidence

Continue separating probability from confidence.

Confidence should consider:

- sample sizes
- arsenal coverage
- missing Statcast data
- injury uncertainty
- projected playing time
- lineup confirmation
- starting-pitcher confirmation
- model calibration quality

---

## Model Monitoring

Create or improve dashboards for:

- calibration drift
- feature drift
- prediction drift
- daily performance
- model degradation
- Top-N performance
- confidence-bucket performance
- missing-data rates
- serving-cache health

---

## Platform and Cleanup Work

Complete the remaining near-term engineering work:

- finish legacy Reds UI, database, script, and workflow cleanup
- remove deprecated compatibility wrappers after validation
- retire obsolete Reds-only database views safely
- keep the generic Team Hit Board serving layer authoritative
- improve automated validation and rollback procedures
- document the production data flow and model-serving contracts

---

# Horizon 2 — Context-Aware V3 Hit Model
## Objective: Make the Existing Hit Model More Complete

Continue improving the probability of recording at least one hit by adding contextual features that can materially affect the outcome.

## Weather

Incorporate:

- wind speed and direction
- temperature
- humidity
- air density
- precipitation risk
- roof status
- weather-data freshness

Weather effects should be evaluated by outcome type because wind and air density may influence home runs and extra-base hits more than singles.

---

## Advanced Park Factors

Model:

- singles
- doubles
- triples
- home runs
- total bases
- left- and right-handed splits
- park-by-weather interactions

---

## Umpire Tendencies

Potential features:

- strike-zone size
- called-strike percentage
- walk rate
- strikeout rate
- handedness effects
- historical consistency

---

## Lineup Context

Account for:

- batting order
- lineup protection
- expected plate appearances
- RBI opportunities
- pitch-around probability
- confirmed versus projected lineup status

---

## Bullpen Quality

Estimate expected bullpen exposure after the starting pitcher exits.

Potential features:

- projected starting-pitcher innings
- bullpen quality
- bullpen handedness mix
- bullpen availability and recent workload
- leverage reliever availability
- expected opposing reliever quality
- team bullpen fatigue

Bullpen context should influence both the current hit model and future total-bases and home-run models.

---

## Rest and Travel

Potential features:

- day game after night game
- travel distance
- time-zone changes
- consecutive games
- recent doubleheaders
- player rest days
- team schedule density

---

# Horizon 3 — Unified Hit Board Experience
## Objective: Merge the MLB and Team Hit Boards Into One Primary Page

The Team Hit Board should eventually be absorbed into the main MLB Hit Board.

## Default View

The main Hit Board should open in:

```text
Today's View
```

This view will continue to show the top 25 players across MLB, ranked by the selected prediction target.

## Game Selector

Add a view selector that allows the user to switch from Today's View to a specific matchup.

Suggested interaction:

```text
View: Today's Top 25 | Select a Game
```

When a game is selected:

- the board filters to the selected `game_pk`
- both teams are shown
- All, Away, and Home filters remain available
- matchup-pitcher context updates
- player drawers continue to explain the selected target
- the URL or page state should preserve the selected game when practical

## Product Simplification

After the unified page is stable:

- remove the separate Team Hit Board navigation item
- remove duplicate page-level components
- retain one shared game selector
- retain one shared player table and drawer
- keep one serving contract for Today's View and Game View
- preserve the Cincinnati game as an optional preferred default only if that remains a product requirement

## Required Validation

Before removing the separate Team Hit Board:

- Today's Top 25 results must remain unchanged
- selected-game results must match the current Team Hit Board
- pitcher toggles and handedness splits must remain available
- player drawers must work in both modes
- filters must not leak state between games
- mobile and tablet layouts must remain usable
- browser refresh and direct navigation must restore a valid default state

---

# Horizon 4 — Multi-Target Prediction Platform
## Objective: Add Total Bases and Home Run Predictions

Add a prediction-target selector in the top-right area of the main Hit Board.

Suggested targets:

```text
Over 0.5 Hits
Total Bases
Home Run
```

The exact total-bases presentation requires a product decision. Possible options include:

- probability of over 0.5 total bases
- probability of over 1.5 total bases
- probability of over 2.5 total bases
- expected total bases
- a distribution across 0, 1, 2, 3, and 4+ total bases

The selected target should update:

- rankings
- probability column
- confidence
- model explanations
- positive and negative drivers
- player-drawer metrics
- odds comparisons
- evaluation scorecards

---

# Recommended Model Architecture

## Recommendation: Shared Platform, Separate Target Models

The recommended initial architecture is **not one large model producing every prediction**.

Use:

- one shared data and feature platform
- separate target-specific models
- one common serving and UI contract

Initial specialist models:

1. **Hit Model**
   - Target: at least one hit
   - Label: `hits >= 1`

2. **Home Run Model**
   - Target: at least one home run
   - Label: `home_runs >= 1`

3. **Total Bases Model**
   - Target depends on product design:
     - expected total bases, or
     - probability of exceeding a selected threshold

## Why Separate Models Are Safer Initially

The targets behave differently:

- home runs are much rarer and more imbalanced than hits
- total bases is ordinal or count-like rather than a simple hit/no-hit outcome
- weather and park factors may have different importance by target
- bullpen exposure may affect total bases differently from hit probability
- calibration requirements differ
- evaluation metrics differ
- the most important features may differ
- release and rollback can be handled independently

Separate models make it easier to:

- tune each target appropriately
- calibrate each probability independently
- explain why a player ranks highly for that target
- compare specialist-model performance
- avoid degrading the existing V3 hit model while adding new outcomes

## Shared Components

All models should reuse:

- player and game identifiers
- lineup context
- starting-pitcher features
- bullpen features
- weather features
- park factors
- Statcast quality-of-contact features
- pitch-arsenal features
- feature catalog
- model registry
- experiment tracking
- serving cache
- player drawer framework
- monitoring and evaluation framework

## Multi-Task Model Research Track

A multi-output or multi-task model may be evaluated later.

Possible outputs:

```text
P(Hit >= 1)
P(HR >= 1)
Expected Total Bases
P(TB > 1.5)
```

A multi-task model should replace specialist models only if it demonstrates:

- equal or better calibration for every target
- equal or better Top-N performance
- stable performance for rare outcomes
- interpretable target-specific explanations
- simpler operations without creating target coupling
- safe independent rollback behavior

The initial production recommendation remains separate models on a shared platform.

---

# Total Bases Modeling Decision

Before building the total-bases model, choose the primary product target.

## Option A — Expected Total Bases

Predict a numeric expectation:

```text
Expected TB: 1.36
```

Advantages:

- represents the full outcome range
- supports ranking
- can feed simulation
- avoids maintaining separate models for every threshold

Challenges:

- less directly comparable to sportsbook over/under probabilities
- requires a count, ordinal, or distributional modeling approach

## Option B — Threshold Probabilities

Predict probabilities such as:

```text
P(TB > 0.5)
P(TB > 1.5)
P(TB > 2.5)
```

Advantages:

- aligns directly to common markets
- easier for users to interpret
- easier to compare with odds

Challenges:

- may require multiple calibrated outputs
- probabilities must remain logically ordered
- separate threshold models can become difficult to maintain

## Option C — Outcome Distribution

Predict:

```text
P(0 TB)
P(1 TB)
P(2 TB)
P(3 TB)
P(4+ TB)
```

Then derive expected total bases and threshold probabilities from the distribution.

This is the strongest long-term architecture if it can be calibrated reliably, but it is more complex than the initial binary models.

## Recommended Sequence

1. Launch a separate binary home-run model.
2. Prototype expected total bases and a total-bases distribution.
3. Compare calibration and business usability.
4. Choose the serving format.
5. Derive threshold probabilities from the distribution when reliable.
6. Evaluate multi-task learning only after the specialist baselines are established.

---

# Expanded Evaluation Framework

Each target requires target-specific evaluation.

## Hit Model

- log loss
- Brier score
- calibration
- ROC AUC
- PR AUC
- Top-N hit rate
- lift versus baseline

## Home Run Model

- log loss
- Brier score
- calibration
- PR AUC
- precision at Top-N
- lift versus league baseline
- rare-event stability
- performance by park and weather bucket

## Total Bases Model

Depending on the target:

- MAE or RMSE for expected total bases
- ordinal log loss
- distribution calibration
- threshold Brier score
- calibration at 0.5, 1.5, and 2.5 thresholds
- Top-N expected-value performance

## Cross-Target Monitoring

Monitor:

- correlated errors
- target-specific feature drift
- missing weather or bullpen data
- player-level consistency
- probability ordering
- odds-market coverage
- serving latency

---

# Future AI Baseball Platform

## Game Simulation Engine

Move beyond individual probabilities by running thousands of simulated games.

Outputs:

- expected hits
- multi-hit probability
- total-bases distribution
- home-run probability
- distribution of player and team outcomes
- correlated player outcomes

---

## AI Matchup Engine

Provide natural-language explanations for every prediction target.

Example:

```text
José Ramírez grades highly for total bases because today's pitcher allows
elevated damage against left-handed hitters, the park favors extra-base power,
and the projected bullpen has below-average hard-hit suppression.
```

Explanations should change with the selected target. A hitter may have a strong probability of recording a hit without being an equally strong home-run candidate.

---

## Personalized Decision Support

Enable questions such as:

- What is the safest hit parlay today?
- Which players are positively correlated?
- Which props appear overpriced?
- What are today's best value plays?
- Which players have the best total-bases upside?
- Which home-run probabilities are most underpriced?

---

## Ensemble and Simulation Research

Potential future architecture:

```text
Shared Feature Platform
        ↓
Hit Specialist Model
Home Run Specialist Model
Total Bases Distribution Model
Weather and Park Context
Bullpen Context
Simulation Engine
        ↓
Target-Specific Calibration
        ↓
Unified Serving Layer
```

A meta-model or ensemble can be added where it improves a specific target. It should not be introduced solely to combine all targets into one opaque model.

---

# Long-Term Product Evolution

| Version | Focus |
|---|---|
| V1 | Rolling statistics |
| V2 | Machine learning |
| V3 | Context-aware hit probability |
| V3.x | Weather, park, bullpen, lineup, and monitoring improvements |
| V4 | Unified Hit Board and multi-target predictions |
| V5 | Explainable baseball intelligence platform |
| V6 | Full game simulation engine |

---

# Product Priorities

When engineering capacity is limited, prioritize platform capabilities that improve every target.

Recommended priorities:

1. complete current V3 explainability and monitoring work
2. improve the V3 hit model with weather and bullpen context
3. finish legacy Reds cleanup
4. create a shared target-agnostic feature catalog
5. unify Today's View and Game View
6. establish target-specific labels and evaluation datasets
7. build a home-run specialist model
8. prototype total-bases distribution modeling
9. add the prediction-target selector
10. expand odds and Market Edge support by target
11. evaluate multi-task modeling against specialist baselines
12. build simulation and personalized decision support

---

# Success Metrics

The roadmap should be evaluated not only by predictive accuracy, but also by:

- better calibrated probabilities
- increased Top-N prediction performance
- target-specific lift versus baseline
- improved model transparency
- faster experimentation
- reduced deployment risk
- easier product navigation
- consistent behavior between Today's View and Game View
- reliable target switching
- improved odds-market coverage
- easier onboarding for future contributors

---

# Key Architecture Decisions Still Required

Before Horizon 4 implementation, document decisions for:

1. total-bases target definition
2. home-run training window and class-imbalance strategy
3. whether total bases is modeled as a count, ordinal distribution, or thresholds
4. shared versus target-specific feature sets
5. target-specific calibration approach
6. shared serving-table schema
7. UI behavior when one target has missing data
8. odds-market mapping by target
9. versioning strategy across multiple models
10. criteria for promoting a multi-task model

---

# Guiding Principles

1. Preserve the quality and stability of the current V3 hit model.
2. Add new prediction targets without forcing them into an unsuitable shared model.
3. Share data, features, infrastructure, and UI patterns wherever practical.
4. Keep probabilities calibrated and target-specific.
5. Make the selected view and prediction target obvious to users.
6. Prefer reversible releases with clear validation and rollback steps.
7. Explain why a player ranks highly for the selected outcome.
8. Build toward one coherent baseball intelligence platform rather than disconnected pages.

The long-term goal is not simply to predict who gets a hit.

The goal is to provide a unified, explainable, and context-aware view of the baseball outcomes that matter most.
