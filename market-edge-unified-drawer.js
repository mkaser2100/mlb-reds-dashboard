/* =========================================================
   MLB Hit Lab — Market Edge Unified Drawer
   Build: market-edge-unified-drawer-20260908a

   Reuses the Pitcher K drawer visual system for every Market Edge prop.
   - Pitcher Ks: full K Board drawer including K distribution.
   - Batter props: same shell/metrics/sections with batter-specific content.
   ========================================================= */
(() => {
  "use strict";

  const BUILD = "market-edge-unified-drawer-20260908a";
  const MARKET_CACHE = "mlb_market_edge_board_public_cache";
  const K_CACHE = "mlb_pitcher_k_board_public_cache";

  const el = id => document.getElementById(id);

  const esc = v => String(v ?? "").replace(/[&<>'"]/g, c => (
    {"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]
  ));

  const pct = (v, digits = 1) => {
    if (v == null || v === "") return "—";
    const n = Number(v);
    return Number.isFinite(n) ? `${(n * 100).toFixed(digits)}%` : "—";
  };

  const num = (v, digits = 1) => {
    if (v == null || v === "") return "—";
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(digits) : "—";
  };

  const signedPct = (v, digits = 1) => {
    if (v == null || v === "") return "—";
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(digits)}%`;
  };

  const odds = v => {
    if (v == null || v === "") return "—";
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    const rounded = Math.round(n);
    return rounded > 0 ? `+${rounded}` : String(rounded);
  };

  const dateTime = value => {
    if (!value) return "—";
    try {
      return new Intl.DateTimeFormat("en-US", {
        month:"short", day:"numeric", hour:"numeric", minute:"2-digit",
        timeZoneName:"short"
      }).format(new Date(value));
    } catch (_) {
      return String(value);
    }
  };

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

  const abbr = name => TEAM_ABBR[name] ||
    String(name || "MLB").split(/\s+/).map(x => x[0]).join("").slice(0,3).toUpperCase();

  const matchup = row => {
    const team = abbr(row.team_name);
    const opp = abbr(row.opponent_team_name);
    if (!team || !opp) return row.game_label || "—";
    if (row.home_away === "home") return `${opp} @ ${team}`;
    return `${team} @ ${opp}`;
  };

  const bookLabel = book => ({
    draftkings:"DraftKings",
    fanduel:"FanDuel",
    betonlineag:"BetOnline",
    betonline:"BetOnline",
    bovada:"Bovada",
    betmgm:"BetMGM",
    caesars:"Caesars",
    betrivers:"BetRivers",
    espnbet:"ESPN BET",
    fanatics:"Fanatics",
    pointsbetus:"PointsBet"
  })[String(book || "").toLowerCase().replace(/[^a-z0-9]/g,"")] || book || "—";

  const propName = row => ({
    hit_1plus:"1+ Hit",
    total_bases_2plus:"2+ Total Bases",
    home_run_1plus:"Home Run",
    pitcher_strikeouts:"Pitcher Ks"
  })[row.prop_type] || row.prop_label || row.prop_type || "Prop";

  function ensureDrawer() {
    let backdrop = el("marketUnifiedBackdrop");
    let drawer = el("marketUnifiedDrawer");

    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "marketUnifiedBackdrop";
      backdrop.className = "pk-drawer-backdrop";
      document.body.appendChild(backdrop);
    }

    if (!drawer) {
      drawer = document.createElement("aside");
      drawer.id = "marketUnifiedDrawer";
      drawer.className = "pk-drawer";
      drawer.setAttribute("aria-hidden", "true");
      drawer.innerHTML = '<div id="marketUnifiedDrawerContent"></div>';
      document.body.appendChild(drawer);
    }

    backdrop.onclick = closeDrawer;
    return { backdrop, drawer, body: el("marketUnifiedDrawerContent") };
  }

  function closeDrawer() {
    el("marketUnifiedBackdrop")?.classList.remove("open");
    el("marketUnifiedDrawer")?.classList.remove("open");
    el("marketUnifiedDrawer")?.setAttribute("aria-hidden", "true");
  }

  function openRendered(html) {
    const { backdrop, drawer, body } = ensureDrawer();
    if (!body) return;

    body.innerHTML = html;
    el("marketUnifiedDrawerClose")?.addEventListener("click", closeDrawer);

    // Make sure the older Market Edge generic drawer cannot show underneath.
    el("mev2DetailDrawer")?.classList.remove("open");
    el("mev2DetailBackdrop")?.classList.remove("open");

    requestAnimationFrame(() => {
      backdrop.classList.add("open");
      drawer.classList.add("open");
      drawer.setAttribute("aria-hidden", "false");
    });
  }

  function stageLabel(row) {
    return row.prediction_stage === "final" ? "FINAL LINEUP" :
      row.prediction_stage ? String(row.prediction_stage).toUpperCase() : "MODEL";
  }

  function pmfBars(row) {
    const arr = Array.isArray(row.k_pmf) ? row.k_pmf : [];
    if (!arr.length) {
      return '<div class="pk-drawer-note">Distribution unavailable.</div>';
    }

    const max = Math.max(...arr.map(Number), 0.01);
    return `
      <div class="pk-pmf">
        ${arr.map((v,i) => `
          <div class="pk-pmf-col">
            <span style="height:${Math.max(3, Number(v) / max * 100)}%"></span>
            <small>${i === 12 ? "12+" : i}</small>
          </div>
        `).join("")}
      </div>`;
  }

  function renderPitcherDrawer(row) {
    const reasons = Array.isArray(row.quality_reasons) ? row.quality_reasons : [];
    const probability = row.model_probability == null ? null : Number(row.model_probability);

    return `
      <div class="pk-drawer-header">
        <div>
          <div class="pk-kicker">PITCHER DETAIL</div>
          <h2>${esc(row.pitcher_name)}</h2>
          <p>${esc(matchup(row))}</p>
        </div>
        <button id="marketUnifiedDrawerClose" class="pk-drawer-close" type="button">×</button>
      </div>

      <div class="pk-drawer-body">
        <section class="pk-drawer-section">
          <div class="pk-drawer-title">Today's Projection</div>

          <div class="pk-metrics">
            <div><span>Projected Ks</span><strong>${num(row.predicted_mean_k,2)}</strong></div>
            <div><span>Sportsbook Line</span><strong>${row.market_line == null ? "—" : num(row.market_line,1)}</strong></div>
            <div><span>Model</span><strong>${pct(probability,1)}</strong></div>
            <div><span>No-vig Market</span><strong>${pct(row.no_vig_market_probability,1)}</strong></div>
            <div><span>Edge</span><strong class="pk-positive">${signedPct(row.edge_probability,1)}</strong></div>
            <div><span>Best Price</span><strong>${row.best_book ? `${esc(bookLabel(row.best_book))} ${odds(row.best_american_odds)}` : "—"}</strong></div>
          </div>

          <div class="pk-stage-row">
            <span class="pk-stage ${esc(row.prediction_stage || "")}">${stageLabel(row)}</span>
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
          </section>` : ""}

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
  }

  function renderBatterDrawer(row) {
    const side = String(row.side || "over").toUpperCase();
    const modelStatus = row.model_status || "—";
    const quality = row.quality_status || "—";

    return `
      <div class="pk-drawer-header">
        <div>
          <div class="pk-kicker">PLAYER DETAIL</div>
          <h2>${esc(row.player_name || "—")}</h2>
          <p>${esc(matchup(row))}</p>
        </div>
        <button id="marketUnifiedDrawerClose" class="pk-drawer-close" type="button">×</button>
      </div>

      <div class="pk-drawer-body">
        <section class="pk-drawer-section">
          <div class="pk-drawer-title">Today's Projection</div>

          <div class="pk-metrics">
            <div><span>Prop</span><strong>${esc(propName(row))}</strong></div>
            <div><span>Sportsbook Line</span><strong>${row.market_line == null ? "—" : num(row.market_line,1)}</strong></div>
            <div><span>Model</span><strong>${pct(row.model_probability,1)}</strong></div>
            <div><span>No-vig Market</span><strong>${pct(row.market_probability_no_vig,1)}</strong></div>
            <div><span>Edge</span><strong class="pk-positive">${signedPct(row.edge_probability,1)}</strong></div>
            <div><span>Best Price</span><strong>${row.best_book ? `${esc(bookLabel(row.best_book))} ${odds(row.best_american_odds)}` : "—"}</strong></div>
          </div>

          <div class="pk-stage-row">
            <span class="pk-stage">${esc(modelStatus)}</span>
            <span>${esc(quality)}</span>
          </div>
        </section>

        <section class="pk-drawer-section">
          <div class="pk-drawer-title">Market Context</div>
          <div class="pk-drawer-list">
            <div><span>Side</span><strong>${esc(side)}</strong></div>
            <div><span>Sportsbook</span><strong>${esc(bookLabel(row.best_book))}</strong></div>
            <div><span>Market Source</span><strong>${esc(row.market_source || "—")}</strong></div>
            <div><span>Market Updated</span><strong>${esc(dateTime(row.market_updated_at))}</strong></div>
          </div>
        </section>

        <section class="pk-drawer-section">
          <div class="pk-drawer-title">Model Context</div>
          <div class="pk-drawer-list">
            <div><span>Model</span><strong>${esc(row.model_name || "—")}</strong></div>
            <div><span>Version</span><strong>${esc(row.model_version || "—")}</strong></div>
            <div><span>Team</span><strong>${esc(row.team_name || "—")}</strong></div>
            <div><span>Opponent</span><strong>${esc(row.opponent_team_name || "—")}</strong></div>
          </div>
        </section>
      </div>`;
  }

  async function openRow(rowKey) {
    if (typeof client === "undefined" || !client?.from) return;

    const market = await client
      .from(MARKET_CACHE)
      .select("*")
      .eq("row_key", rowKey)
      .maybeSingle();

    if (market.error || !market.data) {
      console.error("Unified Market Edge drawer: row lookup failed", market.error);
      return;
    }

    const row = market.data;

    if (row.prop_type === "pitcher_strikeouts") {
      const k = await client
        .from(K_CACHE)
        .select("*")
        .eq("game_date", row.game_date)
        .eq("game_pk", row.game_pk)
        .eq("pitcher_id", row.player_id)
        .maybeSingle();

      if (k.error || !k.data) {
        console.error("Unified Market Edge drawer: K row lookup failed", k.error);
        return;
      }

      openRendered(renderPitcherDrawer(k.data));
      return;
    }

    openRendered(renderBatterDrawer(row));
  }

  function install() {
    const root = el("marketEdgeContent");
    if (!root || root.dataset.unifiedDrawer === BUILD) return;
    root.dataset.unifiedDrawer = BUILD;

    root.addEventListener("click", async event => {
      const node = event.target.closest("[data-mev2-row]");
      if (!node || !root.contains(node)) return;

      const rowKey = node.dataset.mev2Row;
      if (!rowKey) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      await openRow(rowKey);
    }, true);

    root.addEventListener("keydown", async event => {
      if (event.key !== "Enter" && event.key !== " ") return;

      const node = event.target.closest("[data-mev2-row]");
      if (!node || !root.contains(node)) return;

      const rowKey = node.dataset.mev2Row;
      if (!rowKey) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      await openRow(rowKey);
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once:true });
  } else {
    install();
  }

  console.info(`Market Edge unified drawer loaded: ${BUILD}`);
})();
