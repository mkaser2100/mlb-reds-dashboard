/* =========================================================
   MLB Prop Intelligence — Model Performance V2
   Build: model-performance-v2-20260909a
   Owns only #performanceView and reads the compact V2 cache.
   ========================================================= */
(() => {
  "use strict";

  const BUILD = "model-performance-v2-20260909a";
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
    lastLoadedAt: null
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

  function kpiCards() {
    const rows = Array.isArray(state.sections.kpis) ? state.sections.kpis : [];
    return MODEL_ORDER.map(key => {
      const r = rows.find(x => x.model_key === key) || {};
      const meta = MODEL_META[key];
      const active = state.model === key;
      const rate = num(r.hit_rate_pct);
      const reliableClass = (num(r.plays) || 0) >= 20 ? "reliable" : "early";
      return `<button type="button" class="mpv2-kpi-card ${active ? "active" : ""}" data-mpv2-model="${key}">
        <div class="mpv2-kpi-top"><span class="mpv2-model-icon">${meta.icon}</span><span class="mpv2-kpi-window">TOP 5 · 30D</span></div>
        <div class="mpv2-kpi-main"><strong>${rate == null ? "—" : `${rate.toFixed(1)}%`}</strong><span>HIT RATE</span></div>
        <div class="mpv2-kpi-name">${esc(meta.label)}</div>
        <div class="mpv2-kpi-footer"><span>${num(r.wins) || 0}–${num(r.losses) || 0} record</span><span class="mpv2-sample-pill ${reliableClass}">${num(r.plays) || 0} plays</span></div>
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
        return `<article class="mpv2-rolling-card"><div class="mpv2-rolling-title"><span class="mpv2-model-icon small">${m.icon}</span><strong>${esc(m.label)}</strong></div>
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
    let rows = Array.isArray(state.sections.daily) ? state.sections.daily : [];
    rows = modelRows(rows).filter(r => Number(r.cutoff) === 5).sort((a,b)=>String(a.game_date).localeCompare(String(b.game_date)));
    if (!rows.length) return "";
    const max = 100;
    const grouped = {};
    rows.forEach(r => { (grouped[r.model_key] ||= []).push(r); });
    return `<section class="mpv2-panel"><div class="mpv2-panel-heading"><div><span class="mpv2-kicker">TOP 5 · DAILY</span><h2>Performance Trend</h2><p>Daily Top-5 recommendation hit rate. New dates will extend this history automatically.</p></div></div>
      <div class="mpv2-trend-list">${Object.entries(grouped).map(([key,arr]) => `<div class="mpv2-trend-row"><div class="mpv2-trend-label"><span class="mpv2-model-icon small">${MODEL_META[key]?.icon||"•"}</span><strong>${esc(MODEL_META[key]?.label||key)}</strong></div><div class="mpv2-trend-days">${arr.map(r=>`<div class="mpv2-day-cell"><div class="mpv2-day-bar"><i style="height:${Math.max(2, Math.min(max, num(r.hit_rate_pct)||0))}%"></i></div><strong>${pct(r.hit_rate_pct)}</strong><span>${dateLabel(r.game_date)}</span></div>`).join("")}</div></div>`).join("")}</div></section>`;
  }

  function calibrationSection() {
    const rows = windowRows(state.sections.calibration || []).sort((a,b) => (a.model_key||"").localeCompare(b.model_key||"") || Number(a.bucket_order)-Number(b.bucket_order));
    if (!rows.length) return "";
    const grouped = {};
    rows.forEach(r => { (grouped[r.model_key] ||= []).push(r); });
    return `<section class="mpv2-panel"><div class="mpv2-panel-heading"><div><span class="mpv2-kicker">PROBABILITY CALIBRATION</span><h2>Predicted vs Actual</h2><p>When the model gives a recommendation a certain probability, how often does that recommendation actually win?</p></div><span class="mpv2-heading-pill">${esc(WINDOWS[state.window])}</span></div>
      <div class="mpv2-cal-groups">${Object.entries(grouped).map(([key,arr]) => `<article class="mpv2-cal-card"><div class="mpv2-cal-title"><span class="mpv2-model-icon small">${MODEL_META[key]?.icon||"•"}</span><strong>${esc(MODEL_META[key]?.label||key)}</strong></div><div class="mpv2-cal-table-wrap"><table class="mpv2-table compact"><thead><tr><th>Probability</th><th>Predicted</th><th>Actual</th><th>Error</th><th>Plays</th></tr></thead><tbody>${arr.map(r=>`<tr><td><strong>${esc(r.bucket_label)}</strong></td><td>${pct(r.avg_predicted_pct)}</td><td>${pct(r.actual_hit_rate_pct)}</td><td class="${Math.abs(num(r.calibration_error_pct)||0)<=5?'positive':'warning'}">${signedPct(r.calibration_error_pct)}</td><td>${num(r.plays)||0}</td></tr>`).join("")}</tbody></table></div></article>`).join("")}</div></section>`;
  }

  function bucketSection() {
    let rows = windowRows(state.sections.bucket_optimizer || []);
    rows = rows.sort((a,b)=>(a.model_key||"").localeCompare(b.model_key||"") || Number(a.hit_rate_rank)-Number(b.hit_rate_rank));
    if (!rows.length) return "";
    if (state.model === "overview") {
      const best = MODEL_ORDER.map(key => rows.filter(r=>r.model_key===key && r.sample_reliable).sort((a,b)=>Number(a.hit_rate_rank)-Number(b.hit_rate_rank))[0]).filter(Boolean);
      return `<section class="mpv2-panel"><div class="mpv2-panel-heading"><div><span class="mpv2-kicker">BUCKET OPTIMIZER</span><h2>Best Reliable Probability Bands</h2><p>Highest realized hit-rate bucket with at least 10 completed plays.</p></div></div><div class="mpv2-bucket-grid">${best.map(r=>`<article class="mpv2-bucket-card"><span class="mpv2-model-icon small">${MODEL_META[r.model_key]?.icon||"•"}</span><div><strong>${esc(r.display_name)}</strong><span>${esc(r.bucket_label)} probability</span></div><div class="mpv2-bucket-rate"><strong>${pct(r.actual_hit_rate_pct)}</strong><span>${num(r.plays)||0} plays</span></div><span class="mpv2-status ${statusClass(r.calibration_status)}">${esc(r.calibration_status)}</span></article>`).join("")}</div></section>`;
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
