import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const protectedRoutes = ["/map", "/pacientes", "/settings"] as const;

function isProtectedRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    protectedRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    )
  );
}

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const { pathname, search } = request.nextUrl;

  if (isProtectedRoute(pathname) && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
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
