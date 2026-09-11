/* MLB Hit Lab — Pitcher K Recent Workload Extension
   Adds L5 start context to SP K drawers on both K Board and Market Edge.
   Does not alter production model logic or scoring.
   Build: pitcher-k-workload-v1-20260911b
*/
(() => {
  const BUILD = "pitcher-k-workload-v1-20260911b";
  const LOG_TABLE = "mlb_pitcher_game_logs";
  const MARKET_CACHE = "mlb_market_edge_board_public_cache";
  const cache = new Map();
  let activePitcherId = null;

  const esc = (v) => String(v ?? "").replace(/[&<>'"]/g, (c) => (
    {"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]
  ));

  function easternDate() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  }

  function formatDate(dateValue) {
    if (!dateValue) return "—";
    const d = new Date(`${dateValue}T00:00:00Z`);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    }).format(d).toUpperCase();
  }

  function formatInnings(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    const whole = Math.floor(n + 1e-9);
    const frac = n - whole;
    if (frac >= 0.25 && frac < 0.5) return `${whole}.1`;
    if (frac >= 0.5 && frac < 0.85) return `${whole}.2`;
    return `${whole}.0`;
  }

  function avg(values) {
    const nums = values.map(Number).filter(Number.isFinite);
    if (!nums.length) return null;
    return nums.reduce((sum, v) => sum + v, 0) / nums.length;
  }

  function isWorkloadOutlier(start, seasonAvgPitches) {
    const pitches = Number(start?.pitches);
    if (!Number.isFinite(pitches)) return false;
    if (pitches <= 20) return true;
    if (
      Number.isFinite(seasonAvgPitches) &&
      seasonAvgPitches >= 60 &&
      pitches <= seasonAvgPitches * 0.5
    ) return true;
    return false;
  }

  function loadingMarkup() {
    return `
      <section class="pk-drawer-section pk-workload-section" data-pk-workload="true">
        <div class="pk-drawer-title">Recent Workload</div>
        <p class="pk-drawer-note">Loading last 5 starts…</p>
      </section>`;
  }

  function errorMarkup(message) {
    return `
      <section class="pk-drawer-section pk-workload-section" data-pk-workload="true">
        <div class="pk-drawer-title">Recent Workload</div>
        <p class="pk-drawer-note">Recent start data unavailable${message ? `: ${esc(message)}` : "."}</p>
      </section>`;
  }

  function workloadMarkup(allStarts) {
    const starts = (allStarts || []).slice(0, 5);
    if (!starts.length) {
      return `
        <section class="pk-drawer-section pk-workload-section" data-pk-workload="true">
          <div class="pk-drawer-title">Recent Workload</div>
          <p class="pk-drawer-note">No prior starts are available for this pitcher.</p>
        </section>`;
    }

    const seasonAvgPitches = avg((allStarts || []).map((s) => s.pitches));
    const l5AvgPitches = avg(starts.map((s) => s.pitches));

    const startCells = starts.map((s) => {
      const outlier = isWorkloadOutlier(s, seasonAvgPitches);
      return `
        <div class="pk-workload-start ${outlier ? "is-outlier" : ""}">
          <div class="pk-workload-date">${esc(formatDate(s.game_date))}</div>
          <div class="pk-workload-pitches">
            <strong>${s.pitches ?? "—"}</strong><span>P</span>
            ${outlier ? '<em class="pk-workload-alert" title="Recent workload outlier" aria-label="Recent workload outlier">!</em>' : ""}
          </div>
          <div class="pk-workload-secondary">${esc(formatInnings(s.innings_pitched))} IP</div>
          <div class="pk-workload-secondary">${s.strikeouts ?? "—"} K</div>
        </div>`;
    }).join("");

    const hasOutlier = starts.some((s) => isWorkloadOutlier(s, seasonAvgPitches));

    return `
      <section class="pk-drawer-section pk-workload-section" data-pk-workload="true">
        <div class="pk-workload-heading">
          <div>
            <div class="pk-drawer-title">Recent Workload</div>
            <p class="pk-drawer-note">Last 5 official starts</p>
          </div>
        </div>

        <div class="pk-workload-scroll" aria-label="Last five starts">
          <div class="pk-workload-grid">${startCells}</div>
        </div>

        <div class="pk-workload-averages">
          <div>
            <span>L5 Avg Pitches</span>
            <strong>${l5AvgPitches == null ? "—" : l5AvgPitches.toFixed(1)}</strong>
          </div>
          <div>
            <span>Season Avg</span>
            <strong>${seasonAvgPitches == null ? "—" : seasonAvgPitches.toFixed(1)}</strong>
          </div>
        </div>

        ${hasOutlier ? `
          <div class="pk-workload-warning" role="note">
            <div class="pk-workload-warning-icon">!</div>
            <div>
              <strong>Recent Workload Outlier</strong>
              <p>One or more recent starts were substantially shorter than this pitcher's norm. Rolling workload metrics may be temporarily distorted.</p>
              <small>Workload pattern only — the cause is not inferred.</small>
            </div>
          </div>` : ""}
      </section>`;
  }

  function findDistributionSection(drawerBody) {
    return [...drawerBody.querySelectorAll(":scope > .pk-drawer-section")].find((section) => {
      const title = section.querySelector(".pk-drawer-title")?.textContent?.trim();
      return title === "Full K Distribution";
    }) || null;
  }

  function placeSection(drawerId, markup) {
    const drawerBody = document.querySelector(`#${drawerId} .pk-drawer-body`);
    if (!drawerBody) return null;

    drawerBody.querySelector('[data-pk-workload="true"]')?.remove();

    const holder = document.createElement("div");
    holder.innerHTML = markup.trim();
    const section = holder.firstElementChild;
    const distribution = findDistributionSection(drawerBody);

    if (distribution) drawerBody.insertBefore(section, distribution);
    else drawerBody.appendChild(section);

    return section;
  }

  async function fetchStarts(pitcherId) {
    const key = String(pitcherId);
    if (cache.has(key)) return cache.get(key);

    const promise = (async () => {
      const { data, error } = await client
        .from(LOG_TABLE)
        .select("game_date,game_pk,innings_pitched,strikeouts,pitches,is_start")
        .eq("pitcher_id", pitcherId)
        .eq("is_start", true)
        .lt("game_date", easternDate())
        .order("game_date", { ascending: false })
        .limit(40);

      if (error) throw error;
      return data || [];
    })();

    cache.set(key, promise);

    try {
      return await promise;
    } catch (err) {
      cache.delete(key);
      throw err;
    }
  }

  async function renderIntoDrawer(drawerId, pitcherId) {
    if (!drawerId || !pitcherId) return;
    const drawer = document.getElementById(drawerId);
    if (!drawer) return;

    drawer.dataset.workloadPitcherId = String(pitcherId);
    placeSection(drawerId, loadingMarkup());

    try {
      const starts = await fetchStarts(pitcherId);
      if (String(drawer.dataset.workloadPitcherId || "") !== String(pitcherId)) return;
      placeSection(drawerId, workloadMarkup(starts));
    } catch (err) {
      console.error("Pitcher K recent workload load failed", err);
      if (String(drawer.dataset.workloadPitcherId || "") === String(pitcherId)) {
        placeSection(drawerId, errorMarkup(err?.message || ""));
      }
    }
  }

  function bindKBoardCapture() {
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest?.("[data-pitcher-id]");
      if (!trigger) return;
      activePitcherId = trigger.dataset.pitcherId || null;
    }, true);
  }

  function observeKBoardDrawer() {
    const drawer = document.getElementById("pitcherKDrawer");
    if (!drawer) {
      setTimeout(observeKBoardDrawer, 100);
      return;
    }

    const observer = new MutationObserver(() => {
      if (drawer.classList.contains("open") && activePitcherId) {
        queueMicrotask(() => renderIntoDrawer("pitcherKDrawer", activePitcherId));
      }
    });

    observer.observe(drawer, { attributes: true, attributeFilter: ["class"] });
  }

  async function resolveMarketEdgePitcher(rowKey) {
    if (!rowKey || typeof client === "undefined" || !client?.from) return null;

    const { data, error } = await client
      .from(MARKET_CACHE)
      .select("prop_type,player_id")
      .eq("row_key", rowKey)
      .maybeSingle();

    if (error) {
      console.error("Pitcher K workload Market Edge lookup failed", error);
      return null;
    }

    if (data?.prop_type !== "pitcher_strikeouts" || !data?.player_id) return null;
    return data.player_id;
  }

  async function renderMarketEdgeFromNode(node) {
    const rowKey = node?.dataset?.mev2Row;
    if (!rowKey) return;

    const pitcherId = await resolveMarketEdgePitcher(rowKey);
    if (!pitcherId) return;

    let attempts = 0;
    const attach = () => {
      const drawer = document.getElementById("marketUnifiedDrawer");
      const body = drawer?.querySelector(".pk-drawer-body");
      const title = drawer?.querySelector(".pk-kicker")?.textContent?.trim();

      if (drawer && body && title === "PITCHER DETAIL") {
        renderIntoDrawer("marketUnifiedDrawer", pitcherId);
        return;
      }

      attempts += 1;
      if (attempts < 20) setTimeout(attach, 25);
    };

    attach();
  }

  function bindMarketEdgeCapture() {
    document.addEventListener("click", (event) => {
      const node = event.target.closest?.("#marketEdgeContent [data-mev2-row]");
      if (!node) return;
      renderMarketEdgeFromNode(node);
    }, true);

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const node = event.target.closest?.("#marketEdgeContent [data-mev2-row]");
      if (!node) return;
      renderMarketEdgeFromNode(node);
    }, true);
  }

  window.PitcherKWorkload = Object.freeze({ renderIntoDrawer });

  function init() {
    bindKBoardCapture();
    observeKBoardDrawer();
    bindMarketEdgeCapture();
    console.info(`MLB Hit Lab ${BUILD} loaded`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
