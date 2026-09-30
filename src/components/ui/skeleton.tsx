import type { CSSProperties, ReactNode } from "react";
import styles from "./skeleton.module.css";

type SkeletonProps = {
  variant?: "text" | "rect" | "circle";
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  /** Number of text lines (variant "text"); the last one is shorter. */
  lines?: number;
  className?: string;
};

/** Grey placeholder block. Always aria-hidden; the container announces loading. */
export function Skeleton({ variant = "text", width, height, lines = 1, className }: SkeletonProps) {
  if (variant === "text" && lines > 1) {
    return (
      <span className={[styles.lines, className].filter(Boolean).join(" ")} aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <span
            key={index}
            className={`${styles.block} ${styles.text}`}
            style={{ width: index === lines - 1 ? "60%" : width }}
          />
        ))}
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={[styles.block, styles[variant], className].filter(Boolean).join(" ")}
      style={{ width, height }}
    />
  );
}

/** Wraps skeletons: aria-busy plus one visually hidden status message. */
function Loading({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className} aria-busy="true">
      <span className="visually-hidden" role="status">
        {label}
      </span>
      {children}
    </div>
  );
}

type SkeletonLayoutProps = {
  rows?: number;
  columns?: number;
  /** Visually hidden status text. */
  label?: string;
};

/** Page title + a card of text; the default fallback for pages. */
export function PageSkeleton({ rows = 4, label = "Loading…" }: SkeletonLayoutProps) {
  return (
    <Loading label={label} className={styles.page}>
      <Skeleton variant="text" width="16rem" height="2rem" />
      <Skeleton variant="text" width="24rem" />
      <div className={styles.card}>
        <Skeleton variant="text" lines={rows} />
      </div>
    </Loading>
  );
}

/** Same footprint as ResponsiveTable. */
export function TableSkeleton({ rows = 5, columns = 4, label = "Loading…" }: SkeletonLayoutProps) {
  return (
    <Loading label={label} className={styles.table}>
      <div className={styles.tableHeader}>
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} variant="text" width="60%" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className={styles.tableRow}>
          {Array.from({ length: columns }, (_, index) => (
            <Skeleton key={index} variant="text" width={index === 0 ? "80%" : "50%"} />
          ))}
        </div>
      ))}
    </Loading>
  );
}

/** Grid of stat or balance cards. `columns` is the number of cards. */
export function CardGridSkeleton({ columns = 3, rows = 3, label = "Loading…" }: SkeletonLayoutProps) {
  return (
    <Loading label={label} className={styles.grid}>
      {Array.from({ length: columns }, (_, index) => (
        <div key={index} className={styles.card}>
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="rect" width="30%" height="2.25rem" />
          <Skeleton variant="text" lines={rows} />
        </div>
      ))}
    </Loading>
  );
}
