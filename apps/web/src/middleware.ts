import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Routes that don't require authentication
const publicPaths = [
  "/",
  "/login",
  "/api/auth",
  "/invite",
  "/api/presence",
  "/setup",
]

// Pattern-based public routes (checked with startsWith)
function isPublicPath(pathname: string): boolean {
  // Exact public paths or prefix matches
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return true
  }

  // Plugin API routes — use Bearer token auth in the route handler
  if (/^\/api\/circles\/[^/]+\/(posts|presence|members|feed)/.test(pathname)) {
    return true
  }
  if (pathname === "/api/upload") {
    return true
  }
  if (pathname === "/api/circles/invite-lookup") {
    return true
  }
  if (pathname === "/api/circles/_/join") {
    return true
  }

  // Static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return true
  }

  return false
}

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Allow public paths through
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // If not authenticated, redirect to login
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|noise.svg).*)",
  ],
}
