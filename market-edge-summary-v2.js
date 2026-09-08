/* =========================================================
   MLB Hit Lab — Market Edge Daily Summary exact layout enhancer
   Build: market-edge-summary-v2-20260908
   Purpose:
   Normalize only the Market Edge Top 3 Daily Summary so it matches
   the approved compact Consensus card layout.
   ========================================================= */
(() => {
  "use strict";

  const ROOT_ID = "marketEdgeContent";
  const BUILD = "market-edge-summary-v2-20260908";

  const txt = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();

  function normalizeSummary() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    const summary = root.querySelector(".mev2-summary");
    if (!summary) return;

    summary.classList.add("mev2-summary-exact");

    const cards = [...summary.querySelectorAll(".mev2-summary-card")];
    cards.forEach((card) => {
      if (card.dataset.summaryExact === "1") return;

      const top = card.querySelector(".mev2-card-topline");
      const identity = card.querySelector(".mev2-card-identity");
      const metric = card.querySelector(".mev2-summary-metric");
      const copy = card.querySelector(".mev2-summary-copy");
      const footer = card.querySelector(".mev2-card-footer");

      if (!top || !identity || !metric || !copy || !footer) return;

      // Preserve existing click behavior by changing only internal layout classes.
      card.dataset.summaryExact = "1";
      card.classList.add("mev2-summary-card-exact");

      // Top line mirrors the approved consensus cards:
      // rank / hand / team logo on left, model probability on right.
      top.classList.add("mev2-exact-top");

      // Player and team are a dedicated left-aligned block.
      copy.classList.add("mev2-exact-player");

      // Footer remains prop on left and model badge on right.
      footer.classList.add("mev2-exact-bottom");
    });

    root.dataset.marketEdgeSummaryBuild = BUILD;
  }

  function init() {
    normalizeSummary();

    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    // Market Edge re-renders whenever filters/ranking/scope change.
    const observer = new MutationObserver(() => normalizeSummary());
    observer.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
