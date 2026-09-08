/* =========================================================
   MLB Hit Lab — Market Edge V2
   Build: phase9b-market-edge-v2-20260908k
   Owns only #marketEdgeView.
   ========================================================= */
(() => {
  "use strict";

  const BUILD = "phase9b-market-edge-v2-20260908k";
  const CACHE_TABLE = "mlb_market_edge_board_public_cache";
  const STORAGE_KEY = "marketEdgeV2State";

  const PROP_META = {
    all:       { label: "All Props" },
    hit:       { label: "1+ Hit", type: "hit_1plus" },
    tb:        { label: "2+ TB", type: "total_bases_2plus" },
    hr:        { label: "Home Run", type: "home_run_1plus" },
    pitcher_k: { label: "Pitcher Ks", type: "pitcher_strikeouts" }
  };

  const TYPE_TO_KEY = {
    hit_1plus: "hit",
    total_bases_2plus: "tb",
    home_run_1plus: "hr",
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

  const el = id => document.getElementById(id);

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[ch]);
  }

  function num(v) {
    if (v == null || (typeof v === "string" && !v.trim())) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function pct(v, signed = false) {
    const n = num(v);
    if (n == null) return "—";
    const value = n * 100;
    return `${signed && value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  }

  function odds(v) {
    const n = num(v);
    if (n == null) return "—";
    return n > 0 ? `+${Math.round(n)}` : `${Math.round(n)}`;
  }

  function expectedKs(v) {
    const n = num(v);
    return n == null ? "—" : n.toFixed(1);
  }

  function dateLabel(value) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
      .format(new Date(`${value}T12:00:00`));
  }

  function timeLabel(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric", minute: "2-digit", timeZoneName: "short"
    }).format(new Date(value));
  }

  function bookLabel(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "—";
    const key = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    const labels = {
      draftkings: "DraftKings", fanduel: "FanDuel", betmgm: "BetMGM",
      betonlineag: "BetOnline", betonline: "BetOnline", bovada: "Bovada",
      caesars: "Caesars", betrivers: "BetRivers", pointsbetus: "PointsBet",
      espnbet: "ESPN BET", fanatics: "Fanatics"
    };
    return labels[key] || raw.replace(/\b\w/g, c => c.toUpperCase());
  }

  function teamAbbr(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const map = {
      "Arizona Diamondbacks":"ARI","Athletics":"ATH","Atlanta Braves":"ATL","Baltimore Orioles":"BAL",
      "Boston Red Sox":"BOS","Chicago Cubs":"CHC","Chicago White Sox":"CWS","Cincinnati Reds":"CIN",
      "Cleveland Guardians":"CLE","Colorado Rockies":"COL","Detroit Tigers":"DET","Houston Astros":"HOU",
      "Kansas City Royals":"KC","Los Angeles Angels":"LAA","Los Angeles Dodgers":"LAD","Miami Marlins":"MIA",
      "Milwaukee Brewers":"MIL","Minnesota Twins":"MIN","New York Mets":"NYM","New York Yankees":"NYY",
      "Philadelphia Phillies":"PHI","Pittsburgh Pirates":"PIT","San Diego Padres":"SD","San Francisco Giants":"SF",
      "Seattle Mariners":"SEA","St. Louis Cardinals":"STL","Tampa Bay Rays":"TB","Texas Rangers":"TEX",
      "Toronto Blue Jays":"TOR","Washington Nationals":"WSH"
    };
    return map[raw] || raw;
  }

  function matchupLabel(row) {
    const team = teamAbbr(row.team_name);
    const opp = teamAbbr(row.opponent_team_name);
    return team && opp ? `${team} @ ${opp}` : (row.game_label || "");
  }

  function teamLogoUrl(teamId) {
    const id = num(teamId);
    return id == null ? "" : `https://www.mlbstatic.com/team-logos/${Math.round(id)}.svg`;
  }

  function propShort(row) {
    const key = TYPE_TO_KEY[row.prop_type];
    if (key === "hit") return "1+ Hit";
    if (key === "tb") return "2+ TB";
    if (key === "hr") return "Home Run";
    if (key === "pitcher_k") return row.prop_label || "Pitcher Ks";
    return row.prop_label || row.prop_type || "Prop";
  }

  function signalLabel(row) {
    const key = TYPE_TO_KEY[row.prop_type];
    if (state.ranking === "edge") return "Market Edge";
    if (key === "hit") return "Hit Model";
    if (key === "tb") return "TB Model";
    if (key === "hr") return "HR Model";
    if (key === "pitcher_k") return "K Model";
    return "Model";
  }

  function signalIcon(row) {
    const key = TYPE_TO_KEY[row.prop_type];
    if (state.ranking === "edge") return "⚡";
    if (key === "hr") return "🔥";
    if (key === "pitcher_k") return "K";
    return "◆";
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
    if (!el("marketEdgeView")?.classList.contains("active-view")) return;
    if (el("pageEyebrow")) el("pageEyebrow").textContent = "ALL MLB · PROP INTELLIGENCE";
    if (el("pageTitle")) el("pageTitle").textContent = "Market Edge";
    if (el("pageSubtitle")) {
      el("pageSubtitle").textContent =
        "Compare model probabilities with sportsbook markets across MLB player props.";
    }
  }

  function installHeaderGuard() {
    const expected = {
      pageEyebrow: "ALL MLB · PROP INTELLIGENCE",
      pageTitle: "Market Edge",
      pageSubtitle: "Compare model probabilities with sportsbook markets across MLB player props."
    };

    const enforce = () => {
      if (!el("marketEdgeView")?.classList.contains("active-view")) return;
      const mismatch = Object.entries(expected).some(([id, value]) => el(id)?.textContent !== value);
      if (mismatch) setPageCopy();
    };

    const observer = new MutationObserver(enforce);

    Object.keys(expected).forEach(id => {
      const node = el(id);
      if (node) {
        observer.observe(node, {
          childList: true,
          characterData: true,
          subtree: true
        });
      }
    });

    const marketView = el("marketEdgeView");
    if (marketView) {
      observer.observe(marketView, {
        attributes: true,
        attributeFilter: ["class"]
      });
    }

    window.addEventListener("pageshow", enforce);
    requestAnimationFrame(enforce);
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

      const selectColumns = [
        "row_key","game_date","game_pk","game_label","game_time_utc",
        "prop_type","prop_label","entity_type","player_id","player_name",
        "team_id","team_name","opponent_team_id","opponent_team_name","handedness",
        "market_line","side","model_probability","predicted_mean_k","market_probability_no_vig",
        "edge_probability","best_american_odds","best_book","market_available",
        "market_updated_at","model_name","model_status","prediction_stage",
        "quality_status","rank_model","rank_edge","rank_model_prop","rank_edge_prop",
        "rank_model_game","rank_edge_game","refreshed_at"
      ].join(",");

      // PostgREST/Supabase can cap a single response page. The daily Market Edge
      // cache can exceed 1,000 rows, so page through the complete snapshot
      // deterministically instead of assuming one request returns everything.
      const pageSize = 1000;
      const allRows = [];

      for (let from = 0; ; from += pageSize) {
        const page = await client
          .from(CACHE_TABLE)
          .select(selectColumns)
          .eq("game_date", latestDate)
          .order("row_key", { ascending: true })
          .range(from, from + pageSize - 1);

        if (page.error) throw page.error;

        const pageRows = Array.isArray(page.data) ? page.data : [];
        allRows.push(...pageRows);

        if (pageRows.length < pageSize) break;
      }

      state.latestDate = latestDate;
      state.rows = allRows;
      normalizeSelectedGame();

      console.info(
        `Market Edge cache loaded: ${state.rows.length} rows for ${latestDate}`
      );
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
    return state.prop === "all" || TYPE_TO_KEY[row.prop_type] === state.prop;
  }

  function edgeEligible(row) {
    const edge = num(row.edge_probability);
    const market = num(row.market_probability_no_vig);
    return row.market_available === true && market != null && edge != null && edge > 0;
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
    if (!games.some(g => g.gamePk === String(state.gamePk))) state.gamePk = games[0].gamePk;
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
    const title = state.ranking === "edge" ? "Top 3 Edge Plays" : "Top 3 Model Plays";
    const copy = state.ranking === "edge"
      ? "Highest positive model-vs-market edges with paired no-vig pricing."
      : "Highest model probabilities in the active view.";

    return `
      <section class="mev2-summary">
        <div class="mev2-summary-header">
          <div class="mev2-summary-title-wrap">
            <div class="mev2-summary-trophy" aria-hidden="true">🏆</div>
            <div>
              <div class="mev2-kicker">DAILY SUMMARY</div>
              <h2>${title}</h2>
              <p>${copy}</p>
            </div>
          </div>
          <span class="mev2-count">👥 ${top.length} plays</span>
        </div>
        <div class="mev2-summary-grid">
          ${top.length
            ? top.map((row, i) => summaryCard(row, i)).join("")
            : `<div class="mev2-empty-summary">No qualifying rows for this selection.</div>`}
        </div>
      </section>`;
  }

  function summaryCard(row, index) {
    const logo = teamLogoUrl(row.team_id);
    const metric = state.ranking === "edge" ? pct(row.edge_probability, true) : pct(row.model_probability);
    const metricLabel = state.ranking === "edge" ? "EDGE" : "MODEL";

    return `
      <button class="mev2-summary-card ${index === 0 ? "primary" : ""}"
        type="button" data-mev2-row="${esc(row.row_key)}">
        <div class="mev2-card-topline">
          <div class="mev2-card-identity">
            <span class="mev2-summary-rank">${index + 1}</span>
            ${row.handedness ? `<span class="mev2-hand-badge">${esc(row.handedness)}</span>` : ""}
            ${logo ? `<span class="mev2-team-logo-wrap"><img class="mev2-team-logo" src="${esc(logo)}" alt="" onerror="this.parentElement.style.display='none'"></span>` : ""}
          </div>
          <div class="mev2-summary-metric">
            <strong>${metric}</strong>
            <span>${metricLabel}</span>
          </div>
        </div>

        <div class="mev2-summary-copy">
          <strong>${esc(row.player_name || "—")}</strong>
        </div>

        <div class="mev2-card-footer">
          <span class="mev2-card-matchup">${esc(matchupLabel(row) || "—")}</span>
          <span class="mev2-signal-badge"><i>${signalIcon(row)}</i>${esc(signalLabel(row))}</span>
        </div>
      </button>`;
  }

  function marketCell(row) {
    if (row.market_available !== true || num(row.market_probability_no_vig) == null) {
      return `<span class="mev2-na" title="No paired Over/Under market is available for a true no-vig probability.">—</span>`;
    }
    return pct(row.market_probability_no_vig);
  }

  function edgeCell(row) {
    if (row.market_available !== true || num(row.market_probability_no_vig) == null) {
      return `<span class="mev2-na">—</span>`;
    }
    const n = num(row.edge_probability);
    if (n == null) return `<span class="mev2-na">—</span>`;
    const cls = n >= 0.10 ? "large" : n >= 0.05 ? "medium" : n >= 0.03 ? "small" : "positive";
    return `<span class="mev2-edge ${cls}">${pct(n, true)}</span>`;
  }

  function bestOddsCell(row) {
    return num(row.best_american_odds) == null ? "—" : odds(row.best_american_odds);
  }

  function tableHtml(rows) {
    const subtitle = state.ranking === "edge"
      ? "Ranked by edge (model probability vs. no-vig market probability)."
      : "Ranked by raw model probability.";

    return `
      <section class="mev2-board">
        <div class="mev2-board-heading">
          <div>
            <div class="mev2-kicker">MARKET EDGE OPPORTUNITIES</div>
            <h2>${esc(PROP_META[state.prop]?.label || "All Props")}</h2>
            <p>${subtitle}</p>
          </div>
          <div class="mev2-board-meta">
            <span class="mev2-opportunity-count">${rows.length} ${rows.length === 1 ? "opportunity" : "opportunities"}</span>
            <span>${dateLabel(state.latestDate)}</span>
          </div>
        </div>
        <div class="mev2-table-card">
          <div class="mev2-table-wrap">
            <table class="mev2-table">
              <thead>
                <tr>
                  <th>#</th><th>PLAYER</th><th>PROP</th><th>MODEL</th><th>MARKET</th>
                  <th>EDGE</th><th>BEST ODDS</th><th>BOOK</th><th aria-label="Details"></th>
                </tr>
              </thead>
              <tbody>
                ${rows.length
                  ? rows.map((row, i) => tableRow(row, i)).join("")
                  : `<tr><td colspan="9"><div class="mev2-empty">${
                      state.ranking === "edge"
                        ? "No positive model-vs-market edges with paired no-vig pricing are available for this selection."
                        : "No model rows are available for this selection."
                    }</div></td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </section>`;
  }

  function tableRow(row, index) {
    const hand = row.handedness || "";
    const logo = teamLogoUrl(row.team_id);
    const isPrimary = index === 0 && state.ranking === "edge";

    return `
      <tr class="mev2-row ${isPrimary ? "primary" : ""}" data-mev2-row="${esc(row.row_key)}" tabindex="0">
        <td class="mev2-rank-cell"><span class="mev2-rank-orb">${index + 1}</span></td>
        <td>
          <div class="mev2-player-cell">
            <div class="mev2-player-badges">
              ${hand ? `<span class="mev2-hand-badge">${esc(hand)}</span>` : ""}
              ${logo ? `<span class="mev2-team-logo-wrap"><img class="mev2-team-logo" src="${esc(logo)}" alt="" onerror="this.parentElement.style.display='none'"></span>` : ""}
            </div>
            <div class="mev2-player">
              <strong>${esc(row.player_name || "—")}</strong>
              <span>${esc(matchupLabel(row) || "—")}</span>
            </div>
          </div>
        </td>
        <td><span class="mev2-prop-pill">${esc(propShort(row))}</span></td>
        <td><strong class="mev2-model-value">${pct(row.model_probability)}</strong></td>
        <td>${marketCell(row)}</td>
        <td>${edgeCell(row)}</td>
        <td><span class="mev2-odds-pill">${bestOddsCell(row)}</span></td>
        <td><span class="mev2-book-pill">${esc(bookLabel(row.best_book))}</span></td>
        <td><button class="mev2-chevron" type="button" data-mev2-row="${esc(row.row_key)}" aria-label="Open details">›</button></td>
      </tr>`;
  }

  function statusHtml() {
    const freshest = state.rows.map(r => r.refreshed_at).filter(Boolean).sort().at(-1);
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
      <p class="mev2-detail-matchup">${esc(matchupLabel(row))}</p>
      <div class="mev2-detail-grid">
        <div><span>Model Probability</span><strong>${pct(row.model_probability)}</strong></div>
        ${row.prop_type === "pitcher_strikeouts"
          ? `<div><span>Expected Ks</span><strong>${expectedKs(row.predicted_mean_k)}</strong></div>`
          : ""}
        <div><span>Market No-Vig</span><strong>${marketCell(row)}</strong></div>
        <div><span>Edge</span><strong>${edgeCell(row)}</strong></div>
        <div><span>Best Odds</span><strong>${bestOddsCell(row)}</strong></div>
        <div><span>Sportsbook</span><strong>${esc(bookLabel(row.best_book))}</strong></div>
        <div><span>Line</span><strong>${row.market_line == null ? "—" : esc(row.market_line)} ${esc(row.side || "")}</strong></div>
      </div>
      <div class="mev2-detail-status">
        <span>${esc(row.model_status || "—")}</span>
        <span>${esc(row.prediction_stage || "—")}</span>
        <span>${esc(row.quality_status || "—")}</span>
      </div>`;

    requestAnimationFrame(() => {
      drawer.classList.add("open");
      backdrop.classList.add("open");
    });
  }

  function closeMarketEdgeDetail() {
    el("mev2DetailDrawer")?.classList.remove("open");
    el("mev2DetailBackdrop")?.classList.remove("open");
  }

  function activateMarketView() {
    document.querySelectorAll(".nav-item").forEach(button => {
      button.classList.toggle("active", button.dataset.view === "market");
    });
    document.querySelectorAll(".view").forEach(view => view.classList.remove("active-view"));
    el("marketEdgeView")?.classList.add("active-view");
    setPageCopy();

    if (!state.rows.length && !state.loading) fetchLatestRows();
    else render();
  }

  function interceptMarketView() {
    const marketButton = document.querySelector('.nav-item[data-view="market"]');
    marketButton?.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      activateMarketView();
    }, true);

    el("refreshButton")?.addEventListener("click", event => {
      if (!el("marketEdgeView")?.classList.contains("active-view")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      fetchLatestRows();
    }, true);
  }

  window.runMarketEdgeV2SelfTest = function runMarketEdgeV2SelfTest() {
    const rows = filteredRows();
    const tests = {
      build: BUILD,
      latestDate: state.latestDate,
      totalRowsLoaded: state.rows.length,
      visibleRows: rows.length,
      max25: rows.length <= 25,
      gameScopeValid: state.scope !== "game" || rows.every(r => String(r.game_pk) === String(state.gamePk)),
      edgeRowsActionable: state.ranking !== "edge" || rows.every(r => edgeEligible(r)),
      probabilitiesValid: state.rows.every(r =>
        (num(r.model_probability) == null || (num(r.model_probability) >= 0 && num(r.model_probability) <= 1)) &&
        (num(r.market_probability_no_vig) == null || (num(r.market_probability_no_vig) >= 0 && num(r.market_probability_no_vig) <= 1))
      )
    };
    tests.pass = tests.max25 && tests.gameScopeValid && tests.edgeRowsActionable && tests.probabilitiesValid;
    console.table(tests);
    return tests;
  };

  loadSavedState();
  interceptMarketView();
  installHeaderGuard();
  activateMarketView();
  console.info(`Market Edge V2 loaded: ${BUILD}`);
})();
