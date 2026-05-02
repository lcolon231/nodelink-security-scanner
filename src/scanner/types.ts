export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'pass';
export type Category = 'email' | 'web' | 'tls' | 'ports' | 'dns';

export interface Finding {
  category: Category;
  checkId: string;
  title: string;
  severity: Severity;
  passed: boolean;
  description: string;
  remediation: string;
  evidence?: unknown;
}

export interface ScanResult {
  domain: string;
  riskScore: number;
  findings: Finding[];
  startedAt: Date;
  completedAt: Date;
}

export type CheckFn = (domain: string) => Promise<Finding | Finding[]>;