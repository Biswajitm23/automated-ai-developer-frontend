import type { HTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import styles from "./empty-state.module.css";

export type EmptyStateProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  icon?: IconName;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  tone?: "neutral" | "info" | "danger";
  headingLevel?: 2 | 3;
};

/** Centred message in a card: no data, not found, access denied, not available. */
export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  tone = "neutral",
  headingLevel = 2,
  className,
  ...props
}: EmptyStateProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section {...props} className={[styles.empty, tone !== "neutral" ? styles[tone] : null, className].filter(Boolean).join(" ")}>
      <span className={styles.iconWrap}>
        <Icon name={icon} size={24} />
      </span>
      <Heading className={styles.title}>{title}</Heading>
      {description && <div className={styles.description}>{description}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </section>
  );
}
