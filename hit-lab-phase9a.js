/* MLB Hit Lab — Phase 9A refinement helpers
   Adds semantic data attributes to existing rendered leaderboard rows.
   No data queries and no model logic changes. */
(() => {
  const BUILD = "phase9a-refinement-v2-20260907e";
  const rootId = "mlbHitBoardContent";

  const normalize = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\+/g, "plus")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  function targetFromTitle(title) {
    const t = String(title || "").toLowerCase();
    if (t.includes("home run")) return "HR";
    if (t.includes("total base") || t.includes("2+ tb")) return "TB";
    return "HIT";
  }

  function enhanceBoard(board) {
    const rows = [...board.querySelectorAll("tr.mlb-clickable-row")];
    if (!rows.length) return;

    const target = targetFromTitle(board.querySelector("h2")?.textContent);
    board.dataset.p9aTarget = target;
    rows.forEach((row) => { row.dataset.p9aTarget = target; });

    const headers = [...board.querySelectorAll("thead th")].map((th) => normalize(th.textContent));
    rows.forEach((row) => {
      [...row.children].forEach((cell, index) => {
        const col = headers[index] || `col-${index + 1}`;
        cell.dataset.p9aCol = col;
      });
    });

    // Give known semantic fields stable names across Hit / TB / HR target tables.
    rows.forEach((row) => {
      [...row.children].forEach((cell) => {
        const c = cell.dataset.p9aCol || "";
        if (c === "" || c === "col-1") cell.dataset.p9aRole = "rank";
        if (c.includes("player")) cell.dataset.p9aRole = "player";
        if (c === "team") cell.dataset.p9aRole = "team";
        if (c.includes("probability")) cell.dataset.p9aRole = "probability";
        if (c.includes("best-odds") || c === "odds") cell.dataset.p9aRole = "odds";
        if (c.includes("confidence")) cell.dataset.p9aRole = "confidence";
        if (c === "why" || c.includes("signal")) cell.dataset.p9aRole = "why";
        if (c.includes("opponent-sp") || c.includes("pitcher")) cell.dataset.p9aRole = "pitcher";
        if (c === "game") cell.dataset.p9aRole = "game";
        if (c.includes("status") || c.includes("deployment")) cell.dataset.p9aRole = "status";
      });
    });
  }



  function refineSemanticRoles(board) {
    const target = board.dataset.p9aTarget || targetFromTitle(board.querySelector("h2")?.textContent);
    const rows = [...board.querySelectorAll("tr.mlb-clickable-row")];
    rows.forEach((row) => {
      const cells = [...row.children];
      cells.forEach((cell) => {
        const col = String(cell.dataset.p9aCol || "");
        const text = String(cell.textContent || "").trim().toLowerCase();

        // Power boards expose model deployment status instead of market odds.
        if ((target === "HR" || target === "TB") && (col.includes("status") || text === "shadow" || text === "live")) {
          cell.dataset.p9aRole = "status";
        }

        if (col.includes("opponent-sp") || col.includes("opposing-pitcher") || col === "pitcher") {
          cell.dataset.p9aRole = "pitcher";
        }
      });
    });

    const meta = board.querySelector(".board-meta");
    if (meta) meta.dataset.p9aMeta = "true";
  }

  function enhance() {
    const root = document.getElementById(rootId);
    if (!root) return;
    root.querySelectorAll(".board-card").forEach((board) => { enhanceBoard(board); refineSemanticRoles(board); });
  }

  function init() {
    enhance();
    const root = document.getElementById(rootId);
    if (!root) return;
    const observer = new MutationObserver(() => requestAnimationFrame(enhance));
    observer.observe(root, { childList: true, subtree: true });
    console.info(`MLB Hit Lab ${BUILD} loaded`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();