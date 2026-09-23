import { apiFetch } from "./api";

export type Role = "EMPLOYEE" | "ADMIN";

export type User = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
};

export const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: "Employee",
  ADMIN: "Administrator",
};

export const DEFAULT_AFTER_LOGIN = "/dashboard";

export function displayName(user: User): string {
  const fullName = `${user.first_name} ${user.last_name}`.trim();
  return fullName || user.username;
}

export function fetchMe(signal?: AbortSignal): Promise<User> {
  // The AuthProvider handles 401 itself, guarded against stale responses.
  return apiFetch<User>("/api/auth/me/", { signal, skipUnauthorizedHandler: true });
}

export async function loginRequest(username: string, password: string): Promise<User> {
  const data = await apiFetch<{ user: User }>("/api/auth/login/", {
    method: "POST",
    body: { username, password },
  });
  return data.user;
}

export async function logoutRequest(): Promise<void> {
  // logout() in the AuthProvider handles a 401 itself (reason "logout").
  await apiFetch<null>("/api/auth/logout/", { method: "POST", skipUnauthorizedHandler: true });
}

/**
 * Returns a same-origin path to go to after signing in. Anything that is not a
 * plain absolute path (external URLs, protocol-relative `//host`, `/\host`,
 * `javascript:` and similar) falls back to the dashboard.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return DEFAULT_AFTER_LOGIN;
  }
  // Reject control characters and backslashes that browsers may normalise into "//".
  for (const char of raw) {
    const code = char.charCodeAt(0);
    if (code < 0x20 || code === 0x7f || char === "\\") return DEFAULT_AFTER_LOGIN;
  }
  try {
    const base = "http://same-origin.invalid";
    const url = new URL(raw, base);
    if (url.origin !== base) return DEFAULT_AFTER_LOGIN;
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (url.pathname === "/login" || url.pathname.startsWith("/login/")) {
      return DEFAULT_AFTER_LOGIN;
    }
    return path;
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
}
