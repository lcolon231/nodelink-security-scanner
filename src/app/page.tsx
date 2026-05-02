import { ScanForm } from '@/components/ScanForm';

export default function HomePage() {
  return (
    <main className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Lightweight security check<br />
          <span className="text-ink-muted">for small businesses.</span>
        </h1>
        <p className="max-w-2xl text-lg text-ink-muted">
          Enter your domain. We run a passive external assessment of your email
          authentication, TLS, security headers, DNS hygiene, and exposed services,
          then deliver a branded PDF report with plain-English fixes.
        </p>
      </section>

      <ScanForm />

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { t: 'Email authentication', d: 'SPF, DKIM, DMARC posture and policy strength.' },
          { t: 'TLS & headers', d: 'Certificate health, HTTP security headers, HTTPS redirect.' },
          { t: 'Exposure', d: 'Common ports, DNS hygiene, CAA records.' }
        ].map((c) => (
          <div key={c.t} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="mb-1 text-sm font-medium">{c.t}</div>
            <div className="text-sm text-ink-muted">{c.d}</div>
          </div>
        ))}
      </section>

      <p className="text-xs text-ink-muted">
        This is a lightweight external assessment, not a penetration test. Only run
        scans against domains you are authorized to assess.
      </p>
    </main>
  );
}
