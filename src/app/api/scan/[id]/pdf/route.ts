import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateReport } from '@/pdf/report';
import { logEvent } from '@/lib/events';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Sev = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'pass';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scan = await prisma.scan.findUnique({
    where: { id },
    include: { findings: true }
  });
  if (!scan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const buffer = await generateReport({
    domain: scan.domain,
    riskScore: scan.riskScore ?? 0,
    startedAt: scan.startedAt.toISOString(),
    completedAt: (scan.completedAt ?? new Date()).toISOString(),
    findings: scan.findings.map((f) => ({
      category: f.category,
      checkId: f.checkId,
      title: f.title,
      severity: f.severity as Sev,
      passed: f.passed,
      description: f.description,
      remediation: f.remediation
    }))
  });

  logEvent({
    eventType: 'pdf_downloaded',
    scanId: scan.id,
    domain: scan.domain,
    score: scan.riskScore,
    request: req
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="nodelink-scan-' + scan.domain + '-' + scan.id + '.pdf"',
      'Cache-Control': 'private, max-age=3600'
    }
  });
}
