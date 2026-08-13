/* =========================================================
   MLB Hit Board — Phase 5C
   Selected-game starting-pitcher matchup card
   Reuses the Team Hit Board Home/Away SP interaction pattern.
   Build: phase5c-selected-game-pitcher-card-20260812
   ========================================================= */

console.info("MLB Hit Lab Phase 5C loaded: phase5c-selected-game-pitcher-card-20260812");

let phase5cPitcherSide =
  localStorage.getItem("mlbSelectedPitcherSide") === "away" ? "away" : "home";

let phase5cPitcherRows = [];
let phase5cPitchersLoaded = false;
let phase5cPitchersLoading = false;

const phase5cPreviousRenderMlbHitBoardPage = renderMlbHitBoardPage;

function phase5cSelectedGameContextRows() {
  const game = phase5bSelectedGame?.();
  if (!game) return [];

  return (phase5cPitcherRows || [])
    .filter((row) => String(row.game_pk) === String(game.game_pk))
    .sort((a, b) => String(a.pitcher_side).localeCompare(String(b.pitcher_side)));
}

function phase5cPitcherForSide(side = phase5cPitcherSide) {
  return phase5cSelectedGameContextRows().find(
    (row) => String(row.pitcher_side).toLowerCase() === String(side).toLowerCase()
  ) || null;
}

function phase5cFormatAvg(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(3).replace(/^0/, "");
}

function phase5cFormatRate(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

function phase5cPitcherRoleLabel(side) {
  return side === "home" ? "Home Starting Pitcher" : "Away Starting Pitcher";
}

function phase5cGameTitle(game) {
  if (!game) return "Selected MLB Matchup";
  return `${game.away_team_name || "Away"} at ${game.home_team_name || "Home"}`;
}

function phase5cGameSubtitle(game, pitcher = null) {
  if (!game) return "";

  const pieces = [];
  if (game.game_time_utc) {
    pieces.push(formatEasternGameTime(game.game_time_utc));
  }
  if (game.venue_name) pieces.push(game.venue_name);

  return pieces.filter(Boolean).join(" · ");
}

function phase5cRenderPitcherToggle(game, contextRows) {
  const home = contextRows.find((row) => row.pitcher_side === "home");
  const away = contextRows.find((row) => row.pitcher_side === "away");

  return `
    <div class="segmented phase5c-pitcher-toggle" role="group" aria-label="Starting pitcher">
      <button
        class="segment ${phase5cPitcherSide === "home" ? "active" : ""}"
        type="button"
        data-phase5c-pitcher-side="home"
        aria-pressed="${phase5cPitcherSide === "home"}"
        ${home ? "" : "disabled"}
      >
        Home SP · ${escapeHtml(game?.home_team_name || home?.pitcher_team_name || "Home")}
      </button>
      <button
        class="segment ${phase5cPitcherSide === "away" ? "active" : ""}"
        type="button"
        data-phase5c-pitcher-side="away"
        aria-pressed="${phase5cPitcherSide === "away"}"
        ${away ? "" : "disabled"}
      >
        Away SP · ${escapeHtml(game?.away_team_name || away?.pitcher_team_name || "Away")}
      </button>
    </div>
  `;
}

function phase5cRenderSelectedGamePitcherCard() {
  const game = phase5bSelectedGame?.();
  if (!game) return "";

  const contextRows = phase5cSelectedGameContextRows();
  const pitcher = phase5cPitcherForSide();

  if (phase5cPitchersLoading && !phase5cPitchersLoaded) {
    return `
      <section class="matchup-hero phase5c-selected-game-matchup">
        <div class="matchup-header">
          <div>
            <div class="eyebrow">⚾ Today's Matchup</div>
            <h2>${escapeHtml(phase5cGameTitle(game))}</h2>
            <p class="matchup-subtitle">${escapeHtml(phase5cGameSubtitle(game))}</p>
          </div>
          <div class="matchup-score-pill">Matchup Model</div>
        </div>
        <div class="phase5c-loading-state">Loading starting-pitcher context…</div>
      </section>
    `;
  }

  if (!pitcher) {
    return `
      <section class="matchup-hero phase5c-selected-game-matchup">
        <div class="matchup-header">
          <div>
            <div class="eyebrow">⚾ Today's Matchup</div>
            <h2>${escapeHtml(phase5cGameTitle(game))}</h2>
            <p class="matchup-subtitle">${escapeHtml(phase5cGameSubtitle(game))}</p>
          </div>
          ${phase5cRenderPitcherToggle(game, contextRows)}
        </div>
        <div class="phase5c-loading-state">
          Starting-pitcher context is not available for the selected side.
        </div>
      </section>
    `;
  }

  return `
    <section class="matchup-hero phase5c-selected-game-matchup">
      <div class="matchup-header phase5c-matchup-header">
        <div>
          <div class="eyebrow">⚾ Today's Matchup</div>
          <h2>${escapeHtml(phase5cGameTitle(game))}</h2>
          <p class="matchup-subtitle">${escapeHtml(phase5cGameSubtitle(game, pitcher))}</p>
        </div>

        <div class="phase5c-matchup-actions">
          ${phase5cRenderPitcherToggle(game, contextRows)}
          <div class="matchup-score-pill">Matchup Model</div>
        </div>
      </div>

      <div class="phase5c-metric-context">
        <strong>Matchup Pitcher</strong>
        <span>Recent form and handedness splits</span>
      </div>

      <div class="matchup-grid phase5c-pitcher-grid">
        <article class="matchup-stat-card">
          <div class="label">${escapeHtml(phase5cPitcherRoleLabel(phase5cPitcherSide))}</div>
          <div class="value">${escapeHtml(pitcher.pitcher_name || "—")}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">Throws</div>
          <div class="value">${escapeHtml(pitcher.pitcher_throws || "—")}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">Last 5 ERA</div>
          <div class="value">${escapeHtml(phase5cFormatRate(pitcher.last5_era))}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">Last 5 WHIP</div>
          <div class="value">${escapeHtml(phase5cFormatRate(pitcher.last5_whip))}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">BAA vs LHB</div>
          <div class="value">${escapeHtml(phase5cFormatAvg(pitcher.baa_vs_lhb))}</div>
        </article>

        <article class="matchup-stat-card">
          <div class="label">BAA vs RHB</div>
          <div class="value">${escapeHtml(phase5cFormatAvg(pitcher.baa_vs_rhb))}</div>
        </article>
      </div>
    </section>
  `;
}

function phase5cReplaceMatchupCard() {
  if (selectedMlbBoardScope !== PHASE5B_SCOPE_GAME) return;

  const content = document.getElementById("mlbHitBoardContent");
  if (!content) return;

  const currentCard = content.querySelector(".matchup-hero");
  if (!currentCard) return;

  currentCard.outerHTML = phase5cRenderSelectedGamePitcherCard();
}

renderMlbHitBoardPage = function renderMlbHitBoardPagePhase5c(error = null) {
  const result = phase5cPreviousRenderMlbHitBoardPage(error);

  if (selectedMlbBoardScope === PHASE5B_SCOPE_GAME) {
    phase5cReplaceMatchupCard();
  }

  return result;
};

async function phase5cLoadPitcherContext(force = false) {
  if (phase5cPitchersLoading) return;
  if (phase5cPitchersLoaded && !force) return;

  phase5cPitchersLoading = true;

  try {
    const { data, error } = await client
      .from("v_mlb_game_starting_pitcher_context")
      .select("*")
      .order("prediction_run_date", { ascending: false })
      .order("game_pk", { ascending: true })
      .order("pitcher_side", { ascending: true });

    if (error) throw error;

    const raw = data || [];
    const latestDate = raw[0]?.prediction_run_date || null;

    phase5cPitcherRows = raw.filter(
      (row) => !latestDate || row.prediction_run_date === latestDate
    );

    phase5cPitchersLoaded = true;

    const currentRows = phase5cSelectedGameContextRows();
    if (!currentRows.some((row) => row.pitcher_side === phase5cPitcherSide)) {
      phase5cPitcherSide =
        currentRows.some((row) => row.pitcher_side === "home") ? "home" :
        currentRows.some((row) => row.pitcher_side === "away") ? "away" :
        "home";
    }

    if (selectedMlbBoardScope === PHASE5B_SCOPE_GAME) {
      phase5cReplaceMatchupCard();
    }
  } catch (err) {
    console.error("Phase 5C pitcher-context load failed:", err);
    phase5cPitcherRows = [];
    phase5cPitchersLoaded = false;
    if (selectedMlbBoardScope === PHASE5B_SCOPE_GAME) {
      phase5cReplaceMatchupCard();
    }
  } finally {
    phase5cPitchersLoading = false;
  }
}

function phase5cSetPitcherSide(side) {
  if (!["home", "away"].includes(side)) return;

  const available = phase5cSelectedGameContextRows().some(
    (row) => row.pitcher_side === side
  );
  if (!available) return;

  phase5cPitcherSide = side;
  localStorage.setItem("mlbSelectedPitcherSide", side);
  phase5cReplaceMatchupCard();
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-phase5c-pitcher-side]");
  if (!button) return;

  event.preventDefault();
  phase5cSetPitcherSide(button.dataset.phase5cPitcherSide);
});

document.getElementById("refreshButton")?.addEventListener("click", () => {
  phase5cPitchersLoaded = false;
  setTimeout(() => phase5cLoadPitcherContext(true), 0);
});

async function runPhase5cContractTest() {
  const results = [];

  try {
    const { data, error } = await client
      .from("v_mlb_game_starting_pitcher_context")
      .select("prediction_run_date,game_pk,pitcher_side,pitcher_id,pitcher_name,pitcher_team_name,pitcher_throws,last5_era,last5_whip,baa_vs_lhb,baa_vs_rhb")
      .order("prediction_run_date", { ascending: false });

    if (error) throw error;

    const raw = data || [];
    const latestDate = raw[0]?.prediction_run_date || null;
    const rows = raw.filter(
      (row) => !latestDate || row.prediction_run_date === latestDate
    );

    const byGame = new Map();
    rows.forEach((row) => {
      const key = String(row.game_pk);
      const group = byGame.get(key) || [];
      group.push(row);
      byGame.set(key, group);
    });

    const everyGameTwoSides = [...byGame.values()].every((group) => {
      const sides = new Set(group.map((row) => row.pitcher_side));
      return group.length === 2 && sides.has("home") && sides.has("away");
    });

    const duplicateSideKeys = rows.length !== new Set(
      rows.map((row) => `${row.game_pk}|${row.pitcher_side}`)
    ).size;

    results.push(
      {
        check: "pitcher-context-loaded",
        status: rows.length > 0 ? "pass" : "fail",
        detail: `${rows.length} pitcher rows`
      },
      {
        check: "two-sides-per-game",
        status: everyGameTwoSides ? "pass" : "fail",
        detail: `${byGame.size} games`
      },
      {
        check: "no-duplicate-game-side",
        status: duplicateSideKeys ? "fail" : "pass"
      },
      {
        check: "metric-contract",
        status: rows.every((row) =>
          row.pitcher_id &&
          row.pitcher_name &&
          ["home", "away"].includes(row.pitcher_side)
        ) ? "pass" : "fail"
      }
    );
  } catch (err) {
    results.push({
      check: "phase5c-contract-runtime",
      status: "fail",
      detail: err.message || String(err)
    });
  }

  console.table(results);
  window.phase5cContractTest = results;
  return results;
}

function runPhase5cSelfTest() {
  const gameRows = phase5cSelectedGameContextRows();
  const checks = [
    {
      check: "top25-unchanged",
      status: selectedMlbBoardScope === PHASE5B_SCOPE_TOP25
        ? !document.querySelector(".phase5c-selected-game-matchup") ? "pass" : "fail"
        : "not-active"
    },
    {
      check: "selected-game-card",
      status: selectedMlbBoardScope === PHASE5B_SCOPE_GAME
        ? document.querySelector(".phase5c-selected-game-matchup") ? "pass" : "fail"
        : "not-active"
    },
    {
      check: "home-away-toggle",
      status: selectedMlbBoardScope === PHASE5B_SCOPE_GAME && phase5cPitchersLoaded
        ? gameRows.some((row) => row.pitcher_side === "home") &&
          gameRows.some((row) => row.pitcher_side === "away") ? "pass" : "fail"
        : "needs-data"
    },
    {
      check: "team-board-retained",
      status: document.getElementById("hotView") ? "pass" : "fail"
    }
  ];

  console.table(checks);
  window.phase5cSelfTest = checks;
  return checks;
}

window.phase5cSetPitcherSide = phase5cSetPitcherSide;
window.runPhase5cSelfTest = runPhase5cSelfTest;
window.runPhase5cContractTest = runPhase5cContractTest;

phase5cLoadPitcherContext();
