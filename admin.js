(() => {
  'use strict';

  const SESSION_KEY = 'plvip_admin_session_v1';
  const PAGE_SIZE = 1000;

  const elements = {
    boot: document.querySelector('[data-boot-panel]'),
    loginPanel: document.querySelector('[data-login-panel]'),
    loginForm: document.querySelector('[data-login-form]'),
    loginStatus: document.querySelector('[data-login-status]'),
    deniedPanel: document.querySelector('[data-denied-panel]'),
    deniedSignOut: document.querySelector('[data-denied-sign-out]'),
    dashboard: document.querySelector('[data-dashboard]'),
    adminEmail: document.querySelector('[data-admin-email]'),
    signOut: document.querySelector('[data-sign-out]'),
    refresh: document.querySelector('[data-refresh]'),
    exportButton: document.querySelector('[data-export]'),
    search: document.querySelector('[data-search]'),
    recordsBody: document.querySelector('[data-records-body]'),
    tableWrap: document.querySelector('[data-table-wrap]'),
    emptyState: document.querySelector('[data-empty-state]'),
    recordsStatus: document.querySelector('[data-records-status]'),
    visibleCount: document.querySelector('[data-visible-count]'),
    statTotal: document.querySelector('[data-stat-total]'),
    statWeek: document.querySelector('[data-stat-week]'),
    statPlatform: document.querySelector('[data-stat-platform]'),
    statNewest: document.querySelector('[data-stat-newest]')
  };

  const state = {
    config: null,
    session: null,
    rows: [],
    filteredRows: []
  };

  const showPanel = (panel) => {
    [elements.boot, elements.loginPanel, elements.deniedPanel, elements.dashboard]
      .forEach((item) => {
        if (item) item.hidden = item !== panel;
      });
  };

  const setStatus = (element, message = '', status = '') => {
    if (!element) return;
    element.textContent = message;
    if (status) element.dataset.state = status;
    else element.removeAttribute('data-state');
  };

  const parseJson = async (response) => {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const fetchConfig = async () => {
    const response = await fetch('/api/auth-config', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      credentials: 'same-origin'
    });
    const payload = await parseJson(response);

    if (!response.ok || !payload?.ok || !payload.supabaseUrl || !payload.publishableKey) {
      throw new Error(payload?.message || 'Administrator login is temporarily unavailable.');
    }

    state.config = {
      supabaseUrl: String(payload.supabaseUrl).replace(/\/$/, ''),
      publishableKey: String(payload.publishableKey)
    };
  };

  const clearSession = () => {
    state.session = null;
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  };

  const storeSession = (payload) => {
    if (!payload?.access_token || !payload?.refresh_token) {
      throw new Error('The authentication response was incomplete.');
    }

    const expiresAt = Number(payload.expires_at)
      || Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600);

    state.session = {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresAt,
      user: {
        id: payload.user?.id || '',
        email: payload.user?.email || ''
      }
    };

    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state.session)); } catch {}
  };

  const restoreSession = () => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (!saved?.accessToken || !saved?.refreshToken || !saved?.expiresAt) return false;
      state.session = saved;
      return true;
    } catch {
      clearSession();
      return false;
    }
  };

  const authHeaders = (includeToken = false) => {
    const headers = {
      apikey: state.config.publishableKey,
      Accept: 'application/json'
    };
    if (includeToken && state.session?.accessToken) {
      headers.Authorization = `Bearer ${state.session.accessToken}`;
    }
    return headers;
  };

  const signInWithPassword = async (email, password) => {
    const response = await fetch(
      `${state.config.supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          ...authHeaders(false),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        cache: 'no-store'
      }
    );

    const payload = await parseJson(response);
    if (!response.ok) {
      throw new Error('Sign-in failed. Check your email and password.');
    }

    storeSession(payload);
  };

  const refreshSession = async () => {
    if (!state.session?.refreshToken) throw new Error('Your session has expired.');

    const response = await fetch(
      `${state.config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
      {
        method: 'POST',
        headers: {
          ...authHeaders(false),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: state.session.refreshToken }),
        cache: 'no-store'
      }
    );

    const payload = await parseJson(response);
    if (!response.ok) {
      clearSession();
      throw new Error('Your session has expired. Please sign in again.');
    }

    storeSession(payload);
    return state.session.accessToken;
  };

  const getAccessToken = async () => {
    if (!state.session?.accessToken) throw new Error('Please sign in.');
    const secondsRemaining = Number(state.session.expiresAt) - Math.floor(Date.now() / 1000);
    if (secondsRemaining < 60) return refreshSession();
    return state.session.accessToken;
  };

  const supabaseRequest = async (path, options = {}, allowRetry = true) => {
    await getAccessToken();

    const response = await fetch(`${state.config.supabaseUrl}${path}`, {
      ...options,
      headers: {
        ...authHeaders(true),
        ...(options.headers || {})
      },
      cache: 'no-store'
    });

    if (response.status === 401 && allowRetry) {
      await refreshSession();
      return supabaseRequest(path, options, false);
    }

    return response;
  };

  const verifyAdministrator = async () => {
    const response = await supabaseRequest('/rest/v1/rpc/current_user_is_admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    const payload = await parseJson(response);

    if (!response.ok) {
      throw new Error('Administrator authorisation could not be verified.');
    }

    return payload === true || payload?.current_user_is_admin === true;
  };

  const fetchRegistrations = async () => {
    const selectedColumns = [
      'id',
      'gamer_name',
      'email',
      'main_game',
      'platform',
      'country',
      'social',
      'priority',
      'consent_version',
      'source',
      'created_at'
    ].join(',');

    const allRows = [];
    let offset = 0;

    while (true) {
      const query = new URLSearchParams({
        select: selectedColumns,
        order: 'created_at.desc',
        limit: String(PAGE_SIZE),
        offset: String(offset)
      });

      const response = await supabaseRequest(`/rest/v1/founding_players?${query.toString()}`, {
        method: 'GET'
      });
      const payload = await parseJson(response);

      if (!response.ok || !Array.isArray(payload)) {
        throw new Error('Registration records could not be loaded.');
      }

      allRows.push(...payload);
      if (payload.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    return allRows;
  };

  const formatDate = (value, includeTime = true) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', includeTime
      ? { dateStyle: 'medium', timeStyle: 'short' }
      : { dateStyle: 'medium' }).format(date);
  };

  const valueOrDash = (value) => {
    const text = String(value ?? '').trim();
    return text || '—';
  };

  const renderStats = () => {
    const rows = state.rows;
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recent = rows.filter((row) => new Date(row.created_at).getTime() >= weekAgo).length;

    const platforms = new Map();
    rows.forEach((row) => {
      const platform = valueOrDash(row.platform);
      platforms.set(platform, (platforms.get(platform) || 0) + 1);
    });
    const topPlatform = [...platforms.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || '—';

    if (elements.statTotal) elements.statTotal.textContent = String(rows.length);
    if (elements.statWeek) elements.statWeek.textContent = String(recent);
    if (elements.statPlatform) elements.statPlatform.textContent = topPlatform;
    if (elements.statNewest) {
      elements.statNewest.textContent = rows[0]?.created_at
        ? formatDate(rows[0].created_at, false)
        : '—';
    }
  };

  const makeCell = (label, value) => {
    const cell = document.createElement('td');
    cell.dataset.label = label;
    cell.textContent = valueOrDash(value);
    return cell;
  };

  const renderRows = () => {
    if (!elements.recordsBody) return;
    elements.recordsBody.textContent = '';

    const fragment = document.createDocumentFragment();
    state.filteredRows.forEach((row) => {
      const tableRow = document.createElement('tr');
      tableRow.append(
        makeCell('Joined', formatDate(row.created_at)),
        makeCell('Gamer name', row.gamer_name),
        makeCell('Email', row.email),
        makeCell('Main game', row.main_game),
        makeCell('Platform', row.platform),
        makeCell('Country', row.country),
        makeCell('Discord / X', row.social),
        makeCell('Build priority', row.priority)
      );
      fragment.appendChild(tableRow);
    });
    elements.recordsBody.appendChild(fragment);

    const hasRows = state.filteredRows.length > 0;
    if (elements.tableWrap) elements.tableWrap.hidden = !hasRows;
    if (elements.emptyState) elements.emptyState.hidden = hasRows;
    if (elements.visibleCount) elements.visibleCount.textContent = String(state.filteredRows.length);
  };

  const applySearch = () => {
    const term = String(elements.search?.value || '').trim().toLowerCase();
    if (!term) {
      state.filteredRows = [...state.rows];
    } else {
      state.filteredRows = state.rows.filter((row) => [
        row.gamer_name,
        row.email,
        row.main_game,
        row.platform,
        row.country,
        row.social,
        row.priority
      ].some((value) => String(value ?? '').toLowerCase().includes(term)));
    }
    renderRows();
  };

  const csvValue = (value) => {
    let text = String(value ?? '');
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };

  const exportCsv = () => {
    const rows = state.filteredRows;
    if (!rows.length) {
      setStatus(elements.recordsStatus, 'There are no visible records to export.', 'error');
      return;
    }

    const headers = [
      'Joined', 'Gamer name', 'Email', 'Main game', 'Platform',
      'Country', 'Discord or X', 'Build priority', 'Consent version', 'Source'
    ];
    const lines = [headers.map(csvValue).join(',')];

    rows.forEach((row) => {
      lines.push([
        row.created_at,
        row.gamer_name,
        row.email,
        row.main_game,
        row.platform,
        row.country,
        row.social,
        row.priority,
        row.consent_version,
        row.source
      ].map(csvValue).join(','));
    });

    const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const day = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `plvip-founding-players-${day}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(elements.recordsStatus, `${rows.length} records exported securely.`, 'success');
  };

  const setLoadingButtons = (loading) => {
    if (elements.refresh) {
      elements.refresh.disabled = loading;
      elements.refresh.textContent = loading ? 'Refreshing…' : 'Refresh';
    }
    if (elements.exportButton) elements.exportButton.disabled = loading;
  };

  const loadDashboardData = async () => {
    setLoadingButtons(true);
    setStatus(elements.recordsStatus, 'Loading registrations…');

    try {
      state.rows = await fetchRegistrations();
      applySearch();
      renderStats();
      setStatus(
        elements.recordsStatus,
        `${state.rows.length} registration${state.rows.length === 1 ? '' : 's'} loaded.`,
        'success'
      );
    } catch (error) {
      console.error(error);
      setStatus(elements.recordsStatus, error.message || 'Records could not be loaded.', 'error');
    } finally {
      setLoadingButtons(false);
    }
  };

  const enterDashboard = async () => {
    if (elements.adminEmail) {
      elements.adminEmail.textContent = state.session?.user?.email || 'Authorised administrator';
    }
    showPanel(elements.dashboard);
    await loadDashboardData();
  };

  const signOut = async () => {
    const token = state.session?.accessToken;
    if (token && state.config) {
      try {
        await fetch(`${state.config.supabaseUrl}/auth/v1/logout`, {
          method: 'POST',
          headers: authHeaders(true),
          cache: 'no-store'
        });
      } catch {}
    }

    clearSession();
    state.rows = [];
    state.filteredRows = [];
    if (elements.loginForm) elements.loginForm.reset();
    setStatus(elements.loginStatus);
    showPanel(elements.loginPanel);
  };

  elements.loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus(elements.loginStatus);

    if (!elements.loginForm.checkValidity()) {
      elements.loginForm.reportValidity();
      setStatus(elements.loginStatus, 'Enter the administrator email and password.', 'error');
      return;
    }

    const submit = elements.loginForm.querySelector('button[type="submit"]');
    const data = new FormData(elements.loginForm);
    const email = String(data.get('email') || '').trim().toLowerCase();
    const password = String(data.get('password') || '');

    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Verifying…';
    }

    try {
      await signInWithPassword(email, password);
      const authorised = await verifyAdministrator();
      elements.loginForm.reset();

      if (!authorised) {
        showPanel(elements.deniedPanel);
        return;
      }

      await enterDashboard();
    } catch (error) {
      console.error(error);
      clearSession();
      setStatus(elements.loginStatus, error.message || 'Sign-in failed.', 'error');
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = 'Sign in';
      }
    }
  });

  elements.search?.addEventListener('input', applySearch);
  elements.refresh?.addEventListener('click', loadDashboardData);
  elements.exportButton?.addEventListener('click', exportCsv);
  elements.signOut?.addEventListener('click', signOut);
  elements.deniedSignOut?.addEventListener('click', signOut);

  const boot = async () => {
    try {
      await fetchConfig();
      if (!restoreSession()) {
        showPanel(elements.loginPanel);
        return;
      }

      const authorised = await verifyAdministrator();
      if (!authorised) {
        showPanel(elements.deniedPanel);
        return;
      }

      await enterDashboard();
    } catch (error) {
      console.error(error);
      clearSession();

      if (state.config) {
        setStatus(elements.loginStatus, 'Your previous session ended. Please sign in again.', 'error');
        showPanel(elements.loginPanel);
        return;
      }

      if (elements.boot) {
        const spinner = elements.boot.querySelector('.spinner');
        const heading = elements.boot.querySelector('h1');
        const paragraph = elements.boot.querySelector('p');
        if (spinner) spinner.hidden = true;
        if (heading) heading.textContent = 'Administrator login unavailable';
        if (paragraph) paragraph.textContent = error.message || 'Please try again later.';
      }
    }
  };

  boot();
})();
