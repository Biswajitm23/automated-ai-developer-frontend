import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { formatDays } from "@/lib/format";
import type { Balance, LeaveRequest } from "@/lib/services/types";
import styles from "./admin.module.css";

export type BalanceImpactProps = {
  /** The employee's balance for the request's leave type and year (null if unknown). */
  balance: Balance | null;
  request: LeaveRequest;
  leaveTypeName: string;
};

/**
 * Review screen: the employee's current balance for this request's type and
 * year, and what approving or rejecting does to it. For a Pending request its
 * days are already counted in "Pending (reserved)". The server re-checks the
 * balance when the decision is made, so this is guidance only.
 */
export function BalanceImpact({ balance, request, leaveTypeName }: BalanceImpactProps) {
  const year = Number(request.start_date.slice(0, 4));
  const title = `${leaveTypeName} balance, ${year}`;

  if (!balance) {
    return (
      <Card title={title} data-testid="balance-impact">
        <p className={styles.muted}>
          The employee&apos;s {leaveTypeName} balance for {year} couldn&apos;t be loaded. The server still checks it
          when you approve.
        </p>
      </Card>
    );
  }

  const days = request.working_days;
  const pending = request.status === "PENDING";
  const afterApprove = { approved: balance.approved + days, pending: balance.pending - days, available: balance.available };
  const afterReject = { approved: balance.approved, pending: balance.pending - days, available: balance.available + days };
  const overAllowance = balance.approved + balance.pending > balance.allowance;

  return (
    <Card
      title={title}
      data-testid="balance-impact"
      data-allowance={balance.allowance}
      data-approved={balance.approved}
      data-pending={balance.pending}
      data-available={balance.available}
    >
      {(balance.available < 0 || (pending && overAllowance)) && (
        <Alert variant="warning" data-testid="balance-impact-warning">
          {balance.allowance === 0
            ? `No ${leaveTypeName} allowance is set for ${year}. Approving will fail; set an allowance first.`
            : `Approved and pending days (${balance.approved + balance.pending}) are more than the allowance (${balance.allowance}). The server will refuse an approval that exceeds the allowance.`}
        </Alert>
      )}

      <div className={styles.impactWrap}>
        <table className={styles.impactTable}>
          <caption className="visually-hidden">
            {pending
              ? `${title}: now, after approval and after rejection, in days`
              : `${title}, in days`}
          </caption>
          <thead>
            <tr>
              <th scope="col">Days</th>
              <th scope="col">Now</th>
              {pending && <th scope="col">If approved</th>}
              {pending && <th scope="col">If rejected</th>}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Allowance</th>
              <td>{balance.allowance}</td>
              {pending && <td>{balance.allowance}</td>}
              {pending && <td>{balance.allowance}</td>}
            </tr>
            <tr>
              <th scope="row">Approved (used)</th>
              <td>{balance.approved}</td>
              {pending && <td data-testid="impact-approved-after">{afterApprove.approved}</td>}
              {pending && <td>{afterReject.approved}</td>}
            </tr>
            <tr>
              <th scope="row">Pending (reserved)</th>
              <td>{balance.pending}</td>
              {pending && <td>{afterApprove.pending}</td>}
              {pending && <td>{afterReject.pending}</td>}
            </tr>
            <tr>
              <th scope="row">Available</th>
              <td data-testid="impact-available-now">{balance.available}</td>
              {pending && <td data-testid="impact-available-approve">{afterApprove.available}</td>}
              {pending && <td data-testid="impact-available-reject">{afterReject.available}</td>}
            </tr>
          </tbody>
        </table>
      </div>

      {pending ? (
        <ul className={styles.impactList}>
          <li>
            <strong>Approve:</strong> {formatDays(days)} move from Pending to Approved. Available stays{" "}
            {formatDays(afterApprove.available)}.
          </li>
          <li>
            <strong>Reject:</strong> {formatDays(days)} are released. Available becomes{" "}
            {formatDays(afterReject.available)}.
          </li>
        </ul>
      ) : (
        <p className={styles.muted}>
          This request is no longer pending, so a decision does not change this balance any more.
        </p>
      )}
    </Card>
  );
}
