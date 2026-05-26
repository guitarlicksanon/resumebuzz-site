const JSON_HEADERS = { 'Content-Type': 'application/json' };

function unauthorized() {
  return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: JSON_HEADERS });
}

function checkAuth(request, env) {
  const secret = request.headers.get('X-Admin-Secret');
  return secret && secret === env.ADMIN_SECRET;
}

export async function onRequestGet({ request, env }) {
  if (!checkAuth(request, env)) return unauthorized();
  try {
    const listResult = await env.JD_STORE.list({ prefix: 'code:', limit: 200 });
    const keys = listResult.keys || [];
    const codes = await Promise.all(keys.map(async (k) => {
      const raw = await env.JD_STORE.get(k.name);
      try { return JSON.parse(raw); } catch { return null; }
    }));
    return new Response(JSON.stringify({ ok: true, codes: codes.filter(Boolean) }), { status: 200, headers: JSON_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: JSON_HEADERS });
  }
}

export async function onRequestPost({ request, env }) {
  if (!checkAuth(request, env)) return unauthorized();
  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid JSON' }), { status: 400, headers: JSON_HEADERS });
  }

  if (body.toggle) {
    const key = 'code:' + (body.code || '').toUpperCase().trim();
    const raw = await env.JD_STORE.get(key);
    if (!raw) return new Response(JSON.stringify({ ok: false, error: 'not found' }), { status: 404, headers: JSON_HEADERS });
    let existing;
    try { existing = JSON.parse(raw); } catch { existing = {}; }
    existing.active = !!body.active;
    await env.JD_STORE.put(key, JSON.stringify(existing));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
  }

  const code = (body.code || '').toUpperCase().trim();
  if (!code) return new Response(JSON.stringify({ ok: false, error: 'code required' }), { status: 400, headers: JSON_HEADERS });

  const record = {
    code,
    type: body.type || 'trial',
    discount_percent: body.discountPercent || 0,
    duration_days: body.durationDays || 0,
    max_uses: body.maxUses || 0,
    used_count: 0,
    active: true,
    created_at: new Date().toISOString(),
  };

  try {
    await env.JD_STORE.put('code:' + code, JSON.stringify(record));
    return new Response(JSON.stringify({ ok: true, code: record }), { status: 200, headers: JSON_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: JSON_HEADERS });
  }
}

export async function onRequestDelete({ request, env }) {
  if (!checkAuth(request, env)) return unauthorized();
  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid JSON' }), { status: 400, headers: JSON_HEADERS });
  }
  const code = (body.code || '').toUpperCase().trim();
  if (!code) return new Response(JSON.stringify({ ok: false, error: 'code required' }), { status: 400, headers: JSON_HEADERS });
  try {
    await env.JD_STORE.delete('code:' + code);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: JSON_HEADERS });
  }
}

export async function onRequestPatch({ request, env }) {
  if (!checkAuth(request, env)) return unauthorized();
  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid JSON' }), { status: 400, headers: JSON_HEADERS });
  }
  const code = (body.code || '').toUpperCase().trim();
  if (!code) return new Response(JSON.stringify({ ok: false, error: 'code required' }), { status: 400, headers: JSON_HEADERS });
  const key = 'code:' + code;
  const raw = await env.JD_STORE.get(key);
  if (!raw) return new Response(JSON.stringify({ ok: false, error: 'not found' }), { status: 404, headers: JSON_HEADERS });
  let existing;
  try { existing = JSON.parse(raw); } catch { existing = {}; }
  if (body.active !== undefined) existing.active = !!body.active;
  if (body.used_count !== undefined) existing.used_count = body.used_count;
  try {
    await env.JD_STORE.put(key, JSON.stringify(existing));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: JSON_HEADERS });
  }
}
