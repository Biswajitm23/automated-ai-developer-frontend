import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig = (phase: string): NextConfig => {
  // The dev-only mock API (src/lib/mock) is compiled out of production builds:
  // MOCK_API_ENABLED also requires NODE_ENV !== "production". Say so, rather
  // than let someone believe a production build serves mock data.
  const state = globalThis as { __elmMockWarned?: boolean };
  if (
    phase === PHASE_PRODUCTION_BUILD &&
    process.env.NEXT_PUBLIC_USE_MOCK_API === "true" &&
    !state.__elmMockWarned
  ) {
    state.__elmMockWarned = true;
    console.warn(
      "\n⚠ NEXT_PUBLIC_USE_MOCK_API=true is ignored in production builds: the mock API is " +
        "development-only and is not included. Use `npm run dev` to work with mock data.\n",
    );
  }
  // Deployed demo: the browser calls /api on the website's own address and Next.js
  // forwards it to Django, so the session cookie stays first-party. (Calling a
  // backend on another hosting domain directly would make it a third-party cookie,
  // which Safari and private windows block.) Set BACKEND_ORIGIN at build time,
  // with NEXT_PUBLIC_API_BASE_URL empty.
  const backendOrigin = process.env.BACKEND_ORIGIN?.replace(/\/+$/, "");
  return {
    // Django URLs all end with "/". Next.js drops that slash before forwarding (and
    // would otherwise redirect to the slash-less form), so skip the redirect and add
    // the slash back; the query string is forwarded unchanged.
    skipTrailingSlashRedirect: true,
    // The default bottom-left badge would cover the collapsed sidebar's Log out button.
    devIndicators: { position: "bottom-right" },
    async headers() {
      // Tell browsers to use HTTPS only (one year). Browsers ignore this header
      // on plain-HTTP local development, so it is safe to send everywhere.
      return [
        {
          source: "/:path*",
          headers: [{ key: "Strict-Transport-Security", value: "max-age=31536000" }],
        },
      ];
    },
    async rewrites() {
      return backendOrigin
        ? [{ source: "/api/:path+", destination: `${backendOrigin}/api/:path+/` }]
        : [];
    },
  };
};

export default nextConfig;
