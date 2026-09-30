/**
 * Request dispatcher for the dev-only mock: latency and scenarios, the real
 * signed-in user, role rules, and path matching. Handlers throw ApiError with
 * the same statuses and shapes as the proposed API (docs/ui-design.md §6).
 */

import { ApiError, apiFetch, type ApiFetchOptions } from "@/lib/api";
import type { Role, User } from "@/lib/auth";
import { createEmptyStore, ensureEmployeeForUser, getStore, type MockStore } from "./store";

type Method = NonNullable<ApiFetchOptions["method"]>;

export type MockContext = {
  method: Method;
  path: string;
  query: URLSearchParams;
  body: unknown;
  params: Record<string, string>;
  user: User;
  db: MockStore;
};

export type RouteDef = {
  method: Method;
  /** e.g. "/api/leave-requests/:id/cancel/" */
  path: string;
  /** Who may call it. "ANY" = any signed-in user. */
  role: Role | "ANY";
  handler: (ctx: MockContext) => unknown;
};

type CompiledRoute = RouteDef & { pattern: RegExp; keys: string[] };

export type MockScenario = "normal" | "empty" | "error" | "slow";
type MockSettings = { latencyMs?: number; scenario: MockScenario };

/** Reads `localStorage["elm-mock"]`, e.g. {"latencyMs":400,"scenario":"empty"}. */
function readSettings(): MockSettings {
  try {
    const raw = window.localStorage.getItem("elm-mock");
    if (!raw) return { scenario: "normal" };
    const parsed = JSON.parse(raw) as { latencyMs?: unknown; scenario?: unknown };
    const scenario = ["normal", "empty", "error", "slow"].includes(String(parsed.scenario))
      ? (parsed.scenario as MockScenario)
      : "normal";
    const latencyMs =
      typeof parsed.latencyMs === "number" && parsed.latencyMs >= 0 ? parsed.latencyMs : undefined;
    return { scenario, latencyMs };
  } catch {
    return { scenario: "normal" };
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

/**
 * The real signed-in user (GET /api/auth/me/), fetched on every dispatch.
 * Deliberately not cached: an SPA logout and login (or a role switch) must
 * never see the previous user's identity. Dev-only, so the extra request is
 * fine. A 401 goes through the normal unauthorized handler, so the app signs
 * out as usual.
 */
async function currentUser(signal?: AbortSignal): Promise<User> {
  return apiFetch<User>("/api/auth/me/", { signal });
}

function compile(routes: RouteDef[]): CompiledRoute[] {
  return routes.map((route) => {
    const keys: string[] = [];
    const source = route.path
      .split("/")
      .map((segment) => {
        if (segment.startsWith(":")) {
          keys.push(segment.slice(1));
          return "([^/]+)";
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");
    return { ...route, pattern: new RegExp(`^${source}$`), keys };
  });
}

export function createRouter(routes: RouteDef[]) {
  const compiled = compile(routes);

  return async function dispatch<T>(fullPath: string, options: ApiFetchOptions = {}): Promise<T> {
    const method: Method = options.method ?? "GET";
    const settings = readSettings();
    const latency =
      settings.scenario === "slow"
        ? 3000
        : (settings.latencyMs ?? 250 + Math.floor(Math.random() * 350));
    await delay(latency, options.signal);

    const url = new URL(fullPath, "http://mock.invalid");
    const path = url.pathname;

    let matched: { route: CompiledRoute; params: Record<string, string> } | null = null;
    let pathMatched = false;
    for (const route of compiled) {
      const match = route.pattern.exec(path);
      if (!match) continue;
      pathMatched = true;
      if (route.method !== method) continue;
      const params: Record<string, string> = {};
      route.keys.forEach((key, index) => {
        params[key] = decodeURIComponent(match[index + 1]);
      });
      matched = { route, params };
      break;
    }
    if (!matched) {
      if (pathMatched) throw new ApiError(405, `Method "${method}" not allowed.`);
      // Like an unrouted Django URL: 404 without a JSON detail.
      throw new ApiError(404, null);
    }

    const user = await currentUser(options.signal);
    const { route } = matched;
    if (route.role === "ADMIN" && user.role !== "ADMIN") {
      throw new ApiError(403, "Administrator role required.");
    }
    if (route.role === "EMPLOYEE" && user.role !== "EMPLOYEE") {
      throw new ApiError(403, "Employee role required.");
    }

    if (settings.scenario === "error" && method === "GET") {
      throw new ApiError(500, 'Mock server error (scenario "error").');
    }

    const db = settings.scenario === "empty" ? createEmptyStore() : getStore();
    if (user.role === "EMPLOYEE") ensureEmployeeForUser(db, user);

    const result = route.handler({
      method,
      path,
      query: url.searchParams,
      body: options.body ?? null,
      params: matched.params,
      user,
      db,
    });
    // Callers get a copy, never a live reference into the store.
    return (result === undefined ? null : structuredClone(result)) as T;
  };
}

/** Numeric path id, or 404 "Not found.". */
export function parseId(raw: string | undefined): number {
  if (!raw || !/^[1-9]\d{0,9}$/.test(raw)) throw new ApiError(404, "Not found.");
  return Number(raw);
}

/** Year query value in 2000–2100, or 400 {"year": ["Enter a valid year."]}. */
export function parseYear(raw: string | null, fallback?: number): number {
  if (raw === null || raw === "") {
    if (fallback !== undefined) return fallback;
    throw new ApiError(400, null, { year: ["This field is required."] });
  }
  const year = /^\d{4}$/.test(raw) ? Number(raw) : NaN;
  if (!(year >= 2000 && year <= 2100)) throw new ApiError(400, null, { year: ["Enter a valid year."] });
  return year;
}

/** The request body as a plain object ({} otherwise). */
export function bodyObject(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}
