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
  return {};
};

export default nextConfig;
