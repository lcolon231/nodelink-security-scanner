type Sev = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'pass';

const STYLES: Record<Sev, string> = {
  critical: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
  high:     'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
  medium:   'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  low:      'bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200',
  info:     'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  pass:     'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
};

const LABELS: Record<Sev, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium',
  low: 'Low', info: 'Info', pass: 'Pass'
};

export function SeverityBadge({ severity }: { severity: Sev }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[severity]}`}>
      {LABELS[severity]}
    </span>
  );
}
