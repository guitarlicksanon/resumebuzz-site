// POST /api/score  { text: string }
// Scores generated resume markdown; returns same JSON shape as /api/audit

function getWeekKey() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

const SCORE_LIMIT = 20;

const SCORE_PROMPT = `You are an expert ATS specialist and resume writer. Score the resume text below and return ONLY a valid JSON object with this exact structure. No markdown, no explanation, no text outside the JSON:

{
  "overall_score": <integer 0-100, must equal sum of the 4 category scores>,
  "ats_compatibility": {
    "score": <integer 0-25>,
    "findings": [
      {"severity": "critical" | "warning" | "info", "text": "<specific finding, 1-2 sentences>"}
    ]
  },
  "keyword_density": {
    "score": <integer 0-25>,
    "findings": [...]
  },
  "impact_language": {
    "score": <integer 0-25>,
    "findings": [...]
  },
  "structure": {
    "score": <integer 0-25>,
    "findings": [...]
  }
}

Scoring guidelines:
- ATS Compatibility (0-25): Deduct for non-standard formatting, missing contact info, inconsistent date formats, no clear section headers.
- Keyword Density (0-25): Deduct for missing industry terms, vague skill descriptions, absent role-specific language.
- Impact Language (0-25): Deduct for weak verbs (worked, helped, responsible for), passive voice, bullets without quantified results.
- Structure & Completeness (0-25): Deduct for missing professional summary, wrong section order, inappropriate length, missing key sections.

Provide 2-3 findings per category. Be specific and actionable. critical = must fix, warning = should fix, info = nice to have.

RESUME TEXT:
`;

export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rlKey = `score:${ip}:${getWeekKey()}`;
    let count = 0;
    if (env.JD_STORE) {
      const stored = await env.JD_STORE.get(rlKey);
      count = stored ? (parseInt(stored) || 0) : 0;
    }
    if (count >= SCORE_LIMIT) {
      return new Response(JSON.stringify({ error: "limit_reached" }), { status: 429, headers });
    }

    const { text } = await request.json();
    if (!text || typeof text !== "string" || text.trim().length < 50) {
      return new Response(JSON.stringify({ error: "No resume text provided" }), { status: 400, headers });
    }

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [{ role: "user", content: SCORE_PROMPT + text.trim() }],
      }),
    });

    if (!claudeRes.ok) throw new Error("Claude API error: " + claudeRes.status);

    const claudeData = await claudeRes.json();
    let raw = claudeData.content[0].text.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const scored = JSON.parse(raw);

    if (env.JD_STORE) {
      await env.JD_STORE.put(rlKey, String(count + 1), { expirationTtl: 604800 });
    }

    return new Response(JSON.stringify(scored), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Score failed. Please try again." }), { status: 500, headers });
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
