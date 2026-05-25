export async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    key, 256
  );
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function randomHex(bytes = 32) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getSession(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/rb_jb_session=([a-f0-9]{64})/);
  if (!match) return null;
  const raw = await env.JD_STORE.get('jbsession:' + match[1]);
  if (!raw) return null;
  return JSON.parse(raw);
}

export function makeSessionCookie(token) {
  return `rb_jb_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 3600}`;
}

export function clearSessionCookie() {
  return 'rb_jb_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

export function json(data, status = 200, extra = {}) {
  const body = JSON.stringify(data);
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-transform',
      ...extra,
    },
  });
}
