"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ApiError, NETWORK_ERROR_MESSAGE } from "@/lib/api";
import { ROLE_LABELS, displayName } from "@/lib/auth";
import styles from "@/app/auth.module.css";
import { useAuth } from "./auth-provider";

export default function SiteHeader() {
  const auth = useAuth();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.status !== "authenticated") return null;
  const { user } = auth;

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

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    ...(user.role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/dashboard" className={styles.brand}>
          Employee Leave Management
        </Link>
        <nav aria-label="Main" className={styles.nav}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={styles.navLink}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className={styles.account}>
          <span className={styles.userName} data-testid="header-user">
            {displayName(user)}
          </span>
          <span className={styles.badge} data-testid="header-role">
            {ROLE_LABELS[user.role]}
          </span>
          <button
            type="button"
            className={styles.button}
            onClick={() => void handleLogout()}
            disabled={pending}
            data-testid="logout-button"
          >
            {pending ? "Signing out…" : "Log out"}
          </button>
        </div>
      </div>
      <div aria-live="assertive">
        {error && (
          <p className={`${styles.alert} ${styles.headerAlert}`} role="alert">
            {error}
          </p>
        )}
      </div>
    </header>
  );
}
