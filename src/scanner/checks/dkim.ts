import { resolveTxt } from '../utils/dns';
import type { Finding } from '../types';

const COMMON_SELECTORS = ['default', 'google', 'selector1', 'selector2', 'k1', 'mail', 's1', 's2'];

export async function checkDkim(domain: string): Promise<Finding> {
  const found: string[] = [];
  await Promise.all(
    COMMON_SELECTORS.map(async (sel) => {
      const r = await resolveTxt(`${sel}._domainkey.${domain}`);
      if (r.length > 0) found.push(sel);
    }),
  );

  if (found.length === 0) {
    return {
      category: 'email', checkId: 'dkim', title: 'DKIM detection',
      severity: 'info', passed: false,
      description: 'No DKIM keys were detected at common selectors. DKIM uses provider-specific selector names, so absence here does not prove DKIM is missing — but it could not be confirmed.',
      remediation: 'Confirm with your email provider (Google Workspace, Microsoft 365, etc.) that DKIM signing is enabled for ' + domain + '. Each provider gives you specific TXT records to publish.',
      evidence: { selectorsChecked: COMMON_SELECTORS },
    };
  }

  return {
    category: 'email', checkId: 'dkim', title: 'DKIM detection',
    severity: 'pass', passed: true,
    description: `DKIM key detected at selector(s): ${found.join(', ')}.`,
    remediation: 'No action needed. Rotate DKIM keys periodically per your provider guidance.',
    evidence: { selectorsFound: found },
  };
}