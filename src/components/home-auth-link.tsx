"use client";

import styles from "@/app/page.module.css";
import { ButtonLink } from "@/components/ui/button";
import { useAuth } from "./auth-provider";

export default function HomeAuthLink() {
  const auth = useAuth();

  if (auth.status === "loading") {
    return (
      <p className={styles.muted} role="status">
        Checking your session…
      </p>
    );
  }

  if (auth.status === "authenticated") {
    return (
      <ButtonLink href="/dashboard" className={styles.homeLink} data-testid="home-auth-link">
        Go to dashboard
      </ButtonLink>
    );
  }

  return (
    <ButtonLink href="/login" className={styles.homeLink} data-testid="home-auth-link">
      Sign in
    </ButtonLink>
  );
}
