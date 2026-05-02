import { SeverityBadge } from './SeverityBadge';

type Sev = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'pass';

export interface FindingProps {
  category: string;
  checkId: string;
  title: string;
  severity: Sev;
  passed: boolean;
  description: string;
  remediation: string;
}

export function FindingCard({ f }: { f: FindingProps }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{f.title}</h3>
          <div className="text-xs uppercase tracking-wide text-ink-muted">{f.category}</div>
        </div>
        <SeverityBadge severity={f.severity} />
      </div>
      <p className="mb-3 text-sm leading-relaxed">{f.description}</p>
      {!f.passed && (
        <div className="rounded-md bg-accent-50 p-3 text-sm dark:bg-slate-900">
          <span className="font-medium text-accent-700 dark:text-accent-200">Fix: </span>
          <span>{f.remediation}</span>
        </div>
      )}
    </div>
  );
}
