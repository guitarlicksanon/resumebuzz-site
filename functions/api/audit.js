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
  const plain = xmlText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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

function buildPrompt(jobDescription) {
  let prompt = `You are an expert resume writer and ATS specialist with 14 years of experience and over 1,000 resumes written for clients across 6 continents — service, tech, business, engineering, medical, and board-level roles.

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

Provide 2-4 findings per category. Be specific and actionable — name the actual problem, not a generic tip. critical = must fix before applying, warning = should fix, info = nice to have.`;

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

    let claudeMessages;
    let extraHeaders = {};

    if (isPdf) {
      const bytes = new Uint8Array(arrayBuffer);
      const base64Data = uint8ToBase64(bytes);
      claudeMessages = [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ];
      extraHeaders["anthropic-beta"] = "pdfs-2024-09-25";
    } else {
      const extractedText = await extractDocxText(arrayBuffer);
      claudeMessages = [
        {
          role: "user",
          content: `${prompt}\n\nRESUME TEXT:\n${extractedText}`,
        },
      ];
    }

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        ...extraHeaders,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: claudeMessages,
      }),
    });

    if (!claudeResponse.ok) {
      throw new Error("Claude API error: " + claudeResponse.status);
    }

    const claudeData = await claudeResponse.json();
    const rawText = claudeData.content[0].text;
    const auditResult = JSON.parse(rawText);

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
