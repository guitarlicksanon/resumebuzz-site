// GET /api/admin/user-lookup?email=EMAIL
// Protected by X-Admin-Secret header matching env.ADMIN_SECRET
// Checks pro:${email} in JD_STORE KV

export async function onRequestGet({ request, env }) {
  const headers = { 'Content-Type': 'application/json' };

  const secret = request.headers.get('X-Admin-Secret');
  if (!secret || secret !== env.ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();

  if (!email) {
    return new Response(JSON.stringify({ error: 'Missing email parameter' }), { status: 400, headers });
  }

  try {
    const raw = await env.JD_STORE.get('pro:' + email);

    if (!raw) {
      return new Response(JSON.stringify({ found: false, email }), { status: 200, headers });
    }

    let subscriptionData = null;
    try {
      subscriptionData = JSON.parse(raw);
    } catch (_) {
      subscriptionData = raw;
    }

    return new Response(JSON.stringify({
      found: true,
      email,
      isPro: true,
      subscriptionData,
    }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
