/* =========================================================
   MLB Hit Lab — Market Edge V2
   Phase 9B / 2A
   Build: phase9b-market-edge-v2-20260908a

   Owns only #marketEdgeView. Does not modify app-v4.js behavior
   outside the Market Edge view.
   ========================================================= */

(() => {
  "use strict";

  const BUILD = "phase9b-market-edge-v2-20260908a";
  const CACHE_TABLE = "mlb_market_edge_board_public_cache";
  const STORAGE_KEY = "marketEdgeV2State";

  const PROP_META = {
    all:       { label: "All Props" },
    hit:       { label: "1+ Hit", type: "hit_1plus" },
    tb:        { label: "2+ TB", type: "tb_2plus" },
    hr:        { label: "Home Run", type: "hr_1plus" },
    pitcher_k: { label: "Pitcher Ks", type: "pitcher_strikeouts" }
  };

  const TYPE_TO_KEY = {
    hit_1plus: "hit",
    tb_2plus: "tb",
    hr_1plus: "hr",
    pitcher_strikeouts: "pitcher_k"
  };

  const state = {
    prop: "all",
    ranking: "edge",
    scope: "top25",
    gamePk: null,
    latestDate: null,
    rows: [],
    loading: false,
    error: null
  };

  function el(id) { return document.getElementById(id); }
  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[ch]);
  }
  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function pct(v, signed = false) {
    const n = num(v);
    if (n == null) return "—";
    const value = n * 100;
    const sign = signed && value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  }
  function odds(v) {
    const n = num(v);
    if (n == null) return "—";
    return n > 0 ? `+${Math.round(n)}` : `${Math.round(n)}`;
  }
  function dateLabel(value) {
    if (!value) return "—";
    const d = new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
  }
  function timeLabel(value) {
    if (!value) return "";
    const d = new Date(value);
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric", minute: "2-digit", timeZoneName: "short"
    }).format(d);
  }

  function loadSavedState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (PROP_META[saved.prop]) state.prop = saved.prop;
      if (["edge", "model"].includes(saved.ranking)) state.ranking = saved.ranking;
      if (["top25", "game"].includes(saved.scope)) state.scope = saved.scope;
      if (saved.gamePk != null && String(saved.gamePk).trim()) state.gamePk = String(saved.gamePk);
    } catch (_) {}
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        prop: state.prop,
        ranking: state.ranking,
        scope: state.scope,
        gamePk: state.gamePk
      }));
    } catch (_) {}
  }

  function setPageCopy() {
    const marketView = el("marketEdgeView");
    if (!marketView?.classList.contains("active-view")) return;
    if (el("pageEyebrow")) el("pageEyebrow").textContent = "Model vs Market · Cross-Prop Opportunity Board";
    if (el("pageTitle")) el("pageTitle").textContent = "Market Edge";
    if (el("pageSubtitle")) {
      el("pageSubtitle").textContent =
        "Rank MLB player props by model-vs-market edge or by raw model probability.";
    }
  }

  async function fetchLatestRows() {
    if (state.loading) return;
    state.loading = true;
    state.error = null;
    render();

    try {
      if (typeof client === "undefined" || !client?.from) {
        throw new Error("Supabase client is not available.");
      }

      const latest = await client
        .from(CACHE_TABLE)
        .select("game_date")
        .order("game_date", { ascending: false })
        .limit(1);

      if (latest.error) throw latest.error;
      const latestDate = latest.data?.[0]?.game_date;
      if (!latestDate) throw new Error("No Market Edge cache rows are available.");

      const result = await client
        .from(CACHE_TABLE)
        .select([
          "row_key","game_date","game_pk","game_label","game_time_utc",
          "prop_type","prop_label","entity_type","player_id","player_name",
          "team_id","team_name","opponent_team_id","opponent_team_name","handedness",
          "market_line","side","model_probability","market_probability_no_vig",
          "edge_probability","best_american_odds","best_book","market_available",
          "market_updated_at","model_name","model_status","prediction_stage",
          "quality_status","rank_model","rank_edge","rank_model_prop","rank_edge_prop",
          "rank_model_game","rank_edge_game","refreshed_at"
        ].join(","))
        .eq("game_date", latestDate)
        .limit(2000);

      if (result.error) throw result.error;

      state.latestDate = latestDate;
      state.rows = Array.isArray(result.data) ? result.data : [];
      normalizeSelectedGame();
    } catch (err) {
      console.error("Market Edge V2 load failed", err);
      state.error = err?.message || String(err);
      state.rows = [];
    } finally {
      state.loading = false;
      render();
    }
  }

  function propMatches(row) {
    if (state.prop === "all") return true;
    return TYPE_TO_KEY[row.prop_type] === state.prop;
  }

  function edgeEligible(row) {
    return num(row.edge_probability) != null && num(row.market_probability_no_vig) != null;
  }

  function filteredRows() {
    let rows = state.rows.filter(propMatches);

    if (state.scope === "game" && state.gamePk != null) {
      rows = rows.filter(r => String(r.game_pk) === String(state.gamePk));
    }

    if (state.ranking === "edge") {
      rows = rows.filter(edgeEligible);
      rows.sort((a, b) => {
        const ae = num(a.edge_probability) ?? -Infinity;
        const be = num(b.edge_probability) ?? -Infinity;
        if (be !== ae) return be - ae;
        return (num(b.model_probability) ?? -Infinity) - (num(a.model_probability) ?? -Infinity);
      });
    } else {
      rows.sort((a, b) => {
        const am = num(a.model_probability) ?? -Infinity;
        const bm = num(b.model_probability) ?? -Infinity;
        if (bm !== am) return bm - am;
        return (num(b.edge_probability) ?? -Infinity) - (num(a.edge_probability) ?? -Infinity);
      });
    }

    return rows.slice(0, 25);
  }

  function gameOptions() {
    const seen = new Map();
    for (const row of state.rows) {
      if (row.game_pk == null) continue;
      const key = String(row.game_pk);
      if (!seen.has(key)) {
        seen.set(key, {
          gamePk: key,
          label: row.game_label || `${row.team_name || "Team"} vs ${row.opponent_team_name || "Opponent"}`,
          time: row.game_time_utc
        });
      }
    }
    return [...seen.values()].sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));
  }

  function normalizeSelectedGame() {
    const games = gameOptions();
    if (!games.length) {
      state.gamePk = null;
      return;
    }
    if (!games.some(g => g.gamePk === String(state.gamePk))) {
      state.gamePk = games[0].gamePk;
    }
  }

  function buttonGroup(label, buttons, className = "") {
    return `
      <div class="mev2-control-group ${className}">
        <span class="mev2-control-label">${esc(label)}</span>
        <div class="mev2-segments">
          ${buttons.map(b => `
            <button type="button"
              class="mev2-segment ${b.active ? "active" : ""}"
              data-mev2-action="${esc(b.action)}"
              data-mev2-value="${esc(b.value)}"
              aria-pressed="${b.active ? "true" : "false"}">
              ${esc(b.label)}
            </button>
          `).join("")}
        </div>
      </div>`;
  }

  function controlsHtml() {
    const propButtons = Object.entries(PROP_META).map(([key, meta]) => ({
      label: meta.label, action: "prop", value: key, active: state.prop === key
    }));
    const rankButtons = [
      { label: "Edge Ranking", action: "ranking", value: "edge", active: state.ranking === "edge" },
      { label: "Model Probability", action: "ranking", value: "model", active: state.ranking === "model" }
    ];
    const scopeButtons = [
      { label: "Top 25", action: "scope", value: "top25", active: state.scope === "top25" },
      { label: "Select Game", action: "scope", value: "game", active: state.scope === "game" }
    ];

    const games = gameOptions();
    const gameSelect = state.scope === "game" ? `
      <div class="mev2-game-row">
        <select id="mev2GameSelect" class="mev2-game-select" aria-label="Select MLB game">
          ${games.map(g => `
            <option value="${esc(g.gamePk)}" ${String(state.gamePk) === g.gamePk ? "selected" : ""}>
              ${esc(g.label)}${g.time ? ` · ${esc(timeLabel(g.time))}` : ""}
            </option>
          `).join("")}
        </select>
        <span class="mev2-game-meta">${games.length} games available</span>
      </div>` : "";

    return `
      <section class="mev2-control-card">
        <div class="mev2-control-grid">
          ${buttonGroup("PROP", propButtons, "mev2-prop-group")}
          ${buttonGroup("RANK BY", rankButtons)}
          ${buttonGroup("SCOPE", scopeButtons)}
        </div>
        ${gameSelect}
      </section>`;
  }

  function summaryHtml(rows) {
    const top = rows.slice(0, 3);
    return `
      <section class="mev2-summary">
        <div class="mev2-section-heading">
          <div>
            <div class="mev2-kicker">DAILY SUMMARY</div>
            <h2>Top 3 Opportunities</h2>
            <p>${state.ranking === "edge"
              ? "Highest model-vs-market edges with paired no-vig pricing."
              : "Highest model probabilities in the active view."}</p>
          </div>
          <span class="mev2-count">${top.length}/3</span>
        </div>
        <div class="mev2-summary-grid">
          ${top.length ? top.map((row, i) => summaryCard(row, i)).join("") :
            `<div class="mev2-empty-summary">No qualifying rows for this selection.</div>`}
        </div>
      </section>`;
  }

  function summaryCard(row, index) {
    return `
      <button class="mev2-summary-card ${index === 0 ? "primary" : ""}"
        type="button" data-mev2-row="${esc(row.row_key)}">
        <div class="mev2-summary-rank">#${index + 1}</div>
        <div class="mev2-summary-copy">
          <strong>${esc(row.player_name || "—")}</strong>
          <span>${esc(row.prop_label || row.prop_type || "—")}</span>
          <small>${esc(row.game_label || "")}</small>
        </div>
        <div class="mev2-summary-metric">
          <strong>${state.ranking === "edge" ? pct(row.edge_probability, true) : pct(row.model_probability)}</strong>
          <span>${state.ranking === "edge" ? "EDGE" : "MODEL"}</span>
        </div>
      </button>`;
  }

  function marketCell(row) {
    if (num(row.market_probability_no_vig) == null) {
      return `<span class="mev2-na" title="No paired Over/Under market is available for a true no-vig probability.">—</span>`;
    }
    return pct(row.market_probability_no_vig);
  }

  function edgeCell(row) {
    const n = num(row.edge_probability);
    if (n == null) return `<span class="mev2-na">—</span>`;
    const cls = n >= 0.10 ? "large" : n >= 0.05 ? "medium" : n >= 0.03 ? "small" : "positive";
    return `<span class="mev2-edge ${cls}">${pct(n, true)}</span>`;
  }

  function tableHtml(rows) {
    return `
      <section class="mev2-board">
        <div class="mev2-section-heading compact">
          <div>
            <div class="mev2-kicker">MARKET EDGE OPPORTUNITIES</div>
            <h2>${esc(PROP_META[state.prop]?.label || "All Props")}</h2>
          </div>
          <div class="mev2-board-meta">
            <span>${rows.length} shown</span>
            <span>${dateLabel(state.latestDate)}</span>
          </div>
        </div>
        <div class="mev2-table-wrap">
          <table class="mev2-table">
            <thead>
              <tr>
                <th>#</th>
                <th>PLAYER</th>
                <th>PROP</th>
                <th>MODEL</th>
                <th>MARKET</th>
                <th>EDGE</th>
                <th>BEST ODDS</th>
                <th>BOOK</th>
                <th aria-label="Details"></th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map((row, i) => tableRow(row, i)).join("") :
                `<tr><td colspan="9"><div class="mev2-empty">
                  ${state.ranking === "edge"
                    ? "No paired no-vig markets are available for this selection."
                    : "No model rows are available for this selection."}
                </div></td></tr>`}
            </tbody>
          </table>
        </div>
      </section>`;
  }

  function tableRow(row, index) {
    const hand = row.handedness ? ` · ${esc(row.handedness)}` : "";
    return `
      <tr class="mev2-row" data-mev2-row="${esc(row.row_key)}" tabindex="0">
        <td class="mev2-rank">${index + 1}</td>
        <td>
          <div class="mev2-player">
            <strong>${esc(row.player_name || "—")}</strong>
            <span>${esc(row.team_name || "—")} vs ${esc(row.opponent_team_name || "—")}${hand}</span>
          </div>
        </td>
        <td><span class="mev2-prop-pill">${esc(row.prop_label || row.prop_type || "—")}</span></td>
        <td><strong>${pct(row.model_probability)}</strong></td>
        <td>${marketCell(row)}</td>
        <td>${edgeCell(row)}</td>
        <td><strong>${odds(row.best_american_odds)}</strong></td>
        <td>${esc(row.best_book || "—")}</td>
        <td><button class="mev2-chevron" type="button" data-mev2-row="${esc(row.row_key)}" aria-label="Open details">›</button></td>
      </tr>`;
  }

  function statusHtml() {
    const freshest = state.rows
      .map(r => r.refreshed_at)
      .filter(Boolean)
      .sort()
      .at(-1);
    return `
      <div class="mev2-footer">
        <div class="mev2-legend">
          <span><i class="large"></i> Large ≥ 10%</span>
          <span><i class="medium"></i> Medium ≥ 5%</span>
          <span><i class="small"></i> Small ≥ 3%</span>
        </div>
        <span>Cache updated ${freshest ? esc(timeLabel(freshest)) : "—"}</span>
      </div>`;
  }

  function loadingHtml() {
    return `
      <section class="mev2-loading">
        <div class="mev2-spinner"></div>
        <strong>Loading Market Edge...</strong>
        <span>Reading the unified cross-prop serving cache.</span>
      </section>`;
  }

  function errorHtml() {
    return `
      <section class="mev2-error">
        <strong>Market Edge could not load.</strong>
        <span>${esc(state.error || "Unknown error")}</span>
        <button type="button" data-mev2-action="reload" data-mev2-value="1">Try Again</button>
      </section>`;
  }

  function render() {
    const root = el("marketEdgeContent");
    if (!root) return;
    setPageCopy();

    if (state.loading && !state.rows.length) {
      root.innerHTML = loadingHtml();
      return;
    }
    if (state.error && !state.rows.length) {
      root.innerHTML = errorHtml();
      bind();
      return;
    }

    const rows = filteredRows();
    root.innerHTML = `
      <div class="mev2-shell" data-build="${BUILD}">
        ${controlsHtml()}
        ${summaryHtml(rows)}
        ${tableHtml(rows)}
        ${statusHtml()}
      </div>`;
    bind();
  }

  function bind() {
    const root = el("marketEdgeContent");
    if (!root) return;

    root.querySelectorAll("[data-mev2-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.mev2Action;
        const value = btn.dataset.mev2Value;
        if (action === "prop" && PROP_META[value]) state.prop = value;
        if (action === "ranking" && ["edge","model"].includes(value)) state.ranking = value;
        if (action === "scope" && ["top25","game"].includes(value)) {
          state.scope = value;
          normalizeSelectedGame();
        }
        if (action === "reload") {
          fetchLatestRows();
          return;
        }
        saveState();
        render();
      });
    });

    el("mev2GameSelect")?.addEventListener("change", e => {
      state.gamePk = String(e.target.value);
      saveState();
      render();
    });

    root.querySelectorAll("[data-mev2-row]").forEach(node => {
      const open = () => openMarketEdgeDetail(node.dataset.mev2Row);
      node.addEventListener("click", e => {
        if (e.target.closest("[data-mev2-action]")) return;
        open();
      });
      node.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    });
  }

  function openMarketEdgeDetail(rowKey) {
    const row = state.rows.find(r => String(r.row_key) === String(rowKey));
    if (!row) return;

    let drawer = el("mev2DetailDrawer");
    if (!drawer) {
      drawer = document.createElement("aside");
      drawer.id = "mev2DetailDrawer";
      drawer.className = "mev2-detail-drawer";
      drawer.innerHTML = `<button class="mev2-detail-close" type="button" aria-label="Close">×</button><div id="mev2DetailBody"></div>`;
      document.body.appendChild(drawer);
      drawer.querySelector(".mev2-detail-close").addEventListener("click", closeMarketEdgeDetail);
    }

    let backdrop = el("mev2DetailBackdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "mev2DetailBackdrop";
      backdrop.className = "mev2-detail-backdrop";
      backdrop.addEventListener("click", closeMarketEdgeDetail);
      document.body.appendChild(backdrop);
    }

    const body = el("mev2DetailBody");
    body.innerHTML = `
      <div class="mev2-detail-kicker">${esc(row.prop_label || row.prop_type || "PROP")}</div>
      <h2>${esc(row.player_name || "—")}</h2>
      <p class="mev2-detail-matchup">${esc(row.game_label || "")}</p>
      <div class="mev2-detail-grid">
        <div><span>Model Probability</span><strong>${pct(row.model_probability)}</strong></div>
        <div><span>Market No-Vig</span><strong>${marketCell(row)}</strong></div>
        <div><span>Edge</span><strong>${edgeCell(row)}</strong></div>
        <div><span>Best Odds</span><strong>${odds(row.best_american_odds)}</strong></div>
        <div><span>Sportsbook</span><strong>${esc(row.best_book || "—")}</strong></div>
        <div><span>Line</span><strong>${row.market_line == null ? "—" : esc(row.market_line)} ${esc(row.side || "")}</strong></div>
      </div>
      <div class="mev2-detail-status">
        <span>${esc(row.model_status || "—")}</span>
        <span>${esc(row.prediction_stage || "—")}</span>
        <span>${esc(row.quality_status || "—")}</span>
      </div>
      ${num(row.market_probability_no_vig) == null ? `
        <div class="mev2-detail-note">
          True market edge is unavailable because a paired Over/Under market was not available for no-vig normalization.
        </div>` : ""}
    `;

    requestAnimationFrame(() => {
      drawer.classList.add("open");
      backdrop.classList.add("open");
    });
  }

  function closeMarketEdgeDetail() {
    el("mev2DetailDrawer")?.classList.remove("open");
    el("mev2DetailBackdrop")?.classList.remove("open");
  }

  function interceptMarketView() {
    const marketButton = document.querySelector('.nav-item[data-view="market"]');
    marketButton?.addEventListener("click", () => {
      requestAnimationFrame(() => {
        setPageCopy();
        if (!state.rows.length && !state.loading) fetchLatestRows();
        else render();
      });
    });

    const refresh = el("refreshButton");
    refresh?.addEventListener("click", () => {
      if (el("marketEdgeView")?.classList.contains("active-view")) {
        setTimeout(fetchLatestRows, 0);
      }
    });

    const observer = new MutationObserver(() => {
      if (el("marketEdgeView")?.classList.contains("active-view")) {
        setPageCopy();
        const root = el("marketEdgeContent");
        if (root && !root.querySelector(".mev2-shell") && !state.loading) {
          if (state.rows.length) render();
          else fetchLatestRows();
        }
      }
    });
    if (el("marketEdgeView")) observer.observe(el("marketEdgeView"), { attributes: true, attributeFilter: ["class"] });
  }

  window.runMarketEdgeV2SelfTest = function runMarketEdgeV2SelfTest() {
    const rows = filteredRows();
    const tests = {
      build: BUILD,
      latestDate: state.latestDate,
      totalRowsLoaded: state.rows.length,
      visibleRows: rows.length,
      max25: rows.length <= 25,
      noEvColumn: ![...document.querySelectorAll("#marketEdgeContent th")].some(th => th.textContent.trim() === "EV"),
      noTodayFilter: !/today/i.test(el("marketEdgeContent")?.querySelector(".mev2-control-card")?.textContent || ""),
      noBookFilter: !/all books/i.test(el("marketEdgeContent")?.querySelector(".mev2-control-card")?.textContent || ""),
      gameScopeValid: state.scope !== "game" || rows.every(r => String(r.game_pk) === String(state.gamePk)),
      edgeMathValid: state.rows
        .filter(r => num(r.edge_probability) != null && num(r.market_probability_no_vig) != null && num(r.model_probability) != null)
        .every(r => Math.abs(num(r.edge_probability) - (num(r.model_probability) - num(r.market_probability_no_vig))) < 0.0011),
      probabilitiesValid: state.rows.every(r =>
        (num(r.model_probability) == null || (num(r.model_probability) >= 0 && num(r.model_probability) <= 1)) &&
        (num(r.market_probability_no_vig) == null || (num(r.market_probability_no_vig) >= 0 && num(r.market_probability_no_vig) <= 1))
      )
    };
    tests.pass = Object.entries(tests)
      .filter(([k]) => !["build","latestDate","totalRowsLoaded","visibleRows","pass"].includes(k))
      .every(([,v]) => v === true);
    console.table(tests);
    return tests;
  };

  loadSavedState();
  interceptMarketView();
  console.info(`Market Edge V2 loaded: ${BUILD}`);
})();
