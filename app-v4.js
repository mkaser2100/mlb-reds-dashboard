const SUPABASE_URL = "https://squcmdsivnnxzblsfciu.supabase.co";
const SUPABASE_KEY = "sb_publishable_pumFxQJ7pYyRC8lrjSvtZA_x63TVYtq";

const TEAM_ID = 113;
const SEASON = 2026;
const PERFORMANCE_WINDOWS = [3, 5, 6, 10];

console.info("MLB Hit Lab app-v4 loaded: model-performance-redesign-v1");

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
let redsBoardMode = "ml";
let redsTeamFilter = "all";
let redsMlRows = [];
let redsClassicRows = [];
let redsGameHotRows = [];
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

function recommendedV2Score(row) {
  const score = Number(row?.model_v2_score);
  if (Number.isFinite(score)) return score;
  return Number(row?.matchup_score || 0);
}

function sortByRecommendedV2(a, b) {
  const v2Delta = recommendedV2Score(b) - recommendedV2Score(a);
  if (v2Delta !== 0) return v2Delta;

  const matchupDelta = Number(b?.matchup_score || 0) - Number(a?.matchup_score || 0);
  if (matchupDelta !== 0) return matchupDelta;

  return String(a?.full_name || "").localeCompare(String(b?.full_name || ""));
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
      loadPerformanceData(),
      loadRedsGameBoardData()
    ]);

    await loadPitcherHandSplits();

    // Re-render hero/KPIs after matchup and game-board data load so cards follow the active board context.
    renderHero();
    renderKpis();
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
  const isMl = redsBoardMode === "ml";
  const boardRows = typeof redsBoardRows === "function" ? redsBoardRows() : [];

  if (isMl) {
    setText("activeWindowLabel", "V3 Hit Probability");

    const top = boardRows[0] || redsMlRows[0] || null;
    if (!top) {
      setText("heroPlayer", "—");
      setText("heroScore", "Hit Probability —");
      setText("heroNarrative", "No V3 predictions returned for the current Reds game filter.");
      return;
    }

    const name = top.batter_name || top.full_name || "Top hitter";
    const team = top.team_name || "today's game";
    const pitcher = top.pitcher_name || "today's starter";
    const confidence = titleCase(top.confidence_bucket || "model");

    setText("heroPlayer", `⭐ ${name}`);
    setText("heroScore", `Hit Probability ${fmtProbabilityPct(top)} · ${confidence} confidence`);
    setText(
      "heroNarrative",
      `${name} leads the ${redsTeamFilter === "all" ? "Reds game" : redsTeamFilter} V3 board for ${team}, driven by the ML hit probability model against ${pitcher}.`
    );
    return;
  }

  setText("activeWindowLabel", `Classic · Last ${selectedWindow} Games`);

  const topClassic = boardRows[0] || redsClassicRows[0] || null;
  if (topClassic) {
    const name = topClassic.full_name || topClassic.batter_name || "Top hitter";
    const heat = heatMeta(topClassic.heat_label || "hot");
    setText("heroPlayer", `${heat.emoji} ${name}`);
    setText(
      "heroScore",
      `Matchup Score ${fmtDecimal(topClassic.matchup_score, 1)} · V2 Pick Score ${fmtDecimal(topClassic.model_v2_score, 1)}`
    );
    setText(
      "heroNarrative",
      `${name} leads the ${redsTeamFilter === "all" ? "Reds game" : redsTeamFilter} classic board, driven by recent form, batter split, pitcher vulnerability, and pitcher recent form.`
    );
    return;
  }

  if (!hotRows.length) {
    setText("heroPlayer", "—");
    setText("heroScore", "Matchup Score —");
    setText("heroNarrative", "No hitter data returned.");
    return;
  }

  if (!matchupRows.length) {
    setText("heroPlayer", "Loading matchup model...");
    setText("heroScore", "Matchup Score —");
    setText("heroNarrative", "Waiting for today's matchup scores before selecting the Top Signal.");
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

function currentRedsKpiRows() {
  const boardRows = typeof redsBoardRows === "function" ? redsBoardRows() : [];
  const sourceRows = boardRows.length ? boardRows : hotRows;
  const hotByPlayer = new Map((redsGameHotRows.length ? redsGameHotRows : hotRows).map((row) => [String(row.player_id), row]));

  return (sourceRows || []).map((row) => {
    const hot = hotByPlayer.get(String(row.player_id)) || {};
    const recentAvg = row.batter_recent_avg ?? row.batting_average ?? hot.batting_average;
    const recentHits = row.batter_recent_hits ?? row.hits ?? hot.hits;
    const recentAtBats = row.batter_recent_at_bats ?? row.at_bats ?? hot.at_bats;
    const hitRate = row.batter_recent_hit_rate ?? row.hit_rate ?? hot.hit_rate;

    return {
      ...row,
      full_name: row.full_name || row.batter_name || hot.full_name,
      kpi_avg: recentAvg,
      kpi_hits: recentHits,
      kpi_at_bats: recentAtBats,
      kpi_hit_rate: hitRate,
      kpi_games_with_hit: row.games_with_hit ?? hot.games_with_hit,
      kpi_games: row.games ?? hot.games,
      kpi_home_runs: row.home_runs ?? hot.home_runs,
      kpi_rbi: row.rbi ?? hot.rbi
    };
  }).filter((row) => row.full_name);
}

function renderKpis() {
  const rows = currentRedsKpiRows();
  if (!rows.length) {
    setText("kpiAvg", "—");
    setText("kpiAvgSub", "No players in current filter");
    setText("kpiHr", "—");
    setText("kpiHrSub", "No players in current filter");
    setText("kpiHitRate", "—");
    setText("kpiHitRateSub", "No players in current filter");
    return;
  }

  const minAb = Math.max(5, selectedWindow * 1.5);

  const bestAvg = [...rows]
    .filter((x) => Number(x.kpi_at_bats || 0) >= minAb)
    .sort((a, b) => Number(b.kpi_avg || 0) - Number(a.kpi_avg || 0))[0] ||
    [...rows].sort((a, b) => Number(b.kpi_avg || 0) - Number(a.kpi_avg || 0))[0];

  const mostHr = [...rows]
    .filter((x) => x.kpi_home_runs !== null && x.kpi_home_runs !== undefined)
    .sort((a, b) => Number(b.kpi_home_runs || 0) - Number(a.kpi_home_runs || 0) || Number(b.kpi_rbi || 0) - Number(a.kpi_rbi || 0))[0];

  const bestHitRate = [...rows]
    .filter((x) => x.kpi_hit_rate !== null && x.kpi_hit_rate !== undefined)
    .sort((a, b) => Number(b.kpi_hit_rate || 0) - Number(a.kpi_hit_rate || 0))[0];

  if (bestAvg) {
    setText("kpiAvg", bestAvg.full_name);
    setText("kpiAvgSub", `${fmtAvg(bestAvg.kpi_avg)} AVG · ${fmtNum(bestAvg.kpi_hits)} hits`);
  }

  if (mostHr) {
    setText("kpiHr", mostHr.full_name);
    setText("kpiHrSub", `${fmtNum(mostHr.kpi_home_runs)} HR · ${fmtNum(mostHr.kpi_rbi)} RBI`);
  } else {
    setText("kpiHr", "—");
    setText("kpiHrSub", "HR data unavailable for filter");
  }

  if (bestHitRate) {
    const gamesText = bestHitRate.kpi_games_with_hit != null && bestHitRate.kpi_games != null
      ? ` · ${fmtNum(bestHitRate.kpi_games_with_hit)}/${fmtNum(bestHitRate.kpi_games)} games`
      : "";
    setText("kpiHitRate", bestHitRate.full_name);
    setText("kpiHitRateSub", `${fmtPct(bestHitRate.kpi_hit_rate)}${gamesText}`);
  }
}


async function loadRedsGameHotStats() {
  try {
    const teamIds = Array.from(new Set([
      ...redsMlRows.map((row) => row.team_id),
      ...redsClassicRows.map((row) => row.team_id)
    ].filter(Boolean)));

    if (!teamIds.length) {
      redsGameHotRows = hotRows || [];
      return;
    }

    const results = await Promise.all(teamIds.map((teamId) =>
      client.rpc("get_team_hot_hitters", {
        p_team_id: Number(teamId),
        p_last_n: selectedWindow
      })
    ));

    redsGameHotRows = results
      .flatMap((result) => result.error ? [] : (result.data || []))
      .filter(isRealPlayer);
  } catch (err) {
    console.error("Error loading Reds game KPI hot stats:", err);
    redsGameHotRows = hotRows || [];
  }
}

async function loadRedsGameBoardData() {
  try {
    const [mlResult, classicResult] = await Promise.all([
      client
        .from("v_mlb_v3_reds_game_hit_board")
        .select("*")
        .order("hit_probability_pct", { ascending: false }),
      client
        .from("v_mlb_classic_reds_game_hit_board")
        .select("*")
        .order("classic_rank", { ascending: true })
    ]);

    if (mlResult.error) throw mlResult.error;
    if (classicResult.error) throw classicResult.error;

    redsMlRows = (mlResult.data || [])
      .filter((row) => row.batter_name || row.full_name)
      .map(normalizeV3HitRow)
      .sort((a, b) => Number(b.hit_probability_pct || 0) - Number(a.hit_probability_pct || 0));

    redsClassicRows = (classicResult.data || [])
      .filter((row) => row.batter_name || row.full_name)
      .sort((a, b) => Number(a.classic_rank || 9999) - Number(b.classic_rank || 9999));

    await loadRedsGameHotStats();
  } catch (err) {
    console.error("Error loading Reds game hit board data:", err);
    redsMlRows = [];
    redsClassicRows = [];
    redsGameHotRows = [];
  }
}

function redsOpponentName() {
  const row = redsMlRows[0] || redsClassicRows[0] || matchupRows[0];
  return row?.reds_opponent_team_name || row?.opponent_team_name || "Opponent";
}

function redsBoardRows() {
  const sourceRows = redsBoardMode === "classic" ? redsClassicRows : redsMlRows;
  const q = searchTerm.trim().toLowerCase();

  return sourceRows.filter((row) => {
    if (redsTeamFilter === "reds" && row.is_reds_hitter !== true) return false;
    if (redsTeamFilter === "opponent" && row.is_reds_hitter === true) return false;
    if (!q) return true;
    const name = String(row.batter_name || row.full_name || "").toLowerCase();
    const team = String(row.team_name || "").toLowerCase();
    return name.includes(q) || team.includes(q);
  });
}

function renderRedsBoardControls() {
  const isMl = redsBoardMode === "ml";
  const opponent = redsOpponentName();

  return `
    <section class="control-deck performance-window-deck reds-v3-controls">
      <div class="control-group">
        <div class="control-label">Prediction Model</div>
        <div class="segmented" id="redsPredictionModeButtons">
          <button class="segment ${isMl ? "active" : ""}" data-reds-mode="ml" type="button">⭐ ML Prediction</button>
          <button class="segment ${!isMl ? "active" : ""}" data-reds-mode="classic" type="button">Classic Score</button>
        </div>
      </div>

      <div class="control-group">
        <div class="control-label">Team Filter</div>
        <div class="segmented" id="redsTeamFilterButtons">
          <button class="segment ${redsTeamFilter === "all" ? "active" : ""}" data-reds-team-filter="all" type="button">All</button>
          <button class="segment ${redsTeamFilter === "reds" ? "active" : ""}" data-reds-team-filter="reds" type="button">Reds</button>
          <button class="segment ${redsTeamFilter === "opponent" ? "active" : ""}" data-reds-team-filter="opponent" type="button">Opponent</button>
        </div>
      </div>

      <div class="control-group grow">
        <div class="control-label">Scope</div>
        <div class="sort-pill">Reds vs ${escapeHtml(opponent)} · ${isMl ? "V3 hit probability" : "classic matchup score"}</div>
      </div>

      <div class="control-group">
        <div class="control-label">Sort</div>
        <div class="sort-pill">${isMl ? "Hit Probability ↓" : "Matchup Score ↓"}</div>
      </div>
    </section>
  `;
}

function renderRedsMlRows(rows) {
  if (!rows.length) {
    return `<tr><td colspan="8" class="empty-state">No V3 hitters match the current filter.</td></tr>`;
  }

  return rows.map((row, index) => `
    <tr class="clickable-row" data-reds-v3-player-id="${row.player_id}">
      <td class="rank"><span class="rank-badge">${index + 1}</span></td>
      <td>
        <div class="player-cell">
          <div class="avatar ${String(row.batter_bats || "R").toLowerCase()}">${handednessBadge({ bats: row.batter_bats })}</div>
          <div>
            <div class="player-name">${escapeHtml(row.batter_name || row.full_name)}</div>
            <div class="player-sub">${row.expected_plate_appearances ? `${fmtDecimal(row.expected_plate_appearances, 1)} expected PA · ` : ""}click for model detail</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(row.team_name || "—")}</td>
      <td class="num">
        <div class="score-bar-wrap probability-cell">
          <div class="score-bar"><div class="score-bar-fill" style="width:${Math.min(100, Number(row.hit_probability_pct || 0))}%"></div></div>
          <span class="score-value">${fmtProbabilityPct(row)}</span>
        </div>
      </td>
      <td><span class="confidence-badge ${v3ConfidenceClass(row.confidence_bucket)}">${escapeHtml(titleCase(row.confidence_bucket || "model"))}</span></td>
      <td class="why-cell">${renderWhyPills(row)}</td>
      <td>
        <div class="player-name">${escapeHtml(row.pitcher_name || "TBD")}</div>
        <div class="player-sub">${escapeHtml(row.pitcher_team_name || "—")} · ${escapeHtml(row.pitcher_throws || "—")}HP</div>
      </td>
      <td>${row.game_date ? formatGameDate(row.game_date) : "—"}</td>
    </tr>
  `).join("");
}

function renderRedsClassicRows(rows) {
  if (!rows.length) {
    return `<tr><td colspan="11" class="empty-state">No classic score hitters match the current filter.</td></tr>`;
  }

  return rows.map((row, index) => {
    const tier = matchupTier(row.matchup_score);
    return `
      <tr class="clickable-row" data-reds-classic-player-id="${row.player_id}">
        <td class="rank"><span class="rank-badge">${index + 1}</span></td>
        <td>
          <div class="player-cell">
            <div class="avatar">${initials(row.full_name || row.batter_name)}</div>
            <div>
              <div class="player-name">${escapeHtml(row.full_name || row.batter_name)}</div>
              <div class="player-sub">${escapeHtml(row.batter_split_label || "matchup split")} · click for matchup</div>
            </div>
          </div>
        </td>
        <td>${escapeHtml(row.team_name || "—")}</td>
        <td class="num"><span class="matchup-badge ${tier.className}">${fmtDecimal(row.matchup_score, 1)} · ${tier.label}</span></td>
        <td class="num">${row.model_v2_score != null ? `<span class="model-v2-badge">${fmtDecimal(row.model_v2_score, 1)}</span>` : "—"}</td>
        <td class="num">${fmtDecimal(row.recent_form_score, 1)}</td>
        <td class="num">${fmtDecimal(row.batter_split_score, 1)}</td>
        <td class="num">${fmtDecimal(row.pitcher_vulnerability_score, 1)}</td>
        <td class="num">${renderSpRecentScore(row.pitcher_recent_form_score)}</td>
        <td>
          <div class="player-name">${escapeHtml(row.pitcher_name || "TBD")}</div>
          <div class="player-sub">${escapeHtml(row.pitcher_team_name || "—")}</div>
        </td>
        <td>${row.game_date ? formatGameDate(row.game_date) : "—"}</td>
      </tr>
    `;
  }).join("");
}

function openRedsV3Drawer(playerId) {
  const row = redsMlRows.find((x) => String(x.player_id) === String(playerId));
  if (row) openV3MlbDrawer(row);
}

function openRedsClassicDrawer(playerId) {
  const priorMode = mlbBoardMode;
  const priorRows = mlbClassicRows;
  mlbBoardMode = "classic";
  mlbClassicRows = redsClassicRows;
  openMlbDrawer(playerId);
  mlbBoardMode = priorMode;
  mlbClassicRows = priorRows;
}

function renderTable() {
  const rows = redsBoardRows();
  const opponent = redsOpponentName();
  const isMl = redsBoardMode === "ml";
  const totalRows = isMl ? redsMlRows.length : redsClassicRows.length;

  setHtml("redsBoardControls", renderRedsBoardControls());
  setText("redsBoardTitle", isMl ? `Reds vs ${opponent} Hit Probabilities` : `Reds vs ${opponent} Classic Scores`);
  setText("redsBoardEyebrow", isMl ? "Game-Specific V3 Board" : "Classic Matchup Model");
  setText("statusPill", `${fmtNum(totalRows)} hitters scored`);
  setText("lastRefresh", isMl ? "ML Prediction" : `Classic · Last ${selectedWindow}`);

  if (isMl) {
    setHtml("redsBoardTableWrap", `
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
        <tbody id="hittersTableBody">${renderRedsMlRows(rows)}</tbody>
      </table>
    `);
    return;
  }

  setHtml("redsBoardTableWrap", `
    <table>
      <thead>
        <tr>
          <th class="rank">#</th>
          <th>Player</th>
          <th>Team</th>
          <th class="num">Matchup Score</th>
          <th class="num">V2 Pick Score</th>
          <th class="num">Recent Form</th>
          <th class="num">Batter Split</th>
          <th class="num">SP Vulnerability</th>
          <th class="num">SP Recent Form</th>
          <th>Opponent SP</th>
          <th>Game</th>
        </tr>
      </thead>
      <tbody id="hittersTableBody">${renderRedsClassicRows(rows)}</tbody>
    </table>
  `);
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
    `${row.team_name || "MLB"} · Player ID ${playerId} · V2 recommended rank`
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
      <td class="num"><div class="odds-cell"><strong>${formatAmericanOdds(row.american_odds)}</strong><small>${row.book_name || "—"}${marketOddsUpdatedLabel(row) ? ` · ${marketOddsUpdatedLabel(row)}` : ""}</small></div></td>
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
      performanceResult,
      v2Rows
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
        .limit(10),

      loadV2Enhancements()
    ]);

    if (v3Result.error) throw v3Result.error;
    if (registryResult.error) throw registryResult.error;
    if (actualsResult.error) throw actualsResult.error;
    if (performanceResult.error) throw performanceResult.error;

    v3ModelRegistry = registryResult.data || null;
    v3ActualsStatus = actualsResult.data || null;
    v3PerformanceRows = performanceResult.data || [];

    const baseRows = (v3Result.data || [])
      .filter((row) => row.batter_name || row.full_name)
      .map(normalizeV3HitRow)
      .sort((a, b) => Number(a.rank_overall || 9999) - Number(b.rank_overall || 9999));

    mlbV2EnhancementRows = v2Rows || [];
    mlbRows = withMlbConsensusRanks(mergeV2Enhancements(baseRows, mlbV2EnhancementRows));

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
    mlbClassicRows = withMlbClassicRanks(mergeV2Enhancements(baseRows, mlbV2EnhancementRows));

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
          <button class="segment ${!isMl ? "active" : ""}" data-mlb-mode="classic" type="button">🎯 Recommended</button>
        </div>
      </div>

      <div class="control-group grow">
        <div class="control-label">Scope</div>
        <div class="sort-pill">${isMl ? "All MLB hitters · ranked by ML hit probability" : `All MLB hitters · V2 opportunity-adjusted recommendations with V1 retained`}</div>
      </div>

      <div class="control-group">
        <div class="control-label">Sort</div>
        <div class="sort-pill">${isMl ? "Hit Probability ↓" : "Recommended Rank (V2) ↓"}</div>
      </div>
    </section>
  `;
}

function renderMlbClassicHitBoardPage(error = null) {
  const content = $("mlbHitBoardContent");
  if (!content) return;

  const rows = withMlbClassicRanks(mlbClassicRows);
  const top25 = rows.slice(0, 25);

  content.innerHTML = `
    ${renderMlbPredictionModeControls("classic")}

    ${error ? `
      <section class="performance-note">
        <strong>Classic board note.</strong>
        <span>${error.message || error}</span>
      </section>
    ` : ""}

    <section class="performance-note recommended-note">
      <strong>Recommended view.</strong>
      <span>Default sort uses V2: 80% V1 Matchup Score + 20% Expected PA. Matchup Score remains visible as the V1 benchmark.</span>
    </section>

    <section class="board-card">
      <div class="board-header">
        <div>
          <div class="eyebrow">All MLB Leaderboard</div>
          <h2>Top 25 Recommended Hitters</h2>
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
              <th class="rank">Rec Rank</th>
              <th>Player</th>
              <th>Team</th>
              <th class="num">Recommended (V2)</th>
              <th class="num">Matchup Score (V1)</th>
              <th class="num">V1 Rank</th>
              <th class="num">Expected PA</th>
              <th class="num">Hot Score</th>
              <th class="num">Batter Split</th>
              <th class="num">SP Vulnerability</th>
              <th>Opponent SP</th>
              <th>Game</th>
            </tr>
          </thead>
          <tbody>
            ${top25.length ? top25.map((row, index) => `
              <tr class="clickable-row mlb-clickable-row" data-mlb-player-id="${row.player_id}">
                <td class="rank"><span class="rank-badge recommended-rank">${row.recommended_rank || index + 1}</span></td>
                <td>
                  <div class="player-cell">
                    <div class="avatar ${handednessBadge(row).toLowerCase()}">${handednessBadge(row)}</div>
                    <div>
                      <div class="player-name">${row.full_name}</div>
                      <div class="player-sub">${row.batter_recent_hit_rate != null ? `${fmtPct(row.batter_recent_hit_rate)} recent hit rate · ` : ""}click for recommendation detail</div>
                    </div>
                  </div>
                </td>
                <td>${row.team_name || "—"}</td>
                <td class="num"><span class="recommended-score-badge">${row.model_v2_score != null ? fmtDecimal(row.model_v2_score, 1) : "—"}</span></td>
                <td class="num"><span class="matchup-badge ${matchupTier(row.matchup_score).className}">${fmtDecimal(row.matchup_score, 1)}</span></td>
                <td class="num"><span class="benchmark-rank">${row.v1_matchup_rank ? `#${row.v1_matchup_rank}` : "—"}</span></td>
                <td class="num">${row.expected_plate_appearances != null ? fmtDecimal(row.expected_plate_appearances, 1) : "—"}</td>
                <td class="num">${fmtDecimal(row.hot_score, 1)}</td>
                <td class="num">${fmtDecimal(row.batter_split_score, 1)}</td>
                <td class="num">${fmtDecimal(row.pitcher_vulnerability_score, 1)}</td>
                <td>
                  <div class="player-name">${row.pitcher_name || "TBD"}</div>
                  <div class="player-sub">${row.pitcher_team_name || row.opponent_team_name || "—"} · ${row.pitcher_throws || "—"}HP</div>
                </td>
                <td>${row.game_date ? formatGameDate(row.game_date) : "—"}</td>
              </tr>
            `).join("") : `<tr><td colspan="12" class="empty-state">Loading recommended MLB hitters...</td></tr>`}
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
    setText(
      "pageSubtitle",
      mlbBoardMode === "classic"
        ? "Recommended hitters across MLB using V2 opportunity-adjusted ranking, with V1 Matchup Score retained as the benchmark."
        : "Top hitters across MLB by machine-learning hit probability."
    );

    if (mlbBoardMode === "classic") {
      if (!mlbClassicRows.length) {
        loadClassicMlbHitBoardData();
      } else {
        renderMlbClassicHitBoardPage();
      }
    } else if (!mlbRows.length) {
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
      if (mlbBoardMode === "classic") {
        loadClassicMlbHitBoardData();
      } else {
        loadMlbHitBoardData();
      }
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
      setText(
        "pageSubtitle",
        mlbBoardMode === "classic"
          ? "Recommended hitters across MLB using V2 opportunity-adjusted ranking, with V1 Matchup Score retained as the benchmark."
          : "Top hitters across MLB by machine-learning hit probability."
      );

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

    const redsModeButton = event.target.closest("[data-reds-mode]");
    if (redsModeButton) {
      event.preventDefault();
      event.stopPropagation();
      const nextMode = redsModeButton.dataset.redsMode;
      if (nextMode && nextMode !== redsBoardMode) {
        redsBoardMode = nextMode;
        renderHero();
        renderKpis();
        renderTable();
      }
      return;
    }

    const redsTeamButton = event.target.closest("[data-reds-team-filter]");
    if (redsTeamButton) {
      event.preventDefault();
      event.stopPropagation();
      const nextFilter = redsTeamButton.dataset.redsTeamFilter;
      if (nextFilter && nextFilter !== redsTeamFilter) {
        redsTeamFilter = nextFilter;
        renderHero();
        renderKpis();
        renderTable();
      }
      return;
    }

    const consensusButton = event.target.closest("[data-consensus-player-id]");
    if (consensusButton) {
      event.preventDefault();
      event.stopPropagation();
      focusMlbBoardPlayer(consensusButton.dataset.consensusPlayerId);
      return;
    }

    const row = event.target.closest(".clickable-row");
    if (!row) return;

    if (row.dataset.redsV3PlayerId) {
      openRedsV3Drawer(row.dataset.redsV3PlayerId);
      return;
    }

    if (row.dataset.redsClassicPlayerId) {
      openRedsClassicDrawer(row.dataset.redsClassicPlayerId);
      return;
    }

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

/* =========================================================
   Model Performance Redesign - merged into app-v4.js
   ========================================================= */

// MLB Hit Lab - Model Performance Redesign
// Standalone-safe implementation that can also override the legacy app-v4 performance page
// when loaded after app-v4.js.

(function () {
  // Reuse the existing Supabase client defined earlier in app-v4.js.
  const performanceClient = client;

  const PERFORMANCE_MODELS = ["V1", "V2", "V3"];
  const PERFORMANCE_TIME_FILTERS = ["Season", "Last 30", "Last 14", "Last 7"];
  const PERFORMANCE_MODEL_SELECTORS = ["All", ...PERFORMANCE_MODELS];

  let performanceSelectedModel = "All";
  let performanceSelectedTime = "Season";
  let performanceData = {
    scorecard: { rows: [], sourceView: null, error: null },
    rolling: { rows: [], sourceView: null, error: null },
    buckets: { rows: [], sourceView: null, error: null },
    features: { rows: [], sourceView: null, error: null },
    snapshot: { rows: [], sourceView: null, error: null }
  };

  const MODEL_PERFORMANCE_VIEW_CANDIDATES = {
    scorecard: [
      "v_mlb_model_performance_scorecard",
      "v_mlb_model_performance_scorecard_v2",
      "v_mlb_model_performance_app_scorecard",
      "v_mlb_model_performance_app_scorecard_v2",
      "v_mlb_model_performance_cross_model_scorecard",
      "v_mlb_model_performance_cross_model_scorecard_v2",
      "v_mlb_daily_model_scorecard"
    ],
    rolling: [
      "v_mlb_model_performance_rolling",
      "v_mlb_model_performance_rolling_v2",
      "v_mlb_model_performance_app_rolling",
      "v_mlb_model_performance_app_rolling_v2",
      "v_mlb_model_performance_rolling_windows",
      "v_mlb_model_performance_rolling_windows_v2",
      "v_mlb_model_standings_simple"
    ],
    buckets: [
      "v_mlb_model_performance_score_buckets",
      "v_mlb_model_performance_score_buckets_v2",
      "v_mlb_model_performance_app_buckets",
      "v_mlb_model_performance_app_buckets_v2",
      "v_mlb_model_performance_calibration_buckets",
      "v_mlb_model_performance_calibration_buckets_v2",
      "v_mlb_model_phase1_v1_v2_calibration"
    ],
    features: [
      "v_mlb_model_performance_feature_signals",
      "v_mlb_model_performance_feature_signals_v2",
      "v_mlb_model_performance_app_feature_signals",
      "v_mlb_model_performance_app_feature_signals_v2",
      "v_mlb_model_performance_component_signals",
      "v_mlb_model_performance_component_signals_v2",
      "v_mlb_component_signal_analysis"
    ]
  };

  function perf$(id) {
    return document.getElementById(id);
  }

  function perfEscape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function perfNum(value, digits = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
  }

  function perfRate(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    const pct = n <= 1 ? n * 100 : n;
    return `${Math.round(pct)}%`;
  }

  function perfRateDecimal(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    const pct = n <= 1 ? n * 100 : n;
    return `${pct.toFixed(1)}%`;
  }

  function field(row, names, fallback = null) {
    for (const name of names) {
      if (row && row[name] !== undefined && row[name] !== null) return row[name];
    }
    return fallback;
  }

  function normalizeModel(value) {
    const raw = String(value || "").toUpperCase();
    if (raw.includes("V3") || raw.includes("ML")) return "V3";
    if (raw.includes("V2") || raw.includes("RECOMMENDED")) return "V2";
    if (raw.includes("V1") || raw.includes("CLASSIC")) return "V1";
    return raw || "—";
  }

  function rowModel(row) {
    return normalizeModel(field(row, ["model", "model_name", "model_version", "model_family", "version"]));
  }

  function rowWindow(row) {
    const label = field(row, ["window_label", "time_window", "period", "range_label", "lookback_label"]);
    if (label) return String(label);

    const rollingDays = field(row, ["rolling_days", "lookback_days", "days"]);
    if (rollingDays) return `Last ${rollingDays}`;

    const selectedWindow = field(row, ["selected_window"]);
    if (selectedWindow) return `Last ${selectedWindow}`;

    return "Season";
  }

  function matchesSelector(row) {
    return performanceSelectedModel === "All" || rowModel(row) === performanceSelectedModel;
  }

  function matchesTime(row) {
    if (performanceSelectedTime === "Season") {
      const window = rowWindow(row).toLowerCase();
      return window.includes("season") || !window.startsWith("last ");
    }
    return rowWindow(row).toLowerCase() === performanceSelectedTime.toLowerCase();
  }

  function sourceBadge(sourceView, rows) {
    if (sourceView) return `${rows.length} rows · ${sourceView}`;
    return "No source view returned rows";
  }

  async function loadFirstAvailableView(kind, limit = 500) {
    const candidates = MODEL_PERFORMANCE_VIEW_CANDIDATES[kind] || [];
    const errors = [];

    for (const viewName of candidates) {
      try {
        const { data, error } = await performanceClient
          .from(viewName)
          .select("*")
          .limit(limit);

        if (error) {
          errors.push(`${viewName}: ${error.message}`);
          continue;
        }

        if (Array.isArray(data)) {
          return { rows: data, sourceView: viewName, error: null };
        }
      } catch (err) {
        errors.push(`${viewName}: ${err.message}`);
      }
    }

    return { rows: [], sourceView: null, error: errors.join(" | ") || "No candidate views found." };
  }

  async function loadBaselineSnapshot() {
    try {
      const { data, error } = await performanceClient
        .from("mlb_v2_baseline_metrics_snapshot")
        .select("snapshot_created_at, metric_source, payload")
        .order("snapshot_created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      const payload = data?.[0]?.payload;
      return {
        rows: Array.isArray(payload) ? payload : [],
        sourceView: "mlb_v2_baseline_metrics_snapshot.payload",
        error: null
      };
    } catch (err) {
      return { rows: [], sourceView: null, error: err.message };
    }
  }

  async function loadModelPerformanceData() {
    if (!performanceClient) {
      renderPerformanceError("Supabase client is unavailable. Load this file after Supabase and app-v4.js, or replace the publishable key placeholder.");
      return;
    }

    renderPerformanceLoadingState();

    const [scorecard, rolling, buckets, features, snapshot] = await Promise.all([
      loadFirstAvailableView("scorecard"),
      loadFirstAvailableView("rolling"),
      loadFirstAvailableView("buckets"),
      loadFirstAvailableView("features"),
      loadBaselineSnapshot()
    ]);

    performanceData = { scorecard, rolling, buckets, features, snapshot };

    if (!performanceData.scorecard.rows.length && performanceData.snapshot.rows.length) {
      performanceData.scorecard = performanceData.snapshot;
    }

    renderModelPerformanceRedesignPage();
    runModelPerformanceSelfTest();
  }

  function renderPerformanceLoadingState() {
    const content = perf$("performanceContent");
    if (!content) return;
    content.innerHTML = `
      <section class="performance-note">
        <strong>Loading MLB Model Performance...</strong>
        <span>Checking normalized model performance views and validating card data sources.</span>
      </section>
    `;
  }

  function renderPerformanceError(message) {
    const content = perf$("performanceContent");
    if (!content) return;
    content.innerHTML = `
      <section class="performance-note error">
        <strong>Model Performance failed to initialize.</strong>
        <span>${perfEscape(message)}</span>
      </section>
    `;
  }

  function renderModelSelector() {
    return `
      <section class="control-deck model-performance-control-deck">
        <div class="control-group">
          <div class="control-label">Model Detail Selector</div>
          <div class="segmented" id="performanceModelButtons">
            ${PERFORMANCE_MODEL_SELECTORS.map((model) => `
              <button class="segment ${performanceSelectedModel === model ? "active" : ""}" data-performance-model="${model}" type="button">
                ${model}
              </button>
            `).join("")}
          </div>
        </div>

        <div class="control-group">
          <div class="control-label">Scorecard Window</div>
          <div class="segmented" id="performanceTimeButtons">
            ${PERFORMANCE_TIME_FILTERS.map((windowLabel) => `
              <button class="segment ${performanceSelectedTime === windowLabel ? "active" : ""}" data-performance-time="${windowLabel}" type="button">
                ${windowLabel}
              </button>
            `).join("")}
          </div>
        </div>

        <div class="control-group grow">
          <div class="control-label">Toggle Strategy</div>
          <div class="sort-pill">Cards 1 and 4 use the selector. Cards 2 and 3 always compare all models.</div>
        </div>
      </section>
    `;
  }

  function modelLabel(model) {
    if (model === "V1") return "V1 Classic";
    if (model === "V2") return "V2 Recommended";
    if (model === "V3") return "V3 ML";
    return model || "—";
  }

  function renderScorecardRows() {
    let rows = performanceData.scorecard.rows.filter(matchesSelector).filter(matchesTime);
    if (!rows.length) rows = performanceData.scorecard.rows.filter(matchesSelector);

    if (!rows.length) {
      return `<tr><td colspan="7" class="empty-state">No scorecard rows returned from the database yet.</td></tr>`;
    }

    const byModel = new Map();
    rows.forEach((row) => {
      const model = rowModel(row);
      if (!byModel.has(model)) byModel.set(model, row);
    });

    return Array.from(byModel.entries()).map(([model, row]) => `
      <tr>
        <td><strong>${perfEscape(modelLabel(model))}</strong></td>
        <td class="num">${perfRateDecimal(field(row, ["top_pick_hit_rate", "top_1_hit_rate", "top_pick", "top1_hit_rate"]))}</td>
        <td class="num">${perfRateDecimal(field(row, ["top5_hit_rate", "top_5_hit_rate"]))}</td>
        <td class="num">${perfRateDecimal(field(row, ["top10_hit_rate", "top_10_hit_rate"]))}</td>
        <td class="num">${perfRateDecimal(field(row, ["top20_hit_rate", "top_20_hit_rate"]))}</td>
        <td class="num">${perfRateDecimal(field(row, ["top25_hit_rate", "top_25_hit_rate"]))}</td>
        <td class="num">${perfRateDecimal(field(row, ["overall_hit_rate", "all_hit_rate", "hit_rate", "baseline_hit_rate"]))}</td>
      </tr>
    `).join("");
  }

  function metricWinnerClass(rows, metricNames, model) {
    const values = rows.map((row) => ({
      model: rowModel(row),
      value: Number(field(row, metricNames))
    })).filter((x) => Number.isFinite(x.value));

    if (!values.length) return "";
    const maxValue = Math.max(...values.map((x) => x.value));
    const current = values.find((x) => x.model === model);
    return current && current.value === maxValue ? " performance-winner" : "";
  }

  function rowsForWindow(rows, windowLabel) {
    return rows.filter((row) => rowWindow(row).toLowerCase() === windowLabel.toLowerCase());
  }

  function findMetricRow(rows, model) {
    return rows.find((row) => rowModel(row) === model) || null;
  }

  function renderRollingRows() {
    const rows = performanceData.rolling.rows.length ? performanceData.rolling.rows : performanceData.scorecard.rows;
    if (!rows.length) {
      return `<tr><td colspan="10" class="empty-state">No rolling performance rows returned from the database yet.</td></tr>`;
    }

    const windows = ["Last 7", "Last 14", "Last 30", "Season"];

    return windows.map((windowLabel) => {
      let windowRows = rowsForWindow(rows, windowLabel);
      if (!windowRows.length && windowLabel === "Season") {
        windowRows = rows.filter((row) => !rowWindow(row).toLowerCase().startsWith("last "));
      }

      const modelCells = PERFORMANCE_MODELS.map((model) => {
        const row = findMetricRow(windowRows, model);
        return {
          model,
          topPick: row ? field(row, ["top_pick_hit_rate", "top_1_hit_rate", "top_pick", "top1_hit_rate"]) : null,
          top5: row ? field(row, ["top5_hit_rate", "top_5_hit_rate"]) : null,
          top10: row ? field(row, ["top10_hit_rate", "top_10_hit_rate"]) : null
        };
      });

      const winnerRows = modelCells.map((cell) => ({
        model: cell.model,
        top_pick_hit_rate: cell.topPick,
        top5_hit_rate: cell.top5,
        top10_hit_rate: cell.top10
      }));

      return `
        <tr>
          <td><strong>${windowLabel}</strong></td>
          ${modelCells.map((cell) => `<td class="num${metricWinnerClass(winnerRows, ["top_pick_hit_rate"], cell.model)}">${perfRate(cell.topPick)}</td>`).join("")}
          ${modelCells.map((cell) => `<td class="num${metricWinnerClass(winnerRows, ["top5_hit_rate"], cell.model)}">${perfRate(cell.top5)}</td>`).join("")}
          ${modelCells.map((cell) => `<td class="num${metricWinnerClass(winnerRows, ["top10_hit_rate"], cell.model)}">${perfRate(cell.top10)}</td>`).join("")}
        </tr>
      `;
    }).join("");
  }

  function bucketRank(row, index) {
    return field(row, ["bucket_rank", "bucket_sort", "rank", "sort_order"], index + 1);
  }

  function bucketLabel(row, index) {
    return field(row, ["bucket_label", "score_bucket", "bucket", "range_label"], `Bucket ${index + 1}`);
  }

  function renderBucketRows() {
    const rows = performanceData.buckets.rows;
    if (!rows.length) {
      return `<tr><td colspan="4" class="empty-state">No score bucket rows returned from the database yet.</td></tr>`;
    }

    const ranks = [...new Set(rows.map((row, index) => Number(bucketRank(row, index))))].sort((a, b) => a - b).slice(0, 3);

    return ranks.map((rank, index) => {
      const rankRows = rows.filter((row, rowIndex) => Number(bucketRank(row, rowIndex)) === rank);
      const label = index === 0 ? "Highest Bucket" : `Bucket ${index + 1}`;

      return `
        <tr>
          <td><strong>${label}</strong></td>
          ${PERFORMANCE_MODELS.map((model) => {
            const row = rankRows.find((candidate) => rowModel(candidate) === model) || null;
            if (!row) return `<td class="performance-bucket-cell muted">—</td>`;

            const rate = field(row, ["hit_rate", "bucket_hit_rate", "actual_hit_rate"]);
            const players = field(row, ["players", "sample_size", "ab_opportunities", "observations", "prediction_count"]);
            const hits = field(row, ["hits", "hitters_with_hit", "actual_hits"]);

            return `
              <td class="performance-bucket-cell">
                <strong>${perfRateDecimal(rate)}</strong>
                <span>${perfEscape(bucketLabel(row, index))}</span>
                <small>${perfNum(players)} players${hits !== null && hits !== undefined ? ` · ${perfNum(hits)} hits` : ""}</small>
              </td>
            `;
          }).join("")}
        </tr>
      `;
    }).join("");
  }

  function normalizeFeatureRows() {
    const rows = performanceData.features.rows;
    if (!rows.length) return [];

    const directRows = rows.filter((row) => field(row, ["feature", "component", "signal_name"]));
    if (directRows.length) {
      return directRows.map((row) => ({
        model: rowModel(row),
        feature: field(row, ["feature", "component", "signal_name"], "Signal"),
        signal: Number(field(row, ["signal", "signal_value", "delta", "importance", "correlation"], 0)),
        value: field(row, ["value", "display_value", "signal_label", "avg_value"], null)
      }));
    }

    const legacy = rows[0] || {};
    const componentMap = [
      ["Recent Form", "avg_recent_form_when_hit", "avg_recent_form_when_no_hit"],
      ["Batter Split", "avg_batter_split_when_hit", "avg_batter_split_when_no_hit"],
      ["SP Vulnerability", "avg_pitcher_vuln_when_hit", "avg_pitcher_vuln_when_no_hit"],
      ["Pitcher Recent Form", "avg_pitcher_recent_when_hit", "avg_pitcher_recent_when_no_hit"],
      ["Matchup Score", "avg_matchup_when_hit", "avg_matchup_when_no_hit"]
    ];

    return componentMap.map(([feature, hitKey, noHitKey]) => {
      const hit = Number(legacy[hitKey]);
      const noHit = Number(legacy[noHitKey]);
      const signal = Number.isFinite(hit) && Number.isFinite(noHit) ? hit - noHit : 0;
      return {
        model: rowModel(legacy) === "—" ? "V1" : rowModel(legacy),
        feature,
        signal,
        value: Number.isFinite(signal) ? signal.toFixed(2) : null
      };
    });
  }

  function renderFeatureRows() {
    let rows = normalizeFeatureRows();
    rows = rows.filter((row) => performanceSelectedModel === "All" || row.model === performanceSelectedModel);

    if (!rows.length) {
      return `<tr><td colspan="4" class="empty-state">No feature signal rows returned from the database yet.</td></tr>`;
    }

    const maxAbs = Math.max(...rows.map((row) => Math.abs(Number(row.signal) || 0)), 1);

    return rows.slice(0, performanceSelectedModel === "All" ? 12 : 8).map((row) => {
      const signal = Number(row.signal) || 0;
      const width = Math.max(4, Math.round((Math.abs(signal) / maxAbs) * 100));

      return `
        <tr>
          <td>${perfEscape(modelLabel(row.model))}</td>
          <td><strong>${perfEscape(row.feature)}</strong></td>
          <td>
            <div class="performance-signal-track">
              <span class="performance-signal-bar ${signal < 0 ? "negative" : ""}" style="width:${width}%"></span>
            </div>
          </td>
          <td class="num">${row.value !== null && row.value !== undefined ? perfEscape(row.value) : perfNum(signal, 2)}</td>
        </tr>
      `;
    }).join("");
  }

  function renderDataHealth() {
    const entries = [
      ["Scorecard", performanceData.scorecard],
      ["Rolling", performanceData.rolling],
      ["Buckets", performanceData.buckets],
      ["Signals", performanceData.features]
    ];

    return `
      <section class="performance-source-grid">
        ${entries.map(([label, source]) => `
          <div class="performance-source-card ${source.rows.length ? "ok" : "warn"}">
            <span>${label}</span>
            <strong>${source.rows.length ? "Connected" : "Fallback / Empty"}</strong>
            <small>${perfEscape(sourceBadge(source.sourceView, source.rows))}</small>
          </div>
        `).join("")}
      </section>
    `;
  }

  function renderModelPerformanceRedesignPage() {
    const content = perf$("performanceContent");
    if (!content) return;

    content.innerHTML = `
      <section class="performance-note">
        <strong>Model Performance Redesign</strong>
        <span>Four-card comparison layout using normalized Supabase performance views with safe fallbacks.</span>
      </section>

      ${renderModelSelector()}
      ${renderDataHealth()}

      <section class="board-card performance-card">
        <div class="board-header">
          <div>
            <div class="eyebrow">Model Scorecard</div>
            <h2>Cross-Model Bucket Performance</h2>
          </div>
          <div class="board-meta">
            <span>${perfEscape(performanceSelectedTime)}</span>
            <span>${perfEscape(sourceBadge(performanceData.scorecard.sourceView, performanceData.scorecard.rows))}</span>
          </div>
        </div>
        <div class="table-wrap">
          <table class="performance-table">
            <thead>
              <tr>
                <th>Model</th>
                <th class="num">Top Pick</th>
                <th class="num">Top 5</th>
                <th class="num">Top 10</th>
                <th class="num">Top 20</th>
                <th class="num">Top 25</th>
                <th class="num">Overall</th>
              </tr>
            </thead>
            <tbody>${renderScorecardRows()}</tbody>
          </table>
        </div>
      </section>

      <section class="board-card performance-card">
        <div class="board-header">
          <div>
            <div class="eyebrow">Rolling Performance</div>
            <h2>Consistency Across Time Windows</h2>
          </div>
          <div class="board-meta">
            <span>Always shows all models</span>
            <span>${perfEscape(sourceBadge(performanceData.rolling.sourceView || performanceData.scorecard.sourceView, performanceData.rolling.rows.length ? performanceData.rolling.rows : performanceData.scorecard.rows))}</span>
          </div>
        </div>
        <div class="table-wrap">
          <table class="performance-table wide-performance-table">
            <thead>
              <tr>
                <th>Window</th>
                <th class="num">TP V1</th>
                <th class="num">TP V2</th>
                <th class="num">TP V3</th>
                <th class="num">Top5 V1</th>
                <th class="num">Top5 V2</th>
                <th class="num">Top5 V3</th>
                <th class="num">Top10 V1</th>
                <th class="num">Top10 V2</th>
                <th class="num">Top10 V3</th>
              </tr>
            </thead>
            <tbody>${renderRollingRows()}</tbody>
          </table>
        </div>
      </section>

      <section class="board-card performance-card">
        <div class="board-header">
          <div>
            <div class="eyebrow">Score Buckets</div>
            <h2>Calibration by Model Bucket</h2>
          </div>
          <div class="board-meta">
            <span>Always shows all models</span>
            <span>${perfEscape(sourceBadge(performanceData.buckets.sourceView, performanceData.buckets.rows))}</span>
          </div>
        </div>
        <div class="table-wrap">
          <table class="performance-table">
            <thead>
              <tr>
                <th>Bucket Rank</th>
                <th>V1</th>
                <th>V2</th>
                <th>V3</th>
              </tr>
            </thead>
            <tbody>${renderBucketRows()}</tbody>
          </table>
        </div>
      </section>

      <section class="board-card performance-card">
        <div class="board-header">
          <div>
            <div class="eyebrow">Feature Importance</div>
            <h2>Component Signal Check</h2>
          </div>
          <div class="board-meta">
            <span>${performanceSelectedModel === "All" ? "Top signals by model" : `${performanceSelectedModel} only`}</span>
            <span>${perfEscape(sourceBadge(performanceData.features.sourceView, performanceData.features.rows))}</span>
          </div>
        </div>
        <div class="table-wrap">
          <table class="performance-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Feature</th>
                <th>Signal</th>
                <th class="num">Value</th>
              </tr>
            </thead>
            <tbody>${renderFeatureRows()}</tbody>
          </table>
        </div>
      </section>
    `;

    wirePerformanceControls();
  }

  function wirePerformanceControls() {
    document.querySelectorAll("#performanceModelButtons .segment").forEach((button) => {
      button.addEventListener("click", () => {
        performanceSelectedModel = button.dataset.performanceModel || "All";
        renderModelPerformanceRedesignPage();
      });
    });

    document.querySelectorAll("#performanceTimeButtons .segment").forEach((button) => {
      button.addEventListener("click", () => {
        performanceSelectedTime = button.dataset.performanceTime || "Season";
        renderModelPerformanceRedesignPage();
      });
    });
  }

  function runModelPerformanceSelfTest() {
    const checks = [
      { card: "Model Scorecard", target: "performanceContent", rows: performanceData.scorecard.rows.length, source: performanceData.scorecard.sourceView },
      { card: "Rolling Performance", target: "performanceContent", rows: (performanceData.rolling.rows.length || performanceData.scorecard.rows.length), source: performanceData.rolling.sourceView || performanceData.scorecard.sourceView },
      { card: "Score Buckets", target: "performanceContent", rows: performanceData.buckets.rows.length, source: performanceData.buckets.sourceView },
      { card: "Feature Signals", target: "performanceContent", rows: performanceData.features.rows.length, source: performanceData.features.sourceView }
    ];

    const result = checks.map((check) => ({
      ...check,
      domMounted: Boolean(perf$(check.target)),
      status: check.rows > 0 && Boolean(perf$(check.target)) ? "pass" : "needs-data"
    }));

    console.table(result);
    window.modelPerformanceSelfTest = result;
    return result;
  }

  window.loadModelPerformanceData = loadModelPerformanceData;
  window.loadPerformanceData = loadModelPerformanceData;
  window.renderPerformancePage = renderModelPerformanceRedesignPage;
  window.runModelPerformanceSelfTest = runModelPerformanceSelfTest;

  // Replace app-v4.js global function bindings so existing refresh/nav code uses the redesign.
  try {
    loadPerformanceData = loadModelPerformanceData;
    renderPerformancePage = renderModelPerformanceRedesignPage;
  } catch (err) {
    console.warn("Model Performance redesign could not replace legacy bindings:", err);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (perf$("performanceContent")) {
      loadModelPerformanceData();
    }
  });
})();
