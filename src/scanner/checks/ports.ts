import net from 'node:net';
import { resolveA } from '../utils/dns';
import type { Finding } from '../types';

const PORTS: { port: number; name: string; risky: boolean; note: string }[] = [
  { port: 80,   name: 'HTTP',         risky: false, note: 'Web (plaintext)' },
  { port: 443,  name: 'HTTPS',        risky: false, note: 'Web (encrypted)' },
  { port: 22,   name: 'SSH',          risky: true,  note: 'Remote shell — should not be open to the world' },
  { port: 25,   name: 'SMTP',         risky: false, note: 'Mail transfer' },
  { port: 53,   name: 'DNS',          risky: false, note: 'DNS' },
  { port: 110,  name: 'POP3',         risky: true,  note: 'Plaintext mail retrieval — use 995 instead' },
  { port: 143,  name: 'IMAP',         risky: true,  note: 'Plaintext mail — use 993 instead' },
  { port: 465,  name: 'SMTPS',        risky: false, note: 'Encrypted submission' },
  { port: 587,  name: 'Submission',   risky: false, note: 'Mail submission with STARTTLS' },
  { port: 993,  name: 'IMAPS',        risky: false, note: 'Encrypted IMAP' },
  { port: 995,  name: 'POP3S',        risky: false, note: 'Encrypted POP3' },
  { port: 3389, name: 'RDP',          risky: true,  note: 'Remote Desktop — never expose to the internet' },
];

function probe(host: string, port: number, timeoutMs = 2500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (open: boolean) => {
      if (done) return; done = true;
      socket.destroy(); resolve(open);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

export async function checkPorts(domain: string): Promise<Finding[]> {
  const ips = await resolveA(domain);
  if (ips.length === 0) {
    return [{
      category: 'ports', checkId: 'ports', title: 'Port exposure',
      severity: 'info', passed: false,
      description: 'No IPv4 address resolved; cannot perform port checks.',
      remediation: 'Ensure DNS A records are published for the domain.',
    }];
  }

  const ip = ips[0];
  const results = await Promise.all(
    PORTS.map(async (p) => ({ ...p, open: await probe(ip, p.port) })),
  );

  const findings: Finding[] = [];
  const riskyOpen = results.filter((r) => r.open && r.risky);

  for (const r of riskyOpen) {
    findings.push({
      category: 'ports', checkId: `port_${r.port}`,
      title: `Port ${r.port} (${r.name}) exposed`,
      severity: r.port === 3389 ? 'critical' : 'high',
      passed: false,
      description: `Port ${r.port} (${r.name}) is reachable from the public internet. ${r.note}.`,
      remediation: r.port === 3389
        ? 'Block RDP at the firewall. Require VPN or a Zero Trust gateway for remote access.'
        : `Restrict port ${r.port} to trusted networks via firewall rules, or replace with the encrypted equivalent.`,
      evidence: { ip, port: r.port },
    });
  }

  findings.push({
    category: 'ports', checkId: 'ports_summary',
    title: 'Port scan summary',
    severity: 'info', passed: true,
    description: `Checked ${PORTS.length} common ports on ${ip}. Open: ${
      results.filter((r) => r.open).map((r) => `${r.port}/${r.name}`).join(', ') || 'none'
    }.`,
    remediation: 'Review exposed services regularly. Close anything not required.',
    evidence: { ip, results: results.map(({ port, name, open, risky }) => ({ port, name, open, risky })) },
  });

  return findings;
}