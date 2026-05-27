// POST /api/suggest-skills
// Body: { jobDescription, targetRole, targetIndustry, experience: [...], currentSkills: { technical, tools, languages } }
// Returns: { technical: string[], tools: string[], languages: string[] }

function getWeekKey() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

const SUGGEST_LIMIT = 60;

function parseClaudeJson(rawText) {
  let s = String(rawText || "").trim();
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) s = fence[1].trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  return JSON.parse(s);
}

function buildPrompt({ jobDescription, targetRole, targetIndustry, experience, currentSkills }) {
  const expText = (Array.isArray(experience) ? experience : [])
    .map((e) => {
      const head = [e.title, e.company].filter(Boolean).join(" at ");
      const lines = [head];
      if (e.description) lines.push(e.description);
      if (Array.isArray(e.achievements) && e.achievements.length) {
        lines.push(...e.achievements.map((a) => "- " + a));
      }
      return lines.filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 8000);

  const cur = currentSkills || {};
  const currentTech = (cur.technical || "").trim();
  const currentTools = (cur.tools || "").trim();
  const currentLanguages = (cur.languages || "").trim();

  return `You are an ATS keyword expert helping a candidate populate the Skills section of their resume. Suggest concrete, high-impact keywords the candidate should consider adding, partitioned across three buckets:

- "technical": programming languages, frameworks, technical methodologies, domain-specific technical concepts (e.g., "Python 3.x", "RAG", "embeddings", "SQL", "A/B testing", "GAAP", "OSHA compliance")
- "tools": named products, platforms, SaaS services, vendors (e.g., "Salesforce", "Jira", "AWS Lambda", "Cloudflare Workers", "Figma", "QuickBooks")
- "languages": spoken/written languages ONLY IF the job description explicitly mentions a language requirement. Do not suggest spoken languages otherwise; return an empty array.

HARD RULES:
1. Never suggest a keyword that is already present (case-insensitive substring match) in the candidate's current skills or in their experience text. The user only wants to see what's MISSING.
2. Suggest only keywords that are clearly supported by the candidate's actual experience, OR that appear in the job description and are reasonable for the candidate to add. Do not fabricate experience.
3. Prefer specific over generic. "Python 3.x (FastAPI)" beats "Python". "Salesforce CRM" beats "CRM software".
4. Maximum 8 suggestions per bucket. Quality over quantity. If a bucket has nothing genuinely useful to add, return an empty array.
5. Never suggest soft-skill cliches ("team player", "self-starter", "communication skills"). Resume readers and ATS systems both discount these.

Return ONLY a valid JSON object with this exact structure. No markdown, no explanation, no text outside the JSON:

{
  "technical": ["..."],
  "tools": ["..."],
  "languages": ["..."]
}

TARGET ROLE: ${targetRole || "(not specified)"}
TARGET INDUSTRY: ${targetIndustry || "(not specified)"}

CURRENT SKILLS THE CANDIDATE HAS ALREADY ENTERED:
- Technical: ${currentTech || "(empty)"}
- Tools: ${currentTools || "(empty)"}
- Languages: ${currentLanguages || "(empty)"}

CANDIDATE EXPERIENCE:
${expText || "(none provided)"}

JOB DESCRIPTION:
${(jobDescription || "(not pasted)").slice(0, 10000)}`;
}

export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rlKey = `suggest:${ip}:${getWeekKey()}`;
    let count = 0;
    if (env.JD_STORE) {
      const stored = await env.JD_STORE.get(rlKey);
      count = stored ? (parseInt(stored) || 0) : 0;
    }
    if (count >= SUGGEST_LIMIT) {
      return new Response(JSON.stringify({ error: "limit_reached" }), { status: 429, headers });
    }

    const body = await request.json();
    const prompt = buildPrompt(body || {});

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeRes.ok) throw new Error("Claude API error: " + claudeRes.status);

    const claudeData = await claudeRes.json();
    const raw = claudeData.content[0].text;
    const parsed = parseClaudeJson(raw);

    const normalize = (arr) =>
      Array.isArray(arr)
        ? arr.map((s) => String(s).trim()).filter(Boolean).slice(0, 8)
        : [];

    const out = {
      technical: normalize(parsed.technical),
      tools: normalize(parsed.tools),
      languages: normalize(parsed.languages),
    };

    if (env.JD_STORE) {
      await env.JD_STORE.put(rlKey, String(count + 1), { expirationTtl: 604800 });
    }

    return new Response(JSON.stringify(out), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: "Suggestion failed. Please try again." }), {
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
      "Access-Control-Allow-Origin": "*",
    },
  });
}
