"use client";

import { useEffect, useId, useRef, useState, type ComponentPropsWithRef, type ReactNode } from "react";
import { FormField, fieldStyles as styles, joinIds } from "./form-field";
import { IconButton } from "./icon-button";
import { Icon } from "./icons";

export type TextFieldProps = Omit<ComponentPropsWithRef<"input">, "id"> & {
  id?: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  showOptional?: boolean;
  /** Class for the field wrapper (the input gets the shared control style). */
  fieldClassName?: string;
};

/** Label + native <input> + hint + error. */
export function TextField({
  id,
  label,
  hint,
  error,
  required,
  showOptional,
  fieldClassName,
  className,
  "aria-describedby": describedBy,
  ...props
}: TextFieldProps) {
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
        <input
          {...props}
          {...a11y}
          required={required}
          className={[styles.control, className].filter(Boolean).join(" ")}
        />
      )}
    </FormField>
  );
}

export type SearchFieldProps = Omit<TextFieldProps, "value" | "defaultValue" | "onChange" | "type"> & {
  /** The applied search value (usually from the URL). Local edits are debounced. */
  value: string;
  onSearch: (value: string) => void;
  debounceMs?: number;
};

/**
 * type="search" input with a search icon and a clear button. Typing is
 * debounced before `onSearch` runs; Enter applies at once.
 */
export function SearchField({
  id,
  label,
  hint,
  error,
  value,
  onSearch,
  debounceMs = 300,
  fieldClassName,
  className,
  onKeyDown,
  ...props
}: SearchFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [draft, setDraft] = useState(value);
  const [appliedValue, setAppliedValue] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchRef = useRef(onSearch);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  // The applied value changed from outside (Clear filters, Back button): follow it.
  if (value !== appliedValue) {
    setAppliedValue(value);
    setDraft(value);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function schedule(next: string, delay: number) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      if (next.trim() !== value.trim()) onSearchRef.current(next.trim());
    }, delay);
  }

  return (
    <FormField id={fieldId} label={label} hint={hint} error={error} className={fieldClassName}>
      {(a11y) => (
        <div className={styles.searchWrap}>
          <Icon name="search" size={20} className={styles.searchIcon} />
          <input
            {...props}
            {...a11y}
            aria-describedby={joinIds(a11y["aria-describedby"], props["aria-describedby"])}
            ref={inputRef}
            type="search"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              schedule(event.target.value, debounceMs);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                schedule(draft, 0);
              }
              onKeyDown?.(event);
            }}
            className={[styles.control, styles.search, className].filter(Boolean).join(" ")}
          />
          {draft && (
            <IconButton
              icon="close"
              label={`Clear ${label.toLowerCase()}`}
              className={styles.clear}
              onClick={() => {
                setDraft("");
                schedule("", 0);
                inputRef.current?.focus();
              }}
            />
          )}
        </div>
      )}
    </FormField>
  );
}
