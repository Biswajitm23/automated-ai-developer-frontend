"use client";

import { useEffect } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";

/**
 * Error boundary for the protected area. Renders inside the AppShell. In this
 * Next.js version the recovery prop is `retry` (re-fetch and re-render).
 */
export default function ProtectedError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Alert
      variant="error"
      title="Something went wrong"
      data-testid="page-error"
      action={
        <>
          <Button variant="secondary" iconStart="refresh" onClick={() => retry()}>
            Try again
          </Button>
          <ButtonLink href="/dashboard" variant="ghost">
            Go to dashboard
          </ButtonLink>
        </>
      }
    >
      This page could not be displayed. Try again, or go back to the dashboard.
      {error.digest && <> (Reference: {error.digest})</>}
    </Alert>
  );
}
