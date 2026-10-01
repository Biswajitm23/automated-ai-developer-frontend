"use client";

import { useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ApiError, NETWORK_ERROR_MESSAGE } from "@/lib/api";
import { ROLE_LABELS, displayName } from "@/lib/auth";
import { initials } from "@/lib/format";
import styles from "./app-shell.module.css";

/**
 * Always-visible account block (sidebar footer on desktop, inside the menu
 * drawer on mobile): who is signed in, their role, and Log out. Log out asks
 * for confirmation first; a failure is shown inside the dialog, which stays open.
 * `compact` (collapsed sidebar) shows only the initials and a Log out icon.
 * `toggle` (the desktop sidebar's expand/collapse button) sits above the user.
 */
export function AccountMenu({ compact = false, toggle }: { compact?: boolean; toggle?: ReactNode }) {
  const auth = useAuth();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.status !== "authenticated") return null;
  const { user } = auth;
  const name = displayName(user);

  function closeConfirm() {
    if (pendingRef.current) return;
    setError(null);
    setConfirmOpen(false);
  }

  async function handleLogout() {
    if (pendingRef.current) return; // double click / double Enter
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      await auth.logout();
      toast({ variant: "success", message: "You have been signed out." });
    } catch (err) {
      if (err instanceof ApiError && err.isForbidden) {
        setError("Could not sign out. Reload the page and try again.");
      } else if (err instanceof ApiError && !err.isNetworkError) {
        setError("Could not sign out. Please try again.");
      } else {
        setError(NETWORK_ERROR_MESSAGE);
      }
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <section className={styles.account} aria-label="Account" data-compact={compact || undefined}>
      {toggle}
      <div className={styles.accountUser}>
        <span
          className={styles.avatar}
          aria-hidden="true"
          title={compact ? `${name} (${ROLE_LABELS[user.role]})` : undefined}
        >
          {initials(name)}
        </span>
        <div className={compact ? "visually-hidden" : styles.accountText}>
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
      {compact ? (
        <IconButton
          label="Log out"
          icon="log-out"
          title="Log out"
          onClick={() => setConfirmOpen(true)}
          data-testid="logout-button"
        />
      ) : (
        <Button
          variant="secondary"
          iconStart="log-out"
          fullWidth
          onClick={() => setConfirmOpen(true)}
          data-testid="logout-button"
        >
          Log out
        </Button>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onClose={closeConfirm}
        onConfirm={handleLogout}
        title="Log out"
        confirmLabel="Yes, log out"
        cancelLabel="Cancel"
        pendingLabel="Signing out…"
        tone="danger"
        pending={pending}
        error={error}
        testId="logout-dialog"
      >
        <p>Are you sure you want to logout?</p>
      </ConfirmDialog>
    </section>
  );
}
