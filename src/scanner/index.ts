import type { Finding, ScanResult } from './types';
import { computeScore } from './scoring';
import { checkSpf } from './checks/spf';
import { checkDmarc } from './checks/dmarc';
import { checkDkim } from './checks/dkim';
import { checkMx } from './checks/mx';
import { checkDnsHygiene } from './checks/dnsHygiene';
import { checkTls } from './checks/tls';
import { checkHttpHeaders } from './checks/httpHeaders';
import { checkHttpsRedirect } from './checks/httpsRedirect';
import { checkPorts } from './checks/ports';

const GLOBAL_TIMEOUT_MS = 30_000;

export async function runScan(domain: string): Promise<ScanResult> {
  const startedAt = new Date();
  const tasks: Promise<Finding | Finding[]>[] = [
    checkSpf(domain),
    checkDmarc(domain),
    checkDkim(domain),
    checkMx(domain),
    checkDnsHygiene(domain),
    checkTls(domain),
    checkHttpHeaders(domain),
    checkHttpsRedirect(domain),
    checkPorts(domain),
  ];

  const settled = await Promise.race([
    Promise.allSettled(tasks),
    new Promise<PromiseSettledResult<Finding | Finding[]>[]>((resolve) =>
      setTimeout(() => resolve(tasks.map(() => ({ status: 'rejected', reason: 'global timeout' } as PromiseRejectedResult))), GLOBAL_TIMEOUT_MS),
    ),
  ]);

  const findings: Finding[] = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      findings.push(...(Array.isArray(r.value) ? r.value : [r.value]));
    } else {
      findings.push({
        category: 'dns', checkId: 'check_error', title: 'Check failed',
        severity: 'info', passed: false,
        description: 'A check could not complete: ' + String(r.reason),
        remediation: 'Re-run the scan. If this persists, the target may be blocking probes.',
      });
    }
  }

  return {
    domain,
    riskScore: computeScore(findings),
    findings,
    startedAt,
    completedAt: new Date(),
  };
}