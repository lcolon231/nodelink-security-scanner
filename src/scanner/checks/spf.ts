import { resolveTxt } from '../utils/dns';
import type { Finding } from '../types';

export async function checkSpf(domain: string): Promise<Finding> {
  const records = await resolveTxt(domain);
  const flat = records.map((r) => r.join('')).filter((r) => r.toLowerCase().startsWith('v=spf1'));

  if (flat.length === 0) {
    return {
      category: 'email', checkId: 'spf', title: 'SPF record',
      severity: 'high', passed: false,
      description: 'No SPF record was found for this domain. Without SPF, attackers can spoof email from your domain.',
      remediation: 'Publish a TXT record at the root of your domain starting with "v=spf1". Include your email provider (e.g., "include:_spf.google.com") and end with "-all" to reject unauthorized senders.',
      evidence: { records: flat },
    };
  }

  if (flat.length > 1) {
    return {
      category: 'email', checkId: 'spf', title: 'SPF record',
      severity: 'medium', passed: false,
      description: 'Multiple SPF records found. RFC 7208 requires exactly one — multiple records cause SPF to fail entirely.',
      remediation: 'Consolidate into a single SPF TXT record. Merge "include:" mechanisms from each record into one.',
      evidence: { records: flat },
    };
  }

  const spf = flat[0];
  const endsHard = /[-~]all\s*$/.test(spf);
  const endsSoft = /\?all\s*$/.test(spf) || /\+all\s*$/.test(spf);

  if (endsSoft || (!endsHard && !/all\s*$/.test(spf))) {
    return {
      category: 'email', checkId: 'spf', title: 'SPF record',
      severity: 'medium', passed: false,
      description: 'SPF record exists but uses a permissive policy ("?all" or "+all") or is missing an "all" qualifier.',
      remediation: 'Change the trailing mechanism to "-all" (hard fail) or at minimum "~all" (soft fail) so spoofed mail is rejected or quarantined.',
      evidence: { record: spf },
    };
  }

  return {
    category: 'email', checkId: 'spf', title: 'SPF record',
    severity: 'pass', passed: true,
    description: 'SPF record is present and uses an enforcing policy.',
    remediation: 'No action needed. Review SPF includes annually as you change email providers.',
    evidence: { record: spf },
  };
}