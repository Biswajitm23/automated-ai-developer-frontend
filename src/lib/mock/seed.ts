/**
 * Deterministic, fictional seed data for the dev-only mock (docs/ui-design.md
 * §5.6). Names, emails (example.com) and reasons are invented. Dates are
 * relative to Asia/Kolkata "today" when the store is built, so there are
 * always future pending requests.
 */

import {
  addDays,
  addWorkingDays,
  appZoneDateTime,
  nextWorkingDay,
  yearOf,
} from "@/lib/dates";
import {
  LEAVE_TYPE_CODES,
  type Employee,
  type ISODate,
  type ISODateTime,
  type LeaveRequest,
  type LeaveTypeCode,
  type PersonRef,
  type RequestStatus,
} from "@/lib/services/types";
import { mulberry32, pick, randInt, weighted, type Rng } from "./prng";
import {
  allowanceKey,
  computeBalance,
  workingDaysBetween,
  type AllowanceRecord,
} from "./rules";

/**
 * Build check: this string must never appear in production output
 * (`grep -rl "MOCK_SEED_SENTINEL_ELM" .next/static` finds nothing).
 */
export const MOCK_SEED_SENTINEL_ELM = "MOCK_SEED_SENTINEL_ELM: dev-only mock seed data";

export const SEED_PRNG_SEED = 20260923;

export const SEED_REVIEWER: PersonRef = { id: 900, full_name: "Neha Deshpande (HR Admin)" };

export const SEED_DEPARTMENTS = [
  "Engineering",
  "Human Resources",
  "Finance & Accounts",
  "Customer Success",
  "Research and Development — Applied Machine Learning Platform Group", // long
  "Operations",
];

export const SEED_EMPLOYEES: Omit<Employee, "created_at" | "updated_at" | "full_name">[] = [
  { id: 1001, username: "aarav.sharma", first_name: "Aarav", last_name: "Sharma", email: "aarav.sharma@example.com", department: "Engineering", is_active: true },
  { id: 1002, username: "venkata.chakravarthy", first_name: "Venkata Satya Narayana Subrahmanyam", last_name: "Chakravarthy-Ramachandran", email: "venkata.satyanarayana.subrahmanyam.chakravarthy@example.com", department: "Research and Development — Applied Machine Learning Platform Group", is_active: true },
  { id: 1003, username: "priya.nair", first_name: "Priya", last_name: "Nair", email: "priya.nair@example.com", department: "Human Resources", is_active: true },
  { id: 1004, username: "annemarie.fitzgerald", first_name: "Anne-Marie", last_name: "Fitzgerald-O'Sullivan", email: "anne-marie.fitzgerald-osullivan@example.com", department: "Customer Success", is_active: true },
  { id: 1005, username: "rohan.mehta", first_name: "Rohan", last_name: "Mehta", email: "rohan.mehta@example.com", department: "Finance & Accounts", is_active: true },
  { id: 1006, username: "fatima.khan", first_name: "Fatima", last_name: "Khan", email: "fatima.khan@example.com", department: "Operations", is_active: true },
  { id: 1007, username: "karthik.iyer", first_name: "Karthik", last_name: "Iyer", email: "karthik.iyer@example.com", department: "Engineering", is_active: true },
  { id: 1008, username: "meera.krishnan", first_name: "Meera", last_name: "Krishnan", email: "meera.krishnan@example.com", department: "Engineering", is_active: true },
  { id: 1009, username: "daniel.okafor", first_name: "Daniel", last_name: "Okafor", email: "daniel.okafor@example.com", department: "Customer Success", is_active: true },
  { id: 1010, username: "sneha.patil", first_name: "Sneha", last_name: "Patil", email: "sneha.patil@example.com", department: "Finance & Accounts", is_active: true },
  { id: 1011, username: "arjun.reddy", first_name: "Arjun", last_name: "Reddy", email: "arjun.reddy@example.com", department: "Operations", is_active: false }, // inactive, history kept
  { id: 1012, username: "lakshmi.venkataraman", first_name: "Lakshmi", last_name: "Venkataraman", email: "lakshmi.venkataraman@example.com", department: "Human Resources", is_active: false },
];

/** Default allowances for every employee, previous and current year. */
export const DEFAULT_ALLOWANCE: Record<LeaveTypeCode, number> = { CASUAL: 12, SICK: 10 };

export const SEED_LONG_REASON =
  "Attending my cousin's wedding in Thiruvananthapuram, followed by the traditional post-wedding family " +
  "ceremonies over the weekend. Travel involves an overnight train each way, so I will be unreachable on " +
  "the travel days. My pending code reviews are reassigned to Karthik and the release checklist is updated " +
  "in the team tracker. Contactable by phone for anything urgent.";

const SHORT_REASONS = [
  "Doctor's appointment",
  "Child's school annual day",
  "Family function at home",
  "Personal errand",
  "Fever and doctor-advised rest",
  "Dental treatment",
  "Moving to a new flat",
  "Sister's engagement ceremony",
  "Festival with family in my home town",
  "Vehicle registration at the RTO",
  "Parent-teacher meeting",
  "Migraine",
  "Attending a friend's wedding",
  "Home renovation work",
  "Passport appointment",
];

const LONG_REASONS = [
  SEED_LONG_REASON,
  "My father is scheduled for a planned knee replacement surgery at the district hospital and I need to " +
    "accompany him for admission, the procedure itself and the first days of recovery until my brother " +
    "arrives from Pune. I have shared a handover note with the team covering open tickets, the on-call " +
    "rota swap agreed with Meera, and the status of the quarterly report. I will check email once a day " +
    "in the evening in case anything cannot wait until I am back.",
  "Relocating my family to the new apartment near the office: the movers come on the first day, the " +
    "electricity and internet connections are being transferred on the second, and the children's school " +
    "transfer certificates have to be collected in person from the old school. I tried to fit all of this " +
    "into a weekend but the housing society only allows moves on weekdays. Stand-up notes and the sprint " +
    "board are up to date, and my deployments this week have been rescheduled.",
];

const LONG_REMARKS = [
  "Approved. Please make sure the handover document covers the vendor escalations that are still open, and " +
    "brief the backup owner before you leave. If the dates move, cancel this request and submit a new one so " +
    "that the team calendar stays accurate. Take care, and let us know if you need anything else.",
  "We cannot approve these dates: the annual audit fieldwork runs in this period and the finance team has " +
    "already reached its limit for concurrent leave. Please choose dates after the audit closes; I will " +
    "prioritise the review so that you can still book travel in time. Sorry for the inconvenience.",
];

const SHORT_REJECT_REMARKS = [
  "Team capacity is limited in this period. Please choose other dates.",
  "Overlaps with the release freeze. Please apply for the following week.",
  "Too many team members are already on leave on these dates.",
];

const SHORT_APPROVE_REMARKS = ["", "", "Approved.", "Enjoy your time off.", "Get well soon."];

const INSUFFICIENT_BALANCE_REMARK = "Insufficient balance at the time of review.";

export type HandwrittenRequest = {
  employee: number;
  leave_type: LeaveTypeCode;
  /** "+7wd" / "-20wd": working days relative to today. */
  start: string;
  days: number;
  status: RequestStatus;
  reason: string;
  review_remarks?: string;
};

export const SEED_REQUESTS_HANDWRITTEN: HandwrittenRequest[] = [
  { employee: 1002, leave_type: "CASUAL", start: "+7wd", days: 3, status: "PENDING", reason: SEED_LONG_REASON },
  { employee: 1004, leave_type: "SICK", start: "-20wd", days: 2, status: "APPROVED", reason: "Fever and doctor-advised rest.", review_remarks: "Get well soon. No medical certificate needed for two days." },
  { employee: 1003, leave_type: "CASUAL", start: "+15wd", days: 5, status: "REJECTED", reason: "Family vacation.", review_remarks: "Quarter-end payroll closing falls in this week and two other HR team members are already on approved leave. Please choose dates after the 15th; happy to approve those promptly." },
  { employee: 1007, leave_type: "CASUAL", start: "+3wd", days: 1, status: "CANCELLED", reason: "Bank appointment (rescheduled)." },
  { employee: 1009, leave_type: "CASUAL", start: "+2wd", days: 1, status: "PENDING", reason: "Personal errand." },
  // 1009 current year: Casual 3 with 2 approved + 1 pending → available 0.
  { employee: 1009, leave_type: "CASUAL", start: "-15wd", days: 2, status: "APPROVED", reason: "Sister's engagement ceremony." },
  { employee: 1011, leave_type: "SICK", start: "-60wd", days: 3, status: "APPROVED", reason: "Surgery recovery.", review_remarks: "" },
];

export type SeedData = {
  employees: Employee[];
  allowances: Map<string, AllowanceRecord>;
  requests: LeaveRequest[];
};

/** Shifts the date part of an Asia/Kolkata datetime by whole days. */
function shiftDateTime(value: ISODateTime, days: number): ISODateTime {
  return `${addDays(value.slice(0, 10), days)}${value.slice(10)}`;
}

function minDateTime(a: ISODateTime, b: ISODateTime): ISODateTime {
  // Same "+05:30" format everywhere, so text comparison is chronological.
  return a < b ? a : b;
}

function relativeStart(today: ISODate, spec: string): ISODate {
  const match = /^([+-])(\d+)wd$/.exec(spec);
  if (!match) throw new Error(`Bad relative date: ${spec}`);
  const n = Number(match[2]);
  return addWorkingDays(today, match[1] === "+" ? n : -n);
}

/** End of a range of `days` working days that never crosses 31 December. */
function rangeEnd(start: ISODate, days: number): ISODate {
  let length = days;
  let end = addWorkingDays(start, length - 1);
  while (length > 1 && yearOf(end) !== yearOf(start)) {
    length--;
    end = addWorkingDays(start, length - 1);
  }
  return end;
}

export function toEmployee(
  base: Omit<Employee, "created_at" | "updated_at" | "full_name">,
  createdAt: ISODateTime,
): Employee {
  const fullName = `${base.first_name} ${base.last_name}`.trim() || base.username;
  return { ...base, full_name: fullName, created_at: createdAt, updated_at: createdAt };
}

export function employeeRef(employee: Employee): LeaveRequest["employee"] {
  return {
    id: employee.id,
    full_name: employee.full_name,
    email: employee.email,
    department: employee.department,
    is_active: employee.is_active,
  };
}

/** Allowances for the previous and current year (Casual 12, Sick 10 unless overridden). */
export function addDefaultAllowances(
  allowances: Map<string, AllowanceRecord>,
  employeeId: number,
  year: number,
  overrides: Partial<Record<number, Partial<Record<LeaveTypeCode, number>>>> = {},
): void {
  for (const y of [year - 1, year]) {
    for (const code of LEAVE_TYPE_CODES) {
      const days = overrides[y]?.[code] ?? DEFAULT_ALLOWANCE[code];
      allowances.set(allowanceKey(employeeId, y, code), {
        employee_id: employeeId,
        year: y,
        leave_type: code,
        days,
        updated_at: appZoneDateTime(`${y}-01-02`, 10),
      });
    }
  }
}

type GeneratorContext = {
  today: ISODate;
  now: ISODateTime;
  allowances: Map<string, AllowanceRecord>;
  /** All requests so far (ids are assigned later). */
  requests: LeaveRequest[];
  /** Counter for rotating reasons and long remarks. */
  counter: { value: number };
};

type Draft = {
  employee: Employee;
  leave_type: LeaveTypeCode;
  start: ISODate;
  end: ISODate;
  status: RequestStatus;
  reason: string;
  review_remarks?: string;
};

function buildRequest(ctx: GeneratorContext, rng: Rng, draft: Draft): LeaveRequest {
  const createdDay = addDays(draft.start, -randInt(rng, 3, 20));
  let createdAt = appZoneDateTime(createdDay, randInt(rng, 9, 17), randInt(rng, 0, 59));
  createdAt = minDateTime(createdAt, ctx.now);
  const decidedAt = minDateTime(shiftDateTime(createdAt, randInt(rng, 1, 2)), ctx.now);
  const decided = draft.status === "APPROVED" || draft.status === "REJECTED";
  const cancelled = draft.status === "CANCELLED";
  return {
    id: 0,
    employee: employeeRef(draft.employee),
    leave_type: draft.leave_type,
    start_date: draft.start,
    end_date: draft.end,
    working_days: workingDaysBetween(draft.start, draft.end),
    reason: draft.reason,
    status: draft.status,
    created_at: createdAt,
    updated_at: decided || cancelled ? decidedAt : createdAt,
    reviewed_by: decided ? SEED_REVIEWER : null,
    reviewed_at: decided ? decidedAt : null,
    review_remarks: decided ? (draft.review_remarks ?? "") : "",
    cancelled_at: cancelled ? decidedAt : null,
  };
}

/**
 * Non-overlapping requests for one employee from 1 January of the previous
 * year to today + 90 days. `dense` is used for the signed-in employee (about
 * 26 requests, so their history has two pages).
 */
export function generateRequestsFor(
  ctx: GeneratorContext,
  employee: Employee,
  rng: Rng,
  dense: boolean,
): void {
  const year = yearOf(ctx.today);
  const limit = addDays(ctx.today, 90);
  let cursor = nextWorkingDay(`${year - 1}-01-01`);
  while (true) {
    const currentYear = yearOf(cursor) >= year;
    const gap = dense
      ? currentYear ? randInt(rng, 8, 20) : randInt(rng, 16, 36)
      : currentYear ? randInt(rng, 20, 46) : randInt(rng, 55, 110);
    const start = addWorkingDays(cursor, Math.max(3, gap));
    if (start > limit) break;
    const end = rangeEnd(start, randInt(rng, 1, dense ? 3 : 5));
    cursor = end;
    // Keep generated ranges clear of every other request of this employee.
    if (ctx.requests.some((r) => r.employee.id === employee.id && r.start_date <= end && r.end_date >= start)) {
      continue;
    }

    const rangeYear = yearOf(start);
    const types = LEAVE_TYPE_CODES.filter(
      (code) => (ctx.allowances.get(allowanceKey(employee.id, rangeYear, code))?.days ?? 0) > 0,
    );
    const leaveType: LeaveTypeCode =
      types.length === 2 ? weighted(rng, { CASUAL: 65, SICK: 35 }) : (types[0] ?? "CASUAL");

    let status: RequestStatus;
    if (start > ctx.today) {
      status = weighted(rng, { PENDING: 50, APPROVED: 30, REJECTED: 10, CANCELLED: 10 });
    } else {
      status = weighted(rng, { APPROVED: 70, REJECTED: 15, CANCELLED: 15 });
    }

    const index = ctx.counter.value++;
    const reasons = [...SHORT_REASONS, ...LONG_REASONS];
    const reason = reasons[index % reasons.length];
    let remarks: string | undefined;
    if (status === "APPROVED") remarks = pick(rng, SHORT_APPROVE_REMARKS);
    if (status === "REJECTED") remarks = pick(rng, SHORT_REJECT_REMARKS);
    if ((status === "APPROVED" || status === "REJECTED") && index % 7 === 6) {
      remarks = LONG_REMARKS[status === "APPROVED" ? 0 : 1];
    }

    // Keep the invariant available >= 0: otherwise the request was rejected.
    const days = workingDaysBetween(start, end);
    if (status === "PENDING" || status === "APPROVED") {
      const balance = computeBalance(employee.id, rangeYear, leaveType, ctx.allowances, ctx.requests);
      if (balance.available < days) {
        status = "REJECTED";
        remarks = INSUFFICIENT_BALANCE_REMARK;
      }
    }

    ctx.requests.push(
      buildRequest(ctx, rng, {
        employee,
        leave_type: leaveType,
        start,
        end,
        status,
        reason,
        review_remarks: remarks,
      }),
    );
  }
}

/** Gives ids in creation order (older requests get smaller ids). */
export function assignIds(requests: LeaveRequest[], firstId: number): number {
  let next = firstId;
  const ordered = requests
    .filter((request) => request.id === 0)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
  for (const request of ordered) request.id = next++;
  return next;
}

export function createGeneratorContext(
  today: ISODate,
  now: ISODateTime,
  allowances: Map<string, AllowanceRecord>,
  requests: LeaveRequest[],
): GeneratorContext {
  return { today, now, allowances, requests, counter: { value: 0 } };
}

/** The whole seed: 12 employees, their allowances and ~100 requests. */
export function buildSeed(today: ISODate, now: ISODateTime): SeedData & { nextRequestId: number } {
  const year = yearOf(today);
  const employeeCreatedAt = appZoneDateTime(`${year - 1}-01-02`, 10);
  const employees = SEED_EMPLOYEES.map((base) => toEmployee(base, employeeCreatedAt));
  const byId = new Map(employees.map((employee) => [employee.id, employee]));

  const allowances = new Map<string, AllowanceRecord>();
  for (const employee of employees) {
    const overrides: Partial<Record<number, Partial<Record<LeaveTypeCode, number>>>> = {};
    if (employee.id === 1005) {
      overrides[year - 1] = { CASUAL: 8 };
      overrides[year] = { CASUAL: 8 };
    }
    if (employee.id === 1006) {
      overrides[year - 1] = { SICK: 0 };
      overrides[year] = { SICK: 0 };
    }
    if (employee.id === 1009) overrides[year] = { CASUAL: 3 };
    addDefaultAllowances(allowances, employee.id, year, overrides);
  }

  const requests: LeaveRequest[] = [];
  const ctx = createGeneratorContext(today, now, allowances, requests);
  const rng = mulberry32(SEED_PRNG_SEED);

  for (const item of SEED_REQUESTS_HANDWRITTEN) {
    const employee = byId.get(item.employee);
    if (!employee) continue;
    const start = relativeStart(today, item.start);
    requests.push(
      buildRequest(ctx, rng, {
        employee,
        leave_type: item.leave_type,
        start,
        end: rangeEnd(start, item.days),
        status: item.status,
        reason: item.reason,
        review_remarks: item.review_remarks,
      }),
    );
  }

  for (const employee of employees) {
    if (employee.is_active) generateRequestsFor(ctx, employee, rng, false);
  }

  const nextRequestId = assignIds(requests, 101);
  return { employees, allowances, requests, nextRequestId };
}
