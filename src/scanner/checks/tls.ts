import tls from 'node:tls';
import type { Finding } from '../types';
import { withTimeout } from '../utils/timeout';

interface CertSummary {
  subject?: string;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  daysUntilExpiry?: number;
  protocol?: string | null;
}

const cn = (v: unknown): string | undefined =>
  Array.isArray(v) ? v[0] : typeof v === 'string' ? v : undefined;

function getCert(host: string, port = 443, timeoutMs = 6000): Promise<CertSummary> {
  return withTimeout(
    new Promise<CertSummary>((resolve, reject) => {
      const socket = tls.connect(
        { host, port, servername: host, rejectUnauthorized: false },
        () => {
          const cert = socket.getPeerCertificate();
          const protocol = socket.getProtocol();
          if (!cert || Object.keys(cert).length === 0) {
            socket.end();
            return reject(new Error('No certificate returned'));
          }
          const validTo = new Date(cert.valid_to);
          const days = Math.floor((validTo.getTime() - Date.now()) / 86400000);
          resolve({
            subject: cn(cert.subject?.CN),
            issuer: cn(cert.issuer?.CN),
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            daysUntilExpiry: days,
            protocol,
          });
          socket.end();
        },
      );
      socket.on('error', reject);
    }),
    timeoutMs,
    `TLS ${host}`,
  );
}

export async function checkTls(domain: string): Promise<Finding> {
  try {
    const cert = await getCert(domain);
    if (cert.daysUntilExpiry !== undefined && cert.daysUntilExpiry < 0) {
      return {
        category: 'tls', checkId: 'tls_cert', title: 'TLS certificate',
        severity: 'critical', passed: false,
        description: `TLS certificate expired ${Math.abs(cert.daysUntilExpiry)} days ago.`,
        remediation: 'Renew the certificate immediately. If using Let\'s Encrypt, ensure your renewal automation (certbot, acme.sh) is running.',
        evidence: cert,
      };
    }
    if (cert.daysUntilExpiry !== undefined && cert.daysUntilExpiry < 14) {
      return {
        category: 'tls', checkId: 'tls_cert', title: 'TLS certificate',
        severity: 'high', passed: false,
        description: `TLS certificate expires in ${cert.daysUntilExpiry} days.`,
        remediation: 'Renew now to avoid an outage. Verify auto-renewal is configured.',
        evidence: cert,
      };
    }
    if (cert.protocol && (cert.protocol === 'TLSv1' || cert.protocol === 'TLSv1.1')) {
      return {
        category: 'tls', checkId: 'tls_cert', title: 'TLS protocol',
        severity: 'high', passed: false,
        description: `Server negotiated outdated protocol ${cert.protocol}. TLS 1.0 and 1.1 are deprecated.`,
        remediation: 'Disable TLS 1.0 and 1.1 on your web server. Require TLS 1.2 or higher.',
        evidence: cert,
      };
    }
    return {
      category: 'tls', checkId: 'tls_cert', title: 'TLS certificate',
      severity: 'pass', passed: true,
      description: `Valid certificate issued by ${cert.issuer ?? 'unknown CA'}, expires in ${cert.daysUntilExpiry} days. Protocol: ${cert.protocol}.`,
      remediation: 'No action needed. Confirm renewal automation is in place.',
      evidence: cert,
    };
  } catch (err) {
    return {
      category: 'tls', checkId: 'tls_cert', title: 'TLS certificate',
      severity: 'high', passed: false,
      description: 'Could not establish a TLS connection on port 443. The site may not support HTTPS.',
      remediation: 'Enable HTTPS on the web server with a valid certificate (Let\'s Encrypt is free). Modern browsers warn or block HTTP-only sites.',
      evidence: { error: (err as Error).message },
    };
  }
}