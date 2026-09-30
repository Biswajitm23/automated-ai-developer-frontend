"use client";

import { useEffect, useRef, useState } from "react";
import { DecisionSummary, RequestSummary } from "@/components/leave/request-summary";
import { LoadError } from "@/components/states/load-error";
import { NotAvailableState } from "@/components/states/not-available-state";
import { NotFoundPanel } from "@/components/states/not-found-panel";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader, type Breadcrumb } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatDateRange, formatDays, leaveTypeName } from "@/lib/format";
import { ENDPOINTS } from "@/lib/services/availability";
import { isNotFound } from "@/lib/services/errors";
import { getMyRequest } from "@/lib/services/leave-requests";
import { listLeaveTypes } from "@/lib/services/leave-types";
import { MOCK_API_ENABLED } from "@/lib/services/mock-flag";
import type { LeaveRequest } from "@/lib/services/types";
import { useAsync } from "@/lib/use-async";
import { CancelRequestDialog } from "./cancel-request-dialog";

const ID_PATTERN = /^[1-9]\d{0,9}$/;
const CANCEL_AVAILABLE = ENDPOINTS.cancelRequest.available || MOCK_API_ENABLED;

function breadcrumbs(id: string): Breadcrumb[] {
  return [
    { href: "/leave", label: "My leave" },
    { href: `/leave/${id}`, label: ID_PATTERN.test(id) ? `Request #${id}` : "Request" },
  ];
}

function NotFound({ id }: { id: string }) {
  return (
    <>
      <PageHeader title="Leave request" breadcrumbs={breadcrumbs(id)} />
      <NotFoundPanel what="leave request" backHref="/leave" backLabel="Back to my leave" />
    </>
  );
}

/** /leave/[id]: one of the employee's own requests, with cancel for Pending ones. */
export default function LeaveRequestView({ id }: { id: string }) {
  // Anything but a positive integer is not found, without asking the server.
  if (!ID_PATTERN.test(id)) return <NotFound id={id} />;
  return <LeaveRequestDetails id={id} />;
}

type Notice = { variant: "warning" | "info"; text: string };

function LeaveRequestDetails({ id }: { id: string }) {
  const { toast } = useToast();
  const state = useAsync((signal) => getMyRequest(id, signal), [id]);
  const types = useAsync((signal) => listLeaveTypes(signal), []);
  const leaveTypes = types.status === "success" ? types.data : null;

  // The cancel response, shown until the next load replaces it.
  const [updated, setUpdated] = useState<LeaveRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [focusSeq, setFocusSeq] = useState(0);
  const noticeRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // After a cancel or conflict the Cancel button disappears, so move focus to
  // the message (or the summary) instead of losing it to <body>.
  useEffect(() => {
    if (focusSeq === 0) return;
    (noticeRef.current ?? summaryRef.current)?.focus();
  }, [focusSeq]);

  const request = updated ?? state.data;

  if (state.status === "not-available") {
    return (
      <>
        <PageHeader title="Leave request" breadcrumbs={breadcrumbs(id)} />
        <NotAvailableState feature={state.feature} card={state.card} />
      </>
    );
  }
  if (state.status === "error" && isNotFound(state.error)) return <NotFound id={id} />;
  if (state.status === "error" && !request) {
    return (
      <>
        <PageHeader title="Leave request" breadcrumbs={breadcrumbs(id)} />
        <LoadError error={state.error} onRetry={state.reload} what="this leave request" />
      </>
    );
  }
  if (!request) return <PageSkeleton rows={6} label="Loading the leave request…" />;

  const typeName = leaveTypeName(request.leave_type, leaveTypes);
  const canCancel = request.status === "PENDING";

  return (
    <>
      <PageHeader
        title={`${typeName} request`}
        breadcrumbs={breadcrumbs(id)}
        description={`${formatDateRange(request.start_date, request.end_date)} · ${formatDays(request.working_days)}`}
        actions={
          canCancel && CANCEL_AVAILABLE ? (
            <Button
              variant="secondary"
              iconStart="x-circle"
              onClick={() => {
                setNotice(null);
                setDialogOpen(true);
              }}
              data-testid="cancel-request-button"
            >
              Cancel request
            </Button>
          ) : undefined
        }
      />

      {notice && (
        <div ref={noticeRef} tabIndex={-1}>
          <Alert
            variant={notice.variant}
            live="polite"
            data-testid="cancel-conflict"
            action={
              state.status === "loading" ? undefined : (
                <Button variant="secondary" size="sm" iconStart="refresh" onClick={state.reload}>
                  Reload request
                </Button>
              )
            }
          >
            {notice.text}
          </Alert>
        </div>
      )}

      {state.status === "error" && (
        <LoadError error={state.error} onRetry={state.reload} what="the latest version of this request" />
      )}

      {canCancel && !CANCEL_AVAILABLE && (
        <Alert variant="info" data-testid="cancel-not-available">
          {ENDPOINTS.cancelRequest.feature} isn&apos;t available yet ({ENDPOINTS.cancelRequest.card}).
        </Alert>
      )}

      <div ref={summaryRef} tabIndex={-1} aria-busy={state.status === "loading" || undefined}>
        <RequestSummary request={request} leaveTypes={leaveTypes} />
      </div>
      <DecisionSummary request={request} />

      {canCancel && (
        <CancelRequestDialog
          open={dialogOpen}
          request={request}
          leaveTypeName={typeName}
          onClose={() => setDialogOpen(false)}
          onCancelled={(result) => {
            setUpdated(result);
            setDialogOpen(false);
            setNotice(null);
            setFocusSeq((seq) => seq + 1);
            toast({
              variant: "success",
              message: `Leave request cancelled. ${formatDays(result.working_days)} of ${typeName} went back to your balance.`,
            });
          }}
          onConflict={(message) => {
            setDialogOpen(false);
            setUpdated(null);
            setNotice({ variant: "warning", text: `${message} The request has been reloaded.` });
            setFocusSeq((seq) => seq + 1);
            state.reload();
          }}
        />
      )}
    </>
  );
}
