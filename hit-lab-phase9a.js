/* MLB Hit Lab — Phase 9A renderer refinement V2
   Directly normalizes the rendered DOM using actual component markers.
   No model/data logic changes. */
(() => {
  const BUILD = "phase9a-renderer-refinement-v2-20260907g";
  const ROOT_ID = "mlbHitBoardContent";

  const targetFromTitle = (title) => {
    const t = String(title || "").toLowerCase();
    if (t.includes("home run")) return "HR";
    if (t.includes("total base") || t.includes("2+ tb")) return "TB";
    return "HIT";
  };

  function enhancePowerBoard(board, target) {
    const rows = [...board.querySelectorAll("tr.mlb-clickable-row")];
    if (!rows.length) return;

    board.dataset.p9aTarget = target;

    rows.forEach((row) => {
      row.dataset.p9aTarget = target;
      const cells = [...row.children];
      cells.forEach((c) => {
        c.classList.remove(
          "p9a-rank-cell","p9a-player-cell","p9a-team-cell",
          "p9a-prob-cell","p9a-signal-cell","p9a-hidden-cell"
        );
      });

      if (cells[0]) cells[0].classList.add("p9a-rank-cell");
      if (cells[1]) cells[1].classList.add("p9a-player-cell");
      if (cells[2]) cells[2].classList.add("p9a-team-cell");
      if (cells[3]) cells[3].classList.add("p9a-prob-cell");

      const signalCell =
        cells.find((cell) =>
          cell.classList.contains("why-cell") ||
          cell.querySelector(".primary-why-wrap,.why-pill,.reason-count")
        ) || cells[5] || null;

      if (signalCell) signalCell.classList.add("p9a-signal-cell");

      cells.forEach((cell, idx) => {
        const keep =
          idx <= 3 ||
          cell === signalCell;
        if (!keep) {
          cell.classList.add("p9a-hidden-cell");
          cell.hidden = true;
          cell.setAttribute("aria-hidden", "true");
        } else {
          cell.hidden = false;
          cell.removeAttribute("aria-hidden");
        }
      });
    });
  }

  function enhanceHitBoard(board) {
    board.dataset.p9aTarget = "HIT";
    [...board.querySelectorAll("tr.mlb-clickable-row")].forEach((row) => {
      row.dataset.p9aTarget = "HIT";
    });
  }

  function enhanceBoards(root) {
    root.querySelectorAll(".board-card").forEach((board) => {
      if (!board.querySelector("tr.mlb-clickable-row")) return;
      const target = targetFromTitle(board.querySelector("h2")?.textContent);
      if (target === "HIT") enhanceHitBoard(board);
      else enhancePowerBoard(board, target);
    });
  }

  function findSummaryMetricContainer(card) {
    const candidates = [...card.querySelectorAll("div,section")];
    return candidates.find((el) => {
      const txt = String(el.textContent || "").toLowerCase();
      const direct = [...el.children].map((c) => String(c.textContent || "").toLowerCase());
      const metricChildren = direct.filter((t) =>
        t.includes("scored") || t.includes("shown") || t.includes("consensus") || t.includes("shadow model")
      );
      return metricChildren.length >= 2 && metricChildren.length === el.children.length;
    }) || null;
  }

  function enhanceSummary(root) {
    const card = root.querySelector(".daily-summary-card.consensus-outlook-card");
    if (!card) return;

    let header = card.querySelector(".p9a-summary-header");
    if (!header) {
      header = document.createElement("div");
      header.className = "p9a-summary-header";
      const main = card.querySelector(".outlook-main") || card.firstElementChild;
      const eyebrow = main?.querySelector(".eyebrow");
      const title = main?.querySelector("h2");
      const titleWrap = document.createElement("div");
      titleWrap.className = "p9a-summary-title";
      if (eyebrow) titleWrap.appendChild(eyebrow);
      if (title) titleWrap.appendChild(title);
      header.appendChild(titleWrap);

      const metricContainer = findSummaryMetricContainer(card);
      if (metricContainer) {
        metricContainer.classList.add("p9a-summary-metrics");
        header.appendChild(metricContainer);
      }

      card.insertBefore(header, card.firstChild);
    }

    const list = card.querySelector(".consensus-play-list");
    if (list) list.classList.add("p9a-summary-list");
  }

  function compactTip(root) {
    const candidates = [...root.querySelectorAll("section,div")];
    const tip = candidates.find((el) => {
      const txt = String(el.textContent || "").trim();
      if (!/^Tip:/i.test(txt)) return false;
      if (txt.length > 350) return false;
      // choose the outer visible tip block, not a nested child
      return ![...el.children].some((c) => /^Tip:/i.test(String(c.textContent || "").trim()));
    });
    if (!tip || tip.dataset.p9aCompact === "1") return;
    tip.dataset.p9aCompact = "1";
    tip.classList.add("p9a-tip-strip");
    tip.innerHTML = '<strong>Tip:</strong><span>Select a player for matchup detail, recent form and model signals.</span>';
  }

  function overlap(a, b) {
    if (!a || !b) return false;
    const r1 = a.getBoundingClientRect();
    const r2 = b.getBoundingClientRect();
    if (!r1.width || !r1.height || !r2.width || !r2.height) return false;
    return !(r1.right <= r2.left || r2.right <= r1.left || r1.bottom <= r2.top || r2.bottom <= r1.top);
  }

  function visualQa(root) {
    const issues = [];
    root.querySelectorAll('.board-card[data-p9a-target="TB"] .mlb-clickable-row, .board-card[data-p9a-target="HR"] .mlb-clickable-row')
      .forEach((row, idx) => {
        const visible = [...row.children].filter((c) => !c.hidden && getComputedStyle(c).display !== "none");
        if (visible.length !== 5) issues.push(`power row ${idx + 1}: expected 5 visible cells, got ${visible.length}`);
        const prob = row.querySelector(".p9a-prob-cell");
        const signal = row.querySelector(".p9a-signal-cell");
        if (overlap(prob, signal)) issues.push(`power row ${idx + 1}: probability overlaps signal`);
      });

    const summary = root.querySelector(".daily-summary-card.consensus-outlook-card");
    if (summary && !summary.querySelector(".p9a-summary-header")) issues.push("summary header not normalized");
    const tip = root.querySelector(".p9a-tip-strip");
    if (!tip) issues.push("tip not compacted");

    root.dataset.p9aQa = issues.length ? "fail" : "pass";
    if (issues.length) console.warn("Phase 9A visual QA", issues);
    else console.info("Phase 9A visual QA: pass");
  }

  function enhance() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    enhanceBoards(root);
    enhanceSummary(root);
    compactTip(root);
    requestAnimationFrame(() => visualQa(root));
  }

  function init() {
    enhance();
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    let scheduled = false;
    new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        enhance();
      });
    }).observe(root, {childList:true, subtree:true});
    console.info(`MLB Hit Lab ${BUILD} loaded`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {once:true});
  } else {
    init();
  }
})();