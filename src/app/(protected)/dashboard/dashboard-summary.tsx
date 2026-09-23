"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { ROLE_LABELS, displayName } from "@/lib/auth";
import styles from "../../auth.module.css";

export default function DashboardSummary() {
  const auth = useAuth();
  // The protected layout only renders this page for signed-in users.
  if (auth.status !== "authenticated") return null;
  const { user } = auth;

  return (
    <>
      <h1>Welcome, {displayName(user)}</h1>
      <section className={styles.panel} aria-labelledby="account-heading">
        <h2 id="account-heading">Your account</h2>
        <dl className={styles.details}>
          <dt>Username</dt>
          <dd data-testid="current-user">{user.username}</dd>
          <dt>Role</dt>
          <dd>
            <span className={styles.badge} data-testid="current-role">
              {ROLE_LABELS[user.role]}
            </span>
          </dd>
          {user.email && (
            <>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </>
          )}
        </dl>
      </section>
      <p className={styles.muted}>
        Leave features will appear here in a later release.
        {user.role === "ADMIN" && (
          <>
            {" "}
            As an administrator you can also open the{" "}
            <Link href="/admin">admin area</Link>.
          </>
        )}
      </p>
    </>
  );
}
