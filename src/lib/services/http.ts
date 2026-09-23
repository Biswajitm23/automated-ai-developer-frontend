import { ApiError, apiFetch, type ApiFetchOptions } from "@/lib/api";
import { ENDPOINTS, type EndpointGroup } from "./availability";
import { NotAvailableError } from "./errors";

/**
 * The single entry point for leave-management API calls. Chooses between the
 * real API, the dev-only mock, or "not available yet".
 *
 * Auth (/api/auth/*) and /api/admin/ping/ never come through here: they are
 * always real (lib/auth.ts, services/admin-access.ts).
 */
export async function request<T>(
  group: EndpointGroup,
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const entry = ENDPOINTS[group];
  if (!entry.available) {
    // The condition is written out here (it equals MOCK_API_ENABLED) on
    // purpose: the bundler only drops the import() below — and so never emits
    // the mock chunk — when it sees the inlined NODE_ENV check in this file. A
    // constant imported from another module is not enough (verified with the
    // MOCK_SEED_SENTINEL_ELM build grep).
    if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_USE_MOCK_API === "true") {
      const { mockFetch } = await import("@/lib/mock");
      return mockFetch<T>(path, options);
    }
    throw new NotAvailableError(entry.feature, entry.card);
  }
  try {
    return await apiFetch<T>(path, options);
  } catch (error) {
    // Safety net: an "available" endpoint whose URL is not routed yet (Django
    // 404 without a JSON {detail}) or 501 is shown as "not available".
    if (
      error instanceof ApiError &&
      (error.status === 501 || (error.status === 404 && error.detail === null))
    ) {
      throw new NotAvailableError(entry.feature, entry.card);
    }
    throw error;
  }
}
