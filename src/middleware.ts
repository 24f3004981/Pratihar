import { NextResponse, type NextRequest } from "next/server";

// Only checks that a session cookie exists; route handlers verify it against the database.
export function middleware(req: NextRequest) {
  if (req.cookies.get("pratihar_session")) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/app", "/app/:path*"] };
