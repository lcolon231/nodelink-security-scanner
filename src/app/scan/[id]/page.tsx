import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { ScoreGauge } from '@/components/ScoreGauge';
import { FindingCard, FindingProps } from '@/components/FindingCard';

export const dynamic = 'force-dynamic';

const SEV_ORDER = ['critical', 'high', 'medium', 'low', 'info', 'pass'] as const;

export default async function ScanResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scan = await prisma.scan.findUnique({
    where: { id },
    include: { findings: true }
  });
  if (!scan) notFound();

  const sorted = [...scan.findings].sort(
    (a, b) =>
      SEV_ORDER.indexOf(a.severity as typeof SEV_ORDER[number]) -
      SEV_ORDER.indexOf(b.severity as typeof SEV_ORDER[number])
  );
  const issues = sorted.filter((f) => !f.passed && f.severity !== 'pass');
  const passed = sorted.filter((f) => f.passed);

  const pdfHref = `/api/scan/${scan.id}/pdf`;
  const completedLabel = scan.completedAt ? new Date(scan.completedAt).toLocaleString() : 'In progress';

  return (
    <main className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-ink-muted">Scan results</div>
          <h1 className="text-3xl font-semibold tracking-tight">{scan.domain}</h1>
          <div className="mt-1 text-xs text-ink-muted">{completedLabel}</div>
        </div>
        <a href={pdfHref} className="rounded-lg border border-accent bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-600">
          Download PDF
        </a>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <ScoreGauge score={scan.riskScore ?? 0} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Issues to address ({issues.length})</h2>
        {issues.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-ink-muted">
            No issues found. Strong external posture.
          </div>
        ) : (
          <div className="grid gap-3">
            {issues.map((f) => (
              <FindingCard key={f.id} f={f as unknown as FindingProps} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Passed checks ({passed.length})</h2>
        <div className="grid gap-3">
          {passed.map((f) => (
            <FindingCard key={f.id} f={f as unknown as FindingProps} />
          ))}
        </div>
      </section>
    </main>
  );
}
