import { scoreBand } from '@/scanner/scoring';

const TONE_COLORS: Record<string, string> = {
  strong:   '#16a34a',
  good:     '#65a30d',
  warn:     '#d97706',
  weak:     '#ea580c',
  critical: '#dc2626'
};

export function ScoreGauge({ score }: { score: number }) {
  const band = scoreBand(score);
  const color = TONE_COLORS[band.tone];
  const circumference = 2 * Math.PI * 56;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-36 w-36">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r="56" fill="none" strokeWidth="12"
                  className="stroke-slate-200 dark:stroke-slate-800" />
          <circle cx="64" cy="64" r="56" fill="none" strokeWidth="12"
                  stroke={color} strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={offset} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold" style={{ color }}>{score}</span>
          <span className="text-xs text-ink-muted">/ 100</span>
        </div>
      </div>
      <div>
        <div className="text-sm uppercase tracking-wider text-ink-muted">Risk score</div>
        <div className="text-2xl font-semibold" style={{ color }}>{band.label}</div>
      </div>
    </div>
  );
}
