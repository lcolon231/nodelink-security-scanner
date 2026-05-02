import { resolveNs, resolveCaa } from '../utils/dns';
import type { Finding } from '../types';

export async function checkDnsHygiene(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const [ns, caa] = await Promise.all([resolveNs(domain), resolveCaa(domain)]);

  findings.push(
    ns.length < 2
      ? {
          category: 'dns', checkId: 'ns_redundancy', title: 'Nameserver redundancy',
          severity: 'medium', passed: false,
          description: `Only ${ns.length} nameserver(s) were found. DNS best practice is at least two nameservers for redundancy.`,
          remediation: 'Configure at least two nameservers, ideally on separate networks, with your DNS provider.',
          evidence: { ns },
        }
      : {
          category: 'dns', checkId: 'ns_redundancy', title: 'Nameserver redundancy',
          severity: 'pass', passed: true,
          description: `${ns.length} nameservers configured.`,
          remediation: 'No action needed.',
          evidence: { ns },
        },
  );

  findings.push(
    caa.length === 0
      ? {
          category: 'dns', checkId: 'caa', title: 'CAA records',
          severity: 'low', passed: false,
          description: 'No CAA records published. CAA records restrict which Certificate Authorities can issue certificates for your domain, reducing the risk of mis-issuance.',
          remediation: 'Publish CAA records naming the CAs you use, e.g. "0 issue \\"letsencrypt.org\\"" and "0 issue \\"digicert.com\\"".',
          evidence: { caa },
        }
      : {
          category: 'dns', checkId: 'caa', title: 'CAA records',
          severity: 'pass', passed: true,
          description: `CAA records published (${caa.length}).`,
          remediation: 'Review CAA entries when changing certificate providers.',
          evidence: { caa },
        },
  );

  return findings;
}