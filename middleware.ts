import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/jwt';

// Routes that require an authenticated session. Extend this list as future
// phases add idea posting, team management, etc.
const PROTECTED_PATHS = ['/dashboard', '/ideas/new'];

// Dynamic-segment routes that also require a session. Middleware can only
// check "is this a valid session" — it can't check "is this user the
// founder of this specific idea" without a DB round-trip on the edge, so
// that stricter, founder-only check happens server-side in the analytics
// page and API route (same defense-in-depth pattern used everywhere else
// in this app: middleware handles the coarse check, the route/page handles
// the resource-specific one).
const PROTECTED_PATTERNS = [/^\/ideas\/[^/]+\/analytics$/];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected =
    PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    PROTECTED_PATTERNS.some((pattern) => pattern.test(pathname));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/ideas/new', '/ideas/:id/analytics'],
};
