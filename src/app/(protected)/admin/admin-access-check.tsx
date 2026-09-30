"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AccessDenied } from "@/components/states/access-denied";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError, NETWORK_ERROR_MESSAGE } from "@/lib/api";
import { pingAdmin } from "@/lib/services/admin-access";

type PingState =
  | { kind: "loading" }
  | { kind: "confirmed" }
  | { kind: "forbidden" }
  | { kind: "signed-out" }
  | { kind: "error"; message: string };

const CHECK_FAILED_MESSAGE = "We couldn't confirm your administrator access. Please try again.";

/**
 * The ELM-002 server-side administrator check (GET /api/admin/ping/, always
 * the real API). The UI role check alone is not authoritative; the server
 * answers 403 for anyone who is not an admin, which shows Access denied.
 *
 * It runs silently: nothing is shown while checking or once confirmed, only a
 * plain message if the check fails (the owner asked for no technical status
 * messages, 2026-09-23).
 */
export function AdminAccessCheck() {
  const [state, setState] = useState<PingState>({ kind: "loading" });

  const controllerRef = useRef<AbortController | null>(null);

  const ping = useCallback(async () => {
    // Cancel any earlier request (e.g. "Try again" while one is pending).
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ kind: "loading" });
    try {
      const data = await pingAdmin(controller.signal);
      if (controller.signal.aborted) return;
      setState(
        data?.status === "ok"
          ? { kind: "confirmed" }
          : { kind: "error", message: CHECK_FAILED_MESSAGE },
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
            error instanceof ApiError && !error.isNetworkError ? CHECK_FAILED_MESSAGE : NETWORK_ERROR_MESSAGE,
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
  if (state.kind !== "error") return null;

  return (
    <Alert
      variant="error"
      data-testid="admin-access-check"
      action={
        <Button variant="secondary" iconStart="refresh" onClick={() => void ping()}>
          Try again
        </Button>
      }
    >
      <span data-testid="admin-ping-status">{state.message}</span>
    </Alert>
  );
}
