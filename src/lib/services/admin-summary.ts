import { request } from "./http";
import type { AdminSummary } from "./types";

/** GET /api/admin/summary/ */
export function getAdminSummary(signal?: AbortSignal): Promise<AdminSummary> {
  return request("adminSummary", "/api/admin/summary/", { signal });
}
