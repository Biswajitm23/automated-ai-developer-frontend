"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { ApiError, NETWORK_ERROR_MESSAGE } from "@/lib/api";
import { displayName, safeNextPath } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader } from "@/components/ui/loader";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
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
  if (!(error instanceof ApiError)) return "Something went wrong. Please try again.";
  if (error.isNetworkError) return NETWORK_ERROR_MESSAGE;
  if (error.status === 400) return error.detail ?? "Check the highlighted fields.";
  if (error.status === 429) return "Too many attempts. Wait a minute and try again.";
  if (error.status === 403) {
    return "Your sign-in request was rejected for security reasons. Reload the page and try again.";
  }
  return "Sign-in failed. Please try again.";
}

export default function LoginForm() {
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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
    if (errors.username || errors.password) {
      focusFirstInvalid(errors);
      return;
    }

    setPending(true);
    try {
      const user = await auth.login(username.trim(), password, rememberMe);
      toast({ variant: "success", message: `Welcome back, ${displayName(user)}!` });
      // Navigation happens in the effect above; keep the button disabled until then.
    } catch (error) {
      const serverFieldErrors: FieldErrors = {};
      if (error instanceof ApiError) {
        if (error.fieldErrors.username) serverFieldErrors.username = error.fieldErrors.username[0];
        if (error.fieldErrors.password) serverFieldErrors.password = error.fieldErrors.password[0];
      }
      setFieldErrors(serverFieldErrors);
      toast({ variant: "error", message: messageFor(error) });
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
    return <Loader label="Checking your session…" />;
  }

  if (authenticated && !pending) {
    return <Loader label="Signing you in…" />;
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      aria-busy={pending}
      data-testid="login-form"
    >
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

      <PasswordField
        ref={passwordRef}
        id="password"
        name="password"
        label="Password"
        autoComplete="current-password"
        required
        error={fieldErrors.password}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <div className={styles.options}>
        <Checkbox
          id="remember-me"
          name="remember_me"
          label="Remember me"
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
          data-testid="remember-me"
        />
        <Link href="/forgot-password" className={styles.link} data-testid="forgot-password-link">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" fullWidth loading={pending} loadingText="Signing in…">
        Sign in
      </Button>
    </form>
  );
}
