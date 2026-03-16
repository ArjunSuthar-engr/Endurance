import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";

const nextConfig: NextConfig = {
  // Server-side rendering + API routes are required for production-grade
  // document ingestion, verification orchestration, and authenticated state.
  async headers() {
    const cspDirectives = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      isProduction ? "connect-src 'self'" : "connect-src 'self' https://*.google.com",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "media-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
      isProduction ? "upgrade-insecure-requests" : null,
    ].filter(Boolean);

    const csp = cspDirectives.join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
