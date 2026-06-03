const SUPABASE_URL = "https://squcmdsivnnxzblsfciu.supabase.co";
const SUPABASE_KEY = "sb_publishable_pumFxQJ7pYyRC8lrjSvtZA_x63TVYtq";

const TEAM_ID = 113;

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let selectedWindow = 10;
let allRows = [];
let searchTerm = "";

const tableBody = document.getElementById("hittersTableBody");
const statusPill = document.getElementById("statusPill");
const lastRefresh = document.getElementById("lastRefresh");
const playerSearch = document.getElementById("playerSearch");

const kpiHottest = document.getElementById("kpiHottest");
const kpiHottestSub = document.getElementById("kpiHottestSub");
const kpiAvg = document.getElementById("kpiAvg");
const kpiAvgSub = document.getElementById("kpiAvgSub");
const kpiHr = document.getElementById("kpiHr");
const kpiHrSub = document.getElementById("kpiHrSub");
const kpiHitRate = document.getElementById("kpiHitRate");
const kpiHitRateSub = document.getElementById("kpiHitRateSub");

function fmtAvg(value) {
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

function cleanPlayerName(name) {
  if (!name) return "Unknown";

  if (name.startsWith("Historical Reds Player")) {
    return name.replace("Historical Reds Player", "Player");
  }

  return name;
}

async function loadData() {
  statusPill.textContent = `Loading last ${selectedWindow} games...`;
  tableBody.innerHTML = `
    <tr>
      <td colspan="16" class="empty-state">Loading Reds hitter data...</td>
    </tr>
  `;

  const { data, error } = await client.rpc("get_team_hot_hitters", {
    p_team_id: TEAM_ID,
    p_last_n: selectedWindow,
  });

  if (error) {
    console.error(error);
    statusPill.textContent = "Error loading data";
    tableBody.innerHTML = `
      <tr>
        <td colspan="16" class="empty-state">
          Error loading data: ${error.message}
        </td>
      </tr>
    `;
    return;
  }

  allRows = data || [];

  allRows.sort((a, b) => {
    return Number(b.hot_score || 0) - Number(a.hot_score || 0);
  });

  statusPill.textContent = `${allRows.length} hitters · Last ${selectedWindow} games`;

  const now = new Date();
  lastRefresh.textContent = `Last refresh: ${now.toLocaleString()}`;

  renderKpis();
  renderTable();
}

function getFilteredRows() {
  const term = searchTerm.trim().toLowerCase();

  if (!term) {
    return allRows;
  }

  return allRows.filter((row) =>
    String(row.full_name || "").toLowerCase().includes(term)
  );
}

function renderKpis() {
  if (!allRows.length) {
    kpiHottest.textContent = "—";
    kpiHottestSub.textContent = "No rows returned";
    kpiAvg.textContent = "—";
    kpiAvgSub.textContent = "No rows returned";
    kpiHr.textContent = "—";
    kpiHrSub.textContent = "No rows returned";
    kpiHitRate.textContent = "—";
    kpiHitRateSub.textContent = "No rows returned";
    return;
  }

  const hottest = [...allRows].sort(
    (a, b) => Number(b.hot_score || 0) - Number(a.hot_score || 0)
  )[0];

  const bestAvg = [...allRows]
    .filter((row) => Number(row.at_bats || 0) >= Math.max(5, selectedWindow * 1.5))
    .sort((a, b) => Number(b.batting_average || 0) - Number(a.batting_average || 0))[0];

  const mostHr = [...allRows].sort(
    (a, b) => Number(b.home_runs || 0) - Number(a.home_runs || 0)
  )[0];

  const bestHitRate = [...allRows].sort(
    (a, b) => Number(b.hit_rate || 0) - Number(a.hit_rate || 0)
  )[0];

  kpiHottest.textContent = cleanPlayerName(hottest.full_name);
  kpiHottestSub.textContent = `Hot Score ${Number(hottest.hot_score || 0).toFixed(1)} · ${hottest.heat_label}`;

  if (bestAvg) {
    kpiAvg.textContent = cleanPlayerName(bestAvg.full_name);
    kpiAvgSub.textContent = `${fmtAvg(bestAvg.batting_average)} AVG · ${bestAvg.hits} hits`;
  }

  kpiHr.textContent = cleanPlayerName(mostHr.full_name);
  kpiHrSub.textContent = `${mostHr.home_runs} HR · ${mostHr.rbi} RBI`;

  kpiHitRate.textContent = cleanPlayerName(bestHitRate.full_name);
  kpiHitRateSub.textContent = `${fmtPct(bestHitRate.hit_rate)} · ${bestHitRate.games_with_hit}/${bestHitRate.games} games`;
}

function renderTable() {
  const rows = getFilteredRows();

  if (!rows.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="16" class="empty-state">No hitters match your search.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = rows
    .map((row) => {
      const heat = heatMeta(row.heat_label);

      return `
        <tr>
          <td>
            <span class="heat-badge ${heat.className}">
              <span>${heat.emoji}</span>
              <span>${heat.label}</span>
            </span>
          </td>

          <td>
            <div class="player-name">${cleanPlayerName(row.full_name)}</div>
            <div class="player-sub">${row.games_with_hit}/${row.games} games with hit · ${row.extra_base_hits} XBH</div>
          </td>

          <td class="num">
            <span class="score-pill">${Number(row.hot_score || 0).toFixed(1)}</span>
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
}

function wireEvents() {
  document.querySelectorAll(".window-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".window-button").forEach((btn) => {
        btn.classList.remove("active");
      });

      button.classList.add("active");
      selectedWindow = Number(button.dataset.window);
      loadData();
    });
  });

  playerSearch.addEventListener("input", (event) => {
    searchTerm = event.target.value;
    renderTable();
  });
}

wireEvents();
loadData();
