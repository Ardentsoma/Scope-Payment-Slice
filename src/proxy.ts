import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  verifySessionCookie,
} from "@/lib/auth/session-cookie";
import { prisma } from "@/lib/prisma";

const AUTH_ROUTES = [
  "/signin",
  "/create-account",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

const PROTECTED_ROUTES = ["/dashboard", "/billing"];

export async function proxy(request: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  const response = NextResponse.next({ request });

  // Auth not configured yet (missing AUTH_SECRET): let pages load so the sign
  // in/create screens stay reachable instead of breaking on a missing secret.
  if (!secret) {
    return response;
  }

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  let loggedIn = false;
  if (cookie) {
    const session = await verifySessionCookie(cookie, secret);
    if (session) {
      // The cookie signature only proves we issued it; always confirm the
      // session row still exists in the DB so the proxy agrees with the
      // page-level getSessionUser(). Without this, a revoked/cleared cookie
      // bounces between /protected -> /signin -> /protected forever.
      try {
        const row = await prisma.session.findUnique({
          where: { id: session.sessionId },
          select: { expiresAt: true },
        });
        loggedIn = Boolean(row && row.expiresAt.getTime() >= Date.now());
      } catch {
        // DB unreachable: fail closed and let the server pages handle auth.
        loggedIn = false;
      }
    }
  }
  const { pathname } = request.nextUrl;

  if (loggedIn && AUTH_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (
    !loggedIn &&
    PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};