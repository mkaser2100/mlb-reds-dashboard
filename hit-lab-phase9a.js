/* MLB Hit Lab — Phase 9A exact wireframe renderer
   Presentation-only enhancement over app-v4.js production data/rendering.
   Build: phase9a-consensus-summary-20260908a */
(() => {
  const ROOT_ID = 'mlbHitBoardContent';
  const BUILD = 'phase9a-consensus-summary-20260908a';

  const TEAM = {
    'Arizona Diamondbacks':['ARI',109], 'Atlanta Braves':['ATL',144], 'Baltimore Orioles':['BAL',110],
    'Boston Red Sox':['BOS',111], 'Chicago Cubs':['CHC',112], 'Chicago White Sox':['CWS',145],
    'Cincinnati Reds':['CIN',113], 'Cleveland Guardians':['CLE',114], 'Colorado Rockies':['COL',115],
    'Detroit Tigers':['DET',116], 'Houston Astros':['HOU',117], 'Kansas City Royals':['KC',118],
    'Los Angeles Angels':['LAA',108], 'Los Angeles Dodgers':['LAD',119], 'Miami Marlins':['MIA',146],
    'Milwaukee Brewers':['MIL',158], 'Minnesota Twins':['MIN',142], 'New York Mets':['NYM',121],
    'New York Yankees':['NYY',147], 'Athletics':['ATH',133], 'Oakland Athletics':['ATH',133],
    'Philadelphia Phillies':['PHI',143], 'Pittsburgh Pirates':['PIT',134], 'San Diego Padres':['SD',135],
    'San Francisco Giants':['SF',137], 'Seattle Mariners':['SEA',136], 'St. Louis Cardinals':['STL',138],
    'Tampa Bay Rays':['TB',139], 'Texas Rangers':['TEX',140], 'Toronto Blue Jays':['TOR',141],
    'Washington Nationals':['WSH',120]
  };

  const txt = (el) => (el?.textContent || '').replace(/\s+/g,' ').trim();
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function target(root) {
    const h = txt(root.querySelector('.board-card h2')).toLowerCase();
    if (h.includes('home run')) return {key:'HR', label:'HOME RUN', chip:'HR'};
    if (h.includes('total base') || h.includes('2+')) return {key:'TB', label:'2+ TOTAL BASES', chip:'TB'};
    return {key:'HIT', label:'OVER 0.5 HITS', chip:'HIT'};
  }

  function teamMeta(name) {
    return TEAM[name] || ['', null];
  }

  function logo(name, role) {
    const [abbr,id] = teamMeta(name);
    if (!name || name === '—' || name.toLowerCase().includes('unknown')) {
      return `<span class="p9a-logo p9a-logo-empty" aria-label="${role} logo unavailable"></span>`;
    }
    if (!id) return `<span class="p9a-logo p9a-logo-fallback" title="${esc(name)}">${esc(abbr || '')}</span>`;
    return `<span class="p9a-logo" title="${esc(name)}"><img src="https://www.mlbstatic.com/team-logos/${id}.svg" alt="${esc(name)}" onerror="this.parentElement.classList.add('p9a-logo-fallback');this.remove();"></span>`;
  }

  function parseWhy(cell) {
    if (!cell) return {primary:'', count:''};
    const countEl = cell.querySelector('.reason-count');
    const count = txt(countEl);
    const clone = cell.cloneNode(true);
    clone.querySelectorAll('.reason-count').forEach(n => n.remove());
    const primary = txt(clone);
    return {primary, count};
  }

  function parsePlayer(cell) {
    const name = txt(cell?.querySelector('.player-name')) || '';
    const hand = txt(cell?.querySelector('.avatar')) || '';
    return {name, hand};
  }

  function parseOpponentFromPitcherCell(cell) {
    if (!cell) return '';
    const sub = txt(cell.querySelector('.player-sub'));
    if (!sub) return '';
    const first = sub.split('·')[0].trim();
    return /^(—|TBD)$/i.test(first) ? '' : first;
  }

  function buildCard(row, t, schema) {
    const cells = [...row.children];
    if (cells.length < 5 || row.dataset.p9aExact === '1') return;

    const rank = txt(cells[0]).replace(/^#/, '');
    const {name,hand} = parsePlayer(cells[1]);
    const teamName = txt(cells[2]);
    const probCell = cells[3];
    const probability = txt(probCell?.querySelector('.score-value')) || txt(probCell);

    const whyIndex = schema === 'power' ? 5 : 6;
    const pitcherIndex = schema === 'power' ? 6 : 7;
    const why = parseWhy(cells[whyIndex]);
    const opponentName = parseOpponentFromPitcherCell(cells[pitcherIndex]);
    const [teamAbbr] = teamMeta(teamName);
    const [oppAbbr] = teamMeta(opponentName);
    const matchup = teamAbbr && oppAbbr ? `${teamAbbr} @ ${oppAbbr}` : (teamAbbr || '');

    row.dataset.p9aExact = '1';
    row.dataset.p9aTarget = t.key;
    row.classList.add('p9a-exact-card');

    row.innerHTML = `
      <td class="p9a-card-rank"><span class="p9a-rank-badge">${esc(rank)}</span></td>
      <td class="p9a-card-hand">${hand ? `<span class="p9a-hand">${esc(hand)}</span>` : ''}</td>
      <td class="p9a-card-logos">${logo(teamName,'team')}${logo(opponentName,'opponent')}</td>
      <td class="p9a-card-player">
        <div class="p9a-player-title">${esc(name)}${name ? ' · ' : ''}${esc(t.label)}</div>
        <div class="p9a-matchup">${esc(matchup)}</div>
      </td>
      <td class="p9a-card-prob"><strong>${esc(probability)}</strong><small>MODEL</small></td>
      <td class="p9a-card-signal">${why.primary ? `<span class="p9a-signal">${esc(why.primary)}</span>` : ''}</td>
      <td class="p9a-card-more">${why.count ? `<span class="p9a-more">${esc(why.count)}</span>` : ''}</td>
      <td class="p9a-card-chevron" aria-hidden="true">›</td>
    `;
  }

  function normalizeRows(root) {
    const t = target(root);
    const power = root.querySelector('.phase4b-power-table');
    const hit = root.querySelector('.v3-board-table:not(.phase4b-power-table)');

    if (power) {
      power.dataset.p9aExactTable = '1';
      power.querySelectorAll('tbody tr').forEach(row => buildCard(row,t,'power'));
    }
    if (hit) {
      hit.dataset.p9aExactTable = '1';
      hit.querySelectorAll('tbody tr.mlb-clickable-row, tbody tr').forEach(row => buildCard(row,t,'hit'));
    }
  }

  function compactTip(root) {
    root.querySelectorAll('.mlb-hit-board-tip').forEach(tip => {
      tip.classList.add('p9a-exact-tip');
      tip.innerHTML = '<strong>ⓘ</strong><b>Tip:</b><span>Select a player for matchup detail, recent form and model signals.</span>';
    });
  }

  function cleanBoardHeader(root) {
    root.querySelectorAll('.board-header').forEach(header => {
      const nodes = [...header.querySelectorAll('span,small,div')];
      nodes.forEach(el => {
        const s = txt(el);
        if (/^(v3_hit_|tb2_v1_|hr_v1_).*(candidate|live|shadow)?$/i.test(s) || /_v\d+_\d{8,}/i.test(s)) {
          el.classList.add('p9a-hide-model-version');
        }
      });
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


  function p9aCardDataForPlayer(root, playerName) {
    const cards = [...root.querySelectorAll('tr.p9a-exact-card')];
    const card = cards.find(row => {
      const title = txt(row.querySelector('.p9a-player-title'));
      return title === playerName || title.startsWith(`${playerName} ·`);
    });
    if (!card) return null;
    const logos = [...card.querySelectorAll('.p9a-card-logos .p9a-logo:not(.p9a-logo-empty)')];
    const logoHtml = logos.map(el => el.outerHTML).join('');
    return {
      probability: txt(card.querySelector('.p9a-card-prob strong')),
      matchup: txt(card.querySelector('.p9a-matchup')),
      hand: txt(card.querySelector('.p9a-hand')),
      signal: txt(card.querySelector('.p9a-signal')),
      logoHtml
    };
  }

  function normalizeConsensusSummary(root) {
    const card = root.querySelector('.daily-summary-card.consensus-outlook-card');
    if (!card) return;

    const list = card.querySelector('.consensus-play-list');
    if (!list) return;

    const rows = [...list.querySelectorAll('.consensus-play-row')].slice(0, 3);
    if (!rows.length) return;

    card.classList.add('p9a-consensus-summary');

    let header = card.querySelector('.p9a-consensus-heading');
    if (!header) {
      header = document.createElement('div');
      header.className = 'p9a-consensus-heading';
      header.innerHTML = `
        <div class="p9a-consensus-heading-copy">
          <span class="p9a-consensus-trophy" aria-hidden="true">🏆</span>
          <div>
            <div class="eyebrow">DAILY SUMMARY</div>
            <h2>Top 3 Consensus Plays</h2>
            <p>Highest agreement across available model signals.</p>
          </div>
        </div>
        <span class="p9a-consensus-count">👥 3 consensus plays</span>
      `;
      card.insertBefore(header, card.firstChild);
    }

    // Hide the legacy summary header/metrics; the new header is the single source of truth.
    card.querySelectorAll(':scope > .p9a-summary-header, :scope > .summary-metrics').forEach(el => {
      if (!el.closest('.p9a-consensus-heading')) el.classList.add('p9a-consensus-legacy-hidden');
    });

    rows.forEach((row, i) => {
      if (row.dataset.p9aConsensus === '1') return;

      const copy = row.querySelector('.consensus-player-copy');
      const strong = copy?.querySelector('strong');
      const playerName = txt(strong) || txt(copy).split('·')[0].trim();
      if (!playerName) return;

      const board = p9aCardDataForPlayer(root, playerName);
      const originalText = txt(copy);
      const reasonCandidates = [...(copy?.querySelectorAll('small,span') || [])].map(txt).filter(Boolean);
      const reason = board?.signal || reasonCandidates.find(v => v !== playerName && !/^V[23]\s*#/i.test(v)) || '';
      const matchup = board?.matchup || '';
      const hand = board?.hand || '';
      const probability = board?.probability || '';

      row.dataset.p9aConsensus = '1';
      row.classList.add('p9a-consensus-card');
      row.innerHTML = `
        <div class="p9a-consensus-top">
          <span class="p9a-consensus-rank">${i + 1}</span>
          ${hand ? `<span class="p9a-consensus-hand">${esc(hand)}</span>` : ''}
          <span class="p9a-consensus-logos">${board?.logoHtml || ''}</span>
          <span class="p9a-consensus-prob">${probability ? `<strong>${esc(probability)}</strong><small>MODEL</small>` : ''}</span>
        </div>
        <div class="p9a-consensus-player">${esc(playerName)}</div>
        <div class="p9a-consensus-bottom">
          <span class="p9a-consensus-matchup">${esc(matchup)}</span>
          ${reason ? `<span class="p9a-consensus-signal">${esc(reason)}</span>` : ''}
        </div>
      `;
    });

    // Never show more than the top three.
    [...list.querySelectorAll('.consensus-play-row')].slice(3).forEach(row => row.classList.add('p9a-consensus-extra-hidden'));
  }

  function updatePageCopy(root) {
    const t = target(root);
    const eyebrow = document.getElementById('pageEyebrow');
    const subtitle = document.getElementById('pageSubtitle');
    if (eyebrow) eyebrow.textContent = t.key === 'TB' ? 'All MLB · 2+ Total Bases Intelligence' : t.key === 'HR' ? 'All MLB · Home Run Intelligence' : 'All MLB · Daily Matchup Intelligence';
    if (subtitle) subtitle.textContent = t.key === 'TB' ? 'Top hitters across MLB by probability of 2+ total bases.' : t.key === 'HR' ? 'Top hitters across MLB by home run probability.' : 'Top hitters across MLB by V3 machine-learning hit probability.';
  }

  function qa(root) {
    const issues = [];
    const cards = [...root.querySelectorAll('tr.p9a-exact-card')];
    cards.slice(0,5).forEach((row,i) => {
      const prob = txt(row.querySelector('.p9a-card-prob strong'));
      const player = txt(row.querySelector('.p9a-player-title'));
      if (!player) issues.push(`row ${i+1}: missing player`);
      if (!prob || !/%$/.test(prob)) issues.push(`row ${i+1}: missing probability`);
      if (row.querySelectorAll('td').length !== 8) issues.push(`row ${i+1}: bad card structure`);
    });
    if (root.querySelector('.phase4b-status-badge')) issues.push('legacy Shadow/Live badge remains in player cards');
    if (root.querySelector('.p9a-exact-card .player-name')) issues.push('legacy pitcher/player markup remains');
    const summaryCards = [...root.querySelectorAll('.p9a-consensus-card')];
    if (root.querySelector('.consensus-play-list') && summaryCards.length !== Math.min(3, root.querySelectorAll('.consensus-play-row').length)) {
      issues.push('consensus summary did not normalize top three cards');
    }
    summaryCards.forEach((card,i) => {
      if (!txt(card.querySelector('.p9a-consensus-player'))) issues.push(`consensus ${i+1}: missing player`);
    });
    root.dataset.p9aQa = issues.length ? 'fail' : 'pass';
    if (issues.length) console.warn('Phase 9A exact wireframe QA', issues);
    else if (cards.length) console.info(`Phase 9A exact wireframe QA: PASS (${cards.length} cards)`);
  }

  function enhance() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    normalizeSummary(root);
    compactTip(root);
    cleanBoardHeader(root);
    normalizeRows(root);
    normalizeConsensusSummary(root);
    updatePageCopy(root);
    requestAnimationFrame(() => qa(root));
  }

  function init() {
    enhance();
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; enhance(); });
    }).observe(root,{childList:true,subtree:true});
    console.info(`MLB Hit Lab ${BUILD} loaded`);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();