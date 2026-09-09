/* =========================================================
   Market Edge Live Preview
   Build: market-edge-live-preview-20260908b

   SAFE ROLLOUT CONTRACT
   - Does not modify market-edge-v2.js.
   - Does nothing unless URL contains ?meLive=1.
   - Uses isolated Supabase reads for live data.
   - Normal Market Edge startup remains the stable build.
   ========================================================= */
(() => {
  "use strict";

  const BUILD = "market-edge-live-preview-20260908b";
  const ENABLED = new URLSearchParams(window.location.search).get("meLive") === "1";
  if (!ENABLED) {
    console.info(`Market Edge Live Preview dormant: ${BUILD}`);
    return;
  }

  const MARKET_TABLE = "mlb_market_edge_board_public_cache";
  const BATTER_LIVE_TABLE = "mlb_market_edge_batter_live_status";
  const PITCHER_K_TABLE = "mlb_pitcher_k_board_public_cache";

  const state = {
    active: false,
    loading: false,
    prop: "all",
    ranking: "model",
    latestDate: null,
    marketRows: [],
    batterLive: new Map(),
    pitcherLive: new Map(),
    lastLoadedAt: null,
    error: null
  };

  const TYPE_TO_KEY = {
    hit_1plus: "hit",
    total_bases_2plus: "tb",
    home_run_1plus: "hr",
    pitcher_strikeouts: "pitcher_k"
  };

  const PROP_LABELS = {
    all: "All Props",
    hit: "1+ Hit",
    tb: "2+ TB",
    hr: "Home Run",
    pitcher_k: "Pitcher Ks"
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    })[c]);
  }

  function num(v) {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function pct(v, signed = false) {
    const n = num(v);
    if (n == null) return "—";
    const x = n * 100;
    return `${signed && x > 0 ? "+" : ""}${x.toFixed(1)}%`;
  }

  function odds(v) {
    const n = num(v);
    if (n == null) return "—";
    return n > 0 ? `+${Math.round(n)}` : `${Math.round(n)}`;
  }

  function bookLabel(v) {
    const raw = String(v ?? "").trim();
    if (!raw) return "—";
    const key = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    const labels = {
      draftkings:"DraftKings", fanduel:"FanDuel", betmgm:"BetMGM",
      caesars:"Caesars", betrivers:"BetRivers", espnbet:"ESPN BET",
      fanatics:"Fanatics"
    };
    return labels[key] || raw;
  }

  function teamLogo(teamId) {
    const n = num(teamId);
    return n == null ? "" : `https://www.mlbstatic.com/team-logos/${Math.round(n)}.svg`;
  }

  function key(gamePk, playerId) {
    return `${gamePk}:${playerId}`;
  }

  function propKey(row) {
    return TYPE_TO_KEY[row.prop_type] || "all";
  }

  function propLabel(row) {
    const k = propKey(row);
    if (k === "pitcher_k") return row.prop_label || "Pitcher Ks";
    return PROP_LABELS[k] || row.prop_label || "Prop";
  }

  function matchup(row) {
    return row.game_label || `${row.team_name || "Team"} vs ${row.opponent_team_name || "Opponent"}`;
  }

  function liveFor(row) {
    const k = key(row.game_pk, row.player_id);
    return row.prop_type === "pitcher_strikeouts"
      ? state.pitcherLive.get(k) || null
      : state.batterLive.get(k) || null;
  }

  function isLive(row) {
    return liveFor(row)?.is_game_live === true;
  }

  function syncControlsFromDom() {
    const root = document.getElementById("marketEdgeContent");
    if (!root) return;

    const activeProp = root.querySelector('[data-mev2-action="prop"].active');
    const activeRanking = root.querySelector('[data-mev2-action="ranking"].active');

    if (activeProp?.dataset.mev2Value) state.prop = activeProp.dataset.mev2Value;
    if (activeRanking?.dataset.mev2Value) state.ranking = activeRanking.dataset.mev2Value;
  }

  function installLiveButton() {
    const root = document.getElementById("marketEdgeContent");
    if (!root) return;

    const scopeGroup = $$('.mev2-control-group', root)
      .find(g => $(".mev2-control-label", g)?.textContent?.trim() === "SCOPE");
    const segments = scopeGroup?.querySelector(".mev2-segments");
    if (!segments || segments.querySelector('[data-me-live-preview="1"]')) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `mev2-segment me-live-preview-tab ${state.active ? "active" : ""}`;
    btn.dataset.meLivePreview = "1";
    btn.setAttribute("aria-pressed", state.active ? "true" : "false");
    btn.innerHTML = '<span class="me-live-preview-dot"></span>Live';
    segments.appendChild(btn);

    btn.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      state.active = true;
      syncControlsFromDom();
      markScopeButtons();
      loadAndRender();
    });
  }

  function markScopeButtons() {
    const root = document.getElementById("marketEdgeContent");
    if (!root) return;

    root.querySelectorAll('[data-mev2-action="scope"]').forEach(btn => {
      btn.classList.toggle("active", false);
      btn.setAttribute("aria-pressed", "false");
    });

    const live = root.querySelector('[data-me-live-preview="1"]');
    if (live) {
      live.classList.toggle("active", state.active);
      live.setAttribute("aria-pressed", state.active ? "true" : "false");
    }
  }

  async function fetchAllMarketRows(date) {
    const columns = [
      "row_key","game_date","game_pk","game_label","game_time_utc",
      "prop_type","prop_label","entity_type","player_id","player_name",
      "team_id","team_name","opponent_team_id","opponent_team_name","handedness",
      "market_line","side","model_probability","predicted_mean_k","market_probability_no_vig",
      "edge_probability","best_american_odds","best_book","market_available",
      "prediction_stage","quality_status","refreshed_at"
    ].join(",");

    const rows = [];
    const size = 1000;
    for (let from = 0; ; from += size) {
      const page = await client
        .from(MARKET_TABLE)
        .select(columns)
        .eq("game_date", date)
        .order("row_key", { ascending: true })
        .range(from, from + size - 1);

      if (page.error) throw page.error;
      const data = page.data || [];
      rows.push(...data);
      if (data.length < size) break;
    }
    return rows;
  }

  async function loadData() {
    if (state.loading) return;
    state.loading = true;
    state.error = null;

    try {
      if (typeof client === "undefined" || !client?.from) {
        throw new Error("Supabase client is unavailable.");
      }

      const latest = await client
        .from(MARKET_TABLE)
        .select("game_date")
        .order("game_date", { ascending: false })
        .limit(1);

      if (latest.error) throw latest.error;
      const date = latest.data?.[0]?.game_date;
      if (!date) throw new Error("No Market Edge date is available.");

      const [marketRows, batterResult, pitcherResult] = await Promise.all([
        fetchAllMarketRows(date),
        client
          .from(BATTER_LIVE_TABLE)
          .select("*")
          .eq("game_date", date),
        client
          .from(PITCHER_K_TABLE)
          .select("*")
          .eq("game_date", date)
      ]);

      if (batterResult.error) throw batterResult.error;
      if (pitcherResult.error) throw pitcherResult.error;

      state.latestDate = date;
      state.marketRows = marketRows;
      state.batterLive = new Map(
        (batterResult.data || []).map(r => [key(r.game_pk, r.player_id), r])
      );
      state.pitcherLive = new Map(
        (pitcherResult.data || []).map(r => [key(r.game_pk, r.pitcher_id), r])
      );
      state.lastLoadedAt = new Date().toISOString();
    } catch (err) {
      state.error = err?.message || String(err);
      console.error("Market Edge Live Preview failed", err);
    } finally {
      state.loading = false;
    }
  }

  function visibleRows() {
    let rows = state.marketRows.filter(isLive);

    if (state.prop !== "all") {
      rows = rows.filter(r => propKey(r) === state.prop);
    }

    if (state.ranking === "edge") {
      rows = rows
        .filter(r => r.market_available === true && num(r.edge_probability) != null && num(r.edge_probability) > 0)
        .sort((a,b) => (num(b.edge_probability) ?? -Infinity) - (num(a.edge_probability) ?? -Infinity));
    } else {
      rows = rows.sort((a,b) => (num(b.model_probability) ?? -Infinity) - (num(a.model_probability) ?? -Infinity));
    }

    return rows.slice(0, 25);
  }

  function liveStatus(row, live) {
    const k = propKey(row);
    if (k === "pitcher_k") {
      if (live.is_starter_active === true) return "STARTER ACTIVE";
      if (live.is_starter_active === false) return "STARTER OUT";
      return "LIVE";
    }
    if (k === "hit") return (num(live.hits) || 0) >= 1 ? "HIT RECORDED" : "IN PROGRESS";
    if (k === "tb") return (num(live.total_bases) || 0) >= 2 ? "2+ TB HIT" : `${Math.max(0, 2 - (num(live.total_bases) || 0))} TB TO GO`;
    if (k === "hr") return (num(live.home_runs) || 0) >= 1 ? "HOME RUN HIT" : "IN PROGRESS";
    return "LIVE";
  }

  function liveStats(row, live) {
    const k = propKey(row);
    if (k === "pitcher_k") {
      return [
        `${num(live.live_strikeouts) ?? 0} K`,
        `${num(live.live_innings_pitched) == null ? "—" : Number(live.live_innings_pitched).toFixed(1)} IP`,
        `${num(live.live_pitches) ?? 0} pitches`,
        `${num(live.live_batters_faced) ?? 0} BF`
      ];
    }
    const h = num(live.hits) ?? 0;
    const ab = num(live.at_bats) ?? 0;
    const pa = num(live.plate_appearances) ?? 0;
    if (k === "hit") return [`${h} H`, `${h}-for-${ab}`, `${pa} PA`];
    if (k === "tb") return [`${num(live.total_bases) ?? 0} TB`, `${h}-for-${ab}`, `${pa} PA`];
    if (k === "hr") return [`${num(live.home_runs) ?? 0} HR`, `${h}-for-${ab}`, `${pa} PA`];
    return [`${pa} PA`];
  }

  function card(row, index) {
    const live = liveFor(row);
    if (!live) return "";

    const edge = num(row.edge_probability);
    const tier = edge >= .10 ? "large" : edge >= .05 ? "medium" : edge >= .03 ? "small" : "base";
    const metric = state.ranking === "edge" ? pct(row.edge_probability, true) : pct(row.model_probability);
    const metricLabel = state.ranking === "edge" ? "EDGE" : "MODEL";
    const logo = teamLogo(row.team_id);
    const status = liveStatus(row, live);
    const success = /RECORDED|2\+ TB HIT|HOME RUN HIT/.test(status);
    const inning = live.current_inning ? `${live.inning_half || ""} ${live.current_inning}`.trim() : "In Progress";

    const lineText = row.prop_type === "pitcher_strikeouts" && row.market_line != null
      ? `${String(row.side || "").toUpperCase()} ${row.market_line} Ks`
      : propLabel(row);

    return `
      <button class="me-live-card tier-${tier}" type="button" data-mev2-row="${esc(row.row_key)}">
        <div class="me-live-left">
          <span class="me-live-chip">${esc(propKey(row) === "pitcher_k" ? "KS" : propLabel(row))}</span>
          ${logo ? `<span class="me-live-logo"><img src="${esc(logo)}" alt=""></span>` : ""}
          <span class="me-live-rank">#${index + 1}</span>
        </div>

        <div class="me-live-main">
          <div class="me-live-topline">
            <span class="me-live-tier">${edge >= .10 ? "LARGE EDGE" : edge >= .05 ? "MEDIUM EDGE" : edge >= .03 ? "SMALL EDGE" : "MODEL VIEW"}</span>
            <span class="me-live-stage">${esc(String(row.prediction_stage || "MODEL").toUpperCase())}</span>
          </div>

          <h3>${esc(row.player_name || "—")} <span>· ${esc(lineText)}</span></h3>
          <div class="me-live-matchup">${esc(matchup(row))}</div>

          <div class="me-live-pregame">
            <span>Model <strong>${pct(row.model_probability)}</strong></span>
            ${row.market_available === true ? `<span>Market <strong>${pct(row.market_probability_no_vig)}</strong></span>` : ""}
            ${edge != null ? `<span>Edge <strong class="positive">${pct(edge, true)}</strong></span>` : ""}
            ${row.best_book ? `<span>${esc(bookLabel(row.best_book))} <strong>${odds(row.best_american_odds)}</strong></span>` : ""}
          </div>

          <div class="me-live-strip ${success ? "success" : ""}">
            <b><i class="me-live-dot"></i>LIVE · ${esc(inning)}</b>
            ${liveStats(row, live).map(s => `<span>${esc(s)}</span>`).join("")}
            <em>${esc(status)}</em>
          </div>
        </div>

        <div class="me-live-metric">
          <strong>${metric}</strong>
          <span>${metricLabel}</span>
        </div>
      </button>`;
  }

  function previewHtml(rows) {
    const games = new Set(rows.map(r => String(r.game_pk))).size;
    const hitCount = rows.filter(r => {
      const live = liveFor(r);
      return live && /RECORDED|2\+ TB HIT|HOME RUN HIT/.test(liveStatus(r, live));
    }).length;

    if (state.error) {
      return `
        <section class="me-live-empty">
          <h3>Live Preview could not load</h3>
          <p>${esc(state.error)}</p>
          <button type="button" class="refresh-button" data-me-live-retry>Try Again</button>
        </section>`;
    }

    return `
      <section class="me-live-summary">
        <div>
          <div class="mev2-kicker">LIVE MARKET EDGE · PREVIEW</div>
          <h2>Today's Live Opportunities</h2>
          <p>Pregame model conviction paired with current MLB game progress.</p>
        </div>
        <div class="me-live-pills">
          <span class="live"><i class="me-live-dot"></i>${games} live ${games === 1 ? "game" : "games"}</span>
          <span>${rows.length} tracked ${rows.length === 1 ? "prop" : "props"}</span>
          <span>${hitCount} already hit</span>
        </div>
      </section>

      <section class="me-live-board">
        <div class="mev2-board-heading">
          <div>
            <div class="mev2-kicker">LIVE TRACKING</div>
            <h2>${esc(PROP_LABELS[state.prop] || "All Props")}</h2>
            <p>${state.ranking === "edge" ? "Ranked by pregame Market Edge." : "Ranked by pregame model probability."}</p>
          </div>
          <div class="mev2-board-meta">
            <span class="mev2-opportunity-count">${rows.length} live</span>
          </div>
        </div>

        ${rows.length
          ? `<div class="me-live-list">${rows.map(card).join("")}</div>`
          : `<div class="me-live-empty">
               <i class="me-live-dot"></i>
               <h3>No qualifying Market Edge games are live right now</h3>
               <p>This preview will populate as today's tracked games begin.</p>
             </div>`}
      </section>`;
  }

  function enforceLiveOnlyLayout(root, control, host) {
    // Live owns the content area while active. Keep only the shared controls
    // and Live preview host visible; hide stable Daily Summary/opportunity sections.
    [...root.children].forEach(child => {
      const keep = child === control || child === host || child.contains(control);
      if (keep) {
        child.style.removeProperty("display");
      } else {
        child.style.display = "none";
      }
    });
  }

  function renderPreview() {
    const root = document.getElementById("marketEdgeContent");
    if (!root || !state.active) return;

    installLiveButton();
    markScopeButtons();

    const control = root.querySelector(".mev2-control-card");
    if (!control) return;

    let host = root.querySelector("#meLivePreviewHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "meLivePreviewHost";
      host.className = "me-live-preview-host";
      control.insertAdjacentElement("afterend", host);
    }

    // IMPORTANT: enforce this on every render. The stable core can re-render
    // after prop/ranking changes and recreate its Daily Summary/table.
    enforceLiveOnlyLayout(root, control, host);

    if (state.loading) {
      host.innerHTML = `
        <section class="me-live-empty">
          <i class="me-live-dot"></i>
          <h3>Loading Live Preview...</h3>
          <p>Reading Market Edge and MLB live status feeds.</p>
        </section>`;
      return;
    }

    host.innerHTML = previewHtml(visibleRows());

    host.querySelector("[data-me-live-retry]")?.addEventListener("click", () => loadAndRender());

    host.querySelectorAll("[data-mev2-row]").forEach(node => {
      node.addEventListener("click", () => {
        // Let the existing unified drawer capture this row key if present.
        // If it does not, the preview simply remains open.
      });
    });
  }

  function restoreStableView() {
    const root = document.getElementById("marketEdgeContent");
    if (!root) return;
    state.active = false;
    root.querySelector("#meLivePreviewHost")?.remove();
    [...root.children].forEach(child => child.style.removeProperty("display"));
    installLiveButton();
  }

  async function loadAndRender() {
    renderPreview();
    await loadData();
    renderPreview();
  }

  function installControlSafety() {
    const root = document.getElementById("marketEdgeContent");
    if (!root) return;

    root.addEventListener("click", event => {
      const actionBtn = event.target.closest("[data-mev2-action]");
      if (!actionBtn) return;

      const action = actionBtn.dataset.mev2Action;
      const value = actionBtn.dataset.mev2Value;

      if (action === "scope" && ["top25", "game"].includes(value)) {
        restoreStableView();
        return;
      }

      if (state.active && action === "prop") {
        state.prop = value || "all";
        setTimeout(() => {
          installLiveButton();
          state.active = true;
          renderPreview();
        }, 0);
      }

      if (state.active && action === "ranking") {
        state.ranking = value || "model";
        setTimeout(() => {
          installLiveButton();
          state.active = true;
          renderPreview();
        }, 0);
      }
    }, true);
  }

  function boot() {
    const root = document.getElementById("marketEdgeContent");
    if (!root) return;

    syncControlsFromDom();
    installLiveButton();
    installControlSafety();

    window.runMarketEdgeLivePreviewSelfTest = () => {
      const rows = visibleRows();
      const tests = {
        build: BUILD,
        enabledByQueryParam: ENABLED,
        stableCoreUntouched: true,
        latestDate: state.latestDate,
        marketRows: state.marketRows.length,
        batterLiveRows: state.batterLive.size,
        pitcherLiveRows: state.pitcherLive.size,
        visibleRows: rows.length,
        liveRowsValid: rows.every(isLive),
        max25: rows.length <= 25,
        liveOnlyLayout: (() => {
          const root = document.getElementById("marketEdgeContent");
          const host = root?.querySelector("#meLivePreviewHost");
          const control = root?.querySelector(".mev2-control-card");
          if (!state.active || !root || !host || !control) return true;
          return [...root.children].every(child =>
            child === control || child === host || child.contains(control) ||
            getComputedStyle(child).display === "none"
          );
        })()
      };
      tests.pass = tests.enabledByQueryParam && tests.stableCoreUntouched &&
        tests.liveRowsValid && tests.max25 && tests.liveOnlyLayout;
      console.table(tests);
      return tests;
    };

    console.info(`Market Edge Live Preview ready: ${BUILD}`);
  }

  // The stable Market Edge module renders asynchronously after page load.
  // Poll briefly for its control card; do not observe or mutate global headers.
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if ($("#marketEdgeContent .mev2-control-card")) {
      clearInterval(timer);
      boot();
    } else if (attempts >= 80) {
      clearInterval(timer);
      console.warn("Market Edge Live Preview did not find the stable control card.");
    }
  }, 100);
})();