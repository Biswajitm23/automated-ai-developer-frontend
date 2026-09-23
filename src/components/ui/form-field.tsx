import type { ReactNode } from "react";
import { Icon } from "./icons";
import styles from "./form-field.module.css";

/** Attributes FormField hands to its control so label, hint and error are wired up. */
export type FieldA11yProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
};

export type FormFieldProps = {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  /** Show an "Optional" marker when the field is not required. */
  showOptional?: boolean;
  /** Extra ids to add to aria-describedby (e.g. a character counter). */
  describedBy?: string;
  className?: string;
  children: (a11y: FieldA11yProps) => ReactNode;
};

export function joinIds(...ids: (string | null | undefined | false)[]): string | undefined {
  const joined = ids.filter(Boolean).join(" ");
  return joined || undefined;
}

/**
 * Label + control + hint + error. The error starts with an icon and a visually
 * hidden "Error:" prefix. It is not a live region: the form-level Alert
 * announces errors.
 */
export function FormField({
  id,
  label,
  hint,
  error,
  required = false,
  showOptional = false,
  describedBy,
  className,
  children,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : null;
  const errorId = error ? `${id}-error` : null;
  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && <span className={styles.marker}> (required)</span>}
        {!required && showOptional && <span className={styles.marker}> Optional</span>}
      </label>
      {hint && (
        <p id={hintId ?? undefined} className={styles.hint}>
          {hint}
        </p>
      )}
      {children({
        id,
        "aria-describedby": joinIds(hintId, errorId, describedBy),
        "aria-invalid": error ? true : undefined,
        "aria-required": required ? true : undefined,
      })}
      {error && <ErrorText id={`${id}-error`}>{error}</ErrorText>}
    </div>
  );
}

export function ErrorText({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className={styles.error}>
      <Icon name="alert-circle" size={16} className={styles.errorIcon} />
      <span>
        <span className="visually-hidden">Error: </span>
        {children}
      </span>
    </p>
  );
}

export { styles as fieldStyles };
