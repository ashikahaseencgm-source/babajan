import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every page request:
 *  - Content-Security-Policy with a per-request nonce (strict-dynamic).
 *  - Maintenance mode (admins and the payment webhooks still get through).
 *  - Non-production environments send X-Robots-Tag: noindex.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (process.env.MAINTENANCE_MODE === "true") {
    const allowed =
      pathname.startsWith("/admin") ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/sign-in") ||
      pathname === "/maintenance";
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/maintenance";
      return NextResponse.rewrite(url, { status: 503 });
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const razorpay = process.env.PAYMENT_PROVIDER === "razorpay";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes are used for colour swatches; no third-party styles are loaded.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data:${razorpay ? " https://*.razorpay.com" : ""}`,
    "font-src 'self'",
    `connect-src 'self'${razorpay ? " https://*.razorpay.com" : ""}${isDev ? " ws: wss:" : ""}`,
    `frame-src ${razorpay ? "https://api.razorpay.com https://checkout.razorpay.com" : "'none'"}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    isDev ? "" : "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  if (process.env.APP_ENV !== "production") response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|brand|uploads|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
