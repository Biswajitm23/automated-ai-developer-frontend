"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AccessDenied } from "@/components/states/access-denied";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Role } from "@/lib/auth";
import { useAuth } from "./auth-provider";
import styles from "./require-auth.module.css";

// Kept here so existing imports (`@/components/require-auth`) keep working.
export { AccessDenied };

type RequireAuthProps = {
  children: ReactNode;
};

/**
 * Client-side guard for the protected area (used once, in the protected
 * layout). It decides what the UI shows; the Django API still enforces
 * authentication and roles on every request. Its own loading, error and
 * redirect states are rendered inside a <main> landmark.
 */
export default function RequireAuth({ children }: RequireAuthProps) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const signedOutReason = auth.status === "unauthenticated" ? auth.reason : null;

  useEffect(() => {
    if (signedOutReason === null) return;
    if (signedOutReason === "logout") {
      router.replace("/login");
      return;
    }
    const next = `${pathname}${window.location.search}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [signedOutReason, pathname, router]);

  if (auth.status === "loading") {
    return (
      <main className={styles.page} aria-busy="true">
        <p className={styles.status} role="status">
          Checking your session…
        </p>
        <div className={styles.skeleton} aria-hidden="true">
          <Skeleton variant="text" width="14rem" height="2rem" />
          <Skeleton variant="rect" height="8rem" />
        </div>
      </main>
    );
  }

  if (auth.status === "error") {
    return (
      <main className={styles.page}>
        <Alert
          variant="error"
          title="Could not check your session"
          action={
            <Button variant="secondary" iconStart="refresh" onClick={() => void auth.refresh()}>
              Try again
            </Button>
          }
        >
          {auth.message}
        </Alert>
      </main>
    );
  }

  if (auth.status === "unauthenticated") {
    return (
      <main className={styles.page}>
        <p className={styles.status} role="status">
          Redirecting to sign in…
        </p>
      </main>
    );
  }

  return <>{children}</>;
}

/**
 * Page-level role gate for use inside the protected layout, which already
 * handles loading, errors and signed-out redirects. Users without the role see
 * the access-denied panel and the children are never rendered.
 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const auth = useAuth();
  if (auth.status !== "authenticated") return null;
  if (auth.user.role !== role) return <AccessDenied />;
  return <>{children}</>;
}
