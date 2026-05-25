import { getSession, json } from '../job-auth/lib.js';

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const list = await env.JD_STORE.list({ prefix: 'jbtrack:' + session.email + ':' });
  const jobs = (await Promise.all(
    list.keys.map(async k => {
      const raw = await env.JD_STORE.get(k.name);
      return raw ? JSON.parse(raw) : null;
    })
  )).filter(Boolean).sort((a, b) => b.addedAt - a.addedAt);

  return json({ jobs });
}

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'Unauthorized' }, 401);

  const body = await request.json();
  const id = crypto.randomUUID();
  const job = {
    id,
    title: body.title || '',
    company: body.company || '',
    location: body.location || '',
    salary: body.salary || '',
    url: body.url || '',
    source: body.source || '',
    status: 'Researching',
    jd: '',
    notes: '',
    addedAt: Date.now(),
  };
  await env.JD_STORE.put('jbtrack:' + session.email + ':' + id, JSON.stringify(job));
  return json({ ok: true, job });
}
