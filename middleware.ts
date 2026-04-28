import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Lightweight redirect: only checks for presence of cookie.
// APIs still validate sessions server-side.
export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const isProtected = pathname.startsWith("/student") || pathname.startsWith("/teacher")
  if (!isProtected) return NextResponse.next()

  const hasCookie = Boolean(req.cookies.get("tb_session")?.value)
  if (hasCookie) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = "/login"
  url.searchParams.set("next", pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/student/:path*", "/teacher/:path*"],
}

