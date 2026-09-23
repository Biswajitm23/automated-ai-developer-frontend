"use client";

import Link from "next/link";
import styles from "@/app/auth.module.css";
import { useAuth } from "./auth-provider";

export default function HomeAuthLink() {
  const auth = useAuth();

  if (auth.status === "loading") {
    return (
      <p className={styles.status} role="status">
        Checking your session…
      </p>
    );
  }

  if (auth.status === "authenticated") {
    return (
      <Link href="/dashboard" className={styles.primaryButton} data-testid="home-auth-link">
        Go to dashboard
      </Link>
    );
  }

  return (
    <Link href="/login" className={styles.primaryButton} data-testid="home-auth-link">
      Sign in
    </Link>
  );
}
