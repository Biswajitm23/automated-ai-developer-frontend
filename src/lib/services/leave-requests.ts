import { request } from "./http";
import { toQueryString } from "./query";
import type {
  LeavePreviewInput,
  LeavePreviewResponse,
  LeaveRequest,
  LeaveRequestCreateInput,
  MyRequestQuery,
  Paginated,
} from "./types";

/** GET /api/leave-requests/ — the caller's own requests, newest first. */
export function listMyRequests(
  query: MyRequestQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<LeaveRequest>> {
  return request("myRequests", `/api/leave-requests/${toQueryString(query)}`, { signal });
}

/** GET /api/leave-requests/{id}/ — 404 when it is not the caller's. */
export function getMyRequest(id: number | string, signal?: AbortSignal): Promise<LeaveRequest> {
  return request("myRequests", `/api/leave-requests/${id}/`, { signal });
}

/** POST /api/leave-requests/ — idempotent per `client_request_id`. */
export function createLeaveRequest(input: LeaveRequestCreateInput): Promise<LeaveRequest> {
  return request("myRequests", "/api/leave-requests/", { method: "POST", body: input });
}

/** POST /api/leave-requests/{id}/cancel/ — 409 when no longer pending. */
export function cancelLeaveRequest(id: number | string): Promise<LeaveRequest> {
  return request("cancelRequest", `/api/leave-requests/${id}/cancel/`, { method: "POST", body: {} });
}

/** GET /api/leave-requests/preview/ (optional server-side preview). */
export function previewLeaveRequest(
  input: LeavePreviewInput,
  signal?: AbortSignal,
): Promise<LeavePreviewResponse> {
  return request("myRequests", `/api/leave-requests/preview/${toQueryString(input)}`, { signal });
}
