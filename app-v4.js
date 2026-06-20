const SUPABASE_URL = "https://squcmdsivnnxzblsfciu.supabase.co";
const SUPABASE_KEY = "sb_publishable_pumFxQJ7pYyRC8lrjSvtZA_x63TVYtq";

const TEAM_ID = 113;
const SEASON = 2026;
const PERFORMANCE_WINDOWS = [3, 5, 6, 10, 15];

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let selectedWindow = 10;
let performanceWindow = 10;
let compareWindow = 10;
let hotRows = [];
let splitRows = [];
let matchupRows = [];
let bvpRows = [];
let pitcherHandSplits = { lhb: null, rhb: null };
let performanceSummary = null;
let topPickPerformance = null;
let componentAnalysis = null;
let yesterdayTopPick = null;
let rankAnalysisRows = [];
let pitcherVulnerabilityRows = [];
let comparisonRows = [];
let compareBoardHotRows = [];
let compareBoardMatchupRows = [];
let mlbRows = [];
let mlbWindow = 10;
let searchTerm = "";

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

function findHot(playerId) {
  return hotRows.find((x) => String(x.player_id) === String(playerId));
}

function findSplit(playerId) {
  return splitRows.find((x) => String(x.player_id) === String(playerId));
}

function findMatchup(playerId) {
  return matchupRows.find((x) => String(x.player_id) === String(playerId));
}

function findBvp(playerId) {
  return bvpRows.find((x) => String(x.player_id) === String(playerId));
}

function filteredRows() {
  const q = searchTerm.trim().toLowerCase();
  if (!q) return hotRows;
  return hotRows.filter((x) => String(x.full_name || "").toLowerCase().includes(q));
}

async function loadHotData() {
  try {
    setText("activeWindowLabel", `Player Last ${selectedWindow} Games`);
    setText("statusPill", "Loading...");

    setHtml("hittersTableBody", `
      <tr>
        <td colspan="18" class="empty-state">Loading Reds hitter data...</td>
      </tr>
    `);

    const { data, error } = await client.rpc("get_team_hot_hitters", {
      p_team_id: TEAM_ID,
      p_last_n: selectedWindow
    });

    if (error) throw error;

    hotRows = (data || [])
      .filter(isRealPlayer)
      .sort((a, b) => Number(b.hot_score || 0) - Number(a.hot_score || 0));

    setText("statusPill", `${hotRows.length} hitters · Player last ${selectedWindow} games`);
    setText("lastRefresh", `Last refresh: ${new Date().toLocaleString()}`);

    setText("heroPlayer", "Loading matchup model...");
    setText("heroScore", "Matchup Score —");
    setText("heroNarrative", "Waiting for today’s matchup scores before selecting the Top Signal.");
    renderKpis();
    renderTable();

    await Promise.all([
      loadSplitsData(),
      loadMatchupData(),
      loadBvpData(),
      loadPerformanceData()
    ]);

    await loadPitcherHandSplits();

    // Re-render hero after matchup data loads so Top Signal uses matchup score, not hot score fallback.
    renderHero();
    renderMatchupHero();
    renderTable();
  } catch (err) {
    console.error(err);
    setText("statusPill", "Error");
    setHtml("hittersTableBody", `
      <tr>
        <td colspan="18" class="empty-state">Error loading data: ${err.message || err}</td>
      </tr>
    `);
  }
}

async function loadSplitsData() {
  try {
    const { data, error } = await client.rpc("get_team_batting_splits", {
      p_team_id: TEAM_ID,
      p_season: SEASON
    });

    if (error) throw error;

    splitRows = (data || []).filter(isRealPlayer);
  } catch (err) {
    console.error("Error loading splits:", err);
  }
}

async function loadMatchupData() {
  try {
    const { data, error } = await client.rpc("get_today_reds_batter_matchups", {
      p_team_id: TEAM_ID,
      p_last_n: selectedWindow
    });

    if (error) throw error;

    matchupRows = (data || []).filter(isRealPlayer);
  } catch (err) {
    console.error("Error loading matchup data:", err);
    matchupRows = [];
  }
}

async function loadPitcherHandSplits() {
  const starter = matchupRows[0];

  pitcherHandSplits = { lhb: null, rhb: null };

  if (!starter?.pitcher_id) {
    return;
  }

  try {
    const { data, error } = await client
      .from("mlb_pitcher_splits")
      .select("split_value, batting_average_against, at_bats_against, hits_allowed")
      .eq("pitcher_id", starter.pitcher_id)
      .eq("season", SEASON)
      .eq("split_type", "batter_hand")
      .in("split_value", ["LHB", "RHB"]);

    if (error) throw error;

    (data || []).forEach((row) => {
      if (row.split_value === "LHB") pitcherHandSplits.lhb = row;
      if (row.split_value === "RHB") pitcherHandSplits.rhb = row;
    });
  } catch (err) {
    console.error("Error loading pitcher handedness splits:", err);
    pitcherHandSplits = { lhb: null, rhb: null };
  }
}

async function loadBvpData() {
  try {
    const { data, error } = await client
      .from("v_today_batter_vs_pitcher")
      .select("*");

    if (error) throw error;

    bvpRows = data || [];
  } catch (err) {
    console.error("Error loading batter-vs-pitcher history:", err);
    bvpRows = [];
  }
}

async function loadPerformanceData() {
  try {
    const [
      summaryResult,
      topPickResult,
      componentResult,
      yesterdayResult,
      rankResult,
      pitcherVulnerabilityResult
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
        .order("bucket_sort", { ascending: true })
    ]);

    if (summaryResult.error) throw summaryResult.error;
    if (topPickResult.error) throw topPickResult.error;
    if (componentResult.error) throw componentResult.error;
    if (yesterdayResult.error) throw yesterdayResult.error;
    if (rankResult.error) throw rankResult.error;
    if (pitcherVulnerabilityResult.error) throw pitcherVulnerabilityResult.error;

    performanceSummary = summaryResult.data || null;
    topPickPerformance = topPickResult.data || null;
    componentAnalysis = componentResult.data || null;
    yesterdayTopPick = yesterdayResult.data || null;
    rankAnalysisRows = rankResult.data || [];
    pitcherVulnerabilityRows = pitcherVulnerabilityResult.data || [];

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

async function loadModelCompareData() {
  try {
    const [hotResult, matchupResult] = await Promise.all([
      client.rpc("get_team_hot_hitters", {
        p_team_id: TEAM_ID,
        p_last_n: compareWindow
      }),
      client.rpc("get_today_reds_batter_matchups", {
        p_team_id: TEAM_ID,
        p_last_n: compareWindow
      })
    ]);

    if (hotResult.error) throw hotResult.error;
    if (matchupResult.error) throw matchupResult.error;

    compareBoardHotRows = (hotResult.data || []).filter(isRealPlayer);
    compareBoardMatchupRows = (matchupResult.data || []).filter(isRealPlayer);

    renderModelComparePage();
  } catch (err) {
    console.error("Error loading experimental model board:", err);
    compareBoardHotRows = [];
    compareBoardMatchupRows = [];
    renderModelComparePage();
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

function renderPerformancePage() {
  // These IDs are intentionally defensive: if the HTML page has not been updated yet,
  // this function quietly does nothing instead of breaking the Hot Board.
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

  const summaryBody = $("performanceSummaryBody");
  if (summaryBody) {
    summaryBody.innerHTML = `
      <tr>
        <td>70+</td>
        <td class="num">${fmtNum(performanceSummary?.score_70_plus_count)}</td>
        <td class="num">${fmtRate(performanceSummary?.score_70_plus_hit_rate)}</td>
      </tr>
      <tr>
        <td>60–69</td>
        <td class="num">${fmtNum(performanceSummary?.score_60_69_count)}</td>
        <td class="num">${fmtRate(performanceSummary?.score_60_69_hit_rate)}</td>
      </tr>
      <tr>
        <td>50–59</td>
        <td class="num">${fmtNum(performanceSummary?.score_50_59_count)}</td>
        <td class="num">${fmtRate(performanceSummary?.score_50_59_hit_rate)}</td>
      </tr>
      <tr>
        <td>Below 50</td>
        <td class="num">${fmtNum(performanceSummary?.score_below_50_count)}</td>
        <td class="num">${fmtRate(performanceSummary?.score_below_50_hit_rate)}</td>
      </tr>
    `;
  }

  const componentBody = $("componentAnalysisBody");
  if (componentBody) {
    componentBody.innerHTML = `
      ${renderComponentRow("Recent Form", componentAnalysis?.avg_recent_form_when_hit, componentAnalysis?.avg_recent_form_when_no_hit)}
      ${renderComponentRow("Batter Split", componentAnalysis?.avg_batter_split_when_hit, componentAnalysis?.avg_batter_split_when_no_hit)}
      ${renderComponentRow("Pitcher Vulnerability", componentAnalysis?.avg_pitcher_vuln_when_hit, componentAnalysis?.avg_pitcher_vuln_when_no_hit)}
      ${renderComponentRow("Pitcher Recent Form", componentAnalysis?.avg_pitcher_recent_when_hit, componentAnalysis?.avg_pitcher_recent_when_no_hit)}
      ${renderComponentRow("Matchup Score", componentAnalysis?.avg_matchup_when_hit, componentAnalysis?.avg_matchup_when_no_hit)}
    `;
  }

  const content = $("performanceContent");
  if (content) {
    content.innerHTML = `
      ${renderPerformanceWindowSelector()}
      ${renderYesterdayTopPickCard()}

      <section class="hero-grid performance-grid">
        <article class="insight-card compact">
          <div class="metric-icon">🎯</div>
          <div class="metric-label">Top Pick</div>
          <div class="metric-value">${fmtRate(topPickPerformance?.top_1_hit_rate)}</div>
          <div class="metric-sub">${fmtNum(topPickPerformance?.top_1_scored)} scored · ${performanceWindow}-game model</div>
        </article>

        <article class="insight-card compact">
          <div class="metric-icon">🥇</div>
          <div class="metric-label">Top 3 Picks</div>
          <div class="metric-value">${fmtRate(topPickPerformance?.top_3_hit_rate)}</div>
          <div class="metric-sub">${fmtNum(topPickPerformance?.top_3_scored)} scored · ${performanceWindow}-game model</div>
        </article>

        <article class="insight-card compact">
          <div class="metric-icon">📊</div>
          <div class="metric-label">Top 5 Picks</div>
          <div class="metric-value">${fmtRate(topPickPerformance?.top_5_hit_rate)}</div>
          <div class="metric-sub">${fmtNum(topPickPerformance?.top_5_scored)} scored · ${performanceWindow}-game model</div>
        </article>

        <article class="insight-card compact">
          <div class="metric-icon">⚾</div>
          <div class="metric-label">Overall</div>
          <div class="metric-value">${fmtRate(topPickPerformance?.all_hit_rate || performanceSummary?.hit_rate)}</div>
          <div class="metric-sub">${fmtNum(performanceSummary?.predictions_with_ab)} with AB</div>
        </article>
      </section>

      <section class="board-card performance-card">
        <div class="board-header">
          <div>
            <div class="eyebrow">Score Buckets</div>
            <h2>Hit Rate by Matchup Score</h2>
          </div>
          <div class="board-meta">
            <span>${fmtNum(performanceSummary?.predictions_scored)} predictions scored</span>
            <span>${fmtNum(performanceSummary?.predictions_no_ab)} no-AB excluded</span>
          </div>
        </div>

        <div class="table-wrap">
          <table class="performance-table">
            <thead>
              <tr>
                <th>Score Bucket</th>
                <th class="num">Players</th>
                <th class="num">Hit Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>70+</td><td class="num">${fmtNum(performanceSummary?.score_70_plus_count)}</td><td class="num">${fmtRate(performanceSummary?.score_70_plus_hit_rate)}</td></tr>
              <tr><td>60–69</td><td class="num">${fmtNum(performanceSummary?.score_60_69_count)}</td><td class="num">${fmtRate(performanceSummary?.score_60_69_hit_rate)}</td></tr>
              <tr><td>50–59</td><td class="num">${fmtNum(performanceSummary?.score_50_59_count)}</td><td class="num">${fmtRate(performanceSummary?.score_50_59_hit_rate)}</td></tr>
              <tr><td>Below 50</td><td class="num">${fmtNum(performanceSummary?.score_below_50_count)}</td><td class="num">${fmtRate(performanceSummary?.score_below_50_hit_rate)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      
      <section class="board-card performance-card">
        <div class="board-header">
          <div>
            <div class="eyebrow">Prediction Rank Analysis</div>
            <h2>Hit Rate by Model Rank</h2>
          </div>
          <div class="board-meta">
            <span>Ranks 1–10</span>
            <span>Only players with AB counted</span>
          </div>
        </div>

        <div class="table-wrap">
          <table class="performance-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th class="num">Sample</th>
                <th class="num">Hit Rate</th>
              </tr>
            </thead>
            <tbody>
              ${renderRankAnalysisRows()}
            </tbody>
          </table>
        </div>
      </section>      <section class="board-card performance-card">
        <div class="board-header">
          <div>
            <div class="eyebrow">Weight Optimizer</div>
            <h2>Component Signal Check</h2>
          </div>
          <div class="board-meta">
            <span>${fmtNum(componentAnalysis?.sample_size)} player-games</span>
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
              ${renderComponentRow("Recent Form", componentAnalysis?.avg_recent_form_when_hit, componentAnalysis?.avg_recent_form_when_no_hit)}
              ${renderComponentRow("Batter Split", componentAnalysis?.avg_batter_split_when_hit, componentAnalysis?.avg_batter_split_when_no_hit)}
              ${renderComponentRow("Pitcher Vulnerability", componentAnalysis?.avg_pitcher_vuln_when_hit, componentAnalysis?.avg_pitcher_vuln_when_no_hit)}
              ${renderComponentRow("Pitcher Recent Form", componentAnalysis?.avg_pitcher_recent_when_hit, componentAnalysis?.avg_pitcher_recent_when_no_hit)}
              ${renderComponentRow("Matchup Score", componentAnalysis?.avg_matchup_when_hit, componentAnalysis?.avg_matchup_when_no_hit)}
            </tbody>
          </table>
        </div>

      <section class="board-card performance-card">
        <div class="board-header">
          <div>
            <div class="eyebrow">Pitcher Vulnerability Analysis</div>
            <h2>Hit Rate by Vulnerability Bucket</h2>
          </div>
          <div class="board-meta">
            <span>Starter-matchup signal check</span>
            <span>0-AB players excluded</span>
          </div>
        </div>

        <div class="table-wrap">
          <table class="performance-table">
            <thead>
              <tr>
                <th>Vulnerability Bucket</th>
                <th class="num">Sample</th>
                <th class="num">Hit Rate</th>
              </tr>
            </thead>
            <tbody>
              ${renderPitcherVulnerabilityRows()}
            </tbody>
          </table>
        </div>
      </section>



      </section>
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

        renderPerformancePage();
        await loadPerformanceData();
      });
    });
  }
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

function renderMatchupHero() {
  const first = matchupRows[0];

  if (!first) {
    setText("matchupOpponent", "No matchup loaded");
    setText(
      "matchupPitcher",
      "Run the matchup loader to populate today's or next game's probable starter."
    );

    setText("pitcherNameCard", "—");
    setText("pitcherThrows", "—");
    setText("pitcherEra", "—");
    setText("pitcherWhip", "—");
    setText("pitcherVsLhb", "—");
    setText("pitcherVsRhb", "—");
    return;
  }

  const timing = matchupTimingLabel(first.game_date);
  const gameDate = formatGameDate(first.game_date);
  const starterIsTbd = isPitcherTbd(first);
  const starterName = pitcherDisplayName(first);
  const starterThrows = pitcherDisplayThrows(first);

  setText(
    "matchupOpponent",
    `${timing}: Reds vs ${first.opponent_team_name || "Opponent"}`
  );

  setText(
    "matchupPitcher",
    starterIsTbd
      ? `${gameDate} · Probable starter TBD`
      : `${gameDate} · ${starterName}${first.pitcher_throws ? ` · ${first.pitcher_throws}HP` : ""}`
  );

  setText("pitcherNameCard", starterName);
  setText("pitcherThrows", starterThrows);
  setText("pitcherEra", starterIsTbd ? "—" : fmtDecimal(first.pitcher_last5_era, 2));
  setText("pitcherWhip", starterIsTbd ? "—" : fmtDecimal(first.pitcher_last5_whip, 2));
  setText("pitcherVsLhb", starterIsTbd ? "—" : fmtAvg(pitcherHandSplits.lhb?.batting_average_against));
  setText("pitcherVsRhb", starterIsTbd ? "—" : fmtAvg(pitcherHandSplits.rhb?.batting_average_against));
}


function rankingScore(row) {
  const matchup = findMatchup(row?.player_id);
  const matchupScore = Number(matchup?.matchup_score);
  if (Number.isFinite(matchupScore)) return matchupScore;
  return Number(row?.hot_score || 0);
}

function rankedRows() {
  return filteredRows().slice().sort((a, b) => {
    const scoreDelta = rankingScore(b) - rankingScore(a);
    if (scoreDelta !== 0) return scoreDelta;

    const hotDelta = Number(b.hot_score || 0) - Number(a.hot_score || 0);
    if (hotDelta !== 0) return hotDelta;

    return Number(b.hit_rate || 0) - Number(a.hit_rate || 0);
  });
}

function rankedAllRows() {
  return hotRows.slice().sort((a, b) => {
    const scoreDelta = rankingScore(b) - rankingScore(a);
    if (scoreDelta !== 0) return scoreDelta;

    const hotDelta = Number(b.hot_score || 0) - Number(a.hot_score || 0);
    if (hotDelta !== 0) return hotDelta;

    return Number(b.hit_rate || 0) - Number(a.hit_rate || 0);
  });
}


function topMatchupSignal() {
  const scoredMatchups = matchupRows
    .filter((row) => Number.isFinite(Number(row?.matchup_score)))
    .slice()
    .sort((a, b) => {
      const scoreDelta = Number(b.matchup_score || 0) - Number(a.matchup_score || 0);
      if (scoreDelta !== 0) return scoreDelta;

      const bHot = hotRows.find((x) => String(x.player_id) === String(b.player_id));
      const aHot = hotRows.find((x) => String(x.player_id) === String(a.player_id));
      return Number(bHot?.hot_score || 0) - Number(aHot?.hot_score || 0);
    });

  const matchup = scoredMatchups[0] || null;
  if (!matchup) return { player: null, matchup: null };

  const player =
    hotRows.find((row) => String(row.player_id) === String(matchup.player_id)) ||
    matchup;

  return { player, matchup };
}

function renderHero() {
  if (!hotRows.length) {
    setText("heroPlayer", "—");
    setText("heroScore", "Matchup Score —");
    setText("heroNarrative", "No hitter data returned.");
    return;
  }

  if (!matchupRows.length) {
    setText("heroPlayer", "Loading matchup model...");
    setText("heroScore", "Matchup Score —");
    setText("heroNarrative", "Waiting for today’s matchup scores before selecting the Top Signal.");
    return;
  }

  const { player: top, matchup: topMatchup } = topMatchupSignal();

  if (!top || !topMatchup) {
    setText("heroPlayer", "—");
    setText("heroScore", "Matchup Score —");
    setText("heroNarrative", "No matchup score returned for the current board.");
    return;
  }

  const heat = heatMeta(top.heat_label);

  setText("heroPlayer", `${heat.emoji} ${top.full_name}`);
  setText(
    "heroScore",
    `Matchup Score ${fmtDecimal(topMatchup.matchup_score, 1)} · Hot Score ${Number(top.hot_score || 0).toFixed(1)}`
  );
  setText(
    "heroNarrative",
    `${top.full_name} leads the matchup board with the highest Matchup Score, driven by recent form, batter split, pitcher vulnerability, and pitcher recent form.`
  );
}

function renderKpis() {
  if (!hotRows.length) return;

  const minAb = Math.max(5, selectedWindow * 1.5);

  const bestAvg = [...hotRows]
    .filter((x) => Number(x.at_bats || 0) >= minAb)
    .sort((a, b) => Number(b.batting_average || 0) - Number(a.batting_average || 0))[0];

  const mostHr = [...hotRows].sort((a, b) => Number(b.home_runs || 0) - Number(a.home_runs || 0))[0];
  const bestHitRate = [...hotRows].sort((a, b) => Number(b.hit_rate || 0) - Number(a.hit_rate || 0))[0];

  if (bestAvg) {
    setText("kpiAvg", bestAvg.full_name);
    setText("kpiAvgSub", `${fmtAvg(bestAvg.batting_average)} AVG · ${bestAvg.hits} hits`);
  }

  if (mostHr) {
    setText("kpiHr", mostHr.full_name);
    setText("kpiHrSub", `${mostHr.home_runs} HR · ${mostHr.rbi} RBI`);
  }

  if (bestHitRate) {
    setText("kpiHitRate", bestHitRate.full_name);
    setText("kpiHitRateSub", `${fmtPct(bestHitRate.hit_rate)} · ${bestHitRate.games_with_hit}/${bestHitRate.games} games`);
  }
}

function renderTable() {
  const rows = rankedRows();

  if (!rows.length) {
    setHtml("hittersTableBody", `
      <tr>
        <td colspan="18" class="empty-state">No hitters match your search.</td>
      </tr>
    `);
    return;
  }

  const html = rows.map((row, index) => {
    const heat = heatMeta(row.heat_label);
    const score = Number(row.hot_score || 0);
    const scoreWidth = Math.max(4, Math.min(100, score));
    const matchup = findMatchup(row.player_id);
    const tier = matchupTier(matchup?.matchup_score);

    return `
      <tr class="clickable-row" data-player-id="${row.player_id}">
        <td class="rank"><span class="rank-badge">${index + 1}</span></td>

        <td>
          <span class="heat-badge ${heat.className}">
            <span>${heat.emoji}</span>
            <span>${heat.label}</span>
          </span>
        </td>

        <td>
          <div class="player-cell">
            <div class="avatar ${handednessBadge(row).toLowerCase()}">${handednessBadge(row)}</div>
            <div>
              <div class="player-name">${row.full_name}</div>
              <div class="player-sub">${row.games_with_hit}/${row.games} games with hit · ${row.extra_base_hits} XBH · click for matchup</div>
            </div>
          </div>
        </td>

        <td class="num">
          ${
            matchup
              ? `<span class="matchup-badge ${tier.className}">${fmtDecimal(matchup.matchup_score, 1)} · ${tier.label}</span>`
              : `<span class="matchup-badge matchup-neutral">—</span>`
          }
        </td>

        <td class="num">
          <div class="score-bar-wrap">
            <div class="score-bar">
              <div class="score-bar-fill" style="width: ${scoreWidth}%"></div>
            </div>
            <span class="score-value">${score.toFixed(1)}</span>
          </div>
        </td>

        <td class="num">${fmtPct(row.hit_rate)}</td>
        <td class="num">${fmtNum(row.current_hit_streak)}</td>
        <td class="num">${fmtAvg(row.batting_average)}</td>
        <td class="num">${fmtNum(row.at_bats)}</td>
        <td class="num">${fmtNum(row.hits)}</td>
        <td class="num">${fmtNum(row.doubles)}</td>
        <td class="num">${fmtNum(row.triples)}</td>
        <td class="num">${fmtNum(row.home_runs)}</td>
        <td class="num">${fmtNum(row.walks)}</td>
        <td class="num">${fmtNum(row.stolen_bases)}</td>
        <td class="num">${fmtNum(row.rbi)}</td>
        <td class="num">${fmtNum(row.strikeouts)}</td>
        <td>${row.latest_game_date || "—"}</td>
      </tr>
    `;
  }).join("");

  setHtml("hittersTableBody", html);
}
function confidenceLabel(matchup) {
  if (!matchup) return "—";

  const batterReliability = Number(matchup.batter_split_reliability || 0);
  const pitcherReliability = Number(matchup.pitcher_split_reliability || 0);

  // Confidence should reflect the hitter split more than the pitcher split,
  // but not punish too harshly when the pitcher-side sample is meaningful.
  const confidenceScore =
    (batterReliability * 0.60) +
    (pitcherReliability * 0.40);

  if (confidenceScore >= 0.50) return "High";
  if (confidenceScore >= 0.25) return "Medium";
  return "Low";
}

function breakdownRow(label, score, weight, note) {
  const s = Number(score || 0);
  const contribution = s * weight;
  const width = Math.max(4, Math.min(100, s));

  return `
    <div class="breakdown-row">
      <div class="breakdown-top">
        <div>
          <strong>${label}</strong>
          <span>${note}</span>
        </div>
        <div class="breakdown-score">${s.toFixed(1)}</div>
      </div>

      <div class="breakdown-bar">
        <div class="breakdown-fill" style="width: ${width}%"></div>
      </div>

      <div class="breakdown-contribution">
        Weight ${(weight * 100).toFixed(0)}% · Contribution +${contribution.toFixed(1)}
      </div>
    </div>
  `;
}

function renderScoreBreakdown(matchup) {
  const el = $("drawerScoreBreakdown");
  if (!el) return;

  if (!matchup) {
    el.innerHTML = `<div class="empty-mini">No matchup breakdown available.</div>`;
    return;
  }

  const confidence = confidenceLabel(matchup);

  el.innerHTML = `
    <div class="confidence-pill">
      Confidence: ${confidence}
      <span>
        Batter reliability ${Math.round(Number(matchup.batter_split_reliability || 0) * 100)}% ·
        Pitcher reliability ${Math.round(Number(matchup.pitcher_split_reliability || 0) * 100)}%
      </span>
    </div>

    ${breakdownRow(
      "Recent Form",
      matchup.recent_form_score,
      0.40,
      `Last ${selectedWindow} games`
    )}

    ${breakdownRow(
      "Batter Split",
      matchup.batter_split_score,
      0.30,
      `${matchup.batter_split_label || "Split"} · ${fmtAvg(matchup.batter_split_avg)} AVG · ${fmtNum(matchup.batter_split_ab)} AB`
    )}

    ${breakdownRow(
      "Pitcher Vulnerability",
      matchup.pitcher_vulnerability_score,
      0.20,
      `${matchup.pitcher_split_label || "Pitcher split"} · ${fmtAvg(matchup.pitcher_baa_split)} BAA`
    )}

    ${breakdownRow(
      "Pitcher Recent Form",
      matchup.pitcher_recent_form_score,
      0.10,
      `Last 5 starts · ${fmtDecimal(matchup.pitcher_last5_era, 2)} ERA · ${fmtDecimal(matchup.pitcher_last5_whip, 2)} WHIP`
    )}
  `;
}

function renderBvpSection(bvp, matchup) {
  const pitcherName = isPitcherTbd(matchup)
    ? "TBD probable starter"
    : (bvp?.pitcher_name || matchup?.pitcher_name || "today's pitcher");

  if (!bvp) {
    return `
      <section class="drawer-section">
        <div class="drawer-section-title">Vs Today’s Pitcher</div>
        <p class="drawer-explanation">
          No prior plate appearances against ${pitcherName}.
        </p>
      </section>
    `;
  }

  return `
    <section class="drawer-section">
      <div class="drawer-section-title">Vs Today’s Pitcher</div>
      <p class="drawer-explanation">
        Career history vs ${pitcherName}. Small samples should be treated as context, not prediction.
      </p>

      <div class="drawer-splits-grid">
        <div class="split-tile">
          <span>AVG</span>
          <strong>${fmtAvg(bvp.batting_average)}</strong>
          <small>${fmtNum(bvp.at_bats)} AB</small>
        </div>

        <div class="split-tile">
          <span>Hits</span>
          <strong>${fmtNum(bvp.hits)}</strong>
          <small>${fmtNum(bvp.at_bats)} AB</small>
        </div>

        <div class="split-tile">
          <span>HR</span>
          <strong>${fmtNum(bvp.home_runs)}</strong>
          <small>${fmtNum(bvp.rbi)} RBI</small>
        </div>

        <div class="split-tile">
          <span>BB / K</span>
          <strong>${fmtNum(bvp.walks)} / ${fmtNum(bvp.strikeouts)}</strong>
          <small>career</small>
        </div>

        <div class="split-tile">
          <span>OPS</span>
          <strong>${fmtAvg(bvp.ops)}</strong>
          <small>career</small>
        </div>
      </div>
    </section>
  `;
}

function openDrawer(playerId) {
  const hot = findHot(playerId);
  const split = findSplit(playerId);
  const matchup = findMatchup(playerId);
  const bvp = findBvp(playerId);

  const name = hot?.full_name || split?.full_name || matchup?.full_name || "Unknown Player";

  setText("drawerPlayerName", name);
  setText("drawerPlayerSub", `Player ID ${playerId} · ${selectedWindow}-game form, matchup, and 2026 splits`);

  setText("drawerMatchupScore", matchup ? fmtDecimal(matchup.matchup_score, 1) : "—");
  setText(
    "drawerPitcher",
    matchup ? (isPitcherTbd(matchup) ? "Probable Starter TBD" : `${matchup.pitcher_name} (${matchup.pitcher_throws || "—"})`) : "—"
  );
  setText("drawerRecentFormScore", matchup ? fmtDecimal(matchup.recent_form_score, 1) : "—");
  setText("drawerSplitScore", matchup ? fmtDecimal(matchup.batter_split_score, 1) : "—");
  setText("drawerMatchupExplanation", matchup?.explanation || "No matchup explanation available yet.");
  renderScoreBreakdown(matchup);

  setText("drawerHotScore", hot ? Number(hot.hot_score || 0).toFixed(1) : "—");
  setText("drawerAvg", hot ? fmtAvg(hot.batting_average) : "—");
  setText("drawerHitRate", hot ? fmtPct(hot.hit_rate) : "—");
  setText("drawerStreak", hot ? fmtNum(hot.current_hit_streak) : "—");

  setText("drawerAb", hot ? fmtNum(hot.at_bats) : "—");
  setText("drawerHits", hot ? fmtNum(hot.hits) : "—");
  setText("drawerHr", hot ? fmtNum(hot.home_runs) : "—");
  setText("drawerRbi", hot ? fmtNum(hot.rbi) : "—");
  setText("drawerBb", hot ? fmtNum(hot.walks) : "—");
  setText("drawerSb", hot ? fmtNum(hot.stolen_bases) : "—");

  setText("drawerLhpAvg", split ? fmtAvg(split.vs_lhp_avg) : "—");
  setText("drawerLhpAb", split ? `${fmtNum(split.vs_lhp_ab)} AB` : "— AB");

  setText("drawerRhpAvg", split ? fmtAvg(split.vs_rhp_avg) : "—");
  setText("drawerRhpAb", split ? `${fmtNum(split.vs_rhp_ab)} AB` : "— AB");

  setText("drawerHomeAvg", split ? fmtAvg(split.home_avg) : "—");
  setText("drawerHomeAb", split ? `${fmtNum(split.home_ab)} AB` : "— AB");

  setText("drawerAwayAvg", split ? fmtAvg(split.away_avg) : "—");
  setText("drawerAwayAb", split ? `${fmtNum(split.away_ab)} AB` : "— AB");

  setText("drawerDayAvg", split ? fmtAvg(split.day_avg) : "—");
  setText("drawerDayAb", split ? `${fmtNum(split.day_ab)} AB` : "— AB");

  setText("drawerNightAvg", split ? fmtAvg(split.night_avg) : "—");
  setText("drawerNightAb", split ? `${fmtNum(split.night_ab)} AB` : "— AB");

const drawerBody = document.querySelector(".drawer-body");
const existingBvp = document.getElementById("drawerBvpSection");

if (existingBvp) {
  existingBvp.remove();
}

if (drawerBody) {
  const wrapper = document.createElement("div");
  wrapper.id = "drawerBvpSection";
  wrapper.innerHTML = renderBvpSection(bvp, matchup);
  drawerBody.appendChild(wrapper);
}
  $("playerDrawer")?.classList.add("open");
  $("drawerBackdrop")?.classList.add("open");
}

function closeDrawer() {
  $("playerDrawer")?.classList.remove("open");
  $("drawerBackdrop")?.classList.remove("open");
}



function findCompareMatchup(playerId) {
  return compareBoardMatchupRows.find((x) => String(x.player_id) === String(playerId));
}

function experimentalScore(matchup, fallbackHotScore = 0) {
  if (!matchup) return Number(fallbackHotScore || 0);

  return (
    Number(matchup.recent_form_score || 0) * 0.45 +
    Number(matchup.batter_split_score || 0) * 0.40 +
    Number(matchup.pitcher_vulnerability_score || 0) * 0.10 +
    Number(matchup.pitcher_recent_form_score || 0) * 0.05
  );
}

function experimentalBoardRows() {
  return compareBoardHotRows.slice().sort((a, b) => {
    const aMatchup = findCompareMatchup(a.player_id);
    const bMatchup = findCompareMatchup(b.player_id);

    const scoreDelta =
      experimentalScore(bMatchup, b.hot_score) -
      experimentalScore(aMatchup, a.hot_score);

    if (scoreDelta !== 0) return scoreDelta;

    const hotDelta = Number(b.hot_score || 0) - Number(a.hot_score || 0);
    if (hotDelta !== 0) return hotDelta;

    return Number(b.hit_rate || 0) - Number(a.hit_rate || 0);
  });
}

function experimentalDelta(matchup) {
  if (!matchup) return null;
  return experimentalScore(matchup) - Number(matchup.matchup_score || 0);
}

function renderModelComparePage() {
  const content = $("modelCompareContent");
  if (!content) return;

  const rows = experimentalBoardRows();
  const top = rows[0] || null;
  const topMatchup = top ? findCompareMatchup(top.player_id) : null;
  const biggestUp = rows
    .map((row) => {
      const matchup = findCompareMatchup(row.player_id);
      return { row, matchup, delta: experimentalDelta(matchup) };
    })
    .filter((x) => x.matchup && Number.isFinite(x.delta))
    .sort((a, b) => b.delta - a.delta)[0];

  const starter = compareBoardMatchupRows[0] || null;
  const starterName = pitcherDisplayName(starter);
  const gameLabel = starter
    ? `${starter.game_date ? formatGameDate(starter.game_date) : "Next game"} · ${starter.opponent_team_name || "Opponent TBD"}`
    : "Next matchup loading";

  content.innerHTML = `
    <section class="control-deck performance-window-deck">
      <div class="control-group">
        <div class="control-label">Model Window</div>
        <div class="segmented" id="compareWindowButtons">
          ${PERFORMANCE_WINDOWS.map((windowValue) => `
            <button
              class="segment ${compareWindow === windowValue ? "active" : ""}"
              data-compare-window="${windowValue}"
              type="button"
            >Last ${windowValue}</button>
          `).join("")}
        </div>
      </div>

      <div class="control-group grow">
        <div class="control-label">Experimental Weights</div>
        <div class="sort-pill">45% form · 40% split · 10% pitcher vulnerability · 5% pitcher form</div>
      </div>

      <div class="control-group">
        <div class="control-label">Sort</div>
        <div class="sort-pill">Experimental Score ↓</div>
      </div>
    </section>

    <section class="hero-grid performance-grid">
      <article class="insight-card primary-insight">
        <div class="card-topline">
          <span>Top Experimental Signal</span>
          <span>Player Last ${compareWindow} Games</span>
        </div>
        <div class="hero-player">${top ? `${heatMeta(top.heat_label).emoji} ${top.full_name}` : "—"}</div>
        <div class="hero-score">
          ${
            top
              ? `Experimental ${fmtDecimal(experimentalScore(topMatchup, top.hot_score), 1)} · Current ${topMatchup ? fmtDecimal(topMatchup.matchup_score, 1) : "—"}`
              : "Experimental Score —"
          }
        </div>
        <p>
          ${
            top
              ? `${top.full_name} leads the reduced-pitcher-weight board. This version rewards recent form and batter split more heavily, while reducing starter-pitcher influence.`
              : "Loading experimental board..."
          }
        </p>
      </article>

      <article class="insight-card compact">
        <div class="metric-icon">⚾</div>
        <div class="metric-label">Game</div>
        <div class="metric-value">${starter?.opponent_team_name || "—"}</div>
        <div class="metric-sub">${gameLabel}</div>
      </article>

      <article class="insight-card compact">
        <div class="metric-icon">🧪</div>
        <div class="metric-label">Starter</div>
        <div class="metric-value">${starterName || "—"}</div>
        <div class="metric-sub">Experimental model still includes pitcher at 15% total</div>
      </article>

      <article class="insight-card compact">
        <div class="metric-icon">⬆</div>
        <div class="metric-label">Biggest Boost</div>
        <div class="metric-value">${biggestUp?.row?.full_name || "—"}</div>
        <div class="metric-sub">${
          biggestUp
            ? `${biggestUp.delta >= 0 ? "+" : ""}${biggestUp.delta.toFixed(1)} vs current score`
            : "Waiting for matchup scores"
        }</div>
      </article>
    </section>

    <section class="performance-note">
      <strong>Experimental Hot Board.</strong>
      <span>This page mirrors the main Hot Board, but ranks hitters by the new reduced-pitcher-weight experimental matchup score.</span>
    </section>

    <section class="board-card">
      <div class="board-header">
        <div>
          <div class="eyebrow">Leaderboard</div>
          <h2>Experimental Hot Board</h2>
        </div>

        <div class="board-meta">
          <span>${fmtNum(rows.length)} hitters · Player last ${compareWindow} games</span>
          <span>Sorted by experimental score</span>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="rank">#</th>
              <th>Heat</th>
              <th>Player</th>
              <th class="num">Experimental</th>
              <th class="num">Current</th>
              <th class="num">Δ</th>
              <th class="num">Hot Score</th>
              <th class="num">Hit Rate</th>
              <th class="num">Streak</th>
              <th class="num">AVG</th>
              <th class="num">AB</th>
              <th class="num">H</th>
              <th class="num">HR</th>
              <th>Latest</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map((row, index) => {
              const heat = heatMeta(row.heat_label);
              const matchup = findCompareMatchup(row.player_id);
              const currentScore = matchup ? Number(matchup.matchup_score || 0) : null;
              const expScore = experimentalScore(matchup, row.hot_score);
              const delta = matchup ? expScore - currentScore : null;
              const expTier = matchupTier(expScore);
              const currentTier = matchupTier(currentScore);
              const scoreWidth = Math.max(4, Math.min(100, Number(row.hot_score || 0)));
              const deltaText = delta === null ? "—" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`;

              return `
                <tr class="clickable-row" data-player-id="${row.player_id}">
                  <td class="rank"><span class="rank-badge">${index + 1}</span></td>

                  <td>
                    <span class="heat-badge ${heat.className}">
                      <span>${heat.emoji}</span>
                      <span>${heat.label}</span>
                    </span>
                  </td>

                  <td>
                    <div class="player-cell">
                      <div class="avatar ${handednessBadge(row).toLowerCase()}">${handednessBadge(row)}</div>
                      <div>
                        <div class="player-name">${row.full_name}</div>
                        <div class="player-sub">${row.games_with_hit}/${row.games} games with hit · ${row.extra_base_hits} XBH · click for matchup</div>
                      </div>
                    </div>
                  </td>

                  <td class="num"><span class="matchup-badge ${expTier.className}">${fmtDecimal(expScore, 1)} · ${expTier.label}</span></td>
                  <td class="num">${
                    matchup
                      ? `<span class="matchup-badge ${currentTier.className}">${fmtDecimal(currentScore, 1)}</span>`
                      : `<span class="matchup-badge matchup-neutral">—</span>`
                  }</td>
                  <td class="num">${deltaText}</td>

                  <td class="num">
                    <div class="score-bar-wrap">
                      <div class="score-bar">
                        <div class="score-bar-fill" style="width: ${scoreWidth}%"></div>
                      </div>
                      <span class="score-value">${Number(row.hot_score || 0).toFixed(1)}</span>
                    </div>
                  </td>

                  <td class="num">${fmtPct(row.hit_rate)}</td>
                  <td class="num">${fmtNum(row.current_hit_streak)}</td>
                  <td class="num">${fmtAvg(row.batting_average)}</td>
                  <td class="num">${fmtNum(row.at_bats)}</td>
                  <td class="num">${fmtNum(row.hits)}</td>
                  <td class="num">${fmtNum(row.home_runs)}</td>
                  <td>${row.latest_game_date || "—"}</td>
                </tr>
              `;
            }).join("") : `<tr><td colspan="14" class="empty-state">Loading experimental hot board...</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;

  document.querySelectorAll("#compareWindowButtons .segment").forEach((button) => {
    button.addEventListener("click", async () => {
      const nextWindow = Number(button.dataset.compareWindow);
      if (!nextWindow || nextWindow === compareWindow) return;

      compareWindow = nextWindow;
      compareBoardHotRows = [];
      compareBoardMatchupRows = [];
      renderModelComparePage();
      await loadModelCompareData();
    });
  });
}


async function loadMlbHitBoardData() {
  try {
    const { data, error } = await client.rpc("get_today_mlb_batter_matchups", {
      p_last_n: mlbWindow
    });

    if (error) throw error;

    mlbRows = (data || []).filter((row) => {
      const name = String(row.full_name || "");
      return name && !name.startsWith("Unknown Player") && !/^Player\s+\d+$/i.test(name);
    });

    renderMlbHitBoardPage();
  } catch (err) {
    console.error("Error loading MLB Hit Board:", err);
    mlbRows = [];
    renderMlbHitBoardPage(err);
  }
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
      game_date: row.game_date,
      game_time_utc: row.game_time_utc,
      venue_name: row.venue_name,
      hitters: []
    };

    current.pitcher_last5_whip = Math.max(current.pitcher_last5_whip || 0, Number(row.pitcher_last5_whip || 0));
    current.pitcher_last5_era = Math.max(current.pitcher_last5_era || 0, Number(row.pitcher_last5_era || 0));
    current.pitcher_baa_max = Math.max(current.pitcher_baa_max || 0, Number(row.pitcher_baa_split || 0));
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

  return best;
}

function renderMlbHitBoardPage(error = null) {
  const content = $("mlbHitBoardContent");
  if (!content) return;

  const rows = mlbRows
    .slice()
    .sort((a, b) => Number(b.matchup_score || 0) - Number(a.matchup_score || 0));

  const top20 = rows.slice(0, 20);
  const bestPitcher = mlbBestTargetPitcher();
  const bestPitcherHitters = bestPitcher?.hitters || [];

  content.innerHTML = `
    <section class="control-deck performance-window-deck">
      <div class="control-group">
        <div class="control-label">Model Window</div>
        <div class="segmented" id="mlbWindowButtons">
          ${PERFORMANCE_WINDOWS.map((windowValue) => `
            <button
              class="segment ${mlbWindow === windowValue ? "active" : ""}"
              data-mlb-window="${windowValue}"
              type="button"
            >Last ${windowValue}</button>
          `).join("")}
        </div>
      </div>

      <div class="control-group grow">
        <div class="control-label">Scope</div>
        <div class="sort-pill">All MLB hitters · current model weights</div>
      </div>

      <div class="control-group">
        <div class="control-label">Sort</div>
        <div class="sort-pill">Matchup Score ↓</div>
      </div>
    </section>

    ${error ? `
      <section class="performance-note">
        <strong>Error loading MLB Hit Board.</strong>
        <span>${error.message || error}</span>
      </section>
    ` : ""}

    <section class="matchup-hero">
      <div class="matchup-header">
        <div>
          <div class="eyebrow">🎯 Today’s Best Target SP</div>
          <h2>${bestPitcher?.pitcher_name || "Loading target pitcher..."}</h2>
          <p class="matchup-subtitle">
            ${
              bestPitcher
                ? `${bestPitcher.pitcher_team_name || "Pitching team"} · ${bestPitcher.pitcher_throws || "—"}HP · ${bestPitcher.game_date ? formatGameDate(bestPitcher.game_date) : "Today"}`
                : "Finding today’s highest-WHIP starting pitcher..."
            }
          </p>
        </div>

        <div class="matchup-score-pill">
          Highest Last 5 WHIP
        </div>
      </div>

      <div class="matchup-grid">
        <article class="matchup-stat-card">
          <div class="label">Starter</div>
          <div class="value">${bestPitcher?.pitcher_name || "—"}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">Team</div>
          <div class="value">${bestPitcher?.pitcher_team_name || "—"}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">Throws</div>
          <div class="value">${bestPitcher?.pitcher_throws || "—"}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">Last 5 WHIP</div>
          <div class="value">${bestPitcher?.pitcher_last5_whip ? fmtDecimal(bestPitcher.pitcher_last5_whip, 3) : "—"}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">Last 5 ERA</div>
          <div class="value">${bestPitcher?.pitcher_last5_era ? fmtDecimal(bestPitcher.pitcher_last5_era, 2) : "—"}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">Top BAA Split</div>
          <div class="value">${bestPitcher?.pitcher_baa_max ? fmtAvg(bestPitcher.pitcher_baa_max) : "—"}</div>
        </article>
      </div>
    </section>

    <section class="board-card performance-card">
      <div class="board-header">
        <div>
          <div class="eyebrow">Target Pitcher Stack</div>
          <h2>Top 5 Hitters Facing ${bestPitcher?.pitcher_name || "Target SP"}</h2>
        </div>

        <div class="board-meta">
          <span>${bestPitcherHitters.length ? `${bestPitcherHitters.length} hitters` : "Waiting for data"}</span>
        </div>
      </div>

      <div class="table-wrap">
        <table class="performance-table">
          <thead>
            <tr>
              <th class="rank">#</th>
              <th>Player</th>
              <th>Team</th>
              <th class="num">Matchup</th>
              <th class="num">Hot</th>
              <th class="num">Split</th>
              <th class="num">Hit Rate</th>
            </tr>
          </thead>
          <tbody>
            ${bestPitcherHitters.length ? bestPitcherHitters.map((row, index) => {
              const tier = matchupTier(row.matchup_score);
              return `
                <tr>
                  <td class="rank"><span class="rank-badge">${index + 1}</span></td>
                  <td><strong>${row.full_name}</strong></td>
                  <td>${row.team_name || "—"}</td>
                  <td class="num"><span class="matchup-badge ${tier.className}">${fmtDecimal(row.matchup_score, 1)}</span></td>
                  <td class="num">${fmtDecimal(row.hot_score, 1)}</td>
                  <td class="num">${row.batter_split_avg ? fmtAvg(row.batter_split_avg) : "—"}</td>
                  <td class="num">${fmtPct(row.batter_recent_hit_rate)}</td>
                </tr>
              `;
            }).join("") : `<tr><td colspan="7" class="empty-state">Loading target pitcher hitters...</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>

    <section class="board-card">
      <div class="board-header">
        <div>
          <div class="eyebrow">All MLB Leaderboard</div>
          <h2>Top 20 Hitters Today</h2>
        </div>

        <div class="board-meta">
          <span>${fmtNum(rows.length)} scored hitters</span>
          <span>Player last ${mlbWindow} games</span>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="rank">#</th>
              <th>Player</th>
              <th>Team</th>
              <th class="num">Matchup</th>
              <th class="num">Hot Score</th>
              <th class="num">Recent</th>
              <th class="num">Split</th>
              <th class="num">Pitcher Vuln</th>
              <th class="num">SP WHIP</th>
              <th>Opponent SP</th>
              <th>Game</th>
            </tr>
          </thead>
          <tbody>
            ${top20.length ? top20.map((row, index) => {
              const tier = matchupTier(row.matchup_score);
              return `
                <tr>
                  <td class="rank"><span class="rank-badge">${index + 1}</span></td>
                  <td>
                    <div class="player-cell">
                      <div class="avatar ${String(row.batter_bats || "R").toLowerCase()}">${handednessBadge({ bats: row.batter_bats })}</div>
                      <div>
                        <div class="player-name">${row.full_name}</div>
                        <div class="player-sub">${row.games_with_hit}/${row.games} games with hit · ${row.batter_split_label || "split n/a"}</div>
                      </div>
                    </div>
                  </td>
                  <td>${row.team_name || "—"}</td>
                  <td class="num"><span class="matchup-badge ${tier.className}">${fmtDecimal(row.matchup_score, 1)} · ${tier.label}</span></td>
                  <td class="num">${fmtDecimal(row.hot_score, 1)}</td>
                  <td class="num">${fmtDecimal(row.recent_form_score, 1)}</td>
                  <td class="num">${fmtDecimal(row.batter_split_score, 1)}</td>
                  <td class="num">${fmtDecimal(row.pitcher_vulnerability_score, 1)}</td>
                  <td class="num">${row.pitcher_last5_whip ? fmtDecimal(row.pitcher_last5_whip, 3) : "—"}</td>
                  <td>
                    <div class="player-name">${row.pitcher_name || "TBD"}</div>
                    <div class="player-sub">${row.pitching_team_name || "—"} · ${row.pitcher_throws || "—"}HP</div>
                  </td>
                  <td>${row.game_date ? formatGameDate(row.game_date) : "—"}</td>
                </tr>
              `;
            }).join("") : `<tr><td colspan="11" class="empty-state">Loading MLB matchup scores...</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;

  document.querySelectorAll("#mlbWindowButtons .segment").forEach((button) => {
    button.addEventListener("click", async () => {
      const nextWindow = Number(button.dataset.mlbWindow);
      if (!nextWindow || nextWindow === mlbWindow) return;

      mlbWindow = nextWindow;
      mlbRows = [];
      renderMlbHitBoardPage();
      await loadMlbHitBoardData();
    });
  });
}

function showView(viewName) {
  const hotView = $("hotView");
  const performanceView = $("performanceView");
  const modelCompareView = $("modelCompareView");
  const mlbView = $("mlbView");

  if (hotView) hotView.classList.toggle("active-view", viewName === "hot");
  if (performanceView) performanceView.classList.toggle("active-view", viewName === "performance");
  if (modelCompareView) modelCompareView.classList.toggle("active-view", viewName === "compare");
  if (mlbView) mlbView.classList.toggle("active-view", viewName === "mlb");

  document.querySelectorAll(".nav-item").forEach((button) => {
    const target = button.dataset.view || "";
    button.classList.toggle("active", target === viewName);
  });

  if (viewName === "hot") {
    setText("pageTitle", "Hitter Intelligence Center");
    setText("pageSubtitle", "Hot hitter detection, recent form, and split-based matchup intelligence.");
  }

  if (viewName === "performance") {
    setText("pageTitle", "Model Performance");
    setText("pageSubtitle", `Track matchup predictions for the ${performanceWindow}-game model against actual results.`);

    if (!performanceSummary && !topPickPerformance && !componentAnalysis && !yesterdayTopPick && !rankAnalysisRows.length) {
      loadPerformanceData();
    } else {
      renderPerformancePage();
    }
  }

  if (viewName === "compare") {
    setText("pageTitle", "Experimental Hot Board");
    setText("pageSubtitle", `Reduced-pitcher-weight matchup board for the ${compareWindow}-game window.`);

    if (!compareBoardHotRows.length || !compareBoardMatchupRows.length) {
      loadModelCompareData();
    } else {
      renderModelComparePage();
    }
  }
}

function wireEvents() {
  document.querySelectorAll(".nav-item[data-view]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.classList.contains("disabled")) return;

      showView(button.dataset.view);

      if (button.dataset.view === "performance") {
        await loadPerformanceData();
      }

      if (button.dataset.view === "compare") {
        await loadModelCompareData();
      }

      if (button.dataset.view === "mlb") {
        await loadMlbHitBoardData();
      }
    });
  });

  document.querySelectorAll("#windowButtons .segment").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("#windowButtons .segment").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      selectedWindow = Number(button.dataset.window);
      loadHotData();
    });
  });

  $("playerSearch")?.addEventListener("input", (event) => {
    searchTerm = event.target.value;
    renderTable();
  });

  $("refreshButton")?.addEventListener("click", loadHotData);
  $("drawerClose")?.addEventListener("click", closeDrawer);
  $("drawerBackdrop")?.addEventListener("click", closeDrawer);

  document.addEventListener("click", (event) => {
    const row = event.target.closest(".clickable-row");
    if (!row) return;
    openDrawer(row.dataset.playerId);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
  });
}

wireEvents();
loadHotData();
