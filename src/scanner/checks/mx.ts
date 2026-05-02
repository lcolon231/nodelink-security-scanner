import { resolveMx } from '../utils/dns';
import type { Finding } from '../types';

export async function checkMx(domain: string): Promise<Finding> {
  const mx = await resolveMx(domain);

  if (mx.length === 0) {
    return {
      category: 'email', checkId: 'mx', title: 'MX records',
      severity: 'info', passed: false,
      description: 'No MX records found. The domain cannot receive email.',
      remediation: 'If this domain should receive email, configure MX records pointing to your mail provider. If email-only-from is intentional, you can publish a "null MX" (priority 0, target ".") to make this explicit.',
      evidence: { mx: [] },
    };
  }

  return {
    category: 'email', checkId: 'mx', title: 'MX records',
    severity: 'pass', passed: true,
    description: `MX records present (${mx.length}). Mail will be routed to ${mx[0].exchange}.`,
    remediation: 'No action needed.',
    evidence: { mx },
  };
}