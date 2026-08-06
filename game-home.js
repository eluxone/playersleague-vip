(() => {
  'use strict';

  if (!/\/(?:index\.html)?$/.test(window.location.pathname)) return;

  document.body.classList.add('game-home');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsHover = window.matchMedia('(hover: hover)').matches;

  const characterData = {
    nova: {
      index: '01',
      name: 'Nova Runner',
      role: 'Speed / Recon',
      rank: 'Pathfinder',
      accent: '#4de8ff',
      accent2: '#a46dff',
      description: 'A high-mobility league scout built around fast decisions, clean movement and finding the next opportunity before anyone else.',
      mission: 'Map the first global player network',
      abilities: ['Pulse Dash', 'Signal Scan', 'Momentum'],
      stats: { speed: 94, control: 76, teamwork: 81 },
      svg: `
        <svg viewBox="0 0 420 610" class="character-svg" role="img" aria-label="Nova Runner, an original futuristic league scout">
          <defs>
            <linearGradient id="novaSuit" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#242b4b"/><stop offset=".48" stop-color="#111522"/><stop offset="1" stop-color="#070910"/></linearGradient>
            <linearGradient id="novaGlow" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#4de8ff"/><stop offset="1" stop-color="#a46dff"/></linearGradient>
            <filter id="novaBlur"><feGaussianBlur stdDeviation="9"/></filter>
          </defs>
          <ellipse cx="210" cy="571" rx="125" ry="23" fill="#020308" opacity=".7"/>
          <ellipse cx="210" cy="550" rx="100" ry="16" fill="#4de8ff" opacity=".2" filter="url(#novaBlur)"/>
          <path d="M121 230 88 391l40 7 46-139z" fill="url(#novaSuit)" stroke="#4de8ff" stroke-opacity=".45" stroke-width="3"/>
          <path d="m299 230 33 161-40 7-46-139z" fill="url(#novaSuit)" stroke="#a46dff" stroke-opacity=".45" stroke-width="3"/>
          <path d="M146 205c24-25 104-25 128 0l27 176-47 54h-88l-47-54z" fill="url(#novaSuit)" stroke="#69718d" stroke-width="3"/>
          <path d="m154 219 56 35 56-35-16 137-40 35-40-35z" fill="#171d34"/>
          <path d="m210 254 40-25-9 75-31 22-31-22-9-75z" fill="none" stroke="url(#novaGlow)" stroke-width="5"/>
          <path d="M166 429h41l-12 132h-51zM213 429h41l22 132h-51z" fill="url(#novaSuit)" stroke="#4d5570" stroke-width="3"/>
          <path d="M138 551h62l-7 27h-81c-7-18 5-27 26-27ZM224 551h58c22 0 33 10 28 27h-84z" fill="#0a0d16" stroke="#4de8ff" stroke-opacity=".45" stroke-width="3"/>
          <path d="M172 119c5-43 71-55 93-15l4 63-25 34h-68l-25-34z" fill="#c98168"/>
          <path d="M154 145c-5-76 110-94 119-17l-11 20-8-27-27-22-46 9-20 38z" fill="#15192a"/>
          <path d="M160 142h103l-10 37h-83z" fill="#070a12" stroke="url(#novaGlow)" stroke-width="4"/>
          <path d="M181 159h61" stroke="#4de8ff" stroke-width="5" stroke-linecap="round"/>
          <path d="M103 335 65 470" stroke="#4de8ff" stroke-width="8" stroke-linecap="round"/>
          <path d="m65 470-12 55 35-44z" fill="#4de8ff"/>
          <circle cx="210" cy="291" r="14" fill="#0b0f19" stroke="url(#novaGlow)" stroke-width="4"/>
          <text x="210" y="296" text-anchor="middle" fill="#ffe19a" font-size="13" font-weight="900">PL</text>
        </svg>`
    },
    aegis: {
      index: '02',
      name: 'Aegis Titan',
      role: 'Defence / Leadership',
      rank: 'Vanguard',
      accent: '#ffd56a',
      accent2: '#ff7f4d',
      description: 'A disciplined frontline captain designed to protect the squad, create space and keep the team moving when pressure is highest.',
      mission: 'Hold the line for the founding squad',
      abilities: ['Aegis Wall', 'Rally Cry', 'Last Stand'],
      stats: { speed: 58, control: 91, teamwork: 96 },
      svg: `
        <svg viewBox="0 0 420 610" class="character-svg" role="img" aria-label="Aegis Titan, an original armoured league captain">
          <defs>
            <linearGradient id="titanSuit" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#4a3a29"/><stop offset=".5" stop-color="#18140f"/><stop offset="1" stop-color="#080706"/></linearGradient>
            <linearGradient id="titanGold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0b2"/><stop offset=".5" stop-color="#e2aa3c"/><stop offset="1" stop-color="#8b4b20"/></linearGradient>
            <filter id="titanBlur"><feGaussianBlur stdDeviation="10"/></filter>
          </defs>
          <ellipse cx="210" cy="570" rx="145" ry="25" fill="#020308" opacity=".75"/>
          <ellipse cx="210" cy="549" rx="115" ry="17" fill="#ffd56a" opacity=".2" filter="url(#titanBlur)"/>
          <path d="M119 225 61 303l17 185 68-18 14-205z" fill="url(#titanSuit)" stroke="#d9a33f" stroke-width="4"/>
          <path d="m301 225 58 78-17 185-68-18-14-205z" fill="url(#titanSuit)" stroke="#d9a33f" stroke-width="4"/>
          <path d="M131 196c42-22 116-22 158 0l35 206-57 50H153l-57-50z" fill="url(#titanSuit)" stroke="#8a7656" stroke-width="4"/>
          <path d="m127 210 83 58 83-58-17 142-66 52-66-52z" fill="#211b13" stroke="url(#titanGold)" stroke-width="5"/>
          <path d="M151 445h53l-11 116h-62zM216 445h53l20 116h-62z" fill="url(#titanSuit)" stroke="#a17838" stroke-width="4"/>
          <path d="M123 551h79l-8 28H93c-5-19 7-28 30-28ZM221 551h79c24 0 37 10 30 28H226z" fill="#0b0906" stroke="#d8a444" stroke-width="4"/>
          <path d="M163 103c13-46 82-50 99-6l14 71-36 38h-61l-35-38z" fill="#a96951"/>
          <path d="M153 142c-2-77 113-86 122-10l-16 16-16-35-55-9-25 44z" fill="#20170e"/>
          <path d="M157 144h109l-14 40h-81z" fill="#090806" stroke="url(#titanGold)" stroke-width="5"/>
          <path d="M182 164h58" stroke="#ffd56a" stroke-width="6" stroke-linecap="round"/>
          <path d="M66 309h88v168H66z" fill="#18120b" stroke="url(#titanGold)" stroke-width="6"/>
          <path d="m82 332 28-20 28 20v97l-28 24-28-24z" fill="#2a1e10" stroke="#ffd56a" stroke-opacity=".7" stroke-width="3"/>
          <circle cx="210" cy="307" r="18" fill="#0a0907" stroke="url(#titanGold)" stroke-width="5"/>
          <text x="210" y="313" text-anchor="middle" fill="#fff0b2" font-size="16" font-weight="900">PL</text>
        </svg>`
    },
    echo: {
      index: '03',
      name: 'Echo Byte',
      role: 'Control / Intelligence',
      rank: 'Tactician',
      accent: '#72ffbd',
      accent2: '#36a8ff',
      description: 'A systems specialist who reads the arena, links player signals and turns scattered information into a winning team decision.',
      mission: 'Connect every player signal',
      abilities: ['Data Ghost', 'Link Field', 'Overclock'],
      stats: { speed: 78, control: 97, teamwork: 88 },
      svg: `
        <svg viewBox="0 0 420 610" class="character-svg" role="img" aria-label="Echo Byte, an original hooded league tactician">
          <defs>
            <linearGradient id="echoSuit" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#173a3e"/><stop offset=".5" stop-color="#0c171c"/><stop offset="1" stop-color="#05090c"/></linearGradient>
            <linearGradient id="echoGlow" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#72ffbd"/><stop offset="1" stop-color="#36a8ff"/></linearGradient>
            <filter id="echoBlur"><feGaussianBlur stdDeviation="10"/></filter>
          </defs>
          <ellipse cx="210" cy="570" rx="124" ry="22" fill="#020308" opacity=".75"/>
          <ellipse cx="210" cy="550" rx="95" ry="16" fill="#72ffbd" opacity=".18" filter="url(#echoBlur)"/>
          <path d="M140 220 94 394l40 12 51-156z" fill="url(#echoSuit)" stroke="#72ffbd" stroke-opacity=".4" stroke-width="3"/>
          <path d="m280 220 46 174-40 12-51-156z" fill="url(#echoSuit)" stroke="#36a8ff" stroke-opacity=".4" stroke-width="3"/>
          <path d="M141 199c34-30 104-30 138 0l29 185-54 55h-88l-54-55z" fill="url(#echoSuit)" stroke="#426b6d" stroke-width="3"/>
          <path d="m147 219 63 40 63-40-17 137-46 38-46-38z" fill="#10262a" stroke="url(#echoGlow)" stroke-width="4"/>
          <path d="M166 430h43l-14 131h-52zM211 430h43l23 131h-52z" fill="url(#echoSuit)" stroke="#3f6c6d" stroke-width="3"/>
          <path d="M137 551h62l-7 28h-82c-6-18 6-28 27-28ZM223 551h61c22 0 34 10 29 28h-87z" fill="#070b0d" stroke="#72ffbd" stroke-opacity=".45" stroke-width="3"/>
          <path d="M145 154c0-84 132-88 132 0l-24 61h-86z" fill="#0b1116" stroke="#2f666b" stroke-width="4"/>
          <path d="M157 153c7-58 97-62 107-2l-19 48h-68z" fill="#b9785e"/>
          <path d="M161 153h99l-13 36h-76z" fill="#030709" stroke="url(#echoGlow)" stroke-width="4"/>
          <path d="M183 171h54" stroke="#72ffbd" stroke-width="5" stroke-linecap="round"/>
          <circle cx="330" cy="239" r="34" fill="#0a1115" stroke="url(#echoGlow)" stroke-width="4"/>
          <circle cx="330" cy="239" r="9" fill="#72ffbd"/>
          <path d="m306 215-21-20M354 215l21-20M306 263l-21 20M354 263l21 20" stroke="#72ffbd" stroke-width="4" stroke-linecap="round"/>
          <circle cx="210" cy="302" r="14" fill="#071012" stroke="url(#echoGlow)" stroke-width="4"/>
          <text x="210" y="307" text-anchor="middle" fill="#c7ffe6" font-size="13" font-weight="900">PL</text>
        </svg>`
    }
  };

  const makeParticles = () => Array.from({ length: reducedMotion ? 8 : 24 }, (_, index) => {
    const left = (index * 37) % 100;
    const delay = (index % 9) * -0.7;
    const duration = 5 + (index % 7);
    const size = 2 + (index % 4);
    return `<i style="--x:${left}%;--delay:${delay}s;--duration:${duration}s;--size:${size}px"></i>`;
  }).join('');

  const renderStats = (stats) => Object.entries(stats).map(([name, value]) => `
    <div class="arena-stat">
      <span>${name}</span><b>${value}</b>
      <div><i style="--value:${value}%"></i></div>
    </div>`).join('');

  const oldCard = document.querySelector('.token-card');
  if (oldCard) {
    const arena = document.createElement('section');
    arena.className = 'game-arena reveal';
    arena.dataset.gameArena = '';
    arena.setAttribute('aria-label', 'Interactive original Players League VIP character roster');
    arena.innerHTML = `
      <div class="arena-grid" aria-hidden="true"></div>
      <div class="arena-scan" aria-hidden="true"></div>
      <div class="arena-particles" aria-hidden="true">${makeParticles()}</div>
      <header class="arena-header">
        <div><small>PLVIP // FOUNDING SEASON</small><strong>Choose your league class</strong></div>
        <button class="arena-sound" type="button" data-sound-toggle aria-pressed="false" aria-label="Enable interface sounds"><span aria-hidden="true">◖</span> Sound off</button>
      </header>
      <div class="arena-body">
        <div class="arena-stage" data-arena-stage>
          <div class="arena-rings" aria-hidden="true"><i></i><i></i><i></i></div>
          <div class="arena-character" data-character-visual></div>
          <div class="arena-token" aria-hidden="true"><img src="assets/plvip-logo.png" alt=""><span>PLVIP</span></div>
          <div class="arena-platform" aria-hidden="true"></div>
        </div>
        <aside class="arena-hud" data-character-hud>
          <div class="arena-classline"><span data-character-index>01</span><b data-character-role>Speed / Recon</b></div>
          <p class="arena-rank" data-character-rank>PATHFINDER CLASS</p>
          <h2 data-character-name>Nova Runner</h2>
          <p class="arena-description" data-character-description></p>
          <div class="arena-stats" data-character-stats></div>
          <div class="arena-abilities" data-character-abilities></div>
          <div class="arena-mission"><small>ACTIVE MISSION</small><strong data-character-mission></strong></div>
          <div class="arena-actions">
            <a class="arena-action arena-action--primary" href="#join">Join founding season</a>
            <a class="arena-action" href="#token">Inspect PLVIP</a>
          </div>
        </aside>
      </div>
      <div class="arena-roster" role="tablist" aria-label="Choose a league character">
        <button type="button" data-character="nova" class="is-active" role="tab" aria-selected="true"><span>01</span><strong>Nova</strong><small>Runner</small></button>
        <button type="button" data-character="aegis" role="tab" aria-selected="false"><span>02</span><strong>Aegis</strong><small>Titan</small></button>
        <button type="button" data-character="echo" role="tab" aria-selected="false"><span>03</span><strong>Echo</strong><small>Byte</small></button>
      </div>`;
    oldCard.replaceWith(arena);
  }

  const arena = document.querySelector('[data-game-arena]');
  if (!arena) return;

  const elements = {
    stage: arena.querySelector('[data-arena-stage]'),
    visual: arena.querySelector('[data-character-visual]'),
    index: arena.querySelector('[data-character-index]'),
    role: arena.querySelector('[data-character-role]'),
    rank: arena.querySelector('[data-character-rank]'),
    name: arena.querySelector('[data-character-name]'),
    description: arena.querySelector('[data-character-description]'),
    stats: arena.querySelector('[data-character-stats]'),
    abilities: arena.querySelector('[data-character-abilities]'),
    mission: arena.querySelector('[data-character-mission]'),
    sound: arena.querySelector('[data-sound-toggle]')
  };

  let activeCharacter = 'nova';
  let soundEnabled = false;
  let audioContext = null;

  const ensureAudio = () => {
    if (!audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioContext = new AudioContext();
    }
    if (audioContext?.state === 'suspended') audioContext.resume();
    return audioContext;
  };

  const tone = (frequency, duration = 0.06, type = 'sine', volume = 0.025, delay = 0) => {
    if (!soundEnabled) return;
    const context = ensureAudio();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  };

  const playSelect = () => {
    tone(240, 0.07, 'square', 0.02);
    tone(480, 0.1, 'sine', 0.025, 0.04);
  };

  const renderCharacter = (key, announce = true) => {
    const data = characterData[key];
    if (!data) return;
    activeCharacter = key;
    arena.style.setProperty('--arena-accent', data.accent);
    arena.style.setProperty('--arena-accent-2', data.accent2);
    elements.visual.innerHTML = data.svg;
    elements.index.textContent = data.index;
    elements.role.textContent = data.role;
    elements.rank.textContent = `${data.rank.toUpperCase()} CLASS`;
    elements.name.textContent = data.name;
    elements.description.textContent = data.description;
    elements.stats.innerHTML = renderStats(data.stats);
    elements.abilities.innerHTML = data.abilities.map((ability) => `<span>${ability}</span>`).join('');
    elements.mission.textContent = data.mission;

    arena.querySelectorAll('[data-character]').forEach((button) => {
      const selected = button.dataset.character === key;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', String(selected));
    });

    elements.visual.classList.remove('is-entering');
    void elements.visual.offsetWidth;
    elements.visual.classList.add('is-entering');

    if (announce) playSelect();
  };

  arena.querySelectorAll('[data-character]').forEach((button) => {
    button.addEventListener('click', () => renderCharacter(button.dataset.character));
    if (supportsHover) {
      button.addEventListener('mouseenter', () => tone(170, 0.045, 'triangle', 0.012));
    }
  });

  elements.sound?.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    elements.sound.setAttribute('aria-pressed', String(soundEnabled));
    elements.sound.classList.toggle('is-on', soundEnabled);
    elements.sound.innerHTML = soundEnabled
      ? '<span aria-hidden="true">◗</span> Sound on'
      : '<span aria-hidden="true">◖</span> Sound off';
    elements.sound.setAttribute('aria-label', soundEnabled ? 'Disable interface sounds' : 'Enable interface sounds');
    if (soundEnabled) {
      ensureAudio();
      tone(330, 0.08, 'sine', 0.025);
      tone(660, 0.12, 'sine', 0.025, 0.06);
    }
  });

  arena.querySelectorAll('a, button').forEach((control) => {
    if (supportsHover && !control.hasAttribute('data-character')) {
      control.addEventListener('mouseenter', () => tone(130, 0.035, 'triangle', 0.009));
    }
    control.addEventListener('pointerdown', () => tone(210, 0.045, 'square', 0.015));
  });

  if (!reducedMotion && supportsHover) {
    arena.addEventListener('pointermove', (event) => {
      const bounds = arena.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      arena.style.setProperty('--pointer-x', x.toFixed(3));
      arena.style.setProperty('--pointer-y', y.toFixed(3));
    });
    arena.addEventListener('pointerleave', () => {
      arena.style.setProperty('--pointer-x', 0);
      arena.style.setProperty('--pointer-y', 0);
    });
  }

  const heroCopy = document.querySelector('.hero-grid > .reveal');
  if (heroCopy && !heroCopy.querySelector('.hero-game-meta')) {
    const meta = document.createElement('div');
    meta.className = 'hero-game-meta';
    meta.innerHTML = '<span>Original game universe</span><span>Competitive identity</span><span>Built on Base</span>';
    const actions = heroCopy.querySelector('.actions');
    heroCopy.insertBefore(meta, actions || null);
  }

  const facts = document.querySelector('.facts');
  if (facts && !document.querySelector('.game-rank-strip')) {
    const strip = document.createElement('section');
    strip.className = 'game-rank-strip';
    strip.setAttribute('aria-label', 'Players League game-system vision');
    strip.innerHTML = `
      <article data-rank="01"><b>Choose</b><span>Your league identity</span></article>
      <article data-rank="02"><b>Compete</b><span>Challenges and rankings</span></article>
      <article data-rank="03"><b>Earn</b><span>Recognition and badges</span></article>
      <article data-rank="04"><b>Rise</b><span>Build your player legacy</span></article>`;
    facts.insertAdjacentElement('afterend', strip);
  }

  const showLoader = !sessionStorage.getItem('plvip_game_loaded');
  if (showLoader) {
    sessionStorage.setItem('plvip_game_loaded', '1');
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
        <p class="game-loader__status">Loading founding season…</p>
        <div class="game-loader__bar" aria-hidden="true"><i></i></div>
      </div>`;
    document.body.prepend(loader);
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => loader.querySelector('.game-loader__bar i')?.classList.add('is-ready'), 40);
    window.setTimeout(() => {
      loader.classList.add('is-complete');
      document.body.style.overflow = '';
      window.setTimeout(() => loader.remove(), 500);
    }, reducedMotion ? 180 : 1050);
  }

  renderCharacter(activeCharacter, false);
})();
