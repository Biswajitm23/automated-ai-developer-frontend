"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NotAvailableError, isAbortError } from "./services/errors";

export type AsyncState<T> =
  | { status: "loading"; data: T | null } // keeps previous data while reloading (no flicker)
  | { status: "success"; data: T }
  | { status: "error"; data: T | null; error: unknown }
  | { status: "not-available"; data: null; feature: string; card: string };

export type AsyncResult<T> = AsyncState<T> & {
  /** Runs the loader again with the same dependencies ("Try again"). */
  reload: () => void;
};

/**
 * Runs `fn` on mount and whenever `deps` change. Aborts the previous call on a
 * dependency change or unmount and ignores stale results. NotAvailableError
 * becomes status "not-available". A 401 is already handled globally by
 * apiFetch/AuthProvider; views turn a 403 into AccessDenied (see LoadError).
 *
 * `fn` may change on every render; only `deps` trigger a new call.
 */
export function useAsync<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading", data: null });
  const [reloadToken, setReloadToken] = useState(0);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    const controller = new AbortController();
    // Keep the previous data while loading so tables do not flicker.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((current) => ({
      status: "loading",
      data: current.status === "not-available" ? null : current.data,
    }));
    fnRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: "success", data });
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        if (error instanceof NotAvailableError) {
          setState({ status: "not-available", data: null, feature: error.feature, card: error.card });
          return;
        }
        setState((current) => ({
          status: "error",
          data: current.status === "not-available" ? null : current.data,
          error,
        }));
      },
    );
    return () => controller.abort();
    // The caller's deps decide when to reload; fn is read through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { ...state, reload };
}
