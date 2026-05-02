import { NextRequest, NextResponse } from 'next/server';
import { DomainSchema } from '@/lib/validation';
import { checkRate } from '@/lib/rateLimit';
import { prisma } from '@/lib/db';
import { runScan } from '@/scanner';
import { log } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 60;

function getIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const rate = checkRate(ip);
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = DomainSchema.safeParse((body as { domain?: string })?.domain);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid domain' },
      { status: 400 },
    );
  }
  const domain = parsed.data;

  const scan = await prisma.scan.create({
    data: { domain, status: 'running' },
  });

  try {
    const result = await runScan(domain);
    await prisma.scan.update({
      where: { id: scan.id },
      data: {
        status: 'completed',
        riskScore: result.riskScore,
        completedAt: result.completedAt,
        findings: {
          create: result.findings.map((f) => ({
            category: f.category,
            checkId: f.checkId,
            title: f.title,
            severity: f.severity,
            passed: f.passed,
            description: f.description,
            remediation: f.remediation,
            evidence: f.evidence ? JSON.stringify(f.evidence) : null,
          })),
        },
      },
    });
    return NextResponse.json({ id: scan.id, riskScore: result.riskScore }, { status: 201 });
  } catch (err) {
    log.error('scan failed', err);
    await prisma.scan.update({
      where: { id: scan.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMsg: (err as Error).message,
      },
    });
    return NextResponse.json({ error: 'Scan failed', id: scan.id }, { status: 500 });
  }
}