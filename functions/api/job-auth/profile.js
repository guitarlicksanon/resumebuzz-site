import { getSession, json } from './lib.js';

const FIELDS = ['name','phone','location','linkedin','targetRole','summary','skillsTechnical','skillsTools','skillsLanguages','certifications','experience'];

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'Unauthorized' }, 401);
  const raw = await env.JD_STORE.get('jbprofile:' + session.email);
  return json({ profile: raw ? JSON.parse(raw) : {} });
}

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'Unauthorized' }, 401);
  const body = await request.json();
  const profile = { savedAt: Date.now() };
  for (const f of FIELDS) profile[f] = body[f] || '';
  await env.JD_STORE.put('jbprofile:' + session.email, JSON.stringify(profile));
  return json({ ok: true, profile });
}
