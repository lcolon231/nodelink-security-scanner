import { LRUCache } from 'lru-cache';

const MAX = Number(process.env.RATE_LIMIT_MAX ?? 5);
const WINDOW = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);

const cache = new LRUCache<string, number[]>({ max: 5000, ttl: WINDOW });

export function checkRate(ip: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  const arr = (cache.get(ip) ?? []).filter((t) => now - t < WINDOW);
  if (arr.length >= MAX) return { ok: false, remaining: 0 };
  arr.push(now);
  cache.set(ip, arr);
  return { ok: true, remaining: MAX - arr.length };
}