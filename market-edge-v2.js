/* =========================================================
   MLB Hit Lab — Market Edge V2
   Build: phase9c-market-edge-live-20260908b
   Owns only #marketEdgeView.
   Live scope reuses one shared card renderer across all props.
   ========================================================= */
(() => {
  "use strict";

  const BUILD = "phase9c-market-edge-live-20260908b";
  const CACHE_TABLE = "mlb_market_edge_board_public_cache";
  const BATTER_LIVE_TABLE = "mlb_market_edge_batter_live_status";
  const PITCHER_K_TABLE = "mlb_pitcher_k_board_public_cache";
  const STORAGE_KEY = "marketEdgeV2State";
  const ENABLE_MARKET_EDGE_LIVE = true;
  const LIVE_BROWSER_REFRESH_MS = 60 * 1000;

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
    batterLive: new Map(),
    pitcherLive: new Map(),
    loading: false,
    liveLoading: false,
    error: null,
    liveError: null,
    liveFetchedAt: null
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
    if (row.game_label) return String(row.game_label);
    const team = teamAbbr(row.team_name);
    const opp = teamAbbr(row.opponent_team_name);
    return team && opp ? `${team} vs ${opp}` : "";
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
      const allowedScopes = ENABLE_MARKET_EDGE_LIVE ? ["top25", "game", "live"] : ["top25", "game"];
      if (allowedScopes.includes(saved.scope)) state.scope = saved.scope;
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
        state.scope === "live"
          ? "Track today's model opportunities as MLB games unfold."
          : "Compare model probabilities with sportsbook markets across MLB player props.";
    }
  }

  function installHeaderGuard() {
    const enforce = () => {
      if (!el("marketEdgeView")?.classList.contains("active-view")) return;

      const expectedSubtitle = state.scope === "live"
        ? "Track today's model opportunities as MLB games unfold."
        : "Compare model probabilities with sportsbook markets across MLB player props.";

      const expected = {
        pageEyebrow: "ALL MLB · PROP INTELLIGENCE",
        pageTitle: "Market Edge",
        pageSubtitle: expectedSubtitle
      };

      const mismatch = Object.entries(expected).some(([id, value]) => {
        const node = el(id);
        return node && node.textContent !== value;
      });

      if (mismatch) setPageCopy();
    };

    const observer = new MutationObserver(enforce);

    ["pageEyebrow", "pageTitle", "pageSubtitle"].forEach(id => {
      const node = el(id);
      if (node) observer.observe(node, {
        childList: true,
        characterData: true,
        subtree: true
      });
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

  function liveKey(gamePk, playerId) {
    return `${gamePk}:${playerId}`;
  }

  function liveFor(row) {
    const key = liveKey(row.game_pk, row.player_id);
    return row.prop_type === "pitcher_strikeouts"
      ? state.pitcherLive.get(key) || null
      : state.batterLive.get(key) || null;
  }

  function isLiveRow(row) {
    return liveFor(row)?.is_game_live === true;
  }

  async function fetchLiveData(renderAfter = false) {
    if (!ENABLE_MARKET_EDGE_LIVE || !state.latestDate || state.liveLoading) return;
    state.liveLoading = true;
    state.liveError = null;

    try {
      const [batterResult, pitcherResult] = await Promise.all([
        client
          .from(BATTER_LIVE_TABLE)
          .select([
            "game_pk","player_id","game_date","player_name","team_id","opponent_team_id",
            "game_status","abstract_game_state","detailed_game_state",
            "current_inning","inning_half","is_game_live","is_game_final",
            "plate_appearances","at_bats","hits","doubles","triples","home_runs",
            "total_bases","walks","strikeouts","runs","rbi","fetched_at"
          ].join(","))
          .eq("game_date", state.latestDate),
        client
          .from(PITCHER_K_TABLE)
          .select([
            "game_pk","pitcher_id","game_date","pitcher_name","team_id","opponent_team_id",
            "game_status","abstract_game_state","detailed_game_state",
            "current_inning","inning_half","is_game_live","is_game_final","is_starter_active",
            "live_strikeouts","live_innings_pitched","live_pitches","live_batters_faced",
            "live_hits_allowed","live_walks","live_earned_runs","live_fetched_at"
          ].join(","))
          .eq("game_date", state.latestDate)
      ]);

      if (batterResult.error) throw batterResult.error;
      if (pitcherResult.error) throw pitcherResult.error;

      state.batterLive = new Map(
        (batterResult.data || []).map(row => [liveKey(row.game_pk, row.player_id), row])
      );
      state.pitcherLive = new Map(
        (pitcherResult.data || []).map(row => [liveKey(row.game_pk, row.pitcher_id), row])
      );
      state.liveFetchedAt = new Date().toISOString();
    } catch (err) {
      console.error("Market Edge live load failed", err);
      state.liveError = err?.message || String(err);
    } finally {
      state.liveLoading = false;
      if (renderAfter && state.scope === "live") render();
    }
  }

  async function fetchLatestRows() {
    if (state.loading) return;
    state.loading = true;
    state.error = null;
    render();

    try {
      if (typeof client === "undefined" || !client?.from) throw new Error("Supabase client is not available.");

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
      await fetchLiveData(false);

      console.info(`Market Edge cache loaded: ${state.rows.length} rows for ${latestDate}`);
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
    } else if (state.scope === "live") {
      rows = rows.filter(isLiveRow);
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
      { label: "Select Game", action: "scope", value: "game", active: state.scope === "game" },
      ...(ENABLE_MARKET_EDGE_LIVE
        ? [{ label: "Live", action: "scope", value: "live", active: state.scope === "live" }]
        : [])
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
          <div class="mev2-summary-metric"><strong>${metric}</strong><span>${metricLabel}</span></div>
        </div>
        <div class="mev2-summary-copy"><strong>${esc(row.player_name || "—")}</strong></div>
        <div class="mev2-card-footer">
          <span class="mev2-card-matchup">${esc(matchupLabel(row) || "—")}</span>
          <span class="mev2-signal-badge"><i>${signalIcon(row)}</i>${esc(signalLabel(row))}</span>
        </div>
      </button>`;
  }

  function marketCell(row) {
    if (row.market_available !== true || num(row.market_probability_no_vig) == null) {
      return `<span class="mev2-na">—</span>`;
    }
    return pct(row.market_probability_no_vig);
  }

  function edgeCell(row) {
    if (row.market_available !== true || num(row.market_probability_no_vig) == null) return `<span class="mev2-na">—</span>`;
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
            <div class="mev2-player"><strong>${esc(row.player_name || "—")}</strong><span>${esc(matchupLabel(row) || "—")}</span></div>
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

  function liveStatusText(row, live) {
    const key = TYPE_TO_KEY[row.prop_type];
    if (key === "pitcher_k") {
      if (live.is_starter_active === true) return "STARTER ACTIVE";
      if (live.is_starter_active === false) return "STARTER OUT";
      return "LIVE";
    }
    if (key === "hit") return (num(live.hits) || 0) >= 1 ? "HIT RECORDED" : "IN PROGRESS";
    if (key === "tb") return (num(live.total_bases) || 0) >= 2 ? "2+ TB HIT" : `${Math.max(0, 2 - (num(live.total_bases) || 0))} TB TO GO`;
    if (key === "hr") return (num(live.home_runs) || 0) >= 1 ? "HOME RUN HIT" : "IN PROGRESS";
    return "LIVE";
  }

  function liveMetrics(row, live) {
    const key = TYPE_TO_KEY[row.prop_type];
    if (key === "pitcher_k") {
      return [
        `${num(live.live_strikeouts) ?? 0} K`,
        `${num(live.live_innings_pitched) == null ? "—" : Number(live.live_innings_pitched).toFixed(1)} IP`,
        `${num(live.live_pitches) ?? 0} pitches`,
        `${num(live.live_batters_faced) ?? 0} BF`
      ];
    }
    const hits = num(live.hits) ?? 0;
    const ab = num(live.at_bats) ?? 0;
    const pa = num(live.plate_appearances) ?? 0;
    if (key === "hit") return [`${hits} H`, `${hits}-for-${ab}`, `${pa} PA`];
    if (key === "tb") return [`${num(live.total_bases) ?? 0} TB`, `${hits}-for-${ab}`, `${pa} PA`];
    if (key === "hr") return [`${num(live.home_runs) ?? 0} HR`, `${hits}-for-${ab}`, `${pa} PA`];
    return [`${pa} PA`];
  }

  function liveStrip(row, live) {
    const inning = live.current_inning ? `${esc(live.inning_half || "")} ${esc(live.current_inning)}`.trim() : "In Progress";
    const status = liveStatusText(row, live);
    const positive = /RECORDED|2\+ TB HIT|HOME RUN HIT/.test(status);
    return `
      <div class="mev2-live-strip ${positive ? "success" : ""}">
        <b><span class="mev2-live-dot"></span>LIVE · ${inning}</b>
        ${liveMetrics(row, live).map(m => `<span>${esc(m)}</span>`).join("")}
        <em>${esc(status)}</em>
      </div>`;
  }

  function liveSummaryHtml(rows) {
    const games = new Set(rows.map(r => String(r.game_pk))).size;
    const successCount = rows.filter(row => {
      const live = liveFor(row);
      if (!live) return false;
      return /RECORDED|2\+ TB HIT|HOME RUN HIT/.test(liveStatusText(row, live));
    }).length;

    return `
      <section class="mev2-live-summary">
        <div>
          <div class="mev2-kicker">LIVE MARKET EDGE</div>
          <h2>Today's Live Opportunities</h2>
          <p>Pregame model conviction paired with current MLB game progress. Live actuals refresh every five minutes.</p>
        </div>
        <div class="mev2-live-summary-pills">
          <span class="live"><i class="mev2-live-dot"></i>${games} live ${games === 1 ? "game" : "games"}</span>
          <span>${rows.length} tracked ${rows.length === 1 ? "prop" : "props"}</span>
          <span>${successCount} already hit</span>
          <span>${dateLabel(state.latestDate)}</span>
        </div>
      </section>`;
  }

  function liveCard(row, index) {
    const live = liveFor(row);
    const logo = teamLogoUrl(row.team_id);
    const metric = state.ranking === "edge" ? pct(row.edge_probability, true) : pct(row.model_probability);
    const metricLabel = state.ranking === "edge" ? "EDGE" : "MODEL";
    const edge = num(row.edge_probability);
    const tier = edge >= .10 ? "large" : edge >= .05 ? "medium" : edge >= .03 ? "small" : "base";
    const sideLine = row.prop_type === "pitcher_strikeouts" && row.market_line != null
      ? `${String(row.side || "").toUpperCase()} ${row.market_line} Ks`
      : propShort(row);

    return `
      <button class="mev2-live-card tier-${tier}" type="button" data-mev2-row="${esc(row.row_key)}">
        <div class="mev2-live-card-left">
          <span class="mev2-live-prop-chip">${esc(TYPE_TO_KEY[row.prop_type] === "pitcher_k" ? "KS" : propShort(row))}</span>
          ${logo ? `<span class="mev2-live-logo"><img src="${esc(logo)}" alt="" onerror="this.parentElement.style.display='none'"></span>` : ""}
          <span class="mev2-live-rank">#${index + 1}</span>
        </div>

        <div class="mev2-live-card-main">
          <div class="mev2-live-card-topline">
            <span class="mev2-live-tier">${edge >= .10 ? "LARGE EDGE" : edge >= .05 ? "MEDIUM EDGE" : edge >= .03 ? "SMALL EDGE" : "MODEL VIEW"}</span>
            <span class="mev2-live-stage">${esc(String(row.prediction_stage || "").toUpperCase() || "MODEL")}</span>
          </div>
          <h3>${esc(row.player_name || "—")} <span>· ${esc(sideLine)}</span></h3>
          <div class="mev2-live-matchup">${esc(matchupLabel(row) || "—")}</div>
          <div class="mev2-live-pregame-stats">
            <span>Model <strong>${pct(row.model_probability)}</strong></span>
            ${row.market_available === true ? `<span>Market <strong>${pct(row.market_probability_no_vig)}</strong></span>` : ""}
            ${edge != null ? `<span>Edge <strong class="positive">${pct(edge, true)}</strong></span>` : ""}
            ${row.best_book ? `<span>${esc(bookLabel(row.best_book))} <strong>${bestOddsCell(row)}</strong></span>` : ""}
          </div>
          ${live ? liveStrip(row, live) : ""}
        </div>

        <div class="mev2-live-card-metric">
          <strong>${metric}</strong>
          <span>${metricLabel}</span>
        </div>
      </button>`;
  }

  function liveBoardHtml(rows) {
    if (state.liveLoading && !state.liveFetchedAt) {
      return `
        <section class="mev2-live-empty">
          <span class="mev2-live-dot"></span>
          <h3>Loading live games...</h3>
          <p>Reading the five-minute MLB live feeds.</p>
        </section>`;
    }

    if (!rows.length) {
      return `
        <section class="mev2-live-empty">
          <span class="mev2-live-dot"></span>
          <h3>No qualifying Market Edge games are live right now</h3>
          <p>The board will populate automatically as today's tracked games begin.</p>
          ${state.liveError ? `<small>${esc(state.liveError)}</small>` : ""}
        </section>`;
    }

    return `
      <section class="mev2-live-board">
        <div class="mev2-board-heading">
          <div>
            <div class="mev2-kicker">LIVE TRACKING</div>
            <h2>${esc(PROP_META[state.prop]?.label || "All Props")}</h2>
            <p>${state.ranking === "edge" ? "Ranked by pregame Market Edge." : "Ranked by pregame model probability."}</p>
          </div>
          <div class="mev2-board-meta">
            <span class="mev2-opportunity-count">${rows.length} live</span>
            <span>${state.liveFetchedAt ? `Checked ${esc(timeLabel(state.liveFetchedAt))}` : ""}</span>
          </div>
        </div>
        <div class="mev2-live-card-list">${rows.map(liveCard).join("")}</div>
      </section>`;
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
        <span>${state.scope === "live" && state.liveFetchedAt
          ? `Live feed checked ${esc(timeLabel(state.liveFetchedAt))}`
          : `Cache updated ${freshest ? esc(timeLabel(freshest)) : "—"}`}</span>
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
    const isLive = ENABLE_MARKET_EDGE_LIVE && state.scope === "live";

    root.innerHTML = `
      <div class="mev2-shell ${isLive ? "mev2-live-mode" : ""}" data-build="${BUILD}">
        ${controlsHtml()}
        ${isLive ? liveSummaryHtml(rows) : summaryHtml(rows)}
        ${isLive ? liveBoardHtml(rows) : tableHtml(rows)}
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
        if (action === "ranking" && ["edge", "model"].includes(value)) state.ranking = value;
        if (action === "scope") {
          const allowedScopes = ENABLE_MARKET_EDGE_LIVE ? ["top25", "game", "live"] : ["top25", "game"];
          if (allowedScopes.includes(value)) {
            state.scope = value;
            normalizeSelectedGame();
          }
        }
        if (action === "reload") {
          fetchLatestRows();
          return;
        }

        saveState();
        render();
        if (state.scope === "live") fetchLiveData(true);
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
    // The unified Market Edge drawer installs a capture-phase row handler after
    // this file loads. Keep this fallback for environments where that module is absent.
    const unified = el("marketUnifiedDrawer");
    if (unified) return;

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
        <div><span>Market No-Vig</span><strong>${marketCell(row)}</strong></div>
        <div><span>Edge</span><strong>${edgeCell(row)}</strong></div>
        <div><span>Best Odds</span><strong>${bestOddsCell(row)}</strong></div>
        <div><span>Sportsbook</span><strong>${esc(bookLabel(row.best_book))}</strong></div>
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
    else {
      render();
      if (state.scope === "live") fetchLiveData(true);
    }
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
      liveScopeValid: state.scope !== "live" || rows.every(isLiveRow),
      edgeRowsActionable: state.ranking !== "edge" || rows.every(r => edgeEligible(r)),
      probabilitiesValid: state.rows.every(r =>
        (num(r.model_probability) == null || (num(r.model_probability) >= 0 && num(r.model_probability) <= 1)) &&
        (num(r.market_probability_no_vig) == null || (num(r.market_probability_no_vig) >= 0 && num(r.market_probability_no_vig) <= 1))
      ),
      liveMapsLoaded: state.batterLive instanceof Map && state.pitcherLive instanceof Map
    };
    tests.pass = tests.max25 && tests.gameScopeValid && tests.liveScopeValid &&
      tests.edgeRowsActionable && tests.probabilitiesValid && tests.liveMapsLoaded;
    console.table(tests);
    return tests;
  };

  window.marketEdgeLiveFeatureEnabled = ENABLE_MARKET_EDGE_LIVE;

  setInterval(() => {
    if (!ENABLE_MARKET_EDGE_LIVE) return;
    if (state.scope !== "live") return;
    if (!el("marketEdgeView")?.classList.contains("active-view")) return;
    fetchLiveData(true);
  }, LIVE_BROWSER_REFRESH_MS);

  loadSavedState();
  interceptMarketView();
  installHeaderGuard();
  activateMarketView();
  console.info(`Market Edge V2 loaded: ${BUILD}`);
})();
