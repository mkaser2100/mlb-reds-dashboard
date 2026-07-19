
# MLB Hit Lab Roadmap

**Version:** 1.0  
**Last Updated:** July 2026

---

# Vision

The prediction model is no longer the bottleneck. The next phase of MLB Hit Lab is to evolve from a machine learning model into an intelligent baseball decision platform.

This roadmap is organized into three horizons.

---

# Horizon 1 (Next 2–3 Months)
## Objective: Make V3 the Best Predictor Possible

### Explainability

Add model explainability so users understand *why* a player is recommended.

Goals:
- SHAP feature importance
- Feature contribution reporting
- Human-readable driver summaries

Example:

```
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

### Prediction Confidence

Separate probability from confidence.

Confidence should consider:

- Sample sizes
- Arsenal coverage
- Missing Statcast data
- Injury uncertainty

---

### Model Monitoring

Create dashboards for:

- Calibration drift
- Feature drift
- Prediction drift
- Daily performance
- Model degradation

---

# Horizon 2 (3–6 Months)
## Objective: Context-Aware Baseball Intelligence

### Weather

Incorporate:

- Wind
- Temperature
- Humidity
- Air density

---

### Advanced Park Factors

Model:

- Singles
- Doubles
- Home runs
- Left/right-handed splits

---

### Umpire Tendencies

Potential features:

- Strike zone size
- Called strike percentage
- Walk rate
- Strikeout rate

---

### Lineup Context

Account for:

- Batting order
- Lineup protection
- RBI opportunities
- Pitch-around probability

---

### Bullpen Quality

Estimate expected bullpen exposure and quality after the starting pitcher exits.

---

### Rest & Travel

Potential features:

- Day game after night game
- Travel distance
- Time zones
- Consecutive games

---

# Horizon 3 (6–12+ Months)
## Objective: Build an AI Baseball Platform

### Game Simulation Engine

Move beyond individual probabilities by running thousands of simulated games.

Outputs:

- Expected hits
- Multi-hit probability
- Home run probability
- Distribution of outcomes

---

### AI Matchup Engine

Provide natural language explanations for every prediction.

Example:

```
Jose Ramirez grades highly because today's pitcher throws a heavy sinker mix,
and Ramirez owns an elite expected batting average against sinkers. Combined
with the pitcher's high hard-hit rate allowed, this creates a favorable matchup.
```

---

### Personalized Decision Support

Enable questions such as:

- What's the safest hit parlay today?
- Which players are positively correlated?
- Which props appear overpriced?
- What are today's best value plays?

---

### Ensemble Modeling

Transition from a single model to multiple specialist models.

Example architecture:

```
Recent Form Model
        +
Traditional Feature Model
        +
Statcast Model
        +
Pitch Arsenal Model
        +
Weather Model
        +
Simulation Model
        ↓
Meta Model
```

---

# Long-Term Product Evolution

| Version | Focus |
|---------|-------|
| V1 | Rolling statistics |
| V2 | Machine learning |
| V3 | Context-aware predictions |
| V4 | Explainable AI |
| V5 | Baseball intelligence platform |
| V6 | Full game simulation engine |

---

# Product Priorities

If engineering capacity is limited, prioritize investments in platform capabilities over incremental feature additions.

Recommended priorities:

1. SHAP explainability
2. Model registry improvements
3. Experiment tracking
4. Feature catalog
5. Drift detection
6. Performance dashboards
7. A/B testing framework
8. Automated model monitoring

These capabilities make every future enhancement faster, easier to validate, and safer to deploy.

---

# Success Metrics

The roadmap should be evaluated not only by predictive accuracy, but also by:

- Better calibrated probabilities
- Increased Top-N prediction performance
- Faster experimentation
- Improved model transparency
- Reduced deployment risk
- Easier onboarding for future contributors

---

# Guiding Principle

The long-term goal is not simply to predict who gets a hit.

The goal is to build the most trusted, explainable, and context-aware baseball intelligence platform possible.
