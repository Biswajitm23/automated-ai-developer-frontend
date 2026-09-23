import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandLogo } from "@/components/layout/brand-logo";
import LoginForm from "./login-form";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <BrandLogo product="Employee Leave Management" />
        </div>
        <section className={styles.card} aria-labelledby="login-title">
          <div className={styles.intro}>
            <h1 id="login-title" className={styles.title}>
              Sign in
            </h1>
            <p className={styles.muted}>
              Use the account your administrator gave you. There is no self-registration.
            </p>
          </div>
          <Suspense
            fallback={
              <p className={styles.status} role="status">
                Loading sign-in form…
              </p>
            }
          >
            <LoginForm />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
