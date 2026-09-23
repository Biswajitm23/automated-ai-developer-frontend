"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AccessDenied } from "@/components/states/access-denied";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ApiError, NETWORK_ERROR_MESSAGE } from "@/lib/api";
import { pingAdmin } from "@/lib/services/admin-access";

type PingState =
  | { kind: "loading" }
  | { kind: "confirmed" }
  | { kind: "forbidden" }
  | { kind: "signed-out" }
  | { kind: "error"; message: string };

/**
 * Interim /admin content (Phase A restyle of the ELM-002 panel; same state
 * machine, texts and test ID). Phase C moves the check into
 * admin-access-check.tsx inside the admin dashboard.
 */
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
      const data = await pingAdmin(controller.signal);
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
      <PageHeader title="Admin" />
      <Card title="Administrator access" aria-live="polite">
        {state.kind === "loading" && (
          <Alert variant="info" live={false}>
            <span data-testid="admin-ping-status">Checking administrator access with the server…</span>
          </Alert>
        )}
        {state.kind === "confirmed" && (
          <Alert variant="success" live={false}>
            <span data-testid="admin-ping-status">Administrator access confirmed by the server.</span>
          </Alert>
        )}
        {state.kind === "signed-out" && (
          <Alert variant="info" live={false}>
            <span data-testid="admin-ping-status">Your session has ended. Redirecting to sign in…</span>
          </Alert>
        )}
        {state.kind === "error" && (
          <Alert
            variant="error"
            action={
              <Button variant="secondary" iconStart="refresh" onClick={() => void ping()}>
                Try again
              </Button>
            }
          >
            <span data-testid="admin-ping-status">{state.message}</span>
          </Alert>
        )}
        {state.kind === "confirmed" && (
          <p>Employee and leave management tools will be added here in later releases.</p>
        )}
      </Card>
    </>
  );
}
