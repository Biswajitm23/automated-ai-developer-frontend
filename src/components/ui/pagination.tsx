"use client";

import { Button } from "./button";
import styles from "./pagination.module.css";

export type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Plural noun for the summary, e.g. "requests". */
  itemLabel?: string;
  /** Element (usually the table caption) that receives focus after a page change. */
  focusTargetId?: string;
  testId?: string;
};

type PageItem = number | "gap-start" | "gap-end";

/** Up to 7 entries: first, last, the current page and its neighbours, with gaps. */
export function pageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "gap-end", totalPages];
  if (page >= totalPages - 3) {
    return [1, "gap-start", ...Array.from({ length: 5 }, (_, index) => totalPages - 4 + index)];
  }
  return [1, "gap-start", page - 1, page, page + 1, "gap-end", totalPages];
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  itemLabel = "items",
  focusTargetId,
  testId = "pagination",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const first = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const last = Math.min(total, current * pageSize);

  function go(target: number) {
    if (target < 1 || target > totalPages || target === current) return;
    onPageChange(target);
    if (focusTargetId) {
      // Wait for the new rows to render before moving focus.
      requestAnimationFrame(() => document.getElementById(focusTargetId)?.focus());
    }
  }

  return (
    <nav className={styles.pagination} aria-label="Pagination" data-testid={testId}>
      <p className={styles.summary} aria-live="polite">
        {total === 0
          ? `No ${itemLabel}`
          : `Showing ${first}–${last} of ${total} ${itemLabel}`}
      </p>
      {totalPages > 1 && (
        <div className={styles.controls}>
          <Button
            variant="secondary"
            size="sm"
            iconStart="chevron-left"
            onClick={() => go(current - 1)}
            disabled={current === 1}
          >
            Previous
          </Button>
          <ol className={styles.pages} role="list">
            {pageItems(current, totalPages).map((item) =>
              typeof item === "number" ? (
                <li key={item}>
                  <button
                    type="button"
                    className={styles.page}
                    aria-current={item === current ? "page" : undefined}
                    onClick={() => go(item)}
                  >
                    <span className="visually-hidden">Page </span>
                    {item}
                  </button>
                </li>
              ) : (
                <li key={item} className={styles.gap} aria-hidden="true">
                  …
                </li>
              ),
            )}
          </ol>
          <span className={styles.compact}>
            Page {current} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => go(current + 1)}
            disabled={current === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </nav>
  );
}
