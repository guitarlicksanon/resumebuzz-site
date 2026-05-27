// POST /api/download  { markdown: string, filename?: string }
// Returns a DOCX binary

// ── CRC-32 ──────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();
function crc32(b) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── ZIP writer (STORED, no compression) ────────────────────
function buildZip(files) {
  const enc = new TextEncoder();
  const entries = files.map(({ name, data }) => ({
    name: enc.encode(name),
    data: typeof data === "string" ? enc.encode(data) : data,
  }));

  const localSizes  = entries.map(e => 30 + e.name.length + e.data.length);
  const totalLocal  = localSizes.reduce((a, b) => a + b, 0);
  const cdBytes     = entries.reduce((s, e) => s + 46 + e.name.length, 0);
  const buf = new Uint8Array(totalLocal + cdBytes + 22);
  const dv  = new DataView(buf.buffer);
  let pos = 0;
  const localOffsets = [];
  const crcs = entries.map(e => crc32(e.data));

  for (let i = 0; i < entries.length; i++) {
    const { name, data } = entries[i];
    localOffsets.push(pos);
    dv.setUint32(pos, 0x04034b50, true); pos += 4;
    dv.setUint16(pos, 20, true); pos += 2;
    dv.setUint16(pos, 0, true); pos += 2;
    dv.setUint16(pos, 0, true); pos += 2; // STORED
    dv.setUint16(pos, 0, true); pos += 2;
    dv.setUint16(pos, 0, true); pos += 2;
    dv.setUint32(pos, crcs[i], true); pos += 4;
    dv.setUint32(pos, data.length, true); pos += 4;
    dv.setUint32(pos, data.length, true); pos += 4;
    dv.setUint16(pos, name.length, true); pos += 2;
    dv.setUint16(pos, 0, true); pos += 2;
    buf.set(name, pos); pos += name.length;
    buf.set(data, pos); pos += data.length;
  }

  const cdStart = pos;
  for (let i = 0; i < entries.length; i++) {
    const { name, data } = entries[i];
    dv.setUint32(pos, 0x02014b50, true); pos += 4;
    dv.setUint16(pos, 20, true); pos += 2;
    dv.setUint16(pos, 20, true); pos += 2;
    dv.setUint16(pos, 0, true); pos += 2;
    dv.setUint16(pos, 0, true); pos += 2;
    dv.setUint16(pos, 0, true); pos += 2;
    dv.setUint16(pos, 0, true); pos += 2;
    dv.setUint32(pos, crcs[i], true); pos += 4;
    dv.setUint32(pos, data.length, true); pos += 4;
    dv.setUint32(pos, data.length, true); pos += 4;
    dv.setUint16(pos, name.length, true); pos += 2;
    dv.setUint16(pos, 0, true); pos += 2;
    dv.setUint16(pos, 0, true); pos += 2;
    dv.setUint16(pos, 0, true); pos += 2;
    dv.setUint16(pos, 0, true); pos += 2;
    dv.setUint32(pos, 0, true); pos += 4;
    dv.setUint32(pos, localOffsets[i],true); pos += 4;
    buf.set(name, pos); pos += name.length;
  }

  const cdLen = pos - cdStart;
  dv.setUint32(pos, 0x06054b50, true); pos += 4;
  dv.setUint16(pos, 0, true); pos += 2;
  dv.setUint16(pos, 0, true); pos += 2;
  dv.setUint16(pos, entries.length, true); pos += 2;
  dv.setUint16(pos, entries.length, true); pos += 2;
  dv.setUint32(pos, cdLen, true); pos += 4;
  dv.setUint32(pos, cdStart, true); pos += 4;
  dv.setUint16(pos, 0, true);
  return buf;
}

// ── DOCX static files ────────────────────────────────────────
const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

const PKG_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const WORD_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`;

const SETTINGS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
  </w:compat>
</w:settings>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/><w:szCs w:val="22"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="0" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
</w:styles>`;

// ── Markdown → DOCX XML ──────────────────────────────────────
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parseRuns(text) {
  const runs = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push({ t: text.slice(last, m.index), b: false });
    runs.push({ t: m[1], b: true });
    last = re.lastIndex;
  }
  if (last < text.length) runs.push({ t: text.slice(last), b: false });
  return runs.length ? runs : [{ t: text, b: false }];
}

function runsXml(runs, sz = 22) {
  return runs.map(r => {
    const rPr = r.b
      ? `<w:rPr><w:b/><w:bCs/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>`
      : `<w:rPr><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>`;
    return `<w:r>${rPr}<w:t xml:space="preserve">${esc(r.t)}</w:t></w:r>`;
  }).join("");
}

function buildDocumentXml(markdown) {
  const lines = markdown.split("\n");
  const paras = [];
  let firstHeading = true;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("## ")) {
      const text = line.slice(3).trim();
      if (firstHeading) {
        // Candidate name, large, centered, gold accent
        firstHeading = false;
        paras.push(
          `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="80"/>` +
          `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="C9A84C"/></w:pBdr></w:pPr>` +
          `<w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="44"/><w:szCs w:val="44"/>` +
          `<w:color w:val="1A1A1A"/></w:rPr><w:t>${esc(text)}</w:t></w:r></w:p>`
        );
      } else {
        // Section header, bold caps, gold underline
        firstHeading = false;
        paras.push(
          `<w:p><w:pPr><w:spacing w:before="200" w:after="60"/>` +
          `<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="C9A84C"/></w:pBdr></w:pPr>` +
          `<w:r><w:rPr><w:b/><w:bCs/><w:caps/><w:sz w:val="22"/><w:szCs w:val="22"/>` +
          `<w:color w:val="1A1A1A"/></w:rPr><w:t>${esc(text)}</w:t></w:r></w:p>`
        );
      }
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("• ")) {
      const text = line.slice(2).trim();
      firstHeading = false;
      paras.push(
        `<w:p><w:pPr><w:ind w:left="360" w:hanging="180"/><w:spacing w:before="0" w:after="40"/></w:pPr>` +
        `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">• </w:t></w:r>` +
        runsXml(parseRuns(text), 20) +
        `</w:p>`
      );
      continue;
    }

    // Normal paragraph, contact lines, job headers, etc.
    firstHeading = false;
    const runs = parseRuns(line);
    const centered = !paras.length; // center the line right after name if nothing yet
    paras.push(
      `<w:p><w:pPr>${centered ? '<w:jc w:val="center"/>' : ''}<w:spacing w:before="0" w:after="80"/></w:pPr>` +
      runsXml(runs, 22) +
      `</w:p>`
    );
  }

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">\n` +
    `<w:body>\n` +
    paras.join("\n") + "\n" +
    `<w:sectPr>` +
    `<w:pgSz w:w="12240" w:h="15840"/>` +
    `<w:pgMar w:top="720" w:right="1080" w:bottom="720" w:left="1080"/>` +
    `</w:sectPr>\n</w:body>\n</w:document>`
  );
}

function generateDocx(markdown) {
  return buildZip([
    { name: "[Content_Types].xml", data: CONTENT_TYPES },
    { name: "_rels/.rels", data: PKG_RELS },
    { name: "word/document.xml", data: buildDocumentXml(markdown) },
    { name: "word/_rels/document.xml.rels", data: WORD_RELS },
    { name: "word/styles.xml", data: STYLES },
    { name: "word/settings.xml", data: SETTINGS },
  ]);
}

// ── Helpers ───────────────────────────────────────────────────
function docxResponse(docx, filename) {
  const safe = (filename || "Resume").replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "Resume";
  return new Response(docx, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safe}.docx"`,
      "Content-Length": String(docx.length),
    },
  });
}

// ── Handler ──────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    // ── Path 1: Token-based download after Stripe payment ────────
    if (body.token && body.sessionId) {
      const { token, sessionId } = body;

      const raw = await env.JD_STORE.get(`draft:${token}`);
      if (!raw) {
        return new Response(JSON.stringify({ error: "not_found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      let draft;
      try {
        draft = JSON.parse(raw);
      } catch {
        return new Response(JSON.stringify({ error: "invalid_draft" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (draft.paid && draft.used) {
        return new Response(JSON.stringify({ error: "already_used" }), {
          status: 410,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Verify Stripe session
      const stripeRes = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
        {
          headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
        }
      );
      const session = await stripeRes.json();

      if (!stripeRes.ok) {
        return new Response(JSON.stringify({ error: "stripe_error" }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check payment status (subscription sessions use status === "complete")
      const isPaid =
        session.payment_status === "paid" || session.status === "complete";
      if (!isPaid) {
        return new Response(JSON.stringify({ error: "payment_required" }), {
          status: 402,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Verify token matches session metadata
      if (session.metadata?.token !== token) {
        return new Response(JSON.stringify({ error: "token_mismatch" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Mark draft as used (TTL 1 hour for audit trail)
      await env.JD_STORE.put(
        `draft:${token}`,
        JSON.stringify({ ...draft, paid: true, used: true }),
        { expirationTtl: 3600 }
      );

      return docxResponse(generateDocx(draft.markdown), draft.filename);
    }

    // ── Path 2: Pro subscriber single-use dl token ────────────────
    if (body.dlToken) {
      const { dlToken, markdown, filename } = body;

      const raw = await env.JD_STORE.get(`dltoken:${dlToken}`);
      if (!raw) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Single-use: delete the token immediately
      await env.JD_STORE.delete(`dltoken:${dlToken}`);

      if (!markdown || typeof markdown !== "string") {
        return new Response(JSON.stringify({ error: "No content provided" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return docxResponse(generateDocx(markdown), filename);
    }

    // ── Path 3: Legacy direct download {markdown, filename} ───────
    const { markdown, filename } = body;
    if (!markdown || typeof markdown !== "string") {
      return new Response(JSON.stringify({ error: "No content provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return docxResponse(generateDocx(markdown), filename);
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
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
