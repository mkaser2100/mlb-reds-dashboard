const SUPABASE_URL = "https://squcmdsivnnxzblsfciu.supabase.co";
const SUPABASE_KEY = "sb_publishable_pumFxQJ7pYyRC8lrjSvtZA_x63TVYtq";

const TEAM_ID = 113;
const SEASON = 2026;

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let selectedWindow = 10;
let currentView = "hot";

let allRows = [];
let searchTerm = "";

let splitsRows = [];
let splitsSearchTerm = "";
let splitsSortKey = "vs_lhp_ops";

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

function showFatalError(message, detail = "") {
  console.error(message, detail);

  const hotTable = $("hittersTableBody");
  const splitsTable = $("splitsTableBody");

  const html = `
    <tr>
      <td colspan="17" class="empty-state">
        <strong>App error:</strong> ${message}
        ${detail ? `<br><span style="color:#94a3b8">${detail}</span>` : ""}
      </td>
    </tr>
  `;

  if (hotTable) hotTable.innerHTML = html;
  if (splitsTable) splitsTable.innerHTML = html;

  setText("statusPill", "App error");
  setText("splitsStatusPill", "App error");
}

function fmtAvg(value) {
  if (value === null || value === undefined) return "—";
  const n = Number(value || 0);
  return n.toFixed(3).replace(/^0/, "");
}

function fmtOps(value) {
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

  if (name.startsWith("Historical Reds Player")) {
    return name.replace("Historical Reds Player", "Player");
  }

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

function narrativeFor(row) {
  if (!row) return "Loading hitter form model...";

  return `${cleanPlayerName(row.full_name)} leads the player-last-${selectedWindow}-games model with a ${Number(row.hot_score || 0).toFixed(1)} Hot Score, a ${fmtPct(row.hit_rate)} hit rate, ${row.hits} hits, ${row.extra_base_hits} extra-base hits, and a ${row.current_hit_streak}-game current hit streak.`;
}

function opsClass(value) {
  const n = Number(value || 0);

  if (n >= 0.900) return "ops-strong";
  if (n >= 0.780) return "ops-good";
  if (n >= 0.680) return "ops-watch";
  return "ops-low";
}

function bestSplitFor(row) {
  const candidates = [
    { label: "vs LHP", avg: row.vs_lhp_avg, ops: row.vs_lhp_ops, ab: row.vs_lhp_ab },
    { label: "vs RHP", avg: row.vs_rhp_avg, ops: row.vs_rhp_ops, ab: row.vs_rhp_ab },
    { label: "Home", avg: row.home_avg, ops: row.home_ops, ab: row.home_ab },
    { label: "Away", avg: row.away_avg, ops: row.away_ops, ab: row.away_ab },
    { label: "Day", avg: row.day_avg, ops: row.day_ops, ab: row.day_ab },
    { label: "Night", avg: row.night_avg, ops: row.night_ops, ab: row.night_ab },
  ];

  return candidates
    .filter((item) => item.ops !== null && item.ops !== undefined && Number(item.ab || 0) > 0)
    .sort((a, b) => Number(b.ops || 0) - Number(a.ops || 0))[0];
}

async function loadHotData() {
  try {
    setText("activeWindowLabel", `Player Last ${selectedWindow} Games`);
    setText("statusPill", `Loading last ${selectedWindow} games...`);

    setHtml("hittersTableBody", `
      <tr>
        <td colspan="17" class="empty-state">Loading Reds hitter intelligence...</td>
      </tr>
    `);

    const { data, error } = await client.rpc("get_team_hot_hitters", {
      p_team_id: TEAM_ID,
      p_last_n: selectedWindow,
    });

    if (error) {
      throw new Error(error.message);
    }

    allRows = data || [];
    allRows.sort((a, b) => Number(b.hot_score || 0) - Number(a.hot_score || 0));

    setText("statusPill", `${allRows.length} hitters · Player last ${selectedWindow} games`);
    setText("lastRefresh", `Last refresh: ${new Date().toLocaleString()}`);

    renderHero();
    renderKpis();
    renderHotTable();
  } catch (err) {
    showFatalError("Could not load Hot Board data.", err.message);
  }
}

async function loadSplitsData() {
  try {
    setText("splitsStatusPill", "Loading season splits...");

    setHtml("splitsTableBody", `
      <tr>
        <td colspan="13" class="empty-state">Loading Reds split data...</td>
      </tr>
    `);

    const { data, error } = await client.rpc("get_team_batting_splits", {
      p_team_id: TEAM_ID,
      p_season: SEASON,
    });

    if (error) {
      throw new Error(error.message);
    }

    splitsRows = data || [];

    setText("splitsStatusPill", `${splitsRows.length} hitters · 2026 splits`);
    setText("splitsLastRefresh", `Last refresh: ${new Date().toLocaleString()}`);

    renderSplitsHero();
    renderSplitsKpis();
    renderSplitsTable();
  } catch (err) {
    showFatalError("Could not load Splits data.", err.message);
  }
}

function renderHero() {
  const top = allRows[0];

  if (!top) {
    setText("heroPlayer", "—");
    setText("heroScore", "Hot Score —");
    setText("heroNarrative", "No hitter data returned.");
    return;
  }

  const heat = heatMeta(top.heat_label);

  setText("heroPlayer", `${heat.emoji} ${cleanPlayerName(top.full_name)}`);
  setText("heroScore", `Hot Score ${Number(top.hot_score || 0).toFixed(1)} · ${top.heat_label}`);
  setText("heroNarrative", narrativeFor(top));
}

function renderKpis() {
  if (!allRows.length) return;

  const minAb = Math.max(5, selectedWindow * 1.5);

  const bestAvg = [...allRows]
    .filter((row) => Number(row.at_bats || 0) >= minAb)
    .sort((a, b) => Number(b.batting_average || 0) - Number(a.batting_average || 0))[0];

  const mostHr = [...allRows].sort(
    (a, b) => Number(b.home_runs || 0) - Number(a.home_runs || 0)
  )[0];

  const bestHitRate = [...allRows].sort(
    (a, b) => Number(b.hit_rate || 0) - Number(a.hit_rate || 0)
  )[0];

  if (bestAvg) {
    setText("kpiAvg", cleanPlayerName(bestAvg.full_name));
    setText("kpiAvgSub", `${fmtAvg(bestAvg.batting_average)} AVG · ${bestAvg.hits} hits`);
  }

  if (mostHr) {
    setText("kpiHr", cleanPlayerName(mostHr.full_name));
    setText("kpiHrSub", `${mostHr.home_runs} HR · ${mostHr.rbi} RBI`);
  }

  if (bestHitRate) {
    setText("kpiHitRate", cleanPlayerName(bestHitRate.full_name));
    setText("kpiHitRateSub", `${fmtPct(bestHitRate.hit_rate)} · ${bestHitRate.games_with_hit}/${bestHitRate.games} games`);
  }
}

function getFilteredHotRows() {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return allRows;

  return allRows.filter((row) =>
    String(row.full_name || "").toLowerCase().includes(term)
  );
}

function renderHotTable() {
  const rows = getFilteredHotRows();

  if (!rows.length) {
    setHtml("hittersTableBody", `
      <tr>
        <td colspan="17" class="empty-state">No hitters match your search.</td>
      </tr>
    `);
    return;
  }

  const html = rows
    .map((row, index) => {
      const heat = heatMeta(row.heat_label);
      const score = Number(row.hot_score || 0);
      const scoreWidth = Math.max(4, Math.min(100, score));

      return `
        <tr>
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
                <div class="player-sub">${row.games_with_hit}/${row.games} games with hit · ${row.extra_base_hits} XBH</div>
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
    .join("");

  setHtml("hittersTableBody", html);
}

function getFilteredSplitsRows() {
  const term = splitsSearchTerm.trim().toLowerCase();

  const filtered = !term
    ? splitsRows
    : splitsRows.filter((row) =>
        String(row.full_name || "").toLowerCase().includes(term)
      );

  return [...filtered].sort((a, b) => Number(b[splitsSortKey] || 0) - Number(a[splitsSortKey] || 0));
}

function renderSplitsHero() {
  const sorted = [...splitsRows].sort(
    (a, b) => Number(b[splitsSortKey] || 0) - Number(a[splitsSortKey] || 0)
  );

  const top = sorted[0];

  if (!top) {
    setText("splitsHeroPlayer", "—");
    setText("splitsHeroScore", "Best Split —");
    setText("splitsHeroNarrative", "No split data returned.");
    return;
  }

  const best = bestSplitFor(top);

  setText("splitsHeroPlayer", `↔ ${cleanPlayerName(top.full_name)}`);
  setText("splitsHeroScore", `${best?.label || "Best Split"} · ${fmtOps(best?.ops)} OPS`);
  setText(
    "splitsHeroNarrative",
    `${cleanPlayerName(top.full_name)} is currently the top split signal based on ${splitsSortKey.replaceAll("_", " ").toUpperCase()}, with ${best?.label || "a strong split"} showing ${fmtAvg(best?.avg)} AVG and ${fmtOps(best?.ops)} OPS.`
  );
}

function renderSplitsKpis() {
  if (!splitsRows.length) return;

  const minAb = 10;

  const bestBy = (key, abKey) =>
    [...splitsRows]
      .filter((row) => Number(row[abKey] || 0) >= minAb)
      .sort((a, b) => Number(b[key] || 0) - Number(a[key] || 0))[0];

  const bestLhp = bestBy("vs_lhp_ops", "vs_lhp_ab");
  const bestRhp = bestBy("vs_rhp_ops", "vs_rhp_ab");
  const bestHome = bestBy("home_ops", "home_ab");
  const bestAway = bestBy("away_ops", "away_ab");

  if (bestLhp) {
    setText("kpiLhp", cleanPlayerName(bestLhp.full_name));
    setText("kpiLhpSub", `${fmtAvg(bestLhp.vs_lhp_avg)} AVG · ${fmtOps(bestLhp.vs_lhp_ops)} OPS`);
  }

  if (bestRhp) {
    setText("kpiRhp", cleanPlayerName(bestRhp.full_name));
    setText("kpiRhpSub", `${fmtAvg(bestRhp.vs_rhp_avg)} AVG · ${fmtOps(bestRhp.vs_rhp_ops)} OPS`);
  }

  if (bestHome) {
    setText("kpiHome", cleanPlayerName(bestHome.full_name));
    setText("kpiHomeSub", `${fmtAvg(bestHome.home_avg)} AVG · ${fmtOps(bestHome.home_ops)} OPS`);
  }

  if (bestAway) {
    setText("kpiAway", cleanPlayerName(bestAway.full_name));
    setText("kpiAwaySub", `${fmtAvg(bestAway.away_avg)} AVG · ${fmtOps(bestAway.away_ops)} OPS`);
  }
}

function renderSplitsTable() {
  const rows = getFilteredSplitsRows();

  if (!rows.length) {
    setHtml("splitsTableBody", `
      <tr>
        <td colspan="13" class="empty-state">No players match your search.</td>
      </tr>
    `);
    return;
  }

  const html = rows
    .map((row, index) => {
      const best = bestSplitFor(row);

      return `
        <tr>
          <td class="rank"><span class="rank-badge">${index + 1}</span></td>

          <td>
            <div class="player-cell">
              <div class="avatar">${initials(row.full_name)}</div>
              <div>
                <div class="player-name">${cleanPlayerName(row.full_name)}</div>
                <div class="player-sub">Season splits · ${SEASON}</div>
              </div>
            </div>
          </td>

          <td>
            <span class="best-split-badge">
              ${best?.label || "—"} · ${fmtOps(best?.ops)} OPS
            </span>
          </td>

          <td class="num">${fmtAvg(row.vs_lhp_avg)}</td>
          <td class="num ${opsClass(row.vs_lhp_ops)}">${fmtOps(row.vs_lhp_ops)}</td>
          <td class="num">${fmtAvg(row.vs_rhp_avg)}</td>
          <td class="num ${opsClass(row.vs_rhp_ops)}">${fmtOps(row.vs_rhp_ops)}</td>
          <td class="num">${fmtAvg(row.home_avg)}</td>
          <td class="num ${opsClass(row.home_ops)}">${fmtOps(row.home_ops)}</td>
          <td class="num">${fmtAvg(row.away_avg)}</td>
          <td class="num ${opsClass(row.away_ops)}">${fmtOps(row.away_ops)}</td>
          <td class="num">${fmtAvg(row.day_avg)}</td>
          <td class="num">${fmtAvg(row.night_avg)}</td>
        </tr>
      `;
    })
    .join("");

  setHtml("splitsTableBody", html);
}

function setView(view) {
  currentView = view;

  document.querySelectorAll(".nav-item[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  const hotView = $("hotView");
  const splitsView = $("splitsView");

  if (hotView) hotView.classList.toggle("active-view", view === "hot");
  if (splitsView) splitsView.classList.toggle("active-view", view === "splits");

  if (view === "hot") {
    setText("pageTitle", "Hitter Intelligence Center");
    setText("pageSubtitle", "Hot hitter detection, recent form, and split-based matchup intelligence.");

    if (!allRows.length) {
      loadHotData();
    }
  }

  if (view === "splits") {
    setText("pageTitle", "Splits Intelligence");
    setText("pageSubtitle", "Season splits by venue, time of day, and opposing pitcher handedness.");

    if (!splitsRows.length) {
      loadSplitsData();
    }
  }
}

function refreshCurrentView() {
  if (currentView === "hot") {
    loadHotData();
  } else {
    loadSplitsData();
  }
}

function wireEvents() {
  try {
    document.querySelectorAll(".nav-item[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        setView(button.dataset.view);
      });
    });

    document.querySelectorAll("#windowButtons .segment").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("#windowButtons .segment").forEach((btn) => {
          btn.classList.remove("active");
        });

        button.classList.add("active");
        selectedWindow = Number(button.dataset.window);
        loadHotData();
      });
    });

    document.querySelectorAll("#splitsSortButtons .segment").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("#splitsSortButtons .segment").forEach((btn) => {
          btn.classList.remove("active");
        });

        button.classList.add("active");
        splitsSortKey = button.dataset.sort;
        renderSplitsHero();
        renderSplitsTable();
      });
    });

    const playerSearch = $("playerSearch");
    if (playerSearch) {
      playerSearch.addEventListener("input", (event) => {
        searchTerm = event.target.value;
        renderHotTable();
      });
    }

    const splitsSearch = $("splitsSearch");
    if (splitsSearch) {
      splitsSearch.addEventListener("input", (event) => {
        splitsSearchTerm = event.target.value;
        renderSplitsTable();
      });
    }

    const refreshButton = $("refreshButton");
    if (refreshButton) {
      refreshButton.addEventListener("click", refreshCurrentView);
    }
  } catch (err) {
    showFatalError("Could not wire app events.", err.message);
  }
}

wireEvents();
loadHotData();
