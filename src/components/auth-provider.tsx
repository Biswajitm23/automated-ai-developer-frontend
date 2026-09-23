"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiError, NETWORK_ERROR_MESSAGE, setUnauthorizedHandler } from "@/lib/api";
import { fetchMe, loginRequest, logoutRequest, type User } from "@/lib/auth";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

/** Why the user is signed out: a deliberate logout, or anything else (expiry, deactivation…). */
export type SignedOutReason = "logout" | "session";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated"; user: null; reason: SignedOutReason }
  | { status: "error"; user: null; message: string };

export type AuthContextValue = AuthState & {
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const SIGNED_OUT: AuthState = { status: "unauthenticated", user: null, reason: "session" };

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });
  const requestId = useRef(0);

  // Number of foreground (non-silent) session checks in flight. Background
  // checks are skipped while one runs, so they can never supersede it.
  const foregroundChecks = useRef(0);
  // Start time of the last background check, used to debounce focus events.
  const lastSilentCheck = useRef(0);

  /**
   * Asks the backend who is signed in. With `silent`, the current state is kept
   * while checking (used for background checks on focus). A silent check that
   * fails without a 401 only reports the error when no user state is known yet
   * (status loading/error); otherwise it leaves the state alone.
   *
   * Every check is stamped with `requestId`; a check whose id is no longer
   * current (superseded by a later check, a login, a logout or a 401 elsewhere)
   * is ignored when it settles.
   */
  const check = useCallback(async (silent: boolean) => {
    if (silent) {
      // Skip while a foreground check runs, and debounce: returning to a tab
      // fires both "focus" and "visibilitychange".
      const now = Date.now();
      if (foregroundChecks.current > 0 || now - lastSilentCheck.current < 1000) return;
      lastSilentCheck.current = now;
    }
    const id = ++requestId.current;
    if (!silent) {
      foregroundChecks.current++;
      setState({ status: "loading", user: null });
    }
    try {
      const user = await fetchMe();
      if (id === requestId.current) setState({ status: "authenticated", user });
    } catch (error) {
      if (id !== requestId.current) return;
      if (error instanceof ApiError && error.isUnauthorized) {
        setState((current) => (current.status === "unauthenticated" ? current : SIGNED_OUT));
        return;
      }
      const message =
        error instanceof ApiError && !error.isNetworkError
          ? `Could not check your session (error ${error.status}).`
          : NETWORK_ERROR_MESSAGE;
      setState((current) =>
        !silent || current.status === "loading" || current.status === "error"
          ? { status: "error", user: null, message }
          : current,
      );
    } finally {
      if (!silent) foregroundChecks.current--;
    }
  }, []);

  const refresh = useCallback(() => check(false), [check]);

  useEffect(() => {
    // Any 401 from any other API call means the session is gone. (Session
    // checks opt out and handle their own 401 under the requestId guard.)
    setUnauthorizedHandler(() => {
      requestId.current++;
      setState((current) => (current.status === "unauthenticated" ? current : SIGNED_OUT));
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    // Initial session check on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check(false);

    // Re-check when the user comes back to the tab, so a logout in another tab
    // or a deactivated account is noticed without a reload.
    const onFocus = () => void check(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void check(true);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [check]);

  const login = useCallback(async (username: string, password: string) => {
    const user = await loginRequest(username, password);
    requestId.current++;
    setState({ status: "authenticated", user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch (error) {
      // 401 means there is no session any more: finish signing out locally.
      // Anything else (403 CSRF failure, network error, 5xx) is a failure the
      // caller reports; the user stays signed in.
      if (!(error instanceof ApiError && error.isUnauthorized)) throw error;
    }
    requestId.current++;
    setState({ status: "unauthenticated", user: null, reason: "logout" });
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    // Once the login page is reached after an explicit logout, later visits to
    // protected pages should come back via /login?next=… as usual.
    if (pathname !== "/login") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((current) =>
      current.status === "unauthenticated" && current.reason === "logout" ? SIGNED_OUT : current,
    );
  }, [pathname]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout, refresh }),
    [state, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
