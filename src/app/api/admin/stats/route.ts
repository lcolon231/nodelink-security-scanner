import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminAuth } from '@/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalScans,
    scansLast7Days,
    scansLast30Days,
    completedScans,
    failedScans,
    eventCounts,
    scoreStats,
    topDomains,
    recentEvents,
    countryBreakdown,
    referrerBreakdown,
    avgDuration
  ] = await Promise.all([
    prisma.scan.count(),
    prisma.scan.count({ where: { startedAt: { gte: sevenDaysAgo } } }),
    prisma.scan.count({ where: { startedAt: { gte: thirtyDaysAgo } } }),
    prisma.scan.count({ where: { status: 'completed' } }),
    prisma.scan.count({ where: { status: 'failed' } }),
    prisma.scanEvent.groupBy({
      by: ['eventType'],
      _count: true,
      where: { createdAt: { gte: thirtyDaysAgo } }
    }),
    prisma.scan.aggregate({
      _avg: { riskScore: true },
      _min: { riskScore: true },
      _max: { riskScore: true },
      where: { riskScore: { not: null } }
    }),
    prisma.scan.groupBy({
      by: ['domain'],
      _count: true,
      orderBy: { _count: { domain: 'desc' } },
      take: 10
    }),
    prisma.scanEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        eventType: true,
        domain: true,
        country: true,
        score: true,
        durationMs: true,
        createdAt: true
      }
    }),
    prisma.scanEvent.groupBy({
      by: ['country'],
      _count: true,
      where: { country: { not: null } },
      orderBy: { _count: { country: 'desc' } },
      take: 10
    }),
    prisma.scanEvent.groupBy({
      by: ['referrer'],
      _count: true,
      where: { referrer: { not: null }, eventType: 'scan_started' },
      orderBy: { _count: { referrer: 'desc' } },
      take: 10
    }),
    prisma.scanEvent.aggregate({
      _avg: { durationMs: true },
      where: { eventType: 'scan_completed', durationMs: { not: null } }
    })
  ]);

  // Score histogram (band buckets)
  const allScores = await prisma.scan.findMany({
    where: { riskScore: { not: null } },
    select: { riskScore: true }
  });
  const histogram = { strong: 0, good: 0, needsWork: 0, weak: 0, critical: 0 };
  for (const s of allScores) {
    const v = s.riskScore ?? 0;
    if (v >= 90) histogram.strong++;
    else if (v >= 75) histogram.good++;
    else if (v >= 60) histogram.needsWork++;
    else if (v >= 40) histogram.weak++;
    else histogram.critical++;
  }

  // Conversion funnel
  const eventCountsMap: Record<string, number> = {};
  for (const e of eventCounts) eventCountsMap[e.eventType] = e._count;

  const funnel = {
    scan_started: eventCountsMap['scan_started'] ?? 0,
    scan_completed: eventCountsMap['scan_completed'] ?? 0,
    results_viewed: eventCountsMap['results_viewed'] ?? 0,
    pdf_downloaded: eventCountsMap['pdf_downloaded'] ?? 0
  };

  // Daily scan counts for the last 30 days (server-side bucketing)
  const dailyCounts = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
    SELECT DATE_TRUNC('day', "startedAt") AS day, COUNT(*) AS count
    FROM "Scan"
    WHERE "startedAt" >= ${thirtyDaysAgo}
    GROUP BY day
    ORDER BY day ASC
  `;
  const dailyScans = dailyCounts.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    count: Number(r.count)
  }));

  return NextResponse.json({
    summary: {
      totalScans,
      scansLast7Days,
      scansLast30Days,
      completedScans,
      failedScans,
      avgScore: scoreStats._avg.riskScore !== null ? Math.round(scoreStats._avg.riskScore ?? 0) : null,
      minScore: scoreStats._min.riskScore,
      maxScore: scoreStats._max.riskScore,
      avgScanDurationMs: avgDuration._avg.durationMs !== null ? Math.round(avgDuration._avg.durationMs ?? 0) : null
    },
    histogram,
    funnel,
    dailyScans,
    topDomains: topDomains.map((d) => ({ domain: d.domain, count: d._count })),
    countries: countryBreakdown.map((c) => ({ country: c.country, count: c._count })),
    referrers: referrerBreakdown.map((r) => ({ referrer: r.referrer, count: r._count })),
    recentEvents
  });
}
