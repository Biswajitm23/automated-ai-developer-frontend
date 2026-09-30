"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { ErrorText } from "./form-field";
import styles from "./otp-input.module.css";

export type OtpInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Called when the last digit is entered. */
  onComplete?: (value: string) => void;
};

/**
 * One box per digit. Typing moves to the next box, Backspace to the previous
 * one, and pasting a whole code fills every box. The first box has
 * autocomplete="one-time-code" so phones can offer the code from the email.
 */
export function OtpInput({
  id,
  label,
  value,
  onChange,
  length = 6,
  error,
  disabled = false,
  autoFocus = false,
  onComplete,
}: OtpInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");
  const errorId = error ? `${id}-error` : undefined;

  function focusBox(index: number) {
    const target = inputs.current[Math.max(0, Math.min(length - 1, index))];
    target?.focus();
    target?.select();
  }

  function update(next: string, focusIndex: number) {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    focusBox(focusIndex);
    if (clean.length === length) onComplete?.(clean);
  }

  function handleInput(index: number, raw: string) {
    let typed = raw.replace(/\D/g, "");
    if (!typed) return;
    // Typing into a filled box whose text was not selected: keep only the new digit.
    if (typed.length === 2 && digits[index] && raw.includes(digits[index])) {
      typed = raw.startsWith(digits[index]) ? typed[1] : typed[0];
    }
    if (typed.length > 1) {
      // Autofill or a fast typist: treat it like a paste from this box on.
      update(value.slice(0, index) + typed, index + typed.length);
      return;
    }
    const chars = digits.slice();
    chars[index] = typed;
    update(chars.join("").slice(0, Math.max(index + 1, value.length)), index + 1);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index));
        focusBox(index - 1);
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(index + 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    event.preventDefault();
    update(pasted, pasted.length);
  }

  return (
    <fieldset className={styles.fieldset} aria-describedby={errorId}>
      <legend className={styles.legend}>
        {label}
        <span className={styles.required} aria-hidden="true">
          *
        </span>
      </legend>
      <div className={styles.boxes}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputs.current[index] = element;
            }}
            id={index === 0 ? id : `${id}-${index}`}
            className={styles.box}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={length}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={error ? true : undefined}
            aria-required={index === 0 ? true : undefined}
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            value={digit}
            data-filled={digit ? "true" : undefined}
            onChange={(event) => handleInput(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            onFocus={(event) => event.target.select()}
          />
        ))}
      </div>
      {error && errorId && <ErrorText id={errorId}>{error}</ErrorText>}
    </fieldset>
  );
}
