// POST /api/admin/grant, exchanges a bink grant token for an rb_session cookie

async function hmacHex(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  const headers = { 'Content-Type': 'application/json' };

  try {
    const { token } = await request.json();
    if (!token) return new Response(JSON.stringify({ ok: false }), { status: 400, headers });

    const raw = await env.OYE_ADMIN_KV.get('grant:' + token);
    if (!raw) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid or expired grant' }), { status: 401, headers });
    }

    const grant = JSON.parse(raw);
    await env.OYE_ADMIN_KV.delete('grant:' + token);

    if (Date.now() > grant.expiresAt) {
      return new Response(JSON.stringify({ ok: false, error: 'Grant expired' }), { status: 401, headers });
    }

    const sessionToken = await hmacHex(env.WRITER_PASSWORD, env.COOKIE_SECRET);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        ...headers,
        'Set-Cookie': `rb_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000; Path=/`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Server error' }), { status: 500, headers });
  }
}
