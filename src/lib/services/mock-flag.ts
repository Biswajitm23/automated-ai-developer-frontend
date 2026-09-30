/**
 * Dev-only mock switch, for UI such as MockBanner. Tiny, and it contains no
 * mock code.
 *
 * `next build` inlines NODE_ENV as "production", so this is always `false` in
 * production builds, whatever NEXT_PUBLIC_USE_MOCK_API says (next.config.ts
 * prints a warning then). services/http.ts repeats the same condition inline
 * so that the bundler drops the mock import() from production builds.
 */
export const MOCK_API_ENABLED =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
