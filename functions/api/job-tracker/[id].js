import { getSession, json } from '../job-auth/lib.js';

export async function onRequestPut({ request, env, params }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'Unauthorized' }, 401);
  const key = 'jbtrack:' + session.email + ':' + params.id;
  const raw = await env.JD_STORE.get(key);
  if (!raw) return json({ error: 'Not found' }, 404);
  const job = JSON.parse(raw);
  const body = await request.json();
  if (body.status !== undefined) job.status = body.status;
  if (body.jd !== undefined) job.jd = body.jd;
  if (body.notes !== undefined) job.notes = body.notes;
  await env.JD_STORE.put(key, JSON.stringify(job));
  return json({ ok: true, job });
}

export async function onRequestDelete({ request, env, params }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'Unauthorized' }, 401);
  await env.JD_STORE.delete('jbtrack:' + session.email + ':' + params.id);
  return json({ ok: true });
}
