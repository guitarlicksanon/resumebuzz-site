export async function onRequestGet({ request, env }) {
  const secret = request.headers.get('X-Admin-Secret');
  if (!secret || secret !== env.ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const url = new URL(request.url);
  const source = url.searchParams.get('source') || '';
  const prefix = source ? `jd_raw:${source}:` : 'jd_raw:';
  const cursor = url.searchParams.get('cursor') || undefined;

  const listed = await env.JD_STORE.list({ prefix, limit: 100, cursor });
  const keys = listed.keys.map(k => k.name);

  const items = await Promise.all(
    keys.map(async k => {
      try { return { key: k, ...JSON.parse(await env.JD_STORE.get(k)) }; }
      catch { return { key: k, error: 'parse failed' }; }
    })
  );

  return new Response(JSON.stringify({
    count: items.length,
    cursor: listed.cursor || null,
    items
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
