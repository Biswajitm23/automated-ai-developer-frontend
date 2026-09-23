import Link from "next/link";
import type { ReactNode } from "react";
import { ResponsiveTable, type TableColumn } from "@/components/ui/responsive-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { formatDateInAppZone, formatDateRange, formatDateTime, formatDays, leaveTypeName } from "@/lib/format";
import type { LeaveRequest, LeaveType } from "@/lib/services/types";

export type LeaveRequestTableProps = {
  requests: LeaveRequest[];
  caption: string;
  captionHidden?: boolean;
  captionId?: string;
  leaveTypes?: LeaveType[] | null;
  loading?: boolean;
  empty?: ReactNode;
  testId?: string;
  /** Show the submitted time column (hidden on mobile). Default true. */
  showSubmitted?: boolean;
};

/**
 * The employee's own requests (dashboard "recent" and /leave history). The
 * first cell links to /leave/[id]; rows are not click handlers.
 */
export function LeaveRequestTable({
  requests,
  caption,
  captionHidden,
  captionId,
  leaveTypes,
  loading,
  empty,
  testId,
  showSubmitted = true,
}: LeaveRequestTableProps) {
  const columns: TableColumn<LeaveRequest>[] = [
    {
      key: "dates",
      header: "Dates",
      primary: true,
      cell: (request) => (
        <Link href={`/leave/${request.id}`} data-testid="leave-request-link">
          {formatDateRange(request.start_date, request.end_date)}
          <VisuallyHidden>, request #{request.id}</VisuallyHidden>
        </Link>
      ),
    },
    {
      key: "type",
      header: "Leave type",
      cell: (request) => leaveTypeName(request.leave_type, leaveTypes),
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
  ];
  if (showSubmitted) {
    columns.push({
      key: "submitted",
      header: "Submitted",
      hideOnMobile: true,
      cell: (request) => (
        <time dateTime={request.created_at} title={formatDateTime(request.created_at)}>
          {formatDateInAppZone(request.created_at)}
        </time>
      ),
    });
  }

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
