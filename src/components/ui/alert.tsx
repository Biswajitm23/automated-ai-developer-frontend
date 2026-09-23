import type { HTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import styles from "./alert.module.css";

export type AlertVariant = "info" | "success" | "warning" | "error";

const ICONS: Record<AlertVariant, IconName> = {
  info: "info",
  success: "check-circle",
  warning: "alert-triangle",
  error: "alert-circle",
};

export type AlertProps = Omit<HTMLAttributes<HTMLDivElement>, "title" | "role"> & {
  variant: AlertVariant;
  title?: string;
  children?: ReactNode;
  /** Buttons or links shown under the text. */
  action?: ReactNode;
  /**
   * Live-region behaviour. `error` alerts always use role="alert" unless this is
   * `false`. Other variants use role="status" when `live` is set.
   */
  live?: "polite" | "assertive" | false;
};

/** Icon, title and text on a tinted background with a left border. */
export function Alert({
  variant,
  title,
  children,
  action,
  live,
  className,
  ...props
}: AlertProps) {
  let role: "alert" | "status" | undefined;
  if (variant === "error" && live !== false) role = "alert";
  else if (live) role = live === "assertive" ? "alert" : "status";

  return (
    <div
      {...props}
      role={role}
      className={[styles.alert, styles[variant], className].filter(Boolean).join(" ")}
    >
      <Icon name={ICONS[variant]} size={20} className={styles.icon} />
      <div className={styles.body}>
        {title && <p className={styles.title}>{title}</p>}
        {children && <div className={styles.text}>{children}</div>}
        {action && <div className={styles.action}>{action}</div>}
      </div>
    </div>
  );
}
