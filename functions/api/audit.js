function parseZipEntries(bytes) {
  const entries = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let i = 0;
  while (i <= bytes.length - 30) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x03 &&
      bytes[i + 3] === 0x04
    ) {
      const compressionMethod = view.getUint16(i + 8, true);
      const compressedSize = view.getUint32(i + 18, true);
      const fileNameLength = view.getUint16(i + 26, true);
      const extraFieldLength = view.getUint16(i + 28, true);
      const dataOffset = i + 30 + fileNameLength + extraFieldLength;
      const name = new TextDecoder().decode(bytes.slice(i + 30, i + 30 + fileNameLength));
      entries.push({ name, compressionMethod, compressedSize, dataOffset });
      i = dataOffset + compressedSize;
    } else {
      i++;
    }
  }
  return entries;
}

async function extractDocxText(buffer) {
  const bytes = new Uint8Array(buffer);
  const entries = parseZipEntries(bytes);
  const entry = entries.find((e) => e.name === "word/document.xml");
  if (!entry) {
    throw new Error("word/document.xml not found in DOCX");
  }
  const compressed = bytes.slice(entry.dataOffset, entry.dataOffset + entry.compressedSize);
  let xmlText;
  if (entry.compressionMethod === 0) {
    xmlText = new TextDecoder().decode(compressed);
  } else if (entry.compressionMethod === 8) {
    const ds = new DecompressionStream("deflate-raw");
    const writer = ds.writable.getWriter();
    writer.write(compressed);
    writer.close();
    const reader = ds.readable.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    xmlText = new TextDecoder().decode(merged);
  } else {
    throw new Error("Unsupported compression method: " + entry.compressionMethod);
  }
  const stripped = xmlText.replace(/<[^>]+>/g, " ");
  const decoded = stripped
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)));
  const plain = decoded.replace(/\s+/g, " ").trim();
  return plain;
}

function uint8ToBase64(bytes) {
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function parseClaudeJson(rawText) {
  let s = String(rawText || "").trim();
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) s = fence[1].trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  return JSON.parse(s);
}

async function extractPdfAsAts(arrayBuffer, env) {
  const bytes = new Uint8Array(arrayBuffer);
  const base64Data = uint8ToBase64(bytes);
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = today.slice(0, 4);
  const extractionPrompt = `You are a basic ATS text extractor (Workday, Greenhouse, Lever, iCIMS, Taleo). Do two things and only these two things:

1. Extract the plain text from this PDF EXACTLY as a real ATS pipeline would.
2. List visual or layout hazards that would damage text EXTRACTION itself.

EXTRACTION RULES (follow strictly, do not "improve" the output):
- Read top-to-bottom, left-to-right as a single column. Multi-column layouts must be interleaved by visual reading order — do not reorder them to make them readable. That mangling is what real ATS produces.
- Drop all visual cues: bold, italic, color, font size, font choice, alignment, spacing. They do not survive extraction.
- Embedded images, charts, icons, skill bars, and logos are invisible — never transcribe content shown only in them.
- Tables: read each row's cells left-to-right separated by single spaces. No column alignment preserved.
- Headers and footers that repeat across pages: include once if they appear on the first page, omit from subsequent pages.
- If text is rendered as part of an image, it is invisible to extraction; do not include it.

HAZARDS RULE — what counts and what does not:
ats_hazards must ONLY list layout/formatting/encoding problems that mangle, lose, or merge the extracted text. Examples that COUNT:
- Multi-column layout that interleaves dates with skills in the extracted text
- Tables holding job titles or dates where columns collapse into run-on strings
- Skill category labels without a delimiter (e.g., "DevelopmentPython, SQL" with no colon) so the label merges with the first skill
- Contact info rendered only in an image or graphic
- Skill bars or charts conveying data with no text equivalent
- Embedded fonts that may not extract (replacement characters in output)
- A run-on italicized paragraph that should have been discrete entries but cannot be parsed as separate jobs

DO NOT list, at any severity, any of the following — they are scoring judgments handled elsewhere, not extraction hazards:
- Future-dated or current-year start dates. The current date is ${today}; ${currentYear} is the present year and is never future-dated. End dates of "Present" are valid current employment markers regardless of how many roles share them.
- Multiple concurrent "Present" roles. Freelance, contract, advisory, founder, fractional, board, and part-time overlap is normal. Never flag concurrent active roles as an extraction or ATS hazard.
- Missing graduation years from Education. Omitting graduation years is a deliberate age-bias protection; never flag it as a hazard at any severity.
- Missing dates from early-career or pre-2000 experience entries; never flag.
- Length, keyword choice, weak verbs, missing summary, section order, or any other interpretive scoring concern. Those belong to the scoring step, not extraction.

Return ONLY a valid JSON object with this exact structure. No markdown, no commentary outside the JSON:

{
  "extracted_text": "<the plain extracted text, with line breaks preserved by \\n>",
  "ats_hazards": [
    {"severity": "critical" | "warning" | "info", "text": "<one specific extraction hazard, 1-2 sentences>"}
  ]
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "pdfs-2024-09-25",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64Data },
            },
            { type: "text", text: extractionPrompt },
          ],
        },
      ],
    }),
  });

  if (!res.ok) throw new Error("Claude PDF extraction error: " + res.status);
  const data = await res.json();
  const parsed = parseClaudeJson(data.content[0].text);
  return {
    text: String(parsed.extracted_text || "").trim(),
    hazards: Array.isArray(parsed.ats_hazards) ? parsed.ats_hazards : [],
  };
}

function buildPrompt(jobDescription) {
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = today.slice(0, 4);
  let prompt = `You are an expert resume writer and ATS specialist with 14 years of experience and over 1,000 resumes written for clients across 6 continents, service, tech, business, engineering, medical, and board-level roles.

CURRENT DATE: Today is ${today}. The current year is ${currentYear}. Treat this as ground truth when evaluating any date on the resume. Do not call a year "future" unless it is strictly greater than ${currentYear}. A start date in ${currentYear} or earlier is a present or past date and must never be flagged as future-dated, even if the role's end date is "Present."

Audit the resume and return ONLY a valid JSON object with this exact structure. No markdown, no explanation, no text outside the JSON:

{
  "overall_score": <integer 0-100, must equal sum of the 4 category scores>,
  "ats_compatibility": {
    "score": <integer 0-25>,
    "findings": [
      {"severity": "critical" | "warning" | "info", "text": "<specific actionable finding, 1-2 sentences>"}
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
- ATS Compatibility (0-25): Deduct for column/table layouts, embedded graphics, headers/footers, non-standard formatting, missing contact details on subsequent pages, inconsistent date formats.
- Keyword Density (0-25): Deduct for missing industry-standard terms, vague skill descriptions (e.g. "Python" instead of "Python 3.x"), absent role-specific language.
- Impact Language (0-25): Deduct for weak verbs (worked, helped, assisted, responsible for), passive voice, bullet points without quantified results.
- Structure & Completeness (0-25): Deduct for missing professional summary, wrong section order for experience level, inappropriate length, missing key sections.

AGE-DISCRIMINATION PROTECTION (HARD RULE)
Omitting graduation years from the Education section is a deliberate, valid choice candidates make to avoid age-based screening bias. Never flag missing graduation years as a finding at any severity (not critical, not warning, not info). Do not suggest "adding graduation years would improve ATS calculation of qualification timelines" or similar. ATS systems do not meaningfully penalize missing graduation years; the candidate's protection trade-off is the right call. The same protection applies to omitting dates from early-career or pre-2000 experience entries that primarily indicate age rather than relevant tenure. Score the resume as if those omissions were neutral choices.

CONCURRENT-ROLES NORMALCY (HARD RULE)
Multiple roles carrying "Present" or current end dates simultaneously is normal and valid. Freelance, contract, consulting, advisory, board, founder, fractional, part-time, and side-business roles routinely overlap with a primary W2 role and with each other. Do not flag concurrent "Present" roles as an ATS anomaly, data quality issue, recruiter red flag, or "looks like four full-time jobs" finding at any severity. ATS systems index roles independently and do not penalize overlap. The builder intake captures each role separately with its own start/end dates by design, so overlap is a faithful representation of the candidate's history, not a parsing artifact. Only flag if the resume itself makes explicit claims that are logically impossible (e.g., the same role text claims two different employers at the same time). Score concurrent active roles as a neutral choice.

Provide 2-4 findings per category. Be specific and actionable, name the actual problem, not a generic tip. critical = must fix before applying, warning = should fix, info = nice to have.`;

  if (jobDescription && jobDescription.trim().length > 0) {
    prompt += `

Additionally, compare the resume against the job description below and add a "job_match" field to the JSON:

"job_match": {
  "match_score": <integer 0-100, percentage of important JD keywords found in the resume>,
  "missing_keywords": [<array of strings: top 8-12 important terms from the JD that are absent from the resume>],
  "present_keywords": [<array of strings: key terms from the JD found in the resume>]
}

JOB DESCRIPTION:
${jobDescription}`;
  }

  return prompt;
}

export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const formData = await request.formData();
    const file = formData.get("resume");
    const jobDescription = formData.get("jobDescription") || "";

    if (!file || typeof file === "string") {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers,
      });
    }

    const fileName = file.name.toLowerCase();
    const isPdf = fileName.endsWith(".pdf");
    const isDocx = fileName.endsWith(".docx") || fileName.endsWith(".doc");

    if (!isPdf && !isDocx) {
      return new Response(JSON.stringify({ error: "Audit failed. Please try again." }), {
        status: 500,
        headers,
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const prompt = buildPrompt(jobDescription);

    let extractedText;
    let extractionHazards = [];

    if (isPdf) {
      const extraction = await extractPdfAsAts(arrayBuffer, env);
      extractedText = extraction.text;
      extractionHazards = extraction.hazards;
    } else {
      extractedText = await extractDocxText(arrayBuffer);
    }

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `${prompt}\n\nRESUME TEXT (as extracted by ATS):\n${extractedText}`,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      throw new Error("Claude API error: " + claudeResponse.status);
    }

    const claudeData = await claudeResponse.json();
    const rawText = claudeData.content[0].text;
    const auditResult = parseClaudeJson(rawText);

    if (extractionHazards.length && auditResult.ats_compatibility) {
      const existing = Array.isArray(auditResult.ats_compatibility.findings)
        ? auditResult.ats_compatibility.findings
        : [];
      auditResult.ats_compatibility.findings = [...extractionHazards, ...existing];
      const criticalHazards = extractionHazards.filter((h) => h.severity === "critical").length;
      const warningHazards = extractionHazards.filter((h) => h.severity === "warning").length;
      const deduction = criticalHazards * 3 + warningHazards * 1;
      if (deduction > 0 && typeof auditResult.ats_compatibility.score === "number") {
        auditResult.ats_compatibility.score = Math.max(0, auditResult.ats_compatibility.score - deduction);
        if (typeof auditResult.overall_score === "number") {
          auditResult.overall_score = Math.max(0, auditResult.overall_score - deduction);
        }
      }
    }

    if (jobDescription && jobDescription.trim().length > 80 && env.JD_STORE) {
      const key = `jd_raw:audit:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;
      env.JD_STORE.put(key, JSON.stringify({ text: jobDescription.trim().slice(0, 15000), source: 'audit', ts: new Date().toISOString() }));
    }

    return new Response(JSON.stringify(auditResult), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: "Audit failed. Please try again." }), {
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
