import Link from "next/link";
import { useId, type HTMLAttributes, type ReactNode } from "react";
import type { StatusTone } from "./status-badge";
import styles from "./card.module.css";

export type CardProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title?: string;
  headingLevel?: 2 | 3;
  /** Buttons or links next to the title. */
  actions?: ReactNode;
  padding?: "md" | "lg";
  children?: ReactNode;
};

/**
 * White surface with a border. With a title it renders
 * <section aria-labelledby> and an h2 (or h3).
 */
export function Card({
  title,
  headingLevel = 2,
  actions,
  padding = "md",
  className,
  children,
  ...props
}: CardProps) {
  const headingId = useId();
  const classes = [styles.card, padding === "lg" ? styles.paddingLg : null, className]
    .filter(Boolean)
    .join(" ");
  if (!title) {
    return (
      <div {...props} className={classes}>
        {children}
      </div>
    );
  }
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section {...props} className={classes} aria-labelledby={headingId}>
      <div className={styles.header}>
        <Heading id={headingId} className={styles.title}>
          {title}
        </Heading>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export type StatCardProps = {
  label: string;
  value: number | string;
  unit?: string;
  /** Makes the whole card one link named "{label}: {value}". */
  href?: string;
  /** Only adds a left accent bar; the label carries the meaning. */
  tone?: StatusTone | "neutral";
  description?: string;
  testId?: string;
};

/** Large tabular number with a label above it. */
export function StatCard({
  label,
  value,
  unit,
  href,
  tone = "neutral",
  description,
  testId,
}: StatCardProps) {
  const content = (
    <>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>
        {value}
        {unit && <span className={styles.statUnit}> {unit}</span>}
      </span>
      {description && <span className={styles.statDescription}>{description}</span>}
    </>
  );
  const classes = [styles.card, styles.stat, tone !== "neutral" ? styles[`tone-${tone}`] : null]
    .filter(Boolean)
    .join(" ");
  if (href) {
    return (
      <Link
        href={href}
        className={`${classes} ${styles.statLink}`}
        aria-label={`${label}: ${value}${unit ? ` ${unit}` : ""}`}
        data-testid={testId}
      >
        {content}
      </Link>
    );
  }
  return (
    <div className={classes} data-testid={testId}>
      {content}
    </div>
  );
}

export type DescriptionListProps = {
  items: { term: string; description: ReactNode }[];
  columns?: 1 | 2;
  className?: string;
};

/** <dl> grid of term/description pairs; stacks below 480 px. */
export function DescriptionList({ items, columns = 1, className }: DescriptionListProps) {
  return (
    <dl
      className={[styles.dl, columns === 2 ? styles.dlTwo : null, className]
        .filter(Boolean)
        .join(" ")}
    >
      {items.map((item) => (
        <div key={item.term} className={styles.dlRow}>
          <dt>{item.term}</dt>
          <dd>{item.description}</dd>
        </div>
      ))}
    </dl>
  );
}
