import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  console.log(`[MIDDLEWARE] ${hostname} -> ${pathname}`);

  // Local dev: redirect root to login page
  if ((hostname === "localhost:3002" || hostname === "127.0.0.1:3002") && pathname === "/") {
    const redirectUrl = new URL("/app/login", request.url);
    console.log(`[MIDDLEWARE] Redirecting / -> ${redirectUrl.toString()}`);
    return NextResponse.redirect(redirectUrl);
  }

  // Local dev: rewrite app routes that don't have /app prefix
  if (hostname === "localhost:3002" || hostname === "127.0.0.1:3002") {
    const isPublicClientRoute = pathname === "/portal" || pathname.startsWith("/portal/") || pathname === "/sign" || pathname.startsWith("/sign/") || pathname.startsWith("/api/sign/");
    if (!pathname.startsWith("/app") && !pathname.startsWith("/api") && pathname !== "/" && !isPublicClientRoute) {
      const url = request.nextUrl.clone();
      url.pathname = `/app${pathname}`;
      console.log(`[MIDDLEWARE] Rewriting ${pathname} -> ${url.pathname}`);
      return NextResponse.rewrite(url);
    }
  }

  // Handle app host routing for production and staging
  if (hostname === "app.facturio.ch" || hostname === "staging.app.facturio.ch" || hostname.startsWith("app.")) {
    // Public customer and signer pages intentionally use the root layout rather than the authenticated app shell.
    const isPublicClientRoute = pathname === "/portal" || pathname.startsWith("/portal/") || pathname === "/sign" || pathname.startsWith("/sign/") || pathname.startsWith("/api/sign/");
    // Don't double-rewrite if already starts with /app
    if (!pathname.startsWith("/app") && !isPublicClientRoute) {
      const url = request.nextUrl.clone();
      url.pathname = `/app${pathname}`;
      console.log(`[MIDDLEWARE] Rewriting ${pathname} -> ${url.pathname}`);
      return NextResponse.rewrite(url);
    }
  }

  // Handle sign host routing — public signer pages + standalone signing app
  if (hostname === "staging.sign.facturio.ch" || hostname === "sign.facturio.ch" || hostname.startsWith("sign.")) {
    const isPublicClientRoute = pathname === "/" || pathname.startsWith("/editor/") || pathname.startsWith("/send/") || pathname === "/sign" || pathname.startsWith("/sign/") || pathname.startsWith("/api/sign/") || pathname.startsWith("/api/upload");
    if (!isPublicClientRoute) {
      const url = request.nextUrl.clone();
      // Redirect non-sign paths to the landing page on the main domain
      url.hostname = "facturio.ch";
      url.pathname = pathname;
      console.log(`[MIDDLEWARE] Redirecting sign domain non-sign path ${pathname} to facturio.ch`);
      return NextResponse.redirect(url.toString());
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
