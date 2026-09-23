import { Icon } from "@/components/ui/icons";
import type { LeavePreview } from "@/lib/dates";
import { formatDateRange } from "@/lib/format";
import type { Balance } from "@/lib/services/types";
import styles from "./working-day-preview.module.css";

export type BalanceLoadState = "idle" | "loading" | "ready" | "unavailable";

export type WorkingDayPreviewProps = {
  start: string;
  end: string;
  /** Result of previewLeave() for the current inputs. */
  preview: LeavePreview;
  /** Name of the chosen leave type, or null when none is chosen yet. */
  leaveTypeName: string | null;
  /** Balance of the chosen type for the start date's year, when known. */
  balance: Balance | null;
  balanceState: BalanceLoadState;
  /** Extra findings from the optional server preview (e.g. an overlap). */
  serverMessages?: string[];
};

type PreviewState = "idle" | "fix-dates" | "invalid" | "valid";

/**
 * Live working-day count for the apply form (docs/ui-design.md §7). The text
 * sits in a polite live region, so each date change is announced. The server
 * is authoritative; this only guides the user.
 */
export function WorkingDayPreview({
  start,
  end,
  preview,
  leaveTypeName,
  balance,
  balanceState,
  serverMessages = [],
}: WorkingDayPreviewProps) {
  const formIssues = preview.issues.filter((issue) => issue.field === "form");
  let state: PreviewState;
  if (!start || !end) state = "idle";
  else if (formIssues.length > 0) state = "invalid";
  else if (preview.issues.length > 0) state = "fix-dates";
  else state = "valid";

  return (
    <div
      className={[styles.preview, styles[state]].join(" ")}
      data-testid="working-day-preview"
      data-state={state}
      data-working-days={state === "valid" ? preview.workingDays : 0}
    >
      <p className={styles.heading}>
        <Icon name="calendar" size={20} className={styles.headingIcon} />
        Working days
      </p>
      <div role="status" aria-live="polite" className={styles.body}>
        {state === "idle" && (
          <p className={styles.muted}>Choose start and end dates to see how many working days this uses.</p>
        )}

        {state === "fix-dates" && (
          <p className={styles.muted}>Fix the highlighted dates to see how many working days this uses.</p>
        )}

        {state === "invalid" && (
          <ul className={styles.issues} role="list">
            {formIssues.map((issue) => (
              <li key={issue.code} className={styles.issue} data-issue={issue.code}>
                <Icon name="alert-triangle" size={16} className={styles.issueIcon} />
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        )}

        {state === "valid" && (
          <>
            <p className={styles.count}>
              <span className={styles.countValue}>{preview.workingDays}</span>{" "}
              working {preview.workingDays === 1 ? "day" : "days"}
            </p>
            <p className={styles.range}>
              {formatDateRange(start, end, { weekday: true })}
              {preview.weekendDays > 0 && (
                <>
                  {" "}
                  · {preview.weekendDays} weekend {preview.weekendDays === 1 ? "day" : "days"} not counted
                </>
              )}
            </p>
            <p className={styles.balance} data-testid="preview-balance-after">
              {balanceText({ leaveTypeName, balance, balanceState, workingDays: preview.workingDays })}
            </p>
          </>
        )}

        {serverMessages.length > 0 && state !== "idle" && (
          <ul className={styles.issues} role="list" data-testid="preview-server-messages">
            {serverMessages.map((message) => (
              <li key={message} className={styles.issue}>
                <Icon name="alert-triangle" size={16} className={styles.issueIcon} />
                <span>{message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function balanceText({
  leaveTypeName,
  balance,
  balanceState,
  workingDays,
}: {
  leaveTypeName: string | null;
  balance: Balance | null;
  balanceState: BalanceLoadState;
  workingDays: number;
}): string {
  if (!leaveTypeName) return "Choose a leave type to see your balance after this request.";
  if (balanceState === "loading" || balanceState === "idle") return `Checking your ${leaveTypeName} balance…`;
  if (!balance) return `Your ${leaveTypeName} balance couldn't be loaded. It will be checked when you submit.`;
  const after = balance.available - workingDays;
  return `${leaveTypeName} after this request: ${after} of ${balance.allowance} ${balance.allowance === 1 ? "day" : "days"} available`;
}
