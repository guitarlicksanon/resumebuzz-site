// POST /api/promo  { code: string }
// Validates a promo code against the PROMO_CODES env var (comma-separated list)

export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const { code } = await request.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ valid: false }), { status: 200, headers });
    }

    const raw = env.PROMO_CODES || "";
    const validCodes = raw.split(",").map(c => c.trim().toUpperCase()).filter(Boolean);
    const isValid = validCodes.includes(code.trim().toUpperCase());

    return new Response(JSON.stringify({ valid: isValid }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ valid: false }), { status: 200, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
