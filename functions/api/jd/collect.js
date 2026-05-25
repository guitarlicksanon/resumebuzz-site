export async function onRequestPost({ request, env }) {
  try {
    const { text, source } = await request.json();
    const clean = (text || '').trim();
    if (clean.length < 80) {
      return new Response(JSON.stringify({ ok: false, error: 'too short' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const key = `jd_raw:${source || 'game'}:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;
    await env.JD_STORE.put(key, JSON.stringify({
      text: clean.slice(0, 15000),
      source: source || 'game',
      ts: new Date().toISOString()
    }));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
