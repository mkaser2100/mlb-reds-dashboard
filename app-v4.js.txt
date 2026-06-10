const SUPABASE_URL = "https://squcmdsivnnxzblsfciu.supabase.co";
const SUPABASE_KEY = "sb_publishable_pumFxQJ7pYyRC8lrjSvtZA_x63TVYtq";

const TEAM_ID = 113;
const SEASON = 2026;
const PERFORMANCE_WINDOW = 10;

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let selectedWindow = 10;
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

    renderHero();
    renderKpis();
    renderTable();

    await Promise.all([
      loadSplitsData(),
      loadMatchupData(),
      loadBvpData(),
      loadPerformanceData()
    ]);

    await loadPitcherHandSplits();

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
      rankResult
    ] = await Promise.all([
      client
        .from("v_matchup_model_performance_v2")
        .select("*")
        .eq("selected_window", PERFORMANCE_WINDOW)
        .maybeSingle(),

      client
        .from("v_matchup_model_top_pick_performance")
        .select("*")
        .eq("selected_window", PERFORMANCE_WINDOW)
        .maybeSingle(),

      client
        .from("v_matchup_model_component_analysis")
        .select("*")
        .eq("selected_window", PERFORMANCE_WINDOW)
        .maybeSingle(),

      client
        .from("v_matchup_model_yesterday_top_pick")
        .select("*")
        .eq("selected_window", PERFORMANCE_WINDOW)
        .maybeSingle(),

      client
        .from("v_matchup_model_rank_analysis")
        .select("*")
        .eq("selected_window", PERFORMANCE_WINDOW)
        .order("prediction_rank", { ascending: true })
    ]);

    if (summaryResult.error) throw summaryResult.error;
    if (topPickResult.error) throw topPickResult.error;
    if (componentResult.error) throw componentResult.error;
    if (yesterdayResult.error) throw yesterdayResult.error;
    if (rankResult.error) throw rankResult.error;

    performanceSummary = summaryResult.data || null;
    topPickPerformance = topPickResult.data || null;
    componentAnalysis = componentResult.data || null;
    yesterdayTopPick = yesterdayResult.data || null;
    rankAnalysisRows = rankResult.data || [];

    renderPerformancePage();
  } catch (err) {
    console.error("Error loading model performance data:", err);
    performanceSummary = null;
    topPickPerformance = null;
    componentAnalysis = null;
    yesterdayTopPick = null;
    rankAnalysisRows = [];
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
        <span>No scored top-pick result available yet.</span>
      </section>
    `;
  }

  const gotHit = yesterdayTopPick.actual_got_hit === true;
  const resultIcon = gotHit ? "✅" : "❌";
  const resultText = `${fmtNum(yesterdayTopPick.actual_hits)}-for-${fmtNum(yesterdayTopPick.actual_at_bats)}`;

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
          <strong>${resultText}</strong>
          <small>${fmtNum(yesterdayTopPick.actual_home_runs)} HR · ${fmtNum(yesterdayTopPick.actual_rbi)} RBI</small>
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
      ${renderYesterdayTopPickCard()}

      <section class="hero-grid performance-grid">
        <article class="insight-card compact">
          <div class="metric-icon">🎯</div>
          <div class="metric-label">Top Pick</div>
          <div class="metric-value">${fmtRate(topPickPerformance?.top_1_hit_rate)}</div>
          <div class="metric-sub">${fmtNum(topPickPerformance?.top_1_scored)} scored · 10-game model</div>
        </article>

        <article class="insight-card compact">
          <div class="metric-icon">🥇</div>
          <div class="metric-label">Top 3 Picks</div>
          <div class="metric-value">${fmtRate(topPickPerformance?.top_3_hit_rate)}</div>
          <div class="metric-sub">${fmtNum(topPickPerformance?.top_3_scored)} scored</div>
        </article>

        <article class="insight-card compact">
          <div class="metric-icon">📊</div>
          <div class="metric-label">Top 5 Picks</div>
          <div class="metric-value">${fmtRate(topPickPerformance?.top_5_hit_rate)}</div>
          <div class="metric-sub">${fmtNum(topPickPerformance?.top_5_scored)} scored</div>
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
      </section>

      <section class="board-card performance-card">
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
      </section>
    `;
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

  setText(
    "matchupOpponent",
    `${timing}: Reds vs ${first.opponent_team_name || "Opponent"}`
  );

  setText(
    "matchupPitcher",
    `${gameDate} · ${first.pitcher_name || "Probable Starter TBD"}${first.pitcher_throws ? ` · ${first.pitcher_throws}HP` : ""}`
  );

  setText("pitcherNameCard", first.pitcher_name || "TBD");
  setText("pitcherThrows", first.pitcher_throws || "—");
  setText("pitcherEra", fmtDecimal(first.pitcher_last5_era, 2));
  setText("pitcherWhip", fmtDecimal(first.pitcher_last5_whip, 2));
  setText("pitcherVsLhb", fmtAvg(pitcherHandSplits.lhb?.batting_average_against));
  setText("pitcherVsRhb", fmtAvg(pitcherHandSplits.rhb?.batting_average_against));
}

function renderHero() {
  const top = hotRows[0];

  if (!top) {
    setText("heroPlayer", "—");
    setText("heroScore", "Hot Score —");
    setText("heroNarrative", "No hitter data returned.");
    return;
  }

  const heat = heatMeta(top.heat_label);

  setText("heroPlayer", `${heat.emoji} ${top.full_name}`);
  setText("heroScore", `Hot Score ${Number(top.hot_score || 0).toFixed(1)} · ${top.heat_label}`);
  setText(
    "heroNarrative",
    `${top.full_name} leads the player-last-${selectedWindow}-games model with a ${Number(top.hot_score || 0).toFixed(1)} Hot Score, ${fmtPct(top.hit_rate)} hit rate, ${top.hits} hits, ${top.extra_base_hits} extra-base hits, and a ${top.current_hit_streak}-game current hit streak.`
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
  const rows = filteredRows();

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
  const pitcherName =
    bvp?.pitcher_name ||
    matchup?.pitcher_name ||
    "today's pitcher";

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
    matchup ? `${matchup.pitcher_name} (${matchup.pitcher_throws})` : "—"
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


function showView(viewName) {
  const hotView = $("hotView");
  const performanceView = $("performanceView");

  if (hotView) hotView.classList.toggle("active-view", viewName === "hot");
  if (performanceView) performanceView.classList.toggle("active-view", viewName === "performance");

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
    setText("pageSubtitle", "Track matchup predictions against actual results and monitor which model components are separating hits from misses.");

    if (!performanceSummary && !topPickPerformance && !componentAnalysis && !yesterdayTopPick && !rankAnalysisRows.length) {
      loadPerformanceData();
    } else {
      renderPerformancePage();
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
