/**
 * Small fetch wrapper for the Django API.
 *
 * - Always sends cookies (`credentials: "include"`) so the Django session works.
 * - Before every unsafe request (POST, PUT, PATCH, DELETE) it fetches a fresh
 *   CSRF token from `GET /api/auth/csrf/` and sends it as `X-CSRFToken`.
 *   The token is read from the JSON body; cookies are never read here.
 * - Turns error responses into `ApiError` and reports every 401 to the
 *   registered unauthorized handler (the AuthProvider), which treats it as
 *   "signed out". A 403 means "signed in, but not allowed".
 */

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

export const NETWORK_ERROR_MESSAGE =
  "Could not reach the server. Check your connection and that the backend is running, then try again.";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string | null;
  readonly fieldErrors: FieldErrors;

  constructor(status: number, detail: string | null, fieldErrors: FieldErrors = {}) {
    super(detail ?? `Request failed with status ${status}.`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
  }

  /** The server could not be reached at all. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }

  /** Not signed in, or the session ended (logout, expiry, deactivated account). */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** Signed in, but not allowed (wrong role, or a CSRF failure). */
  get isForbidden(): boolean {
    return this.status === 403;
  }
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Register the single app-wide handler called whenever the API answers 401. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export type ApiFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /**
   * Do not report a 401 to the global unauthorized handler. Used by the session
   * check, which handles its own 401 and must not act on stale responses.
   */
  skipUnauthorizedHandler?: boolean;
};

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function toApiError(status: number, body: unknown): ApiError {
  let detail: string | null = null;
  const fieldErrors: FieldErrors = {};
  if (body && typeof body === "object" && !Array.isArray(body)) {
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (key === "detail" && typeof value === "string") {
        detail = value;
      } else if (Array.isArray(value)) {
        const messages = value.filter((item): item is string => typeof item === "string");
        if (key === "non_field_errors") {
          detail = detail ?? messages.join(" ");
        } else if (messages.length > 0) {
          fieldErrors[key] = messages;
        }
      }
    }
  }
  return new ApiError(status, detail, fieldErrors);
}

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  }
}

async function fetchCsrfToken(signal?: AbortSignal): Promise<string> {
  const response = await rawFetch("/api/auth/csrf/", {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  const body = await parseBody(response);
  if (!response.ok) throw toApiError(response.status, body);
  const token =
    body && typeof body === "object" ? (body as { csrfToken?: unknown }).csrfToken : undefined;
  if (typeof token !== "string" || token === "") {
    throw new ApiError(response.status, "The server did not return a security token.");
  }
  return token;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (!SAFE_METHODS.has(method)) {
    headers["X-CSRFToken"] = await fetchCsrfToken(options.signal);
  }

  const response = await rawFetch(path, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });
  const body = await parseBody(response);

  if (!response.ok) {
    if (response.status === 401 && !options.skipUnauthorizedHandler) unauthorizedHandler?.();
    throw toApiError(response.status, body);
  }
  return body as T;
}
