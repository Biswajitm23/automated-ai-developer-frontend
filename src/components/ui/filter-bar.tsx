"use client";

import { useId, useState, type ReactNode } from "react";
import { Button } from "./button";
import styles from "./filter-bar.module.css";

export type FilterBarProps = {
  /** Accessible name of the search landmark, e.g. "Filter leave requests". */
  label: string;
  children: ReactNode;
  /** Called on submit (Enter). Filters normally apply on change. */
  onApply?: () => void;
  onClear: () => void;
  /** Number of filters that differ from their defaults. */
  activeCount: number;
  /** e.g. "12 requests match". Announced politely. */
  resultSummary?: string;
  testId?: string;
};

/**
 * <form role="search"> with a responsive grid of filter controls and
 * "Clear filters". Below 768 px the controls sit behind a "Filters (n)"
 * disclosure button. Filter values live in the URL (see useUrlState).
 */
export function FilterBar({
  label,
  children,
  onApply,
  onClear,
  activeCount,
  resultSummary,
  testId,
}: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  return (
    <form
      role="search"
      aria-label={label}
      className={styles.bar}
      data-testid={testId}
      onSubmit={(event) => {
        event.preventDefault();
        onApply?.();
      }}
    >
      <div className={styles.toggleRow}>
        <Button
          variant="secondary"
          iconStart="filter"
          className={styles.toggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((value) => !value)}
        >
          {activeCount > 0 ? `Filters (${activeCount})` : "Filters"}
        </Button>
      </div>
      <div id={panelId} className={[styles.panel, expanded ? styles.open : null].filter(Boolean).join(" ")}>
        <div className={styles.controls}>{children}</div>
        <div className={styles.footer}>
          {/* Always rendered, so screen readers register the live region
              before its text changes; only the text is updated. */}
          <p className={styles.summary} aria-live="polite" aria-atomic="true">
            {resultSummary ?? ""}
          </p>
          <Button variant="ghost" onClick={onClear} disabled={activeCount === 0}>
            Clear filters
          </Button>
        </div>
      </div>
    </form>
  );
}
