/* =========================================================
   MLB Hit Board — Phase 4B
   Target-aware UX for 1+ Hit, 2+ Total Bases, and Home Run
   Build: phase4b-hit-cache-20260812b
   ========================================================= */

console.info("MLB Hit Lab Phase 4B loaded: phase4b-hit-cache-20260812b");

const PHASE4B_TARGETS = {
  hit_1plus: {
    key: "hit_1plus",
    shortLabel: "1+ Hit",
    fullLabel: "1+ Hit",
    probabilityLabel: "Hit Probability",
    boardTitle: "Top 25 Hit Probabilities Today",
    modelLabel: "V3 ML",
    deploymentStatus: "live",
    deploymentLabel: "Live",
    eyebrow: "All MLB · Daily Matchup Intelligence",
    subtitle: "Top hitters across MLB by V3 machine-learning hit probability.",
    matchupEyebrow: "🎯 Pitcher Stack",
    matchupLabel: "ML Stack Signal",
    emptyText: "No hit predictions are available for the current slate."
  },
  total_bases_2plus: {
    key: "total_bases_2plus",
    shortLabel: "2+ TB",
    fullLabel: "2+ Total Bases",
    probabilityLabel: "2+ TB Probability",
    boardTitle: "Top 25 — 2+ Total Bases Today",
    modelLabel: "TB V1 ML",
    deploymentStatus: "shadow",
    deploymentLabel: "Shadow",
    eyebrow: "All MLB · 2+ Total Bases Intelligence",
    subtitle: "Top hitters across MLB by probability of recording 2+ total bases.",
    matchupEyebrow: "💥 Damage Matchup",
    matchupLabel: "Damage Signal",
    emptyText: "No 2+ total bases predictions are available for the current slate."
  },
  home_run_1plus: {
    key: "home_run_1plus",
    shortLabel: "Home Run",
    fullLabel: "Home Run",
    probabilityLabel: "HR Probability",
    boardTitle: "Top 25 Home Run Probabilities Today",
    modelLabel: "HR V1 ML",
    deploymentStatus: "shadow",
    deploymentLabel: "Shadow",
    eyebrow: "All MLB · Home Run Intelligence",
    subtitle: "Top hitters across MLB by machine-learning home run probability.",
    matchupEyebrow: "💣 HR Matchup",
    matchupLabel: "Power Signal",
    emptyText: "No home run predictions are available for the current slate."
  }
};

let selectedMlbPredictionTarget =
  localStorage.getItem("mlbPredictionTarget") in PHASE4B_TARGETS
    ? localStorage.getItem("mlbPredictionTarget")
    : "hit_1plus";

const phase4bTargetCache = new Map();

// V3 Hit uses a richer loader than the two power targets. Preserve the
// completed Hit state in memory so returning from HR/TB can repaint
// immediately instead of repeating the full Supabase request set.
let phase4bHitStateCache = null;
let phase4bHitLoadPromise = null;

function phase4bCloneRows(rows) {
  return Array.isArray(rows) ? rows.slice() : [];
}

function phase4bCloneObject(value) {
  return value && typeof value === "object" ? { ...value } : value;
}

function phase4bSnapshotHitState() {
  if (!Array.isArray(mlbRows) || !mlbRows.length) return null;

  phase4bHitStateCache = {
    rows: phase4bCloneRows(mlbRows),
    v2Enhancements: phase4bCloneRows(mlbV2EnhancementRows),
    pitcherSplits: phase4bCloneObject(mlbTargetPitcherSplits) || {},
    modelRegistry: v3ModelRegistry || null,
    actualsStatus: v3ActualsStatus || null,
    performanceRows: phase4bCloneRows(v3PerformanceRows),
    boardOdds: phase4bCloneRows(boardOddsRows),
    drawerExplanations: phase4bCloneRows(v3DrawerExplanationRows),
    cachedAt: Date.now()
  };

  console.info("Phase 4B Hit state cached", {
    rows: phase4bHitStateCache.rows.length,
    odds: phase4bHitStateCache.boardOdds.length,
    cachedAt: new Date(phase4bHitStateCache.cachedAt).toISOString()
  });

  return phase4bHitStateCache;
}

function phase4bRestoreHitState() {
  const cache = phase4bHitStateCache;
  if (!cache?.rows?.length) return false;

  mlbRows = phase4bCloneRows(cache.rows);
  mlbV2EnhancementRows = phase4bCloneRows(cache.v2Enhancements);
  mlbTargetPitcherSplits = phase4bCloneObject(cache.pitcherSplits) || {};
  v3ModelRegistry = cache.modelRegistry || null;
  v3ActualsStatus = cache.actualsStatus || null;
  v3PerformanceRows = phase4bCloneRows(cache.performanceRows);
  boardOddsRows = phase4bCloneRows(cache.boardOdds);
  v3DrawerExplanationRows = phase4bCloneRows(cache.drawerExplanations);

  return true;
}

function phase4bInvalidateHitState() {
  phase4bHitStateCache = null;
  phase4bHitLoadPromise = null;
}

async function phase4bLoadHitTarget() {
  // Fast path after the first successful Hit load in this page session.
  if (phase4bRestoreHitState()) {
    renderMlbHitBoardPage();
    return mlbRows;
  }

  // Avoid duplicate initial Hit loads during startup / rapid clicks.
  if (phase4bHitLoadPromise) {
    return phase4bHitLoadPromise;
  }

  phase4bHitLoadPromise = (async () => {
    await phase4bOriginal.loadMlbHitBoardData();

    if (Array.isArray(mlbRows) && mlbRows.length) {
      phase4bSnapshotHitState();
    }

    return mlbRows;
  })();

  try {
    return await phase4bHitLoadPromise;
  } finally {
    phase4bHitLoadPromise = null;
  }
}

const phase4bOriginal = {
  loadMlbHitBoardData,
  renderMlbHitBoardPage,
  renderMlbPredictionModeControls,
  openMlbDrawer,
  showView
};

function phase4bConfig(target = selectedMlbPredictionTarget) {
  return PHASE4B_TARGETS[target] || PHASE4B_TARGETS.hit_1plus;
}

function phase4bIsHit() {
  return selectedMlbPredictionTarget === "hit_1plus";
}

function phase4bFeature(row, key, fallback = null) {
  const value = row?.features?.[key];
  return value === null || value === undefined ? fallback : value;
}

function phase4bPct(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const pct = Math.abs(n) <= 1 ? n * 100 : n;
  return `${pct.toFixed(digits)}%`;
}

function phase4bProbabilityPct(row) {
  const n = Number(row?.probability_pct ?? (
    row?.predicted_probability != null ? Number(row.predicted_probability) * 100 : NaN
  ));
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : "—";
}

function phase4bNumber(value, digits = 2) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

function phase4bTargetStatusBadge(row) {
  const status = String(row?.deployment_status || phase4bConfig().deploymentStatus).toLowerCase();
  const label = status === "live" ? "Live" : "Shadow";
  return `<span class="phase4b-status-badge ${status}">${escapeHtml(label)}</span>`;
}

function phase4bSignalObjects(row) {
  const target = row?.target_name || selectedMlbPredictionTarget;
  const f = row?.features || {};
  const signals = [];

  const push = (condition, label, emoji, detail) => {
    if (condition) signals.push({ label, emoji, detail });
  };

  if (target === "home_run_1plus") {
    push(Number(f.batter_hr_w10) >= 3, "HR Form", "🔥", `${fmtNum(f.batter_hr_w10)} HR over the recent 10-game feature window`);
    push(Number(f.batter_iso_w10) >= 0.25, "ISO Power", "📈", `${phase4bNumber(f.batter_iso_w10, 3)} recent ISO`);
    push(Number(f.batter_barrel_rate_30d) >= 0.10, "Barrel Form", "💥", `${phase4bPct(f.batter_barrel_rate_30d)} 30-day barrel rate`);
    push(Number(f.batter_hard_hit_rate_30d) >= 0.40, "Hard Contact", "⚡", `${phase4bPct(f.batter_hard_hit_rate_30d)} 30-day hard-hit rate`);
    push(Number(f.pitcher_barrel_rate_allowed_30d) >= 0.09, "Barrel Matchup", "🎯", `Pitcher allowing ${phase4bPct(f.pitcher_barrel_rate_allowed_30d)} barrels`);
    push(Number(f.pitcher_hard_hit_rate_allowed_30d) >= 0.35, "Contact Risk", "🎯", `Pitcher allowing ${phase4bPct(f.pitcher_hard_hit_rate_allowed_30d)} hard contact`);
    push(Number(f.park_hr_factor) >= 1.05, "Park Boost", "🏟️", `${phase4bNumber(f.park_hr_factor, 2)} HR park factor`);
  } else if (target === "total_bases_2plus") {
    push(Number(f.batter_tb_w10) >= 20, "Recent Damage", "📈", `${fmtNum(f.batter_tb_w10)} total bases over the recent 10-game feature window`);
    push(Number(f.batter_xbh_w10) >= 5, "XBH Form", "💥", `${fmtNum(f.batter_xbh_w10)} extra-base hits in the recent feature window`);
    push(Number(f.batter_slg_w10) >= 0.55, "SLG Form", "⚾", `${phase4bNumber(f.batter_slg_w10, 3)} recent SLG`);
    push(Number(f.batter_iso_w10) >= 0.22, "ISO Power", "📈", `${phase4bNumber(f.batter_iso_w10, 3)} recent ISO`);
    push(Number(f.batter_hard_hit_rate_30d) >= 0.40, "Hard Contact", "⚡", `${phase4bPct(f.batter_hard_hit_rate_30d)} 30-day hard-hit rate`);
    push(Number(f.pitcher_hard_hit_rate_allowed_30d) >= 0.35, "Contact Risk", "🎯", `Pitcher allowing ${phase4bPct(f.pitcher_hard_hit_rate_allowed_30d)} hard contact`);
    push(Number(f.park_hit_factor) >= 1.03, "Park Boost", "🏟️", `${phase4bNumber(f.park_hit_factor, 2)} hit park factor`);
  }

  if (!signals.length) {
    signals.push({
      label: "Model Edge",
      emoji: "🧠",
      detail: "The model ranking is the primary signal; no contextual feature cleared the display threshold."
    });
  }

  return signals;
}

function phase4bRenderWhyPills(row) {
  if (phase4bIsHit()) return renderWhyPills(row);

  const signals = phase4bSignalObjects(row);
  const primary = signals[0];
  const remaining = signals.length - 1;

  return `
    <span class="primary-why-wrap">
      <span class="why-pill primary-why-pill phase4b-power-pill">
        <span class="why-emoji">${primary.emoji}</span>
        <span>${escapeHtml(primary.label)}</span>
      </span>
      ${remaining > 0 ? `<span class="reason-count">+${remaining}</span>` : ""}
    </span>
  `;
}

function phase4bModelVersionText(rows = mlbRows) {
  const top = rows?.[0];
  if (!top) return phase4bConfig().modelLabel;
  return `${top.model_version || phase4bConfig().modelLabel} · ${top.model_status || "candidate"}`;
}

function phase4bUpdatePageHeader() {
  const config = phase4bConfig();
  setText("pageEyebrow", config.eyebrow);
  setText("pageTitle", "MLB Hit Board");
  setText("pageSubtitle", config.subtitle);
}

function phase4bSetTarget(target) {
  if (!PHASE4B_TARGETS[target] || target === selectedMlbPredictionTarget) return;

  selectedMlbPredictionTarget = target;
  localStorage.setItem("mlbPredictionTarget", target);
  mlbRows = [];
  mlbTargetPitcherSplits = {};
  phase4bUpdatePageHeader();
  closeDrawer();
  loadMlbHitBoardData();
}

function renderMlbPredictionModeControls() {
  const config = phase4bConfig();

  return `
    <section class="control-deck performance-window-deck v3-control-deck unified-board-controls mlb-scope-controls phase4b-control-deck">
      <div class="control-group phase4b-outcome-group">
        <div class="control-label">Outcome</div>
        <div class="segmented phase4b-target-toggle" role="group" aria-label="Prediction outcome">
          ${Object.values(PHASE4B_TARGETS).map((target) => `
            <button
              class="segment ${selectedMlbPredictionTarget === target.key ? "active" : ""}"
              type="button"
              data-phase4b-target="${escapeHtml(target.key)}"
              aria-pressed="${selectedMlbPredictionTarget === target.key}"
              aria-label="${escapeHtml(target.fullLabel)}"
            >${escapeHtml(target.shortLabel)}</button>
          `).join("")}
        </div>
      </div>

      <div class="control-group compact-model-group">
        <div class="board-model-badge" aria-label="Active prediction model">
          <span class="board-model-icon">${phase4bIsHit() ? "⭐" : "🧠"}</span>
          <span class="board-model-copy">
            <small>Active Model</small>
            <strong>${escapeHtml(config.modelLabel)}</strong>
          </span>
          <span class="board-model-status ${config.deploymentStatus === "shadow" ? "phase4b-shadow-status" : ""}">
            ${escapeHtml(config.deploymentLabel)}
          </span>
        </div>
      </div>

      <div class="control-group grow mlb-scope-group">
        <div class="control-label">Scope</div>
        <div class="sort-pill board-scope-pill">
          All MLB hitters · ranked by ${escapeHtml(config.fullLabel)} probability
        </div>
      </div>
    </section>
  `;
}

function phase4bNormalizePowerRow(row) {
  const features = row?.features || {};
  const probabilityPct = Number(row?.probability_pct ?? Number(row?.predicted_probability || 0) * 100);

  return {
    ...row,
    full_name: row.batter_name,
    hit_probability_pct: probabilityPct,
    matchup_score: probabilityPct,
    batter_bats: row.batter_bats || features.batter_bats,
    pitcher_throws: row.pitcher_throws || features.pitcher_throws,
    recent_lineup_spot: row.batting_order || features.batting_order,
    confidence_bucket: row.confidence_bucket || null,
    model_confidence: null
  };
}

async function phase4bLoadPowerTarget(target) {
  if (phase4bTargetCache.has(target)) {
    return phase4bTargetCache.get(target);
  }

  const { data, error } = await client
    .from("v_mlb_batter_prediction_board")
    .select("*")
    .eq("target_name", target)
    .order("prediction_run_date", { ascending: false })
    .order("rank_overall", { ascending: true })
    .limit(500);

  if (error) throw error;

  const raw = (data || []).filter((row) => row.batter_name && row.quality_status !== "fail");
  const latestDate = raw[0]?.prediction_run_date || null;
  const rows = raw
    .filter((row) => !latestDate || row.prediction_run_date === latestDate)
    .map(phase4bNormalizePowerRow)
    .sort((a, b) => Number(a.rank_overall || 9999) - Number(b.rank_overall || 9999));

  phase4bTargetCache.set(target, rows);
  return rows;
}

loadMlbHitBoardData = async function loadMlbHitBoardDataPhase4b() {
  if (phase4bIsHit()) {
    return phase4bLoadHitTarget();
  }

  const config = phase4bConfig();

  try {
    const content = $("mlbHitBoardContent");
    if (content) {
      content.innerHTML = `
        ${renderMlbPredictionModeControls()}
        <section class="performance-note">
          <strong>Loading ${escapeHtml(config.fullLabel)} board...</strong>
          <span>Reading the generalized Supabase prediction serving view.</span>
        </section>
      `;
    }

    mlbRows = await phase4bLoadPowerTarget(selectedMlbPredictionTarget);
    renderMlbHitBoardPage();
    runPhase4bSelfTest();
  } catch (err) {
    console.error(`Error loading ${config.fullLabel} board:`, err);
    mlbRows = [];
    renderMlbHitBoardPage(err);
  }
};

function phase4bBestDamageMatchup(rows) {
  const top25 = (rows || []).slice(0, 25);
  const groups = new Map();

  top25.forEach((row) => {
    if (!row.pitcher_id) return;
    const key = String(row.pitcher_id);
    const group = groups.get(key) || {
      pitcher_id: row.pitcher_id,
      pitcher_name: row.pitcher_name,
      pitcher_team_name: row.pitcher_team_name,
      pitcher_throws: row.pitcher_throws,
      game_date: row.game_date,
      game_time_utc: row.game_time_utc,
      venue_name: row.venue_name,
      hitters: [],
      totalProbability: 0
    };

    group.hitters.push(row);
    group.totalProbability += Number(row.predicted_probability || 0);
    groups.set(key, group);
  });

  const ranked = [...groups.values()]
    .filter((group) => group.hitters.length >= 2)
    .sort((a, b) =>
      b.totalProbability - a.totalProbability ||
      b.hitters.length - a.hitters.length
    );

  const best = ranked[0] || null;
  if (!best) return null;

  best.hitters.sort((a, b) => Number(a.rank_overall || 9999) - Number(b.rank_overall || 9999));
  best.featureRow = best.hitters[0] || {};
  best.top5AvgProbability = best.hitters.slice(0, 5).reduce(
    (sum, row) => sum + Number(row.predicted_probability || 0), 0
  ) / Math.max(1, best.hitters.slice(0, 5).length);

  return best;
}

function phase4bAverageFeature(rows, key) {
  const values = (rows || [])
    .map((row) => Number(phase4bFeature(row, key)))
    .filter(Number.isFinite);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function phase4bRenderOutlook(rows) {
  const config = phase4bConfig();
  const top = rows.slice(0, 3);

  return `
    <section class="daily-summary-card consensus-outlook-card phase4b-outlook-card">
      <div class="outlook-main">
        <div class="eyebrow">Daily Summary</div>
        <h2>Today's ${escapeHtml(config.fullLabel)} Outlook</h2>
        <div class="consensus-play-list">
          ${top.length ? top.map((row, index) => {
            const signal = phase4bSignalObjects(row)[0];
            return `
              <button class="consensus-play-row" type="button" data-consensus-player-id="${escapeHtml(row.player_id)}">
                <span class="consensus-medal">${index + 1}</span>
                <span class="consensus-player-copy">
                  <strong>${escapeHtml(row.batter_name || row.full_name || "Unknown hitter")}</strong>
                  <small>${escapeHtml(`${signal.emoji} ${signal.label} · ${signal.detail}`)}</small>
                </span>
                <span class="consensus-rank-pills">
                  <span class="model-rank-pill v3">${escapeHtml(phase4bProbabilityPct(row))}</span>
                  ${phase4bTargetStatusBadge(row)}
                </span>
              </button>
            `;
          }).join("") : `<div class="empty-state">${escapeHtml(config.emptyText)}</div>`}
        </div>
      </div>
      <div class="summary-metrics">
        <span>${fmtNum(rows.length)} hitters scored</span>
        <span>${Math.min(rows.length, 25)} shown</span>
        <span>${escapeHtml(config.deploymentLabel)} model</span>
      </div>
    </section>
  `;
}

function phase4bRenderMatchupCard(rows) {
  const config = phase4bConfig();
  const matchup = phase4bBestDamageMatchup(rows);

  if (!matchup) {
    return `
      <section class="matchup-hero phase4b-power-matchup">
        <div class="matchup-header">
          <div>
            <div class="eyebrow">${escapeHtml(config.matchupEyebrow)}</div>
            <h2>No clustered pitcher matchup yet</h2>
            <p class="matchup-subtitle">Waiting for at least two ranked hitters against the same probable starter.</p>
          </div>
          <div class="matchup-score-pill">${escapeHtml(config.matchupLabel)}</div>
        </div>
      </section>
    `;
  }

  const sample = matchup.hitters;
  const pitcherBarrel = phase4bAverageFeature(sample, "pitcher_barrel_rate_allowed_30d");
  const pitcherHardHit = phase4bAverageFeature(sample, "pitcher_hard_hit_rate_allowed_30d");
  const parkKey = selectedMlbPredictionTarget === "home_run_1plus" ? "park_hr_factor" : "park_hit_factor";
  const parkFactor = phase4bAverageFeature(sample, parkKey);
  const facingTeam = matchup.hitters[0]?.team_name || "Opponent hitters";

  return `
    <section class="matchup-hero phase4b-power-matchup">
      <div class="matchup-header">
        <div>
          <div class="eyebrow">${escapeHtml(config.matchupEyebrow)}</div>
          <h2>${escapeHtml(matchup.pitcher_name || "Probable Starter TBD")}</h2>
          <p class="matchup-subtitle">
            ${escapeHtml(matchup.pitcher_team_name || "Pitching team")} · Facing ${escapeHtml(facingTeam)} ·
            ${matchup.game_date ? escapeHtml(formatGameDate(matchup.game_date)) : "Today"}
            ${matchup.pitcher_throws ? ` · ${escapeHtml(matchup.pitcher_throws)}HP` : ""}
          </p>
        </div>
        <div class="matchup-score-pill">${escapeHtml(config.matchupLabel)}</div>
      </div>

      <div class="matchup-grid">
        <article class="matchup-stat-card">
          <div class="label">Target Starter</div>
          <div class="value">${escapeHtml(matchup.pitcher_name || "—")}</div>
        </article>
        <article class="matchup-stat-card">
          <div class="label">Throws</div>
          <div class="value">${escapeHtml(matchup.pitcher_throws ? `${matchup.pitcher_throws}HP` : "—")}</div>
        </article>
        <article class="matchup-stat-card">
          <div class="label">Barrel Allowed · 30d</div>
          <div class="value">${phase4bPct(pitcherBarrel)}</div>
        </article>
        <article class="matchup-stat-card">
          <div class="label">Hard-Hit Allowed · 30d</div>
          <div class="value">${phase4bPct(pitcherHardHit)}</div>
        </article>
        <article class="matchup-stat-card">
          <div class="label">${selectedMlbPredictionTarget === "home_run_1plus" ? "HR Park Factor" : "Hit Park Factor"}</div>
          <div class="value">${phase4bNumber(parkFactor, 2)}</div>
        </article>
        <article class="matchup-stat-card">
          <div class="label">Cluster Avg Probability</div>
          <div class="value">${phase4bPct(matchup.top5AvgProbability)}</div>
        </article>
      </div>
    </section>
  `;
}

function phase4bRenderPowerBoard(error = null) {
  const content = $("mlbHitBoardContent");
  if (!content) return;

  const config = phase4bConfig();
  const rows = (mlbRows || [])
    .slice()
    .sort((a, b) => Number(a.rank_overall || 9999) - Number(b.rank_overall || 9999));
  const top25 = rows.slice(0, 25);

  content.innerHTML = `
    ${renderMlbPredictionModeControls()}

    ${error ? `
      <section class="performance-note">
        <strong>${escapeHtml(config.fullLabel)} board warning.</strong>
        <span>${escapeHtml(error.message || error)}</span>
      </section>
    ` : ""}

    ${phase4bRenderOutlook(rows)}
    ${phase4bRenderMatchupCard(rows)}

    <section class="click-note mlb-hit-board-tip phase4b-tip">
      <div>
        <strong>Tip:</strong> Click any player to review the power profile, opponent contact-risk metrics, and park context behind the matchup.
      </div>
      <span>Power-model signals are contextual feature highlights. They are not presented as causal feature contributions.</span>
    </section>

    <section class="board-card">
      <div class="board-header">
        <div>
          <div class="eyebrow">All MLB Leaderboard</div>
          <h2>${escapeHtml(config.boardTitle)}</h2>
        </div>
        <div class="board-meta">
          <span>${fmtNum(rows.length)} scored hitters</span>
          <span>${escapeHtml(phase4bModelVersionText(rows))}</span>
        </div>
      </div>

      <div class="table-wrap">
        <table class="v3-board-table phase4b-power-table">
          <thead>
            <tr>
              <th class="rank">#</th>
              <th>Player</th>
              <th>Team</th>
              <th class="num">${escapeHtml(config.probabilityLabel)}</th>
              <th>Model Status</th>
              <th>Key Signal</th>
              <th>Opponent SP</th>
              <th>Game</th>
            </tr>
          </thead>
          <tbody>
            ${top25.length ? top25.map((row, index) => `
              <tr class="clickable-row mlb-clickable-row" data-mlb-player-id="${escapeHtml(row.player_id)}">
                <td class="rank"><span class="rank-badge">${row.rank_overall || index + 1}</span></td>
                <td>
                  <div class="player-cell">
                    <div class="avatar ${String(row.batter_bats || "R").toLowerCase()}">${handednessBadge({ bats: row.batter_bats })}</div>
                    <div>
                      <div class="player-name">${escapeHtml(row.batter_name || row.full_name || "—")}</div>
                      <div class="player-sub">${row.batting_order ? `Batting ${escapeHtml(row.batting_order)} · ` : ""}click for power detail</div>
                    </div>
                  </div>
                </td>
                <td>${escapeHtml(row.team_name || "—")}</td>
                <td class="num">
                  <div class="score-bar-wrap probability-cell">
                    <div class="score-bar">
                      <div class="score-bar-fill" style="width:${Math.min(100, Number(row.probability_pct || 0))}%"></div>
                    </div>
                    <span class="score-value">${escapeHtml(phase4bProbabilityPct(row))}</span>
                  </div>
                </td>
                <td>${phase4bTargetStatusBadge(row)}</td>
                <td class="why-cell">${phase4bRenderWhyPills(row)}</td>
                <td>
                  <div class="player-name">${escapeHtml(row.pitcher_name || "TBD")}</div>
                  <div class="player-sub">${escapeHtml(row.pitcher_team_name || "—")} · ${escapeHtml(row.pitcher_throws || "—")}HP</div>
                </td>
                <td>${row.game_date ? escapeHtml(formatGameDate(row.game_date)) : "—"}</td>
              </tr>
            `).join("") : `<tr><td colspan="8" class="empty-state">${escapeHtml(config.emptyText)}</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

renderMlbHitBoardPage = function renderMlbHitBoardPagePhase4b(error = null) {
  phase4bUpdatePageHeader();

  if (phase4bIsHit()) {
    return phase4bOriginal.renderMlbHitBoardPage(error);
  }

  return phase4bRenderPowerBoard(error);
};

function phase4bPowerNarrative(row) {
  const config = phase4bConfig(row?.target_name);
  const signals = phase4bSignalObjects(row).slice(0, 3);
  const signalText = signals.map((signal) => `${signal.label.toLowerCase()} (${signal.detail})`).join("; ");
  const pitcher = row.pitcher_name || "the opposing starter";

  return `${row.batter_name || "This hitter"} is ranked #${row.rank_overall || "—"} for ${config.fullLabel} at ${phase4bProbabilityPct(row)} against ${pitcher}. The strongest contextual signals on the board are ${signalText}.`;
}

function phase4bPowerMetric(label, value, sub = "") {
  return v3Metric(label, value, sub);
}

function phase4bOpenPowerDrawer(row) {
  const drawer = $("playerDrawer");
  const body = document.querySelector(".drawer-body");
  if (!drawer || !body || !row) return;

  const config = phase4bConfig(row.target_name);
  const f = row.features || {};
  const signals = phase4bSignalObjects(row);
  const pitcher = row.pitcher_name
    ? `${row.pitcher_name}${row.pitcher_throws ? ` (${row.pitcher_throws})` : ""}`
    : "Probable starter TBD";

  drawer.classList.remove("mlb-matchup-only");
  drawer.classList.add("v3-detail-drawer", "phase4b-power-drawer");

  setText("drawerPlayerName", row.batter_name || row.full_name || "Unknown Player");
  setText(
    "drawerPlayerSub",
    `${row.team_name || "MLB"} · ${config.fullLabel} model · ${config.deploymentLabel}`
  );

  body.dataset.mode = "v3";
  body.innerHTML = `
    <section class="v3-drawer-hero phase4b-drawer-hero">
      <div class="v3-probability-ring">
        <span>${escapeHtml(phase4bProbabilityPct(row))}</span>
        <small>${escapeHtml(config.probabilityLabel)}</small>
      </div>
      <div class="v3-drawer-summary">
        <div class="v3-rank-line">#${escapeHtml(row.rank_overall || "—")} of ${escapeHtml(fmtNum(mlbRows.length))} scored hitters</div>
        <div>${phase4bTargetStatusBadge(row)}</div>
      </div>
    </section>

    <section class="drawer-section v3-section phase4b-signal-summary">
      <div class="drawer-section-title">What Stands Out</div>
      <p class="drawer-explanation">${escapeHtml(phase4bPowerNarrative(row))}</p>
      <div class="phase4b-drawer-pills">
        ${signals.slice(0, 5).map((signal) => `
          <span class="why-pill phase4b-power-pill" title="${escapeHtml(signal.detail)}">
            ${signal.emoji} ${escapeHtml(signal.label)}
          </span>
        `).join("")}
      </div>
    </section>

    <section class="drawer-section v3-section">
      <div class="drawer-section-title">Power Profile</div>
      <div class="v3-drawer-grid">
        ${phase4bPowerMetric("Recent HR", f.batter_hr_w10 != null ? fmtNum(f.batter_hr_w10) : "—", "10-game feature window")}
        ${phase4bPowerMetric("Recent Total Bases", f.batter_tb_w10 != null ? fmtNum(f.batter_tb_w10) : "—", "10-game feature window")}
        ${phase4bPowerMetric("Recent XBH", f.batter_xbh_w10 != null ? fmtNum(f.batter_xbh_w10) : "—", "10-game feature window")}
        ${phase4bPowerMetric("Recent SLG", f.batter_slg_w10 != null ? phase4bNumber(f.batter_slg_w10, 3) : "—", "10-game feature window")}
        ${phase4bPowerMetric("Recent ISO", f.batter_iso_w10 != null ? phase4bNumber(f.batter_iso_w10, 3) : "—", "10-game feature window")}
        ${phase4bPowerMetric("Barrel Rate", f.batter_barrel_rate_30d != null ? phase4bPct(f.batter_barrel_rate_30d) : "—", "Last 30 days")}
        ${phase4bPowerMetric("Hard-Hit Rate", f.batter_hard_hit_rate_30d != null ? phase4bPct(f.batter_hard_hit_rate_30d) : "—", "Last 30 days")}
        ${phase4bPowerMetric("Avg Exit Velocity", f.batter_avg_exit_velocity_30d != null ? `${phase4bNumber(f.batter_avg_exit_velocity_30d, 1)} mph` : "—", "Last 30 days")}
      </div>
    </section>

    <section class="drawer-section v3-section">
      <div class="drawer-section-title">Matchup Damage Context</div>
      <div class="v3-drawer-grid">
        ${phase4bPowerMetric("Opponent SP", pitcher, row.pitcher_team_name || "")}
        ${phase4bPowerMetric("Pitcher Barrel Allowed", f.pitcher_barrel_rate_allowed_30d != null ? phase4bPct(f.pitcher_barrel_rate_allowed_30d) : "—", "Last 30 days")}
        ${phase4bPowerMetric("Pitcher Hard-Hit Allowed", f.pitcher_hard_hit_rate_allowed_30d != null ? phase4bPct(f.pitcher_hard_hit_rate_allowed_30d) : "—", "Last 30 days")}
        ${phase4bPowerMetric("HR Park Factor", f.park_hr_factor != null ? phase4bNumber(f.park_hr_factor, 2) : "—", row.venue_name || "Game environment")}
        ${phase4bPowerMetric("Hit Park Factor", f.park_hit_factor != null ? phase4bNumber(f.park_hit_factor, 2) : "—", row.venue_name || "Game environment")}
        ${phase4bPowerMetric("Roof / Wind", [f.roof_status, f.wind_effect].filter(Boolean).join(" · ") || "—", row.game_time_utc ? formatEasternGameTime(row.game_time_utc) : "")}
      </div>
    </section>

    <section class="drawer-section v3-section subtle-model-note">
      <div class="drawer-section-title">Model Note</div>
      <p class="drawer-explanation">
        ${escapeHtml(config.modelLabel)} is currently a ${escapeHtml(config.deploymentLabel.toLowerCase())} model.
        The feature highlights above are contextual values from the scoring feature set, not a SHAP-style contribution ranking.
        Model version: ${escapeHtml(row.model_version || "—")}.
      </p>
    </section>
  `;

  drawer.classList.add("open");
  $("drawerBackdrop")?.classList.add("open");
}

openMlbDrawer = function openMlbDrawerPhase4b(playerId) {
  if (phase4bIsHit()) {
    return phase4bOriginal.openMlbDrawer(playerId);
  }

  const row = (mlbRows || []).find((item) => String(item.player_id) === String(playerId));
  if (!row) return;
  phase4bOpenPowerDrawer(row);
};

showView = function showViewPhase4b(viewName) {
  phase4bOriginal.showView(viewName);
  if (viewName === "mlb") phase4bUpdatePageHeader();
};

function phase4bInjectStyles() {
  if (document.getElementById("phase4bStyles")) return;

  const style = document.createElement("style");
  style.id = "phase4bStyles";
  style.textContent = `
    .phase4b-control-deck {
      align-items: flex-end;
      flex-wrap: wrap;
    }

    .phase4b-outcome-group {
      min-width: 310px;
    }

    .phase4b-target-toggle .segment {
      min-width: 86px;
      white-space: nowrap;
    }

    .phase4b-shadow-status,
    .phase4b-status-badge.shadow {
      color: #fde68a;
      border-color: rgba(250, 204, 21, .35);
      background: rgba(250, 204, 21, .10);
    }

    .phase4b-status-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(34, 197, 94, .32);
      background: rgba(34, 197, 94, .10);
      color: #bbf7d0;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: .76rem;
      font-weight: 900;
      white-space: nowrap;
    }

    .phase4b-outlook-card .model-rank-pill.v3 {
      min-width: 72px;
      text-align: center;
    }

    .phase4b-power-pill {
      border-color: rgba(251, 146, 60, .30);
      background: rgba(251, 146, 60, .10);
      color: #fed7aa;
    }

    .phase4b-power-matchup {
      background:
        radial-gradient(circle at 10% 0%, rgba(251, 146, 60, .10), transparent 32%),
        linear-gradient(180deg, rgba(30, 41, 59, .82), rgba(15, 23, 42, .84));
    }

    .phase4b-power-table .probability-cell .score-bar-fill {
      background: linear-gradient(90deg, var(--accent), var(--accent-2));
    }

    .phase4b-drawer-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }

    .phase4b-power-drawer .v3-probability-ring {
      box-shadow: inset 0 0 0 1px rgba(251, 146, 60, .20);
    }

    @media (max-width: 760px) {
      .phase4b-outcome-group {
        width: 100%;
        min-width: 0;
      }

      .phase4b-target-toggle {
        width: 100%;
      }

      .phase4b-target-toggle .segment {
        flex: 1;
        min-width: 0;
        padding-left: 8px;
        padding-right: 8px;
        font-size: .78rem;
      }

      .phase4b-control-deck .compact-model-group,
      .phase4b-control-deck .mlb-scope-group {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(style);
}

function runPhase4bSelfTest() {
  const config = phase4bConfig();
  const rows = mlbRows || [];
  const rankSorted = rows.every((row, index) =>
    index === 0 || Number(rows[index - 1].rank_overall || 9999) <= Number(row.rank_overall || 9999)
  );
  const probabilityValid = rows.every((row) => {
    const p = Number(row.predicted_probability);
    return !Number.isFinite(p) || (p >= 0 && p <= 1);
  });
  const targetValid = phase4bIsHit() || rows.every((row) => row.target_name === selectedMlbPredictionTarget);
  const powerOddsHidden = phase4bIsHit() || rows.every((row) => row.market_odds_supported !== true);

  const checks = [
    { check: "three-target-config", status: Object.keys(PHASE4B_TARGETS).length === 3 ? "pass" : "fail" },
    { check: "rows-loaded", status: rows.length > 0 ? "pass" : "needs-data", rows: rows.length },
    { check: "rank-order", status: rankSorted ? "pass" : "fail" },
    { check: "probability-range", status: probabilityValid ? "pass" : "fail" },
    { check: "selected-target-only", status: targetValid ? "pass" : "fail" },
    { check: "power-odds-hidden", status: powerOddsHidden ? "pass" : "fail" },
    { check: "toggle-mounted", status: document.querySelector("[data-phase4b-target]") ? "pass" : "needs-dom" },
    { check: "serving-view-only", status: "pass", source: phase4bIsHit() ? "existing V3 serving cache" : "v_mlb_batter_prediction_board" }
  ];

  console.table(checks);
  window.phase4bSelfTest = {
    target: selectedMlbPredictionTarget,
    targetLabel: config.fullLabel,
    checks
  };
  return window.phase4bSelfTest;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-phase4b-target]");
  if (!button) return;
  event.preventDefault();
  phase4bSetTarget(button.dataset.phase4bTarget);
});

window.phase4bSetTarget = phase4bSetTarget;
window.runPhase4bSelfTest = runPhase4bSelfTest;
window.phase4bInvalidateHitState = phase4bInvalidateHitState;

// Manual Refresh should always bypass the in-memory Hit cache.
// Capture phase ensures this runs before the app's existing refresh handler.
document.getElementById("refreshButton")?.addEventListener("click", () => {
  if (phase4bIsHit()) {
    phase4bInvalidateHitState();
  }
}, true);

phase4bInjectStyles();
phase4bUpdatePageHeader();

// app-v4.js loads the Hit board before this additive script executes.
// Re-load once so the saved target and Phase 4B controls are authoritative.
loadMlbHitBoardData();
