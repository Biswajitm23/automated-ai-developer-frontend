import styles from "./loader.module.css";

export type LoaderProps = {
  /** Shown under the spinner and announced to screen readers. */
  label: string;
  size?: "sm" | "md" | "lg";
  /** Centre the loader in a tall area (a whole page or panel). */
  fullHeight?: boolean;
  className?: string;
};

/** Brand-coloured spinning ring with a status label. */
export function Loader({ label, size = "md", fullHeight = false, className }: LoaderProps) {
  return (
    <div
      role="status"
      className={[styles.loader, fullHeight ? styles.fullHeight : null, className]
        .filter(Boolean)
        .join(" ")}
      data-testid="loader"
    >
      <span className={[styles.ring, styles[size]].join(" ")} aria-hidden="true">
        <span className={styles.dot} />
      </span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
