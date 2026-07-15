import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const { pathname } = request.nextUrl;

  // Protect dashboard routes — redirect to login if unauthenticated
  // In development with demo mode, /map is accessible without auth
  const isDev = process.env.NODE_ENV === "development";
  if (pathname.startsWith("/settings") || (!isDev && pathname.startsWith("/map"))) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Redirect logged-in users away from login page
  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/settings", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
