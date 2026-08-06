(() => {
  'use strict';

  const SESSION_KEY = 'plvip_player_session_v1';
  const page = document.body.dataset.platformPage || '';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const safeUrl = (value) => /^https:\/\//i.test(String(value || '')) ? String(value) : '';
  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? '—' : new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(date);
  };
  const initials = (value) => String(value || 'PL').trim().split(/\s+/).slice(0,2).map((part) => part[0]?.toUpperCase() || '').join('');
  const avatar = (profile, className = 'platform-avatar') => profile?.avatar_url
    ? `<span class="${className}"><img src="${escapeHtml(safeUrl(profile.avatar_url))}" alt=""></span>`
    : `<span class="${className}">${escapeHtml(initials(profile?.display_name || profile?.username))}</span>`;

  const state = { config: null, session: null, user: null, profile: null };

  const setStatus = (element, text = '', status = '') => {
    if (!element) return;
    element.textContent = text;
    if (status) element.dataset.state = status;
    else element.removeAttribute('data-state');
  };

  const parseJson = async (response) => {
    const text = await response.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
  };

  const fetchConfig = async () => {
    if (state.config) return state.config;
    const response = await fetch('/api/auth-config',{cache:'no-store',headers:{Accept:'application/json'}});
    const payload = await parseJson(response);
    if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'Player login is temporarily unavailable.');
    state.config = { url:String(payload.supabaseUrl).replace(/\/$/,''), key:String(payload.publishableKey) };
    return state.config;
  };

  const saveSession = (payload) => {
    if (!payload?.access_token || !payload?.refresh_token) throw new Error('Authentication response was incomplete.');
    state.session = {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresAt: Number(payload.expires_at) || Math.floor(Date.now()/1000) + Number(payload.expires_in || 3600),
      user: payload.user || null
    };
    localStorage.setItem(SESSION_KEY,JSON.stringify(state.session));
  };

  const restoreSession = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (!saved?.accessToken || !saved?.refreshToken) return false;
      state.session = saved;
      state.user = saved.user || null;
      return true;
    } catch { return false; }
  };

  const clearSession = () => {
    state.session = null;
    state.user = null;
    state.profile = null;
    localStorage.removeItem(SESSION_KEY);
  };

  const refreshSession = async () => {
    await fetchConfig();
    if (!state.session?.refreshToken) throw new Error('Your session has expired.');
    const response = await fetch(`${state.config.url}/auth/v1/token?grant_type=refresh_token`,{
      method:'POST',headers:{apikey:state.config.key,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:state.session.refreshToken}),cache:'no-store'
    });
    const payload = await parseJson(response);
    if (!response.ok) { clearSession(); throw new Error('Your session has expired.'); }
    saveSession(payload);
    state.user = payload.user || state.user;
    return state.session.accessToken;
  };

  const accessToken = async () => {
    if (!state.session?.accessToken) throw new Error('Please sign in.');
    if (Number(state.session.expiresAt) - Math.floor(Date.now()/1000) < 75) await refreshSession();
    return state.session.accessToken;
  };

  const authHeaders = async (authenticated = false) => {
    await fetchConfig();
    const headers = {apikey:state.config.key,Accept:'application/json'};
    if (authenticated) headers.Authorization = `Bearer ${await accessToken()}`;
    return headers;
  };

  const api = async (path, options = {}, authenticated = false, retry = true) => {
    await fetchConfig();
    const response = await fetch(`${state.config.url}${path}`,{
      ...options,
      headers:{...(await authHeaders(authenticated)),...(options.headers || {})},
      cache:'no-store'
    });
    if (response.status === 401 && authenticated && retry) {
      await refreshSession();
      return api(path,options,authenticated,false);
    }
    const payload = await parseJson(response);
    if (!response.ok) throw new Error(payload?.message || payload?.error_description || payload?.hint || 'Request could not be completed.');
    return payload;
  };

  const rpc = (name, body = {}, authenticated = false) => api(`/rest/v1/rpc/${name}`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
  },authenticated);

  const getUser = async () => {
    if (state.user?.id) return state.user;
    state.user = await api('/auth/v1/user',{method:'GET'},true);
    state.session.user = state.user;
    localStorage.setItem(SESSION_KEY,JSON.stringify(state.session));
    return state.user;
  };

  const consumeMagicLink = async () => {
    const params = new URLSearchParams(location.hash.replace(/^#/,''));
    if (!params.get('access_token')) return false;
    saveSession({
      access_token:params.get('access_token'),refresh_token:params.get('refresh_token'),
      expires_in:Number(params.get('expires_in') || 3600),user:null
    });
    history.replaceState(null,'',location.pathname + location.search);
    await getUser();
    return true;
  };

  const getOwnProfile = async () => {
    const user = await getUser();
    const rows = await api(`/rest/v1/plvip_player_profiles?select=*&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,{method:'GET'},true);
    state.profile = rows?.[0] || null;
    return state.profile;
  };

  const requireAuth = async () => {
    restoreSession();
    await consumeMagicLink();
    if (!state.session) {
      location.href = `/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`;
      throw new Error('Authentication required.');
    }
    await getUser();
  };

  const navigateAfterLogin = async () => {
    const profile = await getOwnProfile();
    const requested = new URLSearchParams(location.search).get('returnTo');
    location.href = requested && requested.startsWith('/') ? requested : (profile ? '/dashboard' : '/onboarding');
  };

  const sendMagicLink = async (email) => {
    await fetchConfig();
    const returnTo = new URLSearchParams(location.search).get('returnTo') || '/dashboard';
    const redirect = `${location.origin}/login?returnTo=${encodeURIComponent(returnTo)}`;
    const response = await fetch(`${state.config.url}/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`,{
      method:'POST',headers:{apikey:state.config.key,'Content-Type':'application/json'},
      body:JSON.stringify({email,create_user:true,data:{source:'playersleague.vip'}}),cache:'no-store'
    });
    const payload = await parseJson(response);
    if (!response.ok) throw new Error(payload?.msg || payload?.message || 'The sign-in email could not be sent.');
  };

  const initNavigation = () => {
    const toggle = $('[data-platform-menu]');
    const links = $('[data-platform-links]');
    toggle?.addEventListener('click',() => {
      const open = links?.classList.toggle('open');
      toggle.setAttribute('aria-expanded',String(Boolean(open)));
    });
    $$('[data-sign-out]').forEach((button) => button.addEventListener('click',async () => {
      try { if (state.session) await api('/auth/v1/logout',{method:'POST'},true); } catch {}
      clearSession();
      location.href='/login';
    }));
    if (restoreSession()) $$('[data-auth-only]').forEach((item) => item.classList.remove('platform-hidden'));
  };

  const initLogin = async () => {
    const status = $('[data-login-status]');
    const form = $('[data-login-form]');
    try {
      await fetchConfig();
      restoreSession();
      if (await consumeMagicLink() || state.session) { setStatus(status,'Sign-in complete. Opening your player area…','success'); await navigateAfterLogin(); return; }
    } catch (error) { setStatus(status,error.message,'error'); }
    form?.addEventListener('submit',async (event) => {
      event.preventDefault();
      const email = new FormData(form).get('email')?.toString().trim().toLowerCase();
      const button = $('button[type=submit]',form);
      if (!email) return setStatus(status,'Enter your email address.','error');
      button.disabled=true; button.textContent='Sending secure link…';
      try { await sendMagicLink(email); setStatus(status,'Check your email and open the secure sign-in link.','success'); form.reset(); }
      catch(error){ setStatus(status,error.message,'error'); button.disabled=false; button.textContent='Email me a secure sign-in link'; }
    });
  };

  const profilePayload = (form,user) => {
    const data = new FormData(form);
    const split = (name) => String(data.get(name)||'').split(',').map((v)=>v.trim()).filter(Boolean).slice(0,10);
    return {
      user_id:user.id,
      username:String(data.get('username')||'').trim().toLowerCase(),
      display_name:String(data.get('displayName')||'').trim(),
      avatar_url:safeUrl(data.get('avatarUrl')) || null,
      country:String(data.get('country')||'').trim() || null,
      bio:String(data.get('bio')||'').trim() || null,
      main_games:split('mainGames'),platforms:split('platforms'),
      play_style:String(data.get('playStyle')||'').trim() || null,
      social:String(data.get('social')||'').trim() || null,
      is_public:data.get('isPublic')==='on'
    };
  };

  const initOnboarding = async () => {
    await requireAuth();
    const profile = await getOwnProfile();
    const form = $('[data-onboarding-form]');
    const status = $('[data-onboarding-status]');
    if (profile && form) {
      const values = {username:profile.username,displayName:profile.display_name,avatarUrl:profile.avatar_url,country:profile.country,bio:profile.bio,mainGames:(profile.main_games||[]).join(', '),platforms:(profile.platforms||[]).join(', '),playStyle:profile.play_style,social:profile.social};
      Object.entries(values).forEach(([name,value])=>{ if(form.elements[name]) form.elements[name].value=value||''; });
      form.elements.isPublic.checked=Boolean(profile.is_public);
      $('[data-onboarding-title]').textContent='Update your player identity.';
    }
    form?.addEventListener('submit',async(event)=>{
      event.preventDefault();
      const button=$('button[type=submit]',form); button.disabled=true; button.textContent='Saving profile…';
      try {
        const user=await getUser(); const payload=profilePayload(form,user);
        if(!/^[a-z0-9][a-z0-9_-]{2,23}$/.test(payload.username)) throw new Error('Username must be 3–24 characters using letters, numbers, _ or -.');
        if(payload.display_name.length<2) throw new Error('Enter a display name.');
        const options={method:profile?'PATCH':'POST',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(profile?Object.fromEntries(Object.entries(payload).filter(([key])=>key!=='user_id')):payload)};
        const path=profile?`/rest/v1/plvip_player_profiles?user_id=eq.${encodeURIComponent(user.id)}`:'/rest/v1/plvip_player_profiles';
        await api(path,options,true);
        setStatus(status,'Profile saved. Opening your dashboard…','success'); setTimeout(()=>location.href='/dashboard',600);
      } catch(error){ setStatus(status,error.message,'error'); button.disabled=false; button.textContent='Save Founding Player profile'; }
    });
  };

  const initDashboard = async () => {
    await requireAuth();
    const profile=await getOwnProfile();
    if(!profile){ location.href='/onboarding'; return; }
    const root=$('[data-dashboard-root]');
    const [badgeRows,ledger,submissions,announcements]=await Promise.all([
      api(`/rest/v1/plvip_player_badges?select=awarded_at,note,plvip_badges(slug,name,description,icon)&profile_id=eq.${profile.id}&order=awarded_at.desc`,{method:'GET'},true),
      api(`/rest/v1/plvip_points_ledger?select=amount,reason,created_at&profile_id=eq.${profile.id}&order=created_at.desc&limit=25`,{method:'GET'},true),
      api(`/rest/v1/plvip_challenge_submissions?select=id,status,submitted_at,plvip_challenges(title,slug,points_reward)&profile_id=eq.${profile.id}&order=submitted_at.desc`,{method:'GET'},true),
      api('/rest/v1/plvip_announcements?select=title,body,published_at&status=eq.published&order=published_at.desc&limit=5',{method:'GET'})
    ]);
    const points=(ledger||[]).reduce((sum,row)=>sum+Number(row.amount||0),0);
    const statusClass=profile.moderation_status==='approved'?'':' pending';
    root.innerHTML=`
      <section class="platform-panel platform-card">
        <div class="platform-profile-head">${avatar(profile)}<div><span class="platform-number">FOUNDING PLAYER #${escapeHtml(profile.founding_player_number)}</span><h1>${escapeHtml(profile.display_name)}</h1><p>@${escapeHtml(profile.username)} · ${escapeHtml(profile.country||'Global player')}</p><span class="platform-pill${statusClass}">${escapeHtml(profile.moderation_status)}</span></div></div>
        <div style="margin-top:24px"><div style="display:flex;justify-content:space-between;margin-bottom:9px"><span>Profile completion</span><strong>${profile.profile_completion}%</strong></div><div class="platform-progress" style="--completion:${profile.profile_completion}%"><i></i></div></div>
        <div class="platform-actions" style="margin-top:22px"><a class="platform-button" href="/onboarding">Edit profile</a>${profile.moderation_status==='approved'?`<a class="platform-button secondary" href="/player/${encodeURIComponent(profile.username)}">View public profile</a>`:''}</div>
      </section>
      <section class="platform-stat-grid" style="margin-top:20px"><article class="platform-stat"><span>League points</span><strong>${points}</strong></article><article class="platform-stat"><span>Badges</span><strong>${badgeRows.length}</strong></article><article class="platform-stat"><span>Challenges</span><strong>${submissions.length}</strong></article></section>
      <div class="platform-dashboard-grid" style="margin-top:20px">
        <section class="platform-panel platform-card"><h2>Your badges</h2><div class="platform-badges">${badgeRows.length?badgeRows.map((row)=>`<div class="platform-badge"><i>${escapeHtml(row.plvip_badges?.icon||'◆')}</i><span><strong>${escapeHtml(row.plvip_badges?.name||'Badge')}</strong><small>${escapeHtml(row.plvip_badges?.description||'')}</small></span></div>`).join(''):'<p>No badges yet.</p>'}</div></section>
        <section class="platform-panel platform-card"><h2>Announcements</h2><div class="platform-stack">${announcements.length?announcements.map((row)=>`<article class="platform-list-item"><div><strong>${escapeHtml(row.title)}</strong><p>${escapeHtml(row.body)}</p></div></article>`).join(''):'<p>No announcements yet.</p>'}</div></section>
        <section class="platform-panel platform-card"><h2>Challenge activity</h2><div class="platform-stack">${submissions.length?submissions.map((row)=>`<article class="platform-list-item"><div><strong>${escapeHtml(row.plvip_challenges?.title||'Challenge')}</strong><p>Submitted ${formatDate(row.submitted_at)}</p></div><span class="platform-pill${row.status==='approved'?'':' pending'}">${escapeHtml(row.status)}</span></article>`).join(''):'<p>Join your first community challenge.</p>'}</div><a class="platform-button secondary" href="/challenges" style="margin-top:18px">Browse challenges</a></section>
        <section class="platform-panel platform-card"><h2>Points history</h2><div class="platform-stack">${ledger.length?ledger.slice(0,8).map((row)=>`<article class="platform-list-item"><div><strong>${escapeHtml(row.reason)}</strong><p>${formatDate(row.created_at)}</p></div><strong>${Number(row.amount)>0?'+':''}${Number(row.amount)}</strong></article>`).join(''):'<p>No points activity yet.</p>'}</div></section>
      </div>`;
  };

  const playerCard = (profile) => `<a class="platform-panel platform-player-card" href="/player/${encodeURIComponent(profile.username)}">${avatar(profile)}<span class="platform-number">FOUNDING PLAYER #${escapeHtml(profile.founding_player_number)}</span><h2>${escapeHtml(profile.display_name)}</h2><p>@${escapeHtml(profile.username)} · ${escapeHtml(profile.country||'Global')}</p><div class="platform-player-meta">${(profile.main_games||[]).slice(0,3).map((game)=>`<span>${escapeHtml(game)}</span>`).join('')}</div><div class="platform-stat-grid"><div class="platform-stat"><span>Points</span><strong>${Number(profile.total_points||0)}</strong></div><div class="platform-stat"><span>Badges</span><strong>${Number(profile.badge_count||0)}</strong></div><div class="platform-stat"><span>Complete</span><strong>${Number(profile.profile_completion||0)}%</strong></div></div></a>`;

  const initPlayers = async () => {
    const grid=$('[data-players-grid]'); const form=$('[data-player-search]'); const status=$('[data-players-status]');
    const load=async(term='')=>{ setStatus(status,'Loading players…'); try{const rows=await rpc('plvip_public_players',{search_text:term||null,result_limit:60}); grid.innerHTML=rows.length?rows.map(playerCard).join(''):'<div class="platform-panel platform-empty">No approved public players match this search.</div>'; setStatus(status,`${rows.length} player profiles shown.`,'success');}catch(error){setStatus(status,error.message,'error');}};
    form?.addEventListener('submit',(event)=>{event.preventDefault();load(new FormData(form).get('search')?.toString().trim()||'');});
    await load();
  };

  const initLeaderboard = async () => {
    const body=$('[data-leaderboard-body]'); const status=$('[data-leaderboard-status]');
    try{const rows=await rpc('plvip_public_leaderboard',{result_limit:100});body.innerHTML=rows.map((row)=>`<tr><td class="platform-rank">#${row.rank}</td><td><a href="/player/${encodeURIComponent(row.username)}"><strong>${escapeHtml(row.display_name)}</strong><br><small>@${escapeHtml(row.username)}</small></a></td><td>${escapeHtml(row.country||'Global')}</td><td>#${escapeHtml(row.founding_player_number)}</td><td><strong>${Number(row.total_points||0)}</strong></td><td>${Number(row.badge_count||0)}</td></tr>`).join('');setStatus(status,rows.length?'Leaderboard loaded.':'No approved players are ranked yet.','success');}catch(error){setStatus(status,error.message,'error');}
  };

  const initChallenges = async () => {
    const grid=$('[data-challenges-grid]'); const status=$('[data-challenges-status]'); const modal=$('[data-challenge-modal]');
    restoreSession(); if(state.session){try{await getUser();await getOwnProfile();}catch{clearSession();}}
    const challenges=await api('/rest/v1/plvip_challenges?select=*&published=eq.true&order=created_at.desc',{method:'GET'});
    let submissions=[]; if(state.profile) submissions=await api(`/rest/v1/plvip_challenge_submissions?select=challenge_id,status&profile_id=eq.${state.profile.id}`,{method:'GET'},true);
    grid.innerHTML=challenges.map((challenge)=>{const submission=submissions.find((row)=>row.challenge_id===challenge.id);return `<article class="platform-panel platform-challenge"><span class="platform-pill${challenge.status==='open'?'':' pending'}">${escapeHtml(challenge.status)}</span><h2>${escapeHtml(challenge.title)}</h2><p>${escapeHtml(challenge.summary)}</p><footer><strong>${Number(challenge.points_reward||0)} community points</strong>${submission?`<span class="platform-pill pending">${escapeHtml(submission.status)}</span>`:`<button class="platform-button" data-enter-challenge="${challenge.id}" ${challenge.status!=='open'?'disabled':''}>Enter challenge</button>`}</footer></article>`}).join('')||'<div class="platform-panel platform-empty">No public challenges are available.</div>';
    $$('[data-enter-challenge]').forEach((button)=>button.addEventListener('click',()=>{
      if(!state.session){location.href=`/login?returnTo=${encodeURIComponent('/challenges')}`;return;} if(!state.profile){location.href='/onboarding';return;}
      const challenge=challenges.find((row)=>row.id===button.dataset.enterChallenge); modal.hidden=false; $('[data-modal-title]').textContent=challenge.title; $('[data-challenge-id]').value=challenge.id; $('[data-modal-instructions]').textContent=challenge.instructions;
    }));
    $$('[data-close-modal]').forEach((button)=>button.addEventListener('click',()=>modal.hidden=true));
    $('[data-challenge-form]')?.addEventListener('submit',async(event)=>{
      event.preventDefault();const form=event.currentTarget;const formStatus=$('[data-challenge-form-status]');const data=new FormData(form);const button=$('button[type=submit]',form);button.disabled=true;
      try{await api('/rest/v1/plvip_challenge_submissions',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({challenge_id:data.get('challengeId'),profile_id:state.profile.id,response_text:String(data.get('response')||'').trim(),evidence_url:safeUrl(data.get('evidenceUrl'))||null})},true);setStatus(formStatus,'Challenge submitted for review.','success');setTimeout(()=>location.reload(),700);}catch(error){setStatus(formStatus,error.message,'error');button.disabled=false;}
    });
    setStatus(status,`${challenges.length} public challenge${challenges.length===1?'':'s'} available.`,'success');
  };

  const initPublicProfile = async () => {
    const username=decodeURIComponent(location.pathname.match(/^\/player\/([^/?#]+)/)?.[1]||new URLSearchParams(location.search).get('username')||'');
    const root=$('[data-public-profile]'); const status=$('[data-public-profile-status]');
    try{const result=await rpc('plvip_public_profile',{profile_username:username});if(!result?.profile)throw new Error('This public player profile is not available.');const p={...result.profile,display_name:result.profile.displayName,avatar_url:result.profile.avatarUrl,username:result.profile.username};root.innerHTML=`<section class="platform-panel platform-profile-banner">${avatar(p)}<span class="platform-number">FOUNDING PLAYER #${escapeHtml(result.profile.foundingPlayerNumber)}</span><h1>${escapeHtml(result.profile.displayName)}</h1><p>@${escapeHtml(result.profile.username)} · ${escapeHtml(result.profile.country||'Global player')}</p><p class="platform-lead">${escapeHtml(result.profile.bio||'This player is building their league story.')}</p><div class="platform-player-meta">${(result.profile.mainGames||[]).map((game)=>`<span>${escapeHtml(game)}</span>`).join('')}${(result.profile.platforms||[]).map((platform)=>`<span>${escapeHtml(platform)}</span>`).join('')}</div><div class="platform-stat-grid" style="margin-top:25px"><article class="platform-stat"><span>Points</span><strong>${Number(result.totalPoints||0)}</strong></article><article class="platform-stat"><span>Badges</span><strong>${result.badges?.length||0}</strong></article><article class="platform-stat"><span>Approved challenges</span><strong>${Number(result.approvedChallenges||0)}</strong></article></div></section><section class="platform-panel platform-card" style="margin-top:20px"><h2>Badges</h2><div class="platform-badges">${result.badges?.length?result.badges.map((badge)=>`<div class="platform-badge"><i>${escapeHtml(badge.icon)}</i><span><strong>${escapeHtml(badge.name)}</strong><small>${escapeHtml(badge.description)}</small></span></div>`).join(''):'<p>No public badges yet.</p>'}</div></section>`;document.title=`${result.profile.displayName} — Players League VIP`;setStatus(status,'','');}catch(error){root.innerHTML='<div class="platform-panel platform-empty">Player profile unavailable.</div>';setStatus(status,error.message,'error');}
  };

  const initAdmin = async () => {
    await requireAuth();const authorised=await rpc('current_user_is_admin',{},true);if(authorised!==true){location.href='/dashboard';return;}
    const root=$('[data-platform-admin]');const [profiles,submissions,badges]=await Promise.all([
      api('/rest/v1/plvip_player_profiles?select=*&order=created_at.desc',{method:'GET'},true),
      api('/rest/v1/plvip_challenge_submissions?select=*,plvip_challenges(title),plvip_player_profiles(display_name,username)&order=submitted_at.desc',{method:'GET'},true),
      api('/rest/v1/plvip_badges?select=*&order=name.asc',{method:'GET'},true)
    ]);
    root.innerHTML=`<section class="platform-admin-grid">${[['Profiles',profiles.length],['Pending',profiles.filter(p=>p.moderation_status==='pending').length],['Submissions',submissions.length],['Badges',badges.length]].map(([label,value])=>`<article class="platform-stat"><span>${label}</span><strong>${value}</strong></article>`).join('')}</section><section class="platform-panel platform-card" style="margin-top:20px"><h2>Player moderation</h2><div class="platform-table-wrap"><table class="platform-table platform-admin-table"><thead><tr><th>Player</th><th>Number</th><th>Completion</th><th>Status</th><th>Actions</th></tr></thead><tbody>${profiles.map((p)=>`<tr><td><strong>${escapeHtml(p.display_name)}</strong><br><small>@${escapeHtml(p.username)}</small></td><td>#${p.founding_player_number}</td><td>${p.profile_completion}%</td><td>${escapeHtml(p.moderation_status)}</td><td><button class="platform-button secondary" data-moderate="${p.id}" data-status="approved">Approve</button> <button class="platform-button secondary" data-moderate="${p.id}" data-status="suspended">Suspend</button></td></tr>`).join('')}</tbody></table></div></section><section class="platform-panel platform-card" style="margin-top:20px"><h2>Challenge submissions</h2><div class="platform-stack">${submissions.map((s)=>`<article class="platform-list-item"><div><strong>${escapeHtml(s.plvip_player_profiles?.display_name||'Player')} — ${escapeHtml(s.plvip_challenges?.title||'Challenge')}</strong><p>${escapeHtml(s.response_text)}</p></div><div class="platform-actions"><button class="platform-button secondary" data-review="${s.id}" data-status="approved">Approve</button><button class="platform-button secondary" data-review="${s.id}" data-status="rejected">Reject</button></div></article>`).join('')||'<p>No submissions.</p>'}</div></section>`;
    $$('[data-moderate]').forEach((button)=>button.addEventListener('click',async()=>{button.disabled=true;try{await rpc('plvip_admin_moderate_profile',{target_profile:button.dataset.moderate,new_status:button.dataset.status},true);location.reload();}catch(error){alert(error.message);button.disabled=false;}}));
    $$('[data-review]').forEach((button)=>button.addEventListener('click',async()=>{button.disabled=true;try{await rpc('plvip_admin_review_submission',{target_submission:button.dataset.review,new_status:button.dataset.status},true);location.reload();}catch(error){alert(error.message);button.disabled=false;}}));
  };

  const boot = async () => {
    initNavigation();
    try {
      if(page==='login') await initLogin();
      if(page==='onboarding') await initOnboarding();
      if(page==='dashboard') await initDashboard();
      if(page==='players') await initPlayers();
      if(page==='leaderboard') await initLeaderboard();
      if(page==='challenges') await initChallenges();
      if(page==='player') await initPublicProfile();
      if(page==='platform-admin') await initAdmin();
    } catch(error) {
      if(error.message!=='Authentication required.') {
        const fallback=$('[data-platform-error]'); if(fallback)setStatus(fallback,error.message,'error'); else console.error(error);
      }
    }
  };

  boot();
})();
