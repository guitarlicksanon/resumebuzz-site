// GET /api/bullets - returns marketing_features for all RB prices (no auth required)
// Serves from KV cache; falls back to Stripe and re-caches on miss.

const PRICES = [
  { price_id: 'price_1TZYSkJvPEXScjfdBoxWXZnV', label: 'AI Draft ($19)' },
  { price_id: 'price_1TZYUrJvPEXScjfdUfeSYwAO', label: 'AI + Human Polish ($79)' },
  { price_id: 'price_1TZYXaJvPEXScjfd2BQS90c5', label: 'Human Written ($149)' },
  { price_id: 'price_1TZYZZJvPEXScjfdfgeijAO4', label: 'CV ($199)' },
];

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  });
}

export async function onRequestGet({ env }) {
  if (!env.STRIPE_SECRET_KEY) return json({ error: 'Stripe not configured' }, 500);

  const stripeAuth = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
  const base = 'https://api.stripe.com/v1';
  const bullets = {};

  await Promise.all(PRICES.map(async function ({ price_id }) {
    if (env.JD_STORE) {
      const cached = await env.JD_STORE.get('bullets:' + price_id);
      if (cached) {
        try { bullets[price_id] = JSON.parse(cached); return; } catch (e) {}
      }
    }
    try {
      const res = await fetch(`${base}/prices/${price_id}?expand[]=product`, { headers: stripeAuth });
      const data = await res.json();
      if (data.error || !data.product) return;
      const features = (data.product.marketing_features || []).map(function (f) { return f.name; });
      bullets[price_id] = features;
      if (env.JD_STORE) {
        await env.JD_STORE.put('bullets:' + price_id, JSON.stringify(features));
      }
    } catch (e) {}
  }));

  return json({ ok: true, bullets });
}
