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
  /** Disables the button, sets aria-busy and shows a spinner with `loadingText`. */
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
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={buttonClassName({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
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
