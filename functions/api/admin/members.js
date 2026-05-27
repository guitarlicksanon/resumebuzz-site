// GET /api/admin/members  - list all pro members
// DELETE /api/admin/members { email } - revoke pro
// POST /api/admin/members { email, blocked } - block/unblock user

const headers = { 'Content-Type': 'application/json' };

function unauthorized() {
  return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });
}

function checkAuth(request, env) {
  const secret = request.headers.get('X-Admin-Secret');
  return secret && secret === env.ADMIN_SECRET;
}

export async function onRequestGet({ request, env }) {
  if (!checkAuth(request, env)) return unauthorized();

  try {
    const listResult = await env.JD_STORE.list({ prefix: 'pro:', limit: 200 });
    const keys = listResult.keys || [];

    const members = await Promise.all(keys.map(async (k) => {
      const email = k.name.slice('pro:'.length);
      const raw = await env.JD_STORE.get(k.name);
      let data = null;
      let createdAt = null;
      if (raw) {
        try {
          data = JSON.parse(raw);
          if (data && data.created_at) createdAt = data.created_at;
        } catch {
          data = raw;
        }
      }
      return { email, data, createdAt };
    }));

    // Sort by createdAt desc if available, otherwise by email
    members.sort(function (a, b) {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (a.createdAt) return -1;
      if (b.createdAt) return 1;
      return a.email.localeCompare(b.email);
    });

    return new Response(JSON.stringify({ ok: true, members }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers });
  }
}

export async function onRequestDelete({ request, env }) {
  if (!checkAuth(request, env)) return unauthorized();

  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid JSON' }), { status: 400, headers });
  }

  const { email } = body;
  if (!email) {
    return new Response(JSON.stringify({ ok: false, error: 'email required' }), { status: 400, headers });
  }

  try {
    await env.JD_STORE.delete('pro:' + email.toLowerCase().trim());
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers });
  }
}

export async function onRequestPost({ request, env }) {
  if (!checkAuth(request, env)) return unauthorized();

  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid JSON' }), { status: 400, headers });
  }

  const { email, blocked, pro } = body;
  if (!email) {
    return new Response(JSON.stringify({ ok: false, error: 'email required' }), { status: 400, headers });
  }

  const normalized = email.toLowerCase().trim();

  if (typeof pro !== 'undefined') {
    try {
      if (pro) {
        await env.JD_STORE.put('pro:' + normalized, JSON.stringify({ granted_manually: true, created_at: new Date().toISOString() }));
      } else {
        await env.JD_STORE.delete('pro:' + normalized);
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers });
    }
  }

  try {
    if (blocked === false) {
      await env.JD_STORE.delete('blocked:' + normalized);
    } else {
      await env.JD_STORE.put('blocked:' + normalized, JSON.stringify({ blocked: true, blockedAt: new Date().toISOString() }));
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers });
  }
}
