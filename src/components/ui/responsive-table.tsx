import { useId, type ReactNode } from "react";
import { TableSkeleton } from "./skeleton";
import styles from "./responsive-table.module.css";

export type TableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "start" | "end";
  /** Dropped from the stacked card layout below 768 px. */
  hideOnMobile?: boolean;
  /** Becomes the card title below 768 px. */
  primary?: boolean;
};

export type ResponsiveTableProps<T> = {
  caption: string;
  captionHidden?: boolean;
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  /** Rendered instead of the table when there are no rows. */
  empty?: ReactNode;
  testId?: string;
  /** id of the <caption>; Pagination can move focus there after a page change. */
  captionId?: string;
};

/**
 * Semantic <table> at ≥768 px. Below that the same DOM is shown as one card
 * per row: each cell shows its header via data-label. Rows are not click
 * handlers; put a link in the first (primary) cell.
 *
 * The explicit ARIA table roles are on purpose: the card layout changes the
 * CSS display of rows and cells, and some browsers then drop the native table
 * semantics. The roles keep rows, cells and headers announced.
 */
export function ResponsiveTable<T>({
  caption,
  captionHidden = false,
  columns,
  rows,
  rowKey,
  loading = false,
  empty,
  testId,
  captionId,
}: ResponsiveTableProps<T>) {
  const generatedCaptionId = useId();
  const labelId = captionId ?? generatedCaptionId;
  if (loading && rows.length === 0) {
    return <TableSkeleton columns={Math.min(columns.length, 5)} label={`Loading ${caption.toLowerCase()}…`} />;
  }
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className={styles.wrapper} aria-busy={loading || undefined}>
      <table role="table" aria-labelledby={labelId} className={styles.table} data-testid={testId}>
        <caption
          id={labelId}
          tabIndex={captionId ? -1 : undefined}
          className={captionHidden ? "visually-hidden" : styles.caption}
        >
          {caption}
        </caption>
        <thead role="rowgroup">
          <tr role="row">
            {columns.map((column) => (
              <th
                key={column.key}
                role="columnheader"
                scope="col"
                className={column.align === "end" ? styles.end : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {rows.map((row) => (
            <tr key={rowKey(row)} role="row">
              {columns.map((column) => (
                <td
                  key={column.key}
                  role="cell"
                  data-label={column.header}
                  className={[
                    column.align === "end" ? styles.end : null,
                    column.primary ? styles.primary : null,
                    column.hideOnMobile ? styles.hideOnMobile : null,
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
