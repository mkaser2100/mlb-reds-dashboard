const SUPABASE_URL = "https://squcmdsivnnxzblsfciu.supabase.co";
const SUPABASE_KEY = "sb_publishable_pumFxQJ7pYyRC8lrjSvtZA_x63TVYtq";

const TEAM_ID = 113;
const SEASON = 2026;

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let selectedWindow = 10;
let hotRows = [];
let splitRows = [];
let matchupRows = [];
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
      loadMatchupData()
    ]);

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
            <div class="avatar">${initials(row.full_name)}</div>
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
  const avgReliability = (batterReliability + pitcherReliability) / 2;

  if (avgReliability >= 0.75) return "High";
  if (avgReliability >= 0.45) return "Medium";
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

function openDrawer(playerId) {
  const hot = findHot(playerId);
  const split = findSplit(playerId);
  const matchup = findMatchup(playerId);

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

  $("playerDrawer")?.classList.add("open");
  $("drawerBackdrop")?.classList.add("open");
}

function closeDrawer() {
  $("playerDrawer")?.classList.remove("open");
  $("drawerBackdrop")?.classList.remove("open");
}

function wireEvents() {
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
