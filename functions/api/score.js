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

function buildScorePrompt() {
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = today.slice(0, 4);
  return `You are an expert ATS specialist and resume writer. Score the resume text below and return ONLY a valid JSON object with this exact structure. No markdown, no explanation, no text outside the JSON:

CURRENT DATE: Today is ${today}. The current year is ${currentYear}. Treat this as ground truth when evaluating any date on the resume. Do not call a year "future" unless it is strictly greater than ${currentYear}. A start date in ${currentYear} or earlier is a present or past date and must never be flagged as future-dated, even if the role's end date is "Present."

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

AGE-DISCRIMINATION PROTECTION (HARD RULE)
Omitting graduation years from the Education section is a deliberate, valid choice candidates make to avoid age-based screening bias. Never flag missing graduation years as a finding at any severity. Do not suggest "adding graduation years would improve ATS calculation of qualification timelines" or similar. ATS systems do not meaningfully penalize missing graduation years. The same protection applies to omitting dates from early-career experience that primarily indicates age rather than relevant tenure. Score those omissions as neutral.

CONCURRENT-ROLES NORMALCY (HARD RULE)
Multiple roles carrying "Present" or current end dates simultaneously is normal and valid. Freelance, contract, consulting, advisory, board, founder, fractional, part-time, and side-business roles routinely overlap with a primary W2 role and with each other. Do not flag concurrent "Present" roles as an ATS anomaly, data quality issue, recruiter red flag, or "looks like multiple full-time jobs" finding at any severity. ATS systems index roles independently and do not penalize overlap. Only flag if the resume text itself makes explicit claims that are logically impossible (e.g., two different employers stated for the same role at the same time). Score concurrent active roles as a neutral choice.

Provide 2-3 findings per category. Be specific and actionable. critical = must fix, warning = should fix, info = nice to have.

RESUME TEXT:
`;
}

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
        messages: [{ role: "user", content: buildScorePrompt() + text.trim() }],
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
