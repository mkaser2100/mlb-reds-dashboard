const SUPABASE_URL = "https://squcmdsivnnxzblsfciu.supabase.co";
const SUPABASE_KEY = "sb_publishable_pumFxQJ7pYyRC8lrjSvtZA_x63TVYtq";

const TEAM_ID = 113;
const SEASON = 2026;

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let selectedWindow = 10;
let allRows = [];
let searchTerm = "";
let splitsRows = [];

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

function isRealPlayerName(name) {
  const cleaned = String(name || "").trim();

  if (!cleaned) return false;
  if (cleaned.startsWith("Historical Reds Player")) return false;
  if (cleaned.startsWith("Unknown Player")) return false;
  if (/^Player\s+\d+$/i.test(cleaned)) return false;

  return true;
}

function filterRealPlayers(rows) {
  return (rows || []).filter((row) => isRealPlayerName(row.full_name));
}

function fmtAvg(value) {
  if (value === null || value === undefined) return "—";
  const n = Number(value || 0);
  return n.toFixed(3).replace(/^0/, "");
}

function fmtPct(value) {
  const n = Number(value || 0);
  return `${Math.round(n * 100)}%`;
}

function fmtNumber(value) {
  return Number(value || 0).toLocaleString();
}

function cleanPlayerName(name) {
  if (!name) return "Unknown";
  return name;
}

function initials(name) {
  const cleaned = cleanPlayerName(name);

  return cleaned
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function heatMeta(label) {
  const normalized = String(label || "Neutral").toLowerCase();

  if (normalized === "inferno") {
    return { emoji: "🔥", className: "heat-inferno", label: "Inferno" };
  }

  if (normalized === "hot") {
    return { emoji: "🟠", className: "heat-hot", label: "Hot" };
  }

  if (normalized === "warming") {
    return { emoji: "🟡", className: "heat-warming", label: "Warming" };
  }

  if (normalized === "cold") {
    return { emoji: "🔵", className: "heat-cold", label: "Cold" };
  }

  return { emoji: "⚪", className: "heat-neutral", label: "Neutral" };
}

function findSplitRow(playerId) {
  return splitsRows.find((row) => String(row.player_id) === String(playerId));
}

function findHotRow(playerId) {
  return allRows.find((row) => String(row.player_id) === String(playerId));
}

async function loadHotData() {
  setText("activeWindowLabel", `Player Last ${selectedWindow} Games`);
  setText("statusPill", `Loading last ${selectedWindow} games...`);

  setHtml(
    "hittersTableBody",
    `
    <tr>
      <td colspan="17" class="empty-state">Loading Reds hitter intelligence...</td>
    </tr>
  `
  );

  const { data, error } = await client.rpc("get_team_hot_hitters", {
    p_team_id: TEAM_ID,
    p_last_n: selectedWindow,
  });

  if (error) {
    console.error("Error loading hot hitters:", error);

    setText("statusPill", "Error loading data");
    setHtml(
      "hittersTableBody",
      `
      <tr>
        <td colspan="17" class="empty-state">Error loading data: ${error.message}</td>
      </tr>
    `
    );

    return;
  }

  allRows = filterRealPlayers(data || []);
  allRows.sort((a, b) => Number(b.hot_score || 0) - Number(a.hot_score || 0));

  setText(
    "statusPill",
    `${allRows.length} hitters · Player last ${selectedWindow} games`
  );
  setText("lastRefresh", `Last refresh: ${new Date().toLocaleString()}`);

  renderHotHero();
  renderHotKpis();
  renderHotTable();

  if (!splitsRows.length) {
    loadSplitsData();
  }
}

async function loadSplitsData() {
  const { data, error } = await client.rpc("get_team_batting_splits", {
    p_team_id: TEAM_ID,
    p_season: SEASON,
  });

  if (error) {
    console.error("Error loading splits:", error);
    return;
  }

  splitsRows = filterRealPlayers(data || []);
}

function renderHotHero() {
  const top = allRows[0];

  if (!top) {
    setText("heroPlayer", "—");
    setText("heroScore", "Hot Score —");
    setText("heroNarrative", "No hitter data returned.");
    return;
  }

  const heat = heatMeta(top.heat_label);

  setText("heroPlayer", `${heat.emoji} ${cleanPlayerName(top.full_name)}`);
  setText(
    "heroScore",
    `Hot Score ${Number(top.hot_score || 0).toFixed(1)} · ${top.heat_label}`
  );
  setText(
    "heroNarrative",
    `${cleanPlayerName(top.full_name)} leads the player-last-${selectedWindow}-games model with a ${Number(top.hot_score || 0).toFixed(1)} Hot Score, a ${fmtPct(top.hit_rate)} hit rate, ${top.hits} hits, ${top.extra_base_hits} extra-base hits, and a ${top.current_hit_streak}-game current hit streak.`
  );
}

function renderHotKpis() {
  if (!allRows.length) return;

  const minAb = Math.max(5, selectedWindow * 1.5);

  const bestAvg = [...allRows]
    .filter((row) => Number(row.at_bats || 0) >= minAb)
    .sort(
      (a, b) =>
        Number(b.batting_average || 0) - Number(a.batting_average || 0)
    )[0];

  const mostHr = [...allRows].sort(
    (a, b) => Number(b.home_runs || 0) - Number(a.home_runs || 0)
  )[0];

  const bestHitRate = [...allRows].sort(
    (a, b) => Number(b.hit_rate || 0) - Number(a.hit_rate || 0)
  )[0];

  if (bestAvg) {
    setText("kpiAvg", cleanPlayerName(bestAvg.full_name));
    setText(
      "kpiAvgSub",
      `${fmtAvg(bestAvg.batting_average)} AVG · ${bestAvg.hits} hits`
    );
  }

  if (mostHr) {
    setText("kpiHr", cleanPlayerName(mostHr.full_name));
    setText("kpiHrSub", `${mostHr.home_runs} HR · ${mostHr.rbi} RBI`);
  }

  if (bestHitRate) {
    setText("kpiHitRate", cleanPlayerName(bestHitRate.full_name));
    setText(
      "kpiHitRateSub",
      `${fmtPct(bestHitRate.hit_rate)} · ${bestHitRate.games_with_hit}/${bestHitRate.games} games`
    );
  }
}

function getFilteredHotRows() {
  const term = searchTerm.trim().toLowerCase();

  if (!term) {
    return allRows;
  }

  return allRows.filter((row) =>
    String(row.full_name || "").toLowerCase().includes(term)
  );
}

function renderHotTable() {
  const rows = getFilteredHotRows();

  if (!rows.length) {
    setHtml(
      "hittersTableBody",
      `
      <tr>
        <td colspan="17" class="empty-state">No hitters match your search.</td>
      </tr>
    `
    );

    return;
  }

  setHtml(
    "hittersTableBody",
    rows
      .map((row, index) => {
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
              <div class="player-name">${cleanPlayerName(row.full_name)}</div>
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
        <td class="num">${fmtNumber(row.current_hit_streak)}</td>
        <td class="num">${fmtAvg(row.batting_average)}</td>
        <td class="num">${fmtNumber(row.at_bats)}</td>
        <td class="num">${fmtNumber(row.hits)}</td>
        <td class="num">${fmtNumber(row.doubles)}</td>
        <td class="num">${fmtNumber(row.triples)}</td>
        <td class="num">${fmtNumber(row.home_runs)}</td>
        <td class="num">${fmtNumber(row.walks)}</td>
        <td class="num">${fmtNumber(row.stolen_bases)}</td>
        <td class="num">${fmtNumber(row.rbi)}</td>
        <td class="num">${fmtNumber(row.strikeouts)}</td>
        <td>${row.latest_game_date || "—"}</td>
      </tr>
    `;
      })
      .join("")
  );
}

function openPlayerDrawer(playerId) {
  const hot = findHotRow(playerId);
  const split = findSplitRow(playerId);

  const playerName = cleanPlayerName(
    hot?.full_name || split?.full_name || "Unknown Player"
  );

  setText("drawerPlayerName", playerName);
  setText(
    "drawerPlayerSub",
    `Player ID ${playerId} · ${selectedWindow}-game form and 2026 splits`
  );

  setText("drawerHotScore", hot ? Number(hot.hot_score || 0).toFixed(1) : "—");
  setText("drawerAvg", hot ? fmtAvg(hot.batting_average) : "—");
  setText("drawerHitRate", hot ? fmtPct(hot.hit_rate) : "—");
  setText("drawerStreak", hot ? fmtNumber(hot.current_hit_streak) : "—");

  setText("drawerAb", hot ? fmtNumber(hot.at_bats) : "—");
  setText("drawerHits", hot ? fmtNumber(hot.hits) : "—");
  setText("drawerHr", hot ? fmtNumber(hot.home_runs) : "—");
  setText("drawerRbi", hot ? fmtNumber(hot.rbi) : "—");
  setText("drawerBb", hot ? fmtNumber(hot.walks) : "—");
  setText("drawerSb", hot ? fmtNumber(hot.stolen_bases) : "—");

  setText("drawerLhpAvg", split ? fmtAvg(split.vs_lhp_avg) : "—");
  setText(
    "drawerLhpAb",
    split ? `${fmtNumber(split.vs_lhp_ab)} AB` : "— AB"
  );

  setText("drawerRhpAvg", split ? fmtAvg(split.vs_rhp_avg) : "—");
  setText(
    "drawerRhpAb",
    split ? `${fmtNumber(split.vs_rhp_ab)} AB` : "— AB"
  );

  setText("drawerHomeAvg", split ? fmtAvg(split.home_avg) : "—");
  setText(
    "drawerHomeAb",
    split ? `${fmtNumber(split.home_ab)} AB` : "— AB"
  );

  setText("drawerAwayAvg", split ? fmtAvg(split.away_avg) : "—");
  setText(
    "drawerAwayAb",
    split ? `${fmtNumber(split.away_ab)} AB` : "— AB"
  );

  setText("drawerDayAvg", split ? fmtAvg(split.day_avg) : "—");
  setText("drawerDayAb", split ? `${fmtNumber(split.day_ab)} AB` : "— AB");

  setText("drawerNightAvg", split ? fmtAvg(split.night_avg) : "—");
  setText(
    "drawerNightAb",
    split ? `${fmtNumber(split.night_ab)} AB` : "— AB"
  );

  $("playerDrawer")?.classList.add("open");
  $("drawerBackdrop")?.classList.add("open");
}

function closePlayerDrawer() {
  $("playerDrawer")?.classList.remove("open");
  $("drawerBackdrop")?.classList.remove("open");
}

function refreshCurrentView() {
  loadHotData();
}

function wireEvents() {
  document.querySelectorAll("#windowButtons .segment").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll("#windowButtons .segment")
        .forEach((btn) => btn.classList.remove("active"));

      button.classList.add("active");
      selectedWindow = Number(button.dataset.window);
      loadHotData();
    });
  });

  $("playerSearch")?.addEventListener("input", (event) => {
    searchTerm = event.target.value;
    renderHotTable();
  });

  $("refreshButton")?.addEventListener("click", refreshCurrentView);
  $("drawerClose")?.addEventListener("click", closePlayerDrawer);
  $("drawerBackdrop")?.addEventListener("click", closePlayerDrawer);

  document.addEventListener("click", (event) => {
    const row = event.target.closest(".clickable-row");

    if (!row) return;

    const playerId = row.dataset.playerId;

    if (playerId) {
      openPlayerDrawer(playerId);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePlayerDrawer();
    }
  });
}

wireEvents();
loadHotData();
