"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AuthPage } from "@/components/layout/auth-page";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { OtpInput } from "@/components/ui/otp-input";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { ApiError, NETWORK_ERROR_MESSAGE } from "@/lib/api";
import {
  confirmPasswordReset,
  requestPasswordResetCode,
  verifyPasswordResetCode,
} from "@/lib/auth";
import styles from "./forgot-password.module.css";

type Step = "email" | "code" | "password";

const STEPS: { key: Step; label: string }[] = [
  { key: "email", label: "Your email" },
  { key: "code", label: "Enter code" },
  { key: "password", label: "New password" },
];

const CODE_LENGTH = 6;
/** Matches the server's wait between two codes for the same account. */
const RESEND_WAIT_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generalMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return NETWORK_ERROR_MESSAGE;
    if (error.status === 429) return "Too many attempts. Please wait a while and try again.";
    if (error.status === 403) {
      return "Your request was blocked for security reasons. Reload the page and try again.";
    }
  }
  return "Something went wrong. Please try again.";
}

function firstFieldError(error: unknown, field: string): string | null {
  return error instanceof ApiError && error.status === 400
    ? (error.fieldErrors[field]?.[0] ?? null)
    : null;
}

export default function ForgotPasswordFlow() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [pending, setPending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    if (step === "email") emailRef.current?.focus();
    if (step === "password") passwordRef.current?.focus();
  }, [step]);

  async function sendCode(): Promise<boolean> {
    setPending(true);
    try {
      await requestPasswordResetCode(email.trim());
      setResendIn(RESEND_WAIT_SECONDS);
      toast({
        variant: "success",
        message: "If this email belongs to an account, a 6-digit code is on its way.",
      });
      return true;
    } catch (error) {
      const fieldError = firstFieldError(error, "email");
      if (fieldError) setErrors({ email: fieldError });
      else toast({ variant: "error", message: generalMessage(error) });
      return false;
    } finally {
      setPending(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setErrors({ email: "Enter your email address." });
      emailRef.current?.focus();
      return;
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      setErrors({ email: "Enter a valid email address, like name@company.com." });
      emailRef.current?.focus();
      return;
    }
    setErrors({});
    if (await sendCode()) {
      setCode("");
      setStep("code");
    }
  }

  async function submitCode(value: string) {
    if (pending) return;
    if (value.length !== CODE_LENGTH) {
      setErrors({ code: "Enter all 6 digits of the code." });
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await verifyPasswordResetCode(email.trim(), value);
      setStep("password");
    } catch (error) {
      const fieldError = firstFieldError(error, "code");
      if (fieldError) {
        setErrors({ code: fieldError });
        setCode("");
        // The boxes are re-enabled on the next render; then put the cursor back in the first one.
        requestAnimationFrame(() => document.getElementById("code")?.focus());
      } else {
        toast({ variant: "error", message: generalMessage(error) });
      }
    } finally {
      setPending(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const nextErrors: Record<string, string> = {};
    if (!newPassword) nextErrors.new_password = "Enter a new password.";
    if (!confirmPassword) nextErrors.confirm_password = "Enter the new password again.";
    else if (newPassword && confirmPassword !== newPassword) {
      nextErrors.confirm_password = "The two passwords do not match.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    try {
      await confirmPasswordReset(email.trim(), code, newPassword);
      toast({
        variant: "success",
        message: "Your password has been updated. Sign in with your new password.",
        durationMs: 7000,
      });
      router.replace("/login");
    } catch (error) {
      const passwordError = firstFieldError(error, "new_password");
      const codeError = firstFieldError(error, "code");
      if (passwordError) {
        setErrors({ new_password: passwordError });
        passwordRef.current?.focus();
      } else if (codeError) {
        // The code expired or was replaced meanwhile: go back and ask for a new one.
        setCode("");
        setNewPassword("");
        setConfirmPassword("");
        setStep("code");
        setErrors({ code: codeError });
      } else {
        toast({ variant: "error", message: generalMessage(error) });
      }
      setPending(false);
    }
  }

  function startOver() {
    setStep("email");
    setCode("");
    setErrors({});
  }

  const currentIndex = STEPS.findIndex((item) => item.key === step);

  const description =
    step === "email"
      ? "Enter the email address on your account and we will send you a one-time code."
      : step === "code"
        ? "Check your inbox and enter the code below. It is valid for 10 minutes."
        : "Choose a new password for your account.";

  return (
    <AuthPage
      title="Reset your password"
      description={description}
      footer={
        <Link href="/login" className={styles.link} data-testid="back-to-login">
          Back to sign in
        </Link>
      }
    >
      <ol className={styles.steps} aria-label="Progress">
        {STEPS.map((item, index) => (
          <li
            key={item.key}
            className={[
              styles.step,
              index < currentIndex ? styles.stepDone : null,
              index === currentIndex ? styles.stepCurrent : null,
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={index === currentIndex ? "step" : undefined}
          >
            {item.label}
          </li>
        ))}
      </ol>

      {step === "email" && (
        <form
          className={styles.form}
          onSubmit={(event) => void handleEmailSubmit(event)}
          noValidate
          aria-busy={pending}
          data-testid="forgot-email-form"
        >
          <TextField
            ref={emailRef}
            id="email"
            name="email"
            label="Email address"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            error={errors.email}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" fullWidth loading={pending} loadingText="Sending code…">
            Send code
          </Button>
        </form>
      )}

      {step === "code" && (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void submitCode(code);
          }}
          noValidate
          aria-busy={pending}
          data-testid="forgot-code-form"
        >
          <p className={styles.sentTo}>
            <Icon name="mail" size={20} />
            <span>
              If an account uses <span className={styles.email}>{email.trim()}</span>, we have sent
              a 6-digit code to it. Remember to check your spam folder.
            </span>
          </p>
          <OtpInput
            id="code"
            label="6-digit code"
            value={code}
            onChange={(value) => {
              setCode(value);
              if (errors.code) setErrors({});
            }}
            onComplete={(value) => void submitCode(value)}
            error={errors.code}
            disabled={pending}
            autoFocus
          />
          <Button type="submit" fullWidth loading={pending} loadingText="Checking code…">
            Verify code
          </Button>
          <div className={styles.secondaryActions}>
            <Button variant="ghost" size="sm" onClick={startOver} disabled={pending}>
              Use a different email
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconStart="refresh"
              disabled={pending || resendIn > 0}
              onClick={() => {
                setCode("");
                setErrors({});
                void sendCode();
              }}
              data-testid="resend-code"
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </Button>
          </div>
        </form>
      )}

      {step === "password" && (
        <form
          className={styles.form}
          onSubmit={(event) => void handlePasswordSubmit(event)}
          noValidate
          aria-busy={pending}
          data-testid="forgot-password-form"
        >
          <PasswordField
            ref={passwordRef}
            id="new-password"
            name="new_password"
            label="New password"
            autoComplete="new-password"
            hint="At least 8 characters. Avoid common words and numbers only."
            required
            error={errors.new_password}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <PasswordField
            id="confirm-password"
            name="confirm_password"
            label="Confirm new password"
            autoComplete="new-password"
            required
            error={errors.confirm_password}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <Button type="submit" fullWidth iconStart="key" loading={pending} loadingText="Updating…">
            Update password
          </Button>
        </form>
      )}
    </AuthPage>
  );
}
