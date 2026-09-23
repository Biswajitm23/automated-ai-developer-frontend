import { Card, DescriptionList } from "@/components/ui/card";
import { formatDays } from "@/lib/format";
import type { Balance } from "@/lib/services/types";
import styles from "./balance-card.module.css";

export type BalanceCardProps = {
  balance: Balance;
  leaveTypeName: string;
  headingLevel?: 2 | 3;
};

/** Share of the allowance as a CSS percentage (0–100). */
function percent(part: number, whole: number): string {
  if (whole <= 0 || part <= 0) return "0%";
  return `${Math.min(100, (part / whole) * 100)}%`;
}

/**
 * One leave type's balance for a year: allowance, approved (used), pending
 * (reserved) and available. The stacked bar is decorative (aria-hidden); the
 * <dl> carries the figures.
 */
export function BalanceCard({ balance, leaveTypeName, headingLevel = 3 }: BalanceCardProps) {
  const { allowance, approved, pending, available, year, leave_type: code } = balance;
  const noAllowance = allowance === 0;
  const shownAvailable = Math.max(0, available);

  return (
    <Card
      title={leaveTypeName}
      headingLevel={headingLevel}
      className={styles.card}
      data-testid={`balance-card-${code}`}
      data-allowance={allowance}
      data-approved={approved}
      data-pending={pending}
      data-available={available}
    >
      <p className={styles.headline}>
        <span className={styles.available}>{available}</span>{" "}
        <span className={styles.availableLabel}>
          {available === 1 ? "day" : "days"} available in {year}
        </span>
      </p>

      {noAllowance ? (
        <p className={styles.notice} data-testid="no-allowance-set">
          No allowance set for {year}. Contact your administrator.
        </p>
      ) : (
        <div className={styles.meter} aria-hidden="true">
          <span className={styles.segApproved} style={{ width: percent(approved, allowance) }} />
          <span className={styles.segPending} style={{ width: percent(pending, allowance) }} />
          <span className={styles.segAvailable} style={{ width: percent(shownAvailable, allowance) }} />
        </div>
      )}

      <DescriptionList
        className={styles.figures}
        items={[
          { term: "Allowance", description: formatDays(allowance) },
          {
            term: "Approved (used)",
            description: (
              <span className={styles.legend}>
                <span className={`${styles.swatch} ${styles.swatchApproved}`} aria-hidden="true" />
                {formatDays(approved)}
              </span>
            ),
          },
          {
            term: "Pending (reserved)",
            description: (
              <span className={styles.legend}>
                <span className={`${styles.swatch} ${styles.swatchPending}`} aria-hidden="true" />
                {formatDays(pending)}
              </span>
            ),
          },
          {
            term: "Available",
            description: (
              <span className={styles.legend}>
                <span className={`${styles.swatch} ${styles.swatchAvailable}`} aria-hidden="true" />
                {formatDays(available)}
              </span>
            ),
          },
        ]}
      />
    </Card>
  );
}
