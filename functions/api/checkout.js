// POST /api/checkout  { markdown, filename, email, plan }
// Creates a Stripe Checkout session and stores a draft token in KV.

export async function onRequestPost({ request, env }) {
  const headers = { "Content-Type": "application/json" };

  try {
    const body = await request.json();
    const { markdown, filename, email, plan, market, language } = body;

    const validPlans = ["single", "polish", "pro", "human", "cv"];
    if (!validPlans.includes(plan)) {
      return new Response(JSON.stringify({ error: "invalid plan" }), {
        status: 400,
        headers,
      });
    }

    const isHumanPlan = plan === "human" || plan === "cv";

    if (!isHumanPlan && (!markdown || typeof markdown !== "string")) {
      return new Response(JSON.stringify({ error: "markdown is required" }), {
        status: 400,
        headers,
      });
    }

    // Map plan to price ID env var
    const priceMap = {
      single: env.PRICE_AI_SINGLE,
      polish: env.PRICE_AI_POLISH,
      pro:    env.PRICE_PRO_MONTHLY,
      human:  env.PRICE_HUMAN,
      cv:     env.PRICE_CV,
    };
    const priceId = priceMap[plan];
    if (!priceId) {
      return new Response(JSON.stringify({ error: "price not configured" }), {
        status: 500,
        headers,
      });
    }

    // AI plans: store draft token for post-payment download
    let token = null;
    if (!isHumanPlan) {
      token = crypto.randomUUID();
      const draft = { markdown, filename: filename || "Resume", email: email || "", plan, paid: false };
      await env.JD_STORE.put(`draft:${token}`, JSON.stringify(draft), { expirationTtl: 7200 });
    }

    const mode = plan === "pro" ? "subscription" : "payment";
    const cancelUrl = isHumanPlan ? "https://buzzresume.com" : "https://buzzresume.com/build";
    const successUrl = isHumanPlan
      ? `https://buzzresume.com/success?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`
      : `https://buzzresume.com/build/success?token=${token}&session_id={CHECKOUT_SESSION_ID}`;

    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("cancel_url", cancelUrl);
    params.set("metadata[plan]", plan);
    if (market) params.set("metadata[market]", market);
    if (language) params.set("metadata[language]", language);
    params.set("success_url", successUrl);
    if (token) params.set("metadata[token]", token);
    if (email && typeof email === "string" && email.includes("@")) {
      params.set("customer_email", email);
    }
    const requestBody = params.toString();

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: requestBody,
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      return new Response(
        JSON.stringify({ error: session.error?.message || "stripe_error" }),
        { status: 502, headers }
      );
    }

    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
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
