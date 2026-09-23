import Link from "next/link";
import type { ReactNode } from "react";
import { ResponsiveTable, type TableColumn } from "@/components/ui/responsive-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { formatDate, formatDateRange, formatDateTime, formatDays, leaveTypeName } from "@/lib/format";
import type { LeaveRequest, LeaveType } from "@/lib/services/types";
import styles from "./admin.module.css";

export type AdminRequestTableProps = {
  requests: LeaveRequest[];
  caption: string;
  captionHidden?: boolean;
  captionId?: string;
  leaveTypes?: LeaveType[] | null;
  loading?: boolean;
  empty?: ReactNode;
  testId?: string;
};

/**
 * Every employee's requests (admin dashboard "recent" and /admin/requests).
 * The first cell links to the review page /admin/requests/[id]; rows are not
 * click handlers.
 */
export function AdminRequestTable({
  requests,
  caption,
  captionHidden,
  captionId,
  leaveTypes,
  loading,
  empty,
  testId = "admin-request-table",
}: AdminRequestTableProps) {
  const columns: TableColumn<LeaveRequest>[] = [
    {
      key: "employee",
      header: "Employee",
      primary: true,
      cell: (request) => (
        <span className={styles.personCell}>
          <Link href={`/admin/requests/${request.id}`} data-testid="admin-request-link">
            {request.employee.full_name}
            <VisuallyHidden>, review request #{request.id}</VisuallyHidden>
          </Link>
          {request.employee.department && (
            <span className={styles.subtle}>{request.employee.department}</span>
          )}
          {!request.employee.is_active && <span className={styles.subtle}>Inactive employee</span>}
        </span>
      ),
    },
    {
      key: "type",
      header: "Leave type",
      cell: (request) => leaveTypeName(request.leave_type, leaveTypes),
    },
    {
      key: "dates",
      header: "Dates",
      cell: (request) => formatDateRange(request.start_date, request.end_date),
    },
    {
      key: "days",
      header: "Working days",
      align: "end",
      cell: (request) => formatDays(request.working_days),
    },
    {
      key: "status",
      header: "Status",
      cell: (request) => <StatusBadge status={request.status} />,
    },
    {
      key: "submitted",
      header: "Submitted",
      hideOnMobile: true,
      cell: (request) => (
        <time dateTime={request.created_at} title={formatDateTime(request.created_at)}>
          {formatDate(request.created_at.slice(0, 10))}
        </time>
      ),
    },
  ];

  return (
    <ResponsiveTable
      caption={caption}
      captionHidden={captionHidden}
      captionId={captionId}
      columns={columns}
      rows={requests}
      rowKey={(request) => request.id}
      loading={loading}
      empty={empty}
      testId={testId}
    />
  );
}
