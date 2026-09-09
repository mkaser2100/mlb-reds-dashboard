/* =========================================================
   MLB Prop Intelligence — Model Performance V2
   Build: model-performance-v2-20260909d
   Owns only #performanceView and reads the compact V2 cache.
   ========================================================= */
(() => {
  "use strict";

  const BUILD = "model-performance-v2-20260909d";
  const CACHE_TABLE = "mlb_model_performance_page_cache_v2";
  const PROJECT_URL = "https://squcmdsivnnxzblsfciu.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_pumFxQJ7pYyRC8lrjSvtZA_x63TVYtq";
  const STORAGE_KEY = "modelPerformanceV2State";

  const MODEL_META = {
    hit_v3: { label: "Hits (V3)", short: "Hits V3", icon: "H", prop: "1+ Hit" },
    total_bases_2plus: { label: "2+ Total Bases", short: "2+ TB", icon: "TB", prop: "2+ Total Bases" },
    home_run_1plus: { label: "Home Runs", short: "Home Runs", icon: "HR", prop: "Home Run" },
    pitcher_strikeouts: { label: "Pitcher Ks", short: "Pitcher Ks", icon: "K", prop: "Pitcher Strikeouts" }
  };
  const MODEL_ORDER = ["hit_v3", "total_bases_2plus", "home_run_1plus", "pitcher_strikeouts"];
  const TREND_COLORS = {
    hit_v3: "#38bdf8",
    total_bases_2plus: "#34d399",
    home_run_1plus: "#a78bfa",
    pitcher_strikeouts: "#fbbf24"
  };
  const WINDOWS = {
    last7: "Last 7 Days",
    last30: "Last 30 Days",
    season: "Season"
  };

  const state = {
    model: "overview",
    window: "last30",
    sections: {},
    loading: false,
    error: null,
    lastLoadedAt: null,
    trendCutoff: 5
  };

  const el = id => document.getElementById(id);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[c]);
  const num = v => v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);
  const pct = v => num(v) == null ? "—" : `${Number(v).toFixed(1)}%`;
  const probPct = v => num(v) == null ? "—" : `${(Number(v) * 100).toFixed(1)}%`;
  const signedPct = v => num(v) == null ? "—" : `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(1)}%`;
  const edgePct = v => num(v) == null ? "—" : `${Number(v) >= 0 ? "+" : ""}${(Number(v) * 100).toFixed(1)}%`;
  const odds = v => num(v) == null ? "—" : `${Number(v) > 0 ? "+" : ""}${Math.round(Number(v))}`;
  const dateLabel = v => !v ? "—" : new Intl.DateTimeFormat("en-US", {month:"short", day:"numeric"}).format(new Date(`${v}T12:00:00`));

  function bookLabel(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "—";
    const key = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    const labels = {draftkings:"DraftKings",fanduel:"FanDuel",betmgm:"BetMGM",betonlineag:"BetOnline",betonline:"BetOnline",bovada:"Bovada",caesars:"Caesars",betrivers:"BetRivers",espnbet:"ESPN BET",fanatics:"Fanatics"};
    return labels[key] || raw.replace(/\b\w/g, c => c.toUpperCase());
  }

  function loadSavedState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (saved.model === "overview" || MODEL_META[saved.model]) state.model = saved.model;
      if (WINDOWS[saved.window]) state.window = saved.window;
    } catch (_) {}
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({model: state.model, window: state.window})); } catch (_) {}
  }

  function setPageCopy() {
    if (!el("performanceView")?.classList.contains("active-view")) return;
    if (el("pageEyebrow")) el("pageEyebrow").textContent = "ALL MLB · MODEL PERFORMANCE";
    if (el("pageTitle")) el("pageTitle").textContent = "Model Performance";
    if (el("pageSubtitle")) el("pageSubtitle").textContent = "Track recommendation hit rate, rolling performance, and probability calibration across MLB prop models.";
  }

  function getClient() {
    if (!window.supabase?.createClient) throw new Error("Supabase client library is unavailable.");
    if (!window.__modelPerformanceV2Supabase) {
      window.__modelPerformanceV2Supabase = window.supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY, {auth:{persistSession:false, autoRefreshToken:false}});
    }
    return window.__modelPerformanceV2Supabase;
  }

  async function fetchCache() {
    state.loading = true;
    state.error = null;
    renderLoading();
    try {
      const client = getClient();
      const { data, error } = await client.from(CACHE_TABLE).select("section_key,payload,refreshed_at");
      if (error) throw error;
      const sections = {};
      let newest = null;
      (data || []).forEach(row => {
        sections[row.section_key] = row.payload;
        if (row.refreshed_at && (!newest || row.refreshed_at > newest)) newest = row.refreshed_at;
      });
      ["meta","kpis","rolling","daily","calibration","bucket_optimizer","recent_results"].forEach(k => {
        if (sections[k] == null) throw new Error(`Missing cache section: ${k}`);
      });
      state.sections = sections;
      state.lastLoadedAt = newest;
    } catch (err) {
      state.error = err?.message || String(err);
    } finally {
      state.loading = false;
      render();
    }
  }

  function modelRows(rows) {
    if (!Array.isArray(rows)) return [];
    return state.model === "overview" ? rows : rows.filter(r => r.model_key === state.model);
  }

  function windowRows(rows) {
    return modelRows(rows).filter(r => r.window_key === state.window);
  }

  function renderLoading() {
    const root = el("performanceContent");
    if (!root) return;
    root.innerHTML = `<div class="mpv2-shell"><section class="mpv2-loading-card"><div class="mpv2-spinner"></div><div><strong>Loading Model Performance...</strong><span>Reading the compact V2 performance cache.</span></div></section></div>`;
  }


  function modelIconSvg(key, compact = false) {
    const size = compact ? 20 : 38;
    const svgOpen = `<svg viewBox="0 0 48 48" width="${size}" height="${size}" style="display:block" aria-hidden="true">`;

    if (key === "hit_v3") {
      return `${svgOpen}<circle cx="24" cy="24" r="15" fill="#f8fafc"/><path d="M14.8 13.8c4.2 4.5 5.9 9.3 5.1 14.4M33.2 13.8c-4.2 4.5-5.9 9.3-5.1 14.4M15.2 34.1c3.9-3.3 5.5-7.3 4.8-12M32.8 34.1c-3.9-3.3-5.5-7.3-4.8-12" fill="none" stroke="#ef4444" stroke-width="2.1" stroke-linecap="round"/><path d="M18.2 18.2l-2.3 1.3M19.3 21.5l-2.4 1.1M29.8 18.2l2.3 1.3M28.7 21.5l2.4 1.1M18.5 29.5l-2.2-1.2M29.5 29.5l2.2-1.2" stroke="#ef4444" stroke-width="1.4" stroke-linecap="round"/></svg>`;
    }

    if (key === "total_bases_2plus") {
      return `${svgOpen}
        <g transform="translate(24 24) rotate(45) translate(-24 -24)">
          <rect x="13.5" y="13.5" width="21" height="21" rx="2.6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
          <rect x="16.8" y="16.8" width="14.4" height="14.4" rx="1.5" fill="#e5e7eb"/>
          <path d="M18 29.5h12" stroke="#cbd5e1" stroke-width="1.2" stroke-linecap="round"/>
        </g>
      </svg>`;
    }

    if (key === "home_run_1plus") {
      return `${svgOpen}
        <!-- Three recognizable aerial firework bursts -->
        <g fill="none" stroke-linecap="round" stroke-linejoin="round">
          <g transform="translate(24 20)">
            <path d="M0-10V-4M0 4v8M-10 0h6M4 0h6M-7-7l4 4M3 3l5 5M7-7l-4 4M-3 3l-5 5" stroke="#fb7185" stroke-width="2.2"/>
            <path d="M-4-9l2.2 4.8M4-9L1.8-4.2M-9-4l4.8 2.2M9-4L4.2-1.8" stroke="#fbbf24" stroke-width="1.7"/>
          </g>
          <g transform="translate(13 30) scale(.62)">
            <path d="M0-9V-3M0 3v7M-9 0h6M3 0h6M-6-6l4 4M2 2l5 5M6-6l-4 4M-2 2l-5 5" stroke="#38bdf8" stroke-width="2.5"/>
          </g>
          <g transform="translate(36 31) scale(.56)">
            <path d="M0-9V-3M0 3v7M-9 0h6M3 0h6M-6-6l4 4M2 2l5 5M6-6l-4 4M-2 2l-5 5" stroke="#a78bfa" stroke-width="2.7"/>
          </g>
        </g>
        <circle cx="24" cy="8" r="1.5" fill="#fbbf24"/>
        <circle cx="14" cy="18" r="1.2" fill="#38bdf8"/>
        <circle cx="34" cy="16" r="1.2" fill="#fb7185"/>
      </svg>`;
    }

    return `<span class="mpv2-k-letter" aria-hidden="true" style="${compact ? "font-size:14px" : ""}">K</span>`;
  }

  function weekOverWeekFor(modelKey) {
    const daily = Array.isArray(state.sections.daily) ? state.sections.daily : [];
    const rows = daily
      .filter(r => r.model_key === modelKey && Number(r.cutoff) === 5 && r.game_date)
      .sort((a,b) => String(a.game_date).localeCompare(String(b.game_date)));
    if (!rows.length) return { delta: null, currentRate: null, previousRate: null, currentPlays: 0, previousPlays: 0 };

    const latest = new Date(`${rows[rows.length - 1].game_date}T12:00:00Z`);
    const currentStart = new Date(latest); currentStart.setUTCDate(currentStart.getUTCDate() - 6);
    const previousEnd = new Date(currentStart); previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
    const previousStart = new Date(previousEnd); previousStart.setUTCDate(previousStart.getUTCDate() - 6);

    const inRange = (d, start, end) => {
      const dt = new Date(`${d}T12:00:00Z`);
      return dt >= start && dt <= end;
    };
    const aggregate = subset => {
      const wins = subset.reduce((s,r)=>s+(num(r.wins)||0),0);
      const losses = subset.reduce((s,r)=>s+(num(r.losses)||0),0);
      const plays = wins + losses;
      return { wins, losses, plays, rate: plays ? (wins / plays) * 100 : null };
    };

    const cur = aggregate(rows.filter(r => inRange(r.game_date, currentStart, latest)));
    const prev = aggregate(rows.filter(r => inRange(r.game_date, previousStart, previousEnd)));
    return {
      delta: cur.rate != null && prev.rate != null ? cur.rate - prev.rate : null,
      currentRate: cur.rate,
      previousRate: prev.rate,
      currentPlays: cur.plays,
      previousPlays: prev.plays
    };
  }

  function kpiCards() {
    const rows = Array.isArray(state.sections.kpis) ? state.sections.kpis : [];
    return MODEL_ORDER.map(key => {
      const r = rows.find(x => x.model_key === key) || {};
      const meta = MODEL_META[key];
      const active = state.model === key;
      const rate = num(r.hit_rate_pct);
      const wow = weekOverWeekFor(key);
      const delta = num(wow.delta);
      const deltaClass = delta == null ? "neutral" : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
      const arrow = delta == null ? "•" : delta > 0 ? "▲" : delta < 0 ? "▼" : "•";
      const deltaText = delta == null ? "— WoW" : `${arrow} ${delta > 0 ? "+" : ""}${delta.toFixed(1)} pts WoW`;
      const pushes = num(r.pushes) || 0;
      const wins = num(r.wins) || 0;
      const losses = num(r.losses) || 0;
      const plays = num(r.plays) || 0;
      const wowTitle = delta == null
        ? "Week-over-week change is not available until both 7-day windows contain completed plays."
        : `Current 7 days: ${wow.currentRate.toFixed(1)}% (${wow.currentPlays} plays) · Prior 7 days: ${wow.previousRate.toFixed(1)}% (${wow.previousPlays} plays)`;

      return `<button type="button" class="mpv2-kpi-card ${active ? "active" : ""}" data-mpv2-model="${key}">
        <div class="mpv2-kpi-icon-wrap">${modelIconSvg(key)}</div>
        <div class="mpv2-kpi-content">
          <div class="mpv2-kpi-label">${esc(meta.label).toUpperCase()} <span>· TOP 5</span></div>
          <div class="mpv2-kpi-rate-row">
            <strong>${rate == null ? "—" : `${rate.toFixed(1)}%`}</strong>
            <span class="mpv2-kpi-wow ${deltaClass}" title="${esc(wowTitle)}">${esc(deltaText)}</span>
          </div>
          <div class="mpv2-kpi-period">Last 30 Days</div>
          <div class="mpv2-kpi-bottom">
            <span>${wins}–${losses}${pushes ? `–${pushes}` : ""}</span>
            <span>${plays} plays</span>
          </div>
        </div>
      </button>`;
    }).join("");
  }

  function controls() {
    const tabs = [`<button type="button" class="mpv2-segment ${state.model === "overview" ? "active" : ""}" data-mpv2-model="overview">Overview</button>`]
      .concat(MODEL_ORDER.map(key => `<button type="button" class="mpv2-segment ${state.model === key ? "active" : ""}" data-mpv2-model="${key}">${esc(MODEL_META[key].short)}</button>`)).join("");
    const windows = Object.entries(WINDOWS).map(([key,label]) => `<button type="button" class="mpv2-segment ${state.window === key ? "active" : ""}" data-mpv2-window="${key}">${label}</button>`).join("");
    return `<section class="mpv2-control-card">
      <div class="mpv2-control-grid">
        <div><span class="mpv2-control-label">MODEL</span><div class="mpv2-segments mpv2-model-tabs">${tabs}</div></div>
        <div><span class="mpv2-control-label">WINDOW</span><div class="mpv2-segments">${windows}</div></div>
      </div>
    </section>`;
  }

  function overviewRolling() {
    const rows = windowRows(state.sections.rolling || []);
    const byModel = MODEL_ORDER.map(key => ({key, rows: rows.filter(r => r.model_key === key)}));
    return `<section class="mpv2-panel">
      <div class="mpv2-panel-heading"><div><span class="mpv2-kicker">MARKET EDGE PERFORMANCE</span><h2>Rolling Hit Rate</h2><p>Recommendation outcomes by Market Edge rank cutoff. VOID/DNP rows are excluded.</p></div><span class="mpv2-heading-pill">${esc(WINDOWS[state.window])}</span></div>
      <div class="mpv2-rolling-grid">${byModel.map(({key,rows}) => {
        const m=MODEL_META[key];
        const values=[1,5,10].map(c => rows.find(r=>Number(r.cutoff)===c) || {});
        return `<article class="mpv2-rolling-card"><div class="mpv2-rolling-title"><span class="mpv2-model-icon small">${modelIconSvg(key, true)}</span><strong>${esc(m.label)}</strong></div>
          <div class="mpv2-rank-metrics">${values.map((r,i)=>`<div><span>TOP ${[1,5,10][i]}</span><strong>${pct(r.hit_rate_pct)}</strong><small>${num(r.wins)||0}–${num(r.losses)||0} · ${num(r.plays)||0} plays</small></div>`).join("")}</div></article>`;
      }).join("")}</div>
    </section>`;
  }

  function selectedRolling() {
    const rows = windowRows(state.sections.rolling || []).filter(r => r.model_key === state.model);
    return `<section class="mpv2-panel"><div class="mpv2-panel-heading"><div><span class="mpv2-kicker">MARKET EDGE PERFORMANCE</span><h2>Top 1 / 5 / 10</h2><p>How the model's highest-ranked Market Edge recommendations performed.</p></div><span class="mpv2-heading-pill">${esc(WINDOWS[state.window])}</span></div>
      <div class="mpv2-rank-cards">${[1,5,10].map(c => {
        const r=rows.find(x=>Number(x.cutoff)===c)||{};
        return `<article class="mpv2-rank-card"><span>TOP ${c}</span><strong>${pct(r.hit_rate_pct)}</strong><div>${num(r.wins)||0} wins · ${num(r.losses)||0} losses${num(r.pushes)?` · ${num(r.pushes)} pushes`:""}</div><small>${num(r.plays)||0} completed plays across ${num(r.days)||0} days</small></article>`;
      }).join("")}</div></section>`;
  }

  function trendSection() {
    const allDaily = Array.isArray(state.sections.daily) ? state.sections.daily : [];
    const cutoff = Number(state.trendCutoff || 5);
    let rows = modelRows(allDaily).filter(r => Number(r.cutoff) === cutoff && num(r.hit_rate_pct) != null)
      .sort((a,b)=>String(a.game_date).localeCompare(String(b.game_date)));
    if (!rows.length) return "";

    const keys = state.model === "overview" ? MODEL_ORDER.filter(k => rows.some(r => r.model_key === k)) : [state.model];
    const dates = [...new Set(rows.map(r => r.game_date))].sort();
    const W = 1000, H = 330, L = 58, R = 22, T = 24, B = 42;
    const plotW = W-L-R, plotH = H-T-B;
    const x = i => dates.length <= 1 ? L + plotW/2 : L + (i/(dates.length-1))*plotW;
    const y = v => T + (1-(Math.max(0,Math.min(100,Number(v)))/100))*plotH;
    const ticks = [0,25,50,75,100];
    const grid = ticks.map(v => `<g><line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" class="mpv2-chart-grid"/><text x="${L-12}" y="${y(v)+4}" text-anchor="end" class="mpv2-chart-axis">${v}%</text></g>`).join("");
    const dateTicks = dates.map((d,i) => `<g><line x1="${x(i)}" y1="${T}" x2="${x(i)}" y2="${H-B}" class="mpv2-chart-vgrid"/><text x="${x(i)}" y="${H-13}" text-anchor="middle" class="mpv2-chart-axis">${esc(dateLabel(d))}</text></g>`).join("");
    const series = keys.map(key => {
      const byDate = new Map(rows.filter(r=>r.model_key===key).map(r=>[r.game_date,r]));
      const pts = dates.map((d,i) => byDate.has(d) ? {x:x(i), y:y(byDate.get(d).hit_rate_pct), r:byDate.get(d)} : null).filter(Boolean);
      if (!pts.length) return "";
      const color = TREND_COLORS[key] || "#38bdf8";
      const path = pts.length === 1 ? "" : `M ${pts.map(p=>`${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")}`;
      return `${path ? `<path d="${path}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="mpv2-chart-line"/>` : ""}${pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="5" fill="${color}" stroke="#071426" stroke-width="3"><title>${esc(MODEL_META[key]?.label||key)} · ${dateLabel(p.r.game_date)} · ${pct(p.r.hit_rate_pct)} (${num(p.r.wins)||0}-${num(p.r.losses)||0})</title></circle>`).join("")}`;
    }).join("");

    const legend = keys.map(key => {
      const modelRowsForCutoff = rows.filter(r=>r.model_key===key);
      const wins = modelRowsForCutoff.reduce((s,r)=>s+(num(r.wins)||0),0);
      const losses = modelRowsForCutoff.reduce((s,r)=>s+(num(r.losses)||0),0);
      const rate = wins+losses ? wins/(wins+losses)*100 : null;
      return `<div class="mpv2-trend-legend-row"><span class="mpv2-trend-swatch" style="--trend-color:${TREND_COLORS[key]}"></span><div><strong>${esc(MODEL_META[key]?.label||key)}</strong><span>${wins}–${losses} record</span></div><b>${pct(rate)}</b></div>`;
    }).join("");

    return `<section class="mpv2-panel mpv2-trend-panel"><div class="mpv2-trend-head"><div><span class="mpv2-kicker">MARKET EDGE · PERFORMANCE TREND</span><h2>Performance Trend</h2><p>Daily Top-${cutoff} recommendation hit rate. The chart extends automatically as new results are scored.</p></div><div class="mpv2-trend-cutoffs" aria-label="Trend rank cutoff">${[1,5,10].map(c=>`<button type="button" class="${cutoff===c?'active':''}" data-mpv2-trend-cutoff="${c}">Top ${c}</button>`).join('')}</div></div>
      <div class="mpv2-trend-chart-layout"><div class="mpv2-chart-wrap"><svg class="mpv2-line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Model performance trend chart">${grid}${dateTicks}<line x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}" class="mpv2-chart-base"/>${series}</svg></div><aside class="mpv2-trend-legend">${legend}</aside></div></section>`;
  }

  function calibrationSection() {
    const rows = windowRows(state.sections.calibration || []).sort((a,b) => (a.model_key||"").localeCompare(b.model_key||"") || Number(a.bucket_order)-Number(b.bucket_order));
    if (!rows.length) return "";
    const grouped = {};
    rows.forEach(r => { (grouped[r.model_key] ||= []).push(r); });
    return `<section class="mpv2-panel"><div class="mpv2-panel-heading"><div><span class="mpv2-kicker">PROBABILITY CALIBRATION</span><h2>Predicted vs Actual</h2><p>When the model gives a recommendation a certain probability, how often does that recommendation actually win?</p></div><span class="mpv2-heading-pill">${esc(WINDOWS[state.window])}</span></div>
      <div class="mpv2-cal-groups">${Object.entries(grouped).map(([key,arr]) => `<article class="mpv2-cal-card"><div class="mpv2-cal-title"><span class="mpv2-model-icon small">${modelIconSvg(key, true)}</span><strong>${esc(MODEL_META[key]?.label||key)}</strong></div><div class="mpv2-cal-table-wrap"><table class="mpv2-table compact"><thead><tr><th>Probability</th><th>Predicted</th><th>Actual</th><th>Error</th><th>Plays</th></tr></thead><tbody>${arr.map(r=>`<tr><td><strong>${esc(r.bucket_label)}</strong></td><td>${pct(r.avg_predicted_pct)}</td><td>${pct(r.actual_hit_rate_pct)}</td><td class="${Math.abs(num(r.calibration_error_pct)||0)<=5?'positive':'warning'}">${signedPct(r.calibration_error_pct)}</td><td>${num(r.plays)||0}</td></tr>`).join("")}</tbody></table></div></article>`).join("")}</div></section>`;
  }

  function bucketSection() {
    let rows = windowRows(state.sections.bucket_optimizer || []);
    rows = rows.sort((a,b)=>(a.model_key||"").localeCompare(b.model_key||"") || Number(a.hit_rate_rank)-Number(b.hit_rate_rank));
    if (!rows.length) return "";
    if (state.model === "overview") {
      const best = MODEL_ORDER.map(key => rows.filter(r=>r.model_key===key && r.sample_reliable).sort((a,b)=>Number(a.hit_rate_rank)-Number(b.hit_rate_rank))[0]).filter(Boolean);
      return `<section class="mpv2-panel"><div class="mpv2-panel-heading"><div><span class="mpv2-kicker">BUCKET OPTIMIZER</span><h2>Best Reliable Probability Bands</h2><p>Highest realized hit-rate bucket with at least 10 completed plays.</p></div></div><div class="mpv2-bucket-grid">${best.map(r=>`<article class="mpv2-bucket-card"><span class="mpv2-model-icon small">${modelIconSvg(r.model_key, true)}</span><div><strong>${esc(r.display_name)}</strong><span>${esc(r.bucket_label)} probability</span></div><div class="mpv2-bucket-rate"><strong>${pct(r.actual_hit_rate_pct)}</strong><span>${num(r.plays)||0} plays</span></div><span class="mpv2-status ${statusClass(r.calibration_status)}">${esc(r.calibration_status)}</span></article>`).join("")}</div></section>`;
    }
    return `<section class="mpv2-panel"><div class="mpv2-panel-heading"><div><span class="mpv2-kicker">BUCKET OPTIMIZER</span><h2>Probability Bucket Performance</h2><p>Ranks model probability bands by actual recommendation hit rate while flagging small samples.</p></div></div><div class="mpv2-table-wrap"><table class="mpv2-table"><thead><tr><th>Rank</th><th>Bucket</th><th>Actual Hit Rate</th><th>Avg Predicted</th><th>Calibration</th><th>Sample</th></tr></thead><tbody>${rows.map(r=>`<tr><td><span class="mpv2-rank-dot">#${r.hit_rate_rank}</span></td><td><strong>${esc(r.bucket_label)}</strong></td><td class="mpv2-rate-cell">${pct(r.actual_hit_rate_pct)}</td><td>${pct(r.avg_predicted_pct)}</td><td><span class="mpv2-status ${statusClass(r.calibration_status)}">${esc(r.calibration_status)}</span></td><td>${num(r.plays)||0}${r.sample_reliable?'':' <small class="mpv2-early">early</small>'}</td></tr>`).join("")}</tbody></table></div></section>`;
  }

  function statusClass(s) {
    const x=String(s||"").toLowerCase();
    if (x.includes("well")) return "good";
    if (x.includes("outperform")) return "good";
    if (x.includes("underperform")) return "warn";
    return "early";
  }

  function recentSection() {
    let rows = modelRows(state.sections.recent_results || []);
    rows = rows.slice().sort((a,b)=>String(b.game_date).localeCompare(String(a.game_date)) || Number(a.rank_edge)-Number(b.rank_edge)).slice(0, state.model === "overview" ? 28 : 20);
    if (!rows.length) return "";
    return `<section class="mpv2-panel"><div class="mpv2-panel-heading"><div><span class="mpv2-kicker">RECENT MODEL RESULTS</span><h2>Recommendation Outcomes</h2><p>Frozen Market Edge recommendations reconciled to final game results.</p></div></div><div class="mpv2-table-wrap"><table class="mpv2-table recent"><thead><tr><th>Date</th><th>Model</th><th>Rank</th><th>Player</th><th>Recommendation</th><th>Model</th><th>Edge</th><th>Actual</th><th>Result</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${dateLabel(r.game_date)}</td><td>${esc(MODEL_META[r.model_key]?.short||r.model_key)}</td><td><span class="mpv2-rank-dot">#${r.rank_edge ?? '—'}</span></td><td><strong>${esc(r.player_name)}</strong><small class="mpv2-book">${esc(bookLabel(r.book_name))} ${odds(r.american_odds)}</small></td><td>${esc(r.recommended_side)} ${r.market_line ?? '—'}</td><td>${probPct(r.prediction_probability)}</td><td>${edgePct(r.edge_probability)}</td><td>${r.actual_value ?? '—'}</td><td><span class="mpv2-result ${String(r.result||'').toLowerCase()}">${esc(r.result)}</span></td></tr>`).join("")}</tbody></table></div></section>`;
  }

  function footerMeta() {
    const meta=state.sections.meta||{};
    const refreshed=state.lastLoadedAt ? new Intl.DateTimeFormat("en-US", {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(state.lastLoadedAt)) : "—";
    return `<div class="mpv2-footer"><span>Ranking basis: Market Edge</span><span>VOID/DNP excluded</span><span>Cache refreshed ${esc(refreshed)}</span><span>${esc(meta.schema_version||BUILD)}</span></div>`;
  }

  function render() {
    const root=el("performanceContent");
    if (!root) return;
    setPageCopy();
    if (state.error) {
      root.innerHTML=`<div class="mpv2-shell"><section class="mpv2-error-card"><strong>Model Performance unavailable</strong><span>${esc(state.error)}</span><button type="button" id="mpv2Retry">Retry</button></section></div>`;
      el("mpv2Retry")?.addEventListener("click", fetchCache);
      return;
    }
    if (!state.sections.meta) { renderLoading(); return; }
    const body = state.model === "overview"
      ? `${overviewRolling()}${trendSection()}${calibrationSection()}${bucketSection()}${recentSection()}`
      : `${selectedRolling()}${trendSection()}${calibrationSection()}${bucketSection()}${recentSection()}`;
    root.innerHTML=`<div class="mpv2-shell" data-build="${BUILD}">${controls()}<section class="mpv2-kpi-section"><div class="mpv2-section-minihead"><div><span class="mpv2-kicker">LAST 30 DAYS · TOP 5</span><h2>Model Scorecard</h2></div><span>Market Edge recommendations</span></div><div class="mpv2-kpi-grid">${kpiCards()}</div></section>${body}${footerMeta()}</div>`;
    bindEvents(root);
  }

  function bindEvents(root) {
    root.querySelectorAll("[data-mpv2-model]").forEach(btn => btn.addEventListener("click", () => {
      state.model = btn.dataset.mpv2Model;
      saveState(); render();
    }));
    root.querySelectorAll("[data-mpv2-window]").forEach(btn => btn.addEventListener("click", () => {
      state.window = btn.dataset.mpv2Window;
      saveState(); render();
    }));
    root.querySelectorAll("[data-mpv2-trend-cutoff]").forEach(btn => btn.addEventListener("click", () => {
      state.trendCutoff = Number(btn.dataset.mpv2TrendCutoff) || 5;
      render();
    }));
  }

  function isPerformanceActive() { return el("performanceView")?.classList.contains("active-view"); }

  function activateSoon() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!isPerformanceActive()) return;
      setPageCopy();
      if (!state.sections.meta && !state.loading) fetchCache(); else render();
    }));
  }

  function installGuards() {
    document.querySelectorAll('[data-view="performance"]').forEach(btn => btn.addEventListener("click", activateSoon, true));
    el("refreshButton")?.addEventListener("click", () => { if (isPerformanceActive()) setTimeout(fetchCache, 0); }, true);
    const view=el("performanceView");
    if (view) new MutationObserver(() => { if (isPerformanceActive()) activateSoon(); }).observe(view, {attributes:true, attributeFilter:["class"]});
    const content=el("performanceContent");
    if (content) new MutationObserver(() => {
      if (!isPerformanceActive()) return;
      if (!content.querySelector(".mpv2-shell") && !state.loading) activateSoon();
    }).observe(content, {childList:true});
  }

  loadSavedState();
  installGuards();
  if (isPerformanceActive()) activateSoon();
  window.ModelPerformanceV2 = { build: BUILD, refresh: fetchCache, state };
})();
