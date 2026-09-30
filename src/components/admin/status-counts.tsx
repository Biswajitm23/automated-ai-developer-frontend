"use client";

import { STATUS_LABELS } from "@/lib/format";
import { REQUEST_STATUSES, type RequestStatus, type StatusCounts as Counts } from "@/lib/services/types";
import styles from "./admin.module.css";

export type StatusCountsProps = {
  /** Counts for every filter except status (ELM-009). */
  counts: Counts;
  /** The chosen status filter; undefined = all statuses. */
  selected: RequestStatus | undefined;
  onSelect: (status: RequestStatus | undefined) => void;
  busy?: boolean;
  testId?: string;
};

/**
 * Status breakdown for the current filters, as toggle buttons: choosing one
 * sets the status filter, choosing it again (or "All") clears it. Each button
 * shows its label as text, never colour alone.
 */
export function StatusCounts({ counts, selected, onSelect, busy = false, testId = "status-counts" }: StatusCountsProps) {
  const items: { status: RequestStatus | undefined; label: string; value: number }[] = [
    { status: undefined, label: "All", value: counts.total },
    ...REQUEST_STATUSES.map((status) => ({ status, label: STATUS_LABELS[status], value: counts[status] })),
  ];
  return (
    <ul className={styles.counts} aria-label="Requests by status for the current filters" data-testid={testId}>
      {items.map((item) => {
        const pressed = item.status === selected;
        return (
          <li key={item.status ?? "ALL"}>
            <button
              type="button"
              className={styles.countButton}
              aria-pressed={pressed}
              aria-busy={busy || undefined}
              data-testid={`status-count-${item.status ?? "ALL"}`}
              data-count={item.value}
              onClick={() => onSelect(pressed && item.status !== undefined ? undefined : item.status)}
            >
              <span>{item.label}</span>
              <span className={styles.countValue}>{item.value}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
