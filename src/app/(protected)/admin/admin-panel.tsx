"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AccessDenied } from "@/components/require-auth";
import { ApiError, NETWORK_ERROR_MESSAGE, apiFetch } from "@/lib/api";
import styles from "../../auth.module.css";

type PingResponse = { status: "ok"; role: "ADMIN" };

type PingState =
  | { kind: "loading" }
  | { kind: "confirmed" }
  | { kind: "forbidden" }
  | { kind: "signed-out" }
  | { kind: "error"; message: string };

export default function AdminPanel() {
  const [state, setState] = useState<PingState>({ kind: "loading" });

  const controllerRef = useRef<AbortController | null>(null);

  const ping = useCallback(async () => {
    // Cancel any earlier request (e.g. "Try again" while one is pending).
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ kind: "loading" });
    try {
      const data = await apiFetch<PingResponse>("/api/admin/ping/", {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setState(
        data?.status === "ok"
          ? { kind: "confirmed" }
          : { kind: "error", message: "The server gave an unexpected answer." },
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.isForbidden) {
        setState({ kind: "forbidden" });
      } else if (error instanceof ApiError && error.isUnauthorized) {
        // The AuthProvider has been told; the guard redirects to the login page.
        setState({ kind: "signed-out" });
      } else {
        setState({
          kind: "error",
          message:
            error instanceof ApiError && !error.isNetworkError
              ? `Could not confirm administrator access (error ${error.status}).`
              : NETWORK_ERROR_MESSAGE,
        });
      }
    }
  }, []);

  useEffect(() => {
    // Ask the server on mount; the UI role check alone is not authoritative.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void ping();
    return () => controllerRef.current?.abort();
  }, [ping]);

  if (state.kind === "forbidden") return <AccessDenied />;

  return (
    <>
      <h1>Admin</h1>
      <section className={styles.panel} aria-live="polite" aria-labelledby="admin-access-heading">
        <h2 id="admin-access-heading">Administrator access</h2>
        {state.kind === "loading" && (
          <p className={styles.muted} data-testid="admin-ping-status">
            Checking administrator access with the server…
          </p>
        )}
        {state.kind === "confirmed" && (
          <p className={styles.ok} data-testid="admin-ping-status">
            Administrator access confirmed by the server.
          </p>
        )}
        {state.kind === "signed-out" && (
          <p className={styles.muted} data-testid="admin-ping-status">
            Your session has ended. Redirecting to sign in…
          </p>
        )}
        {state.kind === "error" && (
          <>
            <p className={styles.alert} role="alert" data-testid="admin-ping-status">
              {state.message}
            </p>
            <button type="button" className={styles.button} onClick={() => void ping()}>
              Try again
            </button>
          </>
        )}
        {state.kind === "confirmed" && (
          <p className={styles.muted}>
            Employee and leave management tools will be added here in later releases.
          </p>
        )}
      </section>
    </>
  );
}
