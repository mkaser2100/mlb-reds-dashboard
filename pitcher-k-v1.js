/* MLB Hit Lab — Pitcher K Board Phase 9 */
(() => {
  const BUILD = "pitcher-k-phase9-nav-fix-20260907a";
  const CACHE_TABLE = "mlb_pitcher_k_board_public_cache";

  const TEAM_ABBR = {
    "Arizona Diamondbacks":"ARI","Athletics":"ATH","Atlanta Braves":"ATL","Baltimore Orioles":"BAL",
    "Boston Red Sox":"BOS","Chicago Cubs":"CHC","Chicago White Sox":"CWS","Cincinnati Reds":"CIN",
    "Cleveland Guardians":"CLE","Colorado Rockies":"COL","Detroit Tigers":"DET","Houston Astros":"HOU",
    "Kansas City Royals":"KC","Los Angeles Angels":"LAA","Los Angeles Dodgers":"LAD","Miami Marlins":"MIA",
    "Milwaukee Brewers":"MIL","Minnesota Twins":"MIN","New York Mets":"NYM","New York Yankees":"NYY",
    "Philadelphia Phillies":"PHI","Pittsburgh Pirates":"PIT","San Diego Padres":"SD","San Francisco Giants":"SF",
    "Seattle Mariners":"SEA","St. Louis Cardinals":"STL","Tampa Bay Rays":"TB","Texas Rangers":"TEX",
    "Toronto Blue Jays":"TOR","Washington Nationals":"WSH"
  };

  let rows = [];
  let activeMode = "edges";
  let selectedGame = "all";
  let loading = false;

  const $ = (id) => document.getElementById(id);
  const pct = (v, digits = 0) => v == null ? "—" : `${(Number(v) * 100).toFixed(digits)}%`;
  const num = (v, digits = 2) => v == null ? "—" : Number(v).toFixed(digits);
  const odds = (v) => v == null ? "—" : (Number(v) > 0 ? `+${v}` : String(v));
  const esc = (v) => String(v ?? "").replace(/[&<>'"]/g, (c) => (
    {"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]
  ));

  function easternDate() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  }

  function abbr(name) {
    return TEAM_ABBR[name] ||
      String(name || "MLB").split(/\s+/).map(x => x[0]).join("").slice(0,3).toUpperCase();
  }

  function teamBadge(name) {
    return `<span class="pk-team-badge" title="${esc(name)}">${esc(abbr(name))}</span>`;
  }

  function stageLabel(row) {
    return row.prediction_stage === "final" ? "FINAL LINEUP" : "PRELIMINARY";
  }

  function tierLabel(tier) {
    return ({
      large_gap:"LARGE GAP", medium_gap:"MEDIUM GAP",
      small_gap:"SMALL GAP", positive_gap:"POSITIVE GAP"
    })[tier] || "MODEL VIEW";
  }

  function matchup(row) {
    const team = abbr(row.team_name);
    const opp = abbr(row.opponent_team_name);
    return row.home_away === "away" ? `${team} @ ${opp}` : `${opp} @ ${team}`;
  }

  function probabilityForSide(row) {
    if (row.model_probability != null) return Number(row.model_probability);
    if (row.market_line == null) return null;
    const key = `p_over_${String(row.market_line).replace(".", "_")}`;
    const over = row[key] == null ? null : Number(row[key]);
    if (over == null) return null;
    return row.research_side === "under" ? 1 - over : over;
  }

  function injectShell() {
    if (!$("pitcherKNav")) {
      const nav = document.querySelector(".nav");
      const market = nav?.querySelector('[data-view="market"]');
      const btn = document.createElement("button");
      btn.id = "pitcherKNav";
      btn.className = "nav-item";
      btn.type = "button";
      btn.dataset.view = "pitcherK";
      btn.innerHTML =
        '<span class="nav-icon pk-nav-icon">K</span><span class="nav-label">K Board</span>';
      if (nav) nav.insertBefore(btn, market || null);
    }

    if (!$("pitcherKView")) {
      const main = document.querySelector("main.main");
      const section = document.createElement("section");
      section.id = "pitcherKView";
      section.className = "view";
      section.innerHTML =
        '<div id="pitcherKContent"><section class="performance-note">' +
        '<strong>Loading K Board...</strong>' +
        '<span>Starting pitcher strikeout projections, market lines and live results.</span>' +
        '</section></div>';
      main?.appendChild(section);
    }

    if (!$("pitcherKDrawer")) {
      const backdrop = document.createElement("div");
      backdrop.id = "pitcherKBackdrop";
      backdrop.className = "pk-drawer-backdrop";

      const drawer = document.createElement("aside");
      drawer.id = "pitcherKDrawer";
      drawer.className = "pk-drawer";
      drawer.setAttribute("aria-hidden", "true");
      drawer.innerHTML = '<div id="pitcherKDrawerContent"></div>';

      document.body.append(backdrop, drawer);
      backdrop.addEventListener("click", closeDrawer);
    }
  }

  async function loadData(force = false) {
    if (loading) return;
    if (rows.length && !force) return render();

    loading = true;
    const content = $("pitcherKContent");
    if (content) {
      content.innerHTML =
        '<section class="performance-note"><strong>Loading K Board...</strong>' +
        '<span>Reading the five-minute Supabase pitcher feed.</span></section>';
    }

    try {
      const { data, error } = await client
        .from(CACHE_TABLE)
        .select("*")
        .eq("game_date", easternDate())
        .order("game_time_utc", { ascending: true });

      if (error) throw error;
      rows = data || [];
      render();
    } catch (err) {
      console.error("Pitcher K board load failed", err);
      if (content) {
        content.innerHTML =
          `<section class="performance-note"><strong>Unable to load K Board</strong>` +
          `<span>${esc(err?.message || err)}</span></section>`;
      }
    } finally {
      loading = false;
    }
  }

  function filteredRows() {
    let out = rows.slice();
    if (selectedGame !== "all") {
      out = out.filter(r => String(r.game_pk) === selectedGame);
    }

    if (activeMode === "live") {
      return out
        .filter(r => r.is_game_live)
        .sort((a,b) => (b.live_strikeouts || 0) - (a.live_strikeouts || 0));
    }

    if (activeMode === "edges") {
      return out
        .filter(r => Number(r.edge_probability) > 0 && Number(r.expected_value) > 0)
        .sort((a,b) => Number(b.edge_probability || 0) - Number(a.edge_probability || 0));
    }

    return out.sort((a,b) => Number(b.predicted_mean_k || 0) - Number(a.predicted_mean_k || 0));
  }

  function renderControls() {
    const games = [...new Map(rows.map(r => [
      String(r.game_pk),
      {id:String(r.game_pk), label:matchup(r)}
    ])).values()];

    return `
      <section class="pk-control-card">
        <div class="pk-mode-toggle" role="tablist" aria-label="K Board mode">
          <button class="pk-mode ${activeMode === "edges" ? "active" : ""}" data-pk-mode="edges">Best Edges</button>
          <button class="pk-mode ${activeMode === "all" ? "active" : ""}" data-pk-mode="all">All Pitchers</button>
          <button class="pk-mode ${activeMode === "live" ? "active" : ""}" data-pk-mode="live">
            <span class="pk-live-dot"></span>Live
          </button>
        </div>

        <select id="pkGameSelect" class="pk-game-select" aria-label="Filter by game">
          <option value="all">All Games</option>
          ${games.map(g =>
            `<option value="${g.id}" ${selectedGame === g.id ? "selected" : ""}>${esc(g.label)}</option>`
          ).join("")}
        </select>

        <div class="pk-model-badge">
          <span class="pk-star">★</span>
          <span><small>ACTIVE MODEL</small><strong>Pitcher K V1</strong></span>
          <em>SHADOW</em>
        </div>
      </section>`;
  }

  function renderSummary() {
    const edgeRows = rows.filter(r =>
      Number(r.edge_probability) > 0 && Number(r.expected_value) > 0
    );
    const finals = rows.filter(r => r.prediction_stage === "final").length;
    const large = edgeRows.filter(r => r.research_tier === "large_gap").length;
    const live = rows.filter(r => r.is_game_live).length;

    return `
      <section class="pk-summary">
        <div>
          <div class="pk-kicker">DAILY SUMMARY</div>
          <h2>Today's K Outlook</h2>
          <p>Model projections paired with no-vig sportsbook probabilities and five-minute live actuals.</p>
        </div>
        <div class="pk-summary-pills">
          <span>${rows.length} starters scored</span>
          <span>${finals} final lineups</span>
          <span>${edgeRows.length} market edges</span>
          <span>${large} large gaps</span>
          ${live ? `<span class="live">${live} live</span>` : ""}
        </div>
      </section>`;
  }

  function renderLiveStrip(row) {
    const status = row.is_starter_active ? "STARTER ACTIVE" : "STARTER OUT";
    return `
      <div class="pk-live-strip">
        <b>LIVE · ${esc(row.inning_half || "")} ${row.current_inning || ""}</b>
        <span>${row.live_strikeouts ?? 0} K</span>
        <span>${num(row.live_innings_pitched,1)} IP</span>
        <span>${row.live_pitches ?? 0} pitches</span>
        <span>${row.live_batters_faced ?? 0} BF</span>
        <em>${status}</em>
      </div>`;
  }

  function renderEdgeCard(row) {
    const side = String(row.research_side || "").toUpperCase();
    const prob = probabilityForSide(row);
    const final = row.is_game_final;

    const resultText =
      final && row.market_line != null && row.live_strikeouts != null
        ? (
            row.research_side === "over"
              ? row.live_strikeouts > row.market_line
              : row.live_strikeouts < row.market_line
          ) ? "✓" : "×"
        : "";

    return `
      <button
        class="pk-edge-card tier-${esc(row.research_tier || "none")}"
        data-pitcher-id="${row.pitcher_id}"
        type="button"
      >
        <div class="pk-card-left">
          <span class="pk-k-chip">KS</span>
          <div class="pk-team-pair">
            ${teamBadge(row.team_name)}
            ${teamBadge(row.opponent_team_name)}
          </div>
          ${resultText ? `<span class="pk-result ${resultText === "✓" ? "win" : "loss"}">${resultText}</span>` : ""}
        </div>

        <div class="pk-card-main">
          <div class="pk-card-topline">
            <span class="pk-tier">${tierLabel(row.research_tier)}</span>
            <span class="pk-stage ${row.prediction_stage}">${stageLabel(row)}</span>
          </div>

          <h3>
            ${esc(row.pitcher_name)}
            ${row.market_line != null ? ` · ${side} ${num(row.market_line,1)} Ks` : ""}
          </h3>

          <div class="pk-matchup">${esc(matchup(row))}</div>

          <div class="pk-card-stats">
            <span>Proj <strong>${num(row.predicted_mean_k,2)} K</strong></span>
            ${row.no_vig_market_probability != null
              ? `<span>Market <strong>${pct(row.no_vig_market_probability,1)}</strong></span>`
              : ""}
            ${row.edge_probability != null
              ? `<span>Edge <strong class="pk-positive">+${pct(row.edge_probability,1)}</strong></span>`
              : ""}
            ${row.best_book
              ? `<span>${esc(bookLabel(row.best_book))} <strong>${odds(row.best_american_odds)}</strong></span>`
              : ""}
          </div>

          ${row.is_game_live ? renderLiveStrip(row) : ""}
        </div>

        <div class="pk-card-prob">
          <strong>${pct(prob,0)}</strong>
          <span>MODEL</span>
        </div>
      </button>`;
  }

  function renderAllTable(data) {
    if (!data.length) return emptyState();

    return `
      <section class="pk-table-card">
        <div class="pk-table-scroll">
          <table class="pk-table">
            <thead>
              <tr>
                <th>Pitcher</th><th>Matchup</th><th>Proj K</th><th>Line</th>
                <th>Side</th><th>Model</th><th>Market</th><th>Edge</th>
                <th>Odds</th><th>Stage</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(r => `
                <tr data-pitcher-id="${r.pitcher_id}">
                  <td><strong>${esc(r.pitcher_name)}</strong><small>${esc(r.quality_status || "")}</small></td>
                  <td>${esc(matchup(r))}</td>
                  <td>${num(r.predicted_mean_k,2)}</td>
                  <td>${r.market_line == null ? "—" : num(r.market_line,1)}</td>
                  <td>${r.research_side ? esc(r.research_side.toUpperCase()) : "—"}</td>
                  <td>${pct(probabilityForSide(r),1)}</td>
                  <td>${pct(r.no_vig_market_probability,1)}</td>
                  <td class="${Number(r.edge_probability) > 0 ? "pk-positive" : ""}">
                    ${r.edge_probability == null ? "—" : `${Number(r.edge_probability) >= 0 ? "+" : ""}${pct(r.edge_probability,1)}`}
                  </td>
                  <td>${odds(r.best_american_odds)}</td>
                  <td><span class="pk-stage ${r.prediction_stage}">${stageLabel(r)}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>`;
  }

  function renderLiveCards(data) {
    if (!data.length) {
      return `
        <section class="pk-empty">
          <span class="pk-live-dot"></span>
          <h3>No games are live right now</h3>
          <p>The board will populate automatically on the next five-minute refresh.</p>
        </section>`;
    }
    return `<section class="pk-card-list">${data.map(renderEdgeCard).join("")}</section>`;
  }

  function emptyState() {
    return `
      <section class="pk-empty">
        <h3>No pitchers match this view</h3>
        <p>Try All Games or switch to All Pitchers.</p>
      </section>`;
  }

  function render() {
    const content = $("pitcherKContent");
    if (!content) return;

    const data = filteredRows();
    let body = "";

    if (activeMode === "all") body = renderAllTable(data);
    else if (activeMode === "live") body = renderLiveCards(data);
    else body = data.length
      ? `<section class="pk-card-list">${data.map(renderEdgeCard).join("")}</section>`
      : emptyState();

    content.innerHTML = `
      ${renderControls()}
      ${renderSummary()}
      <div class="pk-section-heading">
        <div>
          <div class="pk-kicker">
            ${activeMode === "edges" ? "MODEL VS MARKET" : activeMode === "live" ? "IN-GAME TRACKER" : "STARTER BOARD"}
          </div>
          <h2>
            ${activeMode === "edges" ? "Best Model Edges" : activeMode === "live" ? "Live Strikeout Tracker" : "All Pitchers"}
          </h2>
        </div>
        <span>Updated every 5 minutes</span>
      </div>
      ${body}`;

    bindContentEvents();
  }

  function bindContentEvents() {
    document.querySelectorAll("[data-pk-mode]").forEach(btn =>
      btn.addEventListener("click", () => {
        activeMode = btn.dataset.pkMode;
        render();
      })
    );

    $("pkGameSelect")?.addEventListener("change", (e) => {
      selectedGame = e.target.value;
      render();
    });

    document.querySelectorAll("[data-pitcher-id]").forEach(el =>
      el.addEventListener("click", () => openDrawer(el.dataset.pitcherId))
    );
  }

  function bookLabel(book) {
    return ({
      draftkings:"DraftKings",
      fanduel:"FanDuel",
      betonlineag:"BetOnline",
      bovada:"Bovada"
    })[String(book || "").toLowerCase()] || book || "Book";
  }

  function pmfBars(row) {
    const arr = Array.isArray(row.k_pmf) ? row.k_pmf : [];
    if (!arr.length) return '<div class="pk-drawer-note">Distribution unavailable.</div>';

    const max = Math.max(...arr.map(Number), 0.01);
    return `
      <div class="pk-pmf">
        ${arr.map((v,i) => `
          <div class="pk-pmf-col">
            <span style="height:${Math.max(3, Number(v)/max*100)}%"></span>
            <small>${i === 12 ? "12+" : i}</small>
          </div>
        `).join("")}
      </div>`;
  }

  function openDrawer(pitcherId) {
    const row = rows.find(r => String(r.pitcher_id) === String(pitcherId));
    if (!row) return;

    const prob = probabilityForSide(row);
    const reasons = Array.isArray(row.quality_reasons) ? row.quality_reasons : [];

    $("pitcherKDrawerContent").innerHTML = `
      <div class="pk-drawer-header">
        <div>
          <div class="pk-kicker">PITCHER DETAIL</div>
          <h2>${esc(row.pitcher_name)}</h2>
          <p>${esc(matchup(row))}</p>
        </div>
        <button id="pkDrawerClose" class="pk-drawer-close">×</button>
      </div>

      <div class="pk-drawer-body">
        <section class="pk-drawer-section">
          <div class="pk-drawer-title">Today's Projection</div>

          <div class="pk-metrics">
            <div><span>Projected Ks</span><strong>${num(row.predicted_mean_k,2)}</strong></div>
            <div><span>Sportsbook Line</span><strong>${row.market_line == null ? "—" : num(row.market_line,1)}</strong></div>
            <div><span>Model</span><strong>${pct(prob,1)}</strong></div>
            <div><span>No-vig Market</span><strong>${pct(row.no_vig_market_probability,1)}</strong></div>
            <div><span>Edge</span><strong class="pk-positive">${row.edge_probability == null ? "—" : `+${pct(row.edge_probability,1)}`}</strong></div>
            <div><span>Best Price</span><strong>${row.best_book ? `${esc(bookLabel(row.best_book))} ${odds(row.best_american_odds)}` : "—"}</strong></div>
          </div>

          <div class="pk-stage-row">
            <span class="pk-stage ${row.prediction_stage}">${stageLabel(row)}</span>
            <span>${esc(row.quality_status || "")}</span>
          </div>
        </section>

        ${row.is_game_live || row.is_game_final ? `
          <section class="pk-drawer-section">
            <div class="pk-drawer-title">${row.is_game_final ? "Final Result" : "Live Actuals"}</div>
            <div class="pk-metrics">
              <div><span>Strikeouts</span><strong>${row.live_strikeouts ?? "—"}</strong></div>
              <div><span>Innings</span><strong>${num(row.live_innings_pitched,1)}</strong></div>
              <div><span>Pitches</span><strong>${row.live_pitches ?? "—"}</strong></div>
              <div><span>Batters Faced</span><strong>${row.live_batters_faced ?? "—"}</strong></div>
            </div>
            ${row.is_game_live ? renderLiveStrip(row) : ""}
          </section>
        ` : ""}

        <section class="pk-drawer-section">
          <div class="pk-drawer-title">Full K Distribution</div>
          <p class="pk-drawer-note">
            Probability of finishing with each strikeout total. The 12+ bucket includes the upper tail.
          </p>
          ${pmfBars(row)}
        </section>

        <section class="pk-drawer-section">
          <div class="pk-drawer-title">Model Context</div>
          <div class="pk-drawer-list">
            <div><span>Model</span><strong>${esc(row.model_version || "Pitcher K V1")}</strong></div>
            <div><span>Lineup Source</span><strong>${esc(row.lineup_source || "—")}</strong></div>
            <div><span>Opponent</span><strong>${esc(row.opponent_team_name || "—")}</strong></div>
            <div><span>Quality Notes</span><strong>${reasons.length ? esc(reasons.join(", ")) : "None"}</strong></div>
          </div>
        </section>
      </div>`;

    $("pkDrawerClose")?.addEventListener("click", closeDrawer);
    $("pitcherKBackdrop")?.classList.add("open");
    $("pitcherKDrawer")?.classList.add("open");
    $("pitcherKDrawer")?.setAttribute("aria-hidden", "false");
  }

  function closeDrawer() {
    $("pitcherKBackdrop")?.classList.remove("open");
    $("pitcherKDrawer")?.classList.remove("open");
    $("pitcherKDrawer")?.setAttribute("aria-hidden", "true");
  }

  function installViewOverride() {
    const baseShowView = showView;

    showView = function phase9ShowView(viewName) {
      if (viewName !== "pitcherK") {
        $("pitcherKView")?.classList.remove("active-view");
        closeDrawer();
        return baseShowView(viewName);
      }

      ["mlbView","marketEdgeView","performanceView"].forEach(id =>
        $(id)?.classList.remove("active-view")
      );

      $("pitcherKView")?.classList.add("active-view");

      document.querySelectorAll(".nav-item").forEach(button =>
        button.classList.toggle("active", button.dataset.view === "pitcherK")
      );

      if ($("pageEyebrow")) $("pageEyebrow").textContent = "All MLB · Pitcher Strikeout Intelligence";
      if ($("pageTitle")) $("pageTitle").textContent = "MLB K Board";
      if ($("pageSubtitle")) {
        $("pageSubtitle").textContent =
          "Starting pitcher strikeout projections, sportsbook lines, model edges and live results.";
      }

      loadData(false);
    };
  }

  function bindNavigation() {
    const navButton = $("pitcherKNav");
    if (!navButton || navButton.dataset.pkBound === "true") return;

    navButton.dataset.pkBound = "true";
    navButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showView("pitcherK");
    });
  }

  function bindRefresh() {
    $("refreshButton")?.addEventListener("click", () => {
      if ($("pitcherKView")?.classList.contains("active-view")) loadData(true);
    });

    setInterval(() => {
      if ($("pitcherKView")?.classList.contains("active-view")) loadData(true);
    }, 5 * 60 * 1000);
  }

  function init() {
    injectShell();
    installViewOverride();
    bindNavigation();
    bindRefresh();
    console.info(`MLB Hit Lab ${BUILD} loaded`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
