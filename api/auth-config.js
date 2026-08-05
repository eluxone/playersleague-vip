export default function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.setHeader('Cache-Control', 'no-store, max-age=0');
    return response.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    console.error('Missing Supabase environment variables for admin authentication');
    response.setHeader('Cache-Control', 'no-store, max-age=0');
    return response.status(503).json({
      ok: false,
      message: 'Administrator login is temporarily unavailable.'
    });
  }

  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  return response.status(200).json({
    ok: true,
    supabaseUrl: supabaseUrl.replace(/\/$/, ''),
    publishableKey
  });
}
