/* MLB Hit Lab — Phase 9A wireframe refinement
   Uses exact production selectors from app-v4.js.
   No model/data fetching or scoring logic changes. */
(() => {
  const BUILD = "phase9a-wireframe-refinement-20260907h";
  const ROOT_ID = "mlbHitBoardContent";

  function targetFromRoot(root) {
    const title = String(root.querySelector('.board-card h2')?.textContent || '').toLowerCase();
    if (title.includes('home run')) return 'HR';
    if (title.includes('total base') || title.includes('2+')) return 'TB';
    return 'HIT';
  }

  function normalizePowerRows(root) {
    const table = root.querySelector('.phase4b-power-table');
    if (!table) return;
    const target = targetFromRoot(root);
    table.dataset.p9aTarget = target;

    table.querySelectorAll('tbody tr').forEach((row) => {
      const cells = [...row.children];
      const probabilityCell = row.querySelector('.probability-cell')?.closest('td') || null;
      const whyCell = row.querySelector('.why-cell') || null;
      const rankCell = cells[0] || null;
      const playerCell = cells[1] || null;
      const teamCell = cells[2] || null;

      row.dataset.p9aPowerCard = '1';
      row.dataset.p9aTarget = target;

      cells.forEach((cell) => {
        cell.classList.remove('p9a-rank','p9a-player','p9a-team','p9a-probability','p9a-why','p9a-hide');
      });
      rankCell?.classList.add('p9a-rank');
      playerCell?.classList.add('p9a-player');
      teamCell?.classList.add('p9a-team');
      probabilityCell?.classList.add('p9a-probability');
      whyCell?.classList.add('p9a-why');

      cells.forEach((cell) => {
        const keep = [rankCell, playerCell, teamCell, probabilityCell, whyCell].includes(cell);
        if (!keep) {
          cell.classList.add('p9a-hide');
          cell.hidden = true;
          cell.setAttribute('aria-hidden','true');
        } else {
          cell.hidden = false;
          cell.removeAttribute('aria-hidden');
        }
      });

      // Add wireframe-style labels without changing underlying data.
      if (playerCell) {
        let meta = playerCell.querySelector('.p9a-target-title');
        if (!meta) {
          meta = document.createElement('div');
          meta.className = 'p9a-target-title';
          const name = playerCell.querySelector('.player-name')?.textContent?.trim() || '';
          meta.textContent = `${name} · ${target === 'HR' ? 'HOME RUN' : '2+ TOTAL BASES'}`;
          const playerName = playerCell.querySelector('.player-name');
          if (playerName) playerName.style.display = 'none';
          playerCell.appendChild(meta);
        }
      }

      if (probabilityCell) {
        probabilityCell.classList.add('p9a-big-model');
        const label = probabilityCell.querySelector('.p9a-model-label') || document.createElement('small');
        label.className = 'p9a-model-label';
        label.textContent = 'MODEL';
        if (!label.parentNode) probabilityCell.appendChild(label);
      }
    });
  }

  function normalizeHitRows(root) {
    const table = root.querySelector('.v3-board-table:not(.phase4b-power-table)');
    if (!table) return;
    table.querySelectorAll('tbody tr').forEach((row) => {
      row.dataset.p9aHitCard = '1';
      const confidence = row.querySelector('.confidence-badge')?.closest('td');
      if (confidence) {
        confidence.hidden = true;
        confidence.classList.add('p9a-hide-confidence');
      }
      const prob = row.querySelector('.probability-cell')?.closest('td');
      if (prob) prob.classList.add('p9a-big-model');
    });
  }

  function compactTips(root) {
    root.querySelectorAll('.mlb-hit-board-tip').forEach((tip) => {
      if (tip.dataset.p9aCompact === '1') return;
      tip.dataset.p9aCompact = '1';
      tip.innerHTML = '<strong>ⓘ</strong><span>Select a player for matchup detail, recent form and model signals.</span>';
      tip.classList.add('p9a-tip-compact');
    });
  }

  function normalizeSummary(root) {
    const card = root.querySelector('.daily-summary-card.consensus-outlook-card');
    if (!card) return;
    const metrics = card.querySelector('.summary-metrics');
    const main = card.querySelector('.outlook-main');
    if (!metrics || !main) return;

    let header = card.querySelector('.p9a-summary-header');
    if (!header) {
      header = document.createElement('div');
      header.className = 'p9a-summary-header';
      const titleWrap = document.createElement('div');
      titleWrap.className = 'p9a-summary-title';
      const eyebrow = main.querySelector('.eyebrow');
      const title = main.querySelector('h2');
      if (eyebrow) titleWrap.appendChild(eyebrow);
      if (title) titleWrap.appendChild(title);
      header.append(titleWrap, metrics);
      card.insertBefore(header, main);
      metrics.classList.add('p9a-summary-metrics');
    }
  }

  function overlap(a,b) {
    if (!a || !b) return false;
    const x=a.getBoundingClientRect(), y=b.getBoundingClientRect();
    if (!x.width || !y.width) return false;
    return !(x.right<=y.left || y.right<=x.left || x.bottom<=y.top || y.bottom<=x.top);
  }

  function qa(root) {
    const issues=[];
    root.querySelectorAll('[data-p9a-power-card="1"]').forEach((row,i)=>{
      const visible=[...row.children].filter(c=>!c.hidden && getComputedStyle(c).display!=='none');
      const prob=row.querySelector('.p9a-probability');
      const why=row.querySelector('.p9a-why');
      const value=prob?.querySelector('.score-value')?.textContent?.trim();
      if (visible.length!==5) issues.push(`power row ${i+1}: ${visible.length} visible cells`);
      if (!value || value==='—') issues.push(`power row ${i+1}: missing model probability`);
      if (overlap(prob,why)) issues.push(`power row ${i+1}: probability/why overlap`);
    });
    if (root.querySelector('.mlb-hit-board-tip:not(.p9a-tip-compact)')) issues.push('tip not compacted');
    root.dataset.p9aQa=issues.length?'fail':'pass';
    if (issues.length) console.warn('Phase 9A QA',issues); else console.info('Phase 9A QA: pass');
  }

  function enhance() {
    const root=document.getElementById(ROOT_ID); if(!root) return;
    normalizePowerRows(root);
    normalizeHitRows(root);
    compactTips(root);
    normalizeSummary(root);
    requestAnimationFrame(()=>qa(root));
  }

  function init(){
    enhance();
    const root=document.getElementById(ROOT_ID); if(!root) return;
    let queued=false;
    new MutationObserver(()=>{
      if(queued) return; queued=true;
      requestAnimationFrame(()=>{queued=false; enhance();});
    }).observe(root,{childList:true,subtree:true});
    console.info(`MLB Hit Lab ${BUILD} loaded`);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();