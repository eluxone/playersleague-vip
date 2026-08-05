(() => {
  'use strict';

  const SESSION_KEY = 'plvip_admin_session_v1';

  const parseJson = async (response) => {
    const text = await response.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
  };

  const authMessage = (payload, fallback) => {
    const raw = payload?.msg
      || payload?.message
      || payload?.error_description
      || payload?.error
      || fallback;

    const message = String(raw || fallback || 'Authentication failed.');
    const normalised = message.toLowerCase();

    if (normalised.includes('invalid login credentials')) {
      return 'The email or password is incorrect. Reset the password in Supabase or use the secure magic link.';
    }
    if (normalised.includes('email not confirmed')) {
      return 'This Supabase user has not been email-confirmed. Confirm the user in Supabase or use the secure magic link.';
    }
    if (normalised.includes('rate limit') || normalised.includes('too many')) {
      return 'Too many login attempts. Wait a few minutes, then try again.';
    }
    return message;
  };

  const storeHashSession = () => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');

    if (!accessToken || !refreshToken) return false;

    const expiresIn = Number(hash.get('expires_in') || 3600);
    const session = {
      accessToken,
      refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
      user: { id: '', email: '' }
    };

    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      history.replaceState(null, document.title, `${location.pathname}${location.search}`);
      return true;
    } catch {
      return false;
    }
  };

  const callbackError = (() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    return hash.get('error_description') || hash.get('error') || '';
  })();

  storeHashSession();

  window.addEventListener('DOMContentLoaded', async () => {
    const form = document.querySelector('[data-login-form]');
    const status = document.querySelector('[data-login-status]');
    if (!form || !status) return;

    const emailInput = form.querySelector('input[name="email"]');
    const passwordInput = form.querySelector('input[name="password"]');
    const signInButton = form.querySelector('button[type="submit"]');

    const setStatus = (message = '', state = '') => {
      status.textContent = message;
      if (state) status.dataset.state = state;
      else status.removeAttribute('data-state');
    };

    if (callbackError) {
      setStatus(authMessage({ error_description: callbackError }, 'The magic link could not be used.'), 'error');
      history.replaceState(null, document.title, location.pathname);
    }

    const magicButton = document.createElement('button');
    magicButton.type = 'button';
    magicButton.className = 'secondary-button';
    magicButton.textContent = 'Send secure magic link';
    magicButton.style.width = '100%';
    magicButton.style.marginTop = '12px';
    signInButton?.insertAdjacentElement('afterend', magicButton);

    const loadConfig = async () => {
      const response = await fetch('/api/auth-config', {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const payload = await parseJson(response);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || 'Administrator authentication is temporarily unavailable.');
      }
      return {
        url: String(payload.supabaseUrl || '').replace(/\/$/, ''),
        key: String(payload.publishableKey || '')
      };
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      setStatus();

      if (!form.checkValidity()) {
        form.reportValidity();
        setStatus('Enter the administrator email and password.', 'error');
        return;
      }

      signInButton.disabled = true;
      magicButton.disabled = true;
      signInButton.textContent = 'Verifying…';

      try {
        const config = await loadConfig();
        const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            apikey: config.key,
            Authorization: `Bearer ${config.key}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            email: String(emailInput.value || '').trim().toLowerCase(),
            password: String(passwordInput.value || '')
          }),
          cache: 'no-store'
        });

        const payload = await parseJson(response);
        if (!response.ok || !payload?.access_token || !payload?.refresh_token) {
          throw new Error(authMessage(payload, 'Sign-in failed.'));
        }

        const session = {
          accessToken: payload.access_token,
          refreshToken: payload.refresh_token,
          expiresAt: Number(payload.expires_at)
            || Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600),
          user: {
            id: payload.user?.id || '',
            email: payload.user?.email || String(emailInput.value || '').trim().toLowerCase()
          }
        };

        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        setStatus('Login accepted. Checking administrator access…', 'success');
        location.reload();
      } catch (error) {
        console.error(error);
        setStatus(error.message || 'Sign-in failed.', 'error');
        signInButton.disabled = false;
        magicButton.disabled = false;
        signInButton.textContent = 'Sign in';
      }
    }, true);

    magicButton.addEventListener('click', async () => {
      setStatus();
      const email = String(emailInput.value || '').trim().toLowerCase();
      if (!email || !emailInput.checkValidity()) {
        emailInput.reportValidity();
        setStatus('Enter the administrator email first.', 'error');
        return;
      }

      signInButton.disabled = true;
      magicButton.disabled = true;
      magicButton.textContent = 'Sending…';

      try {
        const config = await loadConfig();
        const redirectTo = `${location.origin}/admin.html`;
        const response = await fetch(`${config.url}/auth/v1/otp?redirect_to=${encodeURIComponent(redirectTo)}`, {
          method: 'POST',
          headers: {
            apikey: config.key,
            Authorization: `Bearer ${config.key}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({ email, create_user: false }),
          cache: 'no-store'
        });

        const payload = await parseJson(response);
        if (!response.ok) {
          throw new Error(authMessage(payload, 'The magic link could not be sent.'));
        }

        setStatus('Magic link sent. Open the newest email on this device; it will return directly to the admin page.', 'success');
      } catch (error) {
        console.error(error);
        setStatus(error.message || 'The magic link could not be sent.', 'error');
      } finally {
        signInButton.disabled = false;
        magicButton.disabled = false;
        signInButton.textContent = 'Sign in';
        magicButton.textContent = 'Send secure magic link';
      }
    });
  });
})();
