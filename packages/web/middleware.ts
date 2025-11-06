/**
 * Next.js Middleware for authentication
 * Protects routes and handles redirects
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/lpars', '/metrics', '/settings'];

// Public routes (no auth required)
const publicRoutes = ['/login', '/'];

export function middleware(request: NextRequest) {
  // Authentication disabled - allow all routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};

