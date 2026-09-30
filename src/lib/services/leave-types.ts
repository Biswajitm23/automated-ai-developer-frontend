import { request } from "./http";
import type { LeaveType } from "./types";

/** GET /api/leave-types/ (any signed-in user). */
export function listLeaveTypes(signal?: AbortSignal): Promise<LeaveType[]> {
  return request<LeaveType[]>("leaveTypes", "/api/leave-types/", { signal });
}
