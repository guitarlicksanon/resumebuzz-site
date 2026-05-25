import { getSession, json } from './lib.js';

export async function onRequest({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ user: null });
  const raw = await env.JD_STORE.get('jbuser:' + session.email);
  if (!raw) return json({ user: null });
  const user = JSON.parse(raw);
  const profileRaw = await env.JD_STORE.get('jbprofile:' + session.email);
  const profile = profileRaw ? JSON.parse(profileRaw) : {};
  return json({ user: { email: user.email, name: user.name, profile } });
}
