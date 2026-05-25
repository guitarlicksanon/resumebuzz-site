import { hashPassword, randomHex, makeSessionCookie, json } from './lib.js';

export async function onRequestPost({ request, env }) {
  try {
    const { email, password, name } = await request.json();
    if (!email || !password || !name) return json({ error: 'Name, email, and password required' }, 400);
    const em = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return json({ error: 'Invalid email address' }, 400);
    if (password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400);

    const existing = await env.JD_STORE.get('jbuser:' + em);
    if (existing) return json({ error: 'Account already exists. Please log in.' }, 409);

    const salt = randomHex(16);
    const hash = await hashPassword(password, salt);
    const user = { email: em, name: name.trim(), salt, hash, createdAt: Date.now() };
    await env.JD_STORE.put('jbuser:' + em, JSON.stringify(user));

    const token = randomHex(32);
    await env.JD_STORE.put('jbsession:' + token, JSON.stringify({ email: em }), {
      expirationTtl: 30 * 24 * 3600,
    });

    return json({ ok: true, name: user.name, email: em }, 200, {
      'Set-Cookie': makeSessionCookie(token),
    });
  } catch {
    return json({ error: 'Server error' }, 500);
  }
}
