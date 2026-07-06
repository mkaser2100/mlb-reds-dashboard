const SUPABASE_URL = "https://squcmdsivnnxzblsfciu.supabase.co";
const SUPABASE_KEY = "sb_publishable_pumFxQJ7pYyRC8lrjSvtZA_x63TVYtq";

const TEAM_ID = 113;
const SEASON = 2026;
const PERFORMANCE_WINDOWS = [3, 5, 6, 10];

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let selectedWindow = 10;
let performanceWindow = 10;
let performanceScope = "mlb";
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
let mlbPerformanceSummary = null;
let mlbComponentAnalysis = null;
let mlbRankPerformanceRows = [];
let mlbScoreBucketRows = [];
let mlbWindowComparisonRows = [];
let comparisonRows = [];
let compareBoardHotRows = [];
let compareBoardMatchupRows = [];
let mlbRows = [];
let mlbClassicRows = [];
let mlbBoardMode = "ml";
let v2EnhancementRows = [];
let mlbV2EnhancementRows = [];
let mlbWindow = 10;
let mlbTargetPitcherSplits = {};
let v3ModelRegistry = null;
let v3ActualsStatus = null;
let v3PerformanceRows = [];
let marketEdgeRows = [];
let marketEdgeHealth = null;
const MLB_BOARD_MODE = "ml";
const V2_ENHANCEMENT_SELECT = "player_id,full_name,team_id,team_name,game_pk,model_v2_score,model_confidence,expected_plate_appearances,recent_lineup_spot,adjusted_batter_split_avg,adjusted_pitcher_baa_split,adjusted_batter_split_score,adjusted_pitcher_vulnerability_score";
let searchTerm = "";
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
        <td colspan="12" class="empty-state">Loading Reds hitter data...</td>
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
        <td colspan="11" class="empty-state">Error loading data: ${err.message || err}</td>
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
    const [matchupResult, v2Rows] = await Promise.all([
      client.rpc("get_today_reds_batter_matchups", {
        p_team_id: TEAM_ID,
        p_last_n: selectedWindow
      }),
      loadV2Enhancements(TEAM_ID)
    ]);

    if (matchupResult.error) throw matchupResult.error;

    v2EnhancementRows = v2Rows || [];
    matchupRows = mergeV2Enhancements(
      (matchupResult.data || []).filter(isRealPlayer),
      v2EnhancementRows
    );
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
        .from("v_mlb_hit_board_component_analysis")
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
        <td colspan="12" class="empty-state">No hitters match your search.</td>
      </tr>
    `);
    return;
  }

  const html = rows.map((row, index) => {
    const score = Number(row.hot_score || 0);
    const matchup = findMatchup(row.player_id);
    const tier = matchupTier(matchup?.matchup_score);

    return `
      <tr class="clickable-row" data-player-id="${row.player_id}">
        <td class="rank"><span class="rank-badge">${index + 1}</span></td>

        <td>
          <div class="player-cell">
            <div class="avatar ${handednessBadge(row).toLowerCase()}">${handednessBadge(row)}</div>
            <div>
              <div class="player-name">${row.full_name}</div>
              <div class="player-sub">${row.games_with_hit}/${row.games} games with hit · ${matchup?.batter_split_label || "split n/a"} · click for matchup</div>
            </div>
          </div>
        </td>

        <td>${row.team_name || row.team_abbrev || "CIN"}</td>

        <td class="num">
          ${
            matchup
              ? `<span class="matchup-badge ${tier.className}">${fmtDecimal(matchup.matchup_score, 1)} · ${tier.label}</span>`
              : `<span class="matchup-badge matchup-neutral">—</span>`
          }
        </td>

        <td class="num">${matchup?.model_v2_score != null ? `<span class="model-v2-badge">${fmtDecimal(matchup.model_v2_score, 1)}</span>` : "—"}</td>
        <td class="num">${fmtDecimal(score, 1)}</td>
        <td class="num">${matchup ? fmtDecimal(matchup.batter_split_score, 1) : "—"}</td>
        <td class="num">${matchup ? fmtDecimal(matchup.pitcher_vulnerability_score, 1) : "—"}</td>
        <td class="num">${matchup ? renderSpRecentScore(matchup.pitcher_recent_form_score) : "—"}</td>
        <td class="num">${matchup?.pitcher_last5_whip ? fmtDecimal(matchup.pitcher_last5_whip, 3) : "—"}</td>
        <td>
          <div class="player-name">${matchup ? pitcherDisplayName(matchup) : "TBD"}</div>
          <div class="player-sub">${matchup?.opponent_team_name || "—"} · ${matchup ? pitcherDisplayThrows(matchup) : "—"}HP</div>
        </td>
        <td>${matchup?.game_date ? formatGameDate(matchup.game_date) : (row.latest_game_date || "—")}</td>
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
  const v2Summary = matchup.model_v2_score != null
    ? `
      <div class="v2-summary">
        <div>
          <span>V2 Pick Score</span>
          <strong>${matchup.model_v2_score != null ? fmtDecimal(matchup.model_v2_score, 1) : "—"}</strong>
        </div>
        <div>
          <span>Confidence</span>
          <strong>${matchup.model_confidence || confidence}</strong>
        </div>
      </div>
    `
    : "";

  el.innerHTML = `
    <div class="confidence-pill">
      Confidence: ${confidence}
      <span>
        Batter reliability ${Math.round(Number(matchup.batter_split_reliability || 0) * 100)}% ·
        Pitcher reliability ${Math.round(Number(matchup.pitcher_split_reliability || 0) * 100)}%
      </span>
    </div>

    ${v2Summary}

    ${breakdownRow(
      "Recent Form",
      matchup.recent_form_score,
      0.40,
      `Last ${selectedWindow} games`
    )}

    ${breakdownRow(
      "Batter Split",
      matchup.batter_split_score,
      0.35,
      `${matchup.batter_split_label || "Split"} · ${fmtAvg(matchup.batter_split_avg)} AVG · ${fmtNum(matchup.batter_split_ab)} AB`
    )}

    ${breakdownRow(
      "SP Vulnerability",
      matchup.pitcher_vulnerability_score,
      0.20,
      `${matchup.pitcher_split_label || "Pitcher split"} · ${fmtAvg(matchup.pitcher_baa_split)} BAA`
    )}

    ${breakdownRow(
      "Pitcher Recent Form",
      matchup.pitcher_recent_form_score,
      0.05,
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
  restoreDefaultDrawerBody();
  resetDrawerLabels();
  $("playerDrawer")?.classList.remove("mlb-matchup-only");
  $("playerDrawer")?.classList.remove("v3-detail-drawer");
  const hot = findHot(playerId);
  const split = findSplit(playerId);
  const matchup = withV2Enhancement(findMatchup(playerId), v2EnhancementRows);
  const bvp = findBvp(playerId);

  const name = hot?.full_name || split?.full_name || matchup?.full_name || "Unknown Player";

  setText("drawerPlayerName", name);
  setText("drawerPlayerSub", `Player ID ${playerId} · ${selectedWindow}-game form, matchup, and 2026 splits`);

  setText("drawerMatchupScore", matchup ? fmtDecimal(matchup.matchup_score, 1) : "—");
  setText("drawerV2PickScore", matchup?.model_v2_score != null ? fmtDecimal(matchup.model_v2_score, 1) : "—");
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
  const explanation = row.explanation_text || row.explanation || "No ML explanation available yet.";
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

    <section class="drawer-section v3-section">
      <div class="drawer-section-title">Today’s Matchup</div>
      <div class="v3-drawer-grid">
        ${v3Metric("Team", row.team_name || "—")}
        ${v3Metric("Opponent SP", pitcher)}
        ${v3Metric("Game time", gameTime)}
        ${v3Metric("Expected PA", row.expected_plate_appearances != null ? fmtDecimal(row.expected_plate_appearances, 1) : "—")}
      </div>
    </section>

    <section class="drawer-section v3-section">
      <div class="drawer-section-title">Why the model likes him</div>
      <div class="v3-why-pills">${v3ReasonPills(row)}</div>
      <p class="drawer-explanation v3-explanation">${escapeHtml(explanation)}</p>
    </section>

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
        V3 is ranking hitters by machine-learning hit probability. The old fixed model weights are intentionally hidden here because this view should explain the ML prediction, not the legacy score formula.
      </p>
    </section>
  `;

  drawer.classList.add("open");
  $("drawerBackdrop")?.classList.add("open");
}

function openMlbDrawer(playerId) {
  const activeMlbRows = mlbBoardMode === "classic" ? mlbClassicRows : mlbRows;
  const baseRow = activeMlbRows.find((x) => String(x.player_id) === String(playerId));
  if (!baseRow) return;
  const row = withV2Enhancement(baseRow, mlbV2EnhancementRows);

  if (mlbBoardMode !== "classic") {
    openV3MlbDrawer(row);
    return;
  }

  restoreDefaultDrawerBody();
  $("playerDrawer")?.classList.remove("v3-detail-drawer");
  $("playerDrawer")?.classList.add("mlb-matchup-only");

  const matchup = mlbDrawerMatchupRow(row);
  const name = row.full_name || "Unknown Player";
  const splitLabel = row.batter_split_label || "Matchup split";
  const splitAvg = row.batter_split_avg !== null && row.batter_split_avg !== undefined ? fmtAvg(row.batter_split_avg) : "—";
  const splitAb = row.batter_split_ab !== null && row.batter_split_ab !== undefined ? `${fmtNum(row.batter_split_ab)} AB` : "— AB";

  setText("drawerPlayerName", name);
  setText(
    "drawerPlayerSub",
    `${row.team_name || "MLB"} · Player ID ${playerId} · classic matchup score`
  );

  setText("drawerMatchupScore", fmtDecimal(row.matchup_score, 1));
  setText("drawerV2PickScore", row.model_v2_score != null ? fmtDecimal(row.model_v2_score, 1) : "—");
  setText(
    "drawerPitcher",
    isPitcherTbd(matchup) ? "Probable Starter TBD" : `${row.pitcher_name || "TBD"} (${row.pitcher_throws || "—"})`
  );
  setText("drawerRecentFormScore", fmtDecimal(row.recent_form_score, 1));
  setText("drawerSplitScore", fmtDecimal(row.batter_split_score, 1));
  setText("drawerMatchupExplanation", row.explanation_text || matchup.explanation || "No matchup explanation available yet.");
  renderScoreBreakdown(matchup);

  setText("drawerHotScore", fmtDecimal(row.hot_score, 1));
  setText("drawerAvg", row.batter_recent_avg !== undefined ? fmtAvg(row.batter_recent_avg) : "—");
  setText("drawerHitRate", row.batter_recent_hit_rate !== undefined ? fmtPct(row.batter_recent_hit_rate) : "—");
  setText("drawerStreak", row.current_hit_streak !== undefined ? fmtNum(row.current_hit_streak) : "—");

  setText("drawerAb", row.batter_recent_at_bats !== undefined ? fmtNum(row.batter_recent_at_bats) : "—");
  setText("drawerHits", row.batter_recent_hits !== undefined ? fmtNum(row.batter_recent_hits) : "—");
  setText("drawerHr", "—");
  setText("drawerRbi", "—");
  setText("drawerBb", "—");
  setText("drawerSb", "—");

  const splitIsVsLhp = String(splitLabel).toUpperCase().includes("LHP");
  const splitIsVsRhp = String(splitLabel).toUpperCase().includes("RHP");

  setText("drawerLhpAvg", splitIsVsLhp ? splitAvg : "—");
  setText("drawerLhpAb", splitIsVsLhp ? splitAb : "— AB");

  setText("drawerRhpAvg", splitIsVsRhp ? splitAvg : "—");
  setText("drawerRhpAb", splitIsVsRhp ? splitAb : "— AB");

  setText("drawerHomeAvg", row.pitcher_baa_split !== undefined ? fmtAvg(row.pitcher_baa_split) : "—");
  setText("drawerHomeAb", row.pitcher_split_label || "Pitcher split");

  setText("drawerAwayAvg", row.pitcher_last5_whip !== undefined ? fmtDecimal(row.pitcher_last5_whip, 2) : "—");
  setText("drawerAwayAb", "SP WHIP");

  setText("drawerDayAvg", row.pitcher_last5_era !== undefined ? fmtDecimal(row.pitcher_last5_era, 2) : "—");
  setText("drawerDayAb", "SP ERA");

  setText("drawerNightAvg", row.pitcher_recent_form_score !== undefined ? fmtDecimal(row.pitcher_recent_form_score, 1) : "—");
  setText("drawerNightAb", "SP Recent");

  const existingBvp = document.getElementById("drawerBvpSection");
  if (existingBvp) existingBvp.remove();

  $("playerDrawer")?.classList.add("open");
  $("drawerBackdrop")?.classList.add("open");
}


function closeDrawer() {
  $("playerDrawer")?.classList.remove("open");
  $("playerDrawer")?.classList.remove("mlb-matchup-only");
  $("playerDrawer")?.classList.remove("v3-detail-drawer");
  $("drawerBackdrop")?.classList.remove("open");
  resetDrawerLabels();
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
        <div class="control-label">Production Weights</div>
        <div class="sort-pill">40% form · 35% split · 20% pitcher vulnerability · 5% pitcher form</div>
      </div>

      <div class="control-group">
        <div class="control-label">Sort</div>
        <div class="sort-pill">Matchup Score ↓</div>
      </div>
    </section>

    <section class="hero-grid performance-grid">
      <article class="insight-card primary-insight">
        <div class="card-topline">
          <span>Top Production Signal</span>
          <span>Player Last ${compareWindow} Games</span>
        </div>
        <div class="hero-player">${top ? `${heatMeta(top.heat_label).emoji} ${top.full_name}` : "—"}</div>
        <div class="hero-score">
          ${
            top
              ? `Production ${fmtDecimal(experimentalScore(topMatchup, top.hot_score), 1)} · Current ${topMatchup ? fmtDecimal(topMatchup.matchup_score, 1) : "—"}`
              : "Matchup Score —"
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
        <div class="metric-sub">Production model still includes pitcher at 15% total</div>
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
      <strong>Removed Board.</strong>
      <span>This page mirrors the main Hot Board, but ranks hitters by the new reduced-pitcher-weight experimental matchup score.</span>
    </section>

    <section class="board-card">
      <div class="board-header">
        <div>
          <div class="eyebrow">Leaderboard</div>
          <h2>Removed Board</h2>
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
              <th class="num">Production</th>
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




function normalizeV3HitRow(row) {
  if (!row) return row;

  const probability = Number(row.predicted_probability ?? 0);
  const hitPct = row.hit_probability_pct ?? (Number.isFinite(probability) ? probability * 100 : null);
  const featurePayload = row.features || {};

  return {
    ...row,
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
    batter_split_label: row.explanation_factors?.batter_split_label || row.batter_split_label || "matchup split",
    games_with_hit: null,
    games: null,
    model_confidence: row.confidence_bucket,
    explanation: row.explanation_text || "ML model explanation unavailable."
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
  const qualified = isQualifiedMarketEdge(row);

  if (qualified) return { label: "Play", className: "market-tier-play", emoji: "🟢" };
  if (edge >= 3) return { label: "Watch", className: "market-tier-watch", emoji: "🔵" };
  if (edge >= 1) return { label: "Fair", className: "market-tier-fair", emoji: "⚪" };
  return { label: "Efficient", className: "market-tier-efficient", emoji: "⚫" };
}

function renderMarketEdgeTierBadge(row) {
  const tier = marketEdgeActionTier(row);
  const stale = row?.odds_stale ? " · stale odds" : "";
  return `<span class="edge-badge ${tier.className}" title="${escapeHtml(tier.label + stale)}">${tier.emoji} ${escapeHtml(tier.label)}</span>`;
}

function marketEdgeSummaryText(rows) {
  if (!rows.length) return "No hit prop market rows are available yet. Run the odds loader after today's slate opens.";
  const qualified = qualifiedMarketEdgeRows(rows);
  const top = rows[0];
  if (!qualified.length) {
    return `The market is close to the model right now. The largest edge is ${top?.batter_name || "—"} at ${fmtPercentValue(top?.edge_pct)}, below the qualified threshold.`;
  }
  const staleNote = qualified.some((row) => row.odds_stale) ? " Some qualified prices may be stale; refresh odds before acting." : "";
  return `${qualified.length} qualified opportunities are live. ${qualified[0].batter_name} has the strongest edge at ${fmtPercentValue(qualified[0].edge_pct)}.${staleNote}`;
}

async function loadMarketEdgeData() {
  try {
    setHtml("marketEdgeContent", `
      <section class="performance-note">
        <strong>Loading Market Edge...</strong>
        <span>Comparing V3 probabilities to hit prop market prices.</span>
      </section>
    `);

    const [edgesResult, healthResult] = await Promise.all([
      client
        .from("v_mlb_hit_over05_market_edges")
        .select("*")
        .order("edge_rank", { ascending: true }),
      client
        .from("v_mlb_hit_over05_market_edge_health")
        .select("*")
        .maybeSingle()
    ]);

    if (edgesResult.error) throw edgesResult.error;
    if (healthResult.error) throw healthResult.error;

    marketEdgeRows = edgesResult.data || [];
    marketEdgeHealth = healthResult.data || null;
    renderMarketEdgePage();
  } catch (err) {
    console.error("Error loading Market Edge:", err);
    marketEdgeRows = [];
    marketEdgeHealth = null;
    renderMarketEdgePage(err);
  }
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
        <div class="metric-sub">${topHigh?.book_name ? `Best book: ${topHigh.book_name}` : "Waiting for odds"}</div>
      </article>
    </section>
  `;
}


function ensureMarketEdgeTierStyles() {
  if (document.getElementById("marketEdgeTierStyles")) return;
  const style = document.createElement("style");
  style.id = "marketEdgeTierStyles";
  style.textContent = `
    .market-tier-play { border-color: rgba(47, 214, 126, .45); background: rgba(47, 214, 126, .13); color: #bdf7d2; }
    .market-tier-watch { border-color: rgba(74, 190, 255, .45); background: rgba(74, 190, 255, .12); color: #c7ecff; }
    .market-tier-fair { border-color: rgba(180, 190, 210, .30); background: rgba(180, 190, 210, .10); color: #d7deea; }
    .market-tier-efficient { border-color: rgba(120, 130, 150, .25); background: rgba(120, 130, 150, .08); color: #aab3c5; }
    .qualified-market-edge-row { box-shadow: inset 3px 0 0 rgba(47, 214, 126, .65); }
  `;
  document.head.appendChild(style);
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
      <td class="num"><span class="edge-badge ${marketEdgeClass(row.edge_pct)}">${fmtPercentValue(row.edge_pct)}</span></td>
      <td>${renderMarketEdgeTierBadge(row)}</td>
      <td class="num">${fmtProbabilityPct(row)}</td>
      <td class="num">${fmtPercentValue(row.market_implied_probability_pct)}</td>
      <td class="num"><div class="odds-cell"><strong>${formatAmericanOdds(row.american_odds)}</strong><small>${row.book_name || "—"}${row.odds_stale ? " · stale" : ""}</small></div></td>
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
        <div class="sort-pill">Hits Over 0.5 · DraftKings + Bet365</div>
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

    ${error ? `<section class="performance-note"><strong>Market Edge error.</strong><span>${escapeHtml(error.message || error)}</span></section>` : ""}

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
          <span>${marketEdgeHealth?.latest_odds_fetch_at ? `Updated ${formatEasternGameTime(marketEdgeHealth.latest_odds_fetch_at)}` : "Odds pending"}</span>
        </div>
      </div>

      <div class="table-wrap">
        <table class="market-edge-table">
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

function openMarketEdgeDrawer(playerId) {
  const row = marketEdgeRows.find((x) => String(x.player_id) === String(playerId));
  if (!row) return;
  openV3MlbDrawer(normalizeV3HitRow(row));

  const body = document.querySelector(".drawer-body");
  if (!body) return;
  const marketSection = document.createElement("section");
  marketSection.className = "drawer-section v3-section market-drawer-section";
  marketSection.innerHTML = `
    <div class="drawer-section-title">Market Edge</div>
    <div class="market-gap-card">
      <div>
        <span>Model</span>
        <strong>${fmtProbabilityPct(row)}</strong>
      </div>
      <div>
        <span>Market</span>
        <strong>${fmtPercentValue(row.market_implied_probability_pct)}</strong>
      </div>
      <div>
        <span>Edge</span>
        <strong class="${marketEdgeClass(row.edge_pct)}">${fmtPercentValue(row.edge_pct)}</strong>
      </div>
    </div>
    <div class="v3-drawer-grid">
      ${v3Metric("Best odds", formatAmericanOdds(row.american_odds), row.book_name || "Book")}
      ${v3Metric("Market", `${row.outcome_name || "Over"} ${row.line || 0.5} hits`, row.market_player_name || row.batter_name || "")}
      ${v3Metric("Price updated", row.odds_last_update ? formatEasternGameTime(row.odds_last_update) : formatEasternGameTime(row.fetched_at), row.odds_stale ? "Stale" : "Fresh")}
      ${v3Metric("Edge tier", row.edge_tier || "No Edge", "Model minus market")}
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
      performanceResult
    ] = await Promise.all([
      client
        .from("v_mlb_ml_hit_probability_v3_daily")
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
        .limit(10)
    ]);

    if (v3Result.error) throw v3Result.error;
    if (registryResult.error) throw registryResult.error;
    if (actualsResult.error) throw actualsResult.error;
    if (performanceResult.error) throw performanceResult.error;

    v3ModelRegistry = registryResult.data || null;
    v3ActualsStatus = actualsResult.data || null;
    v3PerformanceRows = performanceResult.data || [];

    mlbRows = (v3Result.data || [])
      .filter((row) => row.batter_name || row.full_name)
      .map(normalizeV3HitRow)
      .sort((a, b) => Number(a.rank_overall || 9999) - Number(b.rank_overall || 9999));

    const targetPitcher = mlbBestTargetPitcher();
    await loadMlbTargetPitcherSplits(targetPitcher?.pitcher_id);

    renderMlbHitBoardPage();
  } catch (err) {
    console.error("Error loading V3 MLB Hit Board:", err);

    // Fallback keeps the current V1/V2 board usable if V3 views are unavailable.
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

async function loadClassicMlbHitBoardData() {
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
    mlbClassicRows = mergeV2Enhancements(baseRows, mlbV2EnhancementRows)
      .sort((a, b) => Number(b.matchup_score || 0) - Number(a.matchup_score || 0));

    renderMlbClassicHitBoardPage();
  } catch (err) {
    console.error("Error loading classic MLB Hit Board:", err);
    mlbClassicRows = [];
    renderMlbClassicHitBoardPage(err);
  }
}

function renderMlbPredictionModeControls(activeMode = mlbBoardMode) {
  const isMl = activeMode === "ml";
  return `
    <section class="control-deck performance-window-deck v3-control-deck">
      <div class="control-group">
        <div class="control-label">Prediction Model</div>
        <div class="segmented" id="mlbPredictionModeButtons">
          <button class="segment ${isMl ? "active" : ""}" data-mlb-mode="ml" type="button">⭐ ML Prediction</button>
          <button class="segment ${!isMl ? "active" : ""}" data-mlb-mode="classic" type="button">Classic Score</button>
        </div>
      </div>

      <div class="control-group grow">
        <div class="control-label">Scope</div>
        <div class="sort-pill">${isMl ? "All MLB hitters · ranked by ML hit probability" : `All MLB hitters · classic ${mlbWindow}-game matchup model`}</div>
      </div>

      <div class="control-group">
        <div class="control-label">Sort</div>
        <div class="sort-pill">${isMl ? "Hit Probability ↓" : "Matchup Score ↓"}</div>
      </div>
    </section>
  `;
}

function renderMlbClassicHitBoardPage(error = null) {
  const content = $("mlbHitBoardContent");
  if (!content) return;

  const rows = mlbClassicRows
    .slice()
    .sort((a, b) => Number(b.matchup_score || 0) - Number(a.matchup_score || 0));
  const top25 = rows.slice(0, 25);

  content.innerHTML = `
    ${renderMlbPredictionModeControls("classic")}

    ${error ? `
      <section class="performance-note">
        <strong>Classic board note.</strong>
        <span>${error.message || error}</span>
      </section>
    ` : ""}

    <section class="performance-note">
      <strong>Classic Score view.</strong>
      <span>This legacy board is retained for comparison while the ML model proves out.</span>
    </section>

    <section class="board-card">
      <div class="board-header">
        <div>
          <div class="eyebrow">All MLB Leaderboard</div>
          <h2>Top 25 Classic Matchup Scores</h2>
        </div>

        <div class="board-meta">
          <span>${fmtNum(rows.length)} scored hitters</span>
          <span>Last ${mlbWindow} games</span>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="rank">#</th>
              <th>Player</th>
              <th>Team</th>
              <th class="num">Matchup Score</th>
              <th class="num">V2 Pick Score</th>
              <th class="num">Hot Score</th>
              <th class="num">Batter Split</th>
              <th class="num">SP Vulnerability</th>
              <th class="num">SP Recent Form</th>
              <th>Opponent SP</th>
              <th>Game</th>
            </tr>
          </thead>
          <tbody>
            ${top25.length ? top25.map((row, index) => `
              <tr class="clickable-row mlb-clickable-row" data-mlb-player-id="${row.player_id}">
                <td class="rank"><span class="rank-badge">${index + 1}</span></td>
                <td>
                  <div class="player-cell">
                    <div class="avatar ${handednessBadge(row).toLowerCase()}">${handednessBadge(row)}</div>
                    <div>
                      <div class="player-name">${row.full_name}</div>
                      <div class="player-sub">${row.batter_recent_hit_rate != null ? `${fmtPct(row.batter_recent_hit_rate)} recent hit rate · ` : ""}click for matchup detail</div>
                    </div>
                  </div>
                </td>
                <td>${row.team_name || "—"}</td>
                <td class="num"><span class="matchup-badge ${matchupTier(row.matchup_score).className}">${fmtDecimal(row.matchup_score, 1)}</span></td>
                <td class="num">${row.model_v2_score != null ? fmtDecimal(row.model_v2_score, 1) : "—"}</td>
                <td class="num">${fmtDecimal(row.hot_score, 1)}</td>
                <td class="num">${fmtDecimal(row.batter_split_score, 1)}</td>
                <td class="num">${fmtDecimal(row.pitcher_vulnerability_score, 1)}</td>
                <td class="num">${renderSpRecentScore(row.pitcher_recent_form_score)}</td>
                <td>
                  <div class="player-name">${row.pitcher_name || "TBD"}</div>
                  <div class="player-sub">${row.pitcher_team_name || row.opponent_team_name || "—"} · ${row.pitcher_throws || "—"}HP</div>
                </td>
                <td>${row.game_date ? formatGameDate(row.game_date) : "—"}</td>
              </tr>
            `).join("") : `<tr><td colspan="11" class="empty-state">Loading classic MLB matchup scores...</td></tr>`}
          </tbody>
        </table>
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

  if (mlbBoardMode === "classic") {
    renderMlbClassicHitBoardPage(error);
    return;
  }

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
    ${renderMlbPredictionModeControls("ml")}

    ${error ? `
      <section class="performance-note">
        <strong>V3 board fallback note.</strong>
        <span>${error.message || error}</span>
      </section>
    ` : ""}

    <section class="daily-summary-card">
      <div>
        <div class="eyebrow">Daily Summary</div>
        <h2>Today's Outlook</h2>
        <p>
          ${topPick ? `${topPick.batter_name || topPick.full_name} is the top ML play at ${fmtProbabilityPct(topPick)}. The board is prioritizing recent contact form, favorable batter splits, and pitcher vulnerability signals.` : "Waiting for today's V3 predictions."}
        </p>
      </div>
      <div class="summary-metrics">
        <span>${fmtNum(rows.length)} hitters scored</span>
        <span>${top25.length} shown</span>
        <span>${v3ModelRegistry?.status || "candidate"} model</span>
      </div>
    </section>

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
                <td><span class="confidence-badge ${v3ConfidenceClass(row.confidence_bucket)}">${row.confidence_bucket || "model"}</span></td>
                <td class="why-cell">${renderWhyPills(row)}</td>
                <td>
                  <div class="player-name">${row.pitcher_name || "TBD"}</div>
                  <div class="player-sub">${row.pitcher_team_name || "—"} · ${row.pitcher_throws || "—"}HP</div>
                </td>
                <td>${row.game_date ? formatGameDate(row.game_date) : "—"}</td>
              </tr>
            `).join("") : `<tr><td colspan="8" class="empty-state">Loading V3 ML hit probabilities...</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>

    <section class="board-card performance-card">
      <div class="board-header">
        <div>
          <div class="eyebrow">Model Lab Preview</div>
          <h2>Recent V3 Performance</h2>
        </div>
        <div class="board-meta">
          <span>Candidate tracking</span>
        </div>
      </div>
      <div class="table-wrap">
        <table class="performance-table">
          <thead>
            <tr>
              <th>Date</th>
              <th class="num">Evaluated</th>
              <th class="num">Top 5</th>
              <th class="num">Top 10</th>
              <th class="num">Top 20</th>
            </tr>
          </thead>
          <tbody>
            ${v3PerformanceRows.length ? v3PerformanceRows.map((row) => `
              <tr>
                <td>${formatGameDate(row.prediction_run_date)}</td>
                <td class="num">${fmtNum(row.evaluated_predictions)}</td>
                <td class="num">${fmtRate(row.top_5_hit_rate)}</td>
                <td class="num">${fmtRate(row.top_10_hit_rate)}</td>
                <td class="num">${fmtRate(row.top_20_hit_rate)}</td>
              </tr>
            `).join("") : `<tr><td colspan="5" class="empty-state">V3 performance will populate after actuals load.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function showView(viewName) {
  const hotView = $("hotView");
  const performanceView = $("performanceView");
  const modelCompareView = $("modelCompareView");
  const mlbView = $("mlbView");
  const marketEdgeView = $("marketEdgeView");

  if (hotView) hotView.classList.toggle("active-view", viewName === "hot");
  if (performanceView) performanceView.classList.toggle("active-view", viewName === "performance");
  if (modelCompareView) modelCompareView.classList.toggle("active-view", viewName === "compare");
  if (mlbView) mlbView.classList.toggle("active-view", viewName === "mlb");
  if (marketEdgeView) marketEdgeView.classList.toggle("active-view", viewName === "market");

  document.querySelectorAll(".nav-item").forEach((button) => {
    const target = button.dataset.view || "";
    button.classList.toggle("active", target === viewName);
  });

  if (viewName === "hot") {
    setText("pageEyebrow", "Cincinnati Reds · Rolling Player Form");
    setText("pageTitle", "Reds Hit Board");
    setText("pageSubtitle", `Reds hitter detection, recent form, and split-based matchup intelligence using the ${selectedWindow}-game window.`);

    if (!hotRows.length) {
      loadHotData();
    } else {
      renderHero();
      renderKpis();
      renderMatchupHero();
      renderTable();
    }
  }

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
    setText("pageSubtitle", `Toggle Reds vs MLB performance for the ${performanceWindow}-game model against actual results.`);

    if (!performanceSummary && !topPickPerformance && !componentAnalysis && !yesterdayTopPick && !rankAnalysisRows.length) {
      loadPerformanceData();
    } else {
      renderPerformancePage();
    }
  }

  if (viewName === "compare") {
    setText("pageEyebrow", "Production Model · Reduced Pitcher Weight");
    setText("pageTitle", "Removed Board");
    setText("pageSubtitle", `Reduced-pitcher-weight matchup board for the ${compareWindow}-game window.`);

    if (!compareBoardHotRows.length || !compareBoardMatchupRows.length) {
      loadModelCompareData();
    } else {
      renderModelComparePage();
    }
  }

  if (viewName === "mlb") {
    setText("pageEyebrow", "All MLB · Daily Matchup Intelligence");
    setText("pageTitle", "MLB Hit Board");
    setText("pageSubtitle", "Top hitters across MLB by machine-learning hit probability.");

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

      if (button.dataset.view === "compare") {
        await loadModelCompareData();
      }

      if (button.dataset.view === "mlb") {
        await loadMlbHitBoardData();
      }

      if (button.dataset.view === "hot") {
        await loadHotData();
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

  $("refreshButton")?.addEventListener("click", () => {
    const activeView = document.querySelector(".view.active-view")?.id;
    if (activeView === "mlbView") {
      loadMlbHitBoardData();
    } else if (activeView === "marketEdgeView") {
      loadMarketEdgeData();
    } else if (activeView === "performanceView") {
      loadPerformanceData();
    } else if (activeView === "modelCompareView") {
      loadModelCompareData();
    } else {
      loadHotData();
    }
  });
  $("drawerClose")?.addEventListener("click", closeDrawer);
  $("drawerBackdrop")?.addEventListener("click", closeDrawer);

  document.addEventListener("click", async (event) => {
    const modeButton = event.target.closest("[data-mlb-mode]");
    if (modeButton) {
      event.preventDefault();
      event.stopPropagation();

      const nextMode = modeButton.dataset.mlbMode;
      if (!nextMode || nextMode === mlbBoardMode) return;

      mlbBoardMode = nextMode;

      // Render the selected state immediately so the toggle feels responsive,
      // then load the backing rows if needed.
      if (nextMode === "classic") {
        renderMlbClassicHitBoardPage();
        if (!mlbClassicRows.length) {
          await loadClassicMlbHitBoardData();
        }
      } else {
        renderMlbHitBoardPage();
        if (!mlbRows.length) {
          await loadMlbHitBoardData();
        }
      }
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

    if (row.dataset.playerId) {
      openDrawer(row.dataset.playerId);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
  });
}

applySidebarCollapsedState();
wireEvents();
showView("mlb");
loadMlbHitBoardData();
