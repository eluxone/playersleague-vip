(() => {
  'use strict';
  if (!/\/(?:index\.html)?$/.test(window.location.pathname)) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const forceReplay = new URLSearchParams(location.search).get('intro') === '1';
  const get = (k) => { try { return sessionStorage.getItem(k); } catch (_) { return null; } };
  const set = (k,v) => { try { sessionStorage.setItem(k,v); } catch (_) {} };
  set('plvip_game_loaded','1');
  if (get('plvip-intro-played') === '1' && !forceReplay) return;

  const DURATION = reducedMotion ? 9000 : 18200;
  const root = document.createElement('div');
  root.className = 'plvip-intro plvip-intro-v2';
  root.setAttribute('role','dialog');
  root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label','Players League VIP cinematic introduction');

  const bills = Array.from({length: reducedMotion ? 8 : 28},(_,i)=>`<i class="plvip-money" style="--x:${(i*37)%100}%;--d:${(i%9)*-.42}s;--r:${-18+(i%7)*6}deg;--s:${.72+(i%5)*.08}"><b>$</b></i>`).join('');
  root.innerHTML = `
    <div class="plvip-finance-scene" aria-hidden="true">
      <div class="plvip-matrix"></div>
      <div class="plvip-city"></div>
      <div class="plvip-money-rain">${bills}</div>
      <div class="plvip-break"></div>
    </div>
    <div class="plvip-orbit" aria-hidden="true"><i></i><i></i><i></i><img src="assets/plvip-logo.png" alt=""></div>
    <div class="plvip-copy" aria-live="polite">
      <p class="plvip-kicker" data-kicker>FINANCIAL FREEDOM // SIGNAL 01</p>
      <div class="plvip-scene" data-scene="0"><strong>ESCAPE<br><em>THE GRIND.</em></strong><span>YOUR FUTURE SHOULD BE YOURS TO BUILD.</span></div>
      <div class="plvip-scene" data-scene="1"><strong>BUILD YOUR<br><em>OWN FUTURE.</em></strong><span>AMBITION. COMMUNITY. COMPETITION.</span></div>
      <div class="plvip-scene" data-scene="2"><strong>WHAT IS THE<br><em>MEANING OF PLAY?</em></strong></div>
      <div class="plvip-scene" data-scene="3"><strong>IS IT<br><em>A SCORE?</em></strong></div>
      <div class="plvip-scene" data-scene="4"><strong>A RANK?<br><em>A WIN?</em></strong></div>
      <div class="plvip-scene" data-scene="5"><strong>OR THE STORY<br><em>YOU LEAVE BEHIND?</em></strong></div>
      <div class="plvip-scene plvip-final" data-scene="6"><img src="assets/plvip-logo.png" alt=""><strong>PLAYERS LEAGUE VIP</strong><span>YOUR GAME. YOUR LEAGUE. YOUR LEGACY.</span></div>
    </div>
    <div class="plvip-top"><div class="plvip-brand"><img src="assets/plvip-logo.png" alt=""><span><b>PLAYERS LEAGUE</b><small>VIP // FOUNDING SEASON</small></span></div><button class="plvip-skip" type="button">SKIP</button></div>
    <div class="plvip-bottom"><span class="plvip-audio-state" data-audio-state><i></i>CONNECTING AUDIO</span><span class="plvip-counter"><b data-counter>00</b> / 18</span></div>
    <div class="plvip-progress"><i></i></div>`;

  document.body.prepend(root);
  document.body.classList.add('plvip-intro-active');
  document.documentElement.style.overflow='hidden';

  const scenes=[...root.querySelectorAll('[data-scene]')];
  const kicker=root.querySelector('[data-kicker]');
  const counter=root.querySelector('[data-counter]');
  const audioState=root.querySelector('[data-audio-state]');
  const skip=root.querySelector('.plvip-skip');
  let timers=[]; let counterTimer=null; let finished=false; let ctx=null; let master=null; let soundStarted=false;

  const setScene=(n)=>{
    scenes.forEach((s,i)=>{s.classList.toggle('active',i===n);s.classList.toggle('past',i<n)});
    root.dataset.phase=String(n);
    if(kicker){
      kicker.textContent = n < 2 ? `FINANCIAL FREEDOM // SIGNAL 0${n+1}` : n===6 ? 'LEAGUE // ONLINE' : `PLAYER SIGNAL // 0${n-1}`;
    }
  };

  const tone=(f,start,dur,vol,type='sine',end=null)=>{
    if(!ctx||!master)return;
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(f,start);if(end)o.frequency.exponentialRampToValueAtTime(end,start+dur);
    g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(vol,start+.012);g.gain.exponentialRampToValueAtTime(.0001,start+dur);
    o.connect(g).connect(master);o.start(start);o.stop(start+dur+.03);
  };
  const noise=(start,dur=.12,vol=.12)=>{
    if(!ctx||!master)return;
    const b=ctx.createBuffer(1,Math.floor(ctx.sampleRate*dur),ctx.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,1.7);
    const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    s.buffer=b;f.type='bandpass';f.frequency.value=2300;f.Q.value=.7;g.gain.setValueAtTime(vol,start);g.gain.exponentialRampToValueAtTime(.0001,start+dur);s.connect(f).connect(g).connect(master);s.start(start);
  };

  const scheduleDialup=()=>{
    const t=ctx.currentTime+.03;
    tone(350,t,.62,.38);tone(440,t,.62,.33);
    const keys=[[697,1209],[697,1336],[770,1209],[852,1477],[770,1336],[941,1209]];
    keys.forEach(([a,b],i)=>{const x=t+.7+i*.13;tone(a,x,.095,.35);tone(b,x,.095,.35)});
    tone(2100,t+1.65,.72,.42,'sine',1900);tone(1180,t+2.15,.64,.38,'sawtooth',2700);noise(t+2.72,.28,.18);
    for(let i=0;i<46;i++){
      const x=t+3+i*.225,base=[1070,1270,1650,1850,2200,2400][i%6];
      tone(base,x,.14,.28,i%2?'square':'sawtooth',base+(i%3===0?620:220));
      if(i%3===0)noise(x+.05,.085,.105);
    }
    tone(960,t+13.2,1.25,.34,'square',2380);tone(1800,t+14.1,.95,.31,'sine',2100);noise(t+15.1,.32,.16);
    tone(880,t+15.7,1.45,.30,'sine',1760);tone(1320,t+15.82,1.32,.22,'triangle',2640);
  };

  const startSound=async()=>{
    if(soundStarted)return true;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
      ctx=ctx||new AC();await ctx.resume();if(ctx.state!=='running')return false;
      master=ctx.createGain();const comp=ctx.createDynamicsCompressor();comp.threshold.value=-20;comp.ratio.value=5;comp.attack.value=.002;comp.release.value=.18;master.gain.value=.82;master.connect(comp).connect(ctx.destination);
      scheduleDialup();soundStarted=true;root.classList.add('has-sound');if(audioState)audioState.innerHTML='<i></i>AUDIO ONLINE';return true;
    }catch(_){return false}
  };

  const unlock=async()=>{
    if(finished||soundStarted)return;
    const ok=await startSound();
    if(ok)removeUnlock();
  };
  const removeUnlock=()=>{window.removeEventListener('pointerdown',unlock);window.removeEventListener('touchstart',unlock);window.removeEventListener('keydown',unlock)};
  const armUnlock=()=>{window.addEventListener('pointerdown',unlock,{passive:true});window.addEventListener('touchstart',unlock,{passive:true});window.addEventListener('keydown',unlock)};

  const stopSound=()=>{
    if(ctx&&ctx.state!=='closed'&&master){const n=ctx.currentTime;master.gain.cancelScheduledValues(n);master.gain.setValueAtTime(Math.max(master.gain.value,.001),n);master.gain.exponentialRampToValueAtTime(.0001,n+.35);setTimeout(()=>ctx.close().catch(()=>{}),500)}
  };
  const finish=()=>{
    if(finished)return;finished=true;timers.forEach(clearTimeout);if(counterTimer)clearInterval(counterTimer);removeUnlock();set('plvip-intro-played','1');root.classList.add('leaving');document.body.classList.remove('plvip-intro-active');document.body.classList.add('plvip-intro-done');document.documentElement.style.overflow='';stopSound();setTimeout(()=>root.remove(),900);
  };

  skip.addEventListener('click',(e)=>{e.stopPropagation();finish()});
  root.addEventListener('keydown',(e)=>{if(e.key==='Escape')finish()});

  const times=reducedMotion?[[0,0],[1,1300],[2,2600],[4,4200],[6,6100]]:[[0,120],[1,2800],[2,5400],[3,7800],[4,10200],[5,12600],[6,15000]];
  times.forEach(([n,ms])=>timers.push(setTimeout(()=>setScene(n),ms)));
  const started=performance.now();counterTimer=setInterval(()=>{if(counter)counter.textContent=String(Math.min(18,Math.floor((performance.now()-started)/1000))).padStart(2,'0')},120);
  timers.push(setTimeout(finish,DURATION));

  requestAnimationFrame(async()=>{const ok=await startSound();if(!ok){if(audioState)audioState.innerHTML='<i></i>TAP ANYWHERE FOR SOUND';root.classList.add('sound-locked');armUnlock()}});
})();