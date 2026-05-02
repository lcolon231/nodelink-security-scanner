import type { Finding } from '../types';
import { withTimeout } from '../utils/timeout';

interface HeaderCheck {
  id: string; name: string; severity: 'high' | 'medium' | 'low';
  description: string; remediation: string;
}

const HEADERS: HeaderCheck[] = [
  {
    id: 'hsts', name: 'strict-transport-security', severity: 'high',
    description: 'HSTS forces browsers to use HTTPS for future visits. Without it, a downgrade attack on the first request is possible.',
    remediation: 'Add: Strict-Transport-Security: max-age=31536000; includeSubDomains',
  },
  {
    id: 'csp', name: 'content-security-policy', severity: 'medium',
    description: 'CSP restricts which sources of scripts, styles, and other content the browser will load — the strongest defense against XSS.',
    remediation: 'Define a CSP appropriate to your site. Start with: Content-Security-Policy: default-src \'self\'; then refine.',
  },
  {
    id: 'xfo', name: 'x-frame-options', severity: 'low',
    description: 'X-Frame-Options prevents clickjacking by blocking your site from being framed by other sites.',
    remediation: 'Add: X-Frame-Options: SAMEORIGIN (or use frame-ancestors in CSP).',
  },
  {
    id: 'xcto', name: 'x-content-type-options', severity: 'low',
    description: 'Stops browsers from guessing (MIME-sniffing) the content type, which can lead to script execution from non-script files.',
    remediation: 'Add: X-Content-Type-Options: nosniff',
  },
  {
    id: 'referrer', name: 'referrer-policy', severity: 'low',
    description: 'Controls what referrer information is sent with outbound requests. Protects user privacy.',
    remediation: 'Add: Referrer-Policy: strict-origin-when-cross-origin',
  },
  {
    id: 'permissions', name: 'permissions-policy', severity: 'low',
    description: 'Restricts which browser features (camera, microphone, geolocation, etc.) the page can use.',
    remediation: 'Add a Permissions-Policy header limiting features your site does not need, e.g. Permissions-Policy: camera=(), microphone=(), geolocation=()',
  },
];

async function fetchHeaders(url: string): Promise<Record<string, string> | null> {
  try {
    const res = await withTimeout(
      fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'NodeLink-Scanner/1.0 (+https://nodelinktech.com)' } }),
      8000,
      `HTTP ${url}`,
    );
    const out: Record<string, string> = {};
    res.headers.forEach((v, k) => { out[k.toLowerCase()] = v; });
    return out;
  } catch { return null; }
}

export async function checkHttpHeaders(domain: string): Promise<Finding[]> {
  const headers = await fetchHeaders(`https://${domain}`);
  if (!headers) {
    return [{
      category: 'web', checkId: 'http_reachable', title: 'HTTPS reachability',
      severity: 'high', passed: false,
      description: 'Could not fetch the site over HTTPS to inspect security headers.',
      remediation: 'Ensure the site is served over HTTPS and reachable from the public internet.',
    }];
  }
  return HEADERS.map((h) => {
    const present = h.name in headers;
    return {
      category: 'web', checkId: `header_${h.id}`,
      title: `Header: ${h.name}`,
      severity: present ? 'pass' : h.severity,
      passed: present,
      description: present ? `${h.name} is set.` : h.description,
      remediation: present ? 'No action needed.' : h.remediation,
      evidence: present ? { value: headers[h.name] } : { missing: h.name },
    };
  });
}