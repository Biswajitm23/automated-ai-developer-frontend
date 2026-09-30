"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { NotAvailableError, isForbidden, loadErrorMessage } from "@/lib/services/errors";
import { AccessDenied } from "./access-denied";
import { NotAvailableState } from "./not-available-state";

type LoadErrorProps = {
  error: unknown;
  onRetry: () => void;
  /** Noun phrase for the message, e.g. "your leave requests". */
  what: string;
};

/**
 * A failed load: NotAvailableError → NotAvailableState, 403 → AccessDenied,
 * anything else → an error Alert with the mapped message and "Try again".
 * (A 404 for a single record should be handled by the view with NotFoundPanel.)
 */
export function LoadError({ error, onRetry, what }: LoadErrorProps) {
  if (error instanceof NotAvailableError) {
    return <NotAvailableState feature={error.feature} card={error.card} />;
  }
  if (isForbidden(error)) return <AccessDenied />;
  return (
    <Alert
      variant="error"
      data-testid="load-error"
      data-status={error instanceof ApiError ? error.status : undefined}
      action={
        <Button variant="secondary" iconStart="refresh" onClick={onRetry}>
          Try again
        </Button>
      }
    >
      {loadErrorMessage(error, what)}
    </Alert>
  );
}
