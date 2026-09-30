import { request } from "./http";
import { toQueryString } from "./query";
import type { Allowance, EmployeeAllowances, LeaveTypeCode } from "./types";

/** GET /api/admin/employees/{id}/allowances/?year= — one row per leave type. */
export function getAllowances(
  employeeId: number | string,
  year: number,
  signal?: AbortSignal,
): Promise<EmployeeAllowances> {
  return request(
    "adminAllowances",
    `/api/admin/employees/${employeeId}/allowances/${toQueryString({ year })}`,
    { signal },
  );
}

/** PUT /api/admin/employees/{id}/allowances/{year}/{leave_type}/ (upsert). */
export function setAllowance(
  employeeId: number | string,
  year: number,
  leaveType: LeaveTypeCode,
  days: number,
): Promise<Allowance> {
  return request(
    "adminAllowances",
    `/api/admin/employees/${employeeId}/allowances/${year}/${leaveType}/`,
    { method: "PUT", body: { days } },
  );
}
