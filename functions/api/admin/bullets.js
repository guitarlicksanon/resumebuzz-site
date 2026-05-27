// GET  /api/admin/bullets - fetch marketing_features for all RB products
// POST /api/admin/bullets { product_id, features: ['...'] } - update features

const PRICES = [
  { price_id: 'price_1TZYSkJvPEXScjfdBoxWXZnV', label: 'AI Draft ($19)' },
  { price_id: 'price_1TZYUrJvPEXScjfdUfeSYwAO', label: 'AI + Human Polish ($79)' },
  { price_id: 'price_1TZYXaJvPEXScjfd2BQS90c5', label: 'Human Written ($149)' },
  { price_id: 'price_1TZYZZJvPEXScjfdfgeijAO4', label: 'CV ($199)' },
];

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function auth(request, env) {
  const secret = request.headers.get('X-Admin-Secret');
  return secret && secret === env.ADMIN_SECRET;
}

export async function onRequestGet({ request, env }) {
  if (!auth(request, env)) return json({ error: 'unauthorized' }, 401);
  if (!env.STRIPE_SECRET_KEY) return json({ error: 'Stripe not configured' }, 500);

  const stripeAuth = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
  const base = 'https://api.stripe.com/v1';
  const url = new URL(request.url);

  // ?all=true returns every active product (used by GA which shares this Stripe account)
  if (url.searchParams.get('all') === 'true') {
    try {
      const res = await fetch(`${base}/products?limit=100&active=true`, { headers: stripeAuth });
      const data = await res.json();
      if (data.error) return json({ error: data.error.message }, 400);
      const products = (data.data || []).map(function (p) {
        return {
          product_id: p.id,
          product_name: p.name,
          label: p.name,
          features: (p.marketing_features || []).map(function (f) { return f.name; }),
        };
      });
      return json({ ok: true, products });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  const products = await Promise.all(PRICES.map(async function ({ price_id, label }) {
    try {
      const res = await fetch(`${base}/prices/${price_id}?expand[]=product`, { headers: stripeAuth });
      const data = await res.json();
      if (data.error) return { price_id, label, error: data.error.message };
      const product = data.product;
      return {
        price_id,
        label,
        product_id: product.id,
        product_name: product.name,
        features: (product.marketing_features || []).map(function (f) { return f.name; }),
      };
    } catch (e) {
      return { price_id, label, error: e.message };
    }
  }));

  return json({ ok: true, products });
}

export async function onRequestPost({ request, env }) {
  if (!auth(request, env)) return json({ error: 'unauthorized' }, 401);
  if (!env.STRIPE_SECRET_KEY) return json({ error: 'Stripe not configured' }, 500);

  const body = await request.json().catch(() => ({}));
  const { product_id, features } = body;
  if (!product_id || !Array.isArray(features)) {
    return json({ error: 'product_id and features[] required' }, 400);
  }

  const stripeAuth = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
  const base = 'https://api.stripe.com/v1';

  const params = new URLSearchParams();
  if (features.length === 0) {
    params.append('marketing_features', '');
  } else {
    features.forEach(function (name, i) {
      params.append(`marketing_features[${i}][name]`, name.trim());
    });
  }

  try {
    const res = await fetch(`${base}/products/${product_id}`, {
      method: 'POST',
      headers: { ...stripeAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await res.json();
    if (data.error) return json({ error: data.error.message }, 400);
    return json({ ok: true, features: (data.marketing_features || []).map(function (f) { return f.name; }) });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
