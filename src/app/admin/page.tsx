import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

interface Stats {
  summary: {
    totalScans: number;
    scansLast7Days: number;
    scansLast30Days: number;
    completedScans: number;
    failedScans: number;
    avgScore: number | null;
    minScore: number | null;
    maxScore: number | null;
    avgScanDurationMs: number | null;
  };
  histogram: { strong: number; good: number; needsWork: number; weak: number; critical: number };
  funnel: { scan_started: number; scan_completed: number; results_viewed: number; pdf_downloaded: number };
  dailyScans: Array<{ day: string; count: number }>;
  topDomains: Array<{ domain: string; count: number }>;
  countries: Array<{ country: string | null; count: number }>;
  referrers: Array<{ referrer: string | null; count: number }>;
  recentEvents: Array<{
    id: string;
    eventType: string;
    domain: string | null;
    country: string | null;
    score: number | null;
    durationMs: number | null;
    createdAt: string;
  }>;
}

async function getStats(): Promise<Stats> {
  const hdrs = await headers();
  const auth = hdrs.get('authorization');
  const host = hdrs.get('host') ?? 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';

  const res = await fetch(`${protocol}://${host}/api/admin/stats`, {
    headers: auth ? { authorization: auth } : {},
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to load stats: ' + res.status);
  return res.json();
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '-';
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(1) + 's';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function eventTypeLabel(t: string): string {
  return t.replace(/_/g, ' ');
}

const EVENT_COLORS: Record<string, string> = {
  scan_started: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  scan_completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  scan_failed: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  results_viewed: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  pdf_downloaded: 'bg-accent-100 text-accent-700 dark:bg-accent-700 dark:text-accent-100'
};

export default async function AdminPage() {
  const stats = await getStats();
  const { summary, histogram, funnel, dailyScans, topDomains, countries, referrers, recentEvents } = stats;

  const histTotal = Object.values(histogram).reduce((a, b) => a + b, 0) || 1;
  const histBars = [
    { label: 'Strong (90-100)', value: histogram.strong, color: '#16a34a' },
    { label: 'Good (75-89)', value: histogram.good, color: '#65a30d' },
    { label: 'Needs Work (60-74)', value: histogram.needsWork, color: '#d97706' },
    { label: 'Weak (40-59)', value: histogram.weak, color: '#ea580c' },
    { label: 'Critical (0-39)', value: histogram.critical, color: '#dc2626' }
  ];

  const funnelMax = Math.max(funnel.scan_started, funnel.scan_completed, funnel.results_viewed, funnel.pdf_downloaded, 1);
  const funnelSteps = [
    { label: 'Scan started', value: funnel.scan_started },
    { label: 'Scan completed', value: funnel.scan_completed },
    { label: 'Results viewed', value: funnel.results_viewed },
    { label: 'PDF downloaded', value: funnel.pdf_downloaded }
  ];

  const dailyMax = Math.max(...dailyScans.map((d) => d.count), 1);

  return (
    <main className="space-y-8">
      <div>
        <div className="text-sm text-ink-muted">NodeLink Admin</div>
        <h1 className="text-3xl font-semibold tracking-tight">Scanner analytics</h1>
        <p className="text-sm text-ink-muted">Live data from Postgres. Last 30 days unless noted.</p>
      </div>

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total scans" value={summary.totalScans} sub={summary.scansLast7Days + ' in last 7d'} />
        <KpiCard label="Avg score" value={summary.avgScore ?? '-'} sub={summary.minScore !== null ? 'min ' + summary.minScore + ' / max ' + summary.maxScore : ''} />
        <KpiCard label="Avg duration" value={formatDuration(summary.avgScanDurationMs)} sub={summary.completedScans + ' completed'} />
        <KpiCard label="Failure rate" value={summary.totalScans ? ((summary.failedScans / summary.totalScans) * 100).toFixed(1) + '%' : '-'} sub={summary.failedScans + ' failed'} />
      </section>

      {/* Daily scans chart */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">Daily scans (last 30 days)</h2>
        {dailyScans.length === 0 ? (
          <p className="text-sm text-ink-muted">No scans yet.</p>
        ) : (
          <div className="flex h-32 items-end gap-1">
            {dailyScans.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={d.day + ': ' + d.count}>
                <div className="w-full rounded-t bg-accent" style={{ height: ((d.count / dailyMax) * 100) + '%', minHeight: '2px' }} />
                <div className="text-[9px] text-ink-muted rotate-45 origin-left">{d.day.slice(5)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Histogram */}
        <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">Score distribution</h2>
          <div className="space-y-2">
            {histBars.map((b) => (
              <div key={b.label} className="flex items-center gap-3 text-sm">
                <div className="w-32 text-xs text-ink-muted">{b.label}</div>
                <div className="flex-1 rounded bg-[var(--border)]">
                  <div className="h-3 rounded" style={{ width: ((b.value / histTotal) * 100) + '%', backgroundColor: b.color, minWidth: b.value > 0 ? '4px' : '0' }} />
                </div>
                <div className="w-8 text-right text-xs">{b.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Conversion funnel */}
        <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">Conversion funnel</h2>
          <div className="space-y-2">
            {funnelSteps.map((s, i) => {
              const pct = funnel.scan_started > 0 ? (s.value / funnel.scan_started) * 100 : 0;
              return (
                <div key={s.label} className="flex items-center gap-3 text-sm">
                  <div className="w-32 text-xs text-ink-muted">{s.label}</div>
                  <div className="flex-1 rounded bg-[var(--border)]">
                    <div className="h-3 rounded bg-accent" style={{ width: ((s.value / funnelMax) * 100) + '%', minWidth: s.value > 0 ? '4px' : '0' }} />
                  </div>
                  <div className="w-16 text-right text-xs">{s.value} <span className="text-ink-muted">({pct.toFixed(0)}%)</span></div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Top domains */}
        <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">Top domains</h2>
          {topDomains.length === 0 ? (
            <p className="text-sm text-ink-muted">No data.</p>
          ) : (
            <div className="space-y-1 text-sm">
              {topDomains.map((d) => (
                <div key={d.domain} className="flex justify-between border-b border-[var(--border)] py-1 last:border-0">
                  <span className="font-mono">{d.domain}</span>
                  <span className="text-ink-muted">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Countries */}
        <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">Top countries</h2>
          {countries.length === 0 ? (
            <p className="text-sm text-ink-muted">No data yet (deploy to see).</p>
          ) : (
            <div className="space-y-1 text-sm">
              {countries.map((c, i) => (
                <div key={i} className="flex justify-between border-b border-[var(--border)] py-1 last:border-0">
                  <span>{c.country ?? 'Unknown'}</span>
                  <span className="text-ink-muted">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Referrers */}
        <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">Top referrers</h2>
          {referrers.length === 0 ? (
            <p className="text-sm text-ink-muted">No data.</p>
          ) : (
            <div className="space-y-1 text-sm">
              {referrers.map((r, i) => (
                <div key={i} className="flex justify-between border-b border-[var(--border)] py-1 last:border-0">
                  <span className="truncate text-xs">{r.referrer ?? 'Direct'}</span>
                  <span className="text-ink-muted">{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent events */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">Recent activity (last 20 events)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-2 py-2">Time</th>
                <th className="px-2 py-2">Event</th>
                <th className="px-2 py-2">Domain</th>
                <th className="px-2 py-2">Country</th>
                <th className="px-2 py-2">Score</th>
                <th className="px-2 py-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((e) => (
                <tr key={e.id} className="border-t border-[var(--border)]">
                  <td className="px-2 py-2 text-xs text-ink-muted">{formatTime(e.createdAt)}</td>
                  <td className="px-2 py-2">
                    <span className={'rounded px-1.5 py-0.5 text-xs ' + (EVENT_COLORS[e.eventType] ?? '')}>
                      {eventTypeLabel(e.eventType)}
                    </span>
                  </td>
                  <td className="px-2 py-2 font-mono text-xs">{e.domain ?? '-'}</td>
                  <td className="px-2 py-2 text-xs">{e.country ?? '-'}</td>
                  <td className="px-2 py-2 text-xs">{e.score ?? '-'}</td>
                  <td className="px-2 py-2 text-xs">{formatDuration(e.durationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="text-xs uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-ink-muted">{sub}</div>
    </div>
  );
}
