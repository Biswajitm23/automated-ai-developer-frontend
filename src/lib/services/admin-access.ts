import { apiFetch } from "@/lib/api";

export type AdminPingResponse = { status: "ok"; role: "ADMIN" };

/**
 * GET /api/admin/ping/ — the server-side administrator check (ELM-002).
 * Always the real API: never mocked and not subject to availability flags.
 */
export function pingAdmin(signal?: AbortSignal): Promise<AdminPingResponse> {
  return apiFetch<AdminPingResponse>("/api/admin/ping/", { signal });
}
