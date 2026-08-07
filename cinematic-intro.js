(() => {
  'use strict';

  if (!/\/(?:index\.html)?$/.test(window.location.pathname)) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const forceReplay = new URLSearchParams(window.location.search).get('intro') === '1';
  const duration = reducedMotion ? 8500 : 16000;

  const safeGet = (key) => { try { return sessionStorage.getItem(key); } catch (_) { return null; } };
  const safeSet = (key, value) => { try { sessionStorage.setItem(key, value); } catch (_) {} };

  safeSet('plvip_game_loaded', '1');
  if (safeGet('plvip-intro-played') === '1' && !forceReplay) return;

  const photos = [
    'https://images.unsplash.com/photo-1771736007855-6cc95f244a85?auto=format&fit=crop&w=2200&q=84',
    'https://images.unsplash.com/photo-1769029174090-f72261110697?auto=format&fit=crop&w=2200&q=84',
    'https://images.unsplash.com/photo-1582112742477-85ec4c227ec5?auto=format&fit=crop&w=2200&q=84'
  ];

  const intro = document.createElement('div');
  intro.className = 'plvip-film';
  intro.setAttribute('role', 'dialog');
  intro.setAttribute('aria-modal', 'true');
  intro.setAttribute('aria-label', 'Players League VIP interactive cinematic introduction');
  intro.innerHTML = `
    <canvas class="plvip-film__matrix" aria-hidden="true"></canvas>
    <div class="plvip-film__photos" aria-hidden="true">
      ${photos.map((url, index) => `<div class="plvip-film__photo p${index + 1}" style="background-image:url('${url}')"></div>`).join('')}
    </div>
    <div class="plvip-film__shade" aria-hidden="true"></div>
    <div class="plvip-film__grain" aria-hidden="true"></div>
    <div class="plvip-film__cash" data-cash aria-hidden="true"></div>

    <header class="plvip-film__top">
      <div class="plvip-film__brand"><img src="assets/plvip-logo.png" alt=""><span><b>PLAYERS LEAGUE</b><small>VIP // FOUNDING SEASON</small></span></div>
      <button type="button" class="plvip-film__skip" data-skip>SKIP</button>
    </header>

    <main class="plvip-film__stage">
      <section class="plvip-film__scene is-active" data-scene="0">
        <p>THE OLD PATH</p>
        <h1>ESCAPE<br><em>THE GRIND.</em></h1>
        <span>Stop living on somebody else's scoreboard.</span>
      </section>
      <section class="plvip-film__scene" data-scene="1">
        <p>THE NEXT MOVE</p>
        <h1>BUILD YOUR<br><em>OWN FUTURE.</em></h1>
        <span>Freedom starts with what you choose to build.</span>
      </section>
      <section class="plvip-film__scene" data-scene="2">
        <p>THE QUESTION</p>
        <h1>WHAT IS THE<br><em>MEANING OF PLAY?</em></h1>
      </section>
      <section class="plvip-film__scene" data-scene="3">
        <p>MORE THAN A NUMBER</p>
        <h1>A SCORE?<br>A WIN?<br><em>A LEGACY?</em></h1>
      </section>
      <section class="plvip-film__scene plvip-film__scene--final" data-scene="4">
        <img src="assets/plvip-logo.png" alt="Players League VIP">
        <p>LEAGUE // ONLINE</p>
        <h1>PLAYERS LEAGUE VIP</h1>
        <span>YOUR GAME. YOUR LEAGUE. YOUR LEGACY.</span>
      </section>
    </main>

    <aside class="plvip-film__rail" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></aside>
    <footer class="plvip-film__footer">
      <div class="plvip-film__sound"><i></i><span data-sound-status>CONNECTING AUDIO</span></div>
      <div class="plvip-film__hint" data-hint>MOVE YOUR CURSOR</div>
      <div class="plvip-film__time"><b data-time>00</b><span>/16</span></div>
    </footer>
    <div class="plvip-film__progress"><i data-progress></i></div>`;

  document.body.prepend(intro);
  document.body.classList.add('plvip-intro-active');
  document.documentElement.style.overflow = 'hidden';

  const canvas = intro.querySelector('.plvip-film__matrix');
  const ctx2d = canvas.getContext('2d');
  const cashLayer = intro.querySelector('[data-cash]');
  const scenes = [...intro.querySelectorAll('[data-scene]')];
  const rail = [...intro.querySelectorAll('.plvip-film__rail i')];
  const timeEl = intro.querySelector('[data-time]');
  const soundStatus = intro.querySelector('[data-sound-status]');
  const hint = intro.querySelector('[data-hint]');
  const progress = intro.querySelector('[data-progress]');
  const skip = intro.querySelector('[data-skip]');

  let finished = false;
  let startedAt = performance.now();
  let raf = 0;
  let audioContext = null;
  let master = null;
  let soundStarted = false;
  let matrixDrops = [];
  let pointerX = 0;
  let pointerY = 0;

  const billCount = reducedMotion ? 8 : 24;
  for (let i = 0; i < billCount; i += 1) {
    const bill = document.createElement('i');
    bill.className = 'plvip-film__bill';
    bill.innerHTML = '<span>100</span><b>$</b><span>100</span>';
    bill.style.setProperty('--x', `${(i * 41) % 106 - 3}%`);
    bill.style.setProperty('--delay', `${-(i % 9) * 0.72}s`);
    bill.style.setProperty('--dur', `${5.6 + (i % 7) * 0.55}s`);
    bill.style.setProperty('--spin', `${-24 + (i % 8) * 9}deg`);
    bill.style.setProperty('--scale', `${0.62 + (i % 5) * 0.13}`);
    cashLayer.appendChild(bill);
  }

  const resizeMatrix = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cols = Math.ceil(innerWidth / 28);
    matrixDrops = Array.from({ length: cols }, (_, i) => ((i * 67) % Math.max(innerHeight, 1)) / 28);
  };

  const drawMatrix = () => {
    if (!ctx2d || reducedMotion || finished) return;
    ctx2d.fillStyle = 'rgba(1,3,7,.09)';
    ctx2d.fillRect(0, 0, innerWidth, innerHeight);
    ctx2d.font = '11px monospace';
    for (let i = 0; i < matrixDrops.length; i += 1) {
      const x = i * 28;
      const y = matrixDrops[i] * 28;
      const char = Math.random() > .5 ? String.fromCharCode(0x30A0 + Math.random() * 70) : String(Math.floor(Math.random() * 10));
      const distance = Math.hypot(x - (pointerX + .5) * innerWidth, y - (pointerY + .5) * innerHeight);
      ctx2d.fillStyle = distance < 170 ? 'rgba(228,185,78,.48)' : 'rgba(65,255,154,.15)';
      ctx2d.fillText(char, x, y);
      matrixDrops[i] += .32 + (i % 4) * .04;
      if (y > innerHeight && Math.random() > .975) matrixDrops[i] = 0;
    }
    raf = requestAnimationFrame(drawMatrix);
  };

  resizeMatrix();
  window.addEventListener('resize', resizeMatrix, { passive: true });
  if (!reducedMotion) drawMatrix();

  const tone = (freq, at, length, gainValue, type = 'sine', end = null) => {
    if (!audioContext || !master) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (end) osc.frequency.exponentialRampToValueAtTime(end, at + length);
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(gainValue, at + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, at + length);
    osc.connect(gain).connect(master);
    osc.start(at);
    osc.stop(at + length + .04);
  };

  const noise = (at, length = .16, gainValue = .11) => {
    if (!audioContext || !master) return;
    const buffer = audioContext.createBuffer(1, Math.floor(audioContext.sampleRate * length), audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.8);
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 2200;
    filter.Q.value = .8;
    gain.gain.setValueAtTime(gainValue, at);
    gain.gain.exponentialRampToValueAtTime(.0001, at + length);
    source.connect(filter).connect(gain).connect(master);
    source.start(at);
  };

  const scheduleDialup = () => {
    const t = audioContext.currentTime + .03;
    tone(350, t, .72, .23); tone(440, t, .72, .20);
    const digits = [[697,1209],[770,1336],[852,1477],[697,1336],[770,1209],[941,1336]];
    digits.forEach(([a,b], i) => { tone(a,t+.8+i*.13,.09,.22); tone(b,t+.8+i*.13,.09,.22); });
    tone(2100,t+2.0,.74,.28,'sine',1760);
    tone(950,t+2.35,.8,.25,'sawtooth',2780);
    noise(t+2.9,.28,.15);
    for (let i = 0; i < 42; i += 1) {
      const at = t + 3.2 + i * .19;
      const base = [1070,1270,1650,1850,2200,2400][i % 6];
      tone(base, at, .14, .16, i % 2 ? 'square' : 'sawtooth', base + 160 + (i % 3) * 220);
      if (i % 4 === 0) noise(at+.05,.09,.07);
    }
    tone(760,t+11.2,1.5,.22,'triangle',1520);
    tone(1200,t+12.0,1.35,.19,'sine',2400);
    tone(620,t+13.5,2.0,.13,'sine',980);
  };

  const startSound = async () => {
    if (soundStarted || finished) return true;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      if (!audioContext) {
        audioContext = new AudioCtx();
        master = audioContext.createGain();
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.ratio.value = 5;
        master.gain.value = .72;
        master.connect(compressor).connect(audioContext.destination);
      }
      await audioContext.resume();
      if (audioContext.state !== 'running') return false;
      soundStarted = true;
      intro.classList.add('has-sound');
      soundStatus.textContent = 'AUDIO ONLINE';
      hint.textContent = 'MOVE YOUR CURSOR';
      scheduleDialup();
      return true;
    } catch (_) {
      return false;
    }
  };

  const unlockSound = async () => {
    if (await startSound()) {
      window.removeEventListener('pointerdown', unlockSound);
      window.removeEventListener('touchstart', unlockSound);
      window.removeEventListener('keydown', unlockSound);
    }
  };

  startSound().then((ok) => {
    if (!ok) {
      soundStatus.textContent = 'TAP ANYWHERE FOR SOUND';
      hint.textContent = 'CLICK / TAP TO ACTIVATE';
      window.addEventListener('pointerdown', unlockSound, { passive: true });
      window.addEventListener('touchstart', unlockSound, { passive: true });
      window.addEventListener('keydown', unlockSound);
    }
  });

  const setScene = (index) => {
    scenes.forEach((scene, i) => scene.classList.toggle('is-active', i === index));
    rail.forEach((item, i) => item.classList.toggle('is-active', i === index));
    intro.dataset.scene = String(index);
  };

  const sceneAt = (elapsed) => {
    if (reducedMotion) return elapsed < 2200 ? 0 : elapsed < 4200 ? 2 : elapsed < 6200 ? 3 : 4;
    if (elapsed < 3200) return 0;
    if (elapsed < 6200) return 1;
    if (elapsed < 9300) return 2;
    if (elapsed < 12200) return 3;
    return 4;
  };

  const tick = () => {
    if (finished) return;
    const elapsed = performance.now() - startedAt;
    setScene(sceneAt(elapsed));
    const sec = Math.min(Math.floor(elapsed / 1000), Math.floor(duration / 1000));
    timeEl.textContent = String(sec).padStart(2, '0');
    progress.style.width = `${Math.min(100, elapsed / duration * 100)}%`;
    if (elapsed >= duration) finish();
    else requestAnimationFrame(tick);
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    safeSet('plvip-intro-played','1');
    intro.classList.add('is-leaving');
    document.body.classList.remove('plvip-intro-active');
    document.body.classList.add('plvip-intro-done');
    document.documentElement.style.overflow = '';
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resizeMatrix);
    window.removeEventListener('pointerdown', unlockSound);
    window.removeEventListener('touchstart', unlockSound);
    window.removeEventListener('keydown', unlockSound);
    if (audioContext && audioContext.state !== 'closed') {
      const now = audioContext.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(.0001, master.gain.value), now);
      master.gain.exponentialRampToValueAtTime(.0001, now + .35);
      setTimeout(() => audioContext.close().catch(() => {}), 450);
    }
    setTimeout(() => intro.remove(), 850);
  };

  skip.addEventListener('click', (event) => { event.stopPropagation(); finish(); });
  intro.addEventListener('keydown', (event) => { if (event.key === 'Escape') finish(); });

  if (!reducedMotion) {
    intro.addEventListener('pointermove', (event) => {
      pointerX = event.clientX / innerWidth - .5;
      pointerY = event.clientY / innerHeight - .5;
      intro.style.setProperty('--px', pointerX.toFixed(3));
      intro.style.setProperty('--py', pointerY.toFixed(3));
      intro.style.setProperty('--mx', `${event.clientX}px`);
      intro.style.setProperty('--my', `${event.clientY}px`);
    }, { passive: true });
  }

  requestAnimationFrame(tick);
})();