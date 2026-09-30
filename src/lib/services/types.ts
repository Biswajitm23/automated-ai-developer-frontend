/**
 * Wire types for the leave-management API (docs/ui-design.md §5.1, §6).
 * The API uses snake_case, like the existing `User` type in lib/auth.ts.
 */

export type ISODate = string; // "YYYY-MM-DD" (calendar date, no time zone)
export type ISODateTime = string; // ISO 8601 with offset, e.g. "2026-10-05T14:32:10+05:30"

export type LeaveTypeCode = "CASUAL" | "SICK";
export const LEAVE_TYPE_CODES: LeaveTypeCode[] = ["CASUAL", "SICK"];
export type LeaveType = { code: LeaveTypeCode; name: string };

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export const REQUEST_STATUSES: RequestStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

export type PersonRef = { id: number; full_name: string };

export type Employee = {
  id: number; // = Django User.id
  username: string;
  first_name: string;
  last_name: string;
  full_name: string; // server-built, "first last" or username
  email: string; // unique (case-insensitive)
  department: string;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type EmployeeRef = Pick<Employee, "id" | "full_name" | "email" | "department" | "is_active">;

export type EmployeeCreateInput = {
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  username: string;
  password: string; // write-only, never returned
};

export type EmployeeUpdateInput = Partial<
  Pick<Employee, "first_name" | "last_name" | "email" | "department">
>;

/** Allowance row as the admin sees it (balance included so limits can be shown). */
export type Allowance = {
  employee_id: number;
  year: number;
  leave_type: LeaveTypeCode;
  days: number; // integer >= 0
  approved: number; // used
  pending: number; // reserved
  available: number; // days - approved - pending
  minimum_allowed: number; // approved + pending
  updated_at: ISODateTime | null; // null = never set (days = 0)
};

export type EmployeeAllowances = {
  employee_id: number;
  year: number;
  allowances: Allowance[];
};

export type Balance = {
  leave_type: LeaveTypeCode;
  year: number;
  allowance: number;
  approved: number;
  pending: number;
  available: number; // allowance - approved - pending
};

export type MyBalances = { year: number; balances: Balance[] };

export type LeaveRequest = {
  id: number;
  employee: EmployeeRef;
  leave_type: LeaveTypeCode;
  start_date: ISODate;
  end_date: ISODate;
  working_days: number; // server-computed
  reason: string;
  status: RequestStatus;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  reviewed_by: PersonRef | null;
  reviewed_at: ISODateTime | null;
  review_remarks: string; // "" when none
  cancelled_at: ISODateTime | null;
};

/** Admin review payload: the request plus the employee's balances for the request's year. */
export type AdminLeaveRequestDetail = LeaveRequest & { balances: Balance[] };

export type LeaveRequestCreateInput = {
  leave_type: LeaveTypeCode;
  start_date: ISODate;
  end_date: ISODate;
  reason: string;
  client_request_id: string; // UUID v4 generated per form instance (idempotency)
};

export type LeavePreviewInput = Pick<LeaveRequestCreateInput, "leave_type" | "start_date" | "end_date">;

export type LeavePreviewResponse =
  | { valid: true; working_days: number; balance: Balance }
  | { valid: false; working_days: number; errors: Record<string, string[]> };

export type DecisionInput = { remarks: string };

export type StatusCounts = Record<RequestStatus, number> & { total: number };

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  page_size: number;
  total_pages: number;
  results: T[];
};

export type AdminLeaveRequestPage = Paginated<LeaveRequest> & { counts: StatusCounts };

export type AdminSummary = {
  counts: StatusCounts; // all requests
  pending_count: number; // = counts.PENDING (for the nav badge)
  active_employee_count: number;
  recent_requests: LeaveRequest[]; // newest 8 by created_at
};

export type EmployeeStatusFilter = "active" | "inactive" | "all";

export type EmployeeListQuery = {
  q?: string;
  status?: EmployeeStatusFilter;
  ordering?: "name" | "-created_at";
  page?: number;
  page_size?: number;
};

export type MyRequestQuery = {
  year?: number;
  status?: RequestStatus;
  page?: number;
  page_size?: number;
};

export type AdminRequestQuery = {
  employee?: number;
  status?: RequestStatus;
  leave_type?: LeaveTypeCode;
  date_from?: ISODate;
  date_to?: ISODate;
  page?: number;
  page_size?: number;
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const REASON_MAX_LENGTH = 500;
export const REMARKS_MAX_LENGTH = 500;
