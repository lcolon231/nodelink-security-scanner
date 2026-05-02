import { promises as dns } from 'node:dns';
import { withTimeout } from './timeout';

const DNS_TIMEOUT_MS = 4000;

export async function resolveTxt(name: string): Promise<string[][]> {
  try {
    return await withTimeout(dns.resolveTxt(name), DNS_TIMEOUT_MS, `TXT ${name}`);
  } catch {
    return [];
  }
}

export async function resolveMx(name: string) {
  try {
    return await withTimeout(dns.resolveMx(name), DNS_TIMEOUT_MS, `MX ${name}`);
  } catch {
    return [];
  }
}

export async function resolveNs(name: string) {
  try {
    return await withTimeout(dns.resolveNs(name), DNS_TIMEOUT_MS, `NS ${name}`);
  } catch {
    return [];
  }
}

export async function resolveA(name: string) {
  try {
    return await withTimeout(dns.resolve4(name), DNS_TIMEOUT_MS, `A ${name}`);
  } catch {
    return [];
  }
}

export async function resolveCaa(name: string) {
  try {
    return await withTimeout(dns.resolveCaa(name), DNS_TIMEOUT_MS, `CAA ${name}`);
  } catch {
    return [];
  }
}