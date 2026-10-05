import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPage } from "@/components/layout/auth-page";
import { Loader } from "@/components/ui/loader";
import LoginForm from "./login-form";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <AuthPage
      title="Sign in"
      description={
        <span className={styles.note}>
          Please use the account your administrator gave you. There is no self-registration.
        </span>
      }
    >
      <Suspense fallback={<Loader label="Loading…" />}>
        <LoginForm />
      </Suspense>
    </AuthPage>
  );
}
