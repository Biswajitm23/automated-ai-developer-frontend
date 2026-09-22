"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./page.module.css";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");
const HEALTH_URL = `${API_BASE_URL}/api/health/`;

type HealthResponse = {
  status: "ok" | "error";
  database: "ok" | "error";
};

type CheckState =
  | { kind: "loading" }
  | { kind: "connected"; data: HealthResponse }
  | { kind: "degraded"; data: HealthResponse }
  | { kind: "error"; message: string };

export default function BackendStatus() {
  const [state, setState] = useState<CheckState>({ kind: "loading" });

  const check = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const response = await fetch(HEALTH_URL, { cache: "no-store" });
      const data = (await response.json()) as HealthResponse;
      if (response.ok && data.status === "ok" && data.database === "ok") {
        setState({ kind: "connected", data });
      } else {
        setState({ kind: "degraded", data });
      }
    } catch {
      setState({
        kind: "error",
        message: `Could not reach the backend at ${HEALTH_URL}. Is the Django server running?`,
      });
    }
  }, []);

  useEffect(() => {
    // Initial check on mount; subsequent checks are triggered by the button.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check();
  }, [check]);

  return (
    <section className={styles.card} aria-live="polite">
      <h2>Backend connection</h2>
      {state.kind === "loading" && (
        <p className={styles.muted} data-testid="backend-status">
          Checking backend…
        </p>
      )}
      {state.kind === "connected" && (
        <p className={styles.ok} data-testid="backend-status">
          Connected — API and database are healthy.
        </p>
      )}
      {state.kind === "degraded" && (
        <p className={styles.error} data-testid="backend-status">
          Backend responded, but is unhealthy (API: {state.data.status},
          database: {state.data.database}).
        </p>
      )}
      {state.kind === "error" && (
        <p className={styles.error} data-testid="backend-status">
          {state.message}
        </p>
      )}
      <p className={styles.muted}>
        Endpoint: <code>{HEALTH_URL}</code>
      </p>
      <button
        type="button"
        className={styles.button}
        onClick={() => void check()}
        disabled={state.kind === "loading"}
      >
        Check again
      </button>
    </section>
  );
}
