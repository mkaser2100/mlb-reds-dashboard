 const SUPABASE_URL = "https://squcmdsivnnxzblsfciu.supabase.co";
const SUPABASE_KEY = "sb_publishable_pumFxQJ7pYyRC8lrjSvtZA_x63TVYtq";

const TEAM_ID = 113;
const SEASON = 2026;

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let selectedWindow = 10;
let hotRows = [];
let splitRows = [];
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
  return Number(value || 0).toLocaleString();
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

async function loadHotData() {
  try {
    setText("activeWindowLabel", `Player Last ${selectedWindow} Games`);
    setText("statusPill", "Loading...");

    setHtml("hittersTableBody", `
      <tr>
        <td colspan="17" class="empty-state">Loading Reds hitter data...</td>
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

    loadSplitsData();
  } catch (err) {
    console.error(err);
    setText("statusPill", "Error");
    setHtml("hittersTableBody", `
      <tr>
        <td colspan="17" class="empty-state">Error loading data: ${err.message || err}</td>
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

function filteredRows() {
  const q = searchTerm.trim().toLowerCase();
  if (!q) return hotRows;
  return hotRows.filter((x) => String(x.full_name || "").toLowerCase().includes(q));
}

function renderTable() {
  const rows = filteredRows();

  if (!rows.length) {
    setHtml("hittersTableBody", `
      <tr>
        <td colspan="17" class="empty-state">No hitters match your search.</td>
      </tr>
    `);
    return;
  }

  const html = rows.map((row, index) => {
    const heat = heatMeta(row.heat_label);
    const score = Number(row.hot_score || 0);
    const scoreWidth = Math.max(4, Math.min(100, score));

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
              <div class="player-sub">${row.games_with_hit}/${row.games} games with hit · ${row.extra_base_hits} XBH · click for splits</div>
            </div>
          </div>
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

function findHot(playerId) {
  return hotRows.find((x) => String(x.player_id) === String(playerId));
}

function findSplit(playerId) {
  return splitRows.find((x) => String(x.player_id) === String(playerId));
}

function openDrawer(playerId) {
  const hot = findHot(playerId);
  const split = findSplit(playerId);

  const name = hot?.full_name || split?.full_name || "Unknown Player";

  setText("drawerPlayerName", name);
  setText("drawerPlayerSub", `Player ID ${playerId} · ${selectedWindow}-game form and 2026 splits`);

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
