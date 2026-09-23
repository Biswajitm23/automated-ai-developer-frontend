/** /api/admin/summary/, /api/admin/employees/**, /api/admin/leave-requests/** */

import { ApiError } from "@/lib/api";
import { displayName } from "@/lib/auth";
import { parseISODate, toAppZoneDateTime, yearOf } from "@/lib/dates";
import { LEAVE_TYPE_FALLBACK_NAMES, STATUS_LABELS } from "@/lib/format";
import {
  LEAVE_TYPE_CODES,
  REMARKS_MAX_LENGTH,
  type AdminLeaveRequestDetail,
  type AdminLeaveRequestPage,
  type AdminRequestQuery,
  type AdminSummary,
  type Allowance,
  type Employee,
  type EmployeeAllowances,
  type LeaveRequest,
  type LeaveTypeCode,
} from "@/lib/services/types";
import { bodyObject, parseId, parseYear, type MockContext, type RouteDef } from "../router";
import {
  allowanceKey,
  computeBalance,
  computeBalances,
  counts,
  filterAdminRequests,
  newestFirst,
  paginate,
  parseStatus,
} from "../rules";
import { employeeRef } from "../seed";
import { findEmployee, type MockStore } from "../store";

const DATE_FORMAT_ERROR = "Date has wrong format. Use one of these formats instead: YYYY-MM-DD.";
const COMMON_PASSWORDS = new Set(["password", "password1", "12345678", "qwerty123", "letmein123", "welcome123"]);

// ---------------------------------------------------------------------------
// Helpers

function employeeOr404(ctx: MockContext): Employee {
  const employee = findEmployee(ctx.db, parseId(ctx.params.id));
  if (!employee) throw new ApiError(404, "Not found.");
  return employee;
}

function requestOr404(ctx: MockContext): LeaveRequest {
  const id = parseId(ctx.params.id);
  const request = ctx.db.requests.find((item) => item.id === id);
  if (!request) throw new ApiError(404, "Not found.");
  return request;
}

/** Requests hold a copy of the employee summary: keep it in step with edits. */
function syncEmployeeRefs(db: MockStore, employee: Employee): void {
  for (const request of db.requests) {
    if (request.employee.id === employee.id) request.employee = employeeRef(employee);
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

type EmployeeFields = {
  first_name?: string;
  last_name?: string;
  email?: string;
  department?: string;
  username?: string;
  password?: string;
};

/** DRF-like validation for create (all required fields) or PATCH (only given fields). */
function validateEmployee(
  db: MockStore,
  body: Record<string, unknown>,
  mode: "create" | "update",
  selfId?: number,
): EmployeeFields {
  const errors: Record<string, string[]> = {};
  const clean: EmployeeFields = {};
  const fields =
    mode === "create"
      ? (["first_name", "last_name", "email", "department", "username", "password"] as const)
      : (["first_name", "last_name", "email", "department"] as const);
  const required = new Set(["first_name", "email", "department", "username", "password"]);
  const maxLength: Record<string, number> = {
    first_name: 150,
    last_name: 150,
    email: 254,
    department: 100,
    username: 150,
    password: 128,
  };

  for (const field of fields) {
    const present = field in body;
    if (mode === "update" && !present) continue;
    const raw = body[field];
    const value = field === "password" ? (typeof raw === "string" ? raw : "") : text(raw);
    if (mode === "create" && !present && required.has(field)) {
      errors[field] = ["This field is required."];
      continue;
    }
    if (!value && required.has(field)) {
      errors[field] = ["This field may not be blank."];
      continue;
    }
    if (value.length > maxLength[field]) {
      errors[field] = [`Ensure this field has no more than ${maxLength[field]} characters.`];
      continue;
    }
    clean[field] = value;
  }

  if (clean.email !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) {
      errors.email = ["Enter a valid email address."];
    } else if (
      db.employees.some(
        (employee) => employee.id !== selfId && employee.email.toLowerCase() === clean.email!.toLowerCase(),
      )
    ) {
      errors.email = ["An employee with this email already exists."];
    }
  }
  if (clean.username !== undefined) {
    if (!/^[\w.@+-]+$/.test(clean.username)) {
      errors.username = [
        "Enter a valid username. This value may contain only letters, numbers, and @/./+/-/_ characters.",
      ];
    } else if (db.employees.some((employee) => employee.username.toLowerCase() === clean.username!.toLowerCase())) {
      errors.username = ["A user with that username already exists."];
    }
  }
  if (clean.password !== undefined) {
    const messages: string[] = [];
    if (clean.password.length < 8) {
      messages.push("This password is too short. It must contain at least 8 characters.");
    }
    if (COMMON_PASSWORDS.has(clean.password.toLowerCase())) messages.push("This password is too common.");
    if (/^\d+$/.test(clean.password)) messages.push("This password is entirely numeric.");
    if (clean.username && clean.password.toLowerCase().includes(clean.username.toLowerCase())) {
      messages.push("The password is too similar to the username.");
    }
    if (messages.length > 0) errors.password = messages;
  }

  if (Object.keys(errors).length > 0) throw new ApiError(400, null, errors);
  return clean;
}

function allowanceRow(db: MockStore, employeeId: number, year: number, leaveType: LeaveTypeCode): Allowance {
  const record = db.allowances.get(allowanceKey(employeeId, year, leaveType));
  const balance = computeBalance(employeeId, year, leaveType, db.allowances, db.requests);
  return {
    employee_id: employeeId,
    year,
    leave_type: leaveType,
    days: balance.allowance,
    approved: balance.approved,
    pending: balance.pending,
    available: balance.available,
    minimum_allowed: balance.approved + balance.pending,
    updated_at: record?.updated_at ?? null,
  };
}

function parseRemarks(body: Record<string, unknown>, required: boolean): string {
  const remarks = text(body.remarks);
  if (required && !remarks) {
    throw new ApiError(400, null, { remarks: ["Remarks are required when rejecting a request."] });
  }
  if (remarks.length > REMARKS_MAX_LENGTH) {
    throw new ApiError(400, null, {
      remarks: [`Ensure this field has no more than ${REMARKS_MAX_LENGTH} characters.`],
    });
  }
  return remarks;
}

function assertPending(request: LeaveRequest): void {
  if (request.status !== "PENDING") {
    throw new ApiError(409, `This request has already been processed (${STATUS_LABELS[request.status]}).`);
  }
}

function decide(ctx: MockContext, request: LeaveRequest, status: "APPROVED" | "REJECTED", remarks: string) {
  const now = toAppZoneDateTime();
  request.status = status;
  request.reviewed_by = { id: ctx.user.id, full_name: displayName(ctx.user) };
  request.reviewed_at = now;
  request.review_remarks = remarks;
  request.updated_at = now;
  return request;
}

// ---------------------------------------------------------------------------
// Handlers

function summary(ctx: MockContext): AdminSummary {
  const all = counts(ctx.db.requests);
  return {
    counts: all,
    pending_count: all.PENDING,
    active_employee_count: ctx.db.employees.filter((employee) => employee.is_active).length,
    recent_requests: [...ctx.db.requests].sort(newestFirst).slice(0, 8),
  };
}

function listEmployees(ctx: MockContext) {
  const q = (ctx.query.get("q") ?? "").trim().toLowerCase();
  const status = ctx.query.get("status") || "all";
  if (!["active", "inactive", "all"].includes(status)) {
    throw new ApiError(400, null, { status: ["Select a valid choice."] });
  }
  const ordering = ctx.query.get("ordering") || "name";
  const items = ctx.db.employees
    .filter((employee) => {
      if (status === "active" && !employee.is_active) return false;
      if (status === "inactive" && employee.is_active) return false;
      if (!q) return true;
      return [employee.full_name, employee.email, employee.username, employee.department].some((value) =>
        value.toLowerCase().includes(q),
      );
    })
    .sort((a, b) =>
      ordering === "-created_at"
        ? b.created_at.localeCompare(a.created_at) || b.id - a.id
        : a.full_name.localeCompare(b.full_name, "en", { sensitivity: "base" }) || a.id - b.id,
    );
  return paginate(items, ctx.query, ctx.path);
}

function createEmployee(ctx: MockContext): Employee {
  const clean = validateEmployee(ctx.db, bodyObject(ctx.body), "create");
  const now = toAppZoneDateTime();
  const firstName = clean.first_name ?? "";
  const lastName = clean.last_name ?? "";
  const employee: Employee = {
    id: ctx.db.nextEmployeeId++,
    username: clean.username ?? "",
    first_name: firstName,
    last_name: lastName,
    full_name: `${firstName} ${lastName}`.trim() || (clean.username ?? ""),
    email: clean.email ?? "",
    department: clean.department ?? "",
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  // The password is validated and then discarded: it is never stored or returned.
  ctx.db.employees.push(employee);
  return employee;
}

function updateEmployee(ctx: MockContext): Employee {
  const employee = employeeOr404(ctx);
  const clean = validateEmployee(ctx.db, bodyObject(ctx.body), "update", employee.id);
  if (clean.first_name !== undefined) employee.first_name = clean.first_name;
  if (clean.last_name !== undefined) employee.last_name = clean.last_name;
  if (clean.email !== undefined) employee.email = clean.email;
  if (clean.department !== undefined) employee.department = clean.department;
  employee.full_name = `${employee.first_name} ${employee.last_name}`.trim() || employee.username;
  employee.updated_at = toAppZoneDateTime();
  syncEmployeeRefs(ctx.db, employee);
  return employee;
}

function setActive(active: boolean) {
  return (ctx: MockContext): Employee => {
    const employee = employeeOr404(ctx);
    if (employee.is_active !== active) {
      employee.is_active = active;
      employee.updated_at = toAppZoneDateTime();
      syncEmployeeRefs(ctx.db, employee);
    }
    return employee;
  };
}

function getAllowances(ctx: MockContext): EmployeeAllowances {
  const employee = employeeOr404(ctx);
  const year = parseYear(ctx.query.get("year"));
  return {
    employee_id: employee.id,
    year,
    allowances: LEAVE_TYPE_CODES.map((code) => allowanceRow(ctx.db, employee.id, year, code)),
  };
}

function putAllowance(ctx: MockContext): Allowance {
  const employee = employeeOr404(ctx);
  const year = /^\d{4}$/.test(ctx.params.year ?? "") ? Number(ctx.params.year) : NaN;
  const leaveType = ctx.params.leave_type as LeaveTypeCode;
  if (!(year >= 2000 && year <= 2100) || !LEAVE_TYPE_CODES.includes(leaveType)) {
    throw new ApiError(404, "Not found.");
  }
  const days = bodyObject(ctx.body).days;
  if (typeof days !== "number" || !Number.isInteger(days)) {
    throw new ApiError(400, null, { days: ["A valid integer is required."] });
  }
  if (days < 0) throw new ApiError(400, null, { days: ["Ensure this value is greater than or equal to 0."] });
  if (days > 366) throw new ApiError(400, null, { days: ["Ensure this value is less than or equal to 366."] });
  const current = allowanceRow(ctx.db, employee.id, year, leaveType);
  if (days < current.minimum_allowed) {
    throw new ApiError(400, null, {
      days: [
        `Allowance cannot be less than approved plus pending leave (${current.minimum_allowed} ${current.minimum_allowed === 1 ? "day" : "days"}).`,
      ],
    });
  }
  ctx.db.allowances.set(allowanceKey(employee.id, year, leaveType), {
    employee_id: employee.id,
    year,
    leave_type: leaveType,
    days,
    updated_at: toAppZoneDateTime(),
  });
  return allowanceRow(ctx.db, employee.id, year, leaveType);
}

function parseAdminQuery(ctx: MockContext): AdminRequestQuery {
  const query: AdminRequestQuery = {};
  const errors: Record<string, string[]> = {};
  const employee = ctx.query.get("employee");
  if (employee) {
    const id = /^\d+$/.test(employee) ? Number(employee) : NaN;
    if (!findEmployee(ctx.db, id)) errors.employee = ["Select a valid choice."];
    else query.employee = id;
  }
  const leaveType = ctx.query.get("leave_type");
  if (leaveType) {
    if (!(LEAVE_TYPE_CODES as string[]).includes(leaveType)) errors.leave_type = ["Select a valid choice."];
    else query.leave_type = leaveType as LeaveTypeCode;
  }
  for (const field of ["date_from", "date_to"] as const) {
    const value = ctx.query.get(field);
    if (!value) continue;
    if (!parseISODate(value)) errors[field] = [DATE_FORMAT_ERROR];
    else query[field] = value;
  }
  if (query.date_from && query.date_to && query.date_to < query.date_from) {
    errors.date_to = ["End of range must be on or after the start."];
  }
  try {
    query.status = parseStatus(ctx.query.get("status"));
  } catch (error) {
    if (error instanceof ApiError) Object.assign(errors, error.fieldErrors);
  }
  if (Object.keys(errors).length > 0) throw new ApiError(400, null, errors);
  return query;
}

function listAdminRequests(ctx: MockContext): AdminLeaveRequestPage {
  const { matching, withoutStatus } = filterAdminRequests(ctx.db.requests, parseAdminQuery(ctx));
  return { ...paginate(matching, ctx.query, ctx.path), counts: counts(withoutStatus) };
}

function getAdminRequest(ctx: MockContext): AdminLeaveRequestDetail {
  const request = requestOr404(ctx);
  return {
    ...request,
    balances: computeBalances(request.employee.id, yearOf(request.start_date), ctx.db.allowances, ctx.db.requests),
  };
}

function approve(ctx: MockContext): LeaveRequest {
  const request = requestOr404(ctx);
  const remarks = parseRemarks(bodyObject(ctx.body), false);
  assertPending(request);
  // Transactional re-check: the reserved days must still fit the allowance.
  const year = yearOf(request.start_date);
  const balance = computeBalance(request.employee.id, year, request.leave_type, ctx.db.allowances, ctx.db.requests);
  if (balance.approved + balance.pending > balance.allowance) {
    throw new ApiError(
      409,
      `Approval would exceed the ${LEAVE_TYPE_FALLBACK_NAMES[request.leave_type]} allowance for ${year} (${balance.allowance} days).`,
    );
  }
  return decide(ctx, request, "APPROVED", remarks);
}

function reject(ctx: MockContext): LeaveRequest {
  const request = requestOr404(ctx);
  const remarks = parseRemarks(bodyObject(ctx.body), true);
  assertPending(request);
  return decide(ctx, request, "REJECTED", remarks);
}

export const adminRoutes: RouteDef[] = [
  { method: "GET", path: "/api/admin/summary/", role: "ADMIN", handler: summary },
  { method: "GET", path: "/api/admin/employees/", role: "ADMIN", handler: listEmployees },
  { method: "POST", path: "/api/admin/employees/", role: "ADMIN", handler: createEmployee },
  { method: "GET", path: "/api/admin/employees/:id/", role: "ADMIN", handler: employeeOr404 },
  { method: "PATCH", path: "/api/admin/employees/:id/", role: "ADMIN", handler: updateEmployee },
  { method: "POST", path: "/api/admin/employees/:id/deactivate/", role: "ADMIN", handler: setActive(false) },
  { method: "POST", path: "/api/admin/employees/:id/reactivate/", role: "ADMIN", handler: setActive(true) },
  { method: "GET", path: "/api/admin/employees/:id/allowances/", role: "ADMIN", handler: getAllowances },
  {
    method: "PUT",
    path: "/api/admin/employees/:id/allowances/:year/:leave_type/",
    role: "ADMIN",
    handler: putAllowance,
  },
  { method: "GET", path: "/api/admin/leave-requests/", role: "ADMIN", handler: listAdminRequests },
  { method: "GET", path: "/api/admin/leave-requests/:id/", role: "ADMIN", handler: getAdminRequest },
  { method: "POST", path: "/api/admin/leave-requests/:id/approve/", role: "ADMIN", handler: approve },
  { method: "POST", path: "/api/admin/leave-requests/:id/reject/", role: "ADMIN", handler: reject },
];
