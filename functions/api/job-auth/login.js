import { hashPassword, randomHex, makeSessionCookie, json } from './lib.js';

export async function onRequestPost({ request, env }) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return json({ error: 'Email and password required' }, 400);
    const em = email.toLowerCase().trim();

    const raw = await env.JD_STORE.get('jbuser:' + em);
    if (!raw) return json({ error: 'Invalid email or password' }, 401);
    const user = JSON.parse(raw);
    const hash = await hashPassword(password, user.salt);
    if (hash !== user.hash) return json({ error: 'Invalid email or password' }, 401);

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
