"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { ApiError, NETWORK_ERROR_MESSAGE } from "@/lib/api";
import { safeNextPath } from "@/lib/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import styles from "./login.module.css";

type FieldName = "username" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;

function validate(username: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!username.trim()) errors.username = "Enter your username.";
  if (!password) errors.password = "Enter your password.";
  return errors;
}

function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Try again.";
  if (error.isNetworkError) return NETWORK_ERROR_MESSAGE;
  if (error.status === 400) return error.detail ?? "Check the highlighted fields.";
  if (error.status === 429) return "Too many attempts. Wait a minute and try again.";
  if (error.status === 403) {
    return "Your sign-in request was rejected for security reasons. Reload the page and try again.";
  }
  return `Sign-in failed (error ${error.status}). Try again.`;
}

export default function LoginForm() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const authenticated = auth.status === "authenticated";

  useEffect(() => {
    // Signed in (already, or just now): leave the login page.
    if (authenticated) router.replace(nextPath);
  }, [authenticated, nextPath, router]);

  function focusFirstInvalid(errors: FieldErrors) {
    if (errors.username) usernameRef.current?.focus();
    else if (errors.password) passwordRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const errors = validate(username, password);
    setFieldErrors(errors);
    setFormError(null);
    if (errors.username || errors.password) {
      focusFirstInvalid(errors);
      return;
    }

    setPending(true);
    try {
      await auth.login(username.trim(), password);
      // Navigation happens in the effect above; keep the button disabled until then.
    } catch (error) {
      const serverFieldErrors: FieldErrors = {};
      if (error instanceof ApiError) {
        if (error.fieldErrors.username) serverFieldErrors.username = error.fieldErrors.username[0];
        if (error.fieldErrors.password) serverFieldErrors.password = error.fieldErrors.password[0];
      }
      setFieldErrors(serverFieldErrors);
      setFormError(messageFor(error));
      setPassword("");
      setPending(false);
      if (serverFieldErrors.username || serverFieldErrors.password) {
        focusFirstInvalid(serverFieldErrors);
      } else {
        passwordRef.current?.focus();
      }
    }
  }

  if (auth.status === "loading") {
    return (
      <p className={styles.status} role="status">
        Checking your session…
      </p>
    );
  }

  if (authenticated && !pending) {
    return (
      <p className={styles.status} role="status">
        You are already signed in. Redirecting…
      </p>
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      aria-busy={pending}
      data-testid="login-form"
    >
      <div className={styles.alertRegion} aria-live="assertive" aria-atomic="true">
        {formError && (
          <Alert variant="error" data-testid="login-error">
            {formError}
          </Alert>
        )}
      </div>

      <TextField
        ref={usernameRef}
        id="username"
        name="username"
        label="Username"
        type="text"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        error={fieldErrors.username}
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />

      <TextField
        ref={passwordRef}
        id="password"
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        error={fieldErrors.password}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <Button type="submit" fullWidth loading={pending} loadingText="Signing in…">
        Sign in
      </Button>
    </form>
  );
}
