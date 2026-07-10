# MLB Hit Lab — V3 ML Model Deep Technical Architecture

# Version History

| Version | Date | Summary |
|---------|------|---------|
| **V3.0.0** | Initial Release | Initial production release of the V3 machine learning hit prediction model. |
| **V3.0.1** | July 2026 | **DNP Evaluation Fix** – Updated model evaluation logic so players who Did Not Play (DNP) are excluded from model scoring and performance metrics. Aligns V1, V2, and V3 evaluation methodology while leaving prediction generation unchanged. |
| **V3.0.2** | July 2026 | **Ineligible Player Filtering** – Added automated roster snapshot filtering to exclude players on the Injured List (IL) and other ineligible roster statuses from daily prediction generation. |
| **V3.0.3** | July 2026 | **Small Sample Pitcher Stabilization** – Added reliability-weighted stabilization for opposing pitcher metrics (BAA, WHIP, ERA, vulnerability, recent form, and matchup score) to prevent extremely small pitching samples from disproportionately influencing hitter rankings. |


_Last rebuilt from live Supabase metadata and GitHub Python implementation inspection._

## 1. Executive Summary

V3 is MLB Hit Lab's first true supervised machine-learning prediction engine. It predicts whether a hitter records at least one hit in a game.

The current target is:

```text
hit_1plus
```

The current Python implementation trains and evaluates multiple scikit-learn candidate models, selects the best candidate using validation metrics, serializes the winning model as a joblib artifact, registers the model run in Supabase, scores today's hitter-game rows, writes V3 predictions into Supabase, and then a GitHub Actions workflow activates the official prediction run.

The current selected model in the latest inspected Supabase registry run is:

```text
logistic_regression
```

The actual training script evaluates these candidate algorithms:

```text
logistic_regression
random_forest
hist_gradient_boosting
```

The implementation uses:

```text
Python 3.11
pandas
numpy
scikit-learn
joblib
supabase-py
GitHub Actions
Supabase/PostgreSQL
```

---

## 2. Architecture at a Glance

```text
GitHub Actions
    |
    | 1. Load previous V3 actuals
    | 2. Validate prior-day actuals are closed
    | 3. Validate today's V3 feature view is current
    | 4. Run Python training/scoring script
    | 5. Activate the official V3 prediction run
    v

Python V3 Training/Scoring Script
    |
    | reads
    v
Supabase training feature view
public.v_mlb_ml_training_features_v3_hit_1plus_wide
    |
    | time-based split
    v
scikit-learn candidate pipelines
    |
    | evaluate candidate models
    v
select best model
    |
    | joblib.dump artifact
    | insert model registry row
    v
public.mlb_ml_model_runs
    |
    | score current-day feature rows
    v
public.v_mlb_ml_today_features_v3_wide
    |
    | insert predictions
    v
public.mlb_ml_predictions_v3
    |
    | activation RPC
    v
official active V3 predictions
    |
    | after games finish
    v
public.load_mlb_v3_actuals(...)
    |
    | evaluated rows
    v
performance, calibration, scorecard, and app cache views
```

---

## 3. Main Source Files

## 3.1 Python training/scoring script

```text
scripts/train_score_v3_hit_model.py
```

This is the core V3 implementation.

It reads:

```text
public.v_mlb_ml_training_features_v3_hit_1plus_wide
public.v_mlb_ml_today_features_v3_wide
```

It writes:

```text
public.mlb_ml_model_runs
public.mlb_ml_predictions_v3
```

It uses these important constants:

```python
TARGET_NAME = "hit_1plus"
TRAINING_VIEW = "v_mlb_ml_training_features_v3_hit_1plus_wide"
TODAY_VIEW = "v_mlb_ml_today_features_v3_wide"
MODEL_RUNS_TABLE = "mlb_ml_model_runs"
PREDICTIONS_TABLE = "mlb_ml_predictions_v3"
ARTIFACT_DIR = Path("artifacts/mlb_v3")
WINDOWS = [3, 5, 6, 10, 15]
```

## 3.2 Python dependencies

```text
requirements-v3-ml.txt
```

Current dependency contract:

```text
pandas>=2.0.0
numpy>=1.24.0
scikit-learn>=1.4.0
joblib>=1.3.0
supabase>=2.4.0
```

## 3.3 V3 model workflow

```text
.github/workflows/run-v3-hit-model.yml
```

Purpose:

- Run the V3 training/scoring job.
- Validate previous V3 actuals are loaded before training.
- Validate the wide V3 feature view has today's target date.
- Train and score the model.
- Validate predictions were written.
- Activate the official V3 prediction run.

## 3.4 V3 actuals workflow

```text
.github/workflows/load-v3-hit-actuals.yml
```

Purpose:

- Load actual outcomes for the previous prediction date.
- Validate batting-game-log coverage.
- Call the Supabase actuals loader.
- Confirm coverage is sufficient.

---

## 4. Runtime Configuration

The script expects the following environment variables.

## 4.1 Required

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

The service role key should be used only in GitHub Actions or backend runtime contexts, never in the browser.

## 4.2 Optional

```text
V3_MODEL_VERSION
V3_MIN_TRAIN_ROWS
V3_VALIDATION_DAYS
V3_DRY_RUN
```

Defaults:

| Variable | Default |
|---|---|
| `V3_MODEL_VERSION` | `v3_hit_YYYYMMDD_HHMMSS` |
| `V3_MIN_TRAIN_ROWS` | `1000` |
| `V3_VALIDATION_DAYS` | `7` |
| `V3_DRY_RUN` | `false` |

---

## 5. Model Target

The target is:

```text
target_hit_1plus
```

Meaning:

```text
1 = hitter recorded at least one hit
0 = hitter did not record a hit
```

The model is therefore a binary classifier.

The prediction output is:

```text
predicted_probability = P(target_hit_1plus = 1)
```

---

## 6. Feature Architecture

V3 uses a wide-window feature design.

Instead of giving the model one value per signal, V3 gives it multiple rolling windows for each numeric feature family:

```text
3-game window
5-game window
6-game window
10-game window
15-game window
```

The window list is hardcoded as:

```python
WINDOWS = [3, 5, 6, 10, 15]
```

## 6.1 Numeric feature bases

The script defines these numeric feature bases:

```python
WINDOW_NUMERIC_BASES = [
    "matchup_score",
    "hot_score",
    "recent_form_score",
    "batter_split_score",
    "pitcher_vulnerability_score",
    "pitcher_recent_form_score",
    "batter_recent_avg",
    "batter_recent_hits",
    "batter_recent_at_bats",
    "batter_recent_hit_rate",
    "batter_split_avg",
    "batter_split_ab",
    "batter_split_reliability",
    "pitcher_baa_split",
    "pitcher_last5_era",
    "pitcher_last5_whip",
]
```

Each base is expanded across every rolling window:

```python
NUMERIC_FEATURES = [
    f"{base}_w{window}"
    for base in WINDOW_NUMERIC_BASES
    for window in WINDOWS
]
```

That produces:

```text
16 numeric bases × 5 windows = 80 numeric features
```

## 6.2 Categorical features

The model also uses two categorical features:

```python
CATEGORICAL_FEATURES = [
    "batter_bats",
    "pitcher_throws",
]
```

Total feature count:

```text
80 numeric + 2 categorical = 82 features
```

## 6.3 Full feature list pattern

Examples:

```text
matchup_score_w3
matchup_score_w5
matchup_score_w6
matchup_score_w10
matchup_score_w15

recent_form_score_w3
recent_form_score_w5
recent_form_score_w6
recent_form_score_w10
recent_form_score_w15

batter_recent_hit_rate_w3
batter_recent_hit_rate_w5
batter_recent_hit_rate_w6
batter_recent_hit_rate_w10
batter_recent_hit_rate_w15

pitcher_last5_whip_w3
pitcher_last5_whip_w5
pitcher_last5_whip_w6
pitcher_last5_whip_w10
pitcher_last5_whip_w15
```

## 6.4 Why wide-window architecture matters

The wide-window design lets the model learn whether short-term or longer-term signals matter more.

For example:

- A hitter may be very hot over 3 games but average over 15 games.
- Another hitter may be steady over 15 games but not hot over 3 games.
- The model can learn which pattern historically predicts hits better.

This is better than forcing all features into one manually chosen lookback window.

---

## 7. Data Validation and Cleaning

## 7.1 Duplicate player-game validation

The script validates that each dataset has only one row per:

```text
prediction_run_date
game_pk
player_id
```

If duplicates are found, the script raises an error and prints a sample.

This is important because the V3 model assumes one row per player-game. Duplicate rows would leak duplicate observations into training and corrupt ranking/scoring.

## 7.2 Required feature validation

The script requires:

```text
FEATURES
prediction_run_date
game_pk
player_id
```

For training data, it also requires:

```text
target_hit_1plus
```

## 7.3 Training data coercion

Training data is cleaned by:

1. Converting `prediction_run_date` to a date.
2. Casting `target_hit_1plus` to integer.
3. Coercing numeric feature columns with `pd.to_numeric(..., errors="coerce")`.
4. Filling categorical nulls as `"Unknown"`.
5. Dropping rows missing `prediction_run_date` or `target_hit_1plus`.

---

## 8. Time-Based Train/Validation Split

V3 uses a time-based validation split, not a random split.

The script finds the maximum prediction date in the training data, then creates a validation start date:

```python
validation_start = max_date - pd.Timedelta(days=validation_days - 1)
```

Rows before that validation start go into training:

```python
train_df = df[df["prediction_run_date"] < validation_start_date]
```

Rows on or after that validation start go into validation:

```python
valid_df = df[df["prediction_run_date"] >= validation_start_date]
```

Default validation window:

```text
7 days
```

This is the right general approach for sports/time-series prediction because it avoids training on future rows and validating on past rows.

---

## 9. scikit-learn Pipeline Architecture

The implementation uses scikit-learn `Pipeline` and `ColumnTransformer`.

The script imports:

```python
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
```

## 9.1 Numeric preprocessing for linear model

For logistic regression, numeric features go through:

```python
Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler()),
])
```

This means:

1. Missing numeric values are replaced with the median value.
2. Numeric columns are standardized.

This is appropriate for logistic regression because linear models are sensitive to feature scale.

## 9.2 Numeric preprocessing for tree models

For Random Forest and Histogram Gradient Boosting, numeric features go through:

```python
Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
])
```

Tree models do not require standard scaling, so the tree pipeline imputes missing values but does not scale numeric features.

## 9.3 Categorical preprocessing

Categorical features use:

```python
Pipeline([
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("onehot", OneHotEncoder(handle_unknown="ignore")),
])
```

This means:

1. Missing categorical values are replaced with the most frequent value.
2. Categorical values are one-hot encoded.
3. New unseen categories at scoring time are ignored instead of throwing an error.

This applies to:

```text
batter_bats
pitcher_throws
```

## 9.4 Linear preprocessor

The logistic regression model uses:

```python
linear_preprocess = ColumnTransformer([
    ("num", numeric_linear, NUMERIC_FEATURES),
    ("cat", categorical, CATEGORICAL_FEATURES),
])
```

## 9.5 Tree preprocessor

The tree-based models use:

```python
tree_preprocess = ColumnTransformer([
    ("num", numeric_tree, NUMERIC_FEATURES),
    ("cat", categorical, CATEGORICAL_FEATURES),
])
```

---

## 10. Candidate Models

The V3 script trains three candidate model pipelines every run.

## 10.1 Logistic Regression

```python
"logistic_regression": Pipeline([
    ("preprocess", linear_preprocess),
    ("model", LogisticRegression(max_iter=2000, class_weight="balanced")),
])
```

Hyperparameters:

| Parameter | Value |
|---|---|
| `max_iter` | `2000` |
| `class_weight` | `"balanced"` |

Preprocessing:

| Feature Type | Processing |
|---|---|
| Numeric | Median imputation + standard scaling |
| Categorical | Most-frequent imputation + one-hot encoding |

Why it is useful:

- Strong baseline for binary probability prediction.
- Often well-calibrated compared with tree models.
- Easier to explain and debug.
- Less prone to overfitting on small data.

## 10.2 Random Forest

```python
"random_forest": Pipeline([
    ("preprocess", tree_preprocess),
    ("model", RandomForestClassifier(
        n_estimators=300,
        min_samples_leaf=25,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced_subsample",
    )),
])
```

Hyperparameters:

| Parameter | Value |
|---|---|
| `n_estimators` | `300` |
| `min_samples_leaf` | `25` |
| `random_state` | `42` |
| `n_jobs` | `-1` |
| `class_weight` | `"balanced_subsample"` |

Preprocessing:

| Feature Type | Processing |
|---|---|
| Numeric | Median imputation |
| Categorical | Most-frequent imputation + one-hot encoding |

Why it is useful:

- Captures nonlinear relationships.
- Handles feature interactions naturally.
- Good challenger model when the signal is nonlinear.

Current concern:

- It may rank well in isolated Top-N slices, but in inspected registry runs it did not beat logistic regression on Brier score/AUC.

## 10.3 Histogram Gradient Boosting

```python
"hist_gradient_boosting": Pipeline([
    ("preprocess", tree_preprocess),
    ("model", HistGradientBoostingClassifier(
        learning_rate=0.05,
        max_iter=250,
        max_leaf_nodes=31,
        l2_regularization=0.05,
        random_state=42,
    )),
])
```

Hyperparameters:

| Parameter | Value |
|---|---|
| `learning_rate` | `0.05` |
| `max_iter` | `250` |
| `max_leaf_nodes` | `31` |
| `l2_regularization` | `0.05` |
| `random_state` | `42` |

Preprocessing:

| Feature Type | Processing |
|---|---|
| Numeric | Median imputation |
| Categorical | Most-frequent imputation + one-hot encoding |

Why it is useful:

- Strong nonlinear classifier.
- Can model interactions and thresholds.
- More expressive than logistic regression.

Current concern:

- In inspected registry results it underperformed logistic regression on calibration and AUC.

---

## 11. Candidate Model Evaluation

The script evaluates every candidate using:

```python
brier_score_loss
log_loss
roc_auc_score
```

It also calculates baseball-specific Top-N hit rates.

## 11.1 Standard ML metrics

| Metric | Meaning | Direction |
|---|---|---|
| Brier score | Mean squared error of predicted probabilities | Lower is better |
| Log loss | Penalizes confident wrong probabilities | Lower is better |
| ROC AUC | Ranking/separation ability | Higher is better |
| Positive rate | Target hit rate in validation set | Diagnostic |

## 11.2 Top-N baseball metrics

For each `k` in:

```text
1, 5, 10, 20, 25
```

The script calculates:

```text
top_k_rows
top_k_hit_rate
daily_top_k_days
daily_top_k_hit_rate
daily_top_k_min_hit_rate
daily_top_k_max_hit_rate
```

The script explicitly tracks two flavors:

### Row-weighted Top-N hit rate

Example:

```text
Top 10 across 7 days = 70 rows
each row weighted equally
```

### Daily-average Top-N hit rate

Example:

```text
Calculate Top 10 hit rate for each date, then average the daily rates
```

This prevents one larger slate from dominating the evaluation.

---

## 12. Model Selection Rule

The script selects the best model using this priority:

```text
1. Lower Brier score
2. Higher row-weighted Top 10 hit rate
3. Higher ROC AUC
```

The code implements this as:

```python
return (
    metrics["brier_score"],
    -(metrics.get("top_10_hit_rate") or 0),
    -(metrics.get("roc_auc") or 0),
)
```

This is documented in the model registry as:

```text
min_brier_then_top10_then_auc
```

## 12.1 Why this rule makes sense

The rule prioritizes calibration first.

That matters because V3 is not just a ranker; it outputs probabilities. A model that says `70%` should ideally hit close to 70% over enough sample size.

The Top-10 tiebreaker aligns the selection to the product use case: surfacing the best hitters.

The AUC tiebreaker keeps general ranking quality in the equation.

---

## 13. Latest Supabase Registry Snapshot

From live Supabase inspection, the latest model registry entry showed:

| Field | Value |
|---|---|
| Model run ID | `11` |
| Model family | `v3_ml` |
| Target | `hit_1plus` |
| Selected model | `logistic_regression` |
| Model version | `v3_hit_20260709_154445` |
| Status | `candidate` |
| Trained at | `2026-07-09 15:45:14 UTC` |
| Training start | `2026-05-22` |
| Training end | `2026-07-01` |
| Validation start | `2026-07-02` |
| Validation end | `2026-07-08` |
| Feature count | `82` |
| Artifact URI | `artifacts/mlb_v3/v3_hit_20260709_154445_logistic_regression.joblib` |

Latest candidate comparison:

| Candidate | ROC AUC | Log Loss | Brier Score | Top 1 | Top 5 | Top 10 | Top 20 | Top 25 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Logistic Regression | 0.5910 | 0.6792 | 0.2429 | 71.4% | 71.4% | 74.3% | 70.7% | 70.3% |
| Random Forest | 0.5714 | 0.6836 | 0.2451 | 42.9% | 74.3% | 64.3% | 67.9% | 67.4% |
| Histogram Gradient Boosting | 0.5519 | 0.7019 | 0.2524 | 57.1% | 62.9% | 65.7% | 67.1% | 65.7% |

Interpretation:

- Logistic regression won because it had the best Brier score.
- It also had the best AUC.
- It had the strongest Top 10 performance in the latest inspected run.
- Random Forest had a strong Top 5 result but lost on the primary selection metric.

---

## 14. Model Artifact Serialization

The script creates a local artifact path:

```python
artifact_path = ARTIFACT_DIR / f"{cfg.model_version}_{best_name}.joblib"
```

The artifact contains:

```python
{
    "model": best_model,
    "features": FEATURES,
    "numeric_features": NUMERIC_FEATURES,
    "categorical_features": CATEGORICAL_FEATURES,
    "metrics": metrics,
    "model_name": best_name,
    "model_version": cfg.model_version,
    "target_name": TARGET_NAME,
}
```

The artifact is serialized with:

```python
joblib.dump(..., artifact_path)
```

Example artifact URI:

```text
artifacts/mlb_v3/v3_hit_20260709_154445_logistic_regression.joblib
```

Important note:

The current GitHub Actions workflow creates this artifact in the runner workspace, and the model registry stores the path. If long-term artifact retention is required, the workflow should upload the artifact to GitHub Actions artifacts, Supabase Storage, S3, or another durable object store.

---

## 15. Model Registration

The script inserts a row into:

```text
public.mlb_ml_model_runs
```

Registration payload includes:

```text
model_family
target_name
model_name
model_version
status
training_start_date
training_end_date
validation_start_date
validation_end_date
feature_list
hyperparameters
metrics
artifact_uri
notes
```

Current status used by the script:

```text
candidate
```

This means a trained model run is registered as a candidate, then the workflow activates prediction rows separately.

## 15.1 Hyperparameters saved to registry

The script saves pipeline-level hyperparameters:

```json
{
  "validation_days": 7,
  "selection_rule": "min_brier_then_top10_then_auc",
  "feature_shape": "wide_windows_one_row_per_player_game",
  "windows": [3, 5, 6, 10, 15]
}
```

Current gap:

The script does not currently save the exact sklearn model hyperparameters into the `hyperparameters` JSON field. It saves the model artifact, but the registry would be stronger if it also stored:

- Logistic Regression `max_iter`
- Logistic Regression `class_weight`
- Random Forest `n_estimators`
- Random Forest `min_samples_leaf`
- Histogram Gradient Boosting `learning_rate`
- Histogram Gradient Boosting `max_iter`
- Preprocessing definitions

---

## 16. Daily Scoring / Inference

After model selection and registration, the same script scores today's rows.

It reads:

```text
public.v_mlb_ml_today_features_v3_wide
```

It validates:

- required feature columns
- no duplicate player-game rows
- numeric coercion
- categorical null fill

Then it scores:

```python
today["predicted_probability"] = model.predict_proba(today[FEATURES])[:, 1]
```

It creates ranks:

```python
today["rank_overall"] = today["predicted_probability"].rank(method="first", ascending=False).astype(int)
today["rank_team"] = today.groupby("team_id")["predicted_probability"].rank(method="first", ascending=False).astype(int)
```

Then it inserts rows into:

```text
public.mlb_ml_predictions_v3
```

Chunk size:

```text
500 rows per insert chunk
```

---

## 17. Prediction Output Contract

Each row written to `mlb_ml_predictions_v3` includes:

```text
model_run_id
target_name
prediction_run_date
game_date
game_pk
player_id
batter_name
team_id
team_name
pitcher_id
pitcher_name
pitcher_team_name
predicted_probability
predicted_value
score
confidence_bucket
rank_overall
rank_team
features
explanation_factors
explanation_text
```

The score is:

```python
score = predicted_probability * 100
```

The predicted value is:

```python
predicted_value = predicted_probability
```

---

## 18. Confidence Buckets

The script assigns confidence buckets based on probability:

```python
if probability >= 0.65:
    confidence = "high"
elif probability >= 0.58:
    confidence = "medium"
else:
    confidence = "low"
```

So:

| Probability | Bucket |
|---:|---|
| `>= 65%` | High |
| `58% to <65%` | Medium |
| `<58%` | Low |

---

## 19. Explanation Generation

The function `build_explanation(row, probability)` generates:

```text
confidence_bucket
explanation_factors
explanation_text
```

## 19.1 Recent form factor

The script looks for the maximum available recent hit rate across windows:

```python
recent_rate, recent_window = max_available_window_value(row, "batter_recent_hit_rate")
```

Rules:

| Condition | Direction | Text |
|---|---|---|
| `recent_rate >= 0.70` | Positive | Batter has a high recent hit rate over the selected window. |
| `recent_rate < 0.45` | Negative | Recent hit rate is below model baseline. |

## 19.2 Batter split factor

The script uses first available preferred-window value, preferring window 10:

```python
split_avg, split_window = first_available_window_value(row, "batter_split_avg")
```

Rules:

| Condition | Direction | Text |
|---|---|---|
| `split_avg >= 0.280` | Positive | Batter split is favorable for this matchup. |
| `split_avg < 0.220` | Negative | Batter split is weaker for this matchup. |

## 19.3 Pitcher split factor

The script uses:

```python
pitcher_baa, pitcher_baa_window = first_available_window_value(row, "pitcher_baa_split")
```

Rules:

| Condition | Direction | Text |
|---|---|---|
| `pitcher_baa >= 0.270` | Positive | Opposing pitcher allows a high batting average in this split. |
| `pitcher_baa < 0.220` | Negative | Opposing pitcher split is tougher than average. |

## 19.4 Pitcher WHIP factor

The script uses:

```python
whip, whip_window = first_available_window_value(row, "pitcher_last5_whip")
```

Rules:

| Condition | Direction | Text |
|---|---|---|
| `whip >= 1.35` | Positive | Pitcher has allowed traffic recently. |
| `whip < 1.05` | Negative | Pitcher recent WHIP is strong, adding risk. |

## 19.5 Explanation text construction

The final explanation text is:

```text
first two positive reasons + first negative reason
```

If no explanation factors are triggered, fallback text is:

```text
Projection is driven by the wide V3 feature mix across recent-game windows.
```

---

## 20. Feature Payload Construction

The prediction row stores a `features` JSON object.

It includes:

1. Every model feature column.
2. Backward-compatible aliases used by existing Supabase views and UI drawers.
3. Source-window metadata.
4. Extra context values from the scoring view.

## 20.1 Backward-compatible aliases

The script adds aliases such as:

```text
matchup_score
recent_form_score
batter_split_score
pitcher_vulnerability_score
pitcher_recent_form_score
batter_recent_avg
batter_recent_hits
batter_recent_at_bats
batter_recent_hit_rate
batter_split_avg
batter_split_ab
batter_split_reliability
pitcher_baa_split
pitcher_last5_era
pitcher_last5_whip
```

For each alias, it also records:

```text
<alias>_source_window
```

Default preferred source window:

```text
10
```

## 20.2 Extra payload fields

If present, the script also adds:

```text
expected_plate_appearances
recent_lineup_spot
batting_order
expected_pa_score
model_v2_score
v2_calibrated_hit_probability
base_hit_rate
probability_lift_vs_base
batter_bats
pitcher_throws
```

It also adds:

```text
wide_feature_view = "v_mlb_ml_today_features_v3_wide"
windows = [3, 5, 6, 10, 15]
primary_reference_window = 10
```

---

## 21. GitHub Actions: V3 Model Run

Workflow:

```text
.github/workflows/run-v3-hit-model.yml
```

Name:

```text
Run V3 Hit Model
```

## 21.1 Triggers

The workflow runs on:

1. Manual dispatch.
2. Successful completion of `Load V3 Hit Actuals`.
3. Backup schedule.

Schedule:

```text
35 12 * * *
```

Meaning:

```text
12:35 UTC / 8:35 AM EDT
```

## 21.2 Runtime

The workflow uses:

```text
ubuntu-latest
Python 3.11
```

Dependencies:

```bash
pip install -r requirements-v3-ml.txt
pip install supabase
```

## 21.3 Previous actuals validation

Before training, the workflow checks the previous day's V3 actuals status using:

```text
v_mlb_ml_v3_actuals_load_status
```

It blocks training when previous actuals are available but not loaded.

This matters because the training feature set can include newly evaluated historical rows. Running training before actuals are closed can produce stale or inconsistent training data.

## 21.4 Feature freshness validation

The workflow checks:

```text
v_mlb_ml_today_features_v3_wide
```

It requires that the view has rows for the target prediction date.

If no rows are found, the workflow raises an error and instructs that the upstream MLB Phase 1 data refresh must be run or fixed.

## 21.5 Train and score step

The workflow runs:

```bash
python scripts/train_score_v3_hit_model.py
```

## 21.6 Prediction write validation

After the script completes, the workflow checks:

```text
mlb_ml_predictions_v3
```

It confirms prediction rows exist for:

```text
target_name = hit_1plus
prediction_run_date = target_date
```

## 21.7 Activation

The workflow activates the latest model run for the target date by calling:

```text
activate_mlb_ml_predictions_v3_run
```

With parameters:

```text
p_prediction_run_date
p_target_name
p_model_run_id
```

This separates raw prediction insertion from official activation.

---

## 22. GitHub Actions: V3 Actuals Loading

Workflow:

```text
.github/workflows/load-v3-hit-actuals.yml
```

Name:

```text
Load V3 Hit Actuals
```

## 22.1 Triggers

The workflow runs on:

1. Manual dispatch.
2. Successful completion of `Load All MLB Phase 1 Data`.
3. Backup schedule.

Schedule:

```text
15 12 * * *
```

Meaning:

```text
12:15 UTC / 8:15 AM EDT
```

## 22.2 Manual inputs

```text
target_date
min_log_coverage_pct
```

Default:

```text
min_log_coverage_pct = 85
```

## 22.3 Preflight coverage

The workflow checks active V3 predictions using:

```text
v_mlb_ml_predictions_v3_active
```

It checks batting game logs using:

```text
mlb_player_batting_game_logs
```

It compares prediction `(player_id, game_pk)` pairs against batting log `(player_id, game_pk)` pairs to estimate coverage.

## 22.4 Actuals loader

The workflow calls:

```text
load_mlb_v3_actuals
```

With:

```text
target_prediction_date = target_date
target_name_filter = hit_1plus
```

## 22.5 Coverage validation

After loading actuals, the workflow reads:

```text
v_mlb_ml_v3_actuals_load_status
```

It calculates:

```text
resolved_rows = played_rows + did_not_play_rows
resolved_pct = resolved_rows / prediction_rows
```

If pending rows remain and resolved percentage is below the threshold, the workflow fails.

---

## 23. Supabase Database Architecture

## 23.1 Training views

```text
public.v_mlb_ml_training_features_v3_hit_1plus_wide
```

Purpose:

- Provides supervised historical training rows.
- One row per player-game.
- Includes 82 model features.
- Includes `target_hit_1plus`.

Related narrower/legacy training views include:

```text
public.v_mlb_ml_training_features_v3_hit_1plus
public.v_mlb_ml_training_dataset_v3
```

## 23.2 Scoring views

```text
public.v_mlb_ml_today_features_v3_wide
```

Purpose:

- Provides current prediction-day hitter-game rows.
- One row per player-game.
- Same feature contract as training view, excluding target.

Related current-day views include:

```text
public.v_mlb_ml_today_features_v3
```

## 23.3 Model registry table/view

```text
public.mlb_ml_model_runs
public.v_mlb_ml_v3_model_registry
```

Purpose:

- Store each model run.
- Store model metadata.
- Store candidate metrics.
- Store selected model.
- Store feature list and artifact URI.

## 23.4 Prediction table

```text
public.mlb_ml_predictions_v3
```

Purpose:

- Store immutable prediction rows.
- Store scoring-time feature payload.
- Store model run reference.
- Store actual outcomes after loading.
- Store active/inactive state.

## 23.5 Active prediction view

```text
public.v_mlb_ml_predictions_v3_active
```

Purpose:

- Exposes official active prediction rows.
- Used by actuals workflow to avoid counting inactive reruns.

## 23.6 Actuals loader/status

```text
public.load_mlb_v3_actuals(...)
public.v_mlb_ml_v3_actuals_load_status
```

Purpose:

- Load actual outcomes.
- Classify rows as played, did not play, pending, etc.
- Track coverage and actual hit rate.

## 23.7 Performance and calibration views

```text
public.v_mlb_ml_v3_backtest_performance
public.v_mlb_v3_calibration_daily
public.v_mlb_v3_daily_top25_results
```

Purpose:

- Backtest V3 after actuals are loaded.
- Evaluate Top-N performance.
- Evaluate calibration by probability bucket.
- Inspect daily Top 25 prediction results.

## 23.8 App cache

```text
public.mlb_model_performance_page_cache
public.refresh_mlb_model_performance_page_cache()
public.validate_mlb_model_performance_page_cache()
```

Purpose:

- Cache expensive performance payloads as JSON for the static frontend.
- Avoid repeatedly running heavy analytical views from the browser.
- Support the Model Performance page.

---

## 24. Current Production Data Snapshot

From live Supabase inspection:

| Metric | Value |
|---|---:|
| Total V3 prediction rows | 3,359 |
| Prediction days | 5 |
| First prediction date | 2026-07-05 |
| Latest prediction date | 2026-07-09 |
| Evaluated rows | 1,785 |
| Evaluated days | 4 |
| Active rows | 1,714 |

Daily prediction/evaluation status:

| Prediction Date | Rows | Evaluated Rows | Hits | Evaluated Hit Rate | Min Probability | Max Probability |
|---|---:|---:|---:|---:|---:|---:|
| 2026-07-05 | 396 | 303 | 178 | 58.7% | 12.5% | 84.6% |
| 2026-07-06 | 430 | 324 | 190 | 58.6% | 11.7% | 73.0% |
| 2026-07-07 | 792 | 598 | 360 | 60.2% | 11.2% | 71.8% |
| 2026-07-08 | 760 | 560 | 318 | 56.8% | 13.2% | 72.5% |
| 2026-07-09 | 981 | 0 | 0 | Pending | 9.9% | 76.1% |

---

## 25. Training Health Snapshot

From Supabase training health inspection:

| Metric | Value |
|---|---:|
| Training rows | 38,568 |
| Training days | 46 |
| Min prediction date | 2026-05-22 |
| Max prediction date | 2026-07-08 |
| Hit 1+ rate | 57.6% |
| Home run rows | 4,501 |
| Average total bases | 1.369 |
| Missing matchup score | 0 |
| Missing batter recent hit rate | 0 |
| Missing pitcher BAA split | 1,083 |
| Missing pitcher last 5 WHIP | 1,577 |

Interpretation:

- There is enough volume for a first production-style classifier.
- Missing pitcher features are expected in some MLB data contexts but should be monitored.
- The model handles numeric missingness with median imputation.

---

## 26. Scoring Health Snapshot

From Supabase scoring health inspection:

| Metric | Value |
|---|---:|
| Today scoring rows | 327 |
| Prediction run date | 2026-07-09 |
| Current V3 prediction rows | 327 |
| Missing matchup score | 0 |
| Missing V2 probability | 0 |
| Missing batter recent hit rate | 0 |
| Missing pitcher BAA split | 0 |
| Missing pitcher last 5 WHIP | 26 |
| Latest source prediction created at | 2026-07-09 10:33:13 UTC |

Interpretation:

- The scoring feature set is generally complete.
- Pitcher WHIP still has some nulls, which the pipeline imputes.
- The workflow correctly validates target-date freshness before model execution.

---

## 27. Model Performance Interpretation

V3 should be interpreted across two dimensions:

## 27.1 Probability quality

Use:

- Brier score
- Log loss
- Calibration buckets
- Calibration gap

This tells whether probabilities are trustworthy.

## 27.2 Ranking quality

Use:

- ROC AUC
- Top 1 hit rate
- Top 5 hit rate
- Top 10 hit rate
- Top 20 hit rate
- Top 25 hit rate

This tells whether the model is putting the right hitters near the top.

The current selection rule prioritizes probability quality first, then Top-10 ranking.

---

## 28. Why Logistic Regression Is Winning

Based on inspected registry metrics and the current selection rule, logistic regression is winning because:

1. It has the best Brier score.
2. It has the best AUC.
3. It has strong Top-10 and Top-25 hit rates.
4. It is less likely to overfit the limited early V3 production window.
5. It produces smoother probabilities than tree models.

Random Forest and Histogram Gradient Boosting may become stronger as more history accumulates, but the current evidence supports logistic regression as the safest champion/candidate.

---

## 29. Risks and Current Gaps

## 29.1 Candidate status vs production status

The Python script registers every selected model as:

```text
status = candidate
```

Then the workflow activates predictions separately.

Recommended improvement:

- Add an explicit champion/production status.
- Distinguish model-run status from prediction-run activation status.

## 29.2 Artifact durability

The registry stores an artifact path, but the workflow does not currently guarantee durable artifact storage.

Recommended improvement:

- Upload joblib artifact to GitHub Actions artifacts, Supabase Storage, S3, or another durable store.
- Store artifact checksum in the registry.

## 29.3 Hyperparameter persistence

The registry stores pipeline-level settings, but not exact model hyperparameters.

Recommended improvement:

Store:

```json
{
  "models": {
    "logistic_regression": {
      "max_iter": 2000,
      "class_weight": "balanced"
    },
    "random_forest": {
      "n_estimators": 300,
      "min_samples_leaf": 25,
      "random_state": 42,
      "n_jobs": -1,
      "class_weight": "balanced_subsample"
    },
    "hist_gradient_boosting": {
      "learning_rate": 0.05,
      "max_iter": 250,
      "max_leaf_nodes": 31,
      "l2_regularization": 0.05,
      "random_state": 42
    }
  },
  "preprocessing": {
    "numeric_linear": "median imputer + standard scaler",
    "numeric_tree": "median imputer",
    "categorical": "most frequent imputer + one hot encoder"
  }
}
```

## 29.4 No explicit feature schema hash

The script stores the feature list, which is good. It does not store a schema hash.

Recommended improvement:

- Add a hash of ordered feature names.
- Add feature schema version.

## 29.5 Limited evaluated sample

Current evaluated V3 production sample is young:

```text
4 evaluated days
1,785 evaluated rows
```

Directional insights are useful, but model promotion decisions should be conservative until more game days accumulate.

## 29.6 No explicit probability calibration layer

The selected model outputs probabilities directly. Logistic regression is often reasonably calibrated, but Random Forest and Gradient Boosting may require calibration if they later become winners.

Recommended improvement:

- Add optional `CalibratedClassifierCV`.
- Evaluate calibration before and after calibration.
- Persist calibration method in registry.

---

## 30. Recommended Next Engineering Improvements

## 30.1 Persist full sklearn config

Add a function that returns a full model config JSON and stores it in the registry.

## 30.2 Add champion table

Create:

```text
public.mlb_ml_model_champions
```

Example columns:

```text
target_name
model_family
model_run_id
model_version
activated_at
activated_by
status
notes
```

## 30.3 Upload artifacts durably

In GitHub Actions:

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: v3-model-artifact
    path: artifacts/mlb_v3/*.joblib
```

Or write the artifact to Supabase Storage/S3.

## 30.4 Add git metadata

Persist:

- repo
- branch
- commit SHA
- workflow run ID
- workflow run URL

## 30.5 Add drift monitoring

Track daily:

- feature null rates
- probability distribution
- average predicted probability
- top-25 average predicted probability
- calibration gap
- input row count
- missing pitcher feature rates

## 30.6 Add model comparison dashboard

Create a V3 candidate comparison dashboard showing:

- candidate model name
- Brier score
- log loss
- AUC
- Top-N hit rates
- calibration
- probability distribution

---

## 31. Operational Runbook

## 31.1 Normal daily flow

```text
1. Phase 1 MLB data refresh runs.
2. V3 actuals workflow loads yesterday's outcomes.
3. V3 model workflow validates prior actuals are closed.
4. V3 model workflow validates today's feature rows exist.
5. Python script trains all candidate models.
6. Python script selects best model.
7. Python script writes joblib artifact.
8. Python script registers model run.
9. Python script scores today's rows.
10. Workflow validates predictions were written.
11. Workflow activates official model_run_id for the day.
12. App reads active predictions/performance cache.
13. After games complete, actuals workflow loads outcomes.
```

## 31.2 Manual V3 model run

Use GitHub Actions:

```text
Run V3 Hit Model
```

Optional input:

```text
target_date = YYYY-MM-DD
```

## 31.3 Manual V3 actuals load

Use GitHub Actions:

```text
Load V3 Hit Actuals
```

Optional inputs:

```text
target_date = YYYY-MM-DD
min_log_coverage_pct = 85
```

## 31.4 Key health queries

```sql
select * from public.v_mlb_ml_v3_training_health;

select * from public.v_mlb_ml_v3_scoring_health;

select *
from public.v_mlb_ml_v3_actuals_load_status
order by prediction_run_date desc;

select * from public.validate_mlb_model_performance_page_cache();
```

---

## 32. Bottom Line

The V3 implementation is a real production-style scikit-learn ML pipeline.

It currently:

- trains three candidate classifiers,
- uses robust preprocessing pipelines,
- handles missing values,
- scales numeric features for logistic regression,
- one-hot encodes batter/pitcher handedness,
- uses a time-based validation split,
- selects the best model using Brier score, Top-10 hit rate, and AUC,
- serializes the selected model with joblib,
- registers the run in Supabase,
- scores today's hitters,
- stores explanation payloads,
- and activates official prediction runs through GitHub Actions.

The current winning model is logistic regression, not because it is the most complex model, but because it is currently the best-calibrated and most stable candidate for the available data.

The architecture is strong. The next maturity step is governance: durable artifact storage, explicit champion model status, full hyperparameter persistence, feature schema hashing, and calibration/drift monitoring.


---

## 15. July 2026 Production Hardening Updates

Two production-quality reliability improvements were implemented in July 2026. These changes were treated as bug fixes to the existing V3 model rather than a new model version, so the public model remains **V3**.

### 15.1 DNP (Did Not Play) Evaluation Fix

#### Background

Originally, V1 and V2 excluded players who did not appear in a game (DNP) when calculating daily model performance, while portions of the evaluation pipeline could still allow DNP selections to influence summary metrics. This created inconsistencies across model reporting and made cross-model comparisons less reliable.

#### Change

The evaluation logic was standardized across all model scorecards.

The updated evaluation pipeline now:

- Excludes DNP players from hit-rate calculations.
- Excludes DNP players from weighted scoring.
- Excludes DNP players from bucket evaluations.
- Excludes DNP players from Top 1 / Top 5 / Top 10 / Top 20 / Top 25 scoring.
- Continues tracking DNP counts separately for transparency.

As a result:

- Hit percentages only reflect players who actually played.
- Daily weighted points are based only on evaluable predictions.
- V1, V2 and V3 now use identical evaluation semantics.

No prediction probabilities or model rankings are affected by this change. Only post-game evaluation metrics are corrected.

---

### 15.2 Small-Sample Pitcher Reliability Stabilization

#### Background

The original V3 feature engineering treated all opposing pitcher statistics equally regardless of sample size.

This created an edge case where pitchers with only one start (or only a few innings pitched) could produce extremely volatile statistics such as:

- Batting Average Against (BAA)
- WHIP
- ERA
- Pitcher Vulnerability Score
- Recent Form Score

These unstable values could artificially inflate matchup scores and cause an unrealistic concentration of hitters facing that pitcher near the top of the rankings.

A real-world example occurred with **Hunter Greene**, who returned from the injured list with only **3.1 innings pitched**. His limited sample produced exaggerated vulnerability metrics that pushed a disproportionate number of opposing hitters into the Top 10.

#### Solution

V3 now applies empirical-Bayes style shrinkage to pitcher statistics before they are consumed by the machine learning model.

For each pitcher, reliability is calculated from available workload (primarily innings pitched / outs recorded). Low-reliability pitchers are blended toward league-average prior values until enough evidence exists for their own statistics to dominate.

Conceptually:

```
stabilized_metric =
    reliability × observed_metric
  + (1 − reliability) × league_prior
```

Reliability increases as a pitcher accumulates additional innings.

#### Stabilized Features

The following existing V3 features are stabilized before model scoring while retaining the same feature names:

- pitcher_baa_split_w*
- pitcher_last5_whip_w*
- pitcher_last5_era_w*
- pitcher_vulnerability_score_w*
- pitcher_recent_form_score_w*
- matchup_score_w*

No downstream Python feature list changes are required because the feature contract remains unchanged.

#### Validation

Production validation confirmed:

- Hunter Greene Top-10 exposure reduced from **6 hitters to 2 hitters**.
- Hunter Greene Top-25 exposure reduced from **8 hitters to 3 hitters**.
- Best opposing hitter rank shifted from **#1 to #5**.
- Overall ranking integrity remained intact.
- IL filtering continued to function correctly.
- Model training and scoring outputs remained fully compatible.

This stabilization greatly improves robustness against pitchers with extremely small seasonal workloads while preserving model behavior for established starters.