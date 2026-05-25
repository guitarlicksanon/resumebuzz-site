// POST /api/pro-auth  { email: string }
// Checks pro subscription status and issues a single-use download token.

export async function onRequestPost({ request, env }) {
  const headers = { "Content-Type": "application/json" };

  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ isPro: false }), { status: 200, headers });
    }

    const normalized = email.toLowerCase().trim();
    const raw = await env.JD_STORE.get(`pro:${normalized}`);

    if (!raw) {
      return new Response(JSON.stringify({ isPro: false }), { status: 200, headers });
    }

    let record;
    try {
      record = JSON.parse(raw);
    } catch {
      return new Response(JSON.stringify({ isPro: false }), { status: 200, headers });
    }

    if (!record.active) {
      return new Response(JSON.stringify({ isPro: false }), { status: 200, headers });
    }

    // Generate a single-use download token (TTL 1 hour)
    const dlToken = crypto.randomUUID();
    await env.JD_STORE.put(`dltoken:${dlToken}`, JSON.stringify({ email: normalized }), {
      expirationTtl: 3600,
    });

    return new Response(JSON.stringify({ isPro: true, dlToken }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ isPro: false, error: e.message }), {
      status: 500,
      headers,
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
