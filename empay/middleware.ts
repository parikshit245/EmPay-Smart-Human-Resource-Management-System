import { NextRequest, NextResponse } from "next/server";
import { verifyEdgeToken } from "@/lib/edge-jwt";

const PUBLIC_ROUTES = ["/sign-in", "/sign-up"];

const ROLE_PROTECTED: { pattern: RegExp; roles: string[] }[] = [
  { pattern: /^\/payroll/, roles: ["ADMIN", "PAYROLL_OFFICER"] },
  { pattern: /^\/reports/, roles: ["ADMIN", "PAYROLL_OFFICER"] },
  { pattern: /^\/settings/, roles: ["ADMIN"] },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Allow API auth routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("empay_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const payload = await verifyEdgeToken(token);

  if (!payload) {
    const response = NextResponse.redirect(new URL("/sign-in", request.url));
    response.cookies.delete("empay_token");
    return response;
  }

  // Check role-based protection
  if (
    payload.isFirstLogin &&
    pathname !== "/change-password" &&
    !pathname.startsWith("/api")
  ) {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  if (!payload.isFirstLogin && pathname === "/change-password") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  for (const { pattern, roles } of ROLE_PROTECTED) {
    if (pattern.test(pathname)) {
      if (!roles.includes(payload.role)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
