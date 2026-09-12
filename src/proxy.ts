import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: this reads the session cookie, never the database.
// Every page and action still verifies the session through src/lib/auth/session.ts.
// (Auth pages redirect signed-in users themselves, after a real session check, so an
// expired cookie can never bounce between /login and /dashboard.)
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!getSessionCookie(request)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  // Lets requireUser() send people back to where they were if the session turns out invalid.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname + search);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
