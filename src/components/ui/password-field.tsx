"use client";

import { useId, useState } from "react";
import { FormField, fieldStyles } from "./form-field";
import { IconButton } from "./icon-button";
import type { TextFieldProps } from "./text-field";
import styles from "./password-field.module.css";

export type PasswordFieldProps = Omit<TextFieldProps, "type">;

/** Label + password <input> with a show/hide button + hint + error. */
export function PasswordField({
  id,
  label,
  hint,
  error,
  required,
  showOptional,
  fieldClassName,
  className,
  disabled,
  "aria-describedby": describedBy,
  ...props
}: PasswordFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [visible, setVisible] = useState(false);
  return (
    <FormField
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      showOptional={showOptional}
      describedBy={describedBy}
      className={fieldClassName}
    >
      {(a11y) => (
        <div className={styles.wrap}>
          <input
            {...props}
            {...a11y}
            type={visible ? "text" : "password"}
            required={required}
            disabled={disabled}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={[fieldStyles.control, styles.input, className].filter(Boolean).join(" ")}
          />
          <IconButton
            icon={visible ? "eye-off" : "eye"}
            label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            aria-controls={fieldId}
            disabled={disabled}
            className={styles.toggle}
            onClick={() => setVisible((current) => !current)}
          />
        </div>
      )}
    </FormField>
  );
}
