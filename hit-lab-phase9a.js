/* MLB Hit Lab — Phase 9A renderer refinement
   Normalizes the existing rendered leaderboard DOM into stable semantic cards.
   No data fetching or model logic changes. */
(() => {
  const BUILD = "phase9a-renderer-refinement-20260907f";
  const ROOT_ID = "mlbHitBoardContent";

  const normalize = (s) => String(s || "")
    .trim().toLowerCase().replace(/\+/g, "plus")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function targetFromTitle(title) {
    const t = String(title || "").toLowerCase();
    if (t.includes("home run")) return "HR";
    if (t.includes("total base") || t.includes("2+ tb")) return "TB";
    return "HIT";
  }

  function assignRole(cell, role) {
    if (!cell || !role) return;
    cell.dataset.p9aRole = role;
  }

  function mapRolesFromHeaders(board, row) {
    const headers = [...board.querySelectorAll("thead th")].map((th) => normalize(th.textContent));
    const cells = [...row.children];
    cells.forEach((cell, index) => {
      const col = headers[index] || `col-${index + 1}`;
      cell.dataset.p9aCol = col;
      if (index === 0 || col === "rank" || col === "#") assignRole(cell, "rank");
      else if (col.includes("player")) assignRole(cell, "player");
      else if (col === "team") assignRole(cell, "team");
      else if (col.includes("probability")) assignRole(cell, "probability");
      else if (col.includes("best-odds") || col === "odds") assignRole(cell, "odds");
      else if (col.includes("confidence")) assignRole(cell, "confidence");
      else if (col === "why" || col.includes("signal")) assignRole(cell, "why");
      else if (col.includes("opponent-sp") || col.includes("opposing-pitcher") || col === "pitcher") assignRole(cell, "pitcher");
      else if (col === "game") assignRole(cell, "game");
      else if (col.includes("status") || col.includes("deployment")) assignRole(cell, "status");
    });
  }

  function enforceKnownTargetSchema(board, row, target) {
    const cells = [...row.children];
    if (target === "HIT") {
      // Production Hit schema: Rank | Player | Team | Probability | Best Odds | Confidence | Why | Opp SP | Game
      ["rank","player","team","probability","odds","confidence","why","pitcher","game"]
        .forEach((role, i) => assignRole(cells[i], role));
      return;
    }

    // Production power schema confirmed from app-v4.js:
    // Rank | Player | Team | Probability | Status | Why | Opponent SP | Game
    ["rank","player","team","probability","status","why","pitcher","game"]
      .forEach((role, i) => assignRole(cells[i], role));
  }

  function normalizePowerCard(row) {
    // The page-level Active Model already communicates SHADOW. Remove per-row repetition.
    row.querySelectorAll('[data-p9a-role="status"]').forEach((cell) => {
      cell.hidden = true;
      cell.setAttribute("aria-hidden", "true");
    });

    // Opposing pitcher belongs in the matchup/detail surface, not the scan-first row.
    row.querySelectorAll('[data-p9a-role="pitcher"], [data-p9a-role="game"]').forEach((cell) => {
      cell.hidden = true;
      cell.setAttribute("aria-hidden", "true");
    });
  }

  function enhanceBoard(board) {
    const rows = [...board.querySelectorAll("tr.mlb-clickable-row")];
    if (!rows.length) return;

    const target = targetFromTitle(board.querySelector("h2")?.textContent);
    board.dataset.p9aTarget = target;

    rows.forEach((row) => {
      row.dataset.p9aTarget = target;
      mapRolesFromHeaders(board, row);
      enforceKnownTargetSchema(board, row, target);
      if (target !== "HIT") normalizePowerCard(row);
    });
  }

  function compactTip(root) {
    [...root.querySelectorAll(".performance-note")].forEach((note) => {
      const text = String(note.textContent || "").trim();
      if (!/^tip:/i.test(text)) return;
      note.classList.add("p9a-tip-strip");
      note.innerHTML = '<strong>Tip:</strong><span>Select a player for matchup detail, recent form and model signals.</span>';
    });
  }

  function overlap(a, b) {
    if (!a || !b) return false;
    const r1 = a.getBoundingClientRect();
    const r2 = b.getBoundingClientRect();
    if (!r1.width || !r1.height || !r2.width || !r2.height) return false;
    return !(r1.right <= r2.left || r2.right <= r1.left || r1.bottom <= r2.top || r2.bottom <= r1.top);
  }

  function runVisualQa(root) {
    const issues = [];
    root.querySelectorAll('.board-card[data-p9a-target] .mlb-clickable-row').forEach((row, idx) => {
      const target = row.dataset.p9aTarget;
      const visibleStatus = [...row.querySelectorAll('[data-p9a-role="status"]')].some((el) => !el.hidden);
      const visiblePitcher = [...row.querySelectorAll('[data-p9a-role="pitcher"]')].some((el) => !el.hidden);
      if (target !== "HIT" && visibleStatus) issues.push(`${target} row ${idx+1}: row-level status visible`);
      if (target !== "HIT" && visiblePitcher) issues.push(`${target} row ${idx+1}: pitcher visible`);

      const prob = row.querySelector('[data-p9a-role="probability"]');
      const why = row.querySelector('[data-p9a-role="why"]');
      const player = row.querySelector('[data-p9a-role="player"]');
      if (overlap(prob, why)) issues.push(`${target} row ${idx+1}: probability overlaps why`);
      if (overlap(player, prob)) issues.push(`${target} row ${idx+1}: player overlaps probability`);
    });

    root.dataset.p9aQa = issues.length ? "fail" : "pass";
    if (issues.length) console.warn("Phase 9A visual QA", issues);
    else console.info("Phase 9A visual QA: pass");
    return issues;
  }

  function enhance() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    root.querySelectorAll(".board-card").forEach(enhanceBoard);
    compactTip(root);
    requestAnimationFrame(() => runVisualQa(root));
  }

  function init() {
    enhance();
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        enhance();
      });
    });
    observer.observe(root, { childList: true, subtree: true });
    console.info(`MLB Hit Lab ${BUILD} loaded`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();