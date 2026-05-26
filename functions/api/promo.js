// POST /api/promo  { code: string }
// Validates against KV codes (code: prefix in JD_STORE) with fallback to PROMO_CODES env var

export async function onRequestPost({ request, env }) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const { code } = await request.json();
    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ valid: false }), { status: 200, headers });
    }

    const normalized = code.trim().toUpperCase();

    // Check KV first
    const raw = await env.JD_STORE.get('code:' + normalized);
    if (raw) {
      try {
        const entry = JSON.parse(raw);
        if (entry.active && (entry.maxUses <= 0 || (entry.usedCount || 0) < entry.maxUses)) {
          // Increment used_count
          entry.usedCount = (entry.usedCount || 0) + 1;
          await env.JD_STORE.put('code:' + normalized, JSON.stringify(entry));
          return new Response(JSON.stringify({ valid: true, type: entry.type, discountPercent: entry.discountPercent, durationDays: entry.durationDays }), { status: 200, headers });
        }
      } catch {}
    }

    // Fallback to env var list
    const envCodes = (env.PROMO_CODES || '').split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
    const isValid = envCodes.includes(normalized);
    return new Response(JSON.stringify({ valid: isValid }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ valid: false }), { status: 200, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
