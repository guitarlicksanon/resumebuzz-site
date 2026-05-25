// GET /api/admin/stats — admin stats endpoint for ResumeBuzz

export async function onRequestGet({ request, env }) {
  const headers = { "Content-Type": "application/json" };

  // Auth check
  const secret = request.headers.get("X-Admin-Secret");
  if (!secret || secret !== env.ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers,
    });
  }

  try {
    // Count active pro subscribers (keys with prefix 'pro:')
    const proList = await env.JD_STORE.list({ prefix: "pro:" });
    const proSubscribers = proList.keys.length;

    // Count draft submissions (keys with prefix 'draft:')
    const draftList = await env.JD_STORE.list({ prefix: "draft:" });
    const draftCount = draftList.keys.length;

    // Count job description entries (keys with prefix 'jd:')
    const jdList = await env.JD_STORE.list({ prefix: "jd:" });
    const jdCount = jdList.keys.length;

    return new Response(
      JSON.stringify({
        brand: "resumebuzz",
        proSubscribers,
        draftCount,
        jdCount,
      }),
      { status: 200, headers }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ brand: "resumebuzz", error: e.message }),
      { status: 500, headers }
    );
  }
}
