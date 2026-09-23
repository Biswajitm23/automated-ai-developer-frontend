import { request } from "./http";
import { toQueryString } from "./query";
import {
  MAX_PAGE_SIZE,
  type Employee,
  type EmployeeCreateInput,
  type EmployeeListQuery,
  type EmployeeUpdateInput,
  type Paginated,
} from "./types";

/** GET /api/admin/employees/ */
export function listEmployees(
  query: EmployeeListQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<Employee>> {
  return request("adminEmployees", `/api/admin/employees/${toQueryString(query)}`, { signal });
}

/** GET /api/admin/employees/{id}/ */
export function getEmployee(id: number | string, signal?: AbortSignal): Promise<Employee> {
  return request("adminEmployees", `/api/admin/employees/${id}/`, { signal });
}

/** POST /api/admin/employees/ — the password is write-only. */
export function createEmployee(input: EmployeeCreateInput): Promise<Employee> {
  return request("adminEmployees", "/api/admin/employees/", { method: "POST", body: input });
}

/** PATCH /api/admin/employees/{id}/ */
export function updateEmployee(id: number | string, input: EmployeeUpdateInput): Promise<Employee> {
  return request("adminEmployees", `/api/admin/employees/${id}/`, { method: "PATCH", body: input });
}

/** POST /api/admin/employees/{id}/deactivate/ (idempotent; history kept). */
export function deactivateEmployee(id: number | string): Promise<Employee> {
  return request("adminEmployees", `/api/admin/employees/${id}/deactivate/`, {
    method: "POST",
    body: {},
  });
}

/** POST /api/admin/employees/{id}/reactivate/ (idempotent). */
export function reactivateEmployee(id: number | string): Promise<Employee> {
  return request("adminEmployees", `/api/admin/employees/${id}/reactivate/`, {
    method: "POST",
    body: {},
  });
}

/** Every employee (active and inactive), for selects. Loads all pages of 100. */
export async function listEmployeeOptions(signal?: AbortSignal): Promise<Employee[]> {
  const all: Employee[] = [];
  for (let page = 1; ; page++) {
    const data = await listEmployees({ status: "all", page, page_size: MAX_PAGE_SIZE }, signal);
    all.push(...data.results);
    if (!data.next || page >= data.total_pages) return all;
  }
}
