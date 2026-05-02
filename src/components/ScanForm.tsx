'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ScanForm() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Scan failed');
        setLoading(false);
        return;
      }
      router.push(`/scan/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
      <input
        type="text"
        required
        placeholder="example.com"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        disabled={loading}
        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-base outline-none placeholder:text-ink-muted focus:border-accent focus:ring-2 focus:ring-accent-100 disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={loading || !domain}
        className="rounded-lg bg-accent px-6 py-3 font-medium text-white transition hover:bg-accent-600 disabled:opacity-60"
      >
        {loading ? 'Scanning... (15-30s)' : 'Run scan'}
      </button>
      {error && (
        <div className="basis-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}
    </form>
  );
}
