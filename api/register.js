const ALLOWED_PLATFORMS = new Set([
  'PC',
  'PlayStation',
  'Xbox',
  'Nintendo',
  'Mobile',
  'Multiple platforms'
]);

const ALLOWED_ORIGINS = new Set([
  'https://playersleague.vip',
  'https://www.playersleague.vip',
  'https://playersleague-vip.vercel.app'
]);

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX = 5;

const rateStore = globalThis.__plvipRateStore || new Map();
globalThis.__plvipRateStore = rateStore;

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function isBrowserSafeSupabaseKey(value) {
  const key = String(value || '').trim();

  if (key.startsWith('sb_publishable_')) return true;
  if (key.startsWith('sb_secret_')) return false;

  const parts = key.split('.');
  if (parts.length !== 3) return false;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload?.role === 'anon';
  } catch {
    return false;
  }
}

function getIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.socket?.remoteAddress || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const previous = rateStore.get(ip) || [];
  const recent = previous.filter((time) => now - time < RATE_WINDOW_MS);

  if (recent.length >= RATE_MAX) {
    rateStore.set(ip, recent);
    return true;
  }

  recent.push(now);
  rateStore.set(ip, recent);

  if (rateStore.size > 2000) {
    for (const [key, times] of rateStore.entries()) {
      if (!times.some((time) => now - time < RATE_WINDOW_MS)) rateStore.delete(key);
    }
  }

  return false;
}

function send(response, status, payload) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  return response.status(status).json(payload);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return send(response, 405, { ok: false, message: 'Method not allowed' });
  }

  const origin = request.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin) && !origin.endsWith('.vercel.app')) {
    return send(response, 403, { ok: false, message: 'Request not allowed' });
  }

  const contentLength = Number(request.headers['content-length'] || 0);
  if (contentLength > 12000) {
    return send(response, 413, { ok: false, message: 'Request too large' });
  }

  if (isRateLimited(getIp(request))) {
    return send(response, 429, {
      ok: false,
      message: 'Too many attempts. Please wait a few minutes and try again.'
    });
  }

  let body;
  try {
    body = typeof request.body === 'string'
      ? JSON.parse(request.body || '{}')
      : (request.body || {});
  } catch {
    return send(response, 400, { ok: false, message: 'Invalid request.' });
  }

  if (cleanText(body.website, 200)) {
    return send(response, 200, { ok: true, message: 'Registration received' });
  }

  const startedAt = Number(body.startedAt || 0);
  if (startedAt && Date.now() - startedAt < 1500) {
    return send(response, 400, { ok: false, message: 'Please try the form again.' });
  }

  const gamerName = cleanText(body.gamerName, 40);
  const email = cleanText(body.email, 254).toLowerCase();
  const mainGame = cleanText(body.mainGame, 60);
  const platform = cleanText(body.platform, 40);
  const country = cleanText(body.country, 60);
  const social = cleanText(body.social, 80);
  const priority = cleanText(body.priority, 500);
  const consent = body.consent === true;

  if (gamerName.length < 2 || gamerName.length > 40) {
    return send(response, 400, { ok: false, message: 'Please enter a valid gamer name.' });
  }

  if (email.length < 5 || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return send(response, 400, { ok: false, message: 'Please enter a valid email address.' });
  }

  if (mainGame.length < 2 || mainGame.length > 60) {
    return send(response, 400, { ok: false, message: 'Please enter your main game.' });
  }

  if (!ALLOWED_PLATFORMS.has(platform)) {
    return send(response, 400, { ok: false, message: 'Please select a valid platform.' });
  }

  if (country.length < 2 || country.length > 60) {
    return send(response, 400, { ok: false, message: 'Please enter your country.' });
  }

  if (!consent) {
    return send(response, 400, { ok: false, message: 'Consent is required to register.' });
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
  const publishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();

  if (!supabaseUrl || !publishableKey || !isBrowserSafeSupabaseKey(publishableKey)) {
    console.error('Missing or unsafe Supabase publishable configuration');
    return send(response, 503, {
      ok: false,
      message: 'Registration is temporarily unavailable. Please try again later.'
    });
  }

  try {
    const result = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/submit_founding_player`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_gamer_name: gamerName,
        p_email: email,
        p_main_game: mainGame,
        p_platform: platform,
        p_country: country,
        p_social: social || null,
        p_priority: priority || null,
        p_consent: true
      })
    });

    if (!result.ok) {
      const diagnostic = await result.text();
      console.error('Supabase registration failed', result.status, diagnostic);
      return send(response, 502, {
        ok: false,
        message: 'Registration could not be completed. Please try again.'
      });
    }

    return send(response, 200, {
      ok: true,
      message: 'Welcome to the founding player list.'
    });
  } catch (error) {
    console.error('Registration request failed', error);
    return send(response, 502, {
      ok: false,
      message: 'Registration could not be completed. Please try again.'
    });
  }
}
