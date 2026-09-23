/** /api/leave-types/, /api/me/balances/, /api/leave-requests/** (employee side). */

import { ApiError } from "@/lib/api";
import { currentYearInAppZone, toAppZoneDateTime, yearOf } from "@/lib/dates";
import { LEAVE_TYPE_FALLBACK_NAMES, STATUS_LABELS } from "@/lib/format";
import {
  LEAVE_TYPE_CODES,
  type LeavePreviewResponse,
  type LeaveRequest,
  type LeaveType,
  type MyBalances,
} from "@/lib/services/types";
import { bodyObject, parseId, parseYear, type MockContext, type RouteDef } from "../router";
import { computeBalance, computeBalances, newestFirst, paginate, parseStatus, validateCreate } from "../rules";
import { employeeRef } from "../seed";
import { ensureEmployeeForUser } from "../store";

export const LEAVE_TYPES: LeaveType[] = LEAVE_TYPE_CODES.map((code) => ({
  code,
  name: LEAVE_TYPE_FALLBACK_NAMES[code],
}));

function ownRequest(ctx: MockContext): LeaveRequest {
  const id = parseId(ctx.params.id);
  const request = ctx.db.requests.find((item) => item.id === id);
  // 404 also for other people's requests, so existence does not leak.
  if (!request || request.employee.id !== ctx.user.id) throw new ApiError(404, "Not found.");
  return request;
}

function getBalances(ctx: MockContext): MyBalances {
  const year = parseYear(ctx.query.get("year"), currentYearInAppZone());
  return { year, balances: computeBalances(ctx.user.id, year, ctx.db.allowances, ctx.db.requests) };
}

function listRequests(ctx: MockContext) {
  const rawYear = ctx.query.get("year");
  const year = rawYear ? parseYear(rawYear) : undefined;
  const status = parseStatus(ctx.query.get("status"));
  const items = ctx.db.requests
    .filter(
      (request) =>
        request.employee.id === ctx.user.id &&
        (year === undefined || yearOf(request.start_date) === year) &&
        (status === undefined || request.status === status),
    )
    .sort(newestFirst);
  return paginate(items, ctx.query, ctx.path);
}

function createRequest(ctx: MockContext): LeaveRequest {
  const body = bodyObject(ctx.body);
  const clientRequestId = typeof body.client_request_id === "string" ? body.client_request_id : "";
  const idempotencyKey = `${ctx.user.id}:${clientRequestId}`;
  if (clientRequestId && ctx.db.idempotency.has(idempotencyKey)) {
    const original = ctx.db.requests.find((item) => item.id === ctx.db.idempotency.get(idempotencyKey));
    if (original) return original; // 200 with the original request
  }
  const clean = validateCreate(ctx.user.id, body, ctx.db.allowances, ctx.db.requests);
  const employee = ensureEmployeeForUser(ctx.db, ctx.user);
  const now = toAppZoneDateTime();
  const request: LeaveRequest = {
    id: ctx.db.nextRequestId++,
    employee: employeeRef(employee),
    leave_type: clean.leave_type,
    start_date: clean.start_date,
    end_date: clean.end_date,
    working_days: clean.working_days,
    reason: clean.reason,
    status: "PENDING",
    created_at: now,
    updated_at: now,
    reviewed_by: null,
    reviewed_at: null,
    review_remarks: "",
    cancelled_at: null,
  };
  ctx.db.requests.push(request);
  if (clientRequestId) ctx.db.idempotency.set(idempotencyKey, request.id);
  return request;
}

function previewRequest(ctx: MockContext): LeavePreviewResponse {
  const input = {
    leave_type: ctx.query.get("leave_type") ?? undefined,
    start_date: ctx.query.get("start_date") ?? undefined,
    end_date: ctx.query.get("end_date") ?? undefined,
    reason: "preview", // not part of the preview
  };
  try {
    const clean = validateCreate(ctx.user.id, input, ctx.db.allowances, ctx.db.requests);
    return {
      valid: true,
      working_days: clean.working_days,
      balance: computeBalance(
        ctx.user.id,
        yearOf(clean.start_date),
        clean.leave_type,
        ctx.db.allowances,
        ctx.db.requests,
      ),
    };
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 400) throw error;
    const errors: Record<string, string[]> = { ...error.fieldErrors };
    if (error.detail) errors.non_field_errors = [error.detail];
    return { valid: false, working_days: 0, errors };
  }
}

function cancelRequest(ctx: MockContext): LeaveRequest {
  const request = ownRequest(ctx);
  if (request.status !== "PENDING") {
    throw new ApiError(
      409,
      `Only pending requests can be cancelled. This request is ${STATUS_LABELS[request.status]}.`,
    );
  }
  const now = toAppZoneDateTime();
  request.status = "CANCELLED";
  request.cancelled_at = now;
  request.updated_at = now;
  return request;
}

export const employeeRoutes: RouteDef[] = [
  { method: "GET", path: "/api/leave-types/", role: "ANY", handler: () => LEAVE_TYPES },
  { method: "GET", path: "/api/me/balances/", role: "EMPLOYEE", handler: getBalances },
  { method: "GET", path: "/api/leave-requests/", role: "EMPLOYEE", handler: listRequests },
  { method: "POST", path: "/api/leave-requests/", role: "EMPLOYEE", handler: createRequest },
  { method: "GET", path: "/api/leave-requests/preview/", role: "EMPLOYEE", handler: previewRequest },
  { method: "GET", path: "/api/leave-requests/:id/", role: "EMPLOYEE", handler: ownRequest },
  { method: "POST", path: "/api/leave-requests/:id/cancel/", role: "EMPLOYEE", handler: cancelRequest },
];
