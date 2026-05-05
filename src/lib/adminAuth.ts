import { NextRequest, NextResponse } from 'next/server';

/**
 * Verifies HTTP Basic Auth credentials against env vars.
 * Returns null if authorized, or a 401 response if not.
 */
export function checkAdminAuth(req: NextRequest): NextResponse | null {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return NextResponse.json(
      { error: 'Admin credentials not configured on server' },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="NodeLink Admin"' }
    });
  }

  try {
    const base64 = authHeader.slice('Basic '.length);
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const [user, pass] = decoded.split(':');

    if (user === username && pass === password) {
      return null; // Authorized
    }
  } catch {
    // Fall through to 401
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="NodeLink Admin"' }
  });
}
