import { NextRequest } from 'next/server';
import { prisma } from './db';

export type EventType =
  | 'scan_started'
  | 'scan_completed'
  | 'scan_failed'
  | 'results_viewed'
  | 'pdf_downloaded';

interface RequestContext {
  ipAddress: string | null;
  country: string | null;
  userAgent: string | null;
  referrer: string | null;
}

export function getRequestContext(req: Request | NextRequest): RequestContext {
  const headers = req.headers;
  const fwd = headers.get('x-forwarded-for');
  const ipAddress = fwd ? fwd.split(',')[0].trim() : (headers.get('x-real-ip') ?? null);
  const country = headers.get('x-vercel-ip-country') ?? null;
  const userAgent = headers.get('user-agent') ?? null;
  const referrer = headers.get('referer') ?? null;
  return { ipAddress, country, userAgent, referrer };
}

interface LogEventInput {
  eventType: EventType;
  scanId?: string | null;
  domain?: string | null;
  durationMs?: number | null;
  score?: number | null;
  metadata?: Record<string, unknown> | null;
  request?: Request | NextRequest | null;
}

/**
 * Fire-and-forget event logger. Never throws, never blocks the request path.
 * If the database write fails, we log to console and move on.
 */
export function logEvent(input: LogEventInput): void {
  const ctx = input.request ? getRequestContext(input.request) : {
    ipAddress: null, country: null, userAgent: null, referrer: null
  };
  prisma.scanEvent.create({
    data: {
      eventType: input.eventType,
      scanId: input.scanId ?? null,
      domain: input.domain ?? null,
      ipAddress: ctx.ipAddress,
      country: ctx.country,
      userAgent: ctx.userAgent,
      referrer: ctx.referrer,
      durationMs: input.durationMs ?? null,
      score: input.score ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null
    }
  }).catch((err) => {
    console.error('[events] Failed to log event:', input.eventType, err);
  });
}
