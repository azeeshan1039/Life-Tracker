import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = new Set(["/login", "/offline", "/health"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPaths.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("__Host-session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
