"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError, NETWORK_ERROR_MESSAGE } from "@/lib/api";
import { ROLE_LABELS, displayName } from "@/lib/auth";
import { initials } from "@/lib/format";
import styles from "./app-shell.module.css";

/**
 * Always-visible account block (sidebar footer on desktop, inside the menu
 * drawer on mobile): who is signed in, their role, and Log out. The logout
 * behaviour and messages are unchanged from the ELM-002 SiteHeader.
 */
export function AccountMenu() {
  const auth = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.status !== "authenticated") return null;
  const { user } = auth;
  const name = displayName(user);

  async function handleLogout() {
    setPending(true);
    setError(null);
    try {
      await auth.logout();
    } catch (err) {
      if (err instanceof ApiError && err.isForbidden) {
        setError("Could not sign out. Reload the page and try again.");
      } else if (err instanceof ApiError && !err.isNetworkError) {
        setError(`Could not sign out (error ${err.status}). Try again.`);
      } else {
        setError(NETWORK_ERROR_MESSAGE);
      }
      setPending(false);
    }
  }

  return (
    <section className={styles.account} aria-label="Account">
      <div className={styles.accountUser}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(name)}
        </span>
        <div className={styles.accountText}>
          <span className={styles.accountName} data-testid="header-user">
            {name}
          </span>
          {name !== user.username && <span className={styles.accountMeta}>{user.username}</span>}
          {user.email && <span className={styles.accountMeta}>{user.email}</span>}
          <span className={styles.roleBadge} data-testid="header-role">
            {ROLE_LABELS[user.role]}
          </span>
        </div>
      </div>
      <div aria-live="assertive">
        {error && (
          <Alert variant="error" data-testid="logout-error">
            {error}
          </Alert>
        )}
      </div>
      <Button
        variant="secondary"
        iconStart="log-out"
        fullWidth
        onClick={() => void handleLogout()}
        loading={pending}
        loadingText="Signing out…"
        data-testid="logout-button"
      >
        Log out
      </Button>
    </section>
  );
}
