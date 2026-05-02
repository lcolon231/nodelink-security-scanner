import type { Finding } from './types';

const DEDUCTIONS: Record<string, number> = {
  critical: 25, high: 15, medium: 8, low: 3, info: 0, pass: 0,
};

export function computeScore(findings: Finding[]): number {
  let score = 100;
  for (const f of findings) {
    if (!f.passed) score -= DEDUCTIONS[f.severity] ?? 0;
  }
  return Math.max(0, Math.min(100, score));
}

export function scoreBand(score: number): {
  label: string; tone: 'strong' | 'good' | 'warn' | 'weak' | 'critical';
} {
  if (score >= 90) return { label: 'Strong', tone: 'strong' };
  if (score >= 75) return { label: 'Good', tone: 'good' };
  if (score >= 60) return { label: 'Needs Work', tone: 'warn' };
  if (score >= 40) return { label: 'Weak', tone: 'weak' };
  return { label: 'Critical', tone: 'critical' };
}