(() => {
  'use strict';

  if (!/\/(?:index\.html)?$/.test(window.location.pathname)) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const forceReplay = new URLSearchParams(window.location.search).get('intro') === '1';

  const sessionGet = (key) => {
    try { return sessionStorage.getItem(key); } catch (_) { return null; }
  };
  const sessionSet = (key, value) => {
    try { sessionStorage.setItem(key, value); } catch (_) {}
  };

  // The cinematic is the homepage loader. Prevent game-home.js from showing a second loader.
  sessionSet('plvip_game_loaded', '1');

  const hasPlayed = sessionGet('plvip-intro-played') === '1';
  if (hasPlayed && !forceReplay) return;

  const intro = document.createElement('div');
  intro.className = 'plvip-intro';
  intro.setAttribute('role', 'dialog');
  intro.setAttribute('aria-modal', 'true');
  intro.setAttribute('aria-label', 'Players League VIP cinematic introduction');
  intro.innerHTML = `
    <div class="plvip-intro__aurora" aria-hidden="true"></div>
    <div class="plvip-intro__grid" aria-hidden="true"></div>
    <div class="plvip-intro__scan" aria-hidden="true"></div>
    <div class="plvip-intro__noise" aria-hidden="true"></div>
    <div class="plvip-intro__vignette" aria-hidden="true"></div>

    <div class="plvip-intro__top">
      <div class="plvip-intro__brand">
        <img src="assets/plvip-logo.png" alt="">
        <span><strong>Players League</strong><small>VIP // FOUNDING SEASON</small></span>
      </div>
      <div class="plvip-intro__top-actions">
        <span class="plvip-intro__network"><i></i> BASE // 8453</span>
        <button class="plvip-intro__skip" type="button" data-intro-skip>Skip</button>
      </div>
    </div>

    <div class="plvip-intro__stage">
      <div class="plvip-intro__orbit" aria-hidden="true">
        <i></i><i></i><i></i><i></i>
        <div class="plvip-intro__core"><img src="assets/plvip-logo.png" alt=""></div>
      </div>

      <div class="plvip-intro__copy" aria-live="polite">
        <p class="plvip-intro__kicker" data-intro-kicker>SIGNAL // 01</p>
        <p class="plvip-intro__line" data-intro-line="0">What is the<br><em>meaning of play?</em></p>
        <p class="plvip-intro__line" data-intro-line="1">Is it<br><em>a score?</em></p>
        <p class="plvip-intro__line" data-intro-line="2">A rank?<br><em>A win?</em></p>
        <p class="plvip-intro__line" data-intro-line="3">Or the story<br><em>you leave behind?</em></p>
        <div class="plvip-intro__line plvip-intro__final" data-intro-line="4">
          <img src="assets/plvip-logo.png" alt="">
          <strong>Players League VIP</strong>
          <span>Your game. Your league. Your legacy.</span>
        </div>
      </div>

      <div class="plvip-intro__telemetry" aria-hidden="true">
        <span><b>01</b> IDENTITY</span>
        <span><b>02</b> COMPETITION</span>
        <span><b>03</b> RECOGNITION</span>
      </div>
    </div>

    <div class="plvip-intro__gate" data-intro-gate>
      <div class="plvip-intro__gate-mark" aria-hidden="true"><img src="assets/plvip-logo.png" alt=""></div>
      <p class="plvip-intro__gate-eyebrow">PLAYERS LEAGUE VIP</p>
      <h2>Enter the League</h2>
      <p class="plvip-intro__gate-copy">A seven-second cinematic entry into the founding season.</p>
      <div class="plvip-intro__gate-actions">
        <button class="plvip-intro__enter" type="button" data-intro-sound><span>◖</span> Enter with sound</button>
        <button class="plvip-intro__silent" type="button" data-intro-silent>Enter silently</button>
      </div>
      <p class="plvip-intro__hint">Sound begins after your tap. You can skip the sequence at any time.</p>
    </div>

    <div class="plvip-intro__footer">
      <p class="plvip-intro__status"><i></i><span data-intro-status>Awaiting player input</span></p>
      <p class="plvip-intro__counter"><b data-intro-counter>00</b><span>/ 07</span></p>
    </div>
    <div class="plvip-intro__progress" aria-hidden="true"><i></i></div>`;

  document.body.prepend(intro);
  document.body.classList.add('plvip-intro-active');
  document.documentElement.style.overflow = 'hidden';

  const lines = [...intro.querySelectorAll('[data-intro-line]')];
  const gate = intro.querySelector('[data-intro-gate]');
  const soundButton = intro.querySelector('[data-intro-sound]');
  const silentButton = intro.querySelector('[data-intro-silent]');
  const skipButton = intro.querySelector('[data-intro-skip]');
  const statusText = intro.querySelector('[data-intro-status]');
  const counter = intro.querySelector('[data-intro-counter]');
  const kicker = intro.querySelector('[data-intro-kicker]');

  let timers = [];
  let counterTimer = null;
  let audioContext = null;
  let master = null;
  let finished = false;

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
    if (counterTimer) clearInterval(counterTimer);
    counterTimer = null;
  };

  const stopAudio = () => {
    if (!audioContext || audioContext.state === 'closed') return;
    const now = audioContext.currentTime;
    const stopAt = now + 0.65;
    if (master) {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value || 0.18, 0.0001), now);
      master.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    }
    setTimeout(() => audioContext?.close().catch(() => {}), 800);
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimers();
    sessionSet('plvip-intro-played', '1');
    intro.classList.add('is-leaving');
    document.body.classList.remove('plvip-intro-active');
    document.body.classList.add('plvip-intro-done');
    document.documentElement.style.overflow = '';
    stopAudio();
    setTimeout(() => intro.remove(), 900);
  };

  const showLine = (index) => {
    lines.forEach((line, lineIndex) => {
      line.classList.toggle('is-active', lineIndex === index);
      line.classList.toggle('is-out', lineIndex < index);
    });
    if (kicker) kicker.textContent = index === lines.length - 1 ? 'LEAGUE // ONLINE' : `SIGNAL // 0${index + 1}`;
    intro.dataset.phase = String(index);
  };

  const setStatus = (text) => {
    if (statusText) statusText.textContent = text;
  };

  const tone = (frequency, start, duration, volume, type = 'sine', endFrequency = null) => {
    if (!audioContext || !master) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.08, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.06);
  };

  const noiseHit = (start, duration = 0.22, volume = 0.04, highpass = 160) => {
    if (!audioContext || !master) return;
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      const envelope = Math.pow(1 - i / data.length, 2.2);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
    const src = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    src.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(filter).connect(gain).connect(master);
    src.start(start);
  };

  const startSoundscape = async () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      audioContext = new AudioCtx();
      await audioContext.resume();
      master = audioContext.createGain();
      master.gain.value = 0.20;
      master.connect(audioContext.destination);

      const t = audioContext.currentTime + 0.04;
      // Low cinematic bed.
      tone(43.65, t, 6.65, 0.055, 'sine', 55);
      tone(87.3, t, 6.55, 0.018, 'triangle', 110);

      // Four story beats.
      [0.18, 1.48, 2.72, 3.94].forEach((offset, index) => {
        noiseHit(t + offset, 0.18 + index * 0.018, 0.028 + index * 0.004, 180 + index * 60);
        tone(150 + index * 42, t + offset, 0.42, 0.032, 'sine', 235 + index * 70);
      });

      // Final rising sonic logo.
      tone(220, t + 5.05, 1.28, 0.042, 'triangle', 440);
      tone(440, t + 5.18, 1.15, 0.040, 'sine', 880);
      tone(659.25, t + 5.34, 1.02, 0.024, 'sine', 987.77);
      noiseHit(t + 5.08, 0.34, 0.04, 280);
      return true;
    } catch (error) {
      console.warn('PLVIP intro sound unavailable', error);
      return false;
    }
  };

  const startCounter = () => {
    const startedAt = performance.now();
    const update = () => {
      const elapsed = Math.min(7, (performance.now() - startedAt) / 1000);
      if (counter) counter.textContent = String(Math.floor(elapsed)).padStart(2, '0');
    };
    update();
    counterTimer = setInterval(update, 120);
  };

  const run = async (withSound) => {
    if (intro.classList.contains('is-running')) return;
    gate.classList.add('is-hidden');
    intro.classList.add('is-running');
    setStatus(withSound ? 'Starting league signal + audio' : 'Starting league signal');

    let soundStarted = false;
    if (withSound) soundStarted = await startSoundscape();
    intro.classList.toggle('has-sound', soundStarted);
    startCounter();

    const sequence = reducedMotion
      ? [[0, 0], [3, 500], [4, 1050]]
      : [[0, 160], [1, 1480], [2, 2720], [3, 3940], [4, 5260]];

    sequence.forEach(([index, delay]) => timers.push(setTimeout(() => showLine(index), delay)));

    const statusSequence = reducedMotion
      ? [['Player identity ready', 250], ['League online', 1050]]
      : [
          ['Reading player signal', 520],
          ['Building identity layer', 1820],
          ['Linking competition network', 3060],
          ['Recording player legacy', 4300],
          ['Players League VIP online', 5580]
        ];

    statusSequence.forEach(([text, delay]) => timers.push(setTimeout(() => setStatus(text), delay)));
    timers.push(setTimeout(finish, reducedMotion ? 1800 : 7000));
  };

  soundButton.addEventListener('click', () => run(true), { once: true });
  silentButton.addEventListener('click', () => run(false), { once: true });
  skipButton.addEventListener('click', finish);

  intro.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') finish();
  });

  requestAnimationFrame(() => soundButton.focus({ preventScroll: true }));
})();