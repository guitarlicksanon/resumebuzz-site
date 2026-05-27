function parseZipEntries(bytes) {
  const entries = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let i = 0;
  while (i <= bytes.length - 30) {
    if (
      bytes[i] === 0x50 && bytes[i+1] === 0x4b &&
      bytes[i+2] === 0x03 && bytes[i+3] === 0x04
    ) {
      const compressionMethod = view.getUint16(i + 8, true);
      const compressedSize    = view.getUint32(i + 18, true);
      const fileNameLength    = view.getUint16(i + 26, true);
      const extraFieldLength  = view.getUint16(i + 28, true);
      const dataOffset = i + 30 + fileNameLength + extraFieldLength;
      const name = new TextDecoder().decode(bytes.slice(i + 30, i + 30 + fileNameLength));
      entries.push({ name, compressionMethod, compressedSize, dataOffset });
      i = dataOffset + compressedSize;
    } else { i++; }
  }
  return entries;
}

async function extractDocxText(buffer) {
  const bytes = new Uint8Array(buffer);
  const entries = parseZipEntries(bytes);
  const entry = entries.find(e => e.name === "word/document.xml");
  if (!entry) throw new Error("word/document.xml not found");
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
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
    xmlText = new TextDecoder().decode(merged);
  } else {
    throw new Error("Unsupported compression: " + entry.compressionMethod);
  }
  return xmlText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function uint8ToBase64(bytes) {
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function getWeekKey() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

const PARSE_LIMIT = 10;

const EXTRACT_PROMPT = `Extract all information from this resume and return ONLY a valid JSON object with this exact structure. No markdown, no explanation, no text outside the JSON:

{
  "client": {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": ""
  },
  "target": {
    "role": "",
    "industry": ""
  },
  "summary_notes": "",
  "experience": [
    {
      "company": "",
      "title": "",
      "location": "",
      "start": "",
      "end": "",
      "description": "",
      "achievements": []
    }
  ],
  "education": [
    {
      "degree": "",
      "major": "",
      "institution": "",
      "year": "",
      "honors": ""
    }
  ],
  "certifications": [],
  "skills": {
    "technical": [],
    "tools": [],
    "languages": []
  }
}

Rules:
- experience[]: list every job, most recent first
- target.role: the person's current or most recent job title
- target.industry: infer from their work history (e.g. "SaaS", "Healthcare", "Finance")
- summary_notes: copy the professional summary or profile verbatim if present, otherwise ""
- achievements[]: bullet points or notable wins listed under each job, each as a separate string, strip leading dashes/bullets
- skills.technical: programming languages, frameworks, hard technical skills
- skills.tools: software, platforms, apps, systems (Salesforce, Jira, etc.)
- skills.languages: spoken/written languages only (e.g. "English, Native")
- certifications[]: each cert as one string, "Name, Issuer, Year", omit year if not present
- education[].honors: include GPA here if present (e.g. "3.9 GPA" or "Magna Cum Laude")
- Use "Present" for current roles, not "Current" or "Now"
- If a field is absent, use "" or []
- Do not invent or guess anything not explicitly in the resume`;

export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rlKey = `parse:${ip}:${getWeekKey()}`;
    let count = 0;
    if (env.JD_STORE) {
      const stored = await env.JD_STORE.get(rlKey);
      count = stored ? (parseInt(stored) || 0) : 0;
    }
    if (count >= PARSE_LIMIT) {
      return new Response(JSON.stringify({ error: "limit_reached" }), { status: 429, headers });
    }

    const formData = await request.formData();
    const file = formData.get("resume");

    if (!file || typeof file === "string") {
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400, headers });
    }

    const fileName = file.name.toLowerCase();
    const isPdf  = fileName.endsWith(".pdf");
    const isDocx = fileName.endsWith(".docx") || fileName.endsWith(".doc");

    if (!isPdf && !isDocx) {
      return new Response(JSON.stringify({ error: "Please upload a PDF or DOCX file." }), { status: 400, headers });
    }

    const arrayBuffer = await file.arrayBuffer();
    let claudeMessages;
    let extraHeaders = {};

    if (isPdf) {
      const bytes = new Uint8Array(arrayBuffer);
      const base64Data = uint8ToBase64(bytes);
      claudeMessages = [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } },
          { type: "text", text: EXTRACT_PROMPT }
        ]
      }];
      extraHeaders["anthropic-beta"] = "pdfs-2024-09-25";
    } else {
      const text = await extractDocxText(arrayBuffer);
      claudeMessages = [{ role: "user", content: `${EXTRACT_PROMPT}\n\nRESUME TEXT:\n${text}` }];
    }

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        ...extraHeaders,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: claudeMessages,
      }),
    });

    if (!claudeRes.ok) throw new Error("Claude API error: " + claudeRes.status);

    const claudeData = await claudeRes.json();
    let raw = claudeData.content[0].text.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const parsed = JSON.parse(raw);

    if (env.JD_STORE) {
      await env.JD_STORE.put(rlKey, String(count + 1), { expirationTtl: 604800 });
    }

    return new Response(JSON.stringify(parsed), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Parse failed. Please try again." }), { status: 500, headers });
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
