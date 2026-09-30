/**
 * Dev-only mock API (docs/ui-design.md §5.4). Reached only through
 * `await import("@/lib/mock")` inside the MOCK_API_ENABLED branch of
 * services/http.ts, so production builds never contain it.
 */

import { adminRoutes } from "./handlers/admin";
import { employeeRoutes } from "./handlers/employee";
import { createRouter } from "./router";

export { MOCK_SEED_SENTINEL_ELM } from "./seed";

/** Same signature as apiFetch: resolves with the JSON body or throws ApiError. */
export const mockFetch = createRouter([...employeeRoutes, ...adminRoutes]);
