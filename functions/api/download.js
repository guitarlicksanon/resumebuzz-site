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

function buildWordRels(hyperlinks) {
  const links = hyperlinks
    .map((h) =>
      `  <Relationship Id="${h.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escAttr(h.target)}" TargetMode="External"/>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
${links}
</Relationships>`;
}

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
  <w:style w:type="character" w:styleId="Hyperlink">
    <w:name w:val="Hyperlink"/>
    <w:rPr>
      <w:color w:val="1B5E9B"/>
      <w:u w:val="single"/>
    </w:rPr>
  </w:style>
</w:styles>`;

// ── Markdown → DOCX XML ──────────────────────────────────────
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escAttr(s) {
  return esc(s).replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

const LINK_RE = /(\b[A-Za-z0-9._+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)+\b)|(https?:\/\/[^\s<]+)|(\b(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+(?:com|org|net|io|app|dev|co|me|ai|xyz|tech|studio|design|page|site|info|edu|gov|us|uk|ca|au)(?:\/[^\s<]*)?)/g;

function splitLinks(text) {
  const segs = [];
  let lastIdx = 0;
  let m;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text)) !== null) {
    const start = m.index;
    let end = start + m[0].length;
    let target = m[0];
    let trail = "";
    const isEmail = !!m[1];
    if (!isEmail) {
      const tm = target.match(/^(.*?)([.,;:!?)\]'"]+)$/);
      if (tm) {
        target = tm[1];
        trail = tm[2];
        end = start + target.length;
      }
    }
    if (start > lastIdx) segs.push({ kind: "text", t: text.slice(lastIdx, start) });
    const href = isEmail ? `mailto:${target}` : m[2] ? target : `https://${target}`;
    segs.push({ kind: "link", t: target, href });
    if (trail) segs.push({ kind: "text", t: trail });
    lastIdx = end + trail.length;
  }
  if (lastIdx < text.length) segs.push({ kind: "text", t: text.slice(lastIdx) });
  return segs.length ? segs : [{ kind: "text", t: text }];
}

function parseBoldRuns(text) {
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

function buildRunXml(run, sz) {
  const rPr = run.b
    ? `<w:rPr><w:b/><w:bCs/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>`
    : `<w:rPr><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>`;
  return `<w:r>${rPr}<w:t xml:space="preserve">${esc(run.t)}</w:t></w:r>`;
}

function buildLinkRunXml(text, sz) {
  return `<w:r><w:rPr><w:rStyle w:val="Hyperlink"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

function runsXml(text, sz, hyperlinkCtx) {
  const segs = splitLinks(text);
  const out = [];
  for (const seg of segs) {
    if (seg.kind === "link") {
      const rId = `rId${hyperlinkCtx.nextId++}`;
      hyperlinkCtx.list.push({ id: rId, target: seg.href });
      out.push(
        `<w:hyperlink r:id="${rId}" w:history="1">${buildLinkRunXml(seg.t, sz)}</w:hyperlink>`
      );
    } else {
      const boldRuns = parseBoldRuns(seg.t);
      for (const br of boldRuns) out.push(buildRunXml(br, sz));
    }
  }
  return out.join("");
}

const DATE_TAIL_RE = /^(.*?)\s*\|\s*((?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+)?\d{4}(?:\s*[-–]\s*(?:Present|(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+)?\d{4}))?)\s*$/i;
const TAB_RIGHT_POS = 10080;
const DATED_SECTIONS = /^(EXPERIENCE|EDUCATION|CERTIFICATIONS|CERTIFICATIONS & RECOGNITION|HONORS|AWARDS|MEMBERSHIPS|PROFESSIONAL DEVELOPMENT|VOLUNTEER|VOLUNTEER WORK|PROJECTS|PUBLICATIONS|RESEARCH|RESIDENCIES|RESIDENCIES & FELLOWSHIPS|BOARD|BOARD & ADVISORY ROLES|PATENTS|COURSES|COURSES TAUGHT|COURSES COMPLETED|PRESENTATIONS|PRESENTATIONS \/ SPEAKING)$/i;

function detectTrailingDate(line) {
  const m = line.match(DATE_TAIL_RE);
  if (!m) return null;
  return { rest: m[1].trim(), date: m[2].trim() };
}

function buildDocumentXml(markdown, hyperlinkCtx) {
  const lines = markdown.split("\n");
  const paras = [];
  let firstHeading = true;
  let pendingContactCenter = false;
  let currentSection = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("## ")) {
      const text = trimmed.slice(3).trim();
      if (firstHeading) {
        firstHeading = false;
        pendingContactCenter = true;
        currentSection = null;
        paras.push(
          `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="80"/>` +
          `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="C9A84C"/></w:pBdr></w:pPr>` +
          `<w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="44"/><w:szCs w:val="44"/>` +
          `<w:color w:val="1A1A1A"/></w:rPr><w:t>${esc(text)}</w:t></w:r></w:p>`
        );
      } else {
        firstHeading = false;
        currentSection = text.toUpperCase();
        paras.push(
          `<w:p><w:pPr><w:spacing w:before="200" w:after="60"/>` +
          `<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="C9A84C"/></w:pBdr></w:pPr>` +
          `<w:r><w:rPr><w:b/><w:bCs/><w:caps/><w:sz w:val="22"/><w:szCs w:val="22"/>` +
          `<w:color w:val="1A1A1A"/></w:rPr><w:t>${esc(text)}</w:t></w:r></w:p>`
        );
      }
      continue;
    }

    // Sub-bullet: 2+ leading spaces, then • or -
    const subMatch = rawLine.match(/^\s{2,}[•\-]\s+(.*)$/);
    if (subMatch) {
      firstHeading = false;
      paras.push(
        `<w:p><w:pPr><w:ind w:left="720" w:hanging="180"/><w:spacing w:before="0" w:after="40"/></w:pPr>` +
        `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">• </w:t></w:r>` +
        runsXml(subMatch[1], 20, hyperlinkCtx) +
        `</w:p>`
      );
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      const text = trimmed.slice(2).trim();
      firstHeading = false;
      paras.push(
        `<w:p><w:pPr><w:ind w:left="360" w:hanging="180"/><w:spacing w:before="0" w:after="40"/></w:pPr>` +
        `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">• </w:t></w:r>` +
        runsXml(text, 20, hyperlinkCtx) +
        `</w:p>`
      );
      continue;
    }

    firstHeading = false;

    if (pendingContactCenter) {
      pendingContactCenter = false;
      paras.push(
        `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="80"/></w:pPr>` +
        runsXml(trimmed, 22, hyperlinkCtx) +
        `</w:p>`
      );
      continue;
    }

    const isDatedSection = currentSection ? DATED_SECTIONS.test(currentSection) : false;
    const trailingDate = isDatedSection ? detectTrailingDate(trimmed) : null;

    if (trailingDate) {
      const beforeSpacing = currentSection === "EXPERIENCE" ? 180 : 60;
      paras.push(
        `<w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="${TAB_RIGHT_POS}"/></w:tabs>` +
        `<w:spacing w:before="${beforeSpacing}" w:after="40"/></w:pPr>` +
        runsXml(trailingDate.rest, 22, hyperlinkCtx) +
        `<w:r><w:tab/></w:r>` +
        runsXml(trailingDate.date, 22, hyperlinkCtx) +
        `</w:p>`
      );
      continue;
    }

    if (currentSection === "EXPERIENCE") {
      // Role header without trailing date (e.g., "**Earlier:** ...") — give role-style spacing
      paras.push(
        `<w:p><w:pPr><w:spacing w:before="180" w:after="40"/></w:pPr>` +
        runsXml(trimmed, 22, hyperlinkCtx) +
        `</w:p>`
      );
      continue;
    }

    // Regular paragraph: justified across the page (summary, skill lines, etc.)
    paras.push(
      `<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:before="0" w:after="80"/></w:pPr>` +
      runsXml(trimmed, 22, hyperlinkCtx) +
      `</w:p>`
    );
  }

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n` +
    `<w:body>\n` +
    paras.join("\n") + "\n" +
    `<w:sectPr>` +
    `<w:pgSz w:w="12240" w:h="15840"/>` +
    `<w:pgMar w:top="720" w:right="1080" w:bottom="720" w:left="1080"/>` +
    `</w:sectPr>\n</w:body>\n</w:document>`
  );
}

function generateDocx(markdown) {
  const hyperlinkCtx = { nextId: 100, list: [] };
  const documentXml = buildDocumentXml(markdown, hyperlinkCtx);
  return buildZip([
    { name: "[Content_Types].xml", data: CONTENT_TYPES },
    { name: "_rels/.rels", data: PKG_RELS },
    { name: "word/document.xml", data: documentXml },
    { name: "word/_rels/document.xml.rels", data: buildWordRels(hyperlinkCtx.list) },
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
