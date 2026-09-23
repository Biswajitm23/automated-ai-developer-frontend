import { request } from "./http";
import { toQueryString } from "./query";
import type {
  AdminLeaveRequestDetail,
  AdminLeaveRequestPage,
  AdminRequestQuery,
  LeaveRequest,
} from "./types";

/** GET /api/admin/leave-requests/ — newest first, with counts for all filters except status. */
export function listAdminRequests(
  query: AdminRequestQuery = {},
  signal?: AbortSignal,
): Promise<AdminLeaveRequestPage> {
  return request("adminRequests", `/api/admin/leave-requests/${toQueryString(query)}`, { signal });
}

/** GET /api/admin/leave-requests/{id}/ — includes the employee's balances for that year. */
export function getAdminRequest(
  id: number | string,
  signal?: AbortSignal,
): Promise<AdminLeaveRequestDetail> {
  return request("adminRequests", `/api/admin/leave-requests/${id}/`, { signal });
}

/** POST /api/admin/leave-requests/{id}/approve/ — remarks optional. */
export function approveRequest(id: number | string, remarks: string): Promise<LeaveRequest> {
  return request("adminDecisions", `/api/admin/leave-requests/${id}/approve/`, {
    method: "POST",
    body: { remarks },
  });
}

/** POST /api/admin/leave-requests/{id}/reject/ — remarks required. */
export function rejectRequest(id: number | string, remarks: string): Promise<LeaveRequest> {
  return request("adminDecisions", `/api/admin/leave-requests/${id}/reject/`, {
    method: "POST",
    body: { remarks },
  });
}
