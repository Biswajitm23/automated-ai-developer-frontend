"use client";

import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { FormField, fieldStyles as styles } from "./form-field";

export type TextareaProps = Omit<ComponentPropsWithRef<"textarea">, "id"> & {
  id?: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  /** Show "123 / 500" under the field (needs maxLength). */
  showCount?: boolean;
  showOptional?: boolean;
  fieldClassName?: string;
};

/** Characters left at which the counter is announced to screen readers. */
const ANNOUNCE_THRESHOLD = 50;

/** Label + native <textarea> (4 rows, grows with content) + optional counter. */
export function Textarea({
  id,
  label,
  hint,
  error,
  required,
  showOptional,
  showCount = false,
  maxLength,
  rows = 4,
  value,
  fieldClassName,
  className,
  "aria-describedby": describedBy,
  ...props
}: TextareaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const counterId = `${fieldId}-count`;
  const length = typeof value === "string" ? value.length : 0;
  const withCounter = showCount && typeof maxLength === "number";
  const remaining = withCounter ? maxLength - length : null;
  return (
    <FormField
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      showOptional={showOptional}
      describedBy={[describedBy, withCounter ? counterId : null].filter(Boolean).join(" ") || undefined}
      className={fieldClassName}
    >
      {(a11y) => (
        <>
          <textarea
            {...props}
            {...a11y}
            rows={rows}
            value={value}
            maxLength={maxLength}
            required={required}
            className={[styles.control, styles.textarea, className].filter(Boolean).join(" ")}
          />
          {withCounter && (
            <>
              <p
                id={counterId}
                className={[
                  styles.counter,
                  remaining !== null && remaining <= ANNOUNCE_THRESHOLD ? styles.counterWarn : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {length} / {maxLength}
              </p>
              <span className="visually-hidden" aria-live="polite">
                {remaining !== null && remaining <= ANNOUNCE_THRESHOLD
                  ? `${remaining} characters left`
                  : ""}
              </span>
            </>
          )}
        </>
      )}
    </FormField>
  );
}
