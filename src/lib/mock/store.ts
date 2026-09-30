/**
 * In-memory mock database, kept at module level: it survives client-side
 * navigation and resets on a full reload. Dev only.
 */

import { displayName, type User } from "@/lib/auth";
import { toAppZoneDateTime, todayInAppZone, yearOf } from "@/lib/dates";
import type { Employee, LeaveRequest } from "@/lib/services/types";
import { mulberry32 } from "./prng";
import { computeBalances, overlaps, type AllowanceRecord } from "./rules";
import {
  MOCK_SEED_SENTINEL_ELM,
  SEED_PRNG_SEED,
  addDefaultAllowances,
  assignIds,
  buildSeed,
  createGeneratorContext,
  generateRequestsFor,
  toEmployee,
} from "./seed";

export type MockStore = {
  employees: Employee[];
  allowances: Map<string, AllowanceRecord>;
  requests: LeaveRequest[];
  nextRequestId: number;
  nextEmployeeId: number;
  /** "userId:client_request_id" → request id (create idempotency). */
  idempotency: Map<string, number>;
  /** Real users already added as employees. */
  seededUsers: Set<number>;
  /** True for the throwaway store of the "empty" scenario. */
  empty: boolean;
};

let store: MockStore | null = null;

export function getStore(): MockStore {
  if (!store) {
    const seed = buildSeed(todayInAppZone(), toAppZoneDateTime());
    store = {
      employees: seed.employees,
      allowances: seed.allowances,
      requests: seed.requests,
      nextRequestId: seed.nextRequestId,
      nextEmployeeId: 2001,
      idempotency: new Map(),
      seededUsers: new Set(),
      empty: false,
    };
    checkInvariants(store);
    // Also keeps the sentinel in any bundle that contains the mock, so the
    // production-build grep for it is a meaningful check.
    console.info(
      `[mock] ${MOCK_SEED_SENTINEL_ELM}: ${store.employees.length} employees, ${store.requests.length} requests (in memory).`,
    );
  }
  return store;
}

/** A fresh store with no data, for the "empty" scenario. Changes to it are discarded. */
export function createEmptyStore(): MockStore {
  return {
    employees: [],
    allowances: new Map(),
    requests: [],
    nextRequestId: 1,
    nextEmployeeId: 1,
    idempotency: new Map(),
    seededUsers: new Set(),
    empty: true,
  };
}

export function findEmployee(db: MockStore, id: number): Employee | undefined {
  return db.employees.find((employee) => employee.id === id);
}

/**
 * On first use by a real employee, add them to the store with their real id,
 * names and email (department "Engineering"), default allowances for this and
 * last year, and about 26 generated requests.
 */
export function ensureEmployeeForUser(db: MockStore, user: User): Employee {
  const existing = findEmployee(db, user.id);
  if (db.empty || db.seededUsers.has(user.id)) {
    return existing ?? toEmployee(fromUser(user), toAppZoneDateTime());
  }
  db.seededUsers.add(user.id);
  const today = todayInAppZone();
  const now = toAppZoneDateTime();
  const employee = toEmployee(fromUser(user), `${yearOf(today) - 1}-01-02T10:00:00+05:30`);
  employee.full_name = displayName(user);
  if (existing) db.employees = db.employees.filter((item) => item.id !== user.id);
  db.employees.push(employee);
  addDefaultAllowances(db.allowances, employee.id, yearOf(today));
  const ctx = createGeneratorContext(today, now, db.allowances, db.requests);
  generateRequestsFor(ctx, employee, mulberry32(SEED_PRNG_SEED + user.id), true);
  db.nextRequestId = assignIds(db.requests, db.nextRequestId);
  checkInvariants(db);
  return employee;
}

function fromUser(user: User): Omit<Employee, "created_at" | "updated_at" | "full_name"> {
  return {
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    department: "Engineering",
    is_active: true,
  };
}

/** Dev check: no pending/approved overlap per employee, every balance ≥ 0. */
export function checkInvariants(db: MockStore): void {
  for (const request of db.requests) {
    if (request.status !== "PENDING" && request.status !== "APPROVED") continue;
    const clash = overlaps(request.employee.id, request.start_date, request.end_date, db.requests, request.id);
    console.assert(clash.length === 0, `[mock] request #${request.id} overlaps #${clash[0]?.id}`);
  }
  const years = new Set(db.requests.map((request) => yearOf(request.start_date)));
  for (const employee of db.employees) {
    for (const year of years) {
      for (const balance of computeBalances(employee.id, year, db.allowances, db.requests)) {
        console.assert(
          balance.available >= 0,
          `[mock] negative balance for employee ${employee.id} ${balance.leave_type} ${year}`,
        );
      }
    }
  }
}
