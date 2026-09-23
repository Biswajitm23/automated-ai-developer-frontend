"use client";

import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { FormField, fieldStyles as styles } from "./form-field";
import { Icon } from "./icons";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = Omit<ComponentPropsWithRef<"select">, "id" | "children"> & {
  id?: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  options: SelectOption[];
  /** Shown as a disabled empty first option. */
  placeholder?: string;
  showOptional?: boolean;
  fieldClassName?: string;
};

/** Native <select> with a custom chevron. */
export function Select({
  id,
  label,
  hint,
  error,
  options,
  placeholder,
  required,
  showOptional,
  fieldClassName,
  className,
  "aria-describedby": describedBy,
  ...props
}: SelectProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
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
        <div className={styles.selectWrap}>
          <select
            {...props}
            {...a11y}
            required={required}
            className={[styles.control, styles.select, className].filter(Boolean).join(" ")}
          >
            {placeholder !== undefined && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" size={20} className={styles.chevron} />
        </div>
      )}
    </FormField>
  );
}
