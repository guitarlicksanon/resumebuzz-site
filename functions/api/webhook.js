// POST /api/webhook  — Stripe webhook handler

async function hmacSha256Hex(message, secret) {
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

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader) return false;

  const parts = sigHeader.split(",");
  let timestamp = null;
  const v1sigs = [];
  for (const part of parts) {
    const [k, v] = part.split("=");
    if (k === "t") timestamp = v;
    if (k === "v1") v1sigs.push(v);
  }

  if (!timestamp || v1sigs.length === 0) return false;

  // Reject if timestamp is more than 5 minutes old
  const ts = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) return false;

  const expected = await hmacSha256Hex(`${timestamp}.${rawBody}`, secret);
  return v1sigs.some((v1) => timingSafeEqual(v1, expected));
}

async function getCustomerEmail(customerId, stripeKey) {
  const res = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
    headers: { Authorization: `Bearer ${stripeKey}` },
  });
  if (!res.ok) return null;
  const customer = await res.json();
  return customer.email || null;
}

export async function onRequestPost({ request, env }) {
  const rawBody = await request.text();
  const sigHeader = request.headers.get("Stripe-Signature");

  // Verify webhook signature
  const valid = await verifyStripeSignature(rawBody, sigHeader, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ok = new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  try {
    const type = event.type;
    const obj = event.data?.object;

    // ── Subscription created or updated ──────────────────────────
    if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
      if (obj.status === "active") {
        const customerId = obj.customer;
        const subscriptionId = obj.id;
        const email = await getCustomerEmail(customerId, env.STRIPE_SECRET_KEY);
        if (email) {
          const normalized = email.toLowerCase();
          await env.JD_STORE.put(
            `pro:${normalized}`,
            JSON.stringify({ active: true, subscriptionId, customerId })
          );
        }
      }
      return ok;
    }

    // ── Subscription deleted (cancelled) ─────────────────────────
    if (type === "customer.subscription.deleted") {
      const customerId = obj.customer;
      const email = await getCustomerEmail(customerId, env.STRIPE_SECRET_KEY);
      if (email) {
        await env.JD_STORE.delete(`pro:${email.toLowerCase()}`);
      }
      return ok;
    }

    // ── Checkout session completed ────────────────────────────────
    if (type === "checkout.session.completed") {
      const plan = obj.metadata?.plan;
      if (plan === "polish") {
        const customerEmail = obj.customer_details?.email || obj.customer_email || "(unknown)";
        const token = obj.metadata?.token || "(no token)";
        const timestamp = new Date().toISOString();

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "notifications@guitaranon.com",
            to: "lessthanblake@proton.me",
            subject: "New AI Polish order",
            text: [
              "New AI + Human Polish order received.",
              "",
              `Customer email: ${customerEmail}`,
              `Plan: ${plan}`,
              `Timestamp: ${timestamp}`,
              "",
              `Draft token: ${token}`,
              `Retrieve draft from KV key: draft:${token}`,
            ].join("\n"),
          }),
        });
      }
      return ok;
    }
  } catch (e) {
    // Log but always return 200 to prevent Stripe retries on our errors
    console.error("webhook handler error:", e.message);
  }

  return ok;
}
