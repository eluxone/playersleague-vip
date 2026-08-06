(() => {
  'use strict';

  if (!/\/(?:index\.html)?$/.test(window.location.pathname)) return;
  document.body.classList.add('game-home');

  const loader = document.createElement('div');
  loader.className = 'game-loader';
  loader.setAttribute('role', 'status');
  loader.setAttribute('aria-live', 'polite');
  loader.innerHTML = `
    <div class="game-loader__grid" aria-hidden="true"></div>
    <div class="game-loader__scan" aria-hidden="true"></div>
    <div class="game-loader__content">
      <img class="game-loader__logo" src="assets/plvip-logo.png" alt="Players League VIP">
      <p class="game-loader__eyebrow">INITIALISING PLAYER NETWORK</p>
      <h2>Entering the League</h2>
      <p class="game-loader__status" data-loader-status>Connecting player identity…</p>
      <div class="game-loader__bar" aria-hidden="true"><i data-loader-bar></i></div>
      <span class="game-loader__percent" data-loader-percent>0%</span>
    </div>`;
  document.body.prepend(loader);
  document.body.style.overflow = 'hidden';

  const bar = loader.querySelector('[data-loader-bar]');
  const percent = loader.querySelector('[data-loader-percent]');
  const status = loader.querySelector('[data-loader-status]');
  const states = [
    [18, 'Connecting player identity…'],
    [43, 'Syncing competitive profile…'],
    [68, 'Loading global league…'],
    [88, 'Preparing player lobby…'],
    [100, 'League ready.']
  ];
  let progress = 0;
  let stateIndex = 0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const interval = window.setInterval(() => {
    progress = Math.min(100, progress + (reduced ? 25 : Math.ceil(Math.random() * 8)));
    if (bar) bar.style.width = `${progress}%`;
    if (percent) percent.textContent = `${progress}%`;
    if (states[stateIndex] && progress >= states[stateIndex][0]) {
      if (status) status.textContent = states[stateIndex][1];
      stateIndex += 1;
    }
    if (progress >= 100) {
      window.clearInterval(interval);
      window.setTimeout(() => {
        loader.classList.add('is-complete');
        document.body.style.overflow = '';
        window.setTimeout(() => loader.remove(), 650);
      }, reduced ? 80 : 380);
    }
  }, reduced ? 40 : 90);

  const heroCopy = document.querySelector('.hero-grid > .reveal');
  if (heroCopy && !heroCopy.querySelector('.hero-game-meta')) {
    const meta = document.createElement('div');
    meta.className = 'hero-game-meta';
    meta.innerHTML = '<span>Cross-platform</span><span>Competitive identity</span><span>Global matchmaking vision</span>';
    const actions = heroCopy.querySelector('.actions');
    heroCopy.insertBefore(meta, actions || null);
  }

  const oldCard = document.querySelector('.token-card');
  if (oldCard) {
    const lobby = document.createElement('section');
    lobby.className = 'game-lobby reveal';
    lobby.setAttribute('aria-label', 'Original Players League VIP player lobby artwork');
    lobby.innerHTML = `
      <div class="game-lobby__top"><strong>PLAYER LOBBY // SQUAD 01</strong><span>ONLINE</span></div>
      <div class="game-lobby__stage" aria-hidden="true">
        <div class="game-avatar game-avatar--scout">
          <i class="game-avatar__hair"></i><i class="game-avatar__head"></i><i class="game-avatar__body"></i><i class="game-avatar__legs"></i><span class="game-avatar__tag">SCOUT // LVL 18</span>
        </div>
        <div class="game-avatar game-avatar--captain">
          <i class="game-avatar__hair"></i><i class="game-avatar__head"></i><i class="game-avatar__body"></i><i class="game-avatar__legs"></i><span class="game-avatar__tag">CAPTAIN // LVL 32</span>
        </div>
        <div class="game-avatar game-avatar--tank">
          <i class="game-avatar__hair"></i><i class="game-avatar__head"></i><i class="game-avatar__body"></i><i class="game-avatar__legs"></i><span class="game-avatar__tag">TANK // LVL 24</span>
        </div>
      </div>
      <div class="game-lobby__bottom"><div><small>ACTIVE MISSION</small><strong>Build the first global player league</strong></div><span class="game-lobby__queue">FOUNDING SEASON</span></div>`;
    oldCard.replaceWith(lobby);
  }

  const facts = document.querySelector('.facts');
  if (facts && !document.querySelector('.game-rank-strip')) {
    const rankStrip = document.createElement('section');
    rankStrip.className = 'game-rank-strip';
    rankStrip.setAttribute('aria-label', 'Players League feature status');
    rankStrip.innerHTML = `
      <article data-rank="01"><b>Identity</b><span>Persistent player profile</span></article>
      <article data-rank="02"><b>Compete</b><span>Challenges and rankings</span></article>
      <article data-rank="03"><b>Recognition</b><span>Badges and reputation</span></article>
      <article data-rank="04"><b>Community</b><span>One worldwide league</span></article>`;
    facts.insertAdjacentElement('afterend', rankStrip);
  }
})();
