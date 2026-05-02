import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const scan = await prisma.scan.findUnique({
    where: { id },
    include: { findings: { orderBy: [{ severity: 'asc' }, { title: 'asc' }] } },
  });
  if (!scan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    ...scan,
    findings: scan.findings.map((f) => ({
      ...f,
      evidence: f.evidence ? safeParse(f.evidence) : null,
    })),
  });
}

function safeParse(s: string) {
  try { return JSON.parse(s); } catch { return s; }
}