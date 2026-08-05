function isBrowserSafeSupabaseKey(value) {
  const key = String(value || '').trim();

  if (key.startsWith('sb_publishable_')) return true;
  if (key.startsWith('sb_secret_')) return false;

  // Support only the legacy anon JWT, never service_role.
  const parts = key.split('.');
  if (parts.length !== 3) return false;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload?.role === 'anon';
  } catch {
    return false;
  }
}

export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
  const publishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();

  if (!supabaseUrl || !publishableKey) {
    console.error('Missing Supabase environment variables for admin authentication');
    return response.status(503).json({
      ok: false,
      message: 'Administrator login is temporarily unavailable.'
    });
  }

  if (!isBrowserSafeSupabaseKey(publishableKey)) {
    console.error('SUPABASE_PUBLISHABLE_KEY is not a browser-safe publishable or anon key');
    return response.status(503).json({
      ok: false,
      message: 'Administrator login needs its publishable Supabase key configured.'
    });
  }

  return response.status(200).json({
    ok: true,
    supabaseUrl: supabaseUrl.replace(/\/$/, ''),
    publishableKey
  });
}
