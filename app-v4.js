/* =========================================================
   MLB Hit Lab — Consolidated Production Build
   Phase 4B + 5B + 5C + 5D JS/CSS merged into app-v4.js
   Build: unified-frontend-consolidation-20260812
   ========================================================= */

(function injectConsolidatedPhaseStyles() {
  const style = document.createElement("style");
  style.id = "mlb-hit-lab-consolidated-phase-styles";
  style.textContent = "/* ===== Consolidated from phase4b-layout-fix.css ===== */\n/* MLB Hit Board Phase 4B \u2014 control layout fix\n   Keeps Outcome, Active Model, and Scope in separate layout areas.\n   Build: phase4b-layout-fix-20260812\n*/\n\n#mlbHitBoardContent .phase4b-control-deck {\n  display: grid !important;\n  grid-template-columns:\n    minmax(360px, 420px)\n    minmax(300px, 380px)\n    minmax(260px, 1fr) !important;\n  grid-template-areas: \"outcome model scope\";\n  align-items: end !important;\n  gap: 18px !important;\n}\n\n#mlbHitBoardContent .phase4b-control-deck .phase4b-outcome-group {\n  grid-area: outcome;\n  width: auto !important;\n  min-width: 0 !important;\n  max-width: none !important;\n  position: static !important;\n  inset: auto !important;\n  margin: 0 !important;\n  transform: none !important;\n}\n\n#mlbHitBoardContent .phase4b-control-deck .compact-model-group {\n  grid-area: model;\n  width: auto !important;\n  min-width: 0 !important;\n  max-width: none !important;\n  position: static !important;\n  inset: auto !important;\n  margin: 0 !important;\n  transform: none !important;\n}\n\n#mlbHitBoardContent .phase4b-control-deck .mlb-scope-group {\n  grid-area: scope;\n  width: auto !important;\n  min-width: 0 !important;\n  max-width: none !important;\n  position: static !important;\n  inset: auto !important;\n  margin: 0 !important;\n  transform: none !important;\n}\n\n#mlbHitBoardContent .phase4b-control-deck .phase4b-target-toggle {\n  width: 100% !important;\n  min-width: 0 !important;\n}\n\n#mlbHitBoardContent .phase4b-control-deck .phase4b-target-toggle .segment {\n  flex: 1 1 0 !important;\n  min-width: 0 !important;\n}\n\n#mlbHitBoardContent .phase4b-control-deck .board-model-badge {\n  position: static !important;\n  inset: auto !important;\n  width: 100% !important;\n  min-width: 0 !important;\n  max-width: none !important;\n  margin: 0 !important;\n  transform: none !important;\n  box-sizing: border-box !important;\n}\n\n#mlbHitBoardContent .phase4b-control-deck .board-scope-pill {\n  width: 100% !important;\n  max-width: none !important;\n  min-width: 0 !important;\n  box-sizing: border-box !important;\n  white-space: normal !important;\n  overflow: visible !important;\n  text-overflow: clip !important;\n}\n\n/* Medium widths: Outcome + Model on row 1; Scope gets full row 2. */\n@media (max-width: 1240px) {\n  #mlbHitBoardContent .phase4b-control-deck {\n    grid-template-columns: minmax(320px, 1fr) minmax(280px, 1fr) !important;\n    grid-template-areas:\n      \"outcome model\"\n      \"scope scope\";\n  }\n}\n\n/* Mobile/tablet: stack all three controls with no overlap. */\n@media (max-width: 760px) {\n  #mlbHitBoardContent .phase4b-control-deck {\n    grid-template-columns: minmax(0, 1fr) !important;\n    grid-template-areas:\n      \"outcome\"\n      \"model\"\n      \"scope\";\n    gap: 14px !important;\n  }\n\n  #mlbHitBoardContent .phase4b-control-deck .phase4b-target-toggle .segment {\n    padding-left: 8px !important;\n    padding-right: 8px !important;\n    font-size: 0.78rem !important;\n  }\n}\n\n/* ===== Consolidated from phase5b.css ===== */\n/* =========================================================\n   MLB Hit Board \u2014 Phase 5B compact unified controls\n   Replaces the stacked Outcome / Scope cards with one control card.\n   Build: phase5b-compact-controls-20260812b\n   ========================================================= */\n\n#mlbHitBoardContent .phase5b-unified-control-card {\n  margin: 12px 0 0;\n  padding: 13px 14px;\n  border: 1px solid rgba(148, 163, 184, 0.17);\n  border-radius: 18px;\n  background:\n    linear-gradient(180deg, rgba(30, 41, 59, 0.68), rgba(15, 23, 42, 0.68));\n  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);\n}\n\n#mlbHitBoardContent .phase5b-unified-control-row {\n  display: grid;\n  grid-template-columns:\n    minmax(360px, 1.35fr)\n    minmax(220px, 0.72fr)\n    minmax(285px, 0.95fr);\n  gap: 12px;\n  align-items: center;\n}\n\n#mlbHitBoardContent .phase5b-unified-control-card .segmented {\n  min-height: 46px;\n  padding: 3px;\n  border-radius: 14px;\n}\n\n#mlbHitBoardContent .phase5b-unified-control-card .segment {\n  min-height: 40px;\n  padding: 0 14px;\n  border-radius: 11px;\n  font-size: 0.88rem;\n  line-height: 1;\n  font-weight: 800;\n  white-space: nowrap;\n}\n\n#mlbHitBoardContent .phase5b-outcome-toggle,\n#mlbHitBoardContent .phase5b-scope-toggle {\n  width: 100%;\n}\n\n#mlbHitBoardContent .phase5b-outcome-toggle .segment,\n#mlbHitBoardContent .phase5b-scope-toggle .segment {\n  flex: 1 1 0;\n  min-width: 0;\n}\n\n#mlbHitBoardContent .phase5b-model-badge {\n  position: static !important;\n  inset: auto !important;\n  width: 100% !important;\n  min-width: 0 !important;\n  min-height: 46px;\n  margin: 0 !important;\n  padding: 7px 10px !important;\n  transform: none !important;\n  box-sizing: border-box;\n  border-radius: 14px;\n}\n\n#mlbHitBoardContent .phase5b-model-badge .board-model-icon {\n  width: 28px;\n  height: 28px;\n  font-size: 0.92rem;\n}\n\n#mlbHitBoardContent .phase5b-model-badge .board-model-copy {\n  min-width: 0;\n}\n\n#mlbHitBoardContent .phase5b-model-badge .board-model-copy small {\n  font-size: 0.58rem;\n  line-height: 1;\n  letter-spacing: 0.14em;\n}\n\n#mlbHitBoardContent .phase5b-model-badge .board-model-copy strong {\n  margin-top: 2px;\n  font-size: 0.82rem;\n  line-height: 1.05;\n}\n\n#mlbHitBoardContent .phase5b-model-badge .board-model-status {\n  padding: 4px 8px;\n  font-size: 0.64rem;\n  letter-spacing: 0.08em;\n}\n\n#mlbHitBoardContent .phase5b-game-row {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;\n  gap: 10px;\n  align-items: center;\n  margin-top: 10px;\n  padding-top: 10px;\n  border-top: 1px solid rgba(148, 163, 184, 0.10);\n}\n\n#mlbHitBoardContent .phase5b-game-select {\n  width: 100%;\n  min-width: 0;\n  min-height: 42px;\n  padding: 0 40px 0 13px;\n  border: 1px solid rgba(96, 165, 250, 0.30);\n  border-radius: 12px;\n  background: rgba(8, 15, 35, 0.78);\n  color: var(--text, #f8fafc);\n  font: inherit;\n  font-size: 0.84rem;\n  font-weight: 750;\n  cursor: pointer;\n  outline: none;\n}\n\n#mlbHitBoardContent .phase5b-game-select:focus {\n  border-color: rgba(56, 189, 248, 0.72);\n  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.08);\n}\n\n#mlbHitBoardContent .phase5b-game-meta {\n  color: var(--muted, #94a3b8);\n  font-size: 0.70rem;\n  line-height: 1.2;\n  white-space: nowrap;\n}\n\n#mlbHitBoardContent .phase5b-game-loading {\n  min-height: 42px;\n  display: flex;\n  align-items: center;\n  padding: 0 13px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  border-radius: 12px;\n  color: var(--muted, #94a3b8);\n  background: rgba(8, 15, 35, 0.50);\n  font-size: 0.80rem;\n}\n\n/* Remove legacy stacked control-deck spacing if older Phase 4B CSS is present. */\n#mlbHitBoardContent .phase4b-control-deck,\n#mlbHitBoardContent .phase5b-scope-card {\n  display: none !important;\n}\n\n/* The rest of the MLB board already has good visual hierarchy.\n   Only tighten the top header slightly so the compact controls connect\n   more naturally to the content below. */\n#mlbView + * {\n  --phase5b-compact-ui: 1;\n}\n\n@media (max-width: 1180px) {\n  #mlbHitBoardContent .phase5b-unified-control-row {\n    grid-template-columns: minmax(320px, 1.15fr) minmax(210px, 0.72fr);\n    grid-template-areas:\n      \"outcome scope\"\n      \"model model\";\n  }\n\n  #mlbHitBoardContent .phase5b-outcome-toggle {\n    grid-area: outcome;\n  }\n\n  #mlbHitBoardContent .phase5b-scope-toggle {\n    grid-area: scope;\n  }\n\n  #mlbHitBoardContent .phase5b-model-badge {\n    grid-area: model;\n    max-width: 420px !important;\n  }\n}\n\n@media (max-width: 720px) {\n  #mlbHitBoardContent .phase5b-unified-control-card {\n    padding: 11px;\n    border-radius: 16px;\n  }\n\n  #mlbHitBoardContent .phase5b-unified-control-row {\n    grid-template-columns: 1fr;\n    grid-template-areas:\n      \"outcome\"\n      \"scope\"\n      \"model\";\n    gap: 8px;\n  }\n\n  #mlbHitBoardContent .phase5b-unified-control-card .segmented {\n    min-height: 42px;\n  }\n\n  #mlbHitBoardContent .phase5b-unified-control-card .segment {\n    min-height: 36px;\n    padding: 0 8px;\n    font-size: 0.78rem;\n  }\n\n  #mlbHitBoardContent .phase5b-model-badge {\n    max-width: none !important;\n  }\n\n  #mlbHitBoardContent .phase5b-game-row {\n    grid-template-columns: 1fr;\n    gap: 5px;\n    margin-top: 8px;\n    padding-top: 8px;\n  }\n\n  #mlbHitBoardContent .phase5b-game-meta {\n    white-space: normal;\n    padding-left: 2px;\n  }\n}\n\n@media (max-width: 430px) {\n  #mlbHitBoardContent .phase5b-unified-control-card .segment {\n    font-size: 0.72rem;\n  }\n\n  #mlbHitBoardContent .phase5b-model-badge .board-model-copy strong {\n    font-size: 0.78rem;\n  }\n}\n\n/* ===== Consolidated from phase5c.css ===== */\n/* =========================================================\n   MLB Hit Board \u2014 Phase 5C selected-game pitcher card\n   Reuses Team Hit Board matchup visual language.\n   Build: phase5c-selected-game-pitcher-card-20260812\n   ========================================================= */\n\n#mlbHitBoardContent .phase5c-selected-game-matchup {\n  margin-top: 18px;\n}\n\n#mlbHitBoardContent .phase5c-matchup-header {\n  align-items: flex-start;\n  gap: 22px;\n}\n\n#mlbHitBoardContent .phase5c-matchup-actions {\n  display: flex;\n  flex-direction: column;\n  align-items: flex-end;\n  gap: 12px;\n  min-width: min(560px, 54%);\n}\n\n#mlbHitBoardContent .phase5c-pitcher-toggle {\n  width: 100%;\n  min-height: 48px;\n  padding: 3px;\n  border-radius: 14px;\n}\n\n#mlbHitBoardContent .phase5c-pitcher-toggle .segment {\n  flex: 1 1 0;\n  min-width: 0;\n  min-height: 42px;\n  padding: 0 14px;\n  border-radius: 11px;\n  font-size: 0.82rem;\n  font-weight: 800;\n  white-space: nowrap;\n}\n\n#mlbHitBoardContent .phase5c-pitcher-toggle .segment:disabled {\n  opacity: 0.42;\n  cursor: not-allowed;\n}\n\n#mlbHitBoardContent .phase5c-metric-context {\n  display: flex;\n  align-items: center;\n  gap: 15px;\n  margin: 22px 2px 14px;\n}\n\n#mlbHitBoardContent .phase5c-metric-context strong {\n  color: var(--accent, #38bdf8);\n  text-transform: uppercase;\n  letter-spacing: 0.14em;\n  font-size: 0.76rem;\n  font-weight: 900;\n}\n\n#mlbHitBoardContent .phase5c-metric-context span {\n  color: var(--muted, #94a3b8);\n  font-size: 0.82rem;\n}\n\n#mlbHitBoardContent .phase5c-pitcher-grid .matchup-stat-card .value {\n  line-height: 1.1;\n}\n\n#mlbHitBoardContent .phase5c-loading-state {\n  margin-top: 18px;\n  padding: 20px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  border-radius: 16px;\n  color: var(--muted, #94a3b8);\n  background: rgba(8, 15, 35, 0.42);\n}\n\n@media (max-width: 1050px) {\n  #mlbHitBoardContent .phase5c-matchup-header {\n    flex-direction: column;\n  }\n\n  #mlbHitBoardContent .phase5c-matchup-actions {\n    width: 100%;\n    min-width: 0;\n    max-width: none;\n    align-items: stretch;\n  }\n\n  #mlbHitBoardContent .phase5c-matchup-actions .matchup-score-pill {\n    align-self: flex-start;\n  }\n}\n\n@media (max-width: 720px) {\n  #mlbHitBoardContent .phase5c-pitcher-toggle {\n    min-height: 44px;\n  }\n\n  #mlbHitBoardContent .phase5c-pitcher-toggle .segment {\n    min-height: 38px;\n    padding: 0 8px;\n    font-size: 0.72rem;\n  }\n\n  #mlbHitBoardContent .phase5c-metric-context {\n    align-items: flex-start;\n    flex-direction: column;\n    gap: 4px;\n    margin-top: 18px;\n  }\n}\n\n@media (max-width: 520px) {\n  #mlbHitBoardContent .phase5c-pitcher-toggle {\n    flex-direction: column;\n    gap: 3px;\n  }\n\n  #mlbHitBoardContent .phase5c-pitcher-toggle .segment {\n    width: 100%;\n  }\n}\n\n/* ===== Consolidated from phase5d.css ===== */\n/* =========================================================\n   MLB Hit Board \u2014 Phase 5D target-aware pitcher metrics\n   Build: phase5d-target-aware-pitcher-metrics-20260812\n   ========================================================= */\n\n#mlbHitBoardContent .phase5d-metric-card {\n  min-height: 108px;\n}\n\n#mlbHitBoardContent .phase5d-metric-sub {\n  display: block;\n  margin-top: 7px;\n  color: var(--muted, #94a3b8);\n  font-size: 0.68rem;\n  line-height: 1.25;\n  font-weight: 650;\n}\n\n#mlbHitBoardContent .phase5d-target-aware-matchup .matchup-score-pill {\n  white-space: nowrap;\n}\n\n@media (max-width: 720px) {\n  #mlbHitBoardContent .phase5d-metric-card {\n    min-height: 96px;\n  }\n\n  #mlbHitBoardContent .phase5d-metric-sub {\n    font-size: 0.64rem;\n  }\n}";
  document.head.appendChild(style);
})();

const SUPABASE_URL = "https://squcmdsivnnxzblsfciu.supabase.co";
const SUPABASE_KEY = "sb_publishable_pumFxQJ7pYyRC8lrjSvtZA_x63TVYtq";

const SEASON = 2026;
const PERFORMANCE_WINDOWS = [3, 5, 6, 10];

console.info("MLB Hit Lab app-v4 loaded: unified-frontend-consolidation-20260812");

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let performanceWindow = 10;
let performanceScope = "mlb";
let performanceSummary = null;
let topPickPerformance = null;
let componentAnalysis = null;
let yesterdayTopPick = null;
let rankAnalysisRows = [];
let pitcherVulnerabilityRows = [];
let mlbPerformanceSummary = null;
let mlbComponentAnalysis = null;
let mlbRankPerformanceRows = [];
let mlbScoreBucketRows = [];
let mlbWindowComparisonRows = [];
let comparisonRows = [];
let mlbRows = [];
let v2EnhancementRows = [];
let mlbV2EnhancementRows = [];
let mlbWindow = 10;
let mlbTargetPitcherSplits = {};
let v3ModelRegistry = null;
let v3ActualsStatus = null;
let v3PerformanceRows = [];
let marketEdgeRows = [];
let marketEdgeHealth = null;
let boardOddsRows = [];

const MLB_BOARD_MODE = "ml";
const V2_ENHANCEMENT_SELECT = "player_id,full_name,team_id,team_name,game_pk,model_v2_score,model_confidence,expected_plate_appearances,recent_lineup_spot,adjusted_batter_split_avg,adjusted_pitcher_baa_split,adjusted_batter_split_score,adjusted_pitcher_vulnerability_score";
let v3DrawerExplanationRows = [];
const V3_DRAWER_EXPLANATION_SELECT = "prediction_id,model_run_id,target_name,prediction_run_date,game_pk,player_id,rank_overall,headline,explanation_text,matchup_summary_text,positive_tags,negative_tags,generation_method,generation_status,contribution_model_name,contribution_model_version,contribution_model_status,confidence_bucket,rank_team,calculation_method,top_positive_drivers,top_risk_factors,feature_count";
const MARKET_EDGE_SELECT = [
  "prediction_run_date",
  "prediction_created_at",
  "game_date",
  "game_pk",
  "game_time_utc",
  "venue_name",
  "player_id",
  "batter_name",
  "team_id",
  "team_name",
  "pitcher_id",
  "pitcher_name",
  "pitcher_team_name",
  "predicted_probability",
  "hit_probability_pct",
  "confidence_bucket",
  "rank_overall",
  "rank_team",
  "explanation_text",
  "explanation_factors",
  "model_name",
  "model_version",
  "model_status",
  "odds_id",
  "odds_provider",
  "book_name",
  "provider_event_id",
  "market_player_name",
  "american_odds",
  "decimal_odds",
  "market_implied_probability",
  "market_implied_probability_pct",
  "edge_pct",
  "line",
  "outcome_name",
  "odds_last_update",
  "fetched_at",
  "resolution_method",
  "edge_tier",
  "odds_stale",
  "edge_rank"
].join(",");
const MARKET_EDGE_HEALTH_SELECT = [
  "raw_odds_rows",
  "resolved_odds_rows",
  "unmatched_odds_rows",
  "edge_rows",
  "qualified_edge_rows",
  "latest_odds_fetch_at",
  "latest_model_prediction_date",
  "latest_cache_prediction_date",
  "latest_cache_refresh_at"
].join(",");

let sidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
let initialDrawerBodyHtml = "";

function applySidebarCollapsedState() {
  document.body.classList.toggle("sidebar-collapsed", sidebarCollapsed);

  const toggle = $("sidebarToggle");
  const icon = $("sidebarToggleIcon");

  if (toggle) {
    toggle.setAttribute("aria-expanded", String(!sidebarCollapsed));
    toggle.setAttribute("aria-label", sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar");
    toggle.title = sidebarCollapsed ? "Expand menu" : "Collapse menu";
  }

  if (icon) {
    icon.textContent = sidebarCollapsed ? "☰" : "‹";
  }
}

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  localStorage.setItem("sidebarCollapsed", String(sidebarCollapsed));
  applySidebarCollapsedState();
}

function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function setHtml(id, value) {
  const el = $(id);
  if (el) el.innerHTML = value;
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function titleCase(value) {
  const text = String(value || "").trim();
  if (!text) return "—";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function restoreDefaultDrawerBody() {
  const body = document.querySelector(".drawer-body");
  if (body && initialDrawerBodyHtml && body.dataset.mode === "v3") {
    body.innerHTML = initialDrawerBodyHtml;
    delete body.dataset.mode;
  }
}

function isRealPlayer(row) {
  const name = String(row?.full_name || "").trim();
  if (!name) return false;
  if (name.startsWith("Historical Reds Player")) return false;
  if (name.startsWith("Unknown Player")) return false;
  if (/^Player\s+\d+$/i.test(name)) return false;
  return true;
}

function fmtAvg(value) {
  if (value === null || value === undefined) return "—";
  return Number(value || 0).toFixed(3).replace(/^0/, "");
}

function fmtPct(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function fmtRate(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${Math.round(Number(value) * 100)}%`;
}


function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}


function v2LookupKey(row) {
  if (!row) return "";
  return `${row.player_id || ""}|${row.game_pk || ""}`;
}

function mergeV2Enhancements(rows, v2Rows) {
  const byPlayerGame = new Map();
  const byPlayer = new Map();
  const byNameTeam = new Map();

  (v2Rows || []).forEach((row) => {
    if (!row) return;
    if (row.player_id) byPlayer.set(String(row.player_id), row);
    if (row.player_id && row.game_pk) byPlayerGame.set(v2LookupKey(row), row);
    if (row.full_name) {
      byNameTeam.set(`${String(row.full_name).toLowerCase()}|${String(row.team_id || row.team_name || '').toLowerCase()}`, row);
      byNameTeam.set(String(row.full_name).toLowerCase(), row);
    }
  });

  return (rows || []).map((row) => {
    const v2 =
      byPlayerGame.get(v2LookupKey(row)) ||
      byPlayer.get(String(row.player_id)) ||
      byNameTeam.get(`${String(row.full_name || '').toLowerCase()}|${String(row.team_id || row.team_name || '').toLowerCase()}`) ||
      byNameTeam.get(String(row.full_name || '').toLowerCase());

    if (!v2) return row;

    return {
      ...row,
      model_v2_score: v2.model_v2_score,
      model_confidence: v2.model_confidence,
      expected_plate_appearances: v2.expected_plate_appearances,
      recent_lineup_spot: v2.recent_lineup_spot,
      adjusted_batter_split_avg: v2.adjusted_batter_split_avg,
      adjusted_pitcher_baa_split: v2.adjusted_pitcher_baa_split,
      adjusted_batter_split_score: v2.adjusted_batter_split_score,
      adjusted_pitcher_vulnerability_score: v2.adjusted_pitcher_vulnerability_score
    };
  });
}

function findV2Enhancement(row, rows = []) {
  if (!row) return null;
  return (rows || []).find((v2) =>
    (v2.game_pk && row.game_pk && String(v2.game_pk) === String(row.game_pk) && String(v2.player_id) === String(row.player_id)) ||
    String(v2.player_id) === String(row.player_id) ||
    (v2.full_name && String(v2.full_name).toLowerCase() === String(row.full_name || '').toLowerCase())
  ) || null;
}

function withV2Enhancement(row, rows = []) {
  return mergeV2Enhancements([row], rows)[0];
}

function mergeV3DrawerExplanations(rows, explanationRows = []) {
  const byPredictionId = new Map();
  const byPlayerDate = new Map();

  (explanationRows || []).forEach((explanation) => {
    if (!explanation) return;

    if (explanation.prediction_id !== null && explanation.prediction_id !== undefined) {
      byPredictionId.set(String(explanation.prediction_id), explanation);
    }

    if (explanation.player_id && explanation.prediction_run_date) {
      byPlayerDate.set(
        `${String(explanation.prediction_run_date)}|${String(explanation.player_id)}`,
        explanation
      );
    }
  });

  return (rows || []).map((row) => {
    const explanation =
      byPredictionId.get(String(row?.prediction_id ?? "")) ||
      byPlayerDate.get(`${String(row?.prediction_run_date ?? "")}|${String(row?.player_id ?? "")}`);

    if (!explanation) return row;

    return {
      ...row,
      drawer_explanation_headline: explanation.headline || null,
      drawer_explanation_text: explanation.explanation_text || null,
      drawer_matchup_summary_text: explanation.matchup_summary_text || null,
      drawer_positive_tags: Array.isArray(explanation.positive_tags) ? explanation.positive_tags : [],
      drawer_negative_tags: Array.isArray(explanation.negative_tags) ? explanation.negative_tags : [],
      drawer_explanation_method: explanation.generation_method || null,
      drawer_explanation_status: explanation.generation_status || null,
      drawer_contribution_model_name: explanation.contribution_model_name || null,
      drawer_contribution_model_version: explanation.contribution_model_version || null,
      drawer_contribution_model_status: explanation.contribution_model_status || null,
      drawer_confidence_bucket: explanation.confidence_bucket || null,
      drawer_rank_team: explanation.rank_team ?? null,
      drawer_calculation_method: explanation.calculation_method || null,
      drawer_top_positive_drivers: Array.isArray(explanation.top_positive_drivers) ? explanation.top_positive_drivers : [],
      drawer_top_risk_factors: Array.isArray(explanation.top_risk_factors) ? explanation.top_risk_factors : [],
      drawer_feature_count: Number(explanation.feature_count || 0)
    };
  });
}

async function loadV3DrawerExplanations(predictionDate = null) {
  try {
    let query = client
      .from("v_mlb_v3_player_drawer_explanations")
      .select(V3_DRAWER_EXPLANATION_SELECT)
      .order("rank_overall", { ascending: true });

    if (predictionDate) {
      query = query.eq("prediction_run_date", predictionDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error loading V3 drawer explanations:", err);
    return [];
  }
}

async function loadV2Enhancements(teamId = null) {
  try {
    let query = client
      .from("v_today_mlb_batter_matchups_v2")
      .select(V2_ENHANCEMENT_SELECT);

    if (teamId !== null && teamId !== undefined) {
      query = query.eq("team_id", teamId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error loading V2 matchup enhancements:", err);
    return [];
  }
}

function fmtSignedDelta(hitValue, noHitValue) {
  if (hitValue === null || hitValue === undefined || noHitValue === null || noHitValue === undefined) return "—";
  const delta = Number(hitValue || 0) - Number(noHitValue || 0);
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}`;
}

function fmtNum(value) {
  if (value === null || value === undefined) return "—";
  return Number(value || 0).toLocaleString();
}

function fmtDecimal(value, digits = 1) {
  if (value === null || value === undefined) return "—";
  return Number(value || 0).toFixed(digits);
}

function initials(name) {
  return String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
}


function handednessBadge(player) {
  const hand = String(player?.bats || "").toUpperCase();

  if (hand === "S") return "SH";
  if (hand === "L") return "LHB";
  return "RHB";
}

function heatMeta(label) {
  const x = String(label || "").toLowerCase();

  if (x === "inferno") return { emoji: "🔥", className: "heat-inferno", label: "Inferno" };
  if (x === "hot") return { emoji: "🟠", className: "heat-hot", label: "Hot" };
  if (x === "warming") return { emoji: "🟡", className: "heat-warming", label: "Warming" };
  if (x === "cold") return { emoji: "🔵", className: "heat-cold", label: "Cold" };

  return { emoji: "⚪", className: "heat-neutral", label: "Neutral" };
}

function matchupTier(score) {
  const n = Number(score || 0);

  if (n >= 75) return { label: "Strong", className: "matchup-strong" };
  if (n >= 62) return { label: "Good", className: "matchup-good" };
  if (n >= 50) return { label: "Neutral", className: "matchup-neutral" };
  return { label: "Risk", className: "matchup-risk" };
}

function recommendedV2Score(row) {
  const rawScore = row?.model_v2_score;
  const score = Number(rawScore);
  if (rawScore !== null && rawScore !== undefined && rawScore !== "" && Number.isFinite(score)) return score;
  return Number(row?.matchup_score || 0);
}

function sortByRecommendedV2(a, b) {
  const v2Delta = recommendedV2Score(b) - recommendedV2Score(a);
  if (v2Delta !== 0) return v2Delta;

  const matchupDelta = Number(b?.matchup_score || 0) - Number(a?.matchup_score || 0);
  if (matchupDelta !== 0) return matchupDelta;

  return String(a?.full_name || a?.batter_name || "").localeCompare(String(b?.full_name || b?.batter_name || ""));
}

function withMlbClassicRanks(rows) {
  const v1RankByKey = new Map();

  rows
    .slice()
    .sort((a, b) => Number(b?.matchup_score || 0) - Number(a?.matchup_score || 0))
    .forEach((row, index) => {
      v1RankByKey.set(v2LookupKey(row) || String(row?.player_id || row?.full_name || index), index + 1);
    });

  return rows
    .slice()
    .sort(sortByRecommendedV2)
    .map((row, index) => ({
      ...row,
      recommended_rank: index + 1,
      v1_matchup_rank: v1RankByKey.get(v2LookupKey(row) || String(row?.player_id || row?.full_name || index)) || null
    }));
}


function withMlbConsensusRanks(rows) {
  const safeKey = (row, index) => v2LookupKey(row) || String(row?.player_id || row?.full_name || index);
  const v2RankByKey = new Map();
  const v3RankByKey = new Map();

  rows
    .slice()
    .sort(sortByRecommendedV2)
    .forEach((row, index) => {
      v2RankByKey.set(safeKey(row, index), index + 1);
    });

  rows
    .slice()
    .sort((a, b) => Number(a?.rank_overall || 9999) - Number(b?.rank_overall || 9999))
    .forEach((row, index) => {
      v3RankByKey.set(safeKey(row, index), Number(row?.rank_overall || index + 1));
    });

  return rows.map((row, index) => {
    const key = safeKey(row, index);
    const v2Rank = v2RankByKey.get(key) || null;
    const v3Rank = v3RankByKey.get(key) || null;
    return {
      ...row,
      consensus_v2_rank: v2Rank,
      consensus_v3_rank: v3Rank,
      consensus_score: Number.isFinite(Number(v2Rank)) && Number.isFinite(Number(v3Rank))
        ? Number(v2Rank) + Number(v3Rank)
        : null
    };
  });
}

function mlbConsensusInsight(row) {
  const reasons = [];
  const matchup = Number(row?.v1_matchup_score ?? row?.matchup_score);
  const v2Score = Number(row?.model_v2_score);
  const pa = Number(row?.expected_plate_appearances);
  const splitScore = Number(row?.adjusted_batter_split_score ?? row?.batter_split_score);
  const pitcherVuln = Number(row?.adjusted_pitcher_vulnerability_score ?? row?.pitcher_vulnerability_score);
  const recent = Number(row?.recent_form_score);
  const prob = Number(row?.hit_probability_pct);

  if (Number.isFinite(v2Score) && v2Score >= 78) reasons.push("elite V2 score");
  if (Number.isFinite(prob) && prob >= 70) reasons.push("high ML confidence");
  if (Number.isFinite(matchup) && matchup >= 80) reasons.push("elite matchup");
  if (Number.isFinite(pa) && pa >= 4.5) reasons.push("top-lineup opportunity");
  if (Number.isFinite(splitScore) && splitScore >= 75) reasons.push("favorable batter split");
  if (Number.isFinite(pitcherVuln) && pitcherVuln >= 75) reasons.push("vulnerable opposing SP");
  if (Number.isFinite(recent) && recent >= 70) reasons.push("strong recent form");

  const unique = [...new Set(reasons)].slice(0, 2);
  return unique.length ? unique.join(" • ") : "V2 and V3 model agreement";
}

function getMlbConsensusPlays(limit = 3) {
  const rows = (mlbRows || []).filter((row) => row && (row.player_id || row.batter_name || row.full_name));
  if (!rows.length) return [];

  const v2RankByPlayer = new Map();
  rows
    .slice()
    .sort(sortByRecommendedV2)
    .forEach((row, index) => {
      if (row.player_id !== null && row.player_id !== undefined) {
        v2RankByPlayer.set(String(row.player_id), index + 1);
      }
    });

  return rows
    .map((row) => {
      const playerKey = String(row.player_id || "");
      const v2Rank = Number(row.consensus_v2_rank || row.recommended_rank || v2RankByPlayer.get(playerKey));
      const v3Rank = Number(row.consensus_v3_rank || row.rank_overall);
      const hasV2Score = Number.isFinite(Number(row.model_v2_score)) || Number.isFinite(Number(row.v1_matchup_score)) || Number.isFinite(Number(row.matchup_score));
      const hasV3Rank = Number.isFinite(v3Rank);

      return {
        ...row,
        consensus_v2_rank: Number.isFinite(v2Rank) ? v2Rank : null,
        consensus_v3_rank: Number.isFinite(v3Rank) ? v3Rank : null,
        consensus_score: Number.isFinite(v2Rank) && Number.isFinite(v3Rank)
          ? v2Rank + v3Rank
          : null,
        has_consensus_inputs: hasV2Score && hasV3Rank
      };
    })
    .filter((row) => row.has_consensus_inputs && Number.isFinite(Number(row.consensus_score)))
    .sort((a, b) => {
      const consensusDelta = Number(a.consensus_score || 9999) - Number(b.consensus_score || 9999);
      if (consensusDelta !== 0) return consensusDelta;
      const v3Delta = Number(a.consensus_v3_rank || 9999) - Number(b.consensus_v3_rank || 9999);
      if (v3Delta !== 0) return v3Delta;
      return Number(a.consensus_v2_rank || 9999) - Number(b.consensus_v2_rank || 9999);
    })
    .slice(0, limit);
}

function renderMlbTodaysOutlookCard(rows, top25) {
  const consensus = getMlbConsensusPlays(3);
  const hasConsensus = consensus.length > 0;
  const topPick = rows[0] || null;

  return `
    <section class="daily-summary-card consensus-outlook-card">
      <div class="outlook-main">
        <div class="eyebrow">Daily Summary</div>
        <h2>Today's Outlook</h2>
        ${hasConsensus ? `
          <div class="consensus-play-list" data-consensus-rendered="true">
            ${consensus.map((row, index) => `
              <button class="consensus-play-row" type="button" data-consensus-player-id="${escapeHtml(row.player_id)}">
                <span class="consensus-medal">${index + 1}</span>
                <span class="consensus-player-copy">
                  <strong>${escapeHtml(row.batter_name || row.full_name || "Unknown hitter")}</strong>
                  <small>${escapeHtml(mlbConsensusInsight(row))}</small>
                </span>
                <span class="consensus-rank-pills">
                  <span class="model-rank-pill v2">V2 #${fmtNum(row.consensus_v2_rank)}</span>
                  <span class="model-rank-pill v3">V3 #${fmtNum(row.consensus_v3_rank)}</span>
                </span>
              </button>
            `).join("")}
          </div>
        ` : `
          <div class="consensus-play-list" data-consensus-rendered="fallback">
            ${(rows || []).slice(0, 3).map((row, index) => `
              <button class="consensus-play-row" type="button" data-consensus-player-id="${escapeHtml(row.player_id)}">
                <span class="consensus-medal">${index + 1}</span>
                <span class="consensus-player-copy">
                  <strong>${escapeHtml(row.batter_name || row.full_name || "Unknown hitter")}</strong>
                  <small>ML leader while V2 consensus ranks load</small>
                </span>
                <span class="consensus-rank-pills">
                  <span class="model-rank-pill v2">V2 —</span>
                  <span class="model-rank-pill v3">V3 #${fmtNum(row.rank_overall || index + 1)}</span>
                </span>
              </button>
            `).join("")}
          </div>
        `}
      </div>
      <div class="summary-metrics">
        <span>${fmtNum(rows.length)} hitters scored</span>
        <span>${top25.length} shown</span>
        <span>${hasConsensus ? `${consensus.length} consensus plays` : `${v3ModelRegistry?.status || "candidate"} model`}</span>
      </div>
    </section>
  `;
}

function focusMlbBoardPlayer(playerId) {
  if (!playerId) return;
  const row = document.querySelector(`[data-mlb-player-id="${CSS.escape(String(playerId))}"]`);
  if (!row) return;
  row.scrollIntoView({ behavior: "smooth", block: "center" });
  row.classList.add("row-highlight-flash");
  window.setTimeout(() => row.classList.remove("row-highlight-flash"), 1800);
}

function spRecentClass(score) {
  const n = Number(score || 0);
  // Reverse-colored: high SP recent = pitcher is hot = worse for hitters.
  if (n >= 70) return "sp-recent-bad";
  if (n >= 55) return "sp-recent-warn";
  if (n >= 40) return "sp-recent-neutral";
  return "sp-recent-good";
}

function renderSpRecentScore(score) {
  if (score === null || score === undefined) return "—";
  return fmtDecimal(score, 1);
}

async function loadPerformanceData() {
  try {
    const [
      summaryResult,
      topPickResult,
      componentResult,
      yesterdayResult,
      rankResult,
      pitcherVulnerabilityResult,
      mlbSummaryResult,
      mlbRankResult,
      mlbBucketResult,
      mlbWindowComparisonResult,
      mlbComponentResult
    ] = await Promise.all([
      client
        .from("v_matchup_model_performance_v2")
        .select("*")
        .eq("selected_window", performanceWindow)
        .maybeSingle(),

      client
        .from("v_matchup_model_top_pick_performance")
        .select("*")
        .eq("selected_window", performanceWindow)
        .maybeSingle(),

      client
        .from("v_matchup_model_component_analysis")
        .select("*")
        .eq("selected_window", performanceWindow)
        .maybeSingle(),

      client
        .from("v_matchup_model_yesterday_top_pick")
        .select("*")
        .eq("selected_window", performanceWindow)
        .maybeSingle(),

      client
        .from("v_matchup_model_rank_analysis")
        .select("*")
        .eq("selected_window", performanceWindow)
        .order("prediction_rank", { ascending: true }),

      client
        .from("v_matchup_model_pitcher_vulnerability_buckets")
        .select("*")
        .eq("selected_window", performanceWindow)
        .order("bucket_sort", { ascending: true }),

      client
        .from("v_mlb_hit_board_performance_summary")
        .select("*")
        .eq("selected_window", performanceWindow)
        .maybeSingle(),

      client
        .from("v_mlb_hit_board_rank_performance")
        .select("*")
        .eq("selected_window", performanceWindow)
        .order("overall_rank", { ascending: true }),

      client
        .from("v_mlb_hit_board_score_buckets")
        .select("*")
        .eq("selected_window", performanceWindow)
        .order("bucket_sort", { ascending: true }),

      client
        .from("v_mlb_model_window_comparison")
        .select("*")
        .order("selected_window", { ascending: true }),

      client
        .from("v_mlb_app_feature_signals")
        .select("*")
        .eq("selected_window", performanceWindow)
        .maybeSingle()
    ]);

    if (summaryResult.error) throw summaryResult.error;
    if (topPickResult.error) throw topPickResult.error;
    if (componentResult.error) throw componentResult.error;
    if (yesterdayResult.error) throw yesterdayResult.error;
    if (rankResult.error) throw rankResult.error;
    if (pitcherVulnerabilityResult.error) throw pitcherVulnerabilityResult.error;
    if (mlbSummaryResult.error) throw mlbSummaryResult.error;
    if (mlbRankResult.error) throw mlbRankResult.error;
    if (mlbBucketResult.error) throw mlbBucketResult.error;
    if (mlbWindowComparisonResult.error) throw mlbWindowComparisonResult.error;
    if (mlbComponentResult.error) throw mlbComponentResult.error;

    performanceSummary = summaryResult.data || null;
    topPickPerformance = topPickResult.data || null;
    componentAnalysis = componentResult.data || null;
    yesterdayTopPick = yesterdayResult.data || null;
    rankAnalysisRows = rankResult.data || [];
    pitcherVulnerabilityRows = pitcherVulnerabilityResult.data || [];
    mlbPerformanceSummary = mlbSummaryResult.data || null;
    mlbRankPerformanceRows = mlbRankResult.data || [];
    mlbScoreBucketRows = mlbBucketResult.data || [];
    mlbWindowComparisonRows = mlbWindowComparisonResult.data || [];
    mlbComponentAnalysis = mlbComponentResult.data || null;

    renderPerformancePage();
  } catch (err) {
    console.error("Error loading model performance data:", err);
    performanceSummary = null;
    topPickPerformance = null;
    componentAnalysis = null;
    yesterdayTopPick = null;
    rankAnalysisRows = [];
    pitcherVulnerabilityRows = [];
    renderPerformancePage();
  }
}

function setPerformanceMetric(id, value, subId, subValue) {
  setText(id, value);
  if (subId) setText(subId, subValue || "");
}

function renderComponentRow(label, hitValue, noHitValue) {
  return `
    <tr>
      <td>${label}</td>
      <td class="num">${fmtDecimal(hitValue, 1)}</td>
      <td class="num">${fmtDecimal(noHitValue, 1)}</td>
      <td class="num">${fmtSignedDelta(hitValue, noHitValue)}</td>
    </tr>
  `;
}


function renderYesterdayTopPickCard() {
  if (!yesterdayTopPick) {
    return `
      <section class="performance-note">
        <strong>Yesterday’s Top Pick</strong>
        <span>No top-pick result available for this model window yet.</span>
      </section>
    `;
  }

  const atBats = Number(yesterdayTopPick.actual_at_bats || 0);
  const didNotPlay = atBats === 0;
  const gotHit = yesterdayTopPick.actual_got_hit === true;

  const resultIcon = didNotPlay ? "⚪" : gotHit ? "✅" : "❌";
  const resultLabel = didNotPlay
    ? "Did Not Play"
    : `${fmtNum(yesterdayTopPick.actual_hits)}-for-${fmtNum(yesterdayTopPick.actual_at_bats)}`;
  const resultSub = didNotPlay
    ? "Excluded from model scoring"
    : `${fmtNum(yesterdayTopPick.actual_home_runs)} HR · ${fmtNum(yesterdayTopPick.actual_rbi)} RBI`;

  return `
    <section class="board-card performance-card">
      <div class="board-header">
        <div>
          <div class="eyebrow">Yesterday’s Top Pick</div>
          <h2>${yesterdayTopPick.full_name || "—"} ${resultIcon}</h2>
        </div>
        <div class="board-meta">
          <span>Score ${fmtDecimal(yesterdayTopPick.matchup_score, 1)}</span>
          <span>${yesterdayTopPick.confidence_label || "—"} confidence</span>
        </div>
      </div>

      <div class="performance-pick-card">
        <div>
          <span>Result</span>
          <strong>${resultLabel}</strong>
          <small>${resultSub}</small>
        </div>
        <div>
          <span>Game</span>
          <strong>${yesterdayTopPick.opponent_team_name || "Opponent"}</strong>
          <small>${formatGameDate(yesterdayTopPick.game_date)} · vs ${yesterdayTopPick.pitcher_name || "Pitcher"}</small>
        </div>
      </div>
    </section>
  `;
}

function renderRankAnalysisRows() {
  if (!rankAnalysisRows.length) {
    return `<tr><td colspan="3" class="empty-state">No rank analysis available yet.</td></tr>`;
  }

  return rankAnalysisRows.map((row) => `
    <tr>
      <td>#${fmtNum(row.prediction_rank)}</td>
      <td class="num">${fmtNum(row.sample_size)}</td>
      <td class="num">${fmtRate(row.hit_rate)}</td>
    </tr>
  `).join("");
}


function renderPitcherVulnerabilityRows() {
  if (!pitcherVulnerabilityRows.length) {
    return `<tr><td colspan="3" class="empty-state">No pitcher vulnerability data available yet.</td></tr>`;
  }

  return pitcherVulnerabilityRows.map((row) => `
    <tr>
      <td>${row.vulnerability_bucket}</td>
      <td class="num">${fmtNum(row.sample_size)}</td>
      <td class="num">${fmtRate(row.hit_rate)}</td>
    </tr>
  `).join("");
}


function renderPerformanceWindowSelector() {
  return `
    <section class="control-deck performance-window-deck">
      <div class="control-group">
        <div class="control-label">Model Window</div>
        <div class="segmented" id="performanceWindowButtons">
          ${PERFORMANCE_WINDOWS.map((windowValue) => `
            <button
              class="segment ${performanceWindow === windowValue ? "active" : ""}"
              data-performance-window="${windowValue}"
              type="button"
            >
              Last ${windowValue}
            </button>
          `).join("")}
        </div>
      </div>

      <div class="control-group grow">
        <div class="control-label">Tracking</div>
        <div class="sort-pill">Showing saved predictions for the ${performanceWindow}-game model</div>
      </div>
    </section>
  `;
}


function renderMlbRankPerformanceRows() {
  const rows = mlbRankPerformanceRows.slice(0, 20);
  if (!rows.length) {
    return `<tr><td colspan="4" class="empty-state">No MLB rank performance yet. Snapshot predictions before games and update actuals after games finish.</td></tr>`;
  }

  return rows.map((row) => `
    <tr>
      <td>Rank ${fmtNum(row.overall_rank)}</td>
      <td class="num">${fmtNum(row.ab_opportunities)}</td>
      <td class="num">${fmtNum(row.hitters_with_hit)}</td>
      <td class="num">${fmtRate(row.hit_rate)}</td>
    </tr>
  `).join("");
}

function renderMlbScoreBucketRows() {
  if (!mlbScoreBucketRows.length) {
    return `<tr><td colspan="4" class="empty-state">No MLB score bucket results yet.</td></tr>`;
  }

  return mlbScoreBucketRows.map((row) => `
    <tr>
      <td>${row.score_bucket}</td>
      <td class="num">${fmtNum(row.ab_opportunities)}</td>
      <td class="num">${fmtNum(row.hitters_with_hit)}</td>
      <td class="num">${fmtRate(row.hit_rate)}</td>
    </tr>
  `).join("");
}


function selectedMlbWindowStats() {
  return (
    mlbWindowComparisonRows.find((row) => Number(row.selected_window) === Number(performanceWindow)) ||
    mlbPerformanceSummary ||
    null
  );
}

function renderMlbWindowComparisonRows() {
  if (!mlbWindowComparisonRows.length) {
    return `<tr><td colspan="8" class="empty-state">No window comparison data yet. Run the MLB performance tracker for all windows.</td></tr>`;
  }

  return mlbWindowComparisonRows.map((row) => `
    <tr>
      <td><strong>Last ${fmtNum(row.selected_window)}</strong></td>
      <td class="num">${fmtNum(row.ab_opportunities)}</td>
      <td class="num">${fmtRate(row.overall_hit_rate)}</td>
      <td class="num">${fmtRate(row.top_pick_hit_rate)}</td>
      <td class="num">${fmtRate(row.top_5_hit_rate)}</td>
      <td class="num">${fmtRate(row.top_10_hit_rate)}</td>
      <td class="num">${fmtRate(row.top_20_hit_rate)}</td>
      <td class="num">${fmtRate(row.target_sp_top_5_hit_rate)}</td>
    </tr>
  `).join("");
}

function renderMlbHitBoardPerformanceSection() {
  const mlbStats = selectedMlbWindowStats();
  return `
    <section class="performance-note">
      <strong>MLB Hit Board Performance.</strong>
      <span>Uses rolling prediction history from historical backtest rows plus new daily rows. No-AB players are excluded.</span>
    </section>

    <section class="board-card performance-card">
      <div class="board-header">
        <div>
          <div class="eyebrow">MLB Window Comparison</div>
          <h2>Which Rolling Window Is Performing Best?</h2>
        </div>
        <div class="board-meta">
          <span>Compares Last 3 / 5 / 6 / 10</span>
          <span>No-AB players excluded</span>
        </div>
      </div>

      <div class="table-wrap">
        <table class="performance-table">
          <thead>
            <tr>
              <th>Window</th>
              <th class="num">AB Opps</th>
              <th class="num">Overall</th>
              <th class="num">Top Pick</th>
              <th class="num">Top 5</th>
              <th class="num">Top 10</th>
              <th class="num">Top 20</th>
              <th class="num">Target SP Top 5</th>
            </tr>
          </thead>
          <tbody>
            ${renderMlbWindowComparisonRows()}
          </tbody>
        </table>
      </div>
    </section>

<section class="board-card performance-card">
      <div class="board-header">
        <div>
          <div class="eyebrow">MLB Score Buckets</div>
          <h2>Hit Rate by Matchup Score</h2>
        </div>
      </div>

      <div class="table-wrap">
        <table class="performance-table">
          <thead>
            <tr>
              <th>Score Bucket</th>
              <th class="num">AB Opps</th>
              <th class="num">Hits</th>
              <th class="num">Hit Rate</th>
            </tr>
          </thead>
          <tbody>
            ${renderMlbScoreBucketRows()}
          </tbody>
        </table>
      </div>
    </section>

    <section class="board-card performance-card">
      <div class="board-header">
        <div>
          <div class="eyebrow">MLB Weight Optimizer</div>
          <h2>Component Signal Check</h2>
        </div>
        <div class="board-meta">
          <span>${fmtNum(mlbComponentAnalysis?.sample_size)} player-games</span>
          <span>Positive delta = better signal</span>
        </div>
      </div>

      <div class="table-wrap">
        <table class="performance-table">
          <thead>
            <tr>
              <th>Component</th>
              <th class="num">Avg When Hit</th>
              <th class="num">Avg When No Hit</th>
              <th class="num">Delta</th>
            </tr>
          </thead>
          <tbody>
            ${renderComponentRow("Recent Form", mlbComponentAnalysis?.avg_recent_form_when_hit, mlbComponentAnalysis?.avg_recent_form_when_no_hit)}
            ${renderComponentRow("Batter Split", mlbComponentAnalysis?.avg_batter_split_when_hit, mlbComponentAnalysis?.avg_batter_split_when_no_hit)}
            ${renderComponentRow("SP Vulnerability", mlbComponentAnalysis?.avg_pitcher_vuln_when_hit, mlbComponentAnalysis?.avg_pitcher_vuln_when_no_hit)}
            ${renderComponentRow("Pitcher Recent Form", mlbComponentAnalysis?.avg_pitcher_recent_when_hit, mlbComponentAnalysis?.avg_pitcher_recent_when_no_hit)}
            ${renderComponentRow("Matchup Score", mlbComponentAnalysis?.avg_matchup_when_hit, mlbComponentAnalysis?.avg_matchup_when_no_hit)}
          </tbody>
        </table>
      </div>
    </section>


`;
}


function renderPerformanceScopeSelector() {
  return `
    <section class="control-deck performance-window-deck">
      <div class="control-group grow">
        <div class="control-label">Performance Scope</div>
        <div class="sort-pill">All-MLB predictions · Reds included in MLB sample</div>
      </div>
    </section>
  `;
}


function wirePerformanceScopeButtons() {
  // Model Performance is MLB-only. Reds are included in the MLB sample.
}


function renderRedsPerformanceSection() {
  return renderMlbHitBoardPerformanceSection();
}


function renderPerformancePage() {
  const hasPerformancePage =
    $("performanceTopPick") ||
    $("performanceContent") ||
    $("performanceSummaryBody") ||
    $("componentAnalysisBody");

  if (!hasPerformancePage) return;

  setPerformanceMetric(
    "performanceTopPick",
    fmtRate(topPickPerformance?.top_1_hit_rate),
    "performanceTopPickSub",
    `${fmtNum(topPickPerformance?.top_1_scored)} scored`
  );

  setPerformanceMetric(
    "performanceTop3",
    fmtRate(topPickPerformance?.top_3_hit_rate),
    "performanceTop3Sub",
    `${fmtNum(topPickPerformance?.top_3_scored)} scored`
  );

  setPerformanceMetric(
    "performanceTop5",
    fmtRate(topPickPerformance?.top_5_hit_rate),
    "performanceTop5Sub",
    `${fmtNum(topPickPerformance?.top_5_scored)} scored`
  );

  setPerformanceMetric(
    "performanceOverall",
    fmtRate(topPickPerformance?.all_hit_rate || performanceSummary?.hit_rate),
    "performanceOverallSub",
    `${fmtNum(performanceSummary?.predictions_with_ab)} with AB · ${fmtNum(performanceSummary?.predictions_no_ab)} no AB`
  );

  setPerformanceMetric(
    "performancePlayersScored",
    fmtNum(performanceSummary?.predictions_scored),
    "performancePlayersScoredSub",
    `${fmtNum(performanceSummary?.hitters_with_hit)} got a hit`
  );

  const content = $("performanceContent");
  if (!content) return;

  content.innerHTML = `
    ${renderPerformanceScopeSelector()}
    ${renderPerformanceWindowSelector()}
    ${renderMlbHitBoardPerformanceSection()}
  `;


  document.querySelectorAll("#performanceWindowButtons .segment").forEach((button) => {
    button.addEventListener("click", async () => {
      const nextWindow = Number(button.dataset.performanceWindow);
      if (!nextWindow || nextWindow === performanceWindow) return;

      performanceWindow = nextWindow;

      performanceSummary = null;
      topPickPerformance = null;
      componentAnalysis = null;
      yesterdayTopPick = null;
      rankAnalysisRows = [];
      pitcherVulnerabilityRows = [];
      mlbPerformanceSummary = null;
      mlbRankPerformanceRows = [];
      mlbScoreBucketRows = [];
      mlbComponentAnalysis = null;
      mlbWindowComparisonRows = [];

      renderPerformancePage();
      await loadPerformanceData();
    });
  });
}

function formatGameDate(value) {
  if (!value) return "—";

  const date = new Date(`${value}T12:00:00`);

  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function matchupTimingLabel(gameDate) {
  if (!gameDate) return "Loaded Matchup";

  const today = new Date();
  const todayText = today.toISOString().slice(0, 10);

  if (gameDate === todayText) return "Today's Matchup";
  if (gameDate > todayText) return "Next Game";

  return "Latest Loaded Matchup";
}


function isPitcherTbd(matchup) {
  const name = String(matchup?.pitcher_name || "").trim().toUpperCase();
  return !matchup?.pitcher_id || !name || name === "TBD";
}

function pitcherDisplayName(matchup) {
  return isPitcherTbd(matchup) ? "Probable Starter TBD" : matchup.pitcher_name;
}

function pitcherDisplayThrows(matchup) {
  return isPitcherTbd(matchup) ? "—" : (matchup.pitcher_throws || "—");
}

// Compatibility wrapper for older callers.
function setDrawerSectionLabel(currentText, nextText) {
  document.querySelectorAll(".drawer-section-title").forEach((el) => {
    if (el.textContent.trim() === currentText) {
      el.textContent = nextText;
    }
  });
}

function resetDrawerLabels() {
  setDrawerSectionLabel("Recent Production", "Recent Production");
  setDrawerSectionLabel("MLB Recent Production", "Recent Production");
  setDrawerSectionLabel("Season Splits", "Season Splits");
  setDrawerSectionLabel("MLB Matchup Split", "Season Splits");
}

function mlbDrawerMatchupRow(row) {
  return {
    ...row,
    model_window: mlbWindow,
    batter_bats: row.batter_bats,
    pitcher_split_reliability: row.pitcher_split_reliability ?? row.pitcher_vulnerability_reliability ?? 0,
    batter_split_reliability: row.batter_split_reliability ?? 0,
    explanation:
      row.explanation ||
      `${row.full_name || "This hitter"} grades as a ${fmtDecimal(row.matchup_score, 1)} matchup today against ${row.pitcher_name || "the opposing starter"}.`
  };
}


function formatEasternGameTime(value) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).formatToParts(d);

  const hour = parts.find((x) => x.type === "hour")?.value || "";
  const minute = parts.find((x) => x.type === "minute")?.value || "";
  const dayPeriod = parts.find((x) => x.type === "dayPeriod")?.value || "";
  const zone = parts.find((x) => x.type === "timeZoneName")?.value || "ET";

  return `${hour}:${minute} ${dayPeriod} ${zone}`.replace(/\s+/g, " ").trim();
}

function v3Metric(label, value, sub = "") {
  return `
    <div class="v3-drawer-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${sub ? `<small>${escapeHtml(sub)}</small>` : ""}
    </div>
  `;
}

function v3ReasonPills(row) {
  const drawerTags = Array.isArray(row?.drawer_positive_tags)
    ? row.drawer_positive_tags.filter(Boolean)
    : [];

  if (drawerTags.length) {
    return drawerTags
      .slice(0, 4)
      .map((pill) => `<span class="why-pill">${escapeHtml(pill)}</span>`)
      .join("");
  }

  const text = String(row?.explanation_text || row?.explanation || "");
  const pills = [];

  if (/recent hit|hot recently|recent form|high recent/i.test(text)) pills.push("Hot batter");
  if (/split is favorable|favorable split|batter split/i.test(text)) pills.push("Great split");
  if (/pitcher allows|allowed traffic|high batting average|pitcher has allowed/i.test(text)) pills.push("Pitcher edge");
  if (Number(row?.expected_plate_appearances || 0) >= 4.3) pills.push("PA volume");
  if (/risk|tougher|adding risk/i.test(text)) pills.push("Risk note");

  if (!pills.length) pills.push("Model edge");

  return pills.slice(0, 4).map((pill) => `<span class="why-pill">${escapeHtml(pill)}</span>`).join("");
}

function v3RiskPills(row) {
  const risks = Array.isArray(row?.drawer_negative_tags)
    ? row.drawer_negative_tags.filter(Boolean)
    : [];

  if (!risks.length) return "";

  return `
    <div class="v3-risk-row">
      <span class="v3-risk-label">Risks</span>
      ${risks
        .slice(0, 3)
        .map((risk) => `<span class="why-pill v3-risk-pill">${escapeHtml(risk)}</span>`)
        .join("")}
    </div>
  `;
}


function v3ContributionPct(value) {
  const pct = Math.abs(Number(value));
  if (!Number.isFinite(pct)) return "—";
  const digits = pct >= 10 ? 0 : pct >= 1 ? 1 : 2;
  return `${pct.toFixed(digits)}%`;
}

function v3FeatureGroupLabel(featureGroup) {
  const group = String(featureGroup || "other").toLowerCase();
  if (group === "availability") {
    return "Pitch-Arsenal/Contact Data Availability";
  }

  return group
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const V3_DRIVER_METADATA = [
  {
    match: /^pitcher_last5_whip_w3$|pitcher.*last.*whip/i,
    title: "Opposing Pitcher Recent WHIP",
    format: (value) => formatV3DecimalUnit(value, 2, "WHIP"),
    describe: ({ formattedValue, direction }) => direction === "positive"
      ? `The opposing pitcher's ${formattedValue} indicates frequent recent baserunner traffic, which favors the hitter.`
      : `The opposing pitcher's ${formattedValue} indicates limited recent baserunner traffic.`
  },
  {
    match: /^batter_recent_at_bats_w5$|batter.*recent.*at[_ ]?bats/i,
    title: "Recent At-Bat Volume",
    format: (value) => formatV3Count(value, "AB"),
    describe: ({ formattedValue, direction }) => direction === "positive"
      ? `${formattedValue} provide a solid recent sample for evaluating the hitter.`
      : `${formattedValue} provide a smaller recent sample, adding some uncertainty to the projection.`
  },
  {
    match: /^pitch_data_sample$|batter_pitch_sample|pitcher_pitch_sample/i,
    title: "Pitch Data Sample",
    format: (value) => formatV3Count(value, "tracked pitches"),
    describe: ({ formattedValue, direction }) => direction === "positive"
      ? `The model has a strong sample of ${formattedValue} for this hitter.`
      : `Only ${formattedValue} are available, which adds uncertainty to the matchup analysis.`
  },
  {
    match: /pitcher.*(baa|batting_average_against)|pitcher_baa/i,
    title: "Opposing Pitcher Split",
    format: (value) => formatV3BattingAverage(value),
    describe: ({ formattedValue, direction }) => direction === "positive"
      ? `The opposing pitcher allows a ${formattedValue} batting average in this split, which is favorable for the hitter.`
      : `The opposing pitcher limits hitters to a ${formattedValue} batting average in this split.`
  },
  {
    match: /batter.*split.*(avg|batting_average)/i,
    title: "Batter Matchup Split",
    format: (value) => formatV3BattingAverage(value),
    describe: ({ formattedValue, direction }) => direction === "positive"
      ? `The hitter owns a ${formattedValue} batting average in this matchup split.`
      : `The hitter owns a ${formattedValue} batting average in this matchup split, which lowers the projection.`
  },
  {
    match: /batter.*split.*score/i,
    title: "Batter Split Strength",
    format: (value) => formatV3Score(value),
    describe: ({ formattedValue, direction }) => direction === "positive"
      ? `A ${formattedValue} split score is a strong positive matchup signal.`
      : `A ${formattedValue} split score is below the model's preferred range.`
  },
  {
    match: /(pitch|arsenal).*sample|batter_pitch_sample|pitcher_pitch_sample/i,
    title: "Pitch Data Sample",
    format: (value) => formatV3Count(value, "pitches"),
    describe: ({ formattedValue, direction }) => direction === "positive"
      ? `The model has a strong sample of ${formattedValue} for this matchup analysis.`
      : `Only ${formattedValue} are available, which adds uncertainty to the matchup analysis.`
  },
  {
    match: /expected.*plate.*appearance|expected_pa/i,
    title: "Expected Plate Appearances",
    format: (value) => formatV3DecimalUnit(value, 1, "PA"),
    describe: ({ formattedValue, direction }) => direction === "positive"
      ? `The hitter is projected for ${formattedValue}, creating more opportunities to record a hit.`
      : `The hitter is projected for only ${formattedValue}, reducing his opportunities to record a hit.`
  },
  {
    match: /(^|_)(era)($|_)/i,
    title: "Pitcher Recent ERA",
    format: (value) => formatV3DecimalUnit(value, 2, "ERA"),
    describe: ({ formattedValue, direction }) => direction === "positive"
      ? `The opposing pitcher's ${formattedValue} points to a favorable recent run-prevention matchup.`
      : `The opposing pitcher's ${formattedValue} points to a tougher recent matchup.`
  },
  {
    match: /whip/i,
    title: "Pitcher Recent WHIP",
    format: (value) => formatV3DecimalUnit(value, 2, "WHIP"),
    describe: ({ formattedValue, direction }) => direction === "positive"
      ? `The opposing pitcher's ${formattedValue} indicates frequent baserunner traffic.`
      : `The opposing pitcher's ${formattedValue} indicates limited baserunner traffic.`
  },
  {
    match: /exit_velocity|exit_velo|avg_ev|max_ev/i,
    title: "Exit Velocity",
    format: (value) => formatV3DecimalUnit(value, 1, "mph"),
    describe: ({ formattedValue, direction }) => direction === "positive"
      ? `A ${formattedValue} exit-velocity signal supports stronger contact quality.`
      : `A ${formattedValue} exit-velocity signal points to weaker contact quality.`
  },
  {
    match: /(^|_)(xba|xwoba|baa|avg)($|_)/i,
    title: null,
    format: (value) => formatV3BattingAverage(value),
    describe: ({ title, formattedValue, direction }) => direction === "positive"
      ? `${title} at ${formattedValue} was a positive baseball signal for the model.`
      : `${title} at ${formattedValue} was a negative baseball signal for the model.`
  },
  {
    match: /rate|pct|percentage/i,
    title: null,
    format: (value) => formatV3Rate(value),
    describe: ({ title, formattedValue, direction }) => direction === "positive"
      ? `${title} at ${formattedValue} improved the projection.`
      : `${title} at ${formattedValue} reduced the projection.`
  },
  {
    match: /score/i,
    title: null,
    format: (value) => formatV3Score(value),
    describe: ({ title, formattedValue, direction }) => direction === "positive"
      ? `${title} at ${formattedValue} was a positive signal.`
      : `${title} at ${formattedValue} was a negative signal.`
  },
  {
    match: /sample|count|plate_appearances|at_bats|_ab($|_)/i,
    title: null,
    format: (value) => formatV3Count(value),
    describe: ({ title, formattedValue, direction }) => direction === "positive"
      ? `${title} has a reliable sample of ${formattedValue}.`
      : `${title} is based on a limited sample of ${formattedValue}.`
  }
];

function v3DriverFeatureKey(item) {
  return String(item?.feature_name || item?.display_name || "").trim();
}

function v3ReadableFeatureName(value) {
  return String(value || "Model signal")
    .replace(/^num__|^cat__/, "")
    .replace(/_w(3|5|10|15|20|30|45|60|season)$/i, "")
    .replace(/_(3|5|10|15|20|30|45|60)g$/i, "")
    .replaceAll("_", " ")
    .replace(/\bbaa\b/gi, "BAA")
    .replace(/\bxba\b/gi, "xBA")
    .replace(/\bxwoba\b/gi, "xwOBA")
    .replace(/\bwhip\b/gi, "WHIP")
    .replace(/\bera\b/gi, "ERA")
    .replace(/\bpa\b/gi, "PA")
    .replace(/\bab\b/gi, "AB")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatV3BattingAverage(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(3).replace(/^0/, "");
}

function formatV3Rate(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const pct = Math.abs(n) <= 1 ? n * 100 : n;
  return `${pct.toFixed(pct >= 10 ? 1 : 1)}%`;
}

function formatV3Score(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(1)} / 100`;
}

function formatV3Count(value, unit = "") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const text = Math.round(n).toLocaleString();
  return unit ? `${text} ${unit}` : text;
}

function formatV3DecimalUnit(value, digits, unit) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)} ${unit}`;
}

function formatV3GenericValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value == null || value === "" ? "—" : String(value);
  if (Number.isInteger(n)) return n.toLocaleString();
  if (Math.abs(n) < 1) return n.toFixed(3).replace(/^0/, "");
  return n.toFixed(2);
}

function resolveV3DriverPresentation(item, direction) {
  const key = v3DriverFeatureKey(item);
  const fallbackTitle = item?.display_name || v3ReadableFeatureName(key);
  const metadata = V3_DRIVER_METADATA.find((entry) => entry.match.test(key));
  const title = metadata?.title || fallbackTitle || "Model Signal";
  const formattedValue = (metadata?.format || formatV3GenericValue)(item?.raw_value);
  const backendExplanation = String(item?.explanation || "").trim();
  const description = backendExplanation || (metadata?.describe
    ? metadata.describe({ item, title, formattedValue, direction })
    : direction === "positive"
      ? `${title} at ${formattedValue} was a positive signal for the model.`
      : `${title} at ${formattedValue} was a risk factor for the model.`);

  return { title, formattedValue, description };
}

function v3DriverRows(items, direction) {
  const rows = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!rows.length) return "";

  return `
    <div class="v3-driver-list">
      ${rows.map((item) => {
        const presentation = resolveV3DriverPresentation(item, direction);
        const pct = v3ContributionPct(item.contribution_pct);
        return `
          <article class="v3-driver-card ${direction}">
            <div class="v3-driver-icon">${direction === "positive" ? "↑" : "↓"}</div>
            <div class="v3-driver-copy">
              <div class="v3-driver-title">${escapeHtml(presentation.title)}</div>
              <div class="v3-driver-value">${escapeHtml(presentation.formattedValue)}</div>
              <div class="v3-driver-explanation">${escapeHtml(presentation.description)}</div>
            </div>
            <div class="v3-driver-pct" title="Share of total absolute model impact">${escapeHtml(pct)}</div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function v3DriverSummary(row, positiveDrivers, riskFactors) {
  const positives = (positiveDrivers || [])
    .slice(0, 3)
    .map((item) => resolveV3DriverPresentation(item, "positive").title)
    .filter(Boolean);
  const risks = (riskFactors || [])
    .slice(0, 2)
    .map((item) => resolveV3DriverPresentation(item, "negative").title)
    .filter(Boolean);

  if (!positives.length) {
    return row.drawer_explanation_text || row.explanation_text || row.explanation || "Detailed model drivers are not available yet.";
  }

  const positiveText = positives.length === 1
    ? positives[0]
    : `${positives.slice(0, -1).join(", ")} and ${positives.at(-1)}`;

  if (!risks.length) {
    return `The strongest upward drivers are ${positiveText}, with no material downside signal clearing the display threshold.`;
  }

  const riskText = risks.length === 1
    ? risks[0]
    : `${risks.slice(0, -1).join(", ")} and ${risks.at(-1)}`;

  return `The strongest upward drivers are ${positiveText}. The main risks are ${riskText}.`;
}

function v3GroupRows(items) {
  const rows = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!rows.length) return "";

  return `
    <div class="v3-group-list">
      ${rows.map((item) => {
        const direction = String(item.direction || "").toLowerCase();
        const isNegative = direction === "negative" || Number(item.contribution) < 0;
        const label = v3FeatureGroupLabel(item.feature_group);
        const pct = v3ContributionPct(item.contribution_pct);
        const rawPct = Math.abs(Number(item.contribution_pct || 0));
        const width = Math.max(1, Math.min(100, rawPct));

        return `
          <div class="v3-group-row">
            <div class="v3-group-topline">
              <span>${escapeHtml(label)}</span>
              <strong class="${isNegative ? "negative" : "positive"}">${isNegative ? "−" : "+"}${escapeHtml(pct)}</strong>
            </div>
            <div class="v3-group-track">
              <span class="${isNegative ? "negative" : "positive"}" style="width:${width.toFixed(1)}%"></span>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}


function comparableProfileDisplay(row) {
  const v3Probability = Number(row?.predicted_probability);
  const profileRate = Number(row?.comparable_profile_rate);
  const sampleSize = Number(row?.comparable_profile_sample_size);
  const status = String(row?.comparable_profile_status || "").toLowerCase();
  const isAvailable =
    status === "available" &&
    Number.isFinite(v3Probability) &&
    Number.isFinite(profileRate) &&
    Number.isFinite(sampleSize) &&
    sampleSize >= 50;

  if (!isAvailable) {
    return `
      <section class="drawer-section v3-section comparable-profile-card comparable-profile-unavailable">
        <div class="comparable-profile-heading">
          <div>
            <div class="drawer-section-title">Comparable Profile</div>
            <p>Not enough similar, fully evaluated V3 player-games are available for a reliable comparison.</p>
          </div>
          <span class="comparable-sample-badge limited">Unavailable</span>
        </div>
      </section>
    `;
  }

  // User-facing perspective: positive means comparable outcomes were stronger
  // than today's V3 probability (V3 is the more conservative estimate).
  const comparableAdvantage = profileRate - v3Probability;
  const deltaClass =
    comparableAdvantage > 0.0005 ? "positive" :
    comparableAdvantage < -0.0005 ? "negative" :
    "neutral";
  const deltaSign = comparableAdvantage > 0 ? "+" : "";
  const sampleLabel = row?.comparable_profile_sample_label || (
    sampleSize >= 150 ? "Strong Sample" :
    sampleSize >= 75 ? "Moderate Sample" :
    "Limited Sample"
  );
  const badgeClass =
    sampleSize >= 150 ? "strong" :
    sampleSize >= 75 ? "moderate" :
    "limited";

  return `
    <section class="drawer-section v3-section comparable-profile-card">
      <div class="comparable-profile-heading">
        <div>
          <div class="drawer-section-title">Comparable Profile</div>
          <p>
            Similar V3 player-matchup profiles recorded at least one hit
            <strong>${escapeHtml((profileRate * 100).toFixed(1))}%</strong> of the time.
          </p>
        </div>
        <span class="comparable-sample-badge ${badgeClass}">${escapeHtml(sampleLabel)}</span>
      </div>

      <div class="comparable-profile-rows">
        <div class="comparable-profile-row">
          <span>V3 Hit Probability</span>
          <strong>${escapeHtml((v3Probability * 100).toFixed(1))}%</strong>
        </div>
        <div class="comparable-profile-row">
          <span>Comparable Profile Rate</span>
          <strong>${escapeHtml((profileRate * 100).toFixed(1))}%</strong>
        </div>
        <div class="comparable-profile-row">
          <span>V3 vs Comparable Profile</span>
          <strong class="comparable-delta ${deltaClass}">
            ${escapeHtml(deltaSign + (comparableAdvantage * 100).toFixed(1))} pts
          </strong>
        </div>
      </div>

      <div class="comparable-profile-footer">
        <span>ⓘ Based on ${escapeHtml(fmtNum(sampleSize))} comparable player-games</span>
        <span>${escapeHtml(sampleLabel)}</span>
      </div>
    </section>
  `;
}

function v3AdditionalContext(row, pitcher, gameTime) {
  const lineupSpot = Number(row?.recent_lineup_spot);
  const lineupValue = Number.isFinite(lineupSpot) && lineupSpot > 0 ? fmtNum(lineupSpot) : "—";
  const lineupSub =
    lineupSpot === 1 ? "Leadoff" :
    Number.isFinite(lineupSpot) && lineupSpot <= 5 ? "Top five" :
    Number.isFinite(lineupSpot) ? "Lower lineup" :
    "Lineup pending";
  const expectedPa = row?.expected_plate_appearances != null
    ? fmtDecimal(row.expected_plate_appearances, 1)
    : "—";
  const opponent = row?.opponent_team_name || row?.pitcher_team_name || "Opponent TBD";
  const venue = row?.venue_name || "Venue TBD";

  return `
    <section class="drawer-section v3-section additional-context-section">
      <div class="drawer-section-title">Additional Context</div>
      <div class="additional-context-grid">
        ${v3Metric("Lineup spot", lineupValue, lineupSub)}
        ${v3Metric("Expected PA", expectedPa, "Plate appearances")}
        ${v3Metric("Game", opponent, gameTime)}
        ${v3Metric("Opponent SP", pitcher, venue)}
      </div>
    </section>
  `;
}

function openV3MlbDrawer(row) {
  const drawer = $("playerDrawer");
  const body = document.querySelector(".drawer-body");
  if (!drawer || !body) return;

  const name = row.batter_name || row.full_name || "Unknown Player";
  const probability = fmtProbabilityPct(row);
  const confidence = titleCase(row.confidence_bucket || row.model_confidence);
  const rank = row.rank_overall ? `#${fmtNum(row.rank_overall)}` : "—";
  const totalRows = mlbRows.length || 396;
  const pitcher = row.pitcher_name
    ? `${row.pitcher_name}${row.pitcher_throws ? ` (${row.pitcher_throws})` : ""}`
    : "Probable starter TBD";
  const gameTime = formatEasternGameTime(row.game_time_utc);
  const confidenceClass = v3ConfidenceClass(confidence);

  drawer.classList.remove("mlb-matchup-only");
  drawer.classList.add("v3-detail-drawer");

  setText("drawerPlayerName", name);
  setText("drawerPlayerSub", `${row.team_name || "MLB"} · Player ID ${row.player_id || "—"} · ML hit probability model`);

  body.dataset.mode = "v3";
  body.innerHTML = `
    <section class="v3-drawer-hero">
      <div class="v3-probability-ring">
        <span>${escapeHtml(probability)}</span>
        <small>Hit probability</small>
      </div>
      <div class="v3-drawer-summary">
        <div class="v3-rank-line">${escapeHtml(rank)} of ${escapeHtml(totalRows)} scored hitters</div>
        <div class="v3-confidence ${confidenceClass}">${escapeHtml(confidence)} confidence</div>
      </div>
    </section>

    ${comparableProfileDisplay(row)}

    ${v3AdditionalContext(row, pitcher, gameTime)}

    <section class="drawer-section v3-section">
      <div class="drawer-section-title">Key Signals</div>
      <div class="v3-drawer-grid">
        ${v3Metric("Recent hit rate", row.batter_recent_hit_rate != null ? fmtPct(row.batter_recent_hit_rate) : "—", row.batter_recent_hits != null && row.batter_recent_at_bats != null ? `${fmtNum(row.batter_recent_hits)} hits · ${fmtNum(row.batter_recent_at_bats)} AB` : "")}
        ${v3Metric("Recent AVG", row.batter_recent_avg != null ? fmtAvg(row.batter_recent_avg) : "—", "Recent form")}
        ${v3Metric("Batter split", row.batter_split_avg != null ? fmtAvg(row.batter_split_avg) : "—", row.batter_split_ab != null ? `${fmtNum(row.batter_split_ab)} AB` : row.batter_split_label || "Matchup split")}
        ${v3Metric("Pitcher BAA", row.pitcher_baa_split != null ? fmtAvg(row.pitcher_baa_split) : "—", row.pitcher_split_label || "Vs batter side")}
        ${v3Metric("Pitcher WHIP", row.pitcher_last5_whip != null ? fmtDecimal(row.pitcher_last5_whip, 2) : "—", "Last 5 starts")}
        ${v3Metric("Pitcher ERA", row.pitcher_last5_era != null ? fmtDecimal(row.pitcher_last5_era, 2) : "—", "Last 5 starts")}
      </div>
    </section>

    <section class="drawer-section v3-section subtle-model-note">
      <div class="drawer-section-title">Model Note</div>
      <p class="drawer-explanation">
        ${row.drawer_feature_count
          ? `This prediction was evaluated across ${escapeHtml(fmtNum(row.drawer_feature_count))} model features. Contributions show how each signal moved the player’s log-odds relative to the model baseline.`
          : "V3 is ranking hitters by machine-learning hit probability. The old fixed model weights are intentionally hidden here because this view should explain the ML prediction, not the legacy score formula."}
      </p>
    </section>
  `;

  drawer.classList.add("open");
  $("drawerBackdrop")?.classList.add("open");
}

function openMlbDrawer(playerId) {
  const baseRow = mlbRows.find((x) => String(x.player_id) === String(playerId));
  if (!baseRow) return;
  const row = withV2Enhancement(baseRow, mlbV2EnhancementRows);
  openV3MlbDrawer(row);
}

function closeDrawer() {
  $("playerDrawer")?.classList.remove("open");
  $("playerDrawer")?.classList.remove("mlb-matchup-only");
  $("playerDrawer")?.classList.remove("v3-detail-drawer");
  $("drawerBackdrop")?.classList.remove("open");
  resetDrawerLabels();
}


function normalizeV3HitRow(row) {
  if (!row) return row;

  const probability = Number(row.predicted_probability ?? 0);
  const hitPct = row.hit_probability_pct ?? (Number.isFinite(probability) ? probability * 100 : null);
  const featurePayload = row.features || {};
  const drawerExplanationText = row.drawer_explanation_text || row.explanation_text || row.explanation || "ML model explanation unavailable.";

  return {
    ...row,
    drawer_explanation_headline: row.drawer_explanation_headline || null,
    drawer_explanation_text: row.drawer_explanation_text || null,
    drawer_positive_tags: Array.isArray(row.drawer_positive_tags) ? row.drawer_positive_tags : [],
    drawer_negative_tags: Array.isArray(row.drawer_negative_tags) ? row.drawer_negative_tags : [],
    drawer_explanation_method: row.drawer_explanation_method || null,
    drawer_explanation_status: row.drawer_explanation_status || null,
    drawer_top_positive_drivers: Array.isArray(row.drawer_top_positive_drivers)
      ? row.drawer_top_positive_drivers
      : [],
    drawer_top_risk_factors: Array.isArray(row.drawer_top_risk_factors)
      ? row.drawer_top_risk_factors
      : [],
    drawer_feature_count: Number(row.drawer_feature_count || 0),
    full_name: row.batter_name || row.full_name,
    batter_name: row.batter_name || row.full_name,
    pitching_team_name: row.pitcher_team_name,
    matchup_score: hitPct,
    model_v2_score: featurePayload?.v2_calibrated_hit_probability ? Number(featurePayload.v2_calibrated_hit_probability) * 100 : row.model_v2_score,
    hot_score: featurePayload?.batter_recent_hit_rate ? Number(featurePayload.batter_recent_hit_rate) * 100 : row.hot_score,
    batter_bats: featurePayload?.batter_bats || row.batter_bats,
    pitcher_throws: featurePayload?.pitcher_throws || row.pitcher_throws,
    batter_recent_hit_rate: featurePayload?.batter_recent_hit_rate ?? row.batter_recent_hit_rate,
    batter_recent_avg: featurePayload?.batter_recent_avg ?? row.batter_recent_avg,
    batter_recent_hits: featurePayload?.batter_recent_hits ?? row.batter_recent_hits,
    batter_recent_at_bats: featurePayload?.batter_recent_at_bats ?? row.batter_recent_at_bats,
    batter_split_avg: featurePayload?.adjusted_batter_split_avg ?? featurePayload?.batter_split_avg ?? row.batter_split_avg,
    batter_split_ab: featurePayload?.batter_split_ab ?? row.batter_split_ab,
    pitcher_baa_split: featurePayload?.adjusted_pitcher_baa_split ?? featurePayload?.pitcher_baa_split ?? row.pitcher_baa_split,
    pitcher_last5_whip: featurePayload?.pitcher_last5_whip ?? row.pitcher_last5_whip,
    pitcher_last5_era: featurePayload?.pitcher_last5_era ?? row.pitcher_last5_era,
    expected_plate_appearances: featurePayload?.expected_plate_appearances ?? row.expected_plate_appearances,
    recent_lineup_spot: featurePayload?.recent_lineup_spot ?? featurePayload?.batting_order ?? row.recent_lineup_spot,
    batter_split_label: row.explanation_factors?.batter_split_label || row.batter_split_label || "matchup split",
    games_with_hit: null,
    games: null,
    model_confidence: row.confidence_bucket,
    explanation: drawerExplanationText
  };
}

function v3ConfidenceClass(confidence) {
  const x = String(confidence || "").toLowerCase();
  if (x.includes("high")) return "confidence-high";
  if (x.includes("medium") || x.includes("med")) return "confidence-medium";
  return "confidence-low";
}

function fmtProbabilityPct(row) {
  const pct = row?.hit_probability_pct ?? (row?.predicted_probability != null ? Number(row.predicted_probability) * 100 : null);
  if (pct === null || pct === undefined || Number.isNaN(Number(pct))) return "—";
  return `${Number(pct).toFixed(1)}%`;
}

function topPickNarrative(row) {
  if (!row) return "Run the V3 scoring job to populate today's ML hit probabilities.";
  const opponent = row.pitcher_name ? ` against ${row.pitcher_name}` : "";
  return `${row.batter_name || row.full_name} leads today's board at ${fmtProbabilityPct(row)}${opponent}. ${row.explanation_text || row.explanation || ""}`;
}

function modelStatusText() {
  const version = v3ModelRegistry?.model_version || "V3 candidate";
  const status = v3ModelRegistry?.status || "candidate";
  return `${version} · ${status}`;
}

function actualsStatusText() {
  if (!v3ActualsStatus) return "Actuals pending";
  if (Number(v3ActualsStatus.waiting_on_batting_log_rows || 0) > 0) {
    return `${fmtNum(v3ActualsStatus.waiting_on_batting_log_rows)} rows waiting on logs`;
  }
  return `${fmtNum(v3ActualsStatus.actual_loaded_rows)} actuals loaded`;
}

function v3ReasonLabels(row) {
  const text = String(row?.explanation_text || row?.explanation || "");
  const reasons = [];

  if (/recent hit|hot recently|recent form/i.test(text)) reasons.push({ label: "Hot Batter", emoji: "🔥", className: "reason-hot" });
  if (/split is favorable|favorable split|batter split/i.test(text)) reasons.push({ label: "Great Split", emoji: "⚾", className: "reason-split" });
  if (/pitcher allows|allowed traffic|high batting average|weak pitcher/i.test(text)) reasons.push({ label: "Pitcher Edge", emoji: "🎯", className: "reason-edge" });
  if (/expected plate|lineup|plate appearance|leadoff/i.test(text)) reasons.push({ label: "PA Edge", emoji: "👀", className: "reason-pa" });
  if (/risk|tougher|strong, adding risk/i.test(text)) reasons.push({ label: "Risk Note", emoji: "⚠️", className: "reason-risk" });

  if (!reasons.length) {
    reasons.push(row?.confidence_bucket === "high"
      ? { label: "ML Edge", emoji: "🧠", className: "reason-edge" }
      : { label: "Model Read", emoji: "📈", className: "reason-read" });
  }

  return reasons;
}

function renderWhyPills(row) {
  const reasons = v3ReasonLabels(row);
  const primary = reasons[0];
  const remaining = reasons.length - 1;

  return `
    <span class="primary-why-wrap">
      <span class="why-pill primary-why-pill ${primary.className || ""}">
        <span class="why-emoji">${primary.emoji || ""}</span>
        <span>${primary.label}</span>
      </span>
      ${remaining > 0 ? `<span class="reason-count">+${remaining}</span>` : ""}
    </span>
  `;
}

function renderModelStatusPanel() {
  const metrics = v3ModelRegistry?.metrics || {};
  return `
    <section class="model-status-panel">
      <div>
        <div class="mini-label">Current Model</div>
        <strong>${v3ModelRegistry?.model_name || "ML Prediction"}</strong>
        <span>${modelStatusText()}</span>
      </div>
      <div>
        <div class="mini-label">Validation</div>
        <strong>${metrics.top_10_hit_rate != null ? fmtRate(metrics.top_10_hit_rate) : "—"}</strong>
        <span>Top 10 hit rate</span>
      </div>
      <div>
        <div class="mini-label">Top 20</div>
        <strong>${metrics.top_20_hit_rate != null ? fmtRate(metrics.top_20_hit_rate) : "—"}</strong>
        <span>Validation hit rate</span>
      </div>
      <div>
        <div class="mini-label">Actuals</div>
        <strong>${v3ActualsStatus?.actual_loaded_rows ? fmtNum(v3ActualsStatus.actual_loaded_rows) : "0"}</strong>
        <span>${actualsStatusText()}</span>
      </div>
    </section>
  `;
}

async function loadMlbTargetPitcherSplits(pitcherId) {
  if (!pitcherId) {
    mlbTargetPitcherSplits = {};
    return;
  }

  try {
    const { data, error } = await client
      .from("mlb_pitcher_splits")
      .select("split_value, batting_average_against, innings_pitched, at_bats_against")
      .eq("pitcher_id", pitcherId)
      .eq("season", 2026)
      .eq("split_type", "batter_hand")
      .in("split_value", ["LHB", "RHB"]);

    if (error) throw error;

    mlbTargetPitcherSplits = {};
    (data || []).forEach((row) => {
      mlbTargetPitcherSplits[row.split_value] = row;
    });
  } catch (err) {
    console.error("Error loading MLB target pitcher splits:", err);
    mlbTargetPitcherSplits = {};
  }
}


async function loadBoardOddsRows() {
  try {
    const { data, error } = await client
      .from("v_mlb_hit_over05_market_edges")
      .select("prediction_run_date,game_date,game_pk,player_id,batter_name,team_id,american_odds,book_name,line,outcome_name,odds_last_update,fetched_at,odds_stale")
      .order("edge_rank", { ascending: true })
      .limit(500);

    if (error) throw error;
    boardOddsRows = data || [];
  } catch (err) {
    console.error("Error loading board odds:", err);
    boardOddsRows = [];
  }

  return boardOddsRows;
}

function boardOddsForRow(row) {
  if (!row) return null;
  const playerId = String(row.player_id ?? "");
  const gamePk = String(row.game_pk ?? "");
  const predictionDate = String(row.prediction_run_date || row.game_date || "");

  return (boardOddsRows || []).find((odds) =>
    String(odds.player_id ?? "") === playerId &&
    (
      (gamePk && String(odds.game_pk ?? "") === gamePk) ||
      (predictionDate && String(odds.prediction_run_date || odds.game_date || "") === predictionDate)
    )
  ) || (boardOddsRows || []).find((odds) => String(odds.player_id ?? "") === playerId) || null;
}

function shortBookName(bookName) {
  const book = String(bookName || "").toLowerCase();
  if (book.includes("draft")) return "DK";
  if (book.includes("fanduel")) return "FD";
  if (book.includes("betmgm")) return "MGM";
  if (book.includes("caesars")) return "CZR";
  if (book.includes("365")) return "Bet365";
  return bookName ? String(bookName).slice(0, 8) : "";
}

function renderBoardOddsCell(row) {
  const odds = boardOddsForRow(row);
  if (!odds || odds.american_odds === null || odds.american_odds === undefined) {
    return `<td class="num board-odds-cell"><span class="board-odds-missing">—</span></td>`;
  }

  const updated = odds.odds_last_update || odds.fetched_at;
  const details = [
    odds.book_name || "Sportsbook",
    `${odds.outcome_name || "Over"} ${odds.line ?? 0.5} hits`,
    updated ? `Updated ${formatEasternGameTime(updated)}` : "",
    odds.odds_stale ? "Stale odds" : ""
  ].filter(Boolean).join(" · ");

  return `
    <td class="num board-odds-cell" title="${escapeHtml(details)}">
      <span class="board-odds-stack">
        <span class="board-odds-value">${escapeHtml(formatAmericanOdds(odds.american_odds))}</span>
        <span class="board-odds-book">${escapeHtml(shortBookName(odds.book_name))}</span>
      </span>
    </td>
  `;
}

function formatAmericanOdds(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n > 0 ? `+${n}` : String(n);
}

function fmtPercentValue(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(digits)}%`;
}

function marketEdgeClass(edgePct) {
  const n = Number(edgePct || 0);
  if (n >= 10) return "edge-strong";
  if (n >= 5) return "edge-playable";
  if (n >= 2) return "edge-thin";
  return "edge-none";
}

function marketEdgeStars(confidence) {
  const x = String(confidence || "").toLowerCase();
  if (x.includes("high")) return "★★★★★";
  if (x.includes("medium") || x.includes("med")) return "★★★★☆";
  return "★★★☆☆";
}

function marketOddsLabel(row) {
  const book = String(row?.book_name || "").toLowerCase();
  const label = book.includes("draft") ? "DK" : book.includes("365") ? "Bet365" : (row?.book_name || "Book");
  return `${formatAmericanOdds(row?.american_odds)} ${label}`;
}

function marketOddsUpdatedLabel(row) {
  const value = row?.odds_last_update || row?.fetched_at;
  return value ? formatEasternGameTime(value) : "";
}

function marketPrimaryReason(row) {
  const reasons = typeof v3ReasonLabels === "function" ? v3ReasonLabels(row) : [{ label: "Model edge", emoji: "⭐" }];
  const primary = reasons[0] || { label: "Model edge", emoji: "⭐" };
  return `${primary.emoji || "⭐"} ${primary.label}`;
}

function isQualifiedMarketEdge(row) {
  const confidence = String(row?.confidence_bucket || "").toLowerCase();
  return (
    Number(row?.edge_pct || 0) >= 5 &&
    Number(row?.predicted_probability || 0) >= 0.6 &&
    (confidence === "medium" || confidence === "high")
  );
}

function qualifiedMarketEdgeRows(rows) {
  return (rows || []).filter(isQualifiedMarketEdge);
}

function marketEdgeActionTier(row) {
  const edge = Number(row?.edge_pct || 0);

  if (isQualifiedMarketEdge(row)) {
    return { label: "Play", className: "market-action-play", dotClass: "market-dot-play" };
  }
  if (edge >= 3) {
    return { label: "Watch", className: "market-action-watch", dotClass: "market-dot-watch" };
  }
  if (edge >= 1) {
    return { label: "Fair", className: "market-action-fair", dotClass: "market-dot-fair" };
  }
  return { label: "Efficient", className: "market-action-efficient", dotClass: "market-dot-efficient" };
}

function renderMarketEdgeTierBadge(row) {
  const tier = marketEdgeActionTier(row);
  return `
    <span class="primary-why-wrap market-action-wrap">
      <span class="why-pill primary-why-pill market-action-pill ${tier.className}" title="${escapeHtml(tier.label)}">
        <span class="market-action-dot ${tier.dotClass}" aria-hidden="true"></span>
        <span>${escapeHtml(tier.label)}</span>
      </span>
    </span>
  `;
}

function renderMarketEdgeValuePill(row) {
  return `
    <span class="primary-why-wrap market-edge-value-wrap">
      <span class="why-pill primary-why-pill market-edge-value-pill ${marketEdgeClass(row?.edge_pct)}">
        ${fmtPercentValue(row?.edge_pct)}
      </span>
    </span>
  `;
}

function ensureMarketEdgeTierStyles() {
  if (document.getElementById("marketEdgeTierStyles")) return;

  const style = document.createElement("style");
  style.id = "marketEdgeTierStyles";
  style.textContent = `
    /* Market Edge table intentionally inherits MLB Hit Board table styles via v3-board-table. */
    .market-edge-table .market-action-wrap {
      display: inline-flex;
      align-items: center;
    }

    .market-edge-table .market-action-pill {
      gap: 8px;
    }

    .market-edge-table .market-edge-value-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      width: 100%;
    }

    .market-edge-table .market-edge-value-pill {
      min-width: 82px;
      justify-content: center;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    /* Restore original Market Edge coloring while retaining MLB table pill sizing. */
    .market-edge-table .market-edge-value-pill.edge-strong,
    .market-edge-table .market-edge-value-pill.edge-playable {
      border-color: rgba(47, 214, 126, .45);
      background: rgba(47, 214, 126, .13);
      color: #bdf7d2;
    }

    .market-edge-table .market-edge-value-pill.edge-thin {
      border-color: rgba(74, 190, 255, .45);
      background: rgba(74, 190, 255, .12);
      color: #c7ecff;
    }

    .market-edge-table .market-edge-value-pill.edge-none {
      border-color: rgba(180, 190, 210, .30);
      background: rgba(180, 190, 210, .10);
      color: #d7deea;
    }

    .market-edge-table .market-action-dot {
      display: inline-block;
      width: 16px;
      height: 16px;
      min-width: 16px;
      border-radius: 999px;
      box-sizing: border-box;
    }

    .market-edge-table .market-action-play {
      border-color: rgba(47, 214, 126, .45);
      background: rgba(47, 214, 126, .13);
      color: #bdf7d2;
    }
    .market-edge-table .market-dot-play {
      background: linear-gradient(180deg, #39ff68, #0fb84f);
      box-shadow: 0 0 10px rgba(47, 214, 126, .45);
    }

    .market-edge-table .market-action-watch {
      border-color: rgba(74, 190, 255, .45);
      background: rgba(74, 190, 255, .12);
      color: #c7ecff;
    }
    .market-edge-table .market-dot-watch {
      background: linear-gradient(180deg, #54b9ff, #126de6);
      box-shadow: 0 0 10px rgba(74, 190, 255, .35);
    }

    .market-edge-table .market-action-fair {
      border-color: rgba(180, 190, 210, .30);
      background: rgba(180, 190, 210, .10);
      color: #d7deea;
    }
    .market-edge-table .market-dot-fair {
      background: linear-gradient(180deg, #ffffff, #c7ceda);
      box-shadow: 0 0 8px rgba(255,255,255,.25);
    }

    .market-edge-table .market-action-efficient {
      border-color: rgba(120, 130, 150, .25);
      background: rgba(120, 130, 150, .08);
      color: #aab3c5;
    }
    .market-edge-table .market-dot-efficient {
      background: linear-gradient(180deg, #303030, #050505);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.18);
    }

    .qualified-market-edge-row {
      box-shadow: inset 3px 0 0 rgba(47, 214, 126, .65);
    }
  `;
  document.head.appendChild(style);
}

function marketEdgeSummaryText(rows) {
  if (!rows.length) return "No hit prop market rows are available yet. Run the odds loader after today's slate opens.";
  const qualified = qualifiedMarketEdgeRows(rows);
  const top = rows[0];
  if (!qualified.length) {
    return `The market is close to the model right now. The largest edge is ${top?.batter_name || "—"} at ${fmtPercentValue(top?.edge_pct)}, below the qualified threshold.`;
  }
  const oddsTime = marketOddsUpdatedLabel(qualified[0]);
  const timeNote = oddsTime ? ` Odds from ${oddsTime}.` : "";
  return `${qualified.length} qualified opportunities are live. ${qualified[0].batter_name} has the strongest edge at ${fmtPercentValue(qualified[0].edge_pct)}.${timeNote}`;
}

async function loadMarketEdgeData() {
  setHtml("marketEdgeContent", `
    <section class="performance-note">
      <strong>Loading Market Edge...</strong>
      <span>Comparing V3 probabilities to hit prop market prices.</span>
    </section>
  `);

  const [edgesSettled, healthSettled] = await Promise.allSettled([
    client
      .from("v_mlb_hit_over05_market_edges")
      .select(MARKET_EDGE_SELECT)
      .order("edge_rank", { ascending: true })
      .limit(250),
    client
      .from("v_mlb_hit_over05_market_edge_health")
      .select(MARKET_EDGE_HEALTH_SELECT)
      .maybeSingle()
  ]);

  const warnings = [];

  if (edgesSettled.status === "fulfilled") {
    const edgesResult = edgesSettled.value;
    if (edgesResult.error) {
      console.error("Error loading Market Edge rows:", edgesResult.error);
      warnings.push(`Market rows: ${edgesResult.error.message || edgesResult.error}`);
    } else {
      marketEdgeRows = edgesResult.data || [];
    }
  } else {
    console.error("Error loading Market Edge rows:", edgesSettled.reason);
    warnings.push(`Market rows: ${edgesSettled.reason?.message || edgesSettled.reason}`);
  }

  if (healthSettled.status === "fulfilled") {
    const healthResult = healthSettled.value;
    if (healthResult.error) {
      console.error("Error loading Market Edge health:", healthResult.error);
      warnings.push(`Health summary: ${healthResult.error.message || healthResult.error}`);
    } else {
      marketEdgeHealth = healthResult.data || null;
    }
  } else {
    console.error("Error loading Market Edge health:", healthSettled.reason);
    warnings.push(`Health summary: ${healthSettled.reason?.message || healthSettled.reason}`);
  }

  const warningError = warnings.length
    ? new Error(`Some Market Edge data could not be refreshed. ${warnings.join(" · ")}`)
    : null;

  renderMarketEdgePage(warningError);
}

function marketEdgeCacheFreshnessLabel() {
  const refreshedAt = marketEdgeHealth?.latest_cache_refresh_at;
  const cacheDate = marketEdgeHealth?.latest_cache_prediction_date;

  if (!refreshedAt && !cacheDate) return "Cache status unavailable";

  const refreshedLabel = refreshedAt
    ? `Cache refreshed ${formatEasternGameTime(refreshedAt)}`
    : "Cache refresh time unavailable";

  return cacheDate
    ? `${refreshedLabel} · slate ${formatGameDate(cacheDate)}`
    : refreshedLabel;
}

function renderMarketEdgeCards(rows) {
  const qualified = qualifiedMarketEdgeRows(rows);
  const top = rows[0] || null;
  const avgEdge = rows.length ? rows.reduce((sum, row) => sum + Number(row.edge_pct || 0), 0) / rows.length : null;
  const topHigh = rows.find((row) => String(row.confidence_bucket || "").toLowerCase().includes("high")) || top;
  return `
    <section class="market-hero-grid">
      <article class="insight-card primary-insight market-primary-card">
        <div class="card-topline">
          <span>Best Opportunity</span>
          <span>${top?.book_name || "Market"}</span>
        </div>
        <div class="hero-player">${top?.batter_name || "No edge yet"}</div>
        <div class="hero-score ${marketEdgeClass(top?.edge_pct)}">${top ? fmtPercentValue(top.edge_pct) : "—"} edge</div>
        <p>${marketEdgeSummaryText(rows)}</p>
      </article>

      <article class="insight-card compact">
        <div class="metric-icon">⭐</div>
        <div class="metric-label">Qualified</div>
        <div class="metric-value">${fmtNum(qualified.length)}</div>
        <div class="metric-sub">Model ≥ 60% · edge ≥ 5% · Med/High</div>
      </article>

      <article class="insight-card compact">
        <div class="metric-icon">📈</div>
        <div class="metric-label">Average Edge</div>
        <div class="metric-value">${avgEdge !== null ? fmtPercentValue(avgEdge) : "—"}</div>
        <div class="metric-sub">Across ${fmtNum(rows.length)} matched props</div>
      </article>

      <article class="insight-card compact">
        <div class="metric-icon">🕒</div>
        <div class="metric-label">Odds Updated</div>
        <div class="metric-value">${marketEdgeHealth?.latest_odds_fetch_at ? formatEasternGameTime(marketEdgeHealth.latest_odds_fetch_at) : "—"}</div>
        <div class="metric-sub">${topHigh?.book_name ? `Best book: ${topHigh.book_name}` : "Waiting for odds"} · ${marketEdgeCacheFreshnessLabel()}</div>
      </article>
    </section>
  `;
}

function renderMarketEdgeRows(rows) {
  if (!rows.length) {
    return `<tr><td colspan="10" class="empty-state">No market edges loaded yet. Run the hit prop odds workflow after market prices are available.</td></tr>`;
  }

  return rows.map((row, index) => `
    <tr class="clickable-row market-edge-row ${isQualifiedMarketEdge(row) ? "qualified-market-edge-row" : ""}" data-market-player-id="${row.player_id}">
      <td class="rank"><span class="rank-badge ${index < 5 ? "rank-featured" : ""}">${index + 1}</span></td>
      <td>
        <div class="player-cell">
          <div class="avatar">${initials(row.batter_name)}</div>
          <div>
            <div class="player-name">${row.batter_name || "—"}</div>
            <div class="player-sub">${row.team_name || "—"} · ${row.game_time_utc ? formatEasternGameTime(row.game_time_utc) : formatGameDate(row.game_date)}</div>
          </div>
        </div>
      </td>
      <td class="num">${renderMarketEdgeValuePill(row)}</td>
      <td>${renderMarketEdgeTierBadge(row)}</td>
      <td class="num">${fmtProbabilityPct(row)}</td>
      <td class="num">${fmtPercentValue(row.market_implied_probability_pct)}</td>
      <td
        class="num market-best-odds-cell"
        title="${escapeHtml([
          row.book_name || "Sportsbook",
          marketOddsUpdatedLabel(row) ? `Updated ${marketOddsUpdatedLabel(row)}` : ""
        ].filter(Boolean).join(" · "))}"
      >
        <span class="board-odds-stack">
          <span class="board-odds-value">${escapeHtml(formatAmericanOdds(row.american_odds))}</span>
          <span class="board-odds-book">${escapeHtml(shortBookName(row.book_name) || "—")}</span>
        </span>
      </td>
      <td><span class="confidence-stars" title="${titleCase(row.confidence_bucket || "")}">${marketEdgeStars(row.confidence_bucket)}</span></td>
      <td>${marketPrimaryReason(row)}</td>
      <td>
        <div class="player-name">${row.pitcher_name || "TBD"}</div>
        <div class="player-sub">${row.pitcher_team_name || "—"}</div>
      </td>
    </tr>
  `).join("");
}

function renderMarketEdgePage(error = null) {
  ensureMarketEdgeTierStyles();
  const content = $("marketEdgeContent");
  if (!content) return;
  const rows = marketEdgeRows.slice().sort((a, b) => Number(a.edge_rank || 9999) - Number(b.edge_rank || 9999));
  const qualified = qualifiedMarketEdgeRows(rows);
  const tableRows = rows.slice(0, 25);
  const watchRows = rows.filter((row) => !isQualifiedMarketEdge(row) && Number(row.edge_pct || 0) >= 3);
  const showingLabel = `${Math.min(rows.length, 25)} biggest edges · ${qualified.length} qualified · ${watchRows.length} watch`;

  content.innerHTML = `
    ${renderMarketEdgeCards(rows)}

    <section class="control-deck market-control-deck">
      <div class="control-group grow">
        <div class="control-label">Market</div>
        <div class="sort-pill">Hits Over 0.5</div>
      </div>
      <div class="control-group">
        <div class="control-label">Display</div>
        <div class="sort-pill">${showingLabel}</div>
      </div>
      <div class="control-group">
        <div class="control-label">Sort</div>
        <div class="sort-pill">Edge ↓</div>
      </div>
    </section>

    ${error ? `<section class="performance-note"><strong>Market Edge refresh warning.</strong><span>${escapeHtml(error.message || error)} Existing cached rows remain available when possible.</span></section>` : ""}

    <section class="daily-summary-card market-summary-card">
      <div>
        <div class="eyebrow">Market Read</div>
        <h2>${qualified.length ? "Actionable model edges found" : "Market is mostly aligned with V3"}</h2>
        <p>${marketEdgeSummaryText(rows)}</p>
      </div>
      <div class="summary-metrics">
        <span>${fmtNum(marketEdgeHealth?.raw_odds_rows)} raw odds</span>
        <span>${fmtNum(marketEdgeHealth?.resolved_odds_rows)} matched</span>
        <span>${fmtNum(marketEdgeHealth?.unmatched_odds_rows)} unmatched</span>
      </div>
    </section>

    <section class="board-card market-edge-card">
      <div class="board-header">
        <div>
          <div class="eyebrow">Model vs Market</div>
          <h2>Top 25 Hit Prop Market Edges</h2>
        </div>
        <div class="board-meta">
          <span>${fmtNum(rows.length)} matched props</span>
          <span>${marketEdgeHealth?.latest_odds_fetch_at ? `Odds ${formatEasternGameTime(marketEdgeHealth.latest_odds_fetch_at)}` : "Odds pending"} · ${marketEdgeCacheFreshnessLabel()}</span>
        </div>
      </div>

      <div class="table-wrap">
        <table class="v3-board-table market-edge-table">
          <thead>
            <tr>
              <th class="rank">#</th>
              <th>Player</th>
              <th class="num">Edge</th>
              <th>Action</th>
              <th class="num">Model</th>
              <th class="num">Market</th>
              <th class="num">Best Odds</th>
              <th>Confidence</th>
              <th>Why</th>
              <th>Opponent SP</th>
            </tr>
          </thead>
          <tbody>${renderMarketEdgeRows(tableRows)}</tbody>
        </table>
      </div>
    </section>

    <section class="performance-note market-disclaimer">
      <strong>Market Edge is informational.</strong>
      <span>It compares your V3 probability to market-implied probability. It does not guarantee outcomes and should be monitored against live performance.</span>
    </section>
  `;
}

async function openMarketEdgeDrawer(playerId) {
  const marketRow = marketEdgeRows.find((x) => String(x.player_id) === String(playerId));
  if (!marketRow) return;

  let drawerRow = marketRow;

  try {
    const { data: detailRow, error } = await client
      .from("v_mlb_v3_hit_board_cache")
      .select("*")
      .eq("prediction_run_date", marketRow.prediction_run_date)
      .eq("player_id", marketRow.player_id)
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (detailRow) {
      drawerRow = { ...detailRow, ...marketRow };
    }
  } catch (err) {
    console.error("Error loading Market Edge drawer details:", err);
  }

  openV3MlbDrawer(normalizeV3HitRow(drawerRow));

  const body = document.querySelector(".drawer-body");
  if (!body) return;
  const marketSection = document.createElement("section");
  marketSection.className = "drawer-section v3-section market-drawer-section";
  marketSection.innerHTML = `
    <div class="drawer-section-title">Market Edge</div>
    <div class="market-gap-card">
      <div>
        <span>Model</span>
        <strong>${fmtProbabilityPct(marketRow)}</strong>
      </div>
      <div>
        <span>Market</span>
        <strong>${fmtPercentValue(marketRow.market_implied_probability_pct)}</strong>
      </div>
      <div>
        <span>Edge</span>
        <strong class="${marketEdgeClass(marketRow.edge_pct)}">${fmtPercentValue(marketRow.edge_pct)}</strong>
      </div>
    </div>
    <div class="v3-drawer-grid">
      ${v3Metric("Best odds", formatAmericanOdds(marketRow.american_odds), marketRow.book_name || "Book")}
      ${v3Metric("Market", `${marketRow.outcome_name || "Over"} ${marketRow.line || 0.5} hits`, marketRow.market_player_name || marketRow.batter_name || "")}
      ${v3Metric("Price updated", marketRow.odds_last_update ? formatEasternGameTime(marketRow.odds_last_update) : formatEasternGameTime(marketRow.fetched_at), marketRow.odds_stale ? "Stale" : "Fresh")}
      ${v3Metric("Edge tier", marketRow.edge_tier || "No Edge", "Model minus market")}
    </div>
  `;
  body.insertBefore(marketSection, body.children[1] || null);
}

async function loadMlbHitBoardData() {
  try {
    const [
      v3Result,
      registryResult,
      actualsResult,
      performanceResult,
      v2Rows,
      boardOdds
    ] = await Promise.all([
      client
        .from("v_mlb_v3_hit_board_cache")
        .select("*")
        .order("rank_overall", { ascending: true }),

      client
        .from("v_mlb_ml_v3_model_registry")
        .select("*")
        .eq("target_name", "hit_1plus")
        .order("trained_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      client
        .from("v_mlb_ml_v3_actuals_load_status")
        .select("*")
        .eq("target_name", "hit_1plus")
        .order("prediction_run_date", { ascending: false })
        .limit(1)
        .maybeSingle(),

      client
        .from("v_mlb_ml_v3_backtest_performance")
        .select("*")
        .eq("target_name", "hit_1plus")
        .order("prediction_run_date", { ascending: false })
        .limit(10),

      loadV2Enhancements(),
      loadBoardOddsRows()
    ]);

    if (v3Result.error) throw v3Result.error;
    if (registryResult.error) throw registryResult.error;
    if (actualsResult.error) throw actualsResult.error;
    if (performanceResult.error) throw performanceResult.error;

    v3ModelRegistry = registryResult.data || null;
    v3ActualsStatus = actualsResult.data || null;
    v3PerformanceRows = performanceResult.data || [];

    const rawV3Rows = (v3Result.data || [])
      .filter((row) => row.batter_name || row.full_name);

    const baseRows = rawV3Rows
      .map(normalizeV3HitRow)
      .sort((a, b) => Number(a.rank_overall || 9999) - Number(b.rank_overall || 9999));

    const rowsMissingDrivers = baseRows.filter((row) =>
      !Array.isArray(row.drawer_top_positive_drivers) ||
      !Array.isArray(row.drawer_top_risk_factors)
    ).length;
    console.info("V3 unified drawer contract", {
      boardRows: baseRows.length,
      rowsMissingDrivers,
      build: "v3-serving-cache-v1"
    });

    mlbV2EnhancementRows = v2Rows || [];
    mlbRows = withMlbConsensusRanks(mergeV2Enhancements(baseRows, mlbV2EnhancementRows));

    const targetPitcher = mlbBestTargetPitcher();
    await loadMlbTargetPitcherSplits(targetPitcher?.pitcher_id);

    renderMlbHitBoardPage();
  } catch (err) {
    console.error("Error loading V3 MLB Hit Board:", err);

    // Fallback keeps the V3 page available with reduced matchup data if the serving cache is unavailable.
    try {
      const [matchupResult, v2Rows] = await Promise.all([
        client.rpc("get_today_mlb_batter_matchups", {
          p_last_n: mlbWindow
        }),
        loadV2Enhancements()
      ]);

      if (matchupResult.error) throw matchupResult.error;

      const baseRows = (matchupResult.data || []).filter((row) => {
        const name = String(row.full_name || "");
        return name && !name.startsWith("Unknown Player") && !/^Player\s+\d+$/i.test(name);
      });

      mlbV2EnhancementRows = v2Rows || [];
      mlbRows = mergeV2Enhancements(baseRows, mlbV2EnhancementRows);
      renderMlbHitBoardPage(err);
    } catch (fallbackErr) {
      console.error("Error loading fallback MLB Hit Board:", fallbackErr);
      mlbRows = [];
      renderMlbHitBoardPage(fallbackErr);
    }
  }
}

function renderMlbPredictionModeControls() {
  return `
    <section class="control-deck performance-window-deck v3-control-deck unified-board-controls mlb-scope-controls">
      <div class="control-group compact-model-group">
        <div class="board-model-badge" aria-label="Active prediction model">
          <span class="board-model-icon">⭐</span>
          <span class="board-model-copy">
            <small>Active Model</small>
            <strong>V3 ML</strong>
          </span>
          <span class="board-model-status">Live</span>
        </div>
      </div>

      <div class="control-group grow mlb-scope-group">
        <div class="control-label">Scope</div>
        <div class="sort-pill board-scope-pill">All MLB hitters · ranked by V3 hit probability</div>
      </div>
    </section>
  `;
}
function mlbBestTargetPitcher() {
  const groups = new Map();

  mlbRows.forEach((row) => {
    if (!row.pitcher_id) return;

    const key = String(row.pitcher_id);
    const current = groups.get(key) || {
      pitcher_id: row.pitcher_id,
      pitcher_name: row.pitcher_name,
      pitcher_team_name: row.pitcher_team_name || row.pitching_team_name,
      pitcher_throws: row.pitcher_throws,
      pitcher_last5_whip: Number(row.pitcher_last5_whip || 0),
      pitcher_last5_era: Number(row.pitcher_last5_era || 0),
      pitcher_baa_max: Number(row.pitcher_baa_split || 0),
      pitcher_baa_lhb: null,
      pitcher_baa_rhb: null,
      game_date: row.game_date,
      game_time_utc: row.game_time_utc,
      venue_name: row.venue_name,
      hitters: []
    };

    current.pitcher_last5_whip = Math.max(current.pitcher_last5_whip || 0, Number(row.pitcher_last5_whip || 0));
    current.pitcher_last5_era = Math.max(current.pitcher_last5_era || 0, Number(row.pitcher_last5_era || 0));
    current.pitcher_baa_max = Math.max(current.pitcher_baa_max || 0, Number(row.pitcher_baa_split || 0));

    if (String(row.pitcher_split_label || "").includes("LHB") && row.pitcher_baa_split) {
      current.pitcher_baa_lhb = Math.max(Number(current.pitcher_baa_lhb || 0), Number(row.pitcher_baa_split || 0));
    }

    if (String(row.pitcher_split_label || "").includes("RHB") && row.pitcher_baa_split) {
      current.pitcher_baa_rhb = Math.max(Number(current.pitcher_baa_rhb || 0), Number(row.pitcher_baa_split || 0));
    }

    current.hitters.push(row);
    groups.set(key, current);
  });

  const pitchers = [...groups.values()]
    .filter((pitcher) => pitcher.hitters.length >= 3)
    .sort((a, b) => {
      const whipDelta = Number(b.pitcher_last5_whip || 0) - Number(a.pitcher_last5_whip || 0);
      if (whipDelta !== 0) return whipDelta;

      const baaDelta = Number(b.pitcher_baa_max || 0) - Number(a.pitcher_baa_max || 0);
      if (baaDelta !== 0) return baaDelta;

      return Number(b.pitcher_last5_era || 0) - Number(a.pitcher_last5_era || 0);
    });

  const best = pitchers[0] || null;
  if (!best) return null;

  best.hitters = best.hitters
    .slice()
    .sort((a, b) => Number(b.matchup_score || 0) - Number(a.matchup_score || 0))
    .slice(0, 5);

  best.facing_team_name = best.hitters[0]?.team_name || "Opponent hitters";

  return best;
}


function targetPitcherSplitAvg(splitValue, fallbackValue = null) {
  const direct = mlbTargetPitcherSplits?.[splitValue]?.batting_average_against;
  const directNumber = Number(direct);

  if (Number.isFinite(directNumber) && directNumber > 0) {
    return directNumber;
  }

  const fallbackNumber = Number(fallbackValue);
  if (Number.isFinite(fallbackNumber) && fallbackNumber > 0) {
    return fallbackNumber;
  }

  return null;
}

function fmtTargetPitcherSplit(splitValue, fallbackValue = null) {
  const value = targetPitcherSplitAvg(splitValue, fallbackValue);
  return value ? fmtAvg(value) : "—";
}

function renderMlbHitBoardPage(error = null) {
  const content = $("mlbHitBoardContent");
  if (!content) return;

  const rows = mlbRows
    .slice()
    .sort((a, b) => Number(a.rank_overall || 9999) - Number(b.rank_overall || 9999));

  const top25 = rows.slice(0, 25);
  const topPick = rows[0] || null;
  const bestPitcher = mlbBestTargetPitcher();
  const bestPitcherHitters = bestPitcher?.hitters || [];
  const top10Avg = top25.slice(0, 10).length
    ? top25.slice(0, 10).reduce((sum, row) => sum + Number(row.hit_probability_pct || row.matchup_score || 0), 0) / top25.slice(0, 10).length
    : null;

  content.innerHTML = `
    ${renderMlbPredictionModeControls()}

    ${error ? `
      <section class="performance-note">
        <strong>V3 board fallback note.</strong>
        <span>${error.message || error}</span>
      </section>
    ` : ""}

    ${renderMlbTodaysOutlookCard(rows, top25)}

    <section class="matchup-hero">
      <div class="matchup-header">
        <div>
          <div class="eyebrow">🎯 Pitcher Stack</div>
          <h2>${bestPitcher?.pitcher_name || "Loading target pitcher..."}</h2>
          <p class="matchup-subtitle">
            ${
              bestPitcher
                ? `${bestPitcher.pitcher_team_name || "Pitching team"} · Facing ${bestPitcher.facing_team_name || "opponent hitters"} · ${bestPitcher.game_date ? formatGameDate(bestPitcher.game_date) : "Today"}${bestPitcher.pitcher_throws ? ` · ${bestPitcher.pitcher_throws}HP` : ""}`
                : "Finding the starter with the strongest cluster of ML hitter plays..."
            }
          </p>
        </div>

        <div class="matchup-score-pill">
          ML Stack Signal
        </div>
      </div>

      <div class="matchup-grid">
        <article class="matchup-stat-card">
          <div class="label">Target Starter</div>
          <div class="value">${bestPitcher?.pitcher_name || "—"}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">Throws</div>
          <div class="value">${bestPitcher?.pitcher_throws ? `${bestPitcher.pitcher_throws}HP` : "—"}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">Last 5 ERA</div>
          <div class="value">${bestPitcher?.pitcher_last5_era ? fmtDecimal(bestPitcher.pitcher_last5_era, 2) : "—"}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">Last 5 WHIP</div>
          <div class="value">${bestPitcher?.pitcher_last5_whip ? fmtDecimal(bestPitcher.pitcher_last5_whip, 2) : "—"}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">BAA vs LHB</div>
          <div class="value">${fmtTargetPitcherSplit("LHB", bestPitcher?.pitcher_baa_lhb)}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">BAA vs RHB</div>
          <div class="value">${fmtTargetPitcherSplit("RHB", bestPitcher?.pitcher_baa_rhb)}</div>
        </article>
      </div>
    </section>

    <section class="click-note mlb-hit-board-tip">
      <div>
        <strong>Tip:</strong> Click any player to open a concise matchup summary along with recent form, splits, and opposing pitcher context.
      </div>
      <span>The summary is generated from the strongest model signals and the primary risk, when one is present.</span>
    </section>

    <section class="board-card">
      <div class="board-header">
        <div>
          <div class="eyebrow">All MLB Leaderboard</div>
          <h2>Top 25 Hit Probabilities Today</h2>
        </div>

        <div class="board-meta">
          <span>${fmtNum(rows.length)} scored hitters</span>
          <span>${modelStatusText()}</span>
        </div>
      </div>

      <div class="table-wrap">
        <table class="v3-board-table">
          <thead>
            <tr>
              <th class="rank">#</th>
              <th>Player</th>
              <th>Team</th>
              <th class="num">Hit Probability</th>
              <th class="num">Best Odds</th>
              <th>Confidence</th>
              <th>Why</th>
              <th>Opponent SP</th>
              <th>Game</th>
            </tr>
          </thead>
          <tbody>
            ${top25.length ? top25.map((row, index) => `
              <tr class="clickable-row mlb-clickable-row" data-mlb-player-id="${row.player_id}">
                <td class="rank"><span class="rank-badge">${row.rank_overall || index + 1}</span></td>
                <td>
                  <div class="player-cell">
                    <div class="avatar ${String(row.batter_bats || "R").toLowerCase()}">${handednessBadge({ bats: row.batter_bats })}</div>
                    <div>
                      <div class="player-name">${row.batter_name || row.full_name}</div>
                      <div class="player-sub">${row.expected_plate_appearances ? `${fmtDecimal(row.expected_plate_appearances, 1)} expected PA · ` : ""}click for model detail</div>
                    </div>
                  </div>
                </td>
                <td>${row.team_name || "—"}</td>
                <td class="num">
                  <div class="score-bar-wrap probability-cell">
                    <div class="score-bar"><div class="score-bar-fill" style="width:${Math.min(100, Number(row.hit_probability_pct || row.matchup_score || 0))}%"></div></div>
                    <span class="score-value">${fmtProbabilityPct(row)}</span>
                  </div>
                </td>
                ${renderBoardOddsCell(row)}
                <td><span class="confidence-badge ${v3ConfidenceClass(row.confidence_bucket)}">${row.confidence_bucket || "model"}</span></td>
                <td class="why-cell">${renderWhyPills(row)}</td>
                <td>
                  <div class="player-name">${row.pitcher_name || "TBD"}</div>
                  <div class="player-sub">${row.pitcher_team_name || "—"} · ${row.pitcher_throws || "—"}HP</div>
                </td>
                <td>${row.game_date ? formatGameDate(row.game_date) : "—"}</td>
              </tr>
            `).join("") : `<tr><td colspan="9" class="empty-state">Loading V3 ML hit probabilities...</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>

  `;
}

function showView(viewName) {
  const performanceView = $("performanceView");
  const mlbView = $("mlbView");
  const marketEdgeView = $("marketEdgeView");

  if (performanceView) performanceView.classList.toggle("active-view", viewName === "performance");
  if (mlbView) mlbView.classList.toggle("active-view", viewName === "mlb");
  if (marketEdgeView) marketEdgeView.classList.toggle("active-view", viewName === "market");

  document.querySelectorAll(".nav-item").forEach((button) => {
    const target = button.dataset.view || "";
    button.classList.toggle("active", target === viewName);
  });

if (viewName === "market") {
    setText("pageEyebrow", "Model vs Market · Hit Prop Edge");
    setText("pageTitle", "Market Edge");
    setText("pageSubtitle", "Today's biggest differences between the V3 hit model and the Hits Over 0.5 market.");

    if (!marketEdgeRows.length) {
      loadMarketEdgeData();
    } else {
      renderMarketEdgePage();
    }
  }

  if (viewName === "performance") {
    setText("pageEyebrow", "Model Tracking · Prediction Results");
    setText("pageTitle", "Model Performance");
    setText("pageSubtitle", "Compare model performance across multiple ranking windows.");

    if (!performanceSummary && !topPickPerformance && !componentAnalysis && !yesterdayTopPick && !rankAnalysisRows.length) {
      loadPerformanceData();
    } else {
      renderPerformancePage();
    }
  }

if (viewName === "mlb") {
    setText("pageEyebrow", "All MLB · Daily Matchup Intelligence");
    setText("pageTitle", "MLB Hit Board");
    setText("pageSubtitle", "Top hitters across MLB by V3 machine-learning hit probability.");

    if (!mlbRows.length) {
      loadMlbHitBoardData();
    } else {
      renderMlbHitBoardPage();
    }
  }
}

function wireEvents() {
  const drawerBody = document.querySelector(".drawer-body");
  if (drawerBody && !initialDrawerBodyHtml) {
    initialDrawerBodyHtml = drawerBody.innerHTML;
  }
  $("sidebarToggle")?.addEventListener("click", toggleSidebar);

  document.querySelectorAll(".nav-item[data-view]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.classList.contains("disabled")) return;

      showView(button.dataset.view);

      if (button.dataset.view === "performance") {
        await loadPerformanceData();
      }

      if (button.dataset.view === "market") {
        await loadMarketEdgeData();
      }

if (button.dataset.view === "mlb") {
        await loadMlbHitBoardData();
      }

});
  });


  $("refreshButton")?.addEventListener("click", () => {
    const activeView = document.querySelector(".view.active-view")?.id;
    if (activeView === "mlbView") {
      loadMlbHitBoardData();
    } else if (activeView === "marketEdgeView") {
      loadMarketEdgeData();
    } else if (activeView === "performanceView") {
      loadPerformanceData();
    } else {
      loadMlbHitBoardData();
    }
  });
  $("drawerClose")?.addEventListener("click", closeDrawer);
  $("drawerBackdrop")?.addEventListener("click", closeDrawer);

  document.addEventListener("click", async (event) => {

    const consensusButton = event.target.closest("[data-consensus-player-id]");
    if (consensusButton) {
      event.preventDefault();
      event.stopPropagation();
      focusMlbBoardPlayer(consensusButton.dataset.consensusPlayerId);
      return;
    }

    const row = event.target.closest(".clickable-row");
    if (!row) return;


    if (row.dataset.marketPlayerId) {
      openMarketEdgeDrawer(row.dataset.marketPlayerId);
      return;
    }

    if (row.dataset.mlbPlayerId) {
      openMlbDrawer(row.dataset.mlbPlayerId);
      return;
    }

  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
  });
}


/* =========================================================
   Model Performance Redesign v2 - database-backed fix
   ========================================================= */

const MODEL_PERFORMANCE_FIX_VERSION = "model-performance-redesign-v8-last14-baseline-source-fix";
console.info(`MLB Hit Lab Model Performance loaded: ${MODEL_PERFORMANCE_FIX_VERSION}`);

const PERFORMANCE_MODEL_FILTERS = ["All", "V1", "V2", "V3"];
const PERFORMANCE_SCORECARD_WINDOWS = ["Season", "Last 30", "Last 14", "Last 7"];
let performanceSelectedModel = "All";
let performanceSelectedTime = "Season";
let modelPerformanceData = {
  scorecard: { rows: [], sourceView: "v_mlb_app_model_scorecard", error: null },
  rolling: { rows: [], sourceView: "v_mlb_app_rolling_model_performance", error: null },
  buckets: { rows: [], sourceView: "v_mlb_app_model_score_buckets", error: null },
  bucketOptimizer: { rows: [], sourceView: "optimized top25 score bands from model prediction tables", error: null },
  features: { rows: [], sourceView: "v_mlb_app_feature_signals", error: null }
};

function mpEscape(value) {
  return escapeHtml(value ?? "");
}

function mpField(row, names, fallback = null) {
  for (const name of names) {
    if (row && row[name] !== undefined && row[name] !== null) return row[name];
  }
  return fallback;
}

function mpModel(row) {
  const raw = String(mpField(row, ["model_key", "model", "model_name", "model_version", "version"], "")).toLowerCase();
  if (raw.includes("v3") || raw.includes("ml")) return "V3";
  if (raw.includes("v2") || raw.includes("recommended") || raw.includes("proxy")) return "V2";
  if (raw.includes("v1") || raw.includes("classic")) return "V1";
  return "—";
}

function mpModelLabel(model) {
  if (model === "V1") return "V1 Classic";
  if (model === "V2") return "V2 Recommended";
  if (model === "V3") return "V3 ML";
  return model || "—";
}

function mpNormalizeWindowLabel(value, row = {}) {
  const rangeKey = String(mpField(row, ["range_key"], "")).toLowerCase().trim();

  // Scorecard range_key is the strongest source of truth because V3's `days`
  // field represents evaluated sample days, not the selected lookback window.
  if (rangeKey === "season") return "Season";
  if (rangeKey === "last30") return "Last 30";
  if (rangeKey === "last14") return "Last 14";
  if (rangeKey === "last7") return "Last 7";

  const raw = String(
    value ||
    mpField(row, ["range_label", "window_label", "time_window", "period", "lookback_label"], "")
  ).trim();
  const lower = raw.toLowerCase();

  if (lower === "season" || lower.includes("season")) return "Season";
  if (lower === "last30" || lower.includes("last 30")) return "Last 30";
  if (lower === "last14" || lower.includes("last 14")) return "Last 14";
  if (lower === "last7" || lower.includes("last 7")) return "Last 7";

  // Rolling rows use window_days. Never use `days` or `days_in_window` to
  // identify a scorecard window; those are sample-size fields for V3.
  const windowDays = Number(mpField(row, ["window_days", "lookback_days"], NaN));
  if (windowDays === 9999) return "Season";
  if (windowDays === 30) return "Last 30";
  if (windowDays === 14) return "Last 14";
  if (windowDays === 7) return "Last 7";

  return raw ? raw.replace(/\s+Days$/i, "") : "Season";
}

function mpRateValue(row, names) {
  const value = mpField(row, names);
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mpRateDisplay(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  const pct = n <= 1 ? n * 100 : n;
  return `${pct.toFixed(digits)}%`;
}

function mpInt(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString();
}

function mpSourceLabel(source) {
  if (!source?.sourceView) return "No source view returned rows";
  const freshness = source.refreshedAt ? ` · refreshed ${new Date(source.refreshedAt).toLocaleString()}` : "";
  return `${mpInt(source.rows.length)} rows · ${source.sourceView}${freshness}`;
}

function mpUniqueRowsByModel(rows) {
  const byModel = new Map();

  (rows || []).forEach((row) => {
    const model = mpModel(row);
    if (!["V1", "V2", "V3"].includes(model)) return;

    // Keep the first exact-window row for each model. The page cache is expected
    // to have exactly one model row per window; this guard prevents duplicates
    // from ever rendering if a malformed or stale payload is encountered.
    if (!byModel.has(model)) byModel.set(model, row);
  });

  return ["V1", "V2", "V3"]
    .map((model) => byModel.get(model))
    .filter(Boolean);
}

function mpFilteredScorecardRows() {
  const modelMatches = (row) =>
    performanceSelectedModel === "All" || mpModel(row) === performanceSelectedModel;
  const windowMatches = (row) =>
    mpNormalizeWindowLabel(null, row) === performanceSelectedTime;

  const scorecardRows = mpUniqueRowsByModel(
    (modelPerformanceData.scorecard.rows || [])
      .filter((row) => modelMatches(row) && windowMatches(row))
  );

  // Fill only missing models from rolling data. This is deliberately per-model
  // rather than all-or-nothing so Last 7/Last 14 cannot lose V3 simply because
  // V1/V2 already exist in the scorecard payload.
  const presentModels = new Set(scorecardRows.map((row) => mpModel(row)));
  const rollingFallbackRows = mpUniqueRowsByModel(
    (modelPerformanceData.rolling.rows || [])
      .filter((row) =>
        modelMatches(row) &&
        windowMatches(row) &&
        !presentModels.has(mpModel(row))
      )
  ).map((row) => ({
    ...row,
    range_key:
      performanceSelectedTime === "Season" ? "season" :
      performanceSelectedTime === "Last 30" ? "last30" :
      performanceSelectedTime === "Last 14" ? "last14" :
      "last7",
    range_label: performanceSelectedTime,
    overall_hit_rate_pct: row.overall_hit_rate_pct ?? null,
    _scorecard_fallback_source: "rolling"
  }));

  return mpUniqueRowsByModel([...scorecardRows, ...rollingFallbackRows]);
}

async function mpReadView(viewName, options = {}) {
  let query = client.from(viewName).select("*");
  if (options.eq) {
    for (const [key, value] of Object.entries(options.eq)) query = query.eq(key, value);
  }
  if (options.order) {
    for (const order of options.order) query = query.order(order.column, { ascending: order.ascending !== false });
  }
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function loadModelPerformanceData() {
  const content = $("performanceContent");
  if (content) {
    content.innerHTML = `
      <section class="performance-note">
        <strong>Loading MLB Model Performance...</strong>
        <span>Reading the fast model performance page cache from Supabase.</span>
      </section>
    `;
  }

  const sections = ["scorecard", "rolling", "buckets", "bucket_optimizer", "features"];

  try {
    const { data, error } = await client
      .from("mlb_model_performance_page_cache")
      .select("section, source_view, payload, refreshed_at")
      .in("section", sections);

    if (error) throw error;

    const cacheBySection = new Map((data || []).map((row) => [row.section, row]));
    const fallbackViews = {
      scorecard: "v_mlb_app_model_scorecard",
      rolling: "v_mlb_app_rolling_model_performance",
      buckets: "v_mlb_app_model_score_buckets",
      bucket_optimizer: "optimized top25 score bands from model prediction tables",
      features: "v_mlb_app_feature_signals"
    };

    sections.forEach((section) => {
      const cacheRow = cacheBySection.get(section);
      const payload = Array.isArray(cacheRow?.payload) ? cacheRow.payload : [];
      const dataKey = section === "bucket_optimizer" ? "bucketOptimizer" : section;
      modelPerformanceData[dataKey] = {
        rows: payload,
        sourceView: cacheRow?.source_view || fallbackViews[section],
        refreshedAt: cacheRow?.refreshed_at || null,
        error: payload.length ? null : "Cache row was empty. Refresh mlb_model_performance_page_cache."
      };
    });
  } catch (err) {
    console.error("Error loading model performance page cache:", err);

    sections.forEach((section) => {
      const dataKey = section === "bucket_optimizer" ? "bucketOptimizer" : section;
      modelPerformanceData[dataKey] = {
        rows: [],
        sourceView: "mlb_model_performance_page_cache",
        refreshedAt: null,
        error: err?.message || String(err)
      };
    });
  }

  // V3 feature importance must come from the dedicated live view. The broader
  // app view also contains V1/V2 rows and the page cache can remain stale with
  // the seven legacy metrics. Pull V3 independently, normalize it to the common
  // feature-row shape, and merge it with cached V1/V2 rows.
  try {
    const liveV3Rows = await mpReadView("v_mlb_v3_model_feature_importance", {
      order: [{ column: "feature_order", ascending: true }]
    });

    if (!liveV3Rows.length) {
      throw new Error("The live V3 feature-importance view returned zero rows.");
    }

    const cachedLegacyRows = (modelPerformanceData.features.rows || []).filter((row) => mpModel(row) !== "V3");
    const normalizedV3Rows = liveV3Rows.map((row) => ({
      model_key: "v3_ml",
      model_name: "V3 ML",
      feature_order: row.feature_order,
      feature_name: row.feature_name,
      feature_group: row.feature_group,
      signal_value: row.importance_pct,
      importance_value: row.importance_value,
      signed_effect: row.signed_effect,
      signal_method: row.signal_method,
      sample_rows: row.sample_rows,
      model_run_id: row.model_run_id,
      model_version: row.model_version,
      created_at: row.created_at
    }));

    modelPerformanceData.features = {
      rows: [...cachedLegacyRows, ...normalizedV3Rows],
      sourceView: "v_mlb_v3_model_feature_importance · live",
      refreshedAt: new Date().toISOString(),
      error: null
    };

    console.info("Loaded live V3 feature importance", {
      rows: normalizedV3Rows.length,
      modelRunId: normalizedV3Rows[0]?.model_run_id,
      modelVersion: normalizedV3Rows[0]?.model_version,
      topFeature: normalizedV3Rows[0]?.feature_name
    });
  } catch (featureErr) {
    console.error("Live V3 feature importance failed; stale cache rejected:", featureErr);
    modelPerformanceData.features = {
      rows: (modelPerformanceData.features.rows || []).filter((row) => mpModel(row) !== "V3"),
      sourceView: "v_mlb_v3_model_feature_importance · unavailable",
      refreshedAt: null,
      error: featureErr?.message || String(featureErr)
    };
  }

  renderPerformancePage();
  runModelPerformanceSelfTest();
}

function loadPerformanceData() {
  return loadModelPerformanceData();
}

function mpRenderModelSelector() {
  return `
    <section class="control-deck model-performance-control-deck">
      <div class="control-group">
        <div class="control-label">Model Detail Selector</div>
        <div class="segmented" id="performanceModelButtons">
          ${PERFORMANCE_MODEL_FILTERS.map((model) => `
            <button class="segment ${performanceSelectedModel === model ? "active" : ""}" data-performance-model="${model}" type="button">${model}</button>
          `).join("")}
        </div>
      </div>

      <div class="control-group">
        <div class="control-label">Scorecard Window</div>
        <div class="segmented" id="performanceTimeButtons">
          ${PERFORMANCE_SCORECARD_WINDOWS.map((windowLabel) => `
            <button class="segment ${performanceSelectedTime === windowLabel ? "active" : ""}" data-performance-time="${windowLabel}" type="button">${windowLabel}</button>
          `).join("")}
        </div>
      </div>

      <div class="control-group grow">
        <div class="control-label">Toggle Strategy</div>
        <div class="sort-pill">Scorecard and Signals use the selector. Stability compares all models. Optimizer requires one model.</div>
      </div>
    </section>
  `;
}

function mpRenderSourceGrid() {
  const items = [
    ["Scorecard", modelPerformanceData.scorecard],
    ["Rolling", modelPerformanceData.rolling],
    ["Optimizer", modelPerformanceData.bucketOptimizer],
    ["Signals", modelPerformanceData.features]
  ];
  return `
    <section class="performance-source-grid">
      ${items.map(([label, source]) => `
        <div class="performance-source-card ${source.rows.length ? "ok" : "warn"}">
          <span>${label}</span>
          <strong>${source.rows.length ? "Connected" : "Fallback / Empty"}</strong>
          <small>${mpEscape(source.error || mpSourceLabel(source))}</small>
        </div>
      `).join("")}
    </section>
  `;
}

const MP_SCORECARD_METRICS = [
  {
    key: "topPick",
    label: "Top Pick",
    fieldNames: ["top1_hit_rate_pct", "top_1_hit_rate", "top_pick_hit_rate"],
    confidence: "Highest confidence"
  },
  {
    key: "top5",
    label: "Top 5",
    fieldNames: ["top5_hit_rate_pct", "top_5_hit_rate", "top5_hit_rate"],
    confidence: "High confidence"
  },
  {
    key: "top10",
    label: "Top 10",
    fieldNames: ["top10_hit_rate_pct", "top_10_hit_rate", "top10_hit_rate"],
    confidence: "Balanced"
  },
  {
    key: "top20",
    label: "Top 20",
    fieldNames: ["top20_hit_rate_pct", "top_20_hit_rate", "top20_hit_rate"],
    confidence: "Larger sample"
  },
  {
    key: "top25",
    label: "Top 25",
    fieldNames: ["top25_hit_rate_pct", "top_25_hit_rate", "top25_hit_rate"],
    confidence: "Largest pick set"
  }
];

function mpScorecardRowsForSelectedWindow() {
  return mpFilteredScorecardRows()
    .slice()
    .sort((a, b) => {
      const order = ["V1", "V2", "V3"];
      return order.indexOf(mpModel(a)) - order.indexOf(mpModel(b));
    });
}

function mpScorecardMetricValue(row, metric) {
  return mpRateValue(row, metric.fieldNames);
}

function mpScorecardBaselineValue(row) {
  // The scorecard cache now supplies a weighted overall baseline for every
  // supported window, including Last 14. Keep one authoritative data path.
  return mpRateValue(row, ["overall_hit_rate_pct", "overall_hit_rate", "hit_rate_pct", "hit_rate"]);
}

function mpScorecardBestModels(rows, metric) {
  const values = rows
    .map((row) => ({ model: mpModel(row), value: mpScorecardMetricValue(row, metric) }))
    .filter((item) => Number.isFinite(item.value));

  if (!values.length) return new Set();

  const maxValue = Math.max(...values.map((item) => item.value));
  return new Set(values.filter((item) => item.value === maxValue).map((item) => item.model));
}

function mpScorecardDays(row) {
  const value = mpField(row, ["days", "days_in_window", "prediction_days"], null);
  const n = Number(value);
  if (!Number.isFinite(n)) return null;

  // Defensive guard: a stale/malformed cache must never display a sample-day
  // count larger than the selected scorecard lookback. Season is uncapped.
  const windowLabel = mpNormalizeWindowLabel(null, row);
  const maxDays =
    windowLabel === "Last 7" ? 7 :
    windowLabel === "Last 14" ? 14 :
    windowLabel === "Last 30" ? 30 :
    null;

  return maxDays === null ? n : Math.min(n, maxDays);
}

function mpScorecardSampleNote(row, metric, isBest) {
  // The selected scorecard window already communicates sample length.
  // Do not add redundant V3 calendar-day warning badges.
  if (isBest) {
    return `<span class="scorecard-best">Best</span>`;
  }

  return "";
}

function mpScorecardLiftText(value, baseline) {
  if (!Number.isFinite(value) || !Number.isFinite(baseline)) return "";
  const lift = value - baseline;
  const sign = lift > 0 ? "+" : "";
  return `${sign}${lift.toFixed(1)} pts vs baseline`;
}

function mpRenderScorecardMetricCell(row, metric, bestModels) {
  const value = mpScorecardMetricValue(row, metric);
  const baseline = mpScorecardBaselineValue(row);
  const model = mpModel(row);
  const isBest = bestModels.has(model);
  const sampleNote = mpScorecardSampleNote(row, metric, isBest);
  const liftText = mpScorecardLiftText(value, baseline);

  return `
    <td class="num scorecard-metric-cell ${isBest ? "scorecard-metric-best" : ""}">
      <div class="scorecard-rate-line">
        <strong>${mpRateDisplay(value)}</strong>
        ${sampleNote}
      </div>
      ${liftText ? `<div class="scorecard-lift">${mpEscape(liftText)}</div>` : ""}
    </td>
  `;
}

function mpRenderScorecardRows() {
  const rows = mpScorecardRowsForSelectedWindow();

  if (!rows.length) {
    return `<tr><td colspan="7" class="empty-state">No scorecard rows for ${mpEscape(performanceSelectedModel)} · ${mpEscape(performanceSelectedTime)}.</td></tr>`;
  }

  const bestByMetric = new Map(
    MP_SCORECARD_METRICS.map((metric) => [metric.key, mpScorecardBestModels(rows, metric)])
  );

  return rows.map((row) => {
    const baseline = mpScorecardBaselineValue(row);
    const days = mpScorecardDays(row);
    const model = mpModel(row);

    return `
      <tr class="scorecard-model-row">
        <td class="scorecard-model-cell">
          <strong>${mpEscape(mpModelLabel(model))}</strong>
          ${days !== null ? `<span>${fmtNum(days)} evaluated days</span>` : ""}
        </td>
        ${MP_SCORECARD_METRICS.map((metric) => mpRenderScorecardMetricCell(row, metric, bestByMetric.get(metric.key))).join("")}
        <td class="num scorecard-baseline-cell">
          <strong>${mpRateDisplay(baseline)}</strong>
          <span>All scored hitters</span>
        </td>
      </tr>
    `;
  }).join("");
}

function mpRenderScorecardHeaderCells() {
  return MP_SCORECARD_METRICS.map((metric) => `
    <th class="num scorecard-bucket-heading">
      ${metric.label}
      <span>${metric.confidence}</span>
    </th>
  `).join("");
}

function mpSelectedScorecardSmallSampleNote() {
  // Last 7/14 are intentionally short windows; no redundant sample warning.
  return "";
}


function mpWinnerClass(rows, metricNames, model) {
  const values = rows
    .map((row) => ({ model: mpModel(row), value: mpRateValue(row, metricNames) }))
    .filter((item) => Number.isFinite(item.value));
  if (!values.length) return "";
  const maxValue = Math.max(...values.map((item) => item.value));
  return values.some((item) => item.model === model && item.value === maxValue) ? " performance-winner" : "";
}

function mpRowsForRollingWindow(windowLabel) {
  return (modelPerformanceData.rolling.rows || []).filter((row) => mpNormalizeWindowLabel(null, row) === windowLabel);
}

function mpRenderRollingRows() {
  const windows = ["Last 7", "Last 14", "Last 30", "Season"];
  const modelOrder = ["V1", "V2", "V3"];
  if (!modelPerformanceData.rolling.rows.length) {
    return `<tr><td colspan="10" class="empty-state">No rolling performance rows returned from the database yet.</td></tr>`;
  }

  return windows.map((windowLabel) => {
    const rows = mpRowsForRollingWindow(windowLabel);
    const byModel = new Map(rows.map((row) => [mpModel(row), row]));
    return `
      <tr>
        <td><strong>${windowLabel}</strong></td>
        ${modelOrder.map((model) => `<td class="num${mpWinnerClass(rows, ["top1_hit_rate_pct", "top_1_hit_rate", "top_pick_hit_rate"], model)}">${mpRateDisplay(mpRateValue(byModel.get(model), ["top1_hit_rate_pct", "top_1_hit_rate", "top_pick_hit_rate"]), 0)}</td>`).join("")}
        ${modelOrder.map((model) => `<td class="num${mpWinnerClass(rows, ["top5_hit_rate_pct", "top_5_hit_rate", "top5_hit_rate"], model)}">${mpRateDisplay(mpRateValue(byModel.get(model), ["top5_hit_rate_pct", "top_5_hit_rate", "top5_hit_rate"]), 0)}</td>`).join("")}
        ${modelOrder.map((model) => `<td class="num${mpWinnerClass(rows, ["top10_hit_rate_pct", "top_10_hit_rate", "top10_hit_rate"], model)}">${mpRateDisplay(mpRateValue(byModel.get(model), ["top10_hit_rate_pct", "top_10_hit_rate", "top10_hit_rate"]), 0)}</td>`).join("")}
      </tr>
    `;
  }).join("");
}


const MP_STABILITY_WINDOWS = ["Season", "Last 30", "Last 14", "Last 7"];
const MP_STABILITY_METRICS = [
  { label: "Top Pick", fields: ["top1_hit_rate_pct", "top_1_hit_rate", "top_pick_hit_rate"] },
  { label: "Top 5", fields: ["top5_hit_rate_pct", "top_5_hit_rate", "top5_hit_rate"] },
  { label: "Top 10", fields: ["top10_hit_rate_pct", "top_10_hit_rate", "top10_hit_rate"] }
];

function mpRollingRowsForModel(model) {
  return (modelPerformanceData.rolling.rows || [])
    .filter((row) => mpModel(row) === model);
}

function mpRollingRowForModelWindow(model, windowLabel) {
  return mpRollingRowsForModel(model)
    .find((row) => mpNormalizeWindowLabel(null, row) === windowLabel) || null;
}

function mpRollingMetricValue(model, windowLabel, metric) {
  return mpRateValue(mpRollingRowForModelWindow(model, windowLabel), metric.fields);
}

function mpRollingDays(model, windowLabel) {
  const row = mpRollingRowForModelWindow(model, windowLabel);
  const days = Number(mpField(row, ["days_in_window", "days"], NaN));
  return Number.isFinite(days) ? days : null;
}

function mpStabilityStatus(model) {
  const topPickMetric = MP_STABILITY_METRICS[0];
  const season = mpRollingMetricValue(model, "Season", topPickMetric);
  const last7 = mpRollingMetricValue(model, "Last 7", topPickMetric);
  const days = MP_STABILITY_WINDOWS
    .map((windowLabel) => mpRollingDays(model, windowLabel))
    .filter((value) => Number.isFinite(value));
  const minDays = days.length ? Math.min(...days) : null;

  if (model === "V3" && minDays !== null && minDays < 10) {
    return { label: "Small sample", className: "warning", detail: `${minDays} evaluated days` };
  }

  if (Number.isFinite(season) && Number.isFinite(last7)) {
    const delta = last7 - season;
    if (delta >= 5) return { label: "Improving", className: "positive", detail: `+${delta.toFixed(1)} pts vs season` };
    if (delta <= -5) return { label: "Cooling", className: "caution", detail: `${delta.toFixed(1)} pts vs season` };
    return { label: "Stable", className: "neutral", detail: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} pts vs season` };
  }

  return { label: "Watching", className: "neutral", detail: "Need more rows" };
}

function mpRenderStabilityMetricRow(model, metric) {
  return `
    <tr>
      <td><strong>${mpEscape(metric.label)}</strong></td>
      ${MP_STABILITY_WINDOWS.map((windowLabel) => `
        <td class="num">${mpRateDisplay(mpRollingMetricValue(model, windowLabel, metric), 0)}</td>
      `).join("")}
    </tr>
  `;
}

function mpRenderModelStabilityCard(model) {
  const status = mpStabilityStatus(model);
  const seasonDays = mpRollingDays(model, "Season");
  const last7Days = mpRollingDays(model, "Last 7");

  return `
    <article class="model-stability-card">
      <div class="model-stability-card-header">
        <div>
          <h3>${mpEscape(mpModelLabel(model))}</h3>
          <span>${seasonDays !== null ? `${fmtNum(seasonDays)} season days` : "Rolling cache"}</span>
        </div>
        <div class="model-stability-status ${status.className}">
          <strong>${mpEscape(status.label)}</strong>
          <span>${mpEscape(status.detail)}</span>
        </div>
      </div>

      <div class="model-stability-table-wrap">
        <table class="performance-table model-stability-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th class="num">Season</th>
              <th class="num">30</th>
              <th class="num">14</th>
              <th class="num">7</th>
            </tr>
          </thead>
          <tbody>
            ${MP_STABILITY_METRICS.map((metric) => mpRenderStabilityMetricRow(model, metric)).join("")}
          </tbody>
        </table>
      </div>

      ${model === "V3" && last7Days !== null && last7Days < 10 ? `<div class="model-stability-note">⚠ V3 is directionally useful, but the rolling trend is still based on a small evaluated sample.</div>` : ""}
    </article>
  `;
}

function mpRenderModelStabilitySection() {
  if (!modelPerformanceData.rolling.rows.length) {
    return `
      <section class="board-card performance-card model-stability-section">
        <div class="board-header">
          <div>
            <div class="eyebrow">Model Stability</div>
            <h2>Consistency Across Time Windows</h2>
          </div>
        </div>
        <div class="empty-state">No rolling performance rows returned from the database yet.</div>
      </section>
    `;
  }

  return `
    <section class="board-card performance-card model-stability-section">
      <div class="board-header">
        <div>
          <div class="eyebrow">Model Stability</div>
          <h2>Consistency Across Time Windows</h2>
          <p class="scorecard-card-subtitle">Tracks whether each model's top-bucket performance is stable, improving, or still too early to trust.</p>
        </div>
        <div class="board-meta">
          <span>Always compares all models</span>
          <span>${mpEscape(mpSourceLabel(modelPerformanceData.rolling))}</span>
        </div>
      </div>

      <div class="model-stability-grid">
        ${["V1", "V2", "V3"].map((model) => mpRenderModelStabilityCard(model)).join("")}
      </div>
    </section>
  `;
}

function mpSelectedOptimizerModel() {
  return performanceSelectedModel === "All" ? null : performanceSelectedModel;
}

function mpBucketOptimizerRowsForModel(model) {
  return (modelPerformanceData.bucketOptimizer.rows || [])
    .filter((row) => mpModel(row) === model)
    .slice()
    .sort((a, b) => Number(mpField(a, ["bucket_order"], 999)) - Number(mpField(b, ["bucket_order"], 999)));
}

function mpBucketOptimizerFocusRows(model) {
  const rows = mpBucketOptimizerRowsForModel(model);
  if (model === "V1") return rows.filter((row) => mpField(row, ["score_range"]) !== "<65");
  if (model === "V3") return rows.filter((row) => mpField(row, ["score_range"]) !== "<65");
  return rows;
}

function mpBucketOptimizerBestRow(rows) {
  const scored = rows
    .filter((row) => !mpField(row, ["pending_actuals"], false))
    .map((row) => ({ row, rate: mpRateValue(row, ["hit_rate_pct"]) }))
    .filter((item) => Number.isFinite(item.rate) && Number(mpField(item.row, ["sample_size"], 0)) >= 10);

  if (!scored.length) return null;

  return scored.sort((a, b) => b.rate - a.rate)[0].row;
}

function mpBucketOptimizerFocusText(model, rows) {
  const label = mpModelLabel(model);
  const best = mpBucketOptimizerBestRow(rows);
  const totalRows = mpBucketOptimizerRowsForModel(model);
  const totalSample = totalRows.reduce((sum, row) => sum + Number(mpField(row, ["sample_size"], 0) || 0), 0);

  if (model === "V2") {
    const ranges = rows.map((row) => `${mpField(row, ["score_range"])} n=${mpInt(mpField(row, ["sample_size"]))}`).join(" · ");
    return `${label}'s current Top 25 clusters between 75.5 and 82.0. Actuals are pending in the live V2 table, so use this as score-distribution guidance for now. ${ranges}`;
  }

  if (!best) {
    return `${label} has ${mpInt(totalSample)} Top 25 evaluated rows, but no stable optimized bucket has enough sample yet.`;
  }

  return `${label}'s strongest optimized bucket is ${mpField(best, ["bucket_name"])} (${mpField(best, ["score_range"])}): ${mpRateDisplay(mpRateValue(best, ["hit_rate_pct"]))} hit rate across ${mpInt(mpField(best, ["sample_size"]))} evaluated hitters.`;
}

function mpBucketOptimizerRecommendation(model, rows) {
  if (model === "V1") {
    return "Use V1 as a mature calibration baseline. The signal improves steadily above 70, with 80+ as the strongest premium zone.";
  }

  if (model === "V2") {
    return "Use V2 scorecard performance for confidence until actuals are loaded directly into the V2 prediction table.";
  }

  if (model === "V3") {
    return "Treat V3 as promising but early. The best current signal is 65–70; do not overweight the 75+ bucket yet because the sample is tiny.";
  }

  return "";
}

function mpRenderBucketOptimizerModelPicker() {
  return `
    <section class="bucket-optimizer-empty">
      <div>
        <strong>Select a model to view optimized score buckets.</strong>
        <span>Each model uses its own score distribution, so this card does not support All.</span>
      </div>
      <div class="segmented bucket-optimizer-picker">
        ${["V1", "V2", "V3"].map((model) => `
          <button class="segment" data-bucket-optimizer-model="${model}" type="button">${mpEscape(mpModelLabel(model))}</button>
        `).join("")}
      </div>
    </section>
  `;
}

function mpRenderBucketOptimizerRows(model) {
  const rows = mpBucketOptimizerFocusRows(model);

  if (!rows.length) {
    return `<tr><td colspan="5" class="empty-state">No optimized bucket rows available for ${mpEscape(mpModelLabel(model))}.</td></tr>`;
  }

  return rows.map((row) => {
    const pending = Boolean(mpField(row, ["pending_actuals"], false));
    const sample = mpField(row, ["sample_size"]);
    const hits = mpField(row, ["hits"]);
    const rate = mpRateValue(row, ["hit_rate_pct"]);
    const smallSample = Number(sample || 0) > 0 && Number(sample || 0) < 25;

    return `
      <tr class="bucket-optimizer-row">
        <td class="bucket-name-cell">
          <strong>${mpEscape(mpField(row, ["bucket_name"], "Bucket"))}</strong>
          <span>${mpEscape(mpField(row, ["status"], ""))}</span>
        </td>
        <td>${mpEscape(mpField(row, ["score_range"], "—"))}</td>
        <td class="num bucket-hit-rate ${pending ? "pending" : ""}">
          <strong>${pending ? "Pending" : mpRateDisplay(rate)}</strong>
          ${smallSample && !pending ? `<span class="scorecard-caution">small n</span>` : ""}
        </td>
        <td class="num">
          <strong>${mpInt(sample)}</strong>
          <span class="player-sub">${pending ? "top-25 rows" : `${mpInt(hits)} hits`}</span>
        </td>
        <td>${mpEscape(mpField(row, ["status"], pending ? "Awaiting actuals" : "—"))}</td>
      </tr>
    `;
  }).join("");
}

function mpRenderBucketOptimizerCardBody() {
  const model = mpSelectedOptimizerModel();

  if (!model) {
    return mpRenderBucketOptimizerModelPicker();
  }

  const rows = mpBucketOptimizerFocusRows(model);
  const allRows = mpBucketOptimizerRowsForModel(model);

  return `
    <section class="bucket-focus-zone">
      <div class="mini-label">Focus Zone</div>
      <p>${mpEscape(mpBucketOptimizerFocusText(model, rows))}</p>
    </section>

    <div class="table-wrap">
      <table class="performance-table bucket-optimizer-table">
        <thead>
          <tr>
            <th>Bucket</th>
            <th>Score Range</th>
            <th class="num">Hit Rate</th>
            <th class="num">Sample</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${mpRenderBucketOptimizerRows(model)}</tbody>
      </table>
    </div>

    <section class="bucket-optimizer-recommendation">
      <strong>Recommendation</strong>
      <span>${mpEscape(mpBucketOptimizerRecommendation(model, rows))}</span>
    </section>

    ${allRows.length > rows.length ? `<div class="bucket-lower-note">Lower buckets hidden by default. ${allRows.length - rows.length} lower bucket${allRows.length - rows.length === 1 ? "" : "s"} excluded from the focus view.</div>` : ""}
  `;
}

function mpWireBucketOptimizerButtons() {
  document.querySelectorAll("[data-bucket-optimizer-model]").forEach((button) => {
    button.addEventListener("click", () => {
      performanceSelectedModel = button.dataset.bucketOptimizerModel || "V1";
      renderPerformancePage();
    });
  });
}


function mpFeatureRows() {
  const rows = modelPerformanceData.features.rows || [];
  if (!rows.length) return [];

  const normalizedRows = rows
    .filter((row) => mpField(row, ["feature_name"], null) !== null && mpField(row, ["signal_value"], null) !== null)
    .map((row) => {
      const signal = Number(mpField(row, ["signal_value"], null));
      return {
        model: mpModel(row),
        feature: mpField(row, ["feature_name"], "Feature"),
        featureOrder: Number(mpField(row, ["feature_order"], 999)),
        featureGroup: mpField(row, ["feature_group"], null),
        signal,
        hit: Number(mpField(row, ["hit_avg", "avg_when_hit"], NaN)),
        noHit: Number(mpField(row, ["no_hit_avg", "avg_when_no_hit"], NaN)),
        source: row,
        normalized: true
      };
    })
    .filter((row) => Number.isFinite(row.signal));

  if (normalizedRows.length) {
    return normalizedRows.sort((a, b) => {
      const modelOrder = ["V1", "V2", "V3"].indexOf(a.model) - ["V1", "V2", "V3"].indexOf(b.model);
      if (modelOrder !== 0) return modelOrder;
      return a.featureOrder - b.featureOrder;
    });
  }

  const source = rows?.[0];
  if (!source) return [];
  const components = [
    ["Recent Form", "avg_recent_form_when_hit", "avg_recent_form_when_no_hit"],
    ["Batter Split", "avg_batter_split_when_hit", "avg_batter_split_when_no_hit"],
    ["SP Vulnerability", "avg_pitcher_vuln_when_hit", "avg_pitcher_vuln_when_no_hit"],
    ["Pitcher Recent Form", "avg_pitcher_recent_when_hit", "avg_pitcher_recent_when_no_hit"],
    ["Matchup Score", "avg_matchup_when_hit", "avg_matchup_when_no_hit"]
  ];

  return components.map(([feature, hitKey, noHitKey]) => {
    const hit = Number(source[hitKey]);
    const noHit = Number(source[noHitKey]);
    const signal = Number.isFinite(hit) && Number.isFinite(noHit) ? hit - noHit : null;
    return { model: "V1", feature, signal, hit, noHit, source, normalized: false };
  }).filter((row) => row.signal !== null);
}

const MP_FEATURE_GROUPS = {
  splits: {
    label: "Splits",
    description: "Platoon performance, split quality, and the reliability of those samples."
  },
  recent_form: {
    label: "Recent Form",
    description: "Recent batting average, hit frequency, production, and hot-form indicators."
  },
  pitch_arsenal: {
    label: "Pitch Arsenal",
    description: "How a hitter's contact profile matches the opposing pitcher's expected pitch mix."
  },
  statcast_contact: {
    label: "Statcast Contact",
    description: "Expected contact quality, batted-ball outcomes, and pitcher contact suppression."
  },
  pitcher_form: {
    label: "Pitcher Form",
    description: "The opposing starter's recent results, workload, and run-prevention profile."
  },
  traditional: {
    label: "Traditional Stats",
    description: "Core batting, matchup, lineup, park, and game-context inputs."
  },
  categorical: {
    label: "Handedness & Context",
    description: "Batter side, pitcher hand, and other categorical matchup context."
  },
  availability: {
    label: "Pitch-Arsenal/Contact Data Availability",
    description: "Whether the pitch-arsenal and Statcast contact datasets are available for this matchup."
  }
};

let mpExpandedFeatureGroups = new Set();
let mpShowAllFeatures = false;
let mpFeatureSearch = "";

function mpFeatureGroupKey(featureName) {
  const feature = String(featureName || "").toLowerCase();
  if (["batter_bats", "pitcher_throws"].includes(feature)) return "categorical";
  if (feature.includes("available") || feature.includes("availability") || feature.includes("missing")) return "availability";
  if (feature.startsWith("arsenal_") || feature === "batter_pitch_sample" || feature === "pitcher_pitch_sample") return "pitch_arsenal";
  if (feature.includes("split")) return "splits";
  if (feature.includes("pitcher_last") || feature.includes("pitcher_recent") || feature.includes("pitcher_form") || feature.includes("sp_recent")) return "pitcher_form";
  if (feature.includes("recent") || feature.includes("hot_score") || feature.includes("streak")) return "recent_form";
  if (feature.includes("xba") || feature.includes("xwoba") || feature.includes("exit_velocity") || feature.includes("launch_angle") || feature.includes("barrel") || feature.includes("hard_hit") || feature.includes("contact_bbe") || feature.includes("sweet_spot")) return "statcast_contact";
  return "traditional";
}

function mpHumanizeFeatureName(featureName) {
  const replacements = {
    avg: "AVG",
    xba: "xBA",
    xwoba: "xwOBA",
    woba: "wOBA",
    ops: "OPS",
    iso: "ISO",
    babip: "BABIP",
    bbe: "BBE",
    era: "ERA",
    whip: "WHIP",
    pa: "PA",
    lhp: "LHP",
    rhp: "RHP"
  };

  return String(featureName || "Feature")
    .replace(/^arsenal_weighted_/, "Arsenal-weighted ")
    .replace(/_w(\d+)$/i, " · $1-game window")
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => replacements[word.toLowerCase()] || `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ")
    .replace("Batter ", "Batter ")
    .replace("Pitcher ", "Pitcher ");
}

function mpV3FeatureRows() {
  return mpFeatureRows()
    .filter((row) => row.model === "V3")
    .map((row) => ({
      ...row,
      groupKey: row.featureGroup && MP_FEATURE_GROUPS[String(row.featureGroup).toLowerCase()]
        ? String(row.featureGroup).toLowerCase()
        : mpFeatureGroupKey(row.feature),
      displayName: mpHumanizeFeatureName(row.feature)
    }))
    .sort((a, b) => b.signal - a.signal || a.featureOrder - b.featureOrder);
}

function mpV3FeatureGroups() {
  const grouped = new Map();
  mpV3FeatureRows().forEach((row) => {
    const current = grouped.get(row.groupKey) || { groupKey: row.groupKey, total: 0, rows: [] };
    current.total += row.signal;
    current.rows.push(row);
    grouped.set(row.groupKey, current);
  });
  return [...grouped.values()].sort((a, b) => b.total - a.total);
}

function mpRenderV3GroupCards() {
  const groups = mpV3FeatureGroups();
  if (!groups.length) return `<div class="empty-state">No V3 feature importance rows are available yet.</div>`;
  const maxTotal = Math.max(...groups.map((group) => group.total), 1);

  return `
    <div class="feature-group-grid">
      ${groups.map((group) => {
        const meta = MP_FEATURE_GROUPS[group.groupKey] || MP_FEATURE_GROUPS.traditional;
        const expanded = mpExpandedFeatureGroups.has(group.groupKey);
        const width = Math.max(4, (group.total / maxTotal) * 100);
        return `
          <article class="feature-group-card ${expanded ? "expanded" : ""}">
            <button type="button" class="feature-group-toggle" data-feature-group="${mpEscape(group.groupKey)}" aria-expanded="${expanded}">
              <span class="feature-group-main">
                <span class="feature-group-title-row">
                  <strong>${mpEscape(meta.label)}</strong>
                  <span>${fmtDecimal(group.total, 1)}%</span>
                </span>
                <span class="feature-group-description">${mpEscape(meta.description)}</span>
                <span class="feature-group-track"><span style="width:${width}%"></span></span>
              </span>
              <span class="feature-group-chevron" aria-hidden="true">${expanded ? "−" : "+"}</span>
            </button>
            ${expanded ? `
              <div class="feature-group-details">
                ${group.rows.map((row) => `
                  <div class="feature-detail-row">
                    <span><strong>#${row.featureOrder}</strong> ${mpEscape(row.displayName)}</span>
                    <span>${fmtDecimal(row.signal, 2)}%</span>
                  </div>
                `).join("")}
              </div>
            ` : ""}
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function mpRenderAllV3Features() {
  const allRows = mpV3FeatureRows();
  const query = mpFeatureSearch.trim().toLowerCase();
  const filtered = query
    ? allRows.filter((row) => `${row.feature} ${row.displayName} ${(MP_FEATURE_GROUPS[row.groupKey] || {}).label || ""}`.toLowerCase().includes(query))
    : allRows;
  const visible = mpShowAllFeatures ? filtered : filtered.slice(0, 15);

  return `
    <section class="all-features-panel">
      <div class="all-features-toolbar">
        <div>
          <strong>All model features</strong>
          <span>${mpInt(allRows.length)} metrics ranked by global importance</span>
        </div>
        <label class="feature-search-box">
          <span>⌕</span>
          <input id="featureImportanceSearch" type="search" value="${mpEscape(mpFeatureSearch)}" placeholder="Search features or groups" />
        </label>
      </div>
      <div class="table-wrap">
        <table class="performance-table feature-importance-table">
          <thead>
            <tr>
              <th class="rank">Rank</th>
              <th>Feature</th>
              <th>Group</th>
              <th>Relative importance</th>
              <th class="num">Importance</th>
            </tr>
          </thead>
          <tbody>
            ${visible.length ? visible.map((row) => `
              <tr>
                <td class="rank"><span class="rank-badge">${row.featureOrder}</span></td>
                <td><strong>${mpEscape(row.displayName)}</strong><div class="player-sub">${mpEscape(row.feature)}</div></td>
                <td><span class="feature-group-pill">${mpEscape((MP_FEATURE_GROUPS[row.groupKey] || MP_FEATURE_GROUPS.traditional).label)}</span></td>
                <td><div class="performance-signal-track"><span class="performance-signal-bar" style="width:${Math.max(3, (row.signal / Math.max(allRows[0]?.signal || 1, 1)) * 100)}%"></span></div></td>
                <td class="num"><strong>${fmtDecimal(row.signal, 2)}%</strong></td>
              </tr>
            `).join("") : `<tr><td colspan="5" class="empty-state">No features match “${mpEscape(mpFeatureSearch)}”.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${filtered.length > 15 ? `<button type="button" class="show-all-features-button" id="showAllFeaturesButton">${mpShowAllFeatures ? "Show top 15" : `Show all ${filtered.length} features`}</button>` : ""}
    </section>
  `;
}

function mpFeatureSubtext(row) {
  if (Number.isFinite(row.hit) && Number.isFinite(row.noHit)) {
    return `Hit avg ${fmtDecimal(row.hit, 1)} · No-hit avg ${fmtDecimal(row.noHit, 1)}`;
  }
  if (row.model === "V2" && row.feature.toLowerCase().includes("pa")) {
    return "Positive signal from evaluated V2 proxy feature contribution";
  }
  return "Signal strength from evaluated model rows";
}

function mpRenderLegacyFeatureRows() {
  let rows = mpFeatureRows().filter((row) => row.model !== "V3");
  if (performanceSelectedModel !== "All") rows = rows.filter((row) => row.model === performanceSelectedModel);
  if (!rows.length) return `<tr><td colspan="4" class="empty-state">No component signal rows available for ${mpEscape(performanceSelectedModel)} yet.</td></tr>`;

  const maxAbs = Math.max(...rows.map((row) => Math.abs(row.signal)), 1);
  return rows.map((row) => {
    const width = Math.max(5, Math.round((Math.abs(row.signal) / maxAbs) * 100));
    return `
      <tr>
        <td>${mpEscape(mpModelLabel(row.model))}</td>
        <td><strong>${mpEscape(row.feature)}</strong><div class="player-sub">${mpEscape(mpFeatureSubtext(row))}</div></td>
        <td><div class="performance-signal-track"><span class="performance-signal-bar ${row.signal < 0 ? "negative" : ""}" style="width:${width}%"></span></div></td>
        <td class="num">${row.signal > 0 ? "+" : ""}${fmtDecimal(row.signal, 2)}</td>
      </tr>
    `;
  }).join("");
}

function mpRenderFeatureImportanceSection() {
  const showV3 = performanceSelectedModel === "All" || performanceSelectedModel === "V3";
  const showLegacy = performanceSelectedModel === "V1" || performanceSelectedModel === "V2";
  const v3LoadError = modelPerformanceData.features.error;

  if (showLegacy) {
    return `
      <section class="board-card performance-card">
        <div class="board-header">
          <div><div class="eyebrow">Feature Signals</div><h2>${mpEscape(mpModelLabel(performanceSelectedModel))} Signal Check</h2></div>
          <div class="board-meta"><span>${performanceSelectedModel} only</span><span>${mpEscape(mpSourceLabel(modelPerformanceData.features))}</span></div>
        </div>
        <div class="table-wrap"><table class="performance-table"><thead><tr><th>Model</th><th>Feature</th><th>Signal</th><th class="num">Delta</th></tr></thead><tbody>${mpRenderLegacyFeatureRows()}</tbody></table></div>
      </section>
    `;
  }

  return `
    <section class="board-card performance-card feature-importance-card">
      <div class="board-header feature-importance-header">
        <div>
          <div class="eyebrow">V3 Model Explainability</div>
          <h2>What Drives the Model?</h2>
          <p class="scorecard-card-subtitle">Global feature importance from the latest trained V3 model. Group totals show where the model places its overall attention.</p>
        </div>
        <div class="board-meta"><span>V3 ML</span><span>${mpEscape(mpSourceLabel(modelPerformanceData.features))}</span></div>
      </div>
      <div class="feature-importance-content">
        <div class="feature-importance-intro">
          <strong>Driver groups</strong>
          <span>Open any group to inspect the individual metrics behind it. Percentages across all 110 features total approximately 100%.</span>
        </div>
        ${v3LoadError ? `<div class="feature-load-error"><strong>Live V3 feature importance did not load.</strong><span>${mpEscape(v3LoadError)}</span></div>` : ""}
        ${mpRenderV3GroupCards()}
        ${mpRenderAllV3Features()}
      </div>
    </section>
  `;
}

function mpWireFeatureImportanceControls() {
  document.querySelectorAll("[data-feature-group]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.featureGroup;
      if (mpExpandedFeatureGroups.has(key)) mpExpandedFeatureGroups.delete(key);
      else mpExpandedFeatureGroups.add(key);
      renderPerformancePage();
    });
  });

  const showAllButton = $("showAllFeaturesButton");
  if (showAllButton) {
    showAllButton.addEventListener("click", () => {
      mpShowAllFeatures = !mpShowAllFeatures;
      renderPerformancePage();
    });
  }

  const search = $("featureImportanceSearch");
  if (search) {
    search.addEventListener("input", (event) => {
      mpFeatureSearch = event.target.value;
      mpShowAllFeatures = Boolean(mpFeatureSearch.trim());
      renderPerformancePage();
      const nextSearch = $("featureImportanceSearch");
      if (nextSearch) {
        nextSearch.focus();
        nextSearch.setSelectionRange(nextSearch.value.length, nextSearch.value.length);
      }
    });
  }
}


function renderPerformancePage() {
  const content = $("performanceContent");
  if (!content) return;

  content.innerHTML = `
    <section class="performance-note">
      <strong>Model Performance Redesign</strong>
      <span>Four-card comparison layout using a fast Supabase page cache. Last 14 scorecard uses rolling-cache fallback when needed.</span>
    </section>

    ${mpRenderModelSelector()}
    ${mpRenderSourceGrid()}

    <section class="board-card performance-card scorecard-comparison-card">
      <div class="board-header scorecard-board-header">
        <div>
          <div class="eyebrow">Model Scorecard</div>
          <h2>${mpEscape(performanceSelectedTime)} Model Comparison</h2>
          <p class="scorecard-card-subtitle">Compare model hit rates by confidence bucket. Each cell also shows lift versus the model baseline.</p>
        </div>
        <div class="board-meta">
          <span>${mpEscape(performanceSelectedTime)}</span>
          <span>${mpEscape(mpSourceLabel(modelPerformanceData.scorecard))}</span>
        </div>
      </div>

      <div class="scorecard-confidence-rail">
        <span>Highest confidence</span>
        <div></div>
        <span>Largest sample</span>
      </div>

      <div class="table-wrap">
        <table class="performance-table scorecard-comparison-table">
          <thead>
            <tr>
              <th>Model</th>
              ${mpRenderScorecardHeaderCells()}
              <th class="num scorecard-bucket-heading baseline-heading">
                Baseline
                <span>All scored hitters</span>
              </th>
            </tr>
          </thead>
          <tbody>${mpRenderScorecardRows()}</tbody>
        </table>
      </div>

      ${mpSelectedScorecardSmallSampleNote()}
    </section>

    ${mpRenderModelStabilitySection()}

    <section class="board-card performance-card bucket-optimizer-card">
      <div class="board-header bucket-optimizer-header">
        <div>
          <div class="eyebrow">High-Confidence Calibration</div>
          <h2>Bucket Optimizer</h2>
          <p class="scorecard-card-subtitle">Optimized score bands based on where the selected model's Top 25 scores actually sit.</p>
        </div>
        <div class="board-meta">
          <span>${performanceSelectedModel === "All" ? "Select model" : mpEscape(mpModelLabel(performanceSelectedModel))}</span>
          <span>${mpEscape(mpSourceLabel(modelPerformanceData.bucketOptimizer))}</span>
        </div>
      </div>

      ${mpRenderBucketOptimizerCardBody()}
    </section>

${mpRenderFeatureImportanceSection()}
  `;

  document.querySelectorAll("#performanceModelButtons .segment").forEach((button) => {
    button.addEventListener("click", () => {
      performanceSelectedModel = button.dataset.performanceModel || "All";
      renderPerformancePage();
    });
  });

  document.querySelectorAll("#performanceTimeButtons .segment").forEach((button) => {
    button.addEventListener("click", () => {
      performanceSelectedTime = button.dataset.performanceTime || "Season";
      renderPerformancePage();
    });
  });

  mpWireBucketOptimizerButtons();
  mpWireFeatureImportanceControls();
}

function runModelPerformanceSelfTest() {
  const checks = [
    { card: "Model Scorecard", rows: modelPerformanceData.scorecard.rows.length, source: modelPerformanceData.scorecard.sourceView, expectedMinimumRows: 3 },
    { card: "Model Stability", rows: modelPerformanceData.rolling.rows.length, source: modelPerformanceData.rolling.sourceView, expectedMinimumRows: 9 },
    { card: "Bucket Optimizer", rows: modelPerformanceData.bucketOptimizer.rows.length, source: modelPerformanceData.bucketOptimizer.sourceView, expectedMinimumRows: 6 },
    { card: "Feature Signals", rows: mpFeatureRows().length, source: modelPerformanceData.features.sourceView, expectedMinimumRows: 1 }
  ].map((check) => ({
    ...check,
    domMounted: Boolean($("performanceContent")),
    status: check.rows >= check.expectedMinimumRows && Boolean($("performanceContent")) ? "pass" : "needs-data"
  }));

  console.table(checks);
  window.modelPerformanceSelfTest = checks;
  return checks;
}

window.loadModelPerformanceData = loadModelPerformanceData;
window.runModelPerformanceSelfTest = runModelPerformanceSelfTest;
window.renderPerformancePage = renderPerformancePage;

applySidebarCollapsedState();
wireEvents();
showView("mlb");
loadMlbHitBoardData();


/* ===== Consolidated JS from phase4b.js ===== */
/* =========================================================
   MLB Hit Board — Phase 4B
   Target-aware UX for 1+ Hit, 2+ Total Bases, and Home Run
   Build: phase4b-drawer-profile-sample-fix-20260812d
   ========================================================= */

console.info("MLB Hit Lab Phase 4B loaded: phase4b-drawer-profile-sample-fix-20260812d");

const PHASE4B_TARGETS = {
  hit_1plus: {
    key: "hit_1plus",
    shortLabel: "1+ Hit",
    fullLabel: "1+ Hit",
    probabilityLabel: "Hit Probability",
    boardTitle: "Top 25 Hit Probabilities Today",
    modelLabel: "V3 ML",
    deploymentStatus: "live",
    deploymentLabel: "Live",
    eyebrow: "All MLB · Daily Matchup Intelligence",
    subtitle: "Top hitters across MLB by V3 machine-learning hit probability.",
    matchupEyebrow: "🎯 Pitcher Stack",
    matchupLabel: "ML Stack Signal",
    emptyText: "No hit predictions are available for the current slate."
  },
  total_bases_2plus: {
    key: "total_bases_2plus",
    shortLabel: "2+ TB",
    fullLabel: "2+ Total Bases",
    probabilityLabel: "2+ TB Probability",
    boardTitle: "Top 25 — 2+ Total Bases Today",
    modelLabel: "TB V1 ML",
    deploymentStatus: "shadow",
    deploymentLabel: "Shadow",
    eyebrow: "All MLB · 2+ Total Bases Intelligence",
    subtitle: "Top hitters across MLB by probability of recording 2+ total bases.",
    matchupEyebrow: "💥 Damage Matchup",
    matchupLabel: "Damage Signal",
    emptyText: "No 2+ total bases predictions are available for the current slate."
  },
  home_run_1plus: {
    key: "home_run_1plus",
    shortLabel: "Home Run",
    fullLabel: "Home Run",
    probabilityLabel: "HR Probability",
    boardTitle: "Top 25 Home Run Probabilities Today",
    modelLabel: "HR V1 ML",
    deploymentStatus: "shadow",
    deploymentLabel: "Shadow",
    eyebrow: "All MLB · Home Run Intelligence",
    subtitle: "Top hitters across MLB by machine-learning home run probability.",
    matchupEyebrow: "💣 HR Matchup",
    matchupLabel: "Power Signal",
    emptyText: "No home run predictions are available for the current slate."
  }
};

let selectedMlbPredictionTarget =
  localStorage.getItem("mlbPredictionTarget") in PHASE4B_TARGETS
    ? localStorage.getItem("mlbPredictionTarget")
    : "hit_1plus";

const phase4bTargetCache = new Map();

// V3 Hit uses a richer loader than the two power targets. Preserve the
// completed Hit state in memory so returning from HR/TB can repaint
// immediately instead of repeating the full Supabase request set.
let phase4bHitStateCache = null;
let phase4bHitLoadPromise = null;

function phase4bCloneRows(rows) {
  return Array.isArray(rows) ? rows.slice() : [];
}

function phase4bCloneObject(value) {
  return value && typeof value === "object" ? { ...value } : value;
}

function phase4bSnapshotHitState() {
  if (!Array.isArray(mlbRows) || !mlbRows.length) return null;

  phase4bHitStateCache = {
    rows: phase4bCloneRows(mlbRows),
    v2Enhancements: phase4bCloneRows(mlbV2EnhancementRows),
    pitcherSplits: phase4bCloneObject(mlbTargetPitcherSplits) || {},
    modelRegistry: v3ModelRegistry || null,
    actualsStatus: v3ActualsStatus || null,
    performanceRows: phase4bCloneRows(v3PerformanceRows),
    boardOdds: phase4bCloneRows(boardOddsRows),
    drawerExplanations: phase4bCloneRows(v3DrawerExplanationRows),
    cachedAt: Date.now()
  };

  console.info("Phase 4B Hit state cached", {
    rows: phase4bHitStateCache.rows.length,
    odds: phase4bHitStateCache.boardOdds.length,
    cachedAt: new Date(phase4bHitStateCache.cachedAt).toISOString()
  });

  return phase4bHitStateCache;
}

function phase4bRestoreHitState() {
  const cache = phase4bHitStateCache;
  if (!cache?.rows?.length) return false;

  mlbRows = phase4bCloneRows(cache.rows);
  mlbV2EnhancementRows = phase4bCloneRows(cache.v2Enhancements);
  mlbTargetPitcherSplits = phase4bCloneObject(cache.pitcherSplits) || {};
  v3ModelRegistry = cache.modelRegistry || null;
  v3ActualsStatus = cache.actualsStatus || null;
  v3PerformanceRows = phase4bCloneRows(cache.performanceRows);
  boardOddsRows = phase4bCloneRows(cache.boardOdds);
  v3DrawerExplanationRows = phase4bCloneRows(cache.drawerExplanations);

  return true;
}

function phase4bInvalidateHitState() {
  phase4bHitStateCache = null;
  phase4bHitLoadPromise = null;
}

function phase4bAssignHitGameRanks(rows) {
  const byGame = new Map();

  (rows || []).forEach((row) => {
    const key = String(row.game_pk || "");
    const group = byGame.get(key) || [];
    group.push(row);
    byGame.set(key, group);
  });

  byGame.forEach((group) => {
    group
      .slice()
      .sort((a, b) =>
        Number(b.predicted_probability || 0) - Number(a.predicted_probability || 0) ||
        String(a.batter_name || a.full_name || "").localeCompare(String(b.batter_name || b.full_name || ""))
      )
      .forEach((row, index) => {
        row.rank_game = index + 1;
      });
  });

  return rows;
}

async function phase4bLoadHitServingRows() {
  const { data, error } = await client
    .from("mlb_v3_hit_board_serving_cache")
    .select("*")
    .order("rank_overall", { ascending: true });

  if (error) throw error;

  const rows = (data || [])
    .filter((row) =>
      row.batter_name &&
      row.predicted_probability !== null &&
      row.predicted_probability !== undefined
    )
    .map(normalizeV3HitRow)
    .sort((a, b) => Number(a.rank_overall || 9999) - Number(b.rank_overall || 9999));

  return phase4bAssignHitGameRanks(rows);
}

async function phase4bLoadHitTargetFresh() {
  // Critical path: use the precomputed serving table directly. The older public
  // view performs extra computed drawer/profile work and can hit statement timeout.
  const rows = await phase4bLoadHitServingRows();

  if (!rows.length) {
    throw new Error("V3 Hit serving cache returned no probability rows.");
  }

  mlbRows = rows;

  const top = rows[0] || {};
  v3ModelRegistry = v3ModelRegistry || {
    target_name: "hit_1plus",
    model_name: top.model_name || "V3 ML",
    model_version: top.model_version || null,
    status: top.model_status || "candidate"
  };

  // Paint the board immediately with real V3 probabilities.
  renderMlbHitBoardPage();
  phase4bSnapshotHitState();

  // Secondary context should never block or replace the probability board.
  Promise.allSettled([
    loadV2Enhancements(),
    loadBoardOddsRows()
  ]).then(async ([v2Result, oddsResult]) => {
    if (v2Result.status === "fulfilled") {
      mlbV2EnhancementRows = v2Result.value || [];
      mlbRows = withMlbConsensusRanks(mergeV2Enhancements(mlbRows, mlbV2EnhancementRows));
    }

    if (oddsResult.status === "fulfilled") {
      boardOddsRows = oddsResult.value || boardOddsRows || [];
    }

    const targetPitcher = mlbBestTargetPitcher();
    try {
      await loadMlbTargetPitcherSplits(targetPitcher?.pitcher_id);
    } catch (err) {
      console.warn("Non-blocking Hit pitcher context failed:", err);
    }

    if (phase4bIsHit()) {
      renderMlbHitBoardPage();
    }

    phase4bSnapshotHitState();
  }).catch((err) => {
    console.warn("Non-blocking Hit enrichment failed:", err);
  });

  return rows;
}

async function phase4bLoadHitTarget() {
  if (phase4bRestoreHitState()) {
    renderMlbHitBoardPage();
    return mlbRows;
  }

  if (phase4bHitLoadPromise) {
    return phase4bHitLoadPromise;
  }

  phase4bHitLoadPromise = phase4bLoadHitTargetFresh();

  try {
    return await phase4bHitLoadPromise;
  } catch (err) {
    console.error("Error loading direct V3 Hit serving cache:", err);
    mlbRows = [];
    renderMlbHitBoardPage(err);
    throw err;
  } finally {
    phase4bHitLoadPromise = null;
  }
}

const phase4bOriginal = {
  loadMlbHitBoardData,
  renderMlbHitBoardPage,
  renderMlbPredictionModeControls,
  openMlbDrawer,
  showView
};

function phase4bConfig(target = selectedMlbPredictionTarget) {
  return PHASE4B_TARGETS[target] || PHASE4B_TARGETS.hit_1plus;
}

function phase4bIsHit() {
  return selectedMlbPredictionTarget === "hit_1plus";
}

function phase4bFeature(row, key, fallback = null) {
  const value = row?.features?.[key];
  return value === null || value === undefined ? fallback : value;
}

function phase4bPct(value, digits = 1) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const pct = Math.abs(n) <= 1 ? n * 100 : n;
  return `${pct.toFixed(digits)}%`;
}

function phase4bProbabilityPct(row) {
  const n = Number(row?.probability_pct ?? (
    row?.predicted_probability != null ? Number(row.predicted_probability) * 100 : NaN
  ));
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : "—";
}

function phase4bNumber(value, digits = 2) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

function phase4bTargetStatusBadge(row) {
  const status = String(row?.deployment_status || phase4bConfig().deploymentStatus).toLowerCase();
  const label = status === "live" ? "Live" : "Shadow";
  return `<span class="phase4b-status-badge ${status}">${escapeHtml(label)}</span>`;
}

function phase4bSignalObjects(row) {
  const target = row?.target_name || selectedMlbPredictionTarget;
  const f = row?.features || {};
  const signals = [];

  const push = (condition, label, emoji, detail) => {
    if (condition) signals.push({ label, emoji, detail });
  };

  if (target === "home_run_1plus") {
    push(Number(f.batter_hr_w10) >= 3, "HR Form", "🔥", `${fmtNum(f.batter_hr_w10)} HR over the recent 10-game feature window`);
    push(Number(f.batter_iso_w10) >= 0.25, "ISO Power", "📈", `${phase4bNumber(f.batter_iso_w10, 3)} recent ISO`);
    push(Number(f.batter_barrel_rate_30d) >= 0.10, "Barrel Form", "💥", `${phase4bPct(f.batter_barrel_rate_30d)} 30-day barrel rate`);
    push(Number(f.batter_hard_hit_rate_30d) >= 0.40, "Hard Contact", "⚡", `${phase4bPct(f.batter_hard_hit_rate_30d)} 30-day hard-hit rate`);
    push(Number(f.pitcher_barrel_rate_allowed_30d) >= 0.09, "Barrel Matchup", "🎯", `Pitcher allowing ${phase4bPct(f.pitcher_barrel_rate_allowed_30d)} barrels`);
    push(Number(f.pitcher_hard_hit_rate_allowed_30d) >= 0.35, "Contact Risk", "🎯", `Pitcher allowing ${phase4bPct(f.pitcher_hard_hit_rate_allowed_30d)} hard contact`);
    push(Number(f.park_hr_factor) >= 1.05, "Park Boost", "🏟️", `${phase4bNumber(f.park_hr_factor, 2)} HR park factor`);
  } else if (target === "total_bases_2plus") {
    push(Number(f.batter_tb_w10) >= 20, "Recent Damage", "📈", `${fmtNum(f.batter_tb_w10)} total bases over the recent 10-game feature window`);
    push(Number(f.batter_xbh_w10) >= 5, "XBH Form", "💥", `${fmtNum(f.batter_xbh_w10)} extra-base hits in the recent feature window`);
    push(Number(f.batter_slg_w10) >= 0.55, "SLG Form", "⚾", `${phase4bNumber(f.batter_slg_w10, 3)} recent SLG`);
    push(Number(f.batter_iso_w10) >= 0.22, "ISO Power", "📈", `${phase4bNumber(f.batter_iso_w10, 3)} recent ISO`);
    push(Number(f.batter_hard_hit_rate_30d) >= 0.40, "Hard Contact", "⚡", `${phase4bPct(f.batter_hard_hit_rate_30d)} 30-day hard-hit rate`);
    push(Number(f.pitcher_hard_hit_rate_allowed_30d) >= 0.35, "Contact Risk", "🎯", `Pitcher allowing ${phase4bPct(f.pitcher_hard_hit_rate_allowed_30d)} hard contact`);
    push(Number(f.park_hit_factor) >= 1.03, "Park Boost", "🏟️", `${phase4bNumber(f.park_hit_factor, 2)} hit park factor`);
  }

  if (!signals.length) {
    signals.push({
      label: "Model Edge",
      emoji: "🧠",
      detail: "The model ranking is the primary signal; no contextual feature cleared the display threshold."
    });
  }

  return signals;
}

function phase4bRenderWhyPills(row) {
  if (phase4bIsHit()) return renderWhyPills(row);

  const signals = phase4bSignalObjects(row);
  const primary = signals[0];
  const remaining = signals.length - 1;

  return `
    <span class="primary-why-wrap">
      <span class="why-pill primary-why-pill phase4b-power-pill">
        <span class="why-emoji">${primary.emoji}</span>
        <span>${escapeHtml(primary.label)}</span>
      </span>
      ${remaining > 0 ? `<span class="reason-count">+${remaining}</span>` : ""}
    </span>
  `;
}

function phase4bModelVersionText(rows = mlbRows) {
  const top = rows?.[0];
  if (!top) return phase4bConfig().modelLabel;
  return `${top.model_version || phase4bConfig().modelLabel} · ${top.model_status || "candidate"}`;
}

function phase4bUpdatePageHeader() {
  const config = phase4bConfig();
  setText("pageEyebrow", config.eyebrow);
  setText("pageTitle", "MLB Hit Board");
  setText("pageSubtitle", config.subtitle);
}

function phase4bSetTarget(target) {
  if (!PHASE4B_TARGETS[target] || target === selectedMlbPredictionTarget) return;

  selectedMlbPredictionTarget = target;
  localStorage.setItem("mlbPredictionTarget", target);
  mlbRows = [];
  mlbTargetPitcherSplits = {};
  phase4bUpdatePageHeader();
  closeDrawer();
  loadMlbHitBoardData();
}

function renderMlbPredictionModeControls() {
  const config = phase4bConfig();

  return `
    <section class="control-deck performance-window-deck v3-control-deck unified-board-controls mlb-scope-controls phase4b-control-deck">
      <div class="control-group phase4b-outcome-group">
        <div class="control-label">Outcome</div>
        <div class="segmented phase4b-target-toggle" role="group" aria-label="Prediction outcome">
          ${Object.values(PHASE4B_TARGETS).map((target) => `
            <button
              class="segment ${selectedMlbPredictionTarget === target.key ? "active" : ""}"
              type="button"
              data-phase4b-target="${escapeHtml(target.key)}"
              aria-pressed="${selectedMlbPredictionTarget === target.key}"
              aria-label="${escapeHtml(target.fullLabel)}"
            >${escapeHtml(target.shortLabel)}</button>
          `).join("")}
        </div>
      </div>

      <div class="control-group compact-model-group">
        <div class="board-model-badge" aria-label="Active prediction model">
          <span class="board-model-icon">${phase4bIsHit() ? "⭐" : "🧠"}</span>
          <span class="board-model-copy">
            <small>Active Model</small>
            <strong>${escapeHtml(config.modelLabel)}</strong>
          </span>
          <span class="board-model-status ${config.deploymentStatus === "shadow" ? "phase4b-shadow-status" : ""}">
            ${escapeHtml(config.deploymentLabel)}
          </span>
        </div>
      </div>

      <div class="control-group grow mlb-scope-group">
        <div class="control-label">Scope</div>
        <div class="sort-pill board-scope-pill">
          All MLB hitters · ranked by ${escapeHtml(config.fullLabel)} probability
        </div>
      </div>
    </section>
  `;
}

function phase4bNormalizePowerRow(row) {
  const features = row?.features || {};
  const probabilityPct = Number(row?.probability_pct ?? Number(row?.predicted_probability || 0) * 100);

  return {
    ...row,
    full_name: row.batter_name,
    hit_probability_pct: probabilityPct,
    matchup_score: probabilityPct,
    batter_bats: row.batter_bats || features.batter_bats,
    pitcher_throws: row.pitcher_throws || features.pitcher_throws,
    recent_lineup_spot: row.batting_order || features.batting_order,
    confidence_bucket: row.confidence_bucket || null,
    model_confidence: null
  };
}

async function phase4bLoadPowerTarget(target) {
  if (phase4bTargetCache.has(target)) {
    return phase4bTargetCache.get(target);
  }

  const { data, error } = await client
    .from("v_mlb_batter_prediction_board")
    .select("*")
    .eq("target_name", target)
    .order("prediction_run_date", { ascending: false })
    .order("rank_overall", { ascending: true })
    .limit(500);

  if (error) throw error;

  const raw = (data || []).filter((row) => row.batter_name && row.quality_status !== "fail");
  const latestDate = raw[0]?.prediction_run_date || null;
  const rows = raw
    .filter((row) => !latestDate || row.prediction_run_date === latestDate)
    .map(phase4bNormalizePowerRow)
    .sort((a, b) => Number(a.rank_overall || 9999) - Number(b.rank_overall || 9999));

  phase4bTargetCache.set(target, rows);
  return rows;
}

loadMlbHitBoardData = async function loadMlbHitBoardDataPhase4b() {
  if (phase4bIsHit()) {
    return phase4bLoadHitTarget();
  }

  const config = phase4bConfig();

  try {
    const content = $("mlbHitBoardContent");
    if (content) {
      content.innerHTML = `
        ${renderMlbPredictionModeControls()}
        <section class="performance-note">
          <strong>Loading ${escapeHtml(config.fullLabel)} board...</strong>
          <span>Reading the generalized Supabase prediction serving view.</span>
        </section>
      `;
    }

    mlbRows = await phase4bLoadPowerTarget(selectedMlbPredictionTarget);
    renderMlbHitBoardPage();
    runPhase4bSelfTest();
  } catch (err) {
    console.error(`Error loading ${config.fullLabel} board:`, err);
    mlbRows = [];
    renderMlbHitBoardPage(err);
  }
};

function phase4bBestDamageMatchup(rows) {
  const top25 = (rows || []).slice(0, 25);
  const groups = new Map();

  top25.forEach((row) => {
    if (!row.pitcher_id) return;
    const key = String(row.pitcher_id);
    const group = groups.get(key) || {
      pitcher_id: row.pitcher_id,
      pitcher_name: row.pitcher_name,
      pitcher_team_name: row.pitcher_team_name,
      pitcher_throws: row.pitcher_throws,
      game_date: row.game_date,
      game_time_utc: row.game_time_utc,
      venue_name: row.venue_name,
      hitters: [],
      totalProbability: 0
    };

    group.hitters.push(row);
    group.totalProbability += Number(row.predicted_probability || 0);
    groups.set(key, group);
  });

  const ranked = [...groups.values()]
    .filter((group) => group.hitters.length >= 2)
    .sort((a, b) =>
      b.totalProbability - a.totalProbability ||
      b.hitters.length - a.hitters.length
    );

  const best = ranked[0] || null;
  if (!best) return null;

  best.hitters.sort((a, b) => Number(a.rank_overall || 9999) - Number(b.rank_overall || 9999));
  best.featureRow = best.hitters[0] || {};
  best.top5AvgProbability = best.hitters.slice(0, 5).reduce(
    (sum, row) => sum + Number(row.predicted_probability || 0), 0
  ) / Math.max(1, best.hitters.slice(0, 5).length);

  return best;
}

function phase4bAverageFeature(rows, key) {
  const values = (rows || [])
    .map((row) => Number(phase4bFeature(row, key)))
    .filter(Number.isFinite);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function phase4bReliablePitcherContactRate(rows, rateKey, minBbe = 25) {
  const uniqueSamples = new Map();

  (rows || []).forEach((row) => {
    const f = row?.features || {};
    const rate = Number(f[rateKey]);
    const bbe = Number(f.pitcher_contact_bbe_30d);
    const available = f.contact_feature_available;

    if (!Number.isFinite(rate) || !Number.isFinite(bbe)) return;
    if (available === false || bbe < minBbe) return;

    const key = `${rate}|${bbe}`;
    if (!uniqueSamples.has(key)) uniqueSamples.set(key, { rate, bbe });
  });

  const samples = [...uniqueSamples.values()];
  if (!samples.length) return null;

  const totalBbe = samples.reduce((sum, sample) => sum + sample.bbe, 0);
  if (!totalBbe) return null;

  return samples.reduce((sum, sample) => sum + (sample.rate * sample.bbe), 0) / totalBbe;
}

function phase4bRenderOutlook(rows) {
  const config = phase4bConfig();
  const top = rows.slice(0, 3);

  return `
    <section class="daily-summary-card consensus-outlook-card phase4b-outlook-card">
      <div class="outlook-main">
        <div class="eyebrow">Daily Summary</div>
        <h2>Today's ${escapeHtml(config.fullLabel)} Outlook</h2>
        <div class="consensus-play-list">
          ${top.length ? top.map((row, index) => {
            const signal = phase4bSignalObjects(row)[0];
            return `
              <button class="consensus-play-row" type="button" data-consensus-player-id="${escapeHtml(row.player_id)}">
                <span class="consensus-medal">${index + 1}</span>
                <span class="consensus-player-copy">
                  <strong>${escapeHtml(row.batter_name || row.full_name || "Unknown hitter")}</strong>
                  <small>${escapeHtml(`${signal.emoji} ${signal.label} · ${signal.detail}`)}</small>
                </span>
                <span class="consensus-rank-pills">
                  <span class="model-rank-pill v3">${escapeHtml(phase4bProbabilityPct(row))}</span>
                  ${phase4bTargetStatusBadge(row)}
                </span>
              </button>
            `;
          }).join("") : `<div class="empty-state">${escapeHtml(config.emptyText)}</div>`}
        </div>
      </div>
      <div class="summary-metrics">
        <span>${fmtNum(rows.length)} hitters scored</span>
        <span>${Math.min(rows.length, 25)} shown</span>
        <span>${escapeHtml(config.deploymentLabel)} model</span>
      </div>
    </section>
  `;
}

function phase4bRenderMatchupCard(rows) {
  const config = phase4bConfig();
  const matchup = phase4bBestDamageMatchup(rows);

  if (!matchup) {
    return `
      <section class="matchup-hero phase4b-power-matchup">
        <div class="matchup-header">
          <div>
            <div class="eyebrow">${escapeHtml(config.matchupEyebrow)}</div>
            <h2>No clustered pitcher matchup yet</h2>
            <p class="matchup-subtitle">Waiting for at least two ranked hitters against the same probable starter.</p>
          </div>
          <div class="matchup-score-pill">${escapeHtml(config.matchupLabel)}</div>
        </div>
      </section>
    `;
  }

  const sample = matchup.hitters;
  const pitcherBarrel = phase4bReliablePitcherContactRate(sample, "pitcher_barrel_rate_allowed_30d");
  const pitcherHardHit = phase4bReliablePitcherContactRate(sample, "pitcher_hard_hit_rate_allowed_30d");
  const parkKey = selectedMlbPredictionTarget === "home_run_1plus" ? "park_hr_factor" : "park_hit_factor";
  const parkFactor = phase4bAverageFeature(sample, parkKey);
  const facingTeam = matchup.hitters[0]?.team_name || "Opponent hitters";

  return `
    <section class="matchup-hero phase4b-power-matchup">
      <div class="matchup-header">
        <div>
          <div class="eyebrow">${escapeHtml(config.matchupEyebrow)}</div>
          <h2>${escapeHtml(matchup.pitcher_name || "Probable Starter TBD")}</h2>
          <p class="matchup-subtitle">
            ${escapeHtml(matchup.pitcher_team_name || "Pitching team")} · Facing ${escapeHtml(facingTeam)} ·
            ${matchup.game_date ? escapeHtml(formatGameDate(matchup.game_date)) : "Today"}
            ${matchup.pitcher_throws ? ` · ${escapeHtml(matchup.pitcher_throws)}HP` : ""}
          </p>
        </div>
        <div class="matchup-score-pill">${escapeHtml(config.matchupLabel)}</div>
      </div>

      <div class="matchup-grid">
        <article class="matchup-stat-card">
          <div class="label">Target Starter</div>
          <div class="value">${escapeHtml(matchup.pitcher_name || "—")}</div>
        </article>
        <article class="matchup-stat-card">
          <div class="label">Throws</div>
          <div class="value">${escapeHtml(matchup.pitcher_throws ? `${matchup.pitcher_throws}HP` : "—")}</div>
        </article>
        <article class="matchup-stat-card">
          <div class="label">Barrel Allowed · 30d</div>
          <div class="value">${phase4bPct(pitcherBarrel)}</div>
        </article>
        <article class="matchup-stat-card">
          <div class="label">Hard-Hit Allowed · 30d</div>
          <div class="value">${phase4bPct(pitcherHardHit)}</div>
        </article>
        <article class="matchup-stat-card">
          <div class="label">${selectedMlbPredictionTarget === "home_run_1plus" ? "HR Park Factor" : "Hit Park Factor"}</div>
          <div class="value">${phase4bNumber(parkFactor, 2)}</div>
        </article>
        <article class="matchup-stat-card">
          <div class="label">Cluster Avg Probability</div>
          <div class="value">${phase4bPct(matchup.top5AvgProbability)}</div>
        </article>
      </div>
    </section>
  `;
}

function phase4bRenderPowerBoard(error = null) {
  const content = $("mlbHitBoardContent");
  if (!content) return;

  const config = phase4bConfig();
  const rows = (mlbRows || [])
    .slice()
    .sort((a, b) => Number(a.rank_overall || 9999) - Number(b.rank_overall || 9999));
  const top25 = rows.slice(0, 25);

  content.innerHTML = `
    ${renderMlbPredictionModeControls()}

    ${error ? `
      <section class="performance-note">
        <strong>${escapeHtml(config.fullLabel)} board warning.</strong>
        <span>${escapeHtml(error.message || error)}</span>
      </section>
    ` : ""}

    ${phase4bRenderOutlook(rows)}
    ${phase4bRenderMatchupCard(rows)}

    <section class="click-note mlb-hit-board-tip phase4b-tip">
      <div>
        <strong>Tip:</strong> Click any player to review the power profile, opponent contact-risk metrics, and park context behind the matchup.
      </div>
      <span>Power-model signals are contextual feature highlights. They are not presented as causal feature contributions.</span>
    </section>

    <section class="board-card">
      <div class="board-header">
        <div>
          <div class="eyebrow">All MLB Leaderboard</div>
          <h2>${escapeHtml(config.boardTitle)}</h2>
        </div>
        <div class="board-meta">
          <span>${fmtNum(rows.length)} scored hitters</span>
          <span>${escapeHtml(phase4bModelVersionText(rows))}</span>
        </div>
      </div>

      <div class="table-wrap">
        <table class="v3-board-table phase4b-power-table">
          <thead>
            <tr>
              <th class="rank">#</th>
              <th>Player</th>
              <th>Team</th>
              <th class="num">${escapeHtml(config.probabilityLabel)}</th>
              <th>Model Status</th>
              <th>Key Signal</th>
              <th>Opponent SP</th>
              <th>Game</th>
            </tr>
          </thead>
          <tbody>
            ${top25.length ? top25.map((row, index) => `
              <tr class="clickable-row mlb-clickable-row" data-mlb-player-id="${escapeHtml(row.player_id)}">
                <td class="rank"><span class="rank-badge">${row.rank_overall || index + 1}</span></td>
                <td>
                  <div class="player-cell">
                    <div class="avatar ${String(row.batter_bats || "R").toLowerCase()}">${handednessBadge({ bats: row.batter_bats })}</div>
                    <div>
                      <div class="player-name">${escapeHtml(row.batter_name || row.full_name || "—")}</div>
                      <div class="player-sub">${row.batting_order ? `Batting ${escapeHtml(row.batting_order)} · ` : ""}click for power detail</div>
                    </div>
                  </div>
                </td>
                <td>${escapeHtml(row.team_name || "—")}</td>
                <td class="num">
                  <div class="score-bar-wrap probability-cell">
                    <div class="score-bar">
                      <div class="score-bar-fill" style="width:${Math.min(100, Number(row.probability_pct || 0))}%"></div>
                    </div>
                    <span class="score-value">${escapeHtml(phase4bProbabilityPct(row))}</span>
                  </div>
                </td>
                <td>${phase4bTargetStatusBadge(row)}</td>
                <td class="why-cell">${phase4bRenderWhyPills(row)}</td>
                <td>
                  <div class="player-name">${escapeHtml(row.pitcher_name || "TBD")}</div>
                  <div class="player-sub">${escapeHtml(row.pitcher_team_name || "—")} · ${escapeHtml(row.pitcher_throws || "—")}HP</div>
                </td>
                <td>${row.game_date ? escapeHtml(formatGameDate(row.game_date)) : "—"}</td>
              </tr>
            `).join("") : `<tr><td colspan="8" class="empty-state">${escapeHtml(config.emptyText)}</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

renderMlbHitBoardPage = function renderMlbHitBoardPagePhase4b(error = null) {
  phase4bUpdatePageHeader();

  if (phase4bIsHit()) {
    return phase4bOriginal.renderMlbHitBoardPage(error);
  }

  return phase4bRenderPowerBoard(error);
};

function phase4bPowerNarrative(row) {
  const config = phase4bConfig(row?.target_name);
  const signals = phase4bSignalObjects(row).slice(0, 3);
  const signalText = signals.map((signal) => `${signal.label.toLowerCase()} (${signal.detail})`).join("; ");
  const pitcher = row.pitcher_name || "the opposing starter";

  return `${row.batter_name || "This hitter"} is ranked #${row.rank_overall || "—"} for ${config.fullLabel} at ${phase4bProbabilityPct(row)} against ${pitcher}. The strongest contextual signals on the board are ${signalText}.`;
}

function phase4bPowerMetric(label, value, sub = "") {
  return v3Metric(label, value, sub);
}

function phase4bOpenPowerDrawer(row) {
  const drawer = $("playerDrawer");
  const body = document.querySelector(".drawer-body");
  if (!drawer || !body || !row) return;

  const config = phase4bConfig(row.target_name);
  const f = row.features || {};
  const signals = phase4bSignalObjects(row);
  const pitcher = row.pitcher_name
    ? `${row.pitcher_name}${row.pitcher_throws ? ` (${row.pitcher_throws})` : ""}`
    : "Probable starter TBD";

  drawer.classList.remove("mlb-matchup-only");
  drawer.classList.add("v3-detail-drawer", "phase4b-power-drawer");

  setText("drawerPlayerName", row.batter_name || row.full_name || "Unknown Player");
  setText(
    "drawerPlayerSub",
    `${row.team_name || "MLB"} · ${config.fullLabel} model · ${config.deploymentLabel}`
  );

  body.dataset.mode = "v3";
  body.innerHTML = `
    <section class="v3-drawer-hero phase4b-drawer-hero">
      <div class="v3-probability-ring">
        <span>${escapeHtml(phase4bProbabilityPct(row))}</span>
        <small>${escapeHtml(config.probabilityLabel)}</small>
      </div>
      <div class="v3-drawer-summary">
        <div class="v3-rank-line">#${escapeHtml(row.rank_overall || "—")} of ${escapeHtml(fmtNum(mlbRows.length))} scored hitters</div>
        <div>${phase4bTargetStatusBadge(row)}</div>
      </div>
    </section>

    <section class="drawer-section v3-section phase4b-signal-summary">
      <div class="drawer-section-title">What Stands Out</div>
      <p class="drawer-explanation">${escapeHtml(phase4bPowerNarrative(row))}</p>
      <div class="phase4b-drawer-pills">
        ${signals.slice(0, 5).map((signal) => `
          <span class="why-pill phase4b-power-pill" title="${escapeHtml(signal.detail)}">
            ${signal.emoji} ${escapeHtml(signal.label)}
          </span>
        `).join("")}
      </div>
    </section>

    <section class="drawer-section v3-section">
      <div class="drawer-section-title">Power Profile</div>
      <div class="v3-drawer-grid">
        ${phase4bPowerMetric("Recent HR", f.batter_hr_w10 != null ? fmtNum(f.batter_hr_w10) : "—", "10-game feature window")}
        ${phase4bPowerMetric("Recent Total Bases", f.batter_tb_w10 != null ? fmtNum(f.batter_tb_w10) : "—", "10-game feature window")}
        ${phase4bPowerMetric("Recent XBH", f.batter_xbh_w10 != null ? fmtNum(f.batter_xbh_w10) : "—", "10-game feature window")}
        ${phase4bPowerMetric("Recent SLG", f.batter_slg_w10 != null ? phase4bNumber(f.batter_slg_w10, 3) : "—", "10-game feature window")}
        ${phase4bPowerMetric("Recent ISO", f.batter_iso_w10 != null ? phase4bNumber(f.batter_iso_w10, 3) : "—", "10-game feature window")}
        ${phase4bPowerMetric("Barrel Rate", f.batter_barrel_rate_30d != null ? phase4bPct(f.batter_barrel_rate_30d) : "—", "Last 30 days")}
        ${phase4bPowerMetric("Hard-Hit Rate", f.batter_hard_hit_rate_30d != null ? phase4bPct(f.batter_hard_hit_rate_30d) : "—", "Last 30 days")}
        ${phase4bPowerMetric("Avg Exit Velocity", f.batter_avg_exit_velocity_30d != null ? `${phase4bNumber(f.batter_avg_exit_velocity_30d, 1)} mph` : "—", "Last 30 days")}
      </div>
    </section>

    <section class="drawer-section v3-section">
      <div class="drawer-section-title">Matchup Damage Context</div>
      <div class="v3-drawer-grid">
        ${phase4bPowerMetric("Opponent SP", pitcher, row.pitcher_team_name || "")}
        ${phase4bPowerMetric("Pitcher Barrel Allowed", f.pitcher_barrel_rate_allowed_30d != null ? phase4bPct(f.pitcher_barrel_rate_allowed_30d) : "—", "Last 30 days")}
        ${phase4bPowerMetric("Pitcher Hard-Hit Allowed", f.pitcher_hard_hit_rate_allowed_30d != null ? phase4bPct(f.pitcher_hard_hit_rate_allowed_30d) : "—", "Last 30 days")}
        ${phase4bPowerMetric("HR Park Factor", f.park_hr_factor != null ? phase4bNumber(f.park_hr_factor, 2) : "—", row.venue_name || "Game environment")}
        ${phase4bPowerMetric("Hit Park Factor", f.park_hit_factor != null ? phase4bNumber(f.park_hit_factor, 2) : "—", row.venue_name || "Game environment")}
        ${phase4bPowerMetric("Roof / Wind", [f.roof_status, f.wind_effect].filter(Boolean).join(" · ") || "—", row.game_time_utc ? formatEasternGameTime(row.game_time_utc) : "")}
      </div>
    </section>

    <section class="drawer-section v3-section subtle-model-note">
      <div class="drawer-section-title">Model Note</div>
      <p class="drawer-explanation">
        ${escapeHtml(config.modelLabel)} is currently a ${escapeHtml(config.deploymentLabel.toLowerCase())} model.
        The feature highlights above are contextual values from the scoring feature set, not a SHAP-style contribution ranking.
        Model version: ${escapeHtml(row.model_version || "—")}.
      </p>
    </section>
  `;

  drawer.classList.add("open");
  $("drawerBackdrop")?.classList.add("open");
}

async function phase4bLoadComparableProfileForRow(row) {
  if (!row?.prediction_id) return row;
  if (row.comparable_profile_status) return row;

  try {
    const { data, error } = await client
      .from("mlb_v3_comparable_profile_cache")
      .select("prediction_id,comparable_profile_rate,comparable_profile_delta,comparable_profile_sample_size,comparable_profile_effective_sample_size,comparable_profile_average_distance,comparable_profile_sample_label,comparable_profile_status,comparable_profile_method_version")
      .eq("prediction_id", row.prediction_id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return row;

    Object.assign(row, data);
    return row;
  } catch (err) {
    console.warn("Comparable profile lazy load failed:", err);
    return row;
  }
}

openMlbDrawer = async function openMlbDrawerPhase4b(playerId) {
  if (phase4bIsHit()) {
    const row = (mlbRows || []).find((item) => String(item.player_id) === String(playerId));
    if (row) {
      await phase4bLoadComparableProfileForRow(row);
    }
    return phase4bOriginal.openMlbDrawer(playerId);
  }

  const row = (mlbRows || []).find((item) => String(item.player_id) === String(playerId));
  if (!row) return;
  phase4bOpenPowerDrawer(row);
};

showView = function showViewPhase4b(viewName) {
  phase4bOriginal.showView(viewName);
  if (viewName === "mlb") phase4bUpdatePageHeader();
};

function phase4bInjectStyles() {
  if (document.getElementById("phase4bStyles")) return;

  const style = document.createElement("style");
  style.id = "phase4bStyles";
  style.textContent = `
    .phase4b-control-deck {
      align-items: flex-end;
      flex-wrap: wrap;
    }

    .phase4b-outcome-group {
      min-width: 310px;
    }

    .phase4b-target-toggle .segment {
      min-width: 86px;
      white-space: nowrap;
    }

    .phase4b-shadow-status,
    .phase4b-status-badge.shadow {
      color: #fde68a;
      border-color: rgba(250, 204, 21, .35);
      background: rgba(250, 204, 21, .10);
    }

    .phase4b-status-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(34, 197, 94, .32);
      background: rgba(34, 197, 94, .10);
      color: #bbf7d0;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: .76rem;
      font-weight: 900;
      white-space: nowrap;
    }

    .phase4b-outlook-card .model-rank-pill.v3 {
      min-width: 72px;
      text-align: center;
    }

    .phase4b-power-pill {
      border-color: rgba(251, 146, 60, .30);
      background: rgba(251, 146, 60, .10);
      color: #fed7aa;
    }

    .phase4b-power-matchup {
      background:
        radial-gradient(circle at 10% 0%, rgba(251, 146, 60, .10), transparent 32%),
        linear-gradient(180deg, rgba(30, 41, 59, .82), rgba(15, 23, 42, .84));
    }

    .phase4b-power-table .probability-cell .score-bar-fill {
      background: linear-gradient(90deg, var(--accent), var(--accent-2));
    }

    .phase4b-drawer-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }

    .phase4b-power-drawer .v3-probability-ring {
      box-shadow: inset 0 0 0 1px rgba(251, 146, 60, .20);
    }

    @media (max-width: 760px) {
      .phase4b-outcome-group {
        width: 100%;
        min-width: 0;
      }

      .phase4b-target-toggle {
        width: 100%;
      }

      .phase4b-target-toggle .segment {
        flex: 1;
        min-width: 0;
        padding-left: 8px;
        padding-right: 8px;
        font-size: .78rem;
      }

      .phase4b-control-deck .compact-model-group,
      .phase4b-control-deck .mlb-scope-group {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(style);
}

function runPhase4bSelfTest() {
  const config = phase4bConfig();
  const rows = mlbRows || [];
  const rankSorted = rows.every((row, index) =>
    index === 0 || Number(rows[index - 1].rank_overall || 9999) <= Number(row.rank_overall || 9999)
  );
  const probabilityValid = rows.every((row) => {
    const p = Number(row.predicted_probability);
    return !Number.isFinite(p) || (p >= 0 && p <= 1);
  });
  const targetValid = phase4bIsHit() || rows.every((row) => row.target_name === selectedMlbPredictionTarget);
  const powerOddsHidden = phase4bIsHit() || rows.every((row) => row.market_odds_supported !== true);

  const checks = [
    { check: "three-target-config", status: Object.keys(PHASE4B_TARGETS).length === 3 ? "pass" : "fail" },
    { check: "rows-loaded", status: rows.length > 0 ? "pass" : "needs-data", rows: rows.length },
    { check: "rank-order", status: rankSorted ? "pass" : "fail" },
    { check: "probability-range", status: probabilityValid ? "pass" : "fail" },
    { check: "selected-target-only", status: targetValid ? "pass" : "fail" },
    { check: "power-odds-hidden", status: powerOddsHidden ? "pass" : "fail" },
    { check: "toggle-mounted", status: document.querySelector("[data-phase4b-target]") ? "pass" : "needs-dom" },
    { check: "serving-view-only", status: "pass", source: phase4bIsHit() ? "existing V3 serving cache" : "v_mlb_batter_prediction_board" }
  ];

  console.table(checks);
  window.phase4bSelfTest = {
    target: selectedMlbPredictionTarget,
    targetLabel: config.fullLabel,
    checks
  };
  return window.phase4bSelfTest;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-phase4b-target]");
  if (!button) return;
  event.preventDefault();
  phase4bSetTarget(button.dataset.phase4bTarget);
});

window.phase4bSetTarget = phase4bSetTarget;
window.runPhase4bSelfTest = runPhase4bSelfTest;
window.phase4bInvalidateHitState = phase4bInvalidateHitState;

// Manual Refresh should always bypass the in-memory Hit cache.
// Capture phase ensures this runs before the app's existing refresh handler.
document.getElementById("refreshButton")?.addEventListener("click", () => {
  if (phase4bIsHit()) {
    phase4bInvalidateHitState();
  }
}, true);

phase4bInjectStyles();
phase4bUpdatePageHeader();

// app-v4.js loads the Hit board before this additive script executes.
// Re-load once so the saved target and Phase 4B controls are authoritative.
loadMlbHitBoardData();

/* ===== Consolidated JS from phase5b.js ===== */
/* =========================================================
   MLB Hit Board — Phase 5B
   Merge foundation: Top 25 / Select Game scope on MLB Hit Board
   Team Hit Board remains untouched during parity validation.
   Build: phase5b-compact-controls-20260812b
   ========================================================= */

console.info("MLB Hit Lab Phase 5B loaded: phase5b-compact-controls-20260812b");

const PHASE5B_SCOPE_TOP25 = "top25";
const PHASE5B_SCOPE_GAME = "game";

let selectedMlbBoardScope =
  localStorage.getItem("mlbBoardScope") === PHASE5B_SCOPE_GAME
    ? PHASE5B_SCOPE_GAME
    : PHASE5B_SCOPE_TOP25;

let selectedMlbGamePk = localStorage.getItem("mlbSelectedGamePk") || null;
let phase5bGames = [];
let phase5bGamesLoaded = false;
let phase5bGamesLoading = false;

const phase5bPrevious = {
  renderMlbPredictionModeControls,
  renderMlbHitBoardPage
};

function phase5bTargetAvailabilityField() {
  switch (selectedMlbPredictionTarget) {
    case "home_run_1plus":
      return "has_hr_predictions";
    case "total_bases_2plus":
      return "has_tb_predictions";
    default:
      return "has_hit_predictions";
  }
}

function phase5bTargetCountField() {
  switch (selectedMlbPredictionTarget) {
    case "home_run_1plus":
      return "hr_prediction_count";
    case "total_bases_2plus":
      return "tb_prediction_count";
    default:
      return "hit_prediction_count";
  }
}

function phase5bAvailableGames() {
  const flag = phase5bTargetAvailabilityField();
  return (phase5bGames || [])
    .filter((game) => game?.[flag] !== false)
    .slice()
    .sort((a, b) => {
      const at = Date.parse(a.game_time_utc || "") || 0;
      const bt = Date.parse(b.game_time_utc || "") || 0;
      return at - bt || Number(a.game_pk || 0) - Number(b.game_pk || 0);
    });
}

function phase5bSelectedGame() {
  return phase5bAvailableGames().find(
    (game) => String(game.game_pk) === String(selectedMlbGamePk)
  ) || null;
}

function phase5bEnsureSelectedGame() {
  const games = phase5bAvailableGames();

  if (!games.length) {
    selectedMlbGamePk = null;
    localStorage.removeItem("mlbSelectedGamePk");
    return null;
  }

  let selected = games.find(
    (game) => String(game.game_pk) === String(selectedMlbGamePk)
  );

  if (!selected) {
    selected = games[0];
    selectedMlbGamePk = String(selected.game_pk);
    localStorage.setItem("mlbSelectedGamePk", selectedMlbGamePk);
  }

  return selected;
}

function phase5bFormatGameOption(game) {
  if (!game) return "Game unavailable";
  return game.game_label ||
    `${game.away_team_name || "Away"} at ${game.home_team_name || "Home"}`;
}

function phase5bUnifiedControls() {
  const config = phase4bConfig();
  const games = phase5bAvailableGames();
  const selected = phase5bEnsureSelectedGame();
  const countField = phase5bTargetCountField();

  return `
    <section class="phase5b-unified-control-card" aria-label="MLB board filters">
      <div class="phase5b-unified-control-row">
        <div class="segmented phase5b-outcome-toggle" role="group" aria-label="Prediction outcome">
          ${Object.values(PHASE4B_TARGETS).map((target) => `
            <button
              class="segment ${selectedMlbPredictionTarget === target.key ? "active" : ""}"
              type="button"
              data-phase4b-target="${escapeHtml(target.key)}"
              aria-pressed="${selectedMlbPredictionTarget === target.key}"
              aria-label="${escapeHtml(target.fullLabel)}"
            >${escapeHtml(target.shortLabel)}</button>
          `).join("")}
        </div>

        <div class="segmented phase5b-scope-toggle" role="group" aria-label="Board scope">
          <button
            class="segment ${selectedMlbBoardScope === PHASE5B_SCOPE_TOP25 ? "active" : ""}"
            type="button"
            data-phase5b-scope="${PHASE5B_SCOPE_TOP25}"
            aria-pressed="${selectedMlbBoardScope === PHASE5B_SCOPE_TOP25}"
          >Top 25</button>
          <button
            class="segment ${selectedMlbBoardScope === PHASE5B_SCOPE_GAME ? "active" : ""}"
            type="button"
            data-phase5b-scope="${PHASE5B_SCOPE_GAME}"
            aria-pressed="${selectedMlbBoardScope === PHASE5B_SCOPE_GAME}"
          >Select Game</button>
        </div>

        <div class="board-model-badge phase5b-model-badge" aria-label="Active prediction model">
          <span class="board-model-icon">${phase4bIsHit() ? "⭐" : "🧠"}</span>
          <span class="board-model-copy">
            <small>Active Model</small>
            <strong>${escapeHtml(config.modelLabel)}</strong>
          </span>
          <span class="board-model-status ${config.deploymentStatus === "shadow" ? "phase4b-shadow-status" : ""}">
            ${escapeHtml(config.deploymentLabel)}
          </span>
        </div>
      </div>

      ${selectedMlbBoardScope === PHASE5B_SCOPE_GAME ? `
        <div class="phase5b-game-row">
          ${phase5bGamesLoading && !phase5bGamesLoaded ? `
            <div class="phase5b-game-loading">Loading today's MLB games…</div>
          ` : games.length ? `
            <select
              class="phase5b-game-select"
              id="phase5bGameSelect"
              aria-label="Select MLB game"
            >
              ${games.map((game) => `
                <option
                  value="${escapeHtml(game.game_pk)}"
                  ${String(game.game_pk) === String(selected?.game_pk) ? "selected" : ""}
                >
                  ${escapeHtml(phase5bFormatGameOption(game))}
                </option>
              `).join("")}
            </select>

            ${selected ? `
              <div class="phase5b-game-meta">
                ${escapeHtml(fmtNum(selected[countField] || 0))} scored ·
                ${escapeHtml(config.fullLabel)}
                ${selected.venue_name ? ` · ${escapeHtml(selected.venue_name)}` : ""}
              </div>
            ` : ""}
          ` : `
            <div class="phase5b-game-loading">
              No games with ${escapeHtml(config.fullLabel)} predictions are available.
            </div>
          `}
        </div>
      ` : ""}
    </section>
  `;
}

renderMlbPredictionModeControls = function renderMlbPredictionModeControlsPhase5b() {
  return phase5bUnifiedControls();
};

async function phase5bLoadGames(force = false) {
  if (phase5bGamesLoading) return;
  if (phase5bGamesLoaded && !force) return;

  phase5bGamesLoading = true;

  try {
    const { data, error } = await client
      .from("v_mlb_batter_prediction_game_selector")
      .select("*")
      .order("prediction_run_date", { ascending: false })
      .order("game_time_utc", { ascending: true });

    if (error) throw error;

    const raw = data || [];
    const latestDate = raw[0]?.prediction_run_date || null;

    phase5bGames = raw.filter(
      (game) => !latestDate || game.prediction_run_date === latestDate
    );

    phase5bGamesLoaded = true;
    phase5bEnsureSelectedGame();

    if (document.getElementById("mlbHitBoardContent")) {
      renderMlbHitBoardPage();
    }
  } catch (err) {
    console.error("Phase 5B game-selector load failed:", err);
    phase5bGames = [];
    phase5bGamesLoaded = false;
  } finally {
    phase5bGamesLoading = false;
  }
}

function phase5bProbabilityNumber(row) {
  const value = Number(
    row?.predicted_probability ??
    (row?.probability_pct != null ? Number(row.probability_pct) / 100 : NaN) ??
    (row?.hit_probability_pct != null ? Number(row.hit_probability_pct) / 100 : NaN)
  );
  return Number.isFinite(value) ? value : -1;
}

function phase5bRowsForSelectedGame(rows) {
  if (selectedMlbBoardScope !== PHASE5B_SCOPE_GAME) return rows || [];

  const selected = phase5bEnsureSelectedGame();
  if (!selected) return [];

  const filtered = (rows || [])
    .filter((row) => String(row.game_pk) === String(selected.game_pk))
    .slice()
    .sort((a, b) => {
      const ar = Number(a.rank_game);
      const br = Number(b.rank_game);

      if (Number.isFinite(ar) && Number.isFinite(br) && ar !== br) {
        return ar - br;
      }

      return phase5bProbabilityNumber(b) - phase5bProbabilityNumber(a) ||
        String(a.batter_name || a.full_name || "").localeCompare(
          String(b.batter_name || b.full_name || "")
        );
    });

  // Existing Hit/Power renderers display rank_overall. In selected-game mode,
  // provide cloned display rows whose visible rank is the game rank.
  return filtered.map((row, index) => ({
    ...row,
    rank_overall_global: row.rank_overall,
    rank_overall: Number.isFinite(Number(row.rank_game))
      ? Number(row.rank_game)
      : index + 1
  }));
}

function phase5bGameBoardTitle() {
  const game = phase5bSelectedGame();
  const config = phase4bConfig();

  if (!game) return config.boardTitle;

  return `${game.away_team_name || "Away"} at ${game.home_team_name || "Home"} — ${config.fullLabel} Probabilities`;
}

function phase5bPostProcessSelectedGame() {
  if (selectedMlbBoardScope !== PHASE5B_SCOPE_GAME) return;

  const content = document.getElementById("mlbHitBoardContent");
  const game = phase5bSelectedGame();
  if (!content || !game) return;

  const board = content.querySelector(".board-card");
  if (board) {
    const eyebrow = board.querySelector(".board-header .eyebrow");
    const heading = board.querySelector(".board-header h2");

    if (eyebrow) eyebrow.textContent = "Selected Game Leaderboard";
    if (heading) heading.textContent = phase5bGameBoardTitle();
  }

  const summaryCard = content.querySelector(".daily-summary-card h2");
  if (summaryCard) {
    summaryCard.textContent =
      `${game.away_team_name || "Away"} at ${game.home_team_name || "Home"} — ${phase4bConfig().fullLabel} Outlook`;
  }
}

renderMlbHitBoardPage = function renderMlbHitBoardPagePhase5b(error = null) {
  if (selectedMlbBoardScope === PHASE5B_SCOPE_TOP25) {
    return phase5bPrevious.renderMlbHitBoardPage(error);
  }

  phase5bEnsureSelectedGame();

  const allRows = mlbRows;
  const scopedRows = phase5bRowsForSelectedGame(allRows);

  try {
    mlbRows = scopedRows;
    phase5bPrevious.renderMlbHitBoardPage(error);
    phase5bPostProcessSelectedGame();
  } finally {
    // Keep the full slate in memory so changing outcome/game never requires
    // destructive state mutation and existing player drawers can still resolve.
    mlbRows = allRows;
  }
};

function phase5bSetScope(scope) {
  if (![PHASE5B_SCOPE_TOP25, PHASE5B_SCOPE_GAME].includes(scope)) return;

  selectedMlbBoardScope = scope;
  localStorage.setItem("mlbBoardScope", scope);

  if (scope === PHASE5B_SCOPE_GAME) {
    phase5bEnsureSelectedGame();
    if (!phase5bGamesLoaded) phase5bLoadGames();
  }

  closeDrawer();
  renderMlbHitBoardPage();
}

function phase5bSetGame(gamePk) {
  const available = phase5bAvailableGames();
  const game = available.find((item) => String(item.game_pk) === String(gamePk));
  if (!game) return;

  selectedMlbGamePk = String(game.game_pk);
  localStorage.setItem("mlbSelectedGamePk", selectedMlbGamePk);

  closeDrawer();
  renderMlbHitBoardPage();
}

document.addEventListener("click", (event) => {
  const scopeButton = event.target.closest("[data-phase5b-scope]");
  if (!scopeButton) return;

  event.preventDefault();
  phase5bSetScope(scopeButton.dataset.phase5bScope);
});

document.addEventListener("change", (event) => {
  const select = event.target.closest("#phase5bGameSelect");
  if (!select) return;
  phase5bSetGame(select.value);
});

document.getElementById("refreshButton")?.addEventListener("click", () => {
  phase5bGamesLoaded = false;
  setTimeout(() => phase5bLoadGames(true), 0);
});

async function runPhase5bContractTest() {
  const results = [];

  try {
    const { data: games, error: gamesError } = await client
      .from("v_mlb_batter_prediction_game_selector")
      .select("*")
      .order("prediction_run_date", { ascending: false });

    if (gamesError) throw gamesError;

    const latestDate = games?.[0]?.prediction_run_date || null;
    const latestGames = (games || []).filter(
      (game) => !latestDate || game.prediction_run_date === latestDate
    );

    results.push({
      check: "game-selector-loaded",
      status: latestGames.length > 0 ? "pass" : "fail",
      detail: `${latestGames.length} games`
    });

    const targets = [
      ["hit_1plus", "has_hit_predictions"],
      ["total_bases_2plus", "has_tb_predictions"],
      ["home_run_1plus", "has_hr_predictions"]
    ];

    for (const [target, availabilityField] of targets) {
      const targetGames = latestGames.filter((game) => game[availabilityField]);

      const { data: rows, error } = await client
        .from("v_mlb_batter_prediction_board")
        .select("prediction_run_date,game_pk,player_id,target_name,rank_game,predicted_probability")
        .eq("target_name", target)
        .order("prediction_run_date", { ascending: false })
        .limit(500);

      if (error) throw error;

      const targetDate = rows?.[0]?.prediction_run_date || null;
      const latestRows = (rows || []).filter(
        (row) => !targetDate || row.prediction_run_date === targetDate
      );

      const gameMap = new Map();
      latestRows.forEach((row) => {
        const key = String(row.game_pk);
        const group = gameMap.get(key) || [];
        group.push(row);
        gameMap.set(key, group);
      });

      const validRanks = [...gameMap.values()].every((group) => {
        const ranks = group.map((row) => Number(row.rank_game)).sort((a, b) => a - b);
        return ranks.length > 0 &&
          ranks.every(Number.isFinite) &&
          ranks[0] === 1 &&
          ranks[ranks.length - 1] === ranks.length &&
          new Set(ranks).size === ranks.length;
      });

      results.push({
        check: `${target}-top25`,
        status: latestRows.length >= 25 ? "pass" : "fail",
        detail: `${latestRows.length} rows`
      });

      results.push({
        check: `${target}-selected-game`,
        status: targetGames.length > 0 && validRanks ? "pass" : "fail",
        detail: `${targetGames.length} games · game ranks ${validRanks ? "valid" : "invalid"}`
      });
    }
  } catch (err) {
    results.push({
      check: "contract-test-runtime",
      status: "fail",
      detail: err.message || String(err)
    });
  }

  console.table(results);
  window.phase5bContractTest = results;
  return results;
}

function runPhase5bSelfTest() {
  const game = phase5bSelectedGame();
  const rows = phase5bRowsForSelectedGame(mlbRows || []);

  const checks = [
    {
      check: "scope-control-mounted",
      status: document.querySelector("[data-phase5b-scope]") ? "pass" : "needs-dom"
    },
    {
      check: "default-valid-scope",
      status: [PHASE5B_SCOPE_TOP25, PHASE5B_SCOPE_GAME].includes(selectedMlbBoardScope) ? "pass" : "fail"
    },
    {
      check: "game-selector-contract",
      status: phase5bGamesLoaded ? "pass" : "needs-data",
      detail: `${phase5bGames.length} games`
    },
    {
      check: "selected-game-valid",
      status: selectedMlbBoardScope === PHASE5B_SCOPE_TOP25 || game ? "pass" : "fail"
    },
    {
      check: "selected-game-rows",
      status: selectedMlbBoardScope === PHASE5B_SCOPE_TOP25 || rows.length > 0 ? "pass" : "fail",
      detail: `${rows.length} rows`
    },
    {
      check: "team-board-retained",
      status: document.getElementById("hotView") ? "pass" : "fail"
    }
  ];

  console.table(checks);
  window.phase5bSelfTest = checks;
  return checks;
}

window.phase5bSetScope = phase5bSetScope;
window.phase5bSetGame = phase5bSetGame;
window.runPhase5bSelfTest = runPhase5bSelfTest;
window.runPhase5bContractTest = runPhase5bContractTest;

phase5bLoadGames();

/* ===== Consolidated JS from phase5c.js ===== */
/* =========================================================
   MLB Hit Board — Phase 5C
   Selected-game starting-pitcher matchup card
   Reuses the Team Hit Board Home/Away SP interaction pattern.
   Build: phase5c-selected-game-pitcher-card-20260812
   ========================================================= */

console.info("MLB Hit Lab Phase 5C loaded: phase5c-selected-game-pitcher-card-20260812");

let phase5cPitcherSide =
  localStorage.getItem("mlbSelectedPitcherSide") === "away" ? "away" : "home";

let phase5cPitcherRows = [];
let phase5cPitchersLoaded = false;
let phase5cPitchersLoading = false;

const phase5cPreviousRenderMlbHitBoardPage = renderMlbHitBoardPage;

function phase5cSelectedGameContextRows() {
  const game = phase5bSelectedGame?.();
  if (!game) return [];

  return (phase5cPitcherRows || [])
    .filter((row) => String(row.game_pk) === String(game.game_pk))
    .sort((a, b) => String(a.pitcher_side).localeCompare(String(b.pitcher_side)));
}

function phase5cPitcherForSide(side = phase5cPitcherSide) {
  return phase5cSelectedGameContextRows().find(
    (row) => String(row.pitcher_side).toLowerCase() === String(side).toLowerCase()
  ) || null;
}

function phase5cFormatAvg(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(3).replace(/^0/, "");
}

function phase5cFormatRate(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

function phase5cPitcherRoleLabel(side) {
  return side === "home" ? "Home Starting Pitcher" : "Away Starting Pitcher";
}

function phase5cGameTitle(game) {
  if (!game) return "Selected MLB Matchup";
  return `${game.away_team_name || "Away"} at ${game.home_team_name || "Home"}`;
}

function phase5cGameSubtitle(game, pitcher = null) {
  if (!game) return "";

  const pieces = [];
  if (game.game_time_utc) {
    pieces.push(formatEasternGameTime(game.game_time_utc));
  }
  if (game.venue_name) pieces.push(game.venue_name);

  return pieces.filter(Boolean).join(" · ");
}

function phase5cRenderPitcherToggle(game, contextRows) {
  const home = contextRows.find((row) => row.pitcher_side === "home");
  const away = contextRows.find((row) => row.pitcher_side === "away");

  return `
    <div class="segmented phase5c-pitcher-toggle" role="group" aria-label="Starting pitcher">
      <button
        class="segment ${phase5cPitcherSide === "home" ? "active" : ""}"
        type="button"
        data-phase5c-pitcher-side="home"
        aria-pressed="${phase5cPitcherSide === "home"}"
        ${home ? "" : "disabled"}
      >
        Home SP · ${escapeHtml(game?.home_team_name || home?.pitcher_team_name || "Home")}
      </button>
      <button
        class="segment ${phase5cPitcherSide === "away" ? "active" : ""}"
        type="button"
        data-phase5c-pitcher-side="away"
        aria-pressed="${phase5cPitcherSide === "away"}"
        ${away ? "" : "disabled"}
      >
        Away SP · ${escapeHtml(game?.away_team_name || away?.pitcher_team_name || "Away")}
      </button>
    </div>
  `;
}

function phase5cRenderSelectedGamePitcherCard() {
  const game = phase5bSelectedGame?.();
  if (!game) return "";

  const contextRows = phase5cSelectedGameContextRows();
  const pitcher = phase5cPitcherForSide();

  if (phase5cPitchersLoading && !phase5cPitchersLoaded) {
    return `
      <section class="matchup-hero phase5c-selected-game-matchup">
        <div class="matchup-header">
          <div>
            <div class="eyebrow">⚾ Today's Matchup</div>
            <h2>${escapeHtml(phase5cGameTitle(game))}</h2>
            <p class="matchup-subtitle">${escapeHtml(phase5cGameSubtitle(game))}</p>
          </div>
          <div class="matchup-score-pill">Matchup Model</div>
        </div>
        <div class="phase5c-loading-state">Loading starting-pitcher context…</div>
      </section>
    `;
  }

  if (!pitcher) {
    return `
      <section class="matchup-hero phase5c-selected-game-matchup">
        <div class="matchup-header">
          <div>
            <div class="eyebrow">⚾ Today's Matchup</div>
            <h2>${escapeHtml(phase5cGameTitle(game))}</h2>
            <p class="matchup-subtitle">${escapeHtml(phase5cGameSubtitle(game))}</p>
          </div>
          ${phase5cRenderPitcherToggle(game, contextRows)}
        </div>
        <div class="phase5c-loading-state">
          Starting-pitcher context is not available for the selected side.
        </div>
      </section>
    `;
  }

  return `
    <section class="matchup-hero phase5c-selected-game-matchup">
      <div class="matchup-header phase5c-matchup-header">
        <div>
          <div class="eyebrow">⚾ Today's Matchup</div>
          <h2>${escapeHtml(phase5cGameTitle(game))}</h2>
          <p class="matchup-subtitle">${escapeHtml(phase5cGameSubtitle(game, pitcher))}</p>
        </div>

        <div class="phase5c-matchup-actions">
          ${phase5cRenderPitcherToggle(game, contextRows)}
          <div class="matchup-score-pill">Matchup Model</div>
        </div>
      </div>

      <div class="phase5c-metric-context">
        <strong>Matchup Pitcher</strong>
        <span>Recent form and handedness splits</span>
      </div>

      <div class="matchup-grid phase5c-pitcher-grid">
        <article class="matchup-stat-card">
          <div class="label">${escapeHtml(phase5cPitcherRoleLabel(phase5cPitcherSide))}</div>
          <div class="value">${escapeHtml(pitcher.pitcher_name || "—")}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">Throws</div>
          <div class="value">${escapeHtml(pitcher.pitcher_throws || "—")}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">Last 5 ERA</div>
          <div class="value">${escapeHtml(phase5cFormatRate(pitcher.last5_era))}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">Last 5 WHIP</div>
          <div class="value">${escapeHtml(phase5cFormatRate(pitcher.last5_whip))}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">BAA vs LHB</div>
          <div class="value">${escapeHtml(phase5cFormatAvg(pitcher.baa_vs_lhb))}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">BAA vs RHB</div>
          <div class="value">${escapeHtml(phase5cFormatAvg(pitcher.baa_vs_rhb))}</div>
        </article>
      </div>
    </section>
  `;
}

function phase5cReplaceMatchupCard() {
  if (selectedMlbBoardScope !== PHASE5B_SCOPE_GAME) return;

  const content = document.getElementById("mlbHitBoardContent");
  if (!content) return;

  const currentCard = content.querySelector(".matchup-hero");
  if (!currentCard) return;

  currentCard.outerHTML = phase5cRenderSelectedGamePitcherCard();
}

renderMlbHitBoardPage = function renderMlbHitBoardPagePhase5c(error = null) {
  const result = phase5cPreviousRenderMlbHitBoardPage(error);

  if (selectedMlbBoardScope === PHASE5B_SCOPE_GAME) {
    phase5cReplaceMatchupCard();
  }

  return result;
};

async function phase5cLoadPitcherContext(force = false) {
  if (phase5cPitchersLoading) return;
  if (phase5cPitchersLoaded && !force) return;

  phase5cPitchersLoading = true;

  try {
    const { data, error } = await client
      .from("v_mlb_game_starting_pitcher_context")
      .select("*")
      .order("prediction_run_date", { ascending: false })
      .order("game_pk", { ascending: true })
      .order("pitcher_side", { ascending: true });

    if (error) throw error;

    const raw = data || [];
    const latestDate = raw[0]?.prediction_run_date || null;

    phase5cPitcherRows = raw.filter(
      (row) => !latestDate || row.prediction_run_date === latestDate
    );

    phase5cPitchersLoaded = true;

    const currentRows = phase5cSelectedGameContextRows();
    if (!currentRows.some((row) => row.pitcher_side === phase5cPitcherSide)) {
      phase5cPitcherSide =
        currentRows.some((row) => row.pitcher_side === "home") ? "home" :
        currentRows.some((row) => row.pitcher_side === "away") ? "away" :
        "home";
    }

    if (selectedMlbBoardScope === PHASE5B_SCOPE_GAME) {
      phase5cReplaceMatchupCard();
    }
  } catch (err) {
    console.error("Phase 5C pitcher-context load failed:", err);
    phase5cPitcherRows = [];
    phase5cPitchersLoaded = false;
    if (selectedMlbBoardScope === PHASE5B_SCOPE_GAME) {
      phase5cReplaceMatchupCard();
    }
  } finally {
    phase5cPitchersLoading = false;
  }
}

function phase5cSetPitcherSide(side) {
  if (!["home", "away"].includes(side)) return;

  const available = phase5cSelectedGameContextRows().some(
    (row) => row.pitcher_side === side
  );
  if (!available) return;

  phase5cPitcherSide = side;
  localStorage.setItem("mlbSelectedPitcherSide", side);
  phase5cReplaceMatchupCard();
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-phase5c-pitcher-side]");
  if (!button) return;

  event.preventDefault();
  phase5cSetPitcherSide(button.dataset.phase5cPitcherSide);
});

document.getElementById("refreshButton")?.addEventListener("click", () => {
  phase5cPitchersLoaded = false;
  setTimeout(() => phase5cLoadPitcherContext(true), 0);
});

async function runPhase5cContractTest() {
  const results = [];

  try {
    const { data, error } = await client
      .from("v_mlb_game_starting_pitcher_context")
      .select("prediction_run_date,game_pk,pitcher_side,pitcher_id,pitcher_name,pitcher_team_name,pitcher_throws,last5_era,last5_whip,baa_vs_lhb,baa_vs_rhb")
      .order("prediction_run_date", { ascending: false });

    if (error) throw error;

    const raw = data || [];
    const latestDate = raw[0]?.prediction_run_date || null;
    const rows = raw.filter(
      (row) => !latestDate || row.prediction_run_date === latestDate
    );

    const byGame = new Map();
    rows.forEach((row) => {
      const key = String(row.game_pk);
      const group = byGame.get(key) || [];
      group.push(row);
      byGame.set(key, group);
    });

    const everyGameTwoSides = [...byGame.values()].every((group) => {
      const sides = new Set(group.map((row) => row.pitcher_side));
      return group.length === 2 && sides.has("home") && sides.has("away");
    });

    const duplicateSideKeys = rows.length !== new Set(
      rows.map((row) => `${row.game_pk}|${row.pitcher_side}`)
    ).size;

    results.push(
      {
        check: "pitcher-context-loaded",
        status: rows.length > 0 ? "pass" : "fail",
        detail: `${rows.length} pitcher rows`
      },
      {
        check: "two-sides-per-game",
        status: everyGameTwoSides ? "pass" : "fail",
        detail: `${byGame.size} games`
      },
      {
        check: "no-duplicate-game-side",
        status: duplicateSideKeys ? "fail" : "pass"
      },
      {
        check: "metric-contract",
        status: rows.every((row) =>
          row.pitcher_id &&
          row.pitcher_name &&
          ["home", "away"].includes(row.pitcher_side)
        ) ? "pass" : "fail"
      }
    );
  } catch (err) {
    results.push({
      check: "phase5c-contract-runtime",
      status: "fail",
      detail: err.message || String(err)
    });
  }

  console.table(results);
  window.phase5cContractTest = results;
  return results;
}

function runPhase5cSelfTest() {
  const gameRows = phase5cSelectedGameContextRows();
  const checks = [
    {
      check: "top25-unchanged",
      status: selectedMlbBoardScope === PHASE5B_SCOPE_TOP25
        ? !document.querySelector(".phase5c-selected-game-matchup") ? "pass" : "fail"
        : "not-active"
    },
    {
      check: "selected-game-card",
      status: selectedMlbBoardScope === PHASE5B_SCOPE_GAME
        ? document.querySelector(".phase5c-selected-game-matchup") ? "pass" : "fail"
        : "not-active"
    },
    {
      check: "home-away-toggle",
      status: selectedMlbBoardScope === PHASE5B_SCOPE_GAME && phase5cPitchersLoaded
        ? gameRows.some((row) => row.pitcher_side === "home") &&
          gameRows.some((row) => row.pitcher_side === "away") ? "pass" : "fail"
        : "needs-data"
    },
    {
      check: "team-board-retained",
      status: document.getElementById("hotView") ? "pass" : "fail"
    }
  ];

  console.table(checks);
  window.phase5cSelfTest = checks;
  return checks;
}

window.phase5cSetPitcherSide = phase5cSetPitcherSide;
window.runPhase5cSelfTest = runPhase5cSelfTest;
window.runPhase5cContractTest = runPhase5cContractTest;

phase5cLoadPitcherContext();

/* ===== Consolidated JS from phase5d.js ===== */
/* =========================================================
   MLB Hit Board — Phase 5D
   Target-aware selected-game starting-pitcher metrics
   Keeps the Phase 5C card shell and Home/Away SP toggle.
   Build: phase5d-target-aware-pitcher-metrics-20260812
   ========================================================= */

console.info("MLB Hit Lab Phase 5D loaded: phase5d-target-aware-pitcher-metrics-20260812");

const PHASE5D_MIN_CONTACT_BBE = 25;

function phase5dFormatPct(value, digits = 1) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const pct = Math.abs(n) <= 1 ? n * 100 : n;
  return `${pct.toFixed(digits)}%`;
}

function phase5dFormatFactor(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

function phase5dContactMetric(pitcher, key) {
  const bbe = Number(pitcher?.pitcher_contact_bbe_30d);
  const available = pitcher?.contact_feature_available;
  const value = pitcher?.[key];

  if (
    available === false ||
    !Number.isFinite(bbe) ||
    bbe < PHASE5D_MIN_CONTACT_BBE ||
    value === null ||
    value === undefined
  ) {
    return {
      value: "—",
      sub: Number.isFinite(bbe) ? `Limited sample · ${bbe} BBE` : "Limited sample"
    };
  }

  return {
    value: phase5dFormatPct(value),
    sub: `30d · ${bbe} BBE`
  };
}

function phase5dMetric(label, value, sub = "") {
  return `
    <article class="matchup-stat-card phase5d-metric-card">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(value ?? "—")}</div>
      ${sub ? `<small class="phase5d-metric-sub">${escapeHtml(sub)}</small>` : ""}
    </article>
  `;
}

function phase5dPitcherMetrics(pitcher) {
  const roleLabel = phase5cPitcherRoleLabel(phase5cPitcherSide);
  const role = phase5dMetric(roleLabel, pitcher?.pitcher_name || "—");
  const throws = phase5dMetric("Throws", pitcher?.pitcher_throws || "—");

  if (selectedMlbPredictionTarget === "home_run_1plus") {
    const barrel = phase5dContactMetric(pitcher, "barrel_rate_allowed_30d");
    const hardHit = phase5dContactMetric(pitcher, "hard_hit_rate_allowed_30d");
    const starts = Number(pitcher?.last5_starts);
    const hrAllowed = pitcher?.last5_home_runs_allowed;

    return [
      role,
      throws,
      phase5dMetric(
        "HR Allowed · Recent Starts",
        hrAllowed === null || hrAllowed === undefined ? "—" : String(hrAllowed),
        Number.isFinite(starts) && starts > 0 ? `${starts} recent starts` : "No recent-start sample"
      ),
      phase5dMetric("Hard-Hit Allowed · 30d", hardHit.value, hardHit.sub),
      phase5dMetric("Barrel Allowed · 30d", barrel.value, barrel.sub),
      phase5dMetric("HR Park Factor", phase5dFormatFactor(pitcher?.park_hr_factor), "1.00 = neutral")
    ];
  }

  if (selectedMlbPredictionTarget === "total_bases_2plus") {
    const barrel = phase5dContactMetric(pitcher, "barrel_rate_allowed_30d");
    const hardHit = phase5dContactMetric(pitcher, "hard_hit_rate_allowed_30d");

    return [
      role,
      throws,
      phase5dMetric("Last 5 WHIP", phase5cFormatRate(pitcher?.last5_whip)),
      phase5dMetric("Hard-Hit Allowed · 30d", hardHit.value, hardHit.sub),
      phase5dMetric("Barrel Allowed · 30d", barrel.value, barrel.sub),
      phase5dMetric("Hit Park Factor", phase5dFormatFactor(pitcher?.park_hit_factor), "1.00 = neutral")
    ];
  }

  return [
    role,
    throws,
    phase5dMetric("Last 5 ERA", phase5cFormatRate(pitcher?.last5_era)),
    phase5dMetric("Last 5 WHIP", phase5cFormatRate(pitcher?.last5_whip)),
    phase5dMetric("BAA vs LHB", phase5cFormatAvg(pitcher?.baa_vs_lhb)),
    phase5dMetric("BAA vs RHB", phase5cFormatAvg(pitcher?.baa_vs_rhb))
  ];
}

function phase5dMetricContextCopy() {
  if (selectedMlbPredictionTarget === "home_run_1plus") {
    return "Power damage, contact quality, and home-run environment";
  }
  if (selectedMlbPredictionTarget === "total_bases_2plus") {
    return "Extra-base damage, contact quality, and park environment";
  }
  return "Recent form and handedness splits";
}

phase5cRenderSelectedGamePitcherCard = function phase5dRenderSelectedGamePitcherCard() {
  const game = phase5bSelectedGame?.();
  if (!game) return "";

  const contextRows = phase5cSelectedGameContextRows();
  const pitcher = phase5cPitcherForSide();

  if (phase5cPitchersLoading && !phase5cPitchersLoaded) {
    return `
      <section class="matchup-hero phase5c-selected-game-matchup phase5d-target-aware-matchup">
        <div class="matchup-header">
          <div>
            <div class="eyebrow">⚾ Today's Matchup</div>
            <h2>${escapeHtml(phase5cGameTitle(game))}</h2>
            <p class="matchup-subtitle">${escapeHtml(phase5cGameSubtitle(game))}</p>
          </div>
          <div class="matchup-score-pill">Matchup Model</div>
        </div>
        <div class="phase5c-loading-state">Loading starting-pitcher context…</div>
      </section>
    `;
  }

  if (!pitcher) {
    return `
      <section class="matchup-hero phase5c-selected-game-matchup phase5d-target-aware-matchup">
        <div class="matchup-header">
          <div>
            <div class="eyebrow">⚾ Today's Matchup</div>
            <h2>${escapeHtml(phase5cGameTitle(game))}</h2>
            <p class="matchup-subtitle">${escapeHtml(phase5cGameSubtitle(game))}</p>
          </div>
          ${phase5cRenderPitcherToggle(game, contextRows)}
        </div>
        <div class="phase5c-loading-state">Starting-pitcher context is not available for the selected side.</div>
      </section>
    `;
  }

  const metrics = phase5dPitcherMetrics(pitcher);

  return `
    <section class="matchup-hero phase5c-selected-game-matchup phase5d-target-aware-matchup">
      <div class="matchup-header phase5c-matchup-header">
        <div>
          <div class="eyebrow">⚾ Today's Matchup</div>
          <h2>${escapeHtml(phase5cGameTitle(game))}</h2>
          <p class="matchup-subtitle">${escapeHtml(phase5cGameSubtitle(game, pitcher))}</p>
        </div>

        <div class="phase5c-matchup-actions">
          ${phase5cRenderPitcherToggle(game, contextRows)}
          <div class="matchup-score-pill">${escapeHtml(phase4bConfig().matchupLabel)}</div>
        </div>
      </div>

      <div class="phase5c-metric-context">
        <strong>Matchup Pitcher</strong>
        <span>${escapeHtml(phase5dMetricContextCopy())}</span>
      </div>

      <div class="matchup-grid phase5c-pitcher-grid phase5d-pitcher-grid">
        ${metrics.join("")}
      </div>
    </section>
  `;
};

async function runPhase5dSelfTest() {
  const pitcher = phase5cPitcherForSide();
  const metrics = pitcher ? phase5dPitcherMetrics(pitcher) : [];
  const checks = [
    {
      check: "six-metrics-rendered",
      status: pitcher ? metrics.length === 6 ? "pass" : "fail" : "needs-data"
    },
    {
      check: "target-aware-context",
      status: ["hit_1plus", "total_bases_2plus", "home_run_1plus"].includes(selectedMlbPredictionTarget) ? "pass" : "fail"
    },
    {
      check: "sample-guard-field",
      status: pitcher && selectedMlbPredictionTarget !== "hit_1plus"
        ? pitcher.pitcher_contact_bbe_30d !== undefined ? "pass" : "fail"
        : "not-required"
    },
    {
      check: "limited-sample-suppression",
      status: pitcher && selectedMlbPredictionTarget !== "hit_1plus" && Number(pitcher.pitcher_contact_bbe_30d) < PHASE5D_MIN_CONTACT_BBE
        ? metrics.join("").includes("Limited sample") ? "pass" : "fail"
        : "not-active"
    }
  ];

  console.table(checks);
  window.phase5dSelfTest = checks;
  return checks;
}

window.runPhase5dSelfTest = runPhase5dSelfTest;

// Repaint if the user lands directly on Select Game after all prior layers load.
if (selectedMlbBoardScope === PHASE5B_SCOPE_GAME) {
  phase5cReplaceMatchupCard();
}
