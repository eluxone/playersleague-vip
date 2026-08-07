(() => {
  'use strict';

  if (!/\/(?:index\.html)?$/.test(window.location.pathname)) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const forceReplay = new URLSearchParams(window.location.search).get('intro') === '1';
  const hasPlayed = sessionStorage.getItem('plvip-intro-played') === '1';
  if (hasPlayed && !forceReplay) return;

  const intro = document.createElement('div');
  intro.className = 'plvip-intro';
  intro.setAttribute('role', 'dialog');
  intro.setAttribute('aria-label', 'Players League VIP cinematic introduction');
  intro.innerHTML = `
    <div class="plvip-intro__grid" aria-hidden="true"></div>
    <div class="plvip-intro__noise" aria-hidden="true"></div>
    <div class="plvip-intro__vignette" aria-hidden="true"></div>
    <div class="plvip-intro__top">
      <div class="plvip-intro__brand"><img src="assets/plvip-logo.png" alt=""><span><strong>Players League</strong><small>VIP</small></span></div>
      <button class="plvip-intro__skip" type="button" data-intro-skip>Skip intro</button>
    </div>
    <div class="plvip-intro__stage">
      <div class="plvip-intro__coin-wrap" aria-hidden="true">
        <i class="plvip-intro__ring"></i><i class="plvip-intro__ring"></i><i class="plvip-intro__ring"></i>
        <img class="plvip-intro__coin" src="assets/plvip-logo.png" alt="">
      </div>
      <div class="plvip-intro__copy" aria-live="polite">
        <p class="plvip-intro__eyebrow">FOUNDING SEASON // BASE</p>
        <p class="plvip-intro__line" data-intro-line="0">Every game starts<br>with a <em>player.</em></p>
        <p class="plvip-intro__line" data-intro-line="1">Every player builds<br>a <em>story.</em></p>
        <p class="plvip-intro__line" data-intro-line="2">What if that story<br><em>didn't reset?</em></p>
        <div class="plvip-intro__line plvip-intro__final" data-intro-line="3"><img src="assets/plvip-logo.png" alt=""><strong>Players League VIP</strong><span>PLAY. COMPETE. RISE.</span></div>
      </div>
    </div>
    <div class="plvip-intro__gate" data-intro-gate>
      <button class="plvip-intro__enter" type="button" data-intro-sound>Enter with sound</button>
      <button class="plvip-intro__silent" type="button" data-intro-silent>Continue silently</button>
      <p class="plvip-intro__hint">Sound starts only after your tap because modern browsers block automatic audio.</p>
    </div>
    <div class="plvip-intro__progress" aria-hidden="true"><i></i></div>`;

  document.body.prepend(intro);
  document.documentElement.style.overflow = 'hidden';

  const lines = [...intro.querySelectorAll('[data-intro-line]')];
  const gate = intro.querySelector('[data-intro-gate]');
  const soundButton = intro.querySelector('[data-intro-sound]');
  const silentButton = intro.querySelector('[data-intro-silent]');
  const skipButton = intro.querySelector('[data-intro-skip]');
  let timers = [];
  let audioContext = null;
  let master = null;
  let finished = false;

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimers();
    sessionStorage.setItem('plvip-intro-played', '1');
    intro.classList.add('is-leaving');
    document.documentElement.style.overflow = '';
    timers.push(setTimeout(() => intro.remove(), 760));
    if (audioContext && audioContext.state !== 'closed') {
      const stopAt = audioContext.currentTime + 0.8;
      if (master) {
        master.gain.cancelScheduledValues(audioContext.currentTime);
        master.gain.setValueAtTime(master.gain.value || 0.18, audioContext.currentTime);
        master.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      }
      setTimeout(() => audioContext.close().catch(() => {}), 1000);
    }
  };

  const showLine = (index) => {
    lines.forEach((line, lineIndex) => {
      line.classList.toggle('is-active', lineIndex === index);
      line.classList.toggle('is-out', lineIndex < index);
    });
  };

  const tone = (frequency, start, duration, volume, type = 'sine', endFrequency = null) => {
    if (!audioContext || !master) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(.08, duration * .2));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + duration + .05);
  };

  const noiseHit = (start, duration = .22, volume = .055) => {
    if (!audioContext || !master) return;
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    src.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = 950;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(filter).connect(gain).connect(master);
    src.start(start);
  };

  const startSoundscape = async () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioContext = new AudioCtx();
      await audioContext.resume();
      master = audioContext.createGain();
      master.gain.value = 0.22;
      master.connect(audioContext.destination);
      const t = audioContext.currentTime + .04;
      tone(46, t, 6.4, .06, 'sine', 62);
      tone(92, t, 6.3, .02, 'triangle', 124);
      noiseHit(t + .15, .28, .045);
      tone(180, t + 1.55, .55, .045, 'sine', 280);
      noiseHit(t + 1.6, .18, .035);
      tone(220, t + 3.05, .6, .055, 'triangle', 360);
      noiseHit(t + 3.1, .2, .04);
      tone(310, t + 4.65, .9, .055, 'sine', 620);
      tone(620, t + 5.45, 1.15, .06, 'sine', 930);
      tone(930, t + 5.55, 1.05, .025, 'triangle', 1240);
      noiseHit(t + 5.35, .32, .05);
    } catch (error) {
      console.warn('PLVIP intro sound unavailable', error);
    }
  };

  const run = async (withSound) => {
    gate.classList.add('is-hidden');
    intro.classList.add('is-running');
    if (withSound) await startSoundscape();
    const sequence = reducedMotion
      ? [[0, 0], [1, 900], [2, 1800], [3, 2700]]
      : [[0, 150], [1, 1700], [2, 3250], [3, 5000]];
    sequence.forEach(([index, delay]) => timers.push(setTimeout(() => showLine(index), delay)));
    timers.push(setTimeout(finish, reducedMotion ? 4100 : 7000));
  };

  soundButton.addEventListener('click', () => run(true), { once: true });
  silentButton.addEventListener('click', () => run(false), { once: true });
  skipButton.addEventListener('click', finish);
  intro.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') finish();
  });
  requestAnimationFrame(() => soundButton.focus({ preventScroll: true }));
})();
