import { Card, DescriptionList } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateRange, formatDateTime, formatDays, leaveTypeName } from "@/lib/format";
import type { LeaveRequest, LeaveType } from "@/lib/services/types";
import styles from "./request-summary.module.css";

export type RequestSummaryProps = {
  request: LeaveRequest;
  leaveTypes?: LeaveType[] | null;
  /** Show the employee's name and department (admin review screen). */
  showEmployee?: boolean;
  title?: string;
};

/** Type, dates, working days, status, submitted time and reason of one request. */
export function RequestSummary({
  request,
  leaveTypes,
  showEmployee = false,
  title = "Request details",
}: RequestSummaryProps) {
  const items = [
    ...(showEmployee
      ? [
          {
            term: "Employee",
            description: (
              <>
                <span className={styles.strong}>{request.employee.full_name}</span>
                {request.employee.department && (
                  <span className={styles.muted}> · {request.employee.department}</span>
                )}
              </>
            ),
          },
        ]
      : []),
    { term: "Leave type", description: leaveTypeName(request.leave_type, leaveTypes) },
    { term: "Dates", description: formatDateRange(request.start_date, request.end_date, { weekday: true }) },
    {
      term: "Working days",
      description: <span data-testid="request-working-days">{formatDays(request.working_days)}</span>,
    },
    {
      term: "Status",
      description: (
        <span data-testid="request-status" data-status={request.status}>
          <StatusBadge status={request.status} />
        </span>
      ),
    },
    {
      term: "Submitted",
      description: <time dateTime={request.created_at}>{formatDateTime(request.created_at)}</time>,
    },
    {
      term: "Reason",
      description: <p className={styles.longText} data-testid="request-reason">{request.reason}</p>,
    },
  ];

  return (
    <Card title={title} data-testid="request-summary">
      <DescriptionList items={items} />
    </Card>
  );
}

export type DecisionSummaryProps = {
  request: LeaveRequest;
  /** Wording for cancelled requests: "by you" (employee) or "by the employee" (admin). */
  viewer?: "employee" | "admin";
};

/** Review outcome: reviewer, decision time and remarks, or the pending/cancelled state. */
export function DecisionSummary({ request, viewer = "employee" }: DecisionSummaryProps) {
  let content;
  switch (request.status) {
    case "PENDING":
      content = <p className={styles.muted}>Awaiting review by an administrator.</p>;
      break;
    case "CANCELLED":
      content = (
        <p>
          Cancelled by {viewer === "employee" ? "you" : "the employee"}
          {request.cancelled_at ? (
            <>
              {" "}
              on <time dateTime={request.cancelled_at}>{formatDateTime(request.cancelled_at)}</time>
            </>
          ) : null}
          . The request stays in the leave history.
        </p>
      );
      break;
    default:
      content = (
        <DescriptionList
          items={[
            { term: "Decision", description: <StatusBadge status={request.status} /> },
            {
              term: "Reviewed by",
              description: (
                <span data-testid="decision-reviewer">{request.reviewed_by?.full_name ?? "An administrator"}</span>
              ),
            },
            {
              term: "Decided at",
              description: request.reviewed_at ? (
                <time dateTime={request.reviewed_at} data-testid="decision-time">
                  {formatDateTime(request.reviewed_at)}
                </time>
              ) : (
                <span className={styles.muted}>Not recorded</span>
              ),
            },
            {
              term: "Admin remarks",
              description: request.review_remarks ? (
                <p className={styles.longText} data-testid="decision-remarks-text">
                  {request.review_remarks}
                </p>
              ) : (
                <span className={styles.muted}>No remarks</span>
              ),
            },
          ]}
        />
      );
  }

  return (
    <Card title="Decision" data-testid="decision-summary" data-status={request.status}>
      {content}
    </Card>
  );
}
