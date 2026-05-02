import { resolveTxt } from '../utils/dns';
import type { Finding } from '../types';

export async function checkDmarc(domain: string): Promise<Finding> {
  const records = await resolveTxt(`_dmarc.${domain}`);
  const flat = records.map((r) => r.join('')).filter((r) => r.toLowerCase().startsWith('v=dmarc1'));

  if (flat.length === 0) {
    return {
      category: 'email', checkId: 'dmarc', title: 'DMARC policy',
      severity: 'high', passed: false,
      description: 'No DMARC record found. DMARC tells receiving mail servers what to do when SPF or DKIM fails — without it, spoofing protection is incomplete.',
      remediation: 'Publish a TXT record at "_dmarc.' + domain + '" with at minimum "v=DMARC1; p=none; rua=mailto:reports@yourdomain". Start with p=none to monitor, then move to p=quarantine and finally p=reject.',
      evidence: {},
    };
  }

  const dmarc = flat[0];
  const policyMatch = dmarc.match(/p=(none|quarantine|reject)/i);
  const policy = policyMatch ? policyMatch[1].toLowerCase() : 'unknown';

  if (policy === 'reject') {
    return {
      category: 'email', checkId: 'dmarc', title: 'DMARC policy',
      severity: 'pass', passed: true,
      description: 'DMARC is published with a strict reject policy.',
      remediation: 'No action needed. Continue monitoring DMARC aggregate reports.',
      evidence: { record: dmarc, policy },
    };
  }

  if (policy === 'quarantine') {
    return {
      category: 'email', checkId: 'dmarc', title: 'DMARC policy',
      severity: 'low', passed: false,
      description: 'DMARC is published with a quarantine policy. This is good but not the strongest available.',
      remediation: 'Once you have confirmed legitimate mail is passing DMARC for several weeks, upgrade the policy to "p=reject".',
      evidence: { record: dmarc, policy },
    };
  }

  return {
    category: 'email', checkId: 'dmarc', title: 'DMARC policy',
    severity: 'medium', passed: false,
    description: 'DMARC is in monitor-only mode (p=none). Spoofed messages are not being blocked.',
    remediation: 'Review DMARC aggregate reports for several weeks, fix any legitimate sources failing alignment, then move to "p=quarantine" and eventually "p=reject".',
    evidence: { record: dmarc, policy },
  };
}