"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import {
  CHECK_FIELDS_MESSAGE,
  NOT_AVAILABLE_ACTION_MESSAGE,
  NotAvailableError,
  firstFieldErrors,
  submitErrorMessage,
} from "@/lib/services/errors";
import styles from "./employee-form.module.css";

export type EmployeeFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  username: string;
  password: string;
};

const FIELD_ORDER = ["first_name", "last_name", "email", "department", "username", "password"] as const;
type FieldName = (typeof FIELD_ORDER)[number];
type FieldErrors = Partial<Record<FieldName, string>>;

/** Limits from the Django User model and §9 assumption 3 (department ≤ 100). */
const MAX_LENGTH: Record<FieldName, number> = {
  first_name: 150,
  last_name: 150,
  email: 254,
  department: 100,
  username: 150,
  password: 128,
};
export const PASSWORD_MIN_LENGTH = 8;

const LABELS: Record<FieldName, string> = {
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  department: "Department",
  username: "Username",
  password: "Initial password",
};

function isFieldName(value: string): value is FieldName {
  return (FIELD_ORDER as readonly string[]).includes(value);
}

/** Client checks only; Django validates again (unique email, password validators). */
function validate(values: EmployeeFormValues, mode: "create" | "edit"): FieldErrors {
  const errors: FieldErrors = {};
  const first = values.first_name.trim();
  const email = values.email.trim();
  const department = values.department.trim();
  const username = values.username.trim();

  if (!first) errors.first_name = "Enter the employee's first name.";
  if (!email) errors.email = "Enter an email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address, like name@example.com.";
  if (!department) errors.department = "Enter a department.";

  if (mode === "create") {
    if (!username) errors.username = "Enter a username.";
    else if (!/^[\w.@+-]+$/.test(username)) {
      errors.username = "Use only letters, numbers and @ . + - _ (no spaces).";
    }
    if (!values.password) errors.password = "Enter an initial password.";
    else if (values.password.length < PASSWORD_MIN_LENGTH) {
      errors.password = `The password must contain at least ${PASSWORD_MIN_LENGTH} characters.`;
    } else if (/^\d+$/.test(values.password)) {
      errors.password = "The password can't be entirely numeric.";
    }
  }

  for (const field of FIELD_ORDER) {
    const value = field === "password" ? values.password : values[field].trim();
    if (!errors[field] && value.length > MAX_LENGTH[field]) {
      errors[field] = `${LABELS[field]} must be ${MAX_LENGTH[field]} characters or fewer.`;
    }
  }
  return errors;
}

export type EmployeeFormProps = {
  mode: "create" | "edit";
  initial?: Partial<EmployeeFormValues>;
  /** Existing departments, offered through a <datalist> (free text is allowed). */
  departments?: string[];
  submitLabel: string;
  submittingLabel: string;
  cancelHref: string;
  /**
   * Sends the trimmed values (the password is only present in create mode).
   * Throw the service error on failure; the form maps it to fields.
   */
  onSubmit: (values: EmployeeFormValues) => Promise<void>;
  /** Keep the submitting state after success (the parent navigates away). */
  stayBusyOnSuccess?: boolean;
  testId?: string;
};

/**
 * Create or edit an employee (ELM-003). In edit mode username and password
 * are not shown: the API treats them as read-only there. The password is
 * write-only: autocomplete="new-password", never echoed back, and cleared
 * after any failed submit.
 */
export function EmployeeForm({
  mode,
  initial,
  departments = [],
  submitLabel,
  submittingLabel,
  cancelHref,
  onSubmit,
  stayBusyOnSuccess = false,
  testId = "employee-form",
}: EmployeeFormProps) {
  const idPrefix = useId();
  const fieldId = (field: FieldName) => `${idPrefix}-${field}`;
  const alertId = `${idPrefix}-alert`;
  const datalistId = `${idPrefix}-departments`;

  const [values, setValues] = useState<EmployeeFormValues>({
    first_name: initial?.first_name ?? "",
    last_name: initial?.last_name ?? "",
    email: initial?.email ?? "",
    department: initial?.department ?? "",
    username: "",
    password: "",
  });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [focusRequest, setFocusRequest] = useState<{ target: string; seq: number } | null>(null);

  useEffect(() => {
    if (focusRequest) document.getElementById(focusRequest.target)?.focus();
  }, [focusRequest]);

  function requestFocus(target: string) {
    setFocusRequest((current) => ({ target, seq: (current?.seq ?? 0) + 1 }));
  }

  const clientErrors = validate(values, mode);
  const errorFor = (field: FieldName): string | undefined =>
    serverErrors[field] ?? (submitAttempted || touched[field] ? clientErrors[field] : undefined);

  function change(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
    setFormError(null);
  }

  function blur(field: FieldName) {
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return; // double click / double Enter
    setSubmitAttempted(true);

    const firstInvalid = FIELD_ORDER.find((field) => clientErrors[field]);
    if (firstInvalid) {
      setFormError(CHECK_FIELDS_MESSAGE);
      requestFocus(fieldId(firstInvalid));
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    setServerErrors({});
    try {
      await onSubmit({
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        email: values.email.trim(),
        department: values.department.trim(),
        username: values.username.trim(),
        password: values.password,
      });
      // Success: the parent navigates away or remounts the form with new values.
      if (!stayBusyOnSuccess) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    } catch (error) {
      submittingRef.current = false;
      setSubmitting(false);
      // Never keep a password around after a failed attempt.
      setValues((current) => (current.password ? { ...current, password: "" } : current));
      if (error instanceof NotAvailableError) {
        setFormError(NOT_AVAILABLE_ACTION_MESSAGE);
        requestFocus(alertId);
        return;
      }
      const known: FieldErrors = {};
      const other: string[] = [];
      for (const [field, message] of Object.entries(firstFieldErrors(error))) {
        if (isFieldName(field) && (mode === "create" || (field !== "username" && field !== "password"))) {
          known[field] = message;
        } else {
          other.push(message);
        }
      }
      setServerErrors(known);
      const summary = submitErrorMessage(error);
      const hasKnown = Object.keys(known).length > 0;
      setFormError(
        [summary === CHECK_FIELDS_MESSAGE && !hasKnown ? null : summary, ...other].filter(Boolean).join(" ") ||
          summary,
      );
      const firstServer = FIELD_ORDER.find((field) => known[field]);
      requestFocus(firstServer ? fieldId(firstServer) : alertId);
    }
  }

  const uniqueDepartments = Array.from(new Set(departments.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" }),
  );

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={handleSubmit}
      aria-busy={submitting || undefined}
      aria-label={mode === "create" ? "Add employee" : "Edit employee details"}
      data-testid={testId}
    >
      {formError && (
        <Alert variant="error" id={alertId} tabIndex={-1} data-testid="employee-form-error">
          {formError}
        </Alert>
      )}

      <fieldset className={styles.fieldset} disabled={submitting}>
        <legend className={styles.legend}>Personal details</legend>
        <div className={styles.row}>
          <TextField
            id={fieldId("first_name")}
            label={LABELS.first_name}
            required
            autoComplete="off"
            value={values.first_name}
            error={errorFor("first_name")}
            onChange={(event) => change("first_name", event.target.value)}
            onBlur={() => blur("first_name")}
            data-testid="employee-first-name"
          />
          <TextField
            id={fieldId("last_name")}
            label={LABELS.last_name}
            showOptional
            autoComplete="off"
            value={values.last_name}
            error={errorFor("last_name")}
            onChange={(event) => change("last_name", event.target.value)}
            onBlur={() => blur("last_name")}
            data-testid="employee-last-name"
          />
        </div>
        <TextField
          id={fieldId("email")}
          label={LABELS.email}
          type="email"
          required
          autoComplete="off"
          spellCheck={false}
          hint="Must be unique. Used to identify the employee."
          value={values.email}
          error={errorFor("email")}
          onChange={(event) => change("email", event.target.value)}
          onBlur={() => blur("email")}
          data-testid="employee-email"
        />
        <TextField
          id={fieldId("department")}
          label={LABELS.department}
          required
          autoComplete="off"
          list={uniqueDepartments.length > 0 ? datalistId : undefined}
          hint="Choose an existing department or type a new one."
          value={values.department}
          error={errorFor("department")}
          onChange={(event) => change("department", event.target.value)}
          onBlur={() => blur("department")}
          data-testid="employee-department"
        />
        {uniqueDepartments.length > 0 && (
          <datalist id={datalistId}>
            {uniqueDepartments.map((department) => (
              <option key={department} value={department} />
            ))}
          </datalist>
        )}
      </fieldset>

      {mode === "create" && (
        <fieldset className={styles.fieldset} disabled={submitting}>
          <legend className={styles.legend}>Sign-in account</legend>
          <p className={styles.note}>
            The account gets the Employee role. Give the employee their username and initial password in person;
            the password is not shown again.
          </p>
          <TextField
            id={fieldId("username")}
            label={LABELS.username}
            required
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            hint="Letters, numbers and @ . + - _ only."
            value={values.username}
            error={errorFor("username")}
            onChange={(event) => change("username", event.target.value)}
            onBlur={() => blur("username")}
            data-testid="employee-username"
          />
          <TextField
            id={fieldId("password")}
            label={LABELS.password}
            type="password"
            required
            autoComplete="new-password"
            hint={`At least ${PASSWORD_MIN_LENGTH} characters, not only numbers, and not similar to the username.`}
            value={values.password}
            error={errorFor("password")}
            onChange={(event) => change("password", event.target.value)}
            onBlur={() => blur("password")}
            data-testid="employee-password"
          />
        </fieldset>
      )}

      <div className={styles.actions}>
        <Button type="submit" loading={submitting} loadingText={submittingLabel} data-testid="employee-form-submit">
          {submitLabel}
        </Button>
        <ButtonLink href={cancelHref} variant="ghost">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
