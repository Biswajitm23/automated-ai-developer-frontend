import type { Metadata } from "next";
import { Suspense } from "react";
import styles from "../auth.module.css";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className={styles.centered}>
      <div className={styles.loginCard}>
        <h1>Sign in</h1>
        <p className={styles.muted}>
          Use the account your administrator gave you. There is no self-registration.
        </p>
        <Suspense
          fallback={
            <p className={styles.status} role="status">
              Loading sign-in form…
            </p>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
