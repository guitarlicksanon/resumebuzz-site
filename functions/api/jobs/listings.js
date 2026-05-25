// GET /api/jobs/listings?skill=welding&location=Chicago&page=1
// Pulls from USAJobs API (free gov API) + cached data from KV

const CACHE_TTL = 6 * 3600;

export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const skill = (url.searchParams.get('skill') || '').trim();
  const location = (url.searchParams.get('location') || '').trim();
  const forceRefresh = url.searchParams.get('refresh') === '1';

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': `public, max-age=${CACHE_TTL}`,
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers, status: 204 });
  }

  const cacheKey = `jobs_v5_${skill || 'all'}_${location || 'any'}`;

  if (!forceRefresh) {
    try {
      const cached = await env.JD_STORE.get(cacheKey, 'json');
      if (cached && cached.expires > Date.now()) {
        return new Response(JSON.stringify({ source: 'cache', ...cached }), { headers });
      }
    } catch {}
  }

  const jobs = await fetchAllJobs(skill, location, env);

  const payload = {
    jobs,
    total: jobs.length,
    expires: Date.now() + CACHE_TTL * 1000,
    fetched: new Date().toISOString(),
    skill,
    location,
  };

  try {
    await env.JD_STORE.put(cacheKey, JSON.stringify(payload), { expirationTtl: CACHE_TTL });
  } catch {}

  return new Response(JSON.stringify({ source: 'live', ...payload }), { headers });
}

async function fetchAllJobs(skill, location, env) {
  const results = await Promise.allSettled([
    fetchUSAJobs(skill, location, env?.USAJOBS_API_KEY, env?.USAJOBS_EMAIL),
  ]);
  const all = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  return dedup(all)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 60);
}

async function fetchUSAJobs(skill, location, apiKey, email) {
  if (!apiKey || !email) return [];

  const params = new URLSearchParams({
    ResultsPerPage: '25',
    WhoMayApply: 'public',
    Fields: 'Min',
  });
  if (skill) params.set('Keyword', skill);
  if (location) params.set('LocationName', location);

  let res;
  try {
    res = await fetch(`https://data.usajobs.gov/api/search?${params}`, {
      headers: {
        'Authorization-Key': apiKey,
        'User-Agent': email,
        'Host': 'data.usajobs.gov',
      },
    });
  } catch {
    return [];
  }

  if (!res.ok) return [];

  let data;
  try {
    data = await res.json();
  } catch {
    return [];
  }

  return (data.SearchResult?.SearchResultItems || []).map(item => {
    const j = item.MatchedObjectDescriptor;
    const pay = j.PositionRemuneration?.[0];
    const salaryStr = pay
      ? `$${Math.round(Number(pay.MinimumRange) / 1000)}k-$${Math.round(Number(pay.MaximumRange) / 1000)}k`
      : '';

    return {
      id: j.PositionID,
      title: j.PositionTitle,
      company: j.OrganizationName,
      location: j.PositionLocationDisplay || location || 'Various',
      url: (j.ApplyURI || [])[0] || `https://www.usajobs.gov/job/${j.PositionID}`,
      date: j.PublicationStartDate || new Date().toISOString(),
      description: (j.UserArea?.Details?.JobSummary || '').replace(/<[^>]+>/g, '').slice(0, 280),
      source: 'USAJobs',
      salary: salaryStr,
      tags: ['Federal', 'Fair Chance Act'],
    };
  });
}

function dedup(jobs) {
  const seen = new Set();
  return jobs.filter(j => {
    const key = j.url || j.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
