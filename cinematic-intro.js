(() => {
  'use strict';

  if (!/\/(?:index\.html)?$/.test(window.location.pathname)) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const forceReplay = new URLSearchParams(window.location.search).get('intro') === '1';
  const INTRO_DURATION_MS = reducedMotion ? 6500 : 13200;
  const INTRO_DURATION_SECONDS = reducedMotion ? 6 : 13;
  const AUDIO_URL = 'assets/plvip-dialup-intro.mp3?v=20260807-dialup2';

  const sessionGet = (key) => {
    try { return sessionStorage.getItem(key); } catch (_) { return null; }
  };
  const sessionSet = (key, value) => {
    try { sessionStorage.setItem(key, value); } catch (_) {}
  };

  sessionSet('plvip_game_loaded', '1');

  const hasPlayed = sessionGet('plvip-intro-played') === '1';
  if (hasPlayed && !forceReplay) return;

  const introAudio = new Audio(AUDIO_URL);
  introAudio.preload = 'none';
  introAudio.volume = 1;
  introAudio.setAttribute('playsinline', '');

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

    <div class="plvip-intro__footer">
      <p class="plvip-intro__status"><i></i><span data-intro-status>Dialling the league network</span></p>
      <p class="plvip-intro__counter"><b data-intro-counter>00</b><span>/ ${String(INTRO_DURATION_SECONDS).padStart(2, '0')}</span></p>
    </div>
    <div class="plvip-intro__progress" aria-hidden="true"><i></i></div>`;

  document.body.prepend(intro);
  document.body.classList.add('plvip-intro-active');
  document.documentElement.style.overflow = 'hidden';

  const lines = [...intro.querySelectorAll('[data-intro-line]')];
  const skipButton = intro.querySelector('[data-intro-skip]');
  const statusText = intro.querySelector('[data-intro-status]');
  const counter = intro.querySelector('[data-intro-counter]');
  const kicker = intro.querySelector('[data-intro-kicker]');
  const progressBar = intro.querySelector('.plvip-intro__progress i');

  let timers = [];
  let counterTimer = null;
  let fallbackContext = null;
  let fallbackMaster = null;
  let finished = false;
  let soundStarted = false;
  let introStartedAt = 0;

  if (progressBar) progressBar.style.animationDuration = `${INTRO_DURATION_MS}ms`;

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
    if (counterTimer) clearInterval(counterTimer);
    counterTimer = null;
  };

  const stopAudio = () => {
    if (!introAudio.paused) {
      const fadeStarted = performance.now();
      const initialVolume = introAudio.volume;
      const fade = () => {
        const progress = Math.min(1, (performance.now() - fadeStarted) / 360);
        introAudio.volume = initialVolume * (1 - progress);
        if (progress < 1) requestAnimationFrame(fade);
        else {
          introAudio.pause();
          introAudio.currentTime = 0;
          introAudio.volume = 1;
        }
      };
      requestAnimationFrame(fade);
    }

    if (fallbackContext && fallbackContext.state !== 'closed') {
      const now = fallbackContext.currentTime;
      if (fallbackMaster) {
        fallbackMaster.gain.cancelScheduledValues(now);
        fallbackMaster.gain.setValueAtTime(Math.max(fallbackMaster.gain.value || 0.3, 0.0001), now);
        fallbackMaster.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      }
      setTimeout(() => fallbackContext?.close().catch(() => {}), 500);
    }
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimers();
    removeSoundUnlockListeners();
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

  const scheduleFallbackTone = (frequency, start, duration, volume, type = 'sine', endFrequency = null) => {
    if (!fallbackContext || !fallbackMaster) return;
    const oscillator = fallbackContext.createOscillator();
    const gain = fallbackContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.018, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(fallbackMaster);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  };

  const scheduleFallbackNoise = (start, duration = 0.18, volume = 0.08) => {
    if (!fallbackContext || !fallbackMaster) return;
    const sampleRate = fallbackContext.sampleRate;
    const buffer = fallbackContext.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      const envelope = Math.pow(1 - i / data.length, 1.8);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
    const source = fallbackContext.createBufferSource();
    const filter = fallbackContext.createBiquadFilter();
    const gain = fallbackContext.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 2400;
    filter.Q.value = 0.65;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(fallbackMaster);
    source.start(start);
  };

  const startFallbackDialup = async () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      fallbackContext = new AudioContextClass();
      await fallbackContext.resume();

      fallbackMaster = fallbackContext.createGain();
      const compressor = fallbackContext.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 12;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.22;
      fallbackMaster.gain.value = 0.52;
      fallbackMaster.connect(compressor).connect(fallbackContext.destination);

      const t = fallbackContext.currentTime + 0.03;
      scheduleFallbackTone(350, t, 0.72, 0.28);
      scheduleFallbackTone(440, t, 0.72, 0.24);
      const digits = [[697, 1209], [697, 1336], [770, 1209], [852, 1477], [770, 1336], [941, 1209]];
      digits.forEach(([low, high], index) => {
        const at = t + 0.75 + index * 0.135;
        scheduleFallbackTone(low, at, 0.095, 0.28);
        scheduleFallbackTone(high, at, 0.095, 0.28);
      });
      scheduleFallbackTone(2100, t + 2.25, 0.65, 0.32, 'sine', 1980);
      scheduleFallbackTone(1200, t + 2.48, 0.58, 0.30, 'sawtooth', 2750);
      scheduleFallbackNoise(t + 3.05, 0.25, 0.14);
      for (let i = 0; i < 28; i += 1) {
        const at = t + 3.35 + i * 0.205;
        const base = [1070, 1270, 1650, 1850, 2200, 2400][i % 6];
        scheduleFallbackTone(base, at, 0.13, 0.20, i % 2 ? 'square' : 'sawtooth', base + (i % 3 === 0 ? 520 : 180));
        if (i % 4 === 0) scheduleFallbackNoise(at + 0.055, 0.10, 0.08);
      }
      scheduleFallbackTone(980, t + 8.95, 1.05, 0.27, 'square', 2380);
      scheduleFallbackTone(1800, t + 9.70, 0.78, 0.25, 'sine', 2050);
      scheduleFallbackTone(2400, t + 9.84, 0.62, 0.20, 'triangle', 2680);
      scheduleFallbackNoise(t + 10.55, 0.32, 0.12);
      scheduleFallbackTone(880, t + 11.35, 1.30, 0.19, 'sine', 1760);
      scheduleFallbackTone(1320, t + 11.42, 1.18, 0.13, 'triangle', 2640);
      return true;
    } catch (error) {
      console.warn('PLVIP fallback dial-up sound unavailable', error);
      return false;
    }
  };

  const startDialupSound = async (syncToElapsed = false) => {
    try {
      introAudio.preload = 'auto';
      introAudio.volume = 1;
      if (syncToElapsed && introStartedAt) {
        const elapsed = Math.max(0, (performance.now() - introStartedAt) / 1000);
        introAudio.currentTime = elapsed;
      } else {
        introAudio.currentTime = 0;
      }
      await introAudio.play();
      return true;
    } catch (error) {
      console.info('PLVIP autoplay sound blocked until first interaction.');
      return false;
    }
  };

  const removeSoundUnlockListeners = () => {
    window.removeEventListener('pointerdown', unlockSound);
    window.removeEventListener('touchstart', unlockSound);
    window.removeEventListener('keydown', unlockSound);
  };

  const unlockSound = async () => {
    if (finished || soundStarted) {
      removeSoundUnlockListeners();
      return;
    }
    soundStarted = await startDialupSound(true);
    intro.classList.toggle('has-sound', soundStarted);
    if (soundStarted) removeSoundUnlockListeners();
  };

  const armSoundUnlock = () => {
    window.addEventListener('pointerdown', unlockSound, { passive: true });
    window.addEventListener('touchstart', unlockSound, { passive: true });
    window.addEventListener('keydown', unlockSound);
  };

  const startCounter = () => {
    const startedAt = performance.now();
    const update = () => {
      const elapsed = Math.min(INTRO_DURATION_SECONDS, (performance.now() - startedAt) / 1000);
      if (counter) counter.textContent = String(Math.floor(elapsed)).padStart(2, '0');
    };
    update();
    counterTimer = setInterval(update, 100);
  };

  const run = async () => {
    if (intro.classList.contains('is-running')) return;

    intro.classList.add('is-running');
    introStartedAt = performance.now();
    setStatus('Dialling the league network');

    soundStarted = await startDialupSound(false);
    intro.classList.toggle('has-sound', soundStarted);
    if (!soundStarted) armSoundUnlock();

    startCounter();

    const sequence = reducedMotion
      ? [[0, 0], [3, 2100], [4, 4200]]
      : [[0, 250], [1, 2650], [2, 5050], [3, 7450], [4, 9850]];

    sequence.forEach(([index, delay]) => timers.push(setTimeout(() => showLine(index), delay)));

    const statusSequence = reducedMotion
      ? [['Reading player signal', 700], ['Recording player legacy', 2800], ['Players League VIP online', 4700]]
      : [
          ['Dial tone detected', 420],
          ['Negotiating player identity', 2850],
          ['Linking competition network', 5250],
          ['Recording player legacy', 7650],
          ['Players League VIP online', 10100]
        ];

    statusSequence.forEach(([text, delay]) => timers.push(setTimeout(() => setStatus(text), delay)));
    timers.push(setTimeout(finish, INTRO_DURATION_MS));
  };

  skipButton.addEventListener('click', finish);

  intro.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') finish();
  });

  requestAnimationFrame(() => run());
})();