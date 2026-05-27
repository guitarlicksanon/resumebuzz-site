// GET /api/admin/email-list
// Returns all ResumeBuzz pro subscriber emails.
// Auth: X-Admin-Secret header required.
// Keys in JD_STORE are formatted as pro:email@example.com

export async function onRequestGet({ request, env }) {
  const headers = { 'Content-Type': 'application/json' };

  const secret = request.headers.get('X-Admin-Secret');
  if (!secret || !env.ADMIN_SECRET || secret !== env.ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });
  }

  try {
    const { keys } = await env.JD_STORE.list({ prefix: 'pro:' });
    const emails = keys
      .map(function (k) { return k.name.replace(/^pro:/, ''); })
      .filter(function (e) { return e && e.includes('@'); });

    return new Response(JSON.stringify({ emails }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'internal error' }), { status: 500, headers });
  }
}
