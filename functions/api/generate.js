const MARKET_RULES = {
  us: `
MARKET: United States
- Document name: "resume" (not CV); cover letter (not covering letter)
- US English spelling throughout: organize, color, analyze, program, center, favor, traveling, canceled, learned, while, toward, among
- US workplace terms: vacation, layoff, compensation, onboarding, performance review, pay stub, revenue, attorney, elevator, cell phone, parking lot
- NEVER include: photo, date of birth, marital status, nationality, interests/hobbies, objective statement, "References available on request"
- Location format: City, ST (two-letter state code) — Austin, TX / Chicago, IL
- Length: 1 page under 10 years experience; 2 pages maximum for most candidates`,

  canada: `
MARKET: Canada
- Document name: "resume"; cover letter
- Canadian English (same as US spelling for most terms)
- NEVER include: photo, date of birth, marital status, SIN number
- Location format: City, Province abbreviation — Toronto, ON / Vancouver, BC
- Bilingual note: if role or employer is Quebec-based, note French proficiency prominently
- Length: 1-2 pages standard`,

  uk: `
MARKET: United Kingdom
- Document name: "CV" (not resume); covering letter (not cover letter)
- UK English: organise, colour, analyse, programme, centre, favour, travelling, cancelled, learnt, whilst, towards, amongst
- UK workplace terms: annual leave/holiday, redundancy, remuneration, induction, appraisal, payslip, bank holiday, turnover, solicitor/barrister, estate agent, lift, mobile, car park
- Interests/hobbies section: acceptable and often expected
- Photo: omit
- Length: 2 pages standard; 3 acceptable for senior candidates`,

  ireland: `
MARKET: Ireland
- Document name: "CV"; cover letter
- Irish/UK English spelling
- Interests section welcome
- Photo: omit
- Length: 2 pages standard`,

  australia: `
MARKET: Australia / New Zealand
- Document name: "resume" (Australians use "resume" not CV for most roles)
- Australian English: organise, colour, programme, etc.
- Include: suburb/city, state for location (Melbourne, VIC)
- Photo: omit
- Interests/hobbies: acceptable, often included
- Referees: "References available upon request" is fine; 2-3 referees expected at interview stage
- Length: 2-3 pages acceptable; Australians tolerate longer CVs than Americans`,

  dach: `
MARKET: Germany / Austria / Switzerland (DACH)
- Document name: "Lebenslauf" — write the document in German unless intake specifies otherwise
- Photo: professional headshot is expected and should be noted as required
- Personal information section at top: full name, address, date of birth, nationality, phone, email, LinkedIn
- Marital status: optional but commonly included in Germany/Austria
- Lückenloser Lebenslauf: employment gaps must be explained — flag any gaps in the notes
- Education comes BEFORE work experience for recent graduates; work history first for experienced candidates
- Interests/Hobbies section: standard, include
- Signature line at bottom: "Ort, Datum / Unterschrift" placeholder
- Length: 1-2 pages strictly; Germans value brevity and precision
- Formal, third-person voice; avoid self-promotional superlatives
- If writing in German: use formal "Sie" register throughout`,

  france: `
MARKET: France
- Document name: "CV" — write in French unless intake specifies otherwise
- Photo: acceptable and common (not required but not penalized)
- Personal info: name, address, phone, email, LinkedIn; date of birth optional; nationality rarely included
- Professional profile/Accroche: 3-4 line summary at top is standard
- Hobbies/Centres d'intérêt: standard section, include
- Length: strictly 1 page for under 5 years experience; 2 pages maximum
- Formal French register; "vous" form; avoid anglicisms unless role is in English-speaking context
- References: not listed on CV; "Références disponibles sur demande" at bottom is optional`,

  spain: `
MARKET: Spain
- Document name: "Currículum Vitae" or "CV" — write in Spanish unless intake specifies otherwise
- Europass format is widely recognized; structure accordingly
- Photo: common and generally expected
- Personal info: full name, DNI/NIE optional, address, phone, email; date of birth common
- Professional objective (Objetivo profesional): 2-3 lines at top
- Interests/Hobbies (Aficiones): standard, include
- Length: 1-2 pages; 2 pages standard for experienced candidates
- Formal Spanish (usted register in professional contexts)`,

  latam: `
MARKET: Latin America
- Document name: "Currículum Vitae" or "CV" — write in Spanish unless intake specifies otherwise
- Photo: widely expected across the region
- Personal info: full name, nationality, date of birth, phone, email; marital status sometimes included
- Objective statement (Objetivo): 2-3 lines at top
- References section: list 2 references at end, or "Referencias disponibles a solicitud"
- Length: 2 pages standard; warm, relationship-oriented tone
- Family background and community ties can be mentioned where genuinely relevant`,

  mexico: `
MARKET: Mexico
- Document name: "Currículum Vitae" — write in Mexican Spanish unless intake specifies otherwise
- Photo: expected
- Personal info: CURP optional, RFC optional, full name, date of birth, phone, email
- Objective (Objetivo profesional): 2-3 lines at top
- References: include 2 at end, or "Se proporcionan a solicitud"
- Formal "usted" register; respectful, professional tone
- Length: 2 pages standard`,

  colombia: `
MARKET: Colombia
- Document name: "Hoja de Vida" (the Colombian term) or "Currículum Vitae" — write in Colombian Spanish
- Colombian Ministry of Education format is recognized; close to Europass
- Photo: expected
- Personal info: cédula de ciudadanía number (optional to include), full name, date of birth, city, phone, email
- Objective (Perfil Profesional): prominent at top
- References: 2-3 at end is standard Colombian practice
- Length: 2 pages; clear, neutral Colombian Spanish diction`,

  rioplatense: `
MARKET: Argentina / Uruguay (Rioplatense)
- Document name: "Currículum Vitae" or "CV" — write in Rioplatense Spanish; use "vos" naturally (vos sos, vos tenés, etc.)
- Photo: common but not mandatory
- Personal info: DNI (Argentina) or CI (Uruguay) optional, full name, date of birth, phone, email
- Objective (Objetivo): 2-3 lines
- References: "Referencias a solicitud" at end
- Length: 2 pages; intellectual, direct tone — Rioplatense culture values candor and analytical voice`,

  chile: `
MARKET: Chile
- Document name: "Currículum Vitae" — write in Chilean Spanish
- Photo: expected
- Personal info: RUT optional, full name, date of birth, city, phone, email
- Objective (Resumen Profesional): 2-3 lines at top
- Length: 1-2 pages; Chile values conciseness and measurable outcomes
- References: "Referencias disponibles a solicitud"`,

  peru: `
MARKET: Peru
- Document name: "Currículum Vitae" — write in Peruvian Spanish
- Photo: expected
- Personal info: DNI optional, full name, date of birth, district/city, phone, email
- Objective (Objetivo Profesional): prominent at top
- Education: given prominence; academic honors and scores matter
- References: list 2 at end
- Length: 2 pages; first-generation and socioeconomic context can be included when authentic`,

  india: `
MARKET: India
- Document name: "Resume" or "CV" (both used; "resume" for corporate, "CV" for academic/government)
- Photo: common for mid/senior roles, optional for junior
- Personal info: full name, phone, email, city; date of birth and marital status sometimes included for government/PSU roles
- Career Objective: 2-3 lines at top (still widely expected in India unlike US)
- Academics: prominent — include percentage/CGPA for degrees, board results for senior school if recent graduate
- Languages spoken: include
- References: "Available on request" at end
- Length: 2 pages for experienced; 1 page for freshers
- Formal English; avoid casual tone`,

  mena: `
MARKET: UAE / Gulf / MENA
- Document name: "CV" — write in English unless intake specifies Arabic
- Photo: expected and important in Gulf markets
- Personal info: nationality, date of birth, visa status (if relevant), marital status, languages — all standard to include
- Career objective: 3-4 lines at top
- NOC/Sponsorship: note if candidate is free to join immediately or needs NOC
- References: 2 professional references at end
- Length: 2-3 pages; Gulf employers expect comprehensive CVs
- Respectful, formal register; highlight international exposure`,

  japan: `
MARKET: Japan
- Document name: write guidance notes for both "履歴書 (Rirekisho)" for traditional roles and "職務経歴書 (Shokumu-Keirekisho)" for professional experience — if writing in Japanese, produce both
- Photo: required (証明写真 — formal headshot)
- Personal info: full name (kanji and kana), date of birth, address, phone, email, nearest station
- Seal stamp (印鑑): note that handwritten rirekisho traditionally includes seal
- Chronological, factual tone — Japanese resume culture values precision over self-promotion
- Hobbies (趣味・特技): standard section
- Reason for applying (志望動機): prominent, sincere statement about why this company
- Length: rirekisho is typically 1-2 pages; shokumu-keirekisho can be longer
- If writing in Japanese: keigo (丁寧語) register throughout`,

  southeast_asia: `
MARKET: Southeast Asia (Philippines, Malaysia, Singapore, Indonesia)
- Document name: "Resume" or "CV" depending on seniority
- Photo: expected across most of the region
- Personal info: nationality, date of birth, city, phone, email; LinkedIn prominent
- Objective: 2-3 lines
- Language skills: prominent — English proficiency level, other languages
- References: 2-3 at end or "available upon request"
- Length: 2 pages standard
- Professional English; avoid idioms that may not translate across the region`,
};

function buildSystemPrompt(intake) {
  const base = `You are a professional resume writer with 14 years of experience placing candidates across every industry, career level, and geography. You have written thousands of CVs, resumes, cover letters, and LinkedIn profiles for everyone from new graduates to C-suite executives. Your writing sounds unmistakably human — no clichés, no filler, no AI-sounding output.

CORE RULES — NON-NEGOTIABLE
- Third person throughout (no "I", "me", "my") — except LinkedIn which uses first person
- Present tense for the current role; past tense for all previous roles
- Never start a bullet with: "Responsible for", "Tasked with", "Helped with", "Assisted with", "Worked on", "Involved in", "Participated in"
- Every bullet must begin with a strong action verb
- Achievement formula: Action Verb + Specific Action + Measurable Result + Business Impact
- At least 60% of bullets must include a metric or specific outcome
- Never pad — every word earns its place
- Rewrite the client's wording — do not copy sentences verbatim. EXCEPTION: specific numbers, percentages, dollar figures, ratios, and named counts are FACTS, not wording. They must survive rewriting intact. If the input says "400% above quota," "2,000+ clients," "95%+ conversion rate," "62 languages," "100/100 scores," or any other specific figure, that exact figure must appear in the output bullet. Abstracting a number into a vague phrase ("strong results," "high conversion") is a critical error.

GOLDEN RULE — LENGTH
1-2 pages is the standard. 3+ pages only when content genuinely requires it (extensive publications, training portfolios, multi-sector careers). Never pad to hit a page target; never cut strong content to stay short.

CAREER LEVELS
- Graduate (0-1 yr): focus on education, projects, transferable skills. 1 page.
- Junior (1-5 yr): early wins, professional narrative. 1-2 pages.
- Intermediate (5+ yr): achievements, progression, strategic contributions. 2 pages.
- Senior (10+ yr): leadership, organizational impact, board-level exposure. 2-3 pages.`;

  const market = intake.market || intake.region || "us";
  const marketRules = MARKET_RULES[market] || MARKET_RULES.uk;
  const outputLanguage = intake.language;
  const isEnglish = !outputLanguage || outputLanguage === 'English';

  let prompt = base + marketRules;

  if (!isEnglish) {
    prompt += `

LANGUAGE REQUIREMENT
Write the entire document in ${outputLanguage}. Every word, heading, bullet, and section label must be in ${outputLanguage}. Write naturally as a fluent native speaker would. Do not include any English text.`;
  }

  return prompt;
}

function formatExperience(expList) {
  if (!expList || expList.length === 0) return "";
  const lines = [];
  for (const job of expList) {
    lines.push(`COMPANY: ${job.company || ""}`);
    lines.push(`TITLE: ${job.title || ""}`);
    lines.push(`LOCATION: ${job.location || ""}`);
    lines.push(`DATES: ${job.start || ""} – ${job.end || ""}`);
    lines.push(`RAW NOTES: ${job.description || ""}`);
    const achievements = job.achievements || [];
    if (achievements.length > 0) {
      lines.push("KEY ACHIEVEMENTS TO CAPTURE:");
      for (const a of achievements) {
        lines.push(`  - ${a}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

function buildPrompt(intake) {
  const client = intake.client || {};
  const target = intake.target || {};
  const skills = intake.skills || {};
  const additional = intake.additional || {};

  const parts = [];

  parts.push("== CLIENT INFORMATION ==");
  if (client.name) parts.push(`Name: ${client.name}`);
  if (client.email) parts.push(`Email: ${client.email}`);
  if (client.phone) parts.push(`Phone: ${client.phone}`);
  if (client.location) parts.push(`Location: ${client.location}`);
  if (client.linkedin) parts.push(`LinkedIn: ${client.linkedin}`);
  if (client.social && client.social.length > 0) {
    parts.push(`Other profiles: ${client.social.join(", ")}`);
  }

  parts.push("\n== TARGET ROLE ==");
  if (target.role) parts.push(`Role: ${target.role}`);
  if (target.industry) parts.push(`Industry: ${target.industry}`);
  if (target.seniority) parts.push(`Seniority: ${target.seniority}`);

  if (target.job_description && target.job_description.trim()) {
    parts.push("\n== JOB DESCRIPTION ==");
    parts.push(target.job_description.trim());
  }

  if (intake.summary_notes && intake.summary_notes.trim()) {
    parts.push("\n== SUMMARY / PROFILE NOTES ==");
    parts.push(intake.summary_notes.trim());
  }

  if (intake.experience && intake.experience.length > 0) {
    parts.push("\n== WORK HISTORY ==");
    parts.push(formatExperience(intake.experience));
  }

  if (intake.education && intake.education.length > 0) {
    parts.push("\n== EDUCATION ==");
    for (const ed of intake.education) {
      const line = [
        ed.degree,
        ed.major,
        ed.institution,
        ed.year,
        ed.honors,
        ed.gpa ? `GPA: ${ed.gpa}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
      parts.push(line);
    }
  }

  if (intake.certifications && intake.certifications.length > 0) {
    parts.push("\n== CERTIFICATIONS ==");
    for (const cert of intake.certifications) {
      parts.push(`- ${cert}`);
    }
  }

  const hasSkills =
    (skills.technical && skills.technical.length > 0) ||
    (skills.tools && skills.tools.length > 0) ||
    (skills.languages && skills.languages.length > 0);

  if (hasSkills) {
    parts.push("\n== SKILLS ==");
    if (skills.technical && skills.technical.length > 0) {
      parts.push(`Technical: ${skills.technical.join(", ")}`);
    }
    if (skills.tools && skills.tools.length > 0) {
      parts.push(`Tools: ${skills.tools.join(", ")}`);
    }
    if (skills.languages && skills.languages.length > 0) {
      parts.push(`Languages: ${skills.languages.join(", ")}`);
    }
  }

  const hasAdditional =
    additional.volunteer ||
    additional.publications ||
    additional.board ||
    additional.other;

  if (hasAdditional) {
    parts.push("\n== ADDITIONAL ==");
    if (additional.volunteer) parts.push(`Volunteer: ${additional.volunteer}`);
    if (additional.publications) parts.push(`Publications: ${additional.publications}`);
    if (additional.board) parts.push(`Board / Advisory: ${additional.board}`);
    if (additional.other) parts.push(`Other: ${additional.other}`);
  }

  if (intake.writer_notes && intake.writer_notes.trim()) {
    parts.push("\n== WRITER NOTES ==");
    parts.push(intake.writer_notes.trim());
  }

  if (intake.template) {
    parts.push(`\n== TEMPLATE ==\n${intake.template}`);
  }

  parts.push(`
== OUTPUT FORMAT ==
Write the document in clean Markdown. Use ## for section headers. Use **bold** for company names and job titles. Use - for bullets.
Do not add commentary, preamble, or notes outside the document. Output only the document.`);

  return parts.join("\n");
}

const GEN_LIMIT = 10;

function getWeekKey() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export async function onRequestGet({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rlKey = `gen:${ip}:${getWeekKey()}`;
    let count = 0;
    if (env.JD_STORE) {
      const stored = await env.JD_STORE.get(rlKey);
      count = stored ? (parseInt(stored) || 0) : 0;
    }
    return new Response(
      JSON.stringify({ used: count, limit: GEN_LIMIT, remaining: GEN_LIMIT - count }),
      { status: 200, headers }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: "server_error", detail: e.message }), {
      status: 500,
      headers,
    });
  }
}

export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
  };

  try {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rlKey = `gen:${ip}:${getWeekKey()}`;
    let genCount = 0;
    if (env.JD_STORE) {
      const stored = await env.JD_STORE.get(rlKey);
      genCount = stored ? (parseInt(stored) || 0) : 0;
    }
    if (genCount >= GEN_LIMIT) {
      return new Response(JSON.stringify({ error: "limit_reached", used: genCount, limit: GEN_LIMIT }), {
        status: 429,
        headers,
      });
    }

    const intake = await request.json();

    const systemPrompt = buildSystemPrompt(intake);
    const prompt = buildPrompt(intake);

    // Increment optimistically before streaming starts
    if (env.JD_STORE) {
      await env.JD_STORE.put(rlKey, String(genCount + 1), { expirationTtl: 604800 });
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
        max_tokens: 4096,
        stream: true,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      return new Response(JSON.stringify({ error: "claude_error", detail: errText }), {
        status: 502,
        headers,
      });
    }

    return new Response(claudeResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "server_error", detail: e.message }), {
      status: 500,
      headers,
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
