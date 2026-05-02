import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, PDFImage } from 'pdf-lib';

type Sev = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'pass';

interface Finding {
  category: string;
  checkId: string;
  title: string;
  severity: Sev;
  passed: boolean;
  description: string;
  remediation: string;
}

interface Props {
  domain: string;
  riskScore: number;
  startedAt: string;
  completedAt: string;
  findings: Finding[];
}

const ACCENT = rgb(0.518, 0.306, 0.933);
const INK = rgb(0.043, 0.043, 0.059);
const MUTED = rgb(0.42, 0.42, 0.47);
const BORDER = rgb(0.906, 0.906, 0.925);
const FIX_BG = rgb(0.961, 0.937, 1);

const SEV_COLORS: Record<Sev, ReturnType<typeof rgb>> = {
  critical: rgb(0.725, 0.114, 0.114),
  high:     rgb(0.761, 0.255, 0.047),
  medium:   rgb(0.706, 0.325, 0.035),
  low:      rgb(0.631, 0.384, 0.027),
  info:     rgb(0.278, 0.333, 0.412),
  pass:     rgb(0.082, 0.502, 0.239)
};

const SEV_BG: Record<Sev, ReturnType<typeof rgb>> = {
  critical: rgb(0.996, 0.886, 0.886),
  high:     rgb(1.000, 0.929, 0.835),
  medium:   rgb(0.996, 0.953, 0.780),
  low:      rgb(0.996, 0.976, 0.769),
  info:     rgb(0.945, 0.961, 0.976),
  pass:     rgb(0.863, 0.988, 0.886)
};

const SEV_LABELS: Record<Sev, string> = {
  critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM',
  low: 'LOW', info: 'INFO', pass: 'PASS'
};

const SEV_ORDER: Sev[] = ['critical', 'high', 'medium', 'low', 'info', 'pass'];

function ansi(s: string): string {
  if (!s) return s;
  return s
    .replace(/\u2192|\u279C|\u27A4/g, '->')
    .replace(/\u2190/g, '<-')
    .replace(/\u2014|\u2013/g, '-')
    .replace(/\u2018|\u2019|\u02BC/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/\u2022|\u25CF/g, '*')
    .replace(/\u2713|\u2714/g, '[OK]')
    .replace(/\u2717|\u2718|\u2715/g, '[X]')
    .replace(/[^\x00-\xFF]/g, '?');
}

function bandFor(score: number): { label: string; color: ReturnType<typeof rgb> } {
  if (score >= 90) return { label: 'Strong',     color: rgb(0.086, 0.639, 0.290) };
  if (score >= 75) return { label: 'Good',       color: rgb(0.396, 0.639, 0.051) };
  if (score >= 60) return { label: 'Needs Work', color: rgb(0.851, 0.467, 0.024) };
  if (score >= 40) return { label: 'Weak',       color: rgb(0.918, 0.345, 0.047) };
  return            { label: 'Critical',   color: rgb(0.863, 0.149, 0.149) };
}

function executiveSummary(score: number, issues: number, crit: number, high: number): string {
  if (score >= 90) return 'Your domain shows a strong external security posture. The fundamentals of email authentication, encryption, and exposed services are well configured. Continue monitoring and renew certificates and reviews on a regular cadence.';
  if (score >= 75) return 'Your domain shows a solid external security posture with ' + issues + ' item' + (issues === 1 ? '' : 's') + ' worth addressing. None are catastrophic, but closing these gaps will make you noticeably harder to attack and easier to insure.';
  if (score >= 60) return 'We found ' + issues + ' item' + (issues === 1 ? '' : 's') + ' that need attention, including ' + high + ' high-severity finding' + (high === 1 ? '' : 's') + '. The good news: most are configuration changes a competent IT partner can resolve in a few hours.';
  if (score >= 40) return 'Your external security posture has meaningful gaps. We identified ' + crit + ' critical and ' + high + ' high-severity findings. Addressing these significantly reduces the risk of email spoofing, data interception, and unauthorized access.';
  return 'Your domain currently has serious external security weaknesses, including ' + crit + ' critical issue' + (crit === 1 ? '' : 's') + '. We strongly recommend addressing these promptly. NodeLink can help triage and remediate.';
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = ansi(text).split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) line = test;
    else { if (line) lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}

interface Cursor {
  page: PDFPage;
  y: number;
  doc: PDFDocument;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  pageNum: number;
  logo: PDFImage | null;
  logoDims: { w: number; h: number } | null;
}

async function loadLogo(doc: PDFDocument): Promise<{ image: PDFImage; w: number; h: number } | null> {
  const exts = ['png', 'jpg', 'jpeg'];
  for (const ext of exts) {
    const p = path.join(process.cwd(), 'public', 'nodelink-logo.' + ext);
    if (fs.existsSync(p)) {
      const bytes = fs.readFileSync(p);
      const image = ext === 'png'
        ? await doc.embedPng(bytes)
        : await doc.embedJpg(bytes);
      const targetH = 26;
      const scale = targetH / image.height;
      return { image, w: image.width * scale, h: targetH };
    }
  }
  return null;
}

function drawHeader(cursor: Cursor, regular: PDFFont, bold: PDFFont) {
  const top = cursor.pageHeight - cursor.margin;
  const { logo, logoDims } = cursor;

  if (logo && logoDims) {
    cursor.page.drawImage(logo, {
      x: cursor.margin,
      y: top - logoDims.h,
      width: logoDims.w,
      height: logoDims.h
    });
    cursor.page.drawText('NodeLink Technologies', {
      x: cursor.margin + logoDims.w + 10,
      y: top - 12,
      size: 11, font: bold, color: INK
    });
    cursor.page.drawText('Security Posture Scanner', {
      x: cursor.margin + logoDims.w + 10,
      y: top - 24,
      size: 9, font: regular, color: MUTED
    });
  } else {
    cursor.page.drawCircle({ x: cursor.margin + 5, y: top - 8, size: 4, color: ACCENT });
    cursor.page.drawText('NodeLink Technologies', {
      x: cursor.margin + 14, y: top - 12, size: 11, font: bold, color: INK
    });
    cursor.page.drawText('Security Posture Scanner', {
      x: cursor.margin + 14, y: top - 24, size: 9, font: regular, color: MUTED
    });
  }

  const labelText = 'EXTERNAL ASSESSMENT';
  const labelW = bold.widthOfTextAtSize(labelText, 8);
  cursor.page.drawText(labelText, {
    x: cursor.pageWidth - cursor.margin - labelW,
    y: top - 12, size: 8, font: bold, color: MUTED
  });

  const headerH = Math.max(logoDims?.h ?? 26, 28);
  const lineY = top - headerH - 6;
  cursor.page.drawLine({
    start: { x: cursor.margin, y: lineY },
    end: { x: cursor.pageWidth - cursor.margin, y: lineY },
    thickness: 0.5, color: BORDER
  });
  cursor.y = lineY - 22;
}

function drawFooter(page: PDFPage, pageWidth: number, margin: number, font: PDFFont, pageNum: number) {
  const text = 'NodeLink Technologies LLC - Lightweight external assessment, not a penetration test - Page ' + pageNum;
  const size = 8;
  const w = font.widthOfTextAtSize(text, size);
  page.drawLine({
    start: { x: margin, y: 30 },
    end: { x: pageWidth - margin, y: 30 },
    thickness: 0.5, color: BORDER
  });
  page.drawText(text, {
    x: (pageWidth - w) / 2,
    y: 18, size, font, color: MUTED
  });
}

function ensureSpace(cursor: Cursor, needed: number, regular: PDFFont, bold: PDFFont): Cursor {
  if (cursor.y - needed > cursor.margin + 30) return cursor;
  const page = cursor.doc.addPage([cursor.pageWidth, cursor.pageHeight]);
  const newCursor: Cursor = {
    ...cursor, page,
    y: cursor.pageHeight - cursor.margin,
    pageNum: cursor.pageNum + 1
  };
  drawFooter(page, cursor.pageWidth, cursor.margin, regular, newCursor.pageNum);
  drawHeader(newCursor, regular, bold);
  return newCursor;
}

export async function generateReport(props: Props): Promise<Uint8Array> {
  const { domain, riskScore, startedAt, completedAt, findings } = props;

  const doc = await PDFDocument.create();
  doc.setTitle('NodeLink Security Report - ' + domain);
  doc.setAuthor('NodeLink Technologies LLC');

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const logoData = await loadLogo(doc);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 48;
  const contentW = pageWidth - margin * 2;

  let cursor: Cursor = {
    doc,
    page: doc.addPage([pageWidth, pageHeight]),
    y: 0,
    pageWidth, pageHeight, margin,
    pageNum: 1,
    logo: logoData?.image ?? null,
    logoDims: logoData ? { w: logoData.w, h: logoData.h } : null
  };
  drawFooter(cursor.page, pageWidth, margin, regular, 1);
  drawHeader(cursor, regular, bold);

  cursor.page.drawText('Security posture report', {
    x: margin, y: cursor.y, size: 22, font: bold, color: INK
  });
  cursor.y -= 18;
  const meta = 'Domain: ' + domain + '    Started: ' + new Date(startedAt).toLocaleString() + '    Completed: ' + new Date(completedAt).toLocaleString();
  cursor.page.drawText(ansi(meta), {
    x: margin, y: cursor.y, size: 9, font: regular, color: MUTED
  });
  cursor.y -= 22;

  const band = bandFor(riskScore);
  const cardH = 86;
  cursor.page.drawRectangle({
    x: margin, y: cursor.y - cardH,
    width: contentW, height: cardH,
    borderColor: BORDER, borderWidth: 1, color: rgb(1, 1, 1)
  });
  cursor.page.drawText('RISK SCORE', {
    x: margin + 18, y: cursor.y - 22, size: 9, font: bold, color: MUTED
  });
  cursor.page.drawText(String(riskScore), {
    x: margin + 18, y: cursor.y - 60, size: 36, font: bold, color: band.color
  });
  cursor.page.drawText('/ 100', {
    x: margin + 18 + bold.widthOfTextAtSize(String(riskScore), 36) + 6,
    y: cursor.y - 50, size: 12, font: regular, color: MUTED
  });
  cursor.page.drawText(band.label, {
    x: margin + 18, y: cursor.y - 76, size: 14, font: bold, color: band.color
  });
  const barX = margin + 220;
  const barY = cursor.y - 50;
  const barW = contentW - 240;
  cursor.page.drawRectangle({
    x: barX, y: barY, width: barW, height: 10, color: BORDER
  });
  cursor.page.drawRectangle({
    x: barX, y: barY, width: (barW * riskScore) / 100, height: 10, color: band.color
  });
  cursor.y -= cardH + 18;

  const sorted = [...findings].sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity));
  const issues = sorted.filter(f => !f.passed && f.severity !== 'pass');
  const passed = sorted.filter(f => f.passed);
  const counts: Record<Sev, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0, pass: 0 };
  for (const f of findings) counts[f.severity]++;

  cursor.page.drawText('Executive summary', {
    x: margin, y: cursor.y, size: 13, font: bold, color: INK
  });
  cursor.y -= 16;
  const summary = executiveSummary(riskScore, issues.length, counts.critical, counts.high);
  for (const line of wrapText(summary, regular, 10, contentW)) {
    cursor.page.drawText(line, { x: margin, y: cursor.y, size: 10, font: regular, color: INK });
    cursor.y -= 13;
  }
  cursor.y -= 8;

  const countSevs: Sev[] = ['critical', 'high', 'medium', 'low', 'pass'];
  const cellW = (contentW - 4 * 6) / 5;
  for (let i = 0; i < countSevs.length; i++) {
    const sev = countSevs[i];
    const x = margin + i * (cellW + 6);
    cursor.page.drawRectangle({
      x, y: cursor.y - 36, width: cellW, height: 36,
      borderColor: BORDER, borderWidth: 1, color: rgb(1, 1, 1)
    });
    const num = String(counts[sev]);
    const numW = bold.widthOfTextAtSize(num, 16);
    cursor.page.drawText(num, {
      x: x + (cellW - numW) / 2, y: cursor.y - 18,
      size: 16, font: bold, color: SEV_COLORS[sev]
    });
    const label = SEV_LABELS[sev];
    const labelW = regular.widthOfTextAtSize(label, 7);
    cursor.page.drawText(label, {
      x: x + (cellW - labelW) / 2, y: cursor.y - 30,
      size: 7, font: bold, color: MUTED
    });
  }
  cursor.y -= 50;

  cursor = ensureSpace(cursor, 40, regular, bold);
  cursor.page.drawText('Issues to address (' + issues.length + ')', {
    x: margin, y: cursor.y, size: 13, font: bold, color: INK
  });
  cursor.y -= 16;

  if (issues.length === 0) {
    cursor.page.drawText('No issues found. Strong external posture.', {
      x: margin, y: cursor.y, size: 10, font: regular, color: MUTED
    });
    cursor.y -= 16;
  } else {
    for (const f of issues) {
      cursor = drawFinding(cursor, f, regular, bold, contentW, margin, true);
    }
  }

  cursor.y -= 4;
  cursor = ensureSpace(cursor, 40, regular, bold);
  cursor.page.drawText('Passed checks (' + passed.length + ')', {
    x: margin, y: cursor.y, size: 13, font: bold, color: INK
  });
  cursor.y -= 16;
  for (const f of passed) {
    cursor = drawFinding(cursor, f, regular, bold, contentW, margin, false);
  }

  return await doc.save();
}

function drawFinding(
  cursor: Cursor, f: Finding, regular: PDFFont, bold: PDFFont,
  contentW: number, margin: number, includeFix: boolean
): Cursor {
  const descLines = wrapText(f.description, regular, 9, contentW - 24);
  const fixLines = includeFix ? wrapText(f.remediation, regular, 9, contentW - 36) : [];
  const cardH = 18 + 8 + descLines.length * 12 + (includeFix ? 14 + fixLines.length * 12 + 14 : 0) + 12;

  cursor = ensureSpace(cursor, cardH + 8, regular, bold);

  const top = cursor.y;
  const bottom = top - cardH;
  cursor.page.drawRectangle({
    x: margin, y: bottom, width: contentW, height: cardH,
    borderColor: BORDER, borderWidth: 1, color: rgb(1, 1, 1)
  });

  cursor.page.drawText(ansi(f.title), {
    x: margin + 12, y: top - 16, size: 11, font: bold, color: INK
  });
  cursor.page.drawText(f.category.toUpperCase(), {
    x: margin + 12, y: top - 28, size: 7, font: bold, color: MUTED
  });

  const sevLabel = SEV_LABELS[f.severity];
  const sevW = bold.widthOfTextAtSize(sevLabel, 8) + 10;
  cursor.page.drawRectangle({
    x: margin + contentW - sevW - 12, y: top - 22,
    width: sevW, height: 14, color: SEV_BG[f.severity]
  });
  cursor.page.drawText(sevLabel, {
    x: margin + contentW - sevW - 7, y: top - 18,
    size: 8, font: bold, color: SEV_COLORS[f.severity]
  });

  let y = top - 42;
  for (const line of descLines) {
    cursor.page.drawText(line, { x: margin + 12, y, size: 9, font: regular, color: INK });
    y -= 12;
  }

  if (includeFix) {
    y -= 4;
    const fixH = 12 + fixLines.length * 12 + 4;
    cursor.page.drawRectangle({
      x: margin + 12, y: y - fixH + 8, width: contentW - 24, height: fixH, color: FIX_BG
    });
    cursor.page.drawText('FIX', {
      x: margin + 18, y: y - 2, size: 8, font: bold, color: ACCENT
    });
    let fy = y - 16;
    for (const line of fixLines) {
      cursor.page.drawText(line, { x: margin + 18, y: fy, size: 9, font: regular, color: INK });
      fy -= 12;
    }
  }

  cursor.y = bottom - 8;
  return cursor;
}
