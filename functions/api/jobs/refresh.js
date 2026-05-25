// POST /api/jobs/refresh
// Called by weekly GitHub Actions workflow to pre-warm KV cache for all skill categories

const SKILLS = [
  '', 'trucking', 'welding', 'hvac', 'electrician', 'construction',
  'warehouse', 'forklift', 'food service', 'customer service',
  'data entry', 'landscaping', 'manufacturing', 'solar', 'it support',
];

export async function onRequest(context) {
  const { env, request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*' },
      status: 204,
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const secret = request.headers.get('X-Refresh-Secret');
  if (!env.JOBS_REFRESH_SECRET || secret !== env.JOBS_REFRESH_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const baseUrl = new URL(request.url);
  const listingsBase = `${baseUrl.protocol}//${baseUrl.host}/api/jobs/listings`;

  const results = [];
  for (const skill of SKILLS) {
    try {
      const url = `${listingsBase}?skill=${encodeURIComponent(skill)}&refresh=1`;
      const res = await fetch(url);
      results.push({ skill: skill || '(all)', status: res.status });
    } catch (err) {
      results.push({ skill: skill || '(all)', error: String(err) });
    }
  }

  return new Response(JSON.stringify({ refreshed: results, at: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
