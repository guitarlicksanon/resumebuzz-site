async function hmacHex(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyCookie(cookieHeader, password, secret) {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(/(?:^|;\s*)rb_session=([^;]+)/);
  if (!match) return false;
  const provided = match[1];
  const expected = await hmacHex(password, secret);
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
  };

  try {
    const body = await request.json();
    const { password } = body;

    if (!password || password !== env.WRITER_PASSWORD) {
      return new Response(JSON.stringify({ error: "incorrect" }), {
        status: 401,
        headers,
      });
    }

    const token = await hmacHex(env.WRITER_PASSWORD, env.COOKIE_SECRET);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        ...headers,
        "Set-Cookie": `rb_session=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000; Path=/`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400,
      headers,
    });
  }
}

export async function onRequestGet({ request, env }) {
  const cookieHeader = request.headers.get("Cookie");
  const ok = await verifyCookie(cookieHeader, env.WRITER_PASSWORD, env.COOKIE_SECRET);
  return new Response(JSON.stringify({ ok }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
