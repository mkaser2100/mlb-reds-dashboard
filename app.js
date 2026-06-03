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
const refreshButton = document.getElementById("refreshButton");
const activeWindowLabel = document.getElementById("activeWindowLabel");

const heroPlayer = document.getElementById("heroPlayer");
const heroScore = document.getElementById("heroScore");
const heroNarrative = document.getElementById("heroNarrative");

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
  if (!row) {
    return "Loading hitter form model...";
  }

  return `${cleanPlayerName(row.full_name)} leads the current ${selectedWindow}-game model with a ${Number(row.hot_score || 0).toFixed(1)} Hot Score, a ${fmtPct(row.hit_rate)} hit rate, ${row.hits} hits, ${row.extra_base_hits} extra-base hits, and a ${row.current_hit_streak}-game current hit streak.`;
}

async function loadData() {
  activeWindowLabel.textContent = `Last ${selectedWindow} Games`;
  statusPill.textContent = `Loading last ${selectedWindow} games...`;

  tableBody.innerHTML = `
    <tr>
      <td colspan="17" class="empty-state">Loading Reds hitter intelligence...</td>
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
        <td colspan="17" class="empty-state">
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

  statusPill.textContent = `${allRows.length} hitters · Last ${selectedWindow}`;
  lastRefresh.textContent = `Last refresh: ${new Date().toLocaleString()}`;

  renderHero();
  renderKpis();
  renderTable();
}

function renderHero() {
  const top = allRows[0];

  if (!top) {
    heroPlayer.textContent = "—";
    heroScore.textContent = "Hot Score —";
    heroNarrative.textContent = "No hitter data returned.";
    return;
  }

  const heat = heatMeta(top.heat_label);

  heroPlayer.textContent = `${heat.emoji} ${cleanPlayerName(top.full_name)}`;
  heroScore.textContent = `Hot Score ${Number(top.hot_score || 0).toFixed(1)} · ${top.heat_label}`;
  heroNarrative.textContent = narrativeFor(top);
}

function renderKpis() {
  if (!allRows.length) {
    kpiAvg.textContent = "—";
    kpiAvgSub.textContent = "No rows returned";
    kpiHr.textContent = "—";
    kpiHrSub.textContent = "No rows returned";
    kpiHitRate.textContent = "—";
    kpiHitRateSub.textContent = "No rows returned";
    return;
  }

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
    kpiAvg.textContent = cleanPlayerName(bestAvg.full_name);
    kpiAvgSub.textContent = `${fmtAvg(bestAvg.batting_average)} AVG · ${bestAvg.hits} hits`;
  }

  kpiHr.textContent = cleanPlayerName(mostHr.full_name);
  kpiHrSub.textContent = `${mostHr.home_runs} HR · ${mostHr.rbi} RBI`;

  kpiHitRate.textContent = cleanPlayerName(bestHitRate.full_name);
  kpiHitRateSub.textContent = `${fmtPct(bestHitRate.hit_rate)} · ${bestHitRate.games_with_hit}/${bestHitRate.games} games`;
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

function renderTable() {
  const rows = getFilteredRows();

  if (!rows.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="17" class="empty-state">No hitters match your search.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = rows
    .map((row, index) => {
      const heat = heatMeta(row.heat_label);
      const score = Number(row.hot_score || 0);
      const scoreWidth = Math.max(4, Math.min(100, score));

      return `
        <tr>
          <td class="rank">
            <span class="rank-badge">${index + 1}</span>
          </td>

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
}

function wireEvents() {
  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".segment").forEach((btn) => {
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

  refreshButton.addEventListener("click", () => {
    loadData();
  });
}

wireEvents();
loadData();
