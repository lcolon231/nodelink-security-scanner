import { prisma } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ScansPage() {
  const scans = await prisma.scan.findMany({
    orderBy: { startedAt: 'desc' },
    take: 50
  });

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Recent scans</h1>
        <p className="text-ink-muted">Last 50 scans, newest first.</p>
      </div>

      {scans.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 text-center text-ink-muted">
          No scans yet. <Link href="/" className="text-accent underline">Run your first scan.</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--card)] text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-medium">{s.domain}</td>
                  <td className="px-4 py-3">{s.riskScore ?? '—'}</td>
                  <td className="px-4 py-3 capitalize">{s.status}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {new Date(s.startedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/scan/${s.id}`} className="text-accent hover:underline">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
