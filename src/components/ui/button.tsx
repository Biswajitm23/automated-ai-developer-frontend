import Link from "next/link";
import type { ComponentProps, ComponentPropsWithRef, ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import styles from "./button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

export function buttonClassName({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}): string {
  return [
    styles.button,
    styles[variant],
    size === "sm" ? styles.sm : null,
    fullWidth ? styles.fullWidth : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Blocks activation, sets aria-busy and aria-disabled and shows a spinner
   * with `loadingText`. The button stays focusable while loading (it is not
   * natively disabled), so keyboard focus is not lost to <body> during a
   * request or after a failed one.
   */
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  iconStart?: IconName;
};

export function Button({
  variant,
  size,
  loading = false,
  loadingText,
  fullWidth,
  iconStart,
  className,
  type = "button",
  disabled,
  onClick,
  children,
  ...props
}: ButtonProps) {
  // While loading, activation is blocked with a click guard instead of native
  // `disabled`: this stops double clicks and a second implicit form submit
  // (Enter in a field clicks the default button), but keeps focus here.
  const blocked = loading && !disabled;
  return (
    <button
      {...props}
      type={type}
      className={buttonClassName({ variant, size, fullWidth, className })}
      disabled={disabled}
      aria-disabled={blocked || undefined}
      aria-busy={loading || undefined}
      onClick={(event) => {
        if (blocked) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      }}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        iconStart && <Icon name={iconStart} size={size === "sm" ? 16 : 20} />
      )}
      <span className={styles.label}>{loading && loadingText ? loadingText : children}</span>
    </button>
  );
}

export type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconStart?: IconName;
  children: ReactNode;
};

/** A next/link styled as a button, for navigation. */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  iconStart,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link {...props} className={buttonClassName({ variant, size, fullWidth, className })}>
      {iconStart && <Icon name={iconStart} size={size === "sm" ? 16 : 20} />}
      <span className={styles.label}>{children}</span>
    </Link>
  );
}
