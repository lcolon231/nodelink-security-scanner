import type { Finding } from '../types';
import { withTimeout } from '../utils/timeout';

export async function checkHttpsRedirect(domain: string): Promise<Finding> {
  try {
    const res = await withTimeout(
      fetch(`http://${domain}`, {
        method: 'GET', redirect: 'manual',
        headers: { 'User-Agent': 'NodeLink-Scanner/1.0' },
      }),
      6000, 'HTTP redirect probe',
    );
    const loc = res.headers.get('location') ?? '';
    const isRedirect = res.status >= 300 && res.status < 400;
    const toHttps = loc.toLowerCase().startsWith('https://');

    if (isRedirect && toHttps) {
      return {
        category: 'web', checkId: 'https_redirect', title: 'HTTP → HTTPS redirect',
        severity: 'pass', passed: true,
        description: 'HTTP requests redirect to HTTPS.',
        remediation: 'No action needed.',
        evidence: { status: res.status, location: loc },
      };
    }
    return {
      category: 'web', checkId: 'https_redirect', title: 'HTTP → HTTPS redirect',
      severity: 'medium', passed: false,
      description: 'Plain HTTP requests are not redirected to HTTPS. Visitors may transmit data unencrypted.',
      remediation: 'Configure your web server to issue a 301 redirect from http:// to https:// for all paths.',
      evidence: { status: res.status, location: loc },
    };
  } catch (err) {
    return {
      category: 'web', checkId: 'https_redirect', title: 'HTTP → HTTPS redirect',
      severity: 'info', passed: false,
      description: 'Could not test HTTP-to-HTTPS redirect (port 80 unreachable).',
      remediation: 'If port 80 is intentionally closed, no action is needed. Otherwise enable HTTP and redirect to HTTPS.',
      evidence: { error: (err as Error).message },
    };
  }
}