/* =========================================================
   MLB Hit Board — Phase 5B
   Merge foundation: Top 25 / Select Game scope on MLB Hit Board
   Team Hit Board remains untouched during parity validation.
   Build: phase5b-board-scope-20260812
   ========================================================= */

console.info("MLB Hit Lab Phase 5B loaded: phase5b-board-scope-20260812");

const PHASE5B_SCOPE_TOP25 = "top25";
const PHASE5B_SCOPE_GAME = "game";

let selectedMlbBoardScope =
  localStorage.getItem("mlbBoardScope") === PHASE5B_SCOPE_GAME
    ? PHASE5B_SCOPE_GAME
    : PHASE5B_SCOPE_TOP25;

let selectedMlbGamePk = localStorage.getItem("mlbSelectedGamePk") || null;
let phase5bGames = [];
let phase5bGamesLoaded = false;
let phase5bGamesLoading = false;

const phase5bPrevious = {
  renderMlbPredictionModeControls,
  renderMlbHitBoardPage
};

function phase5bTargetAvailabilityField() {
  switch (selectedMlbPredictionTarget) {
    case "home_run_1plus":
      return "has_hr_predictions";
    case "total_bases_2plus":
      return "has_tb_predictions";
    default:
      return "has_hit_predictions";
  }
}

function phase5bTargetCountField() {
  switch (selectedMlbPredictionTarget) {
    case "home_run_1plus":
      return "hr_prediction_count";
    case "total_bases_2plus":
      return "tb_prediction_count";
    default:
      return "hit_prediction_count";
  }
}

function phase5bAvailableGames() {
  const flag = phase5bTargetAvailabilityField();
  return (phase5bGames || [])
    .filter((game) => game?.[flag] !== false)
    .slice()
    .sort((a, b) => {
      const at = Date.parse(a.game_time_utc || "") || 0;
      const bt = Date.parse(b.game_time_utc || "") || 0;
      return at - bt || Number(a.game_pk || 0) - Number(b.game_pk || 0);
    });
}

function phase5bSelectedGame() {
  return phase5bAvailableGames().find(
    (game) => String(game.game_pk) === String(selectedMlbGamePk)
  ) || null;
}

function phase5bEnsureSelectedGame() {
  const games = phase5bAvailableGames();

  if (!games.length) {
    selectedMlbGamePk = null;
    localStorage.removeItem("mlbSelectedGamePk");
    return null;
  }

  let selected = games.find(
    (game) => String(game.game_pk) === String(selectedMlbGamePk)
  );

  if (!selected) {
    selected = games[0];
    selectedMlbGamePk = String(selected.game_pk);
    localStorage.setItem("mlbSelectedGamePk", selectedMlbGamePk);
  }

  return selected;
}

function phase5bFormatGameOption(game) {
  if (!game) return "Game unavailable";
  return game.game_label ||
    `${game.away_team_name || "Away"} at ${game.home_team_name || "Home"}`;
}

function phase5bScopeControls() {
  const config = phase4bConfig();
  const games = phase5bAvailableGames();
  const selected = phase5bEnsureSelectedGame();
  const countField = phase5bTargetCountField();

  return `
    <section class="phase5b-scope-card" aria-label="MLB board scope">
      <div class="phase5b-scope-row">
        <div class="control-group phase5b-scope-toggle-group">
          <div class="control-label">Board Scope</div>
          <div class="segmented phase5b-scope-toggle" role="group" aria-label="Board scope">
            <button
              class="segment ${selectedMlbBoardScope === PHASE5B_SCOPE_TOP25 ? "active" : ""}"
              type="button"
              data-phase5b-scope="${PHASE5B_SCOPE_TOP25}"
              aria-pressed="${selectedMlbBoardScope === PHASE5B_SCOPE_TOP25}"
            >Top 25</button>
            <button
              class="segment ${selectedMlbBoardScope === PHASE5B_SCOPE_GAME ? "active" : ""}"
              type="button"
              data-phase5b-scope="${PHASE5B_SCOPE_GAME}"
              aria-pressed="${selectedMlbBoardScope === PHASE5B_SCOPE_GAME}"
            >Select Game</button>
          </div>
        </div>

        ${selectedMlbBoardScope === PHASE5B_SCOPE_GAME ? `
          <div class="control-group phase5b-game-group">
            <div class="control-label">Game</div>
            ${phase5bGamesLoading && !phase5bGamesLoaded ? `
              <div class="phase5b-game-loading">Loading today's MLB games…</div>
            ` : games.length ? `
              <select
                class="phase5b-game-select"
                id="phase5bGameSelect"
                aria-label="Select MLB game"
              >
                ${games.map((game) => `
                  <option
                    value="${escapeHtml(game.game_pk)}"
                    ${String(game.game_pk) === String(selected?.game_pk) ? "selected" : ""}
                  >
                    ${escapeHtml(phase5bFormatGameOption(game))}
                  </option>
                `).join("")}
              </select>
              <div class="phase5b-game-meta">
                ${selected ? `
                  ${escapeHtml(config.fullLabel)} ·
                  ${escapeHtml(fmtNum(selected[countField] || 0))} scored hitters
                  ${selected.venue_name ? ` · ${escapeHtml(selected.venue_name)}` : ""}
                ` : ""}
              </div>
            ` : `
              <div class="phase5b-game-loading">No games with ${escapeHtml(config.fullLabel)} predictions are available.</div>
            `}
          </div>
        ` : `
          <div class="phase5b-scope-summary">
            <span>League-wide</span>
            <strong>Top 25 by ${escapeHtml(config.fullLabel)} probability</strong>
          </div>
        `}
      </div>
    </section>
  `;
}

renderMlbPredictionModeControls = function renderMlbPredictionModeControlsPhase5b() {
  return `
    ${phase5bPrevious.renderMlbPredictionModeControls()}
    ${phase5bScopeControls()}
  `;
};

async function phase5bLoadGames(force = false) {
  if (phase5bGamesLoading) return;
  if (phase5bGamesLoaded && !force) return;

  phase5bGamesLoading = true;

  try {
    const { data, error } = await client
      .from("v_mlb_batter_prediction_game_selector")
      .select("*")
      .order("prediction_run_date", { ascending: false })
      .order("game_time_utc", { ascending: true });

    if (error) throw error;

    const raw = data || [];
    const latestDate = raw[0]?.prediction_run_date || null;

    phase5bGames = raw.filter(
      (game) => !latestDate || game.prediction_run_date === latestDate
    );

    phase5bGamesLoaded = true;
    phase5bEnsureSelectedGame();

    if (document.getElementById("mlbHitBoardContent")) {
      renderMlbHitBoardPage();
    }
  } catch (err) {
    console.error("Phase 5B game-selector load failed:", err);
    phase5bGames = [];
    phase5bGamesLoaded = false;
  } finally {
    phase5bGamesLoading = false;
  }
}

function phase5bProbabilityNumber(row) {
  const value = Number(
    row?.predicted_probability ??
    (row?.probability_pct != null ? Number(row.probability_pct) / 100 : NaN) ??
    (row?.hit_probability_pct != null ? Number(row.hit_probability_pct) / 100 : NaN)
  );
  return Number.isFinite(value) ? value : -1;
}

function phase5bRowsForSelectedGame(rows) {
  if (selectedMlbBoardScope !== PHASE5B_SCOPE_GAME) return rows || [];

  const selected = phase5bEnsureSelectedGame();
  if (!selected) return [];

  const filtered = (rows || [])
    .filter((row) => String(row.game_pk) === String(selected.game_pk))
    .slice()
    .sort((a, b) => {
      const ar = Number(a.rank_game);
      const br = Number(b.rank_game);

      if (Number.isFinite(ar) && Number.isFinite(br) && ar !== br) {
        return ar - br;
      }

      return phase5bProbabilityNumber(b) - phase5bProbabilityNumber(a) ||
        String(a.batter_name || a.full_name || "").localeCompare(
          String(b.batter_name || b.full_name || "")
        );
    });

  // Existing Hit/Power renderers display rank_overall. In selected-game mode,
  // provide cloned display rows whose visible rank is the game rank.
  return filtered.map((row, index) => ({
    ...row,
    rank_overall_global: row.rank_overall,
    rank_overall: Number.isFinite(Number(row.rank_game))
      ? Number(row.rank_game)
      : index + 1
  }));
}

function phase5bGameBoardTitle() {
  const game = phase5bSelectedGame();
  const config = phase4bConfig();

  if (!game) return config.boardTitle;

  return `${game.away_team_name || "Away"} at ${game.home_team_name || "Home"} — ${config.fullLabel} Probabilities`;
}

function phase5bPostProcessSelectedGame() {
  if (selectedMlbBoardScope !== PHASE5B_SCOPE_GAME) return;

  const content = document.getElementById("mlbHitBoardContent");
  const game = phase5bSelectedGame();
  if (!content || !game) return;

  const board = content.querySelector(".board-card");
  if (board) {
    const eyebrow = board.querySelector(".board-header .eyebrow");
    const heading = board.querySelector(".board-header h2");

    if (eyebrow) eyebrow.textContent = "Selected Game Leaderboard";
    if (heading) heading.textContent = phase5bGameBoardTitle();
  }

  const summaryCard = content.querySelector(".daily-summary-card h2");
  if (summaryCard) {
    summaryCard.textContent =
      `${game.away_team_name || "Away"} at ${game.home_team_name || "Home"} — ${phase4bConfig().fullLabel} Outlook`;
  }
}

renderMlbHitBoardPage = function renderMlbHitBoardPagePhase5b(error = null) {
  if (selectedMlbBoardScope === PHASE5B_SCOPE_TOP25) {
    return phase5bPrevious.renderMlbHitBoardPage(error);
  }

  phase5bEnsureSelectedGame();

  const allRows = mlbRows;
  const scopedRows = phase5bRowsForSelectedGame(allRows);

  try {
    mlbRows = scopedRows;
    phase5bPrevious.renderMlbHitBoardPage(error);
    phase5bPostProcessSelectedGame();
  } finally {
    // Keep the full slate in memory so changing outcome/game never requires
    // destructive state mutation and existing player drawers can still resolve.
    mlbRows = allRows;
  }
};

function phase5bSetScope(scope) {
  if (![PHASE5B_SCOPE_TOP25, PHASE5B_SCOPE_GAME].includes(scope)) return;

  selectedMlbBoardScope = scope;
  localStorage.setItem("mlbBoardScope", scope);

  if (scope === PHASE5B_SCOPE_GAME) {
    phase5bEnsureSelectedGame();
    if (!phase5bGamesLoaded) phase5bLoadGames();
  }

  closeDrawer();
  renderMlbHitBoardPage();
}

function phase5bSetGame(gamePk) {
  const available = phase5bAvailableGames();
  const game = available.find((item) => String(item.game_pk) === String(gamePk));
  if (!game) return;

  selectedMlbGamePk = String(game.game_pk);
  localStorage.setItem("mlbSelectedGamePk", selectedMlbGamePk);

  closeDrawer();
  renderMlbHitBoardPage();
}

document.addEventListener("click", (event) => {
  const scopeButton = event.target.closest("[data-phase5b-scope]");
  if (!scopeButton) return;

  event.preventDefault();
  phase5bSetScope(scopeButton.dataset.phase5bScope);
});

document.addEventListener("change", (event) => {
  const select = event.target.closest("#phase5bGameSelect");
  if (!select) return;
  phase5bSetGame(select.value);
});

document.getElementById("refreshButton")?.addEventListener("click", () => {
  phase5bGamesLoaded = false;
  setTimeout(() => phase5bLoadGames(true), 0);
});

async function runPhase5bContractTest() {
  const results = [];

  try {
    const { data: games, error: gamesError } = await client
      .from("v_mlb_batter_prediction_game_selector")
      .select("*")
      .order("prediction_run_date", { ascending: false });

    if (gamesError) throw gamesError;

    const latestDate = games?.[0]?.prediction_run_date || null;
    const latestGames = (games || []).filter(
      (game) => !latestDate || game.prediction_run_date === latestDate
    );

    results.push({
      check: "game-selector-loaded",
      status: latestGames.length > 0 ? "pass" : "fail",
      detail: `${latestGames.length} games`
    });

    const targets = [
      ["hit_1plus", "has_hit_predictions"],
      ["total_bases_2plus", "has_tb_predictions"],
      ["home_run_1plus", "has_hr_predictions"]
    ];

    for (const [target, availabilityField] of targets) {
      const targetGames = latestGames.filter((game) => game[availabilityField]);

      const { data: rows, error } = await client
        .from("v_mlb_batter_prediction_board")
        .select("prediction_run_date,game_pk,player_id,target_name,rank_game,predicted_probability")
        .eq("target_name", target)
        .order("prediction_run_date", { ascending: false })
        .limit(500);

      if (error) throw error;

      const targetDate = rows?.[0]?.prediction_run_date || null;
      const latestRows = (rows || []).filter(
        (row) => !targetDate || row.prediction_run_date === targetDate
      );

      const gameMap = new Map();
      latestRows.forEach((row) => {
        const key = String(row.game_pk);
        const group = gameMap.get(key) || [];
        group.push(row);
        gameMap.set(key, group);
      });

      const validRanks = [...gameMap.values()].every((group) => {
        const ranks = group.map((row) => Number(row.rank_game)).sort((a, b) => a - b);
        return ranks.length > 0 &&
          ranks.every(Number.isFinite) &&
          ranks[0] === 1 &&
          ranks[ranks.length - 1] === ranks.length &&
          new Set(ranks).size === ranks.length;
      });

      results.push({
        check: `${target}-top25`,
        status: latestRows.length >= 25 ? "pass" : "fail",
        detail: `${latestRows.length} rows`
      });

      results.push({
        check: `${target}-selected-game`,
        status: targetGames.length > 0 && validRanks ? "pass" : "fail",
        detail: `${targetGames.length} games · game ranks ${validRanks ? "valid" : "invalid"}`
      });
    }
  } catch (err) {
    results.push({
      check: "contract-test-runtime",
      status: "fail",
      detail: err.message || String(err)
    });
  }

  console.table(results);
  window.phase5bContractTest = results;
  return results;
}

function runPhase5bSelfTest() {
  const game = phase5bSelectedGame();
  const rows = phase5bRowsForSelectedGame(mlbRows || []);

  const checks = [
    {
      check: "scope-control-mounted",
      status: document.querySelector("[data-phase5b-scope]") ? "pass" : "needs-dom"
    },
    {
      check: "default-valid-scope",
      status: [PHASE5B_SCOPE_TOP25, PHASE5B_SCOPE_GAME].includes(selectedMlbBoardScope) ? "pass" : "fail"
    },
    {
      check: "game-selector-contract",
      status: phase5bGamesLoaded ? "pass" : "needs-data",
      detail: `${phase5bGames.length} games`
    },
    {
      check: "selected-game-valid",
      status: selectedMlbBoardScope === PHASE5B_SCOPE_TOP25 || game ? "pass" : "fail"
    },
    {
      check: "selected-game-rows",
      status: selectedMlbBoardScope === PHASE5B_SCOPE_TOP25 || rows.length > 0 ? "pass" : "fail",
      detail: `${rows.length} rows`
    },
    {
      check: "team-board-retained",
      status: document.getElementById("hotView") ? "pass" : "fail"
    }
  ];

  console.table(checks);
  window.phase5bSelfTest = checks;
  return checks;
}

window.phase5bSetScope = phase5bSetScope;
window.phase5bSetGame = phase5bSetGame;
window.runPhase5bSelfTest = runPhase5bSelfTest;
window.runPhase5bContractTest = runPhase5bContractTest;

phase5bLoadGames();
