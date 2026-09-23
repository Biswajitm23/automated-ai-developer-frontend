"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { Role } from "@/lib/auth";
import styles from "@/app/auth.module.css";
import { useAuth } from "./auth-provider";

export function AccessDenied() {
  return (
    <section className={styles.panel} role="alert" data-testid="access-denied">
      <h2>Access denied</h2>
      <p>You do not have permission to view this page.</p>
      <Link href="/dashboard" className={styles.linkButton}>
        Back to dashboard
      </Link>
    </section>
  );
}

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
      <main className={styles.page}>
        <p className={styles.status} role="status">
          Checking your session…
        </p>
      </main>
    );
  }

  if (auth.status === "error") {
    return (
      <main className={styles.page}>
        <section className={styles.panel} role="alert">
          <h2>Could not check your session</h2>
          <p>{auth.message}</p>
          <button type="button" className={styles.button} onClick={() => void auth.refresh()}>
            Try again
          </button>
        </section>
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
