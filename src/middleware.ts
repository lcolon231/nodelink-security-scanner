import { NextRequest, NextResponse } from 'next/server';

/**
 * Protects /admin pages with HTTP Basic Auth.
 * The /api/admin/* routes are protected separately by checkAdminAuth().
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname;
  if (!url.startsWith('/admin')) return NextResponse.next();

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return new NextResponse('Admin credentials not configured', { status: 500 });
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
    const decoded = atob(base64);
    const [user, pass] = decoded.split(':');
    if (user === username && pass === password) {
      return NextResponse.next();
    }
  } catch {
    // fall through
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="NodeLink Admin"' }
  });
}

export const config = {
  matcher: ['/admin/:path*']
};
