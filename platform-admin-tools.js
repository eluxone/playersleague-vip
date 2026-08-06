(() => {
  'use strict';

  const SESSION_KEY = 'plvip_player_session_v1';
  const root = document.querySelector('[data-admin-tools]');
  if (!root) return;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[char]));

  const state = { config:null, session:null, profiles:[], badges:[], challenges:[], announcements:[] };

  const parseJson = async (response) => {
    const text = await response.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
  };

  const setStatus = (element, text = '', status = '') => {
    if (!element) return;
    element.textContent = text;
    if (status) element.dataset.state = status;
    else element.removeAttribute('data-state');
  };

  const restore = () => {
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (!session?.accessToken || !session?.refreshToken) return false;
      state.session = session;
      return true;
    } catch { return false; }
  };

  const config = async () => {
    if (state.config) return state.config;
    const response = await fetch('/api/auth-config',{cache:'no-store',headers:{Accept:'application/json'}});
    const payload = await parseJson(response);
    if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'Administrator tools are unavailable.');
    state.config = {url:String(payload.supabaseUrl).replace(/\/$/,''),key:String(payload.publishableKey)};
    return state.config;
  };

  const refresh = async () => {
    await config();
    const response = await fetch(`${state.config.url}/auth/v1/token?grant_type=refresh_token`,{
      method:'POST',
      headers:{apikey:state.config.key,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:state.session.refreshToken}),
      cache:'no-store'
    });
    const payload = await parseJson(response);
    if (!response.ok || !payload?.access_token) throw new Error('Your administrator session has expired.');
    state.session = {
      accessToken:payload.access_token,
      refreshToken:payload.refresh_token,
      expiresAt:Number(payload.expires_at) || Math.floor(Date.now()/1000)+Number(payload.expires_in||3600),
      user:payload.user || state.session.user
    };
    localStorage.setItem(SESSION_KEY,JSON.stringify(state.session));
  };

  const token = async () => {
    if (!state.session && !restore()) throw new Error('Sign in before using administrator tools.');
    if (Number(state.session.expiresAt || 0)-Math.floor(Date.now()/1000)<75) await refresh();
    return state.session.accessToken;
  };

  const request = async (path, options = {}, retry = true) => {
    await config();
    const response = await fetch(`${state.config.url}${path}`,{
      ...options,
      headers:{
        apikey:state.config.key,
        Authorization:`Bearer ${await token()}`,
        Accept:'application/json',
        ...(options.headers || {})
      },
      cache:'no-store'
    });
    if (response.status===401 && retry) {
      await refresh();
      return request(path,options,false);
    }
    const payload = await parseJson(response);
    if (!response.ok) throw new Error(payload?.message || payload?.hint || payload?.details || 'Administrator request failed.');
    return payload;
  };

  const rpc = (name, body = {}) => request(`/rest/v1/rpc/${name}`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
  });

  const isoOrNull = (value) => value ? new Date(value).toISOString() : null;
  const localDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return '';
    const offset = date.getTimezoneOffset();
    return new Date(date.valueOf()-offset*60000).toISOString().slice(0,16);
  };

  const render = () => {
    const profileOptions = state.profiles.map((profile) =>
      `<option value="${profile.id}">${escapeHtml(profile.display_name)} (@${escapeHtml(profile.username)}) · #${profile.founding_player_number}</option>`
    ).join('');
    const badgeOptions = state.badges.map((badge) =>
      `<option value="${escapeHtml(badge.slug)}">${escapeHtml(badge.name)}</option>`
    ).join('');

    root.innerHTML = `
      <section class="platform-heading" style="margin-top:42px">
        <div><p class="platform-eyebrow">CONTENT &amp; RECOGNITION</p><h1 style="font-size:clamp(38px,5vw,62px)">Manage the living league.</h1></div>
        <p>Create moderated challenges and announcements, then award genuine participation. All points remain non-transferable and have no monetary value.</p>
      </section>

      <div class="platform-dashboard-grid">
        <form class="platform-panel platform-form-card platform-form" data-admin-challenge-form>
          <p class="platform-eyebrow">CHALLENGE EDITOR</p><h2>Create or update a challenge</h2>
          <input type="hidden" name="challengeId">
          <div class="platform-form-grid">
            <label class="platform-field">Slug<input name="slug" required maxlength="80" placeholder="weekly-squad-story"></label>
            <label class="platform-field">Title<input name="title" required maxlength="160" placeholder="Weekly Squad Story"></label>
            <label class="platform-field wide">Summary<textarea name="summary" rows="3" required maxlength="600"></textarea></label>
            <label class="platform-field wide">Instructions<textarea name="instructions" rows="5" required maxlength="3000"></textarea></label>
            <label class="platform-field">Points reward<input name="points" type="number" min="0" max="100000" value="100" required></label>
            <label class="platform-field">Status<select name="status"><option>draft</option><option>open</option><option>closed</option><option>archived</option></select></label>
            <label class="platform-field">Opens<input name="opensAt" type="datetime-local"></label>
            <label class="platform-field">Closes<input name="closesAt" type="datetime-local"></label>
            <label class="platform-field wide" style="display:flex;grid-template-columns:auto 1fr;align-items:center"><input name="published" type="checkbox" style="width:auto"><span>Publish this challenge publicly</span></label>
          </div>
          <div class="platform-actions"><button class="platform-button" type="submit">Save challenge</button><button class="platform-button secondary" type="button" data-reset-challenge>Clear editor</button></div>
          <p class="platform-status" data-challenge-admin-status aria-live="polite"></p>
        </form>

        <div class="platform-stack">
          <form class="platform-panel platform-form-card platform-form" data-admin-announcement-form>
            <p class="platform-eyebrow">ANNOUNCEMENTS</p><h2>Publish a dashboard update</h2>
            <label class="platform-field">Title<input name="title" required maxlength="160"></label>
            <label class="platform-field">Message<textarea name="body" rows="5" required maxlength="2000"></textarea></label>
            <button class="platform-button" type="submit">Publish announcement</button>
            <p class="platform-status" data-announcement-admin-status aria-live="polite"></p>
          </form>

          <form class="platform-panel platform-form-card platform-form" data-admin-badge-form>
            <p class="platform-eyebrow">BADGES</p><h2>Award verified recognition</h2>
            <label class="platform-field">Player<select name="profile" required><option value="">Choose player</option>${profileOptions}</select></label>
            <label class="platform-field">Badge<select name="badge" required><option value="">Choose badge</option>${badgeOptions}</select></label>
            <label class="platform-field">Administrator note<input name="note" maxlength="500" placeholder="Reason for award"></label>
            <button class="platform-button" type="submit">Award badge</button>
            <p class="platform-status" data-badge-admin-status aria-live="polite"></p>
          </form>

          <form class="platform-panel platform-form-card platform-form" data-admin-points-form>
            <p class="platform-eyebrow">LEADERBOARD POINTS</p><h2>Adjust community points</h2>
            <label class="platform-field">Player<select name="profile" required><option value="">Choose player</option>${profileOptions}</select></label>
            <label class="platform-field">Points<input name="amount" type="number" min="-100000" max="100000" required placeholder="100"></label>
            <label class="platform-field">Reason<input name="reason" required maxlength="300" placeholder="Verified community contribution"></label>
            <button class="platform-button" type="submit">Apply points adjustment</button>
            <p class="platform-status" data-points-admin-status aria-live="polite"></p>
          </form>
        </div>
      </div>

      <section class="platform-panel platform-card" style="margin-top:20px">
        <h2>Current challenges</h2>
        <div class="platform-stack">${state.challenges.length ? state.challenges.map((challenge) => `
          <article class="platform-list-item">
            <div><strong>${escapeHtml(challenge.title)}</strong><p>${escapeHtml(challenge.status)} · ${challenge.points_reward} points · ${challenge.published?'published':'private'}</p></div>
            <button class="platform-button secondary" type="button" data-edit-challenge="${challenge.id}">Edit</button>
          </article>`).join('') : '<p>No challenges yet.</p>'}</div>
      </section>

      <section class="platform-panel platform-card" style="margin-top:20px">
        <h2>Published announcements</h2>
        <div class="platform-stack">${state.announcements.length ? state.announcements.map((announcement) => `
          <article class="platform-list-item">
            <div><strong>${escapeHtml(announcement.title)}</strong><p>${escapeHtml(announcement.body)}</p></div>
            <button class="platform-button secondary" type="button" data-archive-announcement="${announcement.id}">Archive</button>
          </article>`).join('') : '<p>No published announcements.</p>'}</div>
      </section>`;

    bind();
  };

  const clearChallenge = () => {
    const form = document.querySelector('[data-admin-challenge-form]');
    form?.reset();
    if (form?.elements.points) form.elements.points.value = '100';
    if (form?.elements.challengeId) form.elements.challengeId.value = '';
  };

  const bind = () => {
    const challengeForm = document.querySelector('[data-admin-challenge-form]');
    challengeForm?.addEventListener('submit',async (event) => {
      event.preventDefault();
      const status = document.querySelector('[data-challenge-admin-status]');
      const button = challengeForm.querySelector('button[type=submit]');
      const data = new FormData(challengeForm);
      button.disabled = true;
      try {
        await rpc('plvip_admin_save_challenge',{
          challenge_id:data.get('challengeId') || null,
          challenge_slug:String(data.get('slug') || '').trim(),
          challenge_title:String(data.get('title') || '').trim(),
          challenge_summary:String(data.get('summary') || '').trim(),
          challenge_instructions:String(data.get('instructions') || '').trim(),
          challenge_points:Number(data.get('points') || 0),
          challenge_status:String(data.get('status') || 'draft'),
          challenge_opens_at:isoOrNull(data.get('opensAt')),
          challenge_closes_at:isoOrNull(data.get('closesAt')),
          challenge_published:data.get('published') === 'on'
        });
        setStatus(status,'Challenge saved successfully.','success');
        setTimeout(() => location.reload(),600);
      } catch (error) {
        setStatus(status,error.message,'error');
        button.disabled = false;
      }
    });

    document.querySelector('[data-reset-challenge]')?.addEventListener('click',clearChallenge);
    document.querySelectorAll('[data-edit-challenge]').forEach((button) => button.addEventListener('click',() => {
      const form = document.querySelector('[data-admin-challenge-form]');
      const challenge = state.challenges.find((item) => item.id === button.dataset.editChallenge);
      if (!form || !challenge) return;
      form.elements.challengeId.value = challenge.id;
      form.elements.slug.value = challenge.slug;
      form.elements.title.value = challenge.title;
      form.elements.summary.value = challenge.summary;
      form.elements.instructions.value = challenge.instructions;
      form.elements.points.value = challenge.points_reward;
      form.elements.status.value = challenge.status;
      form.elements.opensAt.value = localDateTime(challenge.opens_at);
      form.elements.closesAt.value = localDateTime(challenge.closes_at);
      form.elements.published.checked = Boolean(challenge.published);
      form.scrollIntoView({behavior:'smooth',block:'start'});
    }));

    const announcementForm = document.querySelector('[data-admin-announcement-form]');
    announcementForm?.addEventListener('submit',async (event) => {
      event.preventDefault();
      const status = document.querySelector('[data-announcement-admin-status]');
      const button = announcementForm.querySelector('button[type=submit]');
      const data = new FormData(announcementForm);
      button.disabled = true;
      try {
        await rpc('plvip_admin_publish_announcement',{
          announcement_title:String(data.get('title') || '').trim(),
          announcement_body:String(data.get('body') || '').trim()
        });
        setStatus(status,'Announcement published.','success');
        setTimeout(() => location.reload(),600);
      } catch (error) {
        setStatus(status,error.message,'error');
        button.disabled = false;
      }
    });

    document.querySelectorAll('[data-archive-announcement]').forEach((button) => button.addEventListener('click',async () => {
      button.disabled = true;
      try {
        await rpc('plvip_admin_archive_announcement',{target_announcement:button.dataset.archiveAnnouncement});
        location.reload();
      } catch (error) {
        alert(error.message);
        button.disabled = false;
      }
    }));

    const badgeForm = document.querySelector('[data-admin-badge-form]');
    badgeForm?.addEventListener('submit',async (event) => {
      event.preventDefault();
      const status = document.querySelector('[data-badge-admin-status]');
      const button = badgeForm.querySelector('button[type=submit]');
      const data = new FormData(badgeForm);
      button.disabled = true;
      try {
        await rpc('plvip_admin_award_badge',{
          target_profile:data.get('profile'),
          badge_slug:data.get('badge'),
          award_note:String(data.get('note') || '').trim() || null
        });
        setStatus(status,'Badge awarded.','success');
        badgeForm.reset();
      } catch (error) {
        setStatus(status,error.message,'error');
      } finally { button.disabled = false; }
    });

    const pointsForm = document.querySelector('[data-admin-points-form]');
    pointsForm?.addEventListener('submit',async (event) => {
      event.preventDefault();
      const status = document.querySelector('[data-points-admin-status]');
      const button = pointsForm.querySelector('button[type=submit]');
      const data = new FormData(pointsForm);
      button.disabled = true;
      try {
        await rpc('plvip_admin_add_points',{
          target_profile:data.get('profile'),
          point_amount:Number(data.get('amount')),
          point_reason:String(data.get('reason') || '').trim()
        });
        setStatus(status,'Points adjustment applied.','success');
        pointsForm.reset();
      } catch (error) {
        setStatus(status,error.message,'error');
      } finally { button.disabled = false; }
    });
  };

  const boot = async () => {
    root.innerHTML = '<div class="platform-panel platform-loading">Loading administration tools…</div>';
    try {
      if (!restore()) throw new Error('Sign in through the Player Portal before opening administration.');
      const authorised = await rpc('current_user_is_admin',{});
      if (authorised !== true) throw new Error('This account is not authorised to manage the player platform.');
      [state.profiles,state.badges,state.challenges,state.announcements] = await Promise.all([
        request('/rest/v1/plvip_player_profiles?select=id,display_name,username,founding_player_number&order=founding_player_number.asc'),
        request('/rest/v1/plvip_badges?select=slug,name&active=eq.true&order=name.asc'),
        request('/rest/v1/plvip_challenges?select=*&order=created_at.desc'),
        request('/rest/v1/plvip_announcements?select=*&status=eq.published&order=published_at.desc')
      ]);
      render();
    } catch (error) {
      root.innerHTML = `<div class="platform-panel platform-empty">${escapeHtml(error.message)}</div>`;
    }
  };

  boot();
})();
