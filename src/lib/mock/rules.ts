/**
 * Business rules shared by the mock handlers. They mirror the backend rules
 * in docs/ui-design.md §6 (ELM-004): the same date helpers as the UI preview,
 * plus balances, overlaps, pagination, filtering and counts.
 */

import { ApiError } from "@/lib/api";
import {
  countWorkingDays,
  exceedsBalanceMessage,
  parseISODate,
  previewLeave,
  rangesOverlap,
  todayInAppZone,
  yearOf,
} from "@/lib/dates";
import { LEAVE_TYPE_FALLBACK_NAMES, formatDateRange } from "@/lib/format";
import {
  DEFAULT_PAGE_SIZE,
  LEAVE_TYPE_CODES,
  MAX_PAGE_SIZE,
  REASON_MAX_LENGTH,
  REQUEST_STATUSES,
  type AdminRequestQuery,
  type Balance,
  type ISODate,
  type LeaveRequest,
  type LeaveTypeCode,
  type Paginated,
  type RequestStatus,
  type StatusCounts,
} from "@/lib/services/types";

/** Stored allowance: days per employee, year and leave type. */
export type AllowanceRecord = {
  employee_id: number;
  year: number;
  leave_type: LeaveTypeCode;
  days: number;
  updated_at: string | null;
};

export function allowanceKey(employeeId: number, year: number, leaveType: LeaveTypeCode): string {
  return `${employeeId}:${year}:${leaveType}`;
}

/** Allowance − approved − pending for one employee, year and type. */
export function computeBalance(
  employeeId: number,
  year: number,
  leaveType: LeaveTypeCode,
  allowances: Map<string, AllowanceRecord>,
  requests: LeaveRequest[],
): Balance {
  const allowance = allowances.get(allowanceKey(employeeId, year, leaveType))?.days ?? 0;
  let approved = 0;
  let pending = 0;
  for (const request of requests) {
    if (request.employee.id !== employeeId || request.leave_type !== leaveType) continue;
    if (yearOf(request.start_date) !== year) continue;
    if (request.status === "APPROVED") approved += request.working_days;
    else if (request.status === "PENDING") pending += request.working_days;
  }
  return { leave_type: leaveType, year, allowance, approved, pending, available: allowance - approved - pending };
}

export function computeBalances(
  employeeId: number,
  year: number,
  allowances: Map<string, AllowanceRecord>,
  requests: LeaveRequest[],
): Balance[] {
  return LEAVE_TYPE_CODES.map((code) => computeBalance(employeeId, year, code, allowances, requests));
}

/** The employee's pending or approved requests that share a day with [start, end]. */
export function overlaps(
  employeeId: number,
  start: ISODate,
  end: ISODate,
  requests: LeaveRequest[],
  ignoreId?: number,
): LeaveRequest[] {
  return requests.filter(
    (request) =>
      request.employee.id === employeeId &&
      request.id !== ignoreId &&
      (request.status === "PENDING" || request.status === "APPROVED") &&
      rangesOverlap(request.start_date, request.end_date, start, end),
  );
}

export type CreateInput = {
  leave_type?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  reason?: unknown;
};

/**
 * Validates a new request like the backend (400 with DRF-shaped errors).
 * Returns the cleaned values and working days, or throws ApiError(400).
 */
export function validateCreate(
  employeeId: number,
  input: CreateInput,
  allowances: Map<string, AllowanceRecord>,
  requests: LeaveRequest[],
  today: ISODate = todayInAppZone(),
): { leave_type: LeaveTypeCode; start_date: ISODate; end_date: ISODate; reason: string; working_days: number } {
  const fieldErrors: Record<string, string[]> = {};
  const leaveType = input.leave_type;
  if (typeof leaveType !== "string" || !(LEAVE_TYPE_CODES as string[]).includes(leaveType)) {
    fieldErrors.leave_type = ["Select a valid choice."];
  }
  for (const field of ["start_date", "end_date"] as const) {
    const value = input[field];
    if (value === undefined || value === null || value === "") fieldErrors[field] = ["This field is required."];
    else if (typeof value !== "string" || !parseISODate(value)) {
      fieldErrors[field] = ["Date has wrong format. Use one of these formats instead: YYYY-MM-DD."];
    }
  }
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!reason) fieldErrors.reason = ["This field may not be blank."];
  else if (reason.length > REASON_MAX_LENGTH) {
    fieldErrors.reason = [`Ensure this field has no more than ${REASON_MAX_LENGTH} characters.`];
  }
  if (Object.keys(fieldErrors).length > 0) throw new ApiError(400, null, fieldErrors);

  const start = input.start_date as ISODate;
  const end = input.end_date as ISODate;
  const code = leaveType as LeaveTypeCode;
  const preview = previewLeave({ start, end, today });
  for (const issue of preview.issues) {
    if (issue.field === "form") throw new ApiError(400, issue.message);
    fieldErrors[issue.field] = [issue.message];
  }
  if (Object.keys(fieldErrors).length > 0) throw new ApiError(400, null, fieldErrors);

  const clash = overlaps(employeeId, start, end, requests)[0];
  if (clash) {
    throw new ApiError(
      400,
      `These dates overlap your pending or approved request #${clash.id} (${formatDateRange(clash.start_date, clash.end_date)}).`,
    );
  }

  const workingDays = preview.workingDays;
  const balance = computeBalance(employeeId, yearOf(start), code, allowances, requests);
  if (workingDays > balance.available) {
    throw new ApiError(
      400,
      exceedsBalanceMessage(LEAVE_TYPE_FALLBACK_NAMES[code], workingDays, Math.max(0, balance.available)),
    );
  }
  return { leave_type: code, start_date: start, end_date: end, reason, working_days: workingDays };
}

/** Working days of a stored range (no validation). */
export function workingDaysBetween(start: ISODate, end: ISODate): number {
  const a = parseISODate(start);
  const b = parseISODate(end);
  return a && b ? countWorkingDays(a, b) : 0;
}

/** Newest first: -created_at, -id. */
export function newestFirst(a: LeaveRequest, b: LeaveRequest): number {
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
  return b.id - a.id;
}

export function parsePageParams(query: URLSearchParams): { page: number; pageSize: number } {
  const rawPage = query.get("page");
  const rawSize = query.get("page_size");
  const page = rawPage && /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  let pageSize = rawSize && /^\d+$/.test(rawSize) ? Number(rawSize) : DEFAULT_PAGE_SIZE;
  pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
  if (page < 1) throw new ApiError(404, "Invalid page.");
  return { page, pageSize };
}

/** DRF-style page; an out-of-range page gives 404 "Invalid page.". */
export function paginate<T>(items: T[], query: URLSearchParams, path: string): Paginated<T> {
  const { page, pageSize } = parsePageParams(query);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  if (page > totalPages) throw new ApiError(404, "Invalid page.");
  const link = (target: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(target));
    return `${path}?${next.toString()}`;
  };
  return {
    count: items.length,
    next: page < totalPages ? link(page + 1) : null,
    previous: page > 1 ? link(page - 1) : null,
    page,
    page_size: pageSize,
    total_pages: totalPages,
    results: items.slice((page - 1) * pageSize, page * pageSize),
  };
}

export function counts(requests: LeaveRequest[]): StatusCounts {
  const result = { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0, total: 0 };
  for (const request of requests) {
    result[request.status]++;
    result.total++;
  }
  return result;
}

export function parseStatus(raw: string | null): RequestStatus | undefined {
  if (raw === null || raw === "") return undefined;
  if (!(REQUEST_STATUSES as string[]).includes(raw)) {
    throw new ApiError(400, null, { status: ["Select a valid choice."] });
  }
  return raw as RequestStatus;
}

/**
 * Admin filters (ELM-009). Returns the requests matching every filter, and
 * separately those matching every filter except status (for the counts).
 */
export function filterAdminRequests(
  requests: LeaveRequest[],
  query: AdminRequestQuery,
): { matching: LeaveRequest[]; withoutStatus: LeaveRequest[] } {
  const withoutStatus = requests.filter((request) => {
    if (query.employee !== undefined && request.employee.id !== query.employee) return false;
    if (query.leave_type !== undefined && request.leave_type !== query.leave_type) return false;
    // A request matches when start_date <= date_to AND end_date >= date_from.
    if (query.date_to !== undefined && request.start_date > query.date_to) return false;
    if (query.date_from !== undefined && request.end_date < query.date_from) return false;
    return true;
  });
  const matching =
    query.status === undefined ? withoutStatus : withoutStatus.filter((r) => r.status === query.status);
  return { matching: [...matching].sort(newestFirst), withoutStatus };
}
