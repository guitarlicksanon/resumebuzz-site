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
function buildContentTypes(extraParts) {
  const overrides = extraParts
    .map((p) => `  <Override PartName="${p.path}" ContentType="${p.contentType}"/>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
${overrides}
</Types>`;
}

const PKG_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

function buildWordRels(hyperlinks, extras) {
  const links = hyperlinks
    .map((h) =>
      `  <Relationship Id="${h.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escAttr(h.target)}" TargetMode="External"/>`
    )
    .join("\n");
  const extraLinks = (extras || [])
    .map((r) =>
      `  <Relationship Id="${r.id}" Type="${r.type}" Target="${r.target}"/>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
${extraLinks}
${links}
</Relationships>`;
}

// doNotSpellCheck disables the squiggle on product/brand names and acronyms when recruiters open the DOCX
const SETTINGS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
  <w:doNotSpellCheck/>
  <w:proofState w:spelling="clean" w:grammar="clean"/>
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
  </w:compat>
</w:settings>`;

const FONT_MAP = {
  calibri: { ascii: "Calibri", hAnsi: "Calibri", cs: "Calibri" },
  arial: { ascii: "Arial", hAnsi: "Arial", cs: "Arial" },
  helvetica: { ascii: "Helvetica", hAnsi: "Helvetica", cs: "Helvetica" },
  garamond: { ascii: "Garamond", hAnsi: "Garamond", cs: "Garamond" },
  cambria: { ascii: "Cambria", hAnsi: "Cambria", cs: "Cambria" },
  georgia: { ascii: "Georgia", hAnsi: "Georgia", cs: "Georgia" },
};

function buildStyles(fontKey, langCode) {
  const f = FONT_MAP[fontKey] || FONT_MAP.calibri;
  const lang = langCode || "en-US";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${f.ascii}" w:hAnsi="${f.hAnsi}" w:cs="${f.cs}"/>
        <w:sz w:val="22"/><w:szCs w:val="22"/>
        <w:lang w:val="${lang}"/>
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
}

function buildHeader2(candidateName) {
  // Small attribution on every page after page 1, with auto page number
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr><w:pStyle w:val="Normal"/><w:jc w:val="right"/></w:pPr>
    <w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="666666"/></w:rPr><w:t xml:space="preserve">${esc(candidateName || "Resume")} — Page </w:t></w:r>
    <w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="666666"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="666666"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
    <w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="666666"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>
  </w:p>
</w:hdr>`;
}

function buildFirstHeader() {
  // Empty first-page header — page 1 already has the name as the visual title
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr></w:p>
</w:hdr>`;
}

const DACH_FOOTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr><w:pStyle w:val="Normal"/><w:spacing w:before="240" w:after="0"/></w:pPr>
    <w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">Ort, Datum:  _______________________            Unterschrift:  _______________________</w:t></w:r>
  </w:p>
</w:ftr>`;

// ── Markdown → DOCX XML ──────────────────────────────────────
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escAttr(s) {
  return esc(s).replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// Email | full URL | www. URL | bare URL with path (any case) | all-lowercase bare domain (no path required)
// PascalCase bare-domain tokens with no path (e.g., "HotelPlanner.com") are intentionally NOT linked — typically company names.
const LINK_RE = /(\b[A-Za-z0-9._+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)+\b)|(https?:\/\/[^\s<]+)|(\bwww\.[A-Za-z0-9][A-Za-z0-9\-]*(?:\.[A-Za-z0-9][A-Za-z0-9\-]*)*\.[A-Za-z]{2,}(?:\/[^\s<]*)?)|(\b[A-Za-z0-9][A-Za-z0-9\-]*(?:\.[A-Za-z0-9][A-Za-z0-9\-]*)*\.(?:com|org|net|io|app|dev|co|me|ai|xyz|tech|studio|design|page|site|info|edu|gov)\/[^\s<]*)|(\b[a-z0-9][a-z0-9\-]*(?:\.[a-z0-9][a-z0-9\-]*)*\.(?:com|org|net|io|app|dev|co|me|ai|xyz|tech|studio|design|page|site|info|edu|gov))/g;

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

const TAB_RIGHT_POS = 10080;
const DATED_SECTIONS = /^(EXPERIENCE|EDUCATION|CERTIFICATIONS|CERTIFICATIONS & RECOGNITION|HONORS|AWARDS|MEMBERSHIPS|PROFESSIONAL DEVELOPMENT|VOLUNTEER|VOLUNTEER WORK|PROJECTS|PUBLICATIONS|RESEARCH|RESIDENCIES|RESIDENCIES & FELLOWSHIPS|BOARD|BOARD & ADVISORY ROLES|PATENTS|COURSES|COURSES TAUGHT|COURSES COMPLETED|PRESENTATIONS|PRESENTATIONS \/ SPEAKING)$/i;

const DATE_PATTERNS = [
  // English (Mon|Month YYYY [- Mon|Month YYYY|Present])
  /^(.*?)\s*\|\s*((?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+)?\d{4}(?:\s*[-–]\s*(?:Present|(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+)?\d{4}))?)\s*$/i,
  // German (Monat YYYY or MM.YYYY [- Heute|Monat YYYY|MM.YYYY])
  /^(.*?)\s*\|\s*((?:(?:Januar|Februar|M[äa]rz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+\d{4}|\d{1,2}\.\d{4})(?:\s*[-–]\s*(?:Heute|Gegenw[äa]rtig|(?:Januar|Februar|M[äa]rz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+\d{4}|\d{1,2}\.\d{4}))?)\s*$/i,
  // French (mois YYYY or MM/YYYY [- à ce jour|en cours|mois YYYY|MM/YYYY])
  /^(.*?)\s*\|\s*((?:(?:janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[ûu]t|septembre|octobre|novembre|d[ée]cembre)\s+\d{4}|\d{1,2}\/\d{4})(?:\s*[-–]\s*(?:[àa] ce jour|en cours|(?:janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[ûu]t|septembre|octobre|novembre|d[ée]cembre)\s+\d{4}|\d{1,2}\/\d{4}))?)\s*$/i,
  // Spanish (mes YYYY or MM/YYYY [- Actualidad|Presente|mes YYYY|MM/YYYY])
  /^(.*?)\s*\|\s*((?:(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+\d{4}|\d{1,2}\/\d{4})(?:\s*[-–]\s*(?:Actual(?:idad|mente)?|Presente|(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+\d{4}|\d{1,2}\/\d{4}))?)\s*$/i,
  // Japanese (YYYY年M月 [- 現在|YYYY年M月])
  /^(.*?)\s*\|\s*(\d{4}年\d{1,2}月(?:\s*[-–]\s*(?:現在|\d{4}年\d{1,2}月))?)\s*$/,
  // Year only ("| 2025")
  /^(.*?)\s*\|\s*(\d{4})\s*$/,
];

function detectTrailingDate(line) {
  for (const re of DATE_PATTERNS) {
    const m = line.match(re);
    if (m) return { rest: m[1].trim(), date: m[2].trim() };
  }
  return null;
}

function extractCandidateName(markdown) {
  const lines = markdown.split("\n");
  for (const raw of lines) {
    const t = raw.trim();
    if (!t) continue;
    if (t.startsWith("## ")) return t.slice(3).trim();
    return "Resume";
  }
  return "Resume";
}

function buildDocumentXml(markdown, hyperlinkCtx, options) {
  const lines = markdown.split("\n");
  const paras = [];
  let firstHeading = true;
  let pendingContactCenter = false;
  let currentSection = null;

  function nextIsBulletLike(startIdx) {
    for (let j = startIdx + 1; j < lines.length; j++) {
      const t = lines[j];
      if (!t.trim()) continue;
      if (/^\s{2,}[•\-]\s/.test(t)) return true;
      const tt = t.trim();
      if (tt.startsWith("- ") || tt.startsWith("• ")) return true;
      return false;
    }
    return false;
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("## ")) {
      const text = trimmed.slice(3).trim();
      if (firstHeading) {
        firstHeading = false;
        pendingContactCenter = true;
        currentSection = null;
        paras.push(
          `<w:p><w:pPr><w:jc w:val="center"/><w:keepNext/><w:keepLines/><w:spacing w:before="0" w:after="80"/>` +
          `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="C9A84C"/></w:pBdr></w:pPr>` +
          `<w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="44"/><w:szCs w:val="44"/>` +
          `<w:color w:val="1A1A1A"/></w:rPr><w:t>${esc(text)}</w:t></w:r></w:p>`
        );
      } else {
        firstHeading = false;
        currentSection = text.toUpperCase();
        paras.push(
          `<w:p><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="200" w:after="60"/>` +
          `<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="C9A84C"/></w:pBdr></w:pPr>` +
          `<w:r><w:rPr><w:b/><w:bCs/><w:caps/><w:sz w:val="22"/><w:szCs w:val="22"/>` +
          `<w:color w:val="1A1A1A"/></w:rPr><w:t>${esc(text)}</w:t></w:r></w:p>`
        );
      }
      continue;
    }

    const subMatch = rawLine.match(/^\s{2,}[•\-]\s+(.*)$/);
    if (subMatch) {
      firstHeading = false;
      const keepNext = nextIsBulletLike(i) ? "<w:keepNext/>" : "";
      paras.push(
        `<w:p><w:pPr><w:ind w:left="720" w:hanging="180"/>${keepNext}<w:keepLines/>` +
        `<w:spacing w:before="0" w:after="40"/></w:pPr>` +
        `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">• </w:t></w:r>` +
        runsXml(subMatch[1], 20, hyperlinkCtx) +
        `</w:p>`
      );
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      const text = trimmed.slice(2).trim();
      firstHeading = false;
      const keepNext = nextIsBulletLike(i) ? "<w:keepNext/>" : "";
      paras.push(
        `<w:p><w:pPr><w:ind w:left="360" w:hanging="180"/>${keepNext}<w:keepLines/>` +
        `<w:spacing w:before="0" w:after="40"/></w:pPr>` +
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
        `<w:p><w:pPr><w:jc w:val="center"/><w:keepLines/><w:spacing w:before="0" w:after="80"/></w:pPr>` +
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
        `<w:keepNext/><w:keepLines/>` +
        `<w:spacing w:before="${beforeSpacing}" w:after="40"/></w:pPr>` +
        runsXml(trailingDate.rest, 22, hyperlinkCtx) +
        `<w:r><w:tab/></w:r>` +
        runsXml(trailingDate.date, 22, hyperlinkCtx) +
        `</w:p>`
      );
      continue;
    }

    if (currentSection === "EXPERIENCE") {
      paras.push(
        `<w:p><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="180" w:after="40"/></w:pPr>` +
        runsXml(trimmed, 22, hyperlinkCtx) +
        `</w:p>`
      );
      continue;
    }

    paras.push(
      `<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:before="0" w:after="80"/></w:pPr>` +
      runsXml(trimmed, 22, hyperlinkCtx) +
      `</w:p>`
    );
  }

  const opts = options || {};
  const sectExtras =
    (opts.headerDefaultRefId ? `<w:headerReference w:type="default" r:id="${opts.headerDefaultRefId}"/>` : "") +
    (opts.headerFirstRefId   ? `<w:headerReference w:type="first" r:id="${opts.headerFirstRefId}"/>`     : "") +
    (opts.footerDefaultRefId ? `<w:footerReference w:type="default" r:id="${opts.footerDefaultRefId}"/>` : "");
  const titlePg = opts.headerFirstRefId ? `<w:titlePg/>` : "";
  const topMargin = opts.headerDefaultRefId ? `1080` : `720`; // give room for the page-2 header

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n` +
    `<w:body>\n` +
    paras.join("\n") + "\n" +
    `<w:sectPr>` +
    sectExtras +
    `<w:pgSz w:w="12240" w:h="15840"/>` +
    `<w:pgMar w:top="${topMargin}" w:right="1080" w:bottom="${opts.footerDefaultRefId ? 1440 : 720}" w:left="1080" w:header="720" w:footer="720"/>` +
    titlePg +
    `</w:sectPr>\n</w:body>\n</w:document>`
  );
}

function generateDocx(markdown, options) {
  const opts = options || {};
  const market = (opts.market || "us").toLowerCase();
  const font = opts.font || (market === "dach" ? "cambria" : "calibri");
  const langCode = opts.langCode || (market === "dach" ? "de-DE" : market === "france" ? "fr-FR" : market === "spain" ? "es-ES" : market === "japan" ? "ja-JP" : "en-US");
  const candidateName = extractCandidateName(markdown);

  const hyperlinkCtx = { nextId: 100, list: [] };
  const extras = [];
  const extraParts = [];
  const sectionOpts = {};

  // Page-2 header on every document, different first-page header so page 1 is clean
  const headerDefaultId = "rId50";
  const headerFirstId = "rId51";
  extras.push({ id: headerDefaultId, type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header", target: "header1.xml" });
  extras.push({ id: headerFirstId,   type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header", target: "header2.xml" });
  extraParts.push({ name: "word/header1.xml", data: buildHeader2(candidateName) });
  extraParts.push({ name: "word/header2.xml", data: buildFirstHeader() });
  sectionOpts.headerDefaultRefId = headerDefaultId;
  sectionOpts.headerFirstRefId = headerFirstId;

  // DACH market: signature line footer
  if (market === "dach") {
    const footerId = "rId60";
    extras.push({ id: footerId, type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer", target: "footer1.xml" });
    extraParts.push({ name: "word/footer1.xml", data: DACH_FOOTER });
    sectionOpts.footerDefaultRefId = footerId;
  }

  const documentXml = buildDocumentXml(markdown, hyperlinkCtx, sectionOpts);

  const contentTypesExtras = [
    { path: "/word/header1.xml", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml" },
    { path: "/word/header2.xml", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml" },
  ];
  if (market === "dach") {
    contentTypesExtras.push({ path: "/word/footer1.xml", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml" });
  }

  return buildZip([
    { name: "[Content_Types].xml", data: buildContentTypes(contentTypesExtras) },
    { name: "_rels/.rels", data: PKG_RELS },
    { name: "word/document.xml", data: documentXml },
    { name: "word/_rels/document.xml.rels", data: buildWordRels(hyperlinkCtx.list, extras) },
    { name: "word/styles.xml", data: buildStyles(font, langCode) },
    { name: "word/settings.xml", data: SETTINGS },
    ...extraParts,
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

      return docxResponse(generateDocx(draft.markdown, { market: draft.market, font: draft.font }), draft.filename);
    }

    // ── Path 2: Pro subscriber single-use dl token ────────────────
    if (body.dlToken) {
      const { dlToken, markdown, filename, market, font } = body;

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

      return docxResponse(generateDocx(markdown, { market, font }), filename);
    }

    // ── Path 3: Legacy direct download {markdown, filename, market?, font?} ───────
    const { markdown, filename, market, font } = body;
    if (!markdown || typeof markdown !== "string") {
      return new Response(JSON.stringify({ error: "No content provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return docxResponse(generateDocx(markdown, { market, font }), filename);
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
