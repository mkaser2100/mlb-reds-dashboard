/* =========================================================
   MLB Hit Board — Phase 5D
   Target-aware selected-game starting-pitcher metrics
   Keeps the Phase 5C card shell and Home/Away SP toggle.
   Build: phase5d-target-aware-pitcher-metrics-20260812
   ========================================================= */

console.info("MLB Hit Lab Phase 5D loaded: phase5d-target-aware-pitcher-metrics-20260812");

const PHASE5D_MIN_CONTACT_BBE = 25;

function phase5dFormatPct(value, digits = 1) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const pct = Math.abs(n) <= 1 ? n * 100 : n;
  return `${pct.toFixed(digits)}%`;
}

function phase5dFormatFactor(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

function phase5dContactMetric(pitcher, key) {
  const bbe = Number(pitcher?.pitcher_contact_bbe_30d);
  const available = pitcher?.contact_feature_available;
  const value = pitcher?.[key];

  if (
    available === false ||
    !Number.isFinite(bbe) ||
    bbe < PHASE5D_MIN_CONTACT_BBE ||
    value === null ||
    value === undefined
  ) {
    return {
      value: "—",
      sub: Number.isFinite(bbe) ? `Limited sample · ${bbe} BBE` : "Limited sample"
    };
  }

  return {
    value: phase5dFormatPct(value),
    sub: `30d · ${bbe} BBE`
  };
}

function phase5dMetric(label, value, sub = "") {
  return `
    <article class="matchup-stat-card phase5d-metric-card">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(value ?? "—")}</div>
      ${sub ? `<small class="phase5d-metric-sub">${escapeHtml(sub)}</small>` : ""}
    </article>
  `;
}

function phase5dPitcherMetrics(pitcher) {
  const roleLabel = phase5cPitcherRoleLabel(phase5cPitcherSide);
  const role = phase5dMetric(roleLabel, pitcher?.pitcher_name || "—");
  const throws = phase5dMetric("Throws", pitcher?.pitcher_throws || "—");

  if (selectedMlbPredictionTarget === "home_run_1plus") {
    const barrel = phase5dContactMetric(pitcher, "barrel_rate_allowed_30d");
    const hardHit = phase5dContactMetric(pitcher, "hard_hit_rate_allowed_30d");
    const starts = Number(pitcher?.last5_starts);
    const hrAllowed = pitcher?.last5_home_runs_allowed;

    return [
      role,
      throws,
      phase5dMetric(
        "HR Allowed · Recent Starts",
        hrAllowed === null || hrAllowed === undefined ? "—" : String(hrAllowed),
        Number.isFinite(starts) && starts > 0 ? `${starts} recent starts` : "No recent-start sample"
      ),
      phase5dMetric("Hard-Hit Allowed · 30d", hardHit.value, hardHit.sub),
      phase5dMetric("Barrel Allowed · 30d", barrel.value, barrel.sub),
      phase5dMetric("HR Park Factor", phase5dFormatFactor(pitcher?.park_hr_factor), "1.00 = neutral")
    ];
  }

  if (selectedMlbPredictionTarget === "total_bases_2plus") {
    const barrel = phase5dContactMetric(pitcher, "barrel_rate_allowed_30d");
    const hardHit = phase5dContactMetric(pitcher, "hard_hit_rate_allowed_30d");

    return [
      role,
      throws,
      phase5dMetric("Last 5 WHIP", phase5cFormatRate(pitcher?.last5_whip)),
      phase5dMetric("Hard-Hit Allowed · 30d", hardHit.value, hardHit.sub),
      phase5dMetric("Barrel Allowed · 30d", barrel.value, barrel.sub),
      phase5dMetric("Hit Park Factor", phase5dFormatFactor(pitcher?.park_hit_factor), "1.00 = neutral")
    ];
  }

  return [
    role,
    throws,
    phase5dMetric("Last 5 ERA", phase5cFormatRate(pitcher?.last5_era)),
    phase5dMetric("Last 5 WHIP", phase5cFormatRate(pitcher?.last5_whip)),
    phase5dMetric("BAA vs LHB", phase5cFormatAvg(pitcher?.baa_vs_lhb)),
    phase5dMetric("BAA vs RHB", phase5cFormatAvg(pitcher?.baa_vs_rhb))
  ];
}

function phase5dMetricContextCopy() {
  if (selectedMlbPredictionTarget === "home_run_1plus") {
    return "Power damage, contact quality, and home-run environment";
  }
  if (selectedMlbPredictionTarget === "total_bases_2plus") {
    return "Extra-base damage, contact quality, and park environment";
  }
  return "Recent form and handedness splits";
}

phase5cRenderSelectedGamePitcherCard = function phase5dRenderSelectedGamePitcherCard() {
  const game = phase5bSelectedGame?.();
  if (!game) return "";

  const contextRows = phase5cSelectedGameContextRows();
  const pitcher = phase5cPitcherForSide();

  if (phase5cPitchersLoading && !phase5cPitchersLoaded) {
    return `
      <section class="matchup-hero phase5c-selected-game-matchup phase5d-target-aware-matchup">
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
      <section class="matchup-hero phase5c-selected-game-matchup phase5d-target-aware-matchup">
        <div class="matchup-header">
          <div>
            <div class="eyebrow">⚾ Today's Matchup</div>
            <h2>${escapeHtml(phase5cGameTitle(game))}</h2>
            <p class="matchup-subtitle">${escapeHtml(phase5cGameSubtitle(game))}</p>
          </div>
          ${phase5cRenderPitcherToggle(game, contextRows)}
        </div>
        <div class="phase5c-loading-state">Starting-pitcher context is not available for the selected side.</div>
      </section>
    `;
  }

  const metrics = phase5dPitcherMetrics(pitcher);

  return `
    <section class="matchup-hero phase5c-selected-game-matchup phase5d-target-aware-matchup">
      <div class="matchup-header phase5c-matchup-header">
        <div>
          <div class="eyebrow">⚾ Today's Matchup</div>
          <h2>${escapeHtml(phase5cGameTitle(game))}</h2>
          <p class="matchup-subtitle">${escapeHtml(phase5cGameSubtitle(game, pitcher))}</p>
        </div>

        <div class="phase5c-matchup-actions">
          ${phase5cRenderPitcherToggle(game, contextRows)}
          <div class="matchup-score-pill">${escapeHtml(phase4bConfig().matchupLabel)}</div>
        </div>
      </div>

      <div class="phase5c-metric-context">
        <strong>Matchup Pitcher</strong>
        <span>${escapeHtml(phase5dMetricContextCopy())}</span>
      </div>

      <div class="matchup-grid phase5c-pitcher-grid phase5d-pitcher-grid">
        ${metrics.join("")}
      </div>
    </section>
  `;
};

async function runPhase5dSelfTest() {
  const pitcher = phase5cPitcherForSide();
  const metrics = pitcher ? phase5dPitcherMetrics(pitcher) : [];
  const checks = [
    {
      check: "six-metrics-rendered",
      status: pitcher ? metrics.length === 6 ? "pass" : "fail" : "needs-data"
    },
    {
      check: "target-aware-context",
      status: ["hit_1plus", "total_bases_2plus", "home_run_1plus"].includes(selectedMlbPredictionTarget) ? "pass" : "fail"
    },
    {
      check: "sample-guard-field",
      status: pitcher && selectedMlbPredictionTarget !== "hit_1plus"
        ? pitcher.pitcher_contact_bbe_30d !== undefined ? "pass" : "fail"
        : "not-required"
    },
    {
      check: "limited-sample-suppression",
      status: pitcher && selectedMlbPredictionTarget !== "hit_1plus" && Number(pitcher.pitcher_contact_bbe_30d) < PHASE5D_MIN_CONTACT_BBE
        ? metrics.join("").includes("Limited sample") ? "pass" : "fail"
        : "not-active"
    }
  ];

  console.table(checks);
  window.phase5dSelfTest = checks;
  return checks;
}

window.runPhase5dSelfTest = runPhase5dSelfTest;

// Repaint if the user lands directly on Select Game after all prior layers load.
if (selectedMlbBoardScope === PHASE5B_SCOPE_GAME) {
  phase5cReplaceMatchupCard();
}
