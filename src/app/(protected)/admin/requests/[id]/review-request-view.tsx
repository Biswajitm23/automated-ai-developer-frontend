"use client";

import { useEffect, useRef, useState } from "react";
import { BalanceImpact } from "@/components/admin/balance-impact";
import { DecisionSummary, RequestSummary } from "@/components/leave/request-summary";
import { LoadError } from "@/components/states/load-error";
import { NotAvailableState } from "@/components/states/not-available-state";
import { NotFoundPanel } from "@/components/states/not-found-panel";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, DescriptionList } from "@/components/ui/card";
import { PageHeader, type Breadcrumb } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { STATUS_LABELS, formatDateRange, formatDays, leaveTypeName } from "@/lib/format";
import { getAdminRequest } from "@/lib/services/admin-requests";
import { ENDPOINTS } from "@/lib/services/availability";
import { isNotFound } from "@/lib/services/errors";
import { listLeaveTypes } from "@/lib/services/leave-types";
import { MOCK_API_ENABLED } from "@/lib/services/mock-flag";
import type { AdminLeaveRequestDetail, LeaveRequest } from "@/lib/services/types";
import { useAsync } from "@/lib/use-async";
import styles from "../../admin.module.css";
import { DecisionDialog, type Decision } from "./decision-dialog";

const ID_PATTERN = /^[1-9]\d{0,9}$/;
/** Deciding needs the decisions endpoint (or the dev mock). */
const DECISIONS_AVAILABLE = ENDPOINTS.adminDecisions.available || MOCK_API_ENABLED;

function breadcrumbs(id: string): Breadcrumb[] {
  return [
    { href: "/admin/requests", label: "Leave requests" },
    { href: `/admin/requests/${id}`, label: ID_PATTERN.test(id) ? `Request #${id}` : "Request" },
  ];
}

function NotFound({ id }: { id: string }) {
  return (
    <>
      <PageHeader title="Review leave request" breadcrumbs={breadcrumbs(id)} />
      <NotFoundPanel
        what="leave request"
        backHref="/admin/requests"
        backLabel="Back to leave requests"
        description="We couldn't find this leave request. It may not exist."
      />
    </>
  );
}

/** /admin/requests/[id]: review one request and approve or reject it (ELM-007). */
export default function ReviewRequestView({ id }: { id: string }) {
  // Anything but a positive integer is not found, without asking the server.
  if (!ID_PATTERN.test(id)) return <NotFound id={id} />;
  return <ReviewRequest id={id} />;
}

type Notice = { variant: "warning" | "info"; text: string };

function ReviewRequest({ id }: { id: string }) {
  const { toast } = useToast();
  const state = useAsync((signal) => getAdminRequest(id, signal), [id]);
  const types = useAsync((signal) => listLeaveTypes(signal), []);
  const leaveTypes = types.status === "success" ? types.data : null;

  // The decision response, shown until a reload brings the decided request.
  const [decided, setDecided] = useState<LeaveRequest | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [focusSeq, setFocusSeq] = useState(0);
  const noticeRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // After a decision or conflict the buttons disappear, so move focus to the
  // message (or the summary) instead of losing it to <body>.
  useEffect(() => {
    if (focusSeq === 0) return;
    (noticeRef.current ?? summaryRef.current)?.focus();
  }, [focusSeq]);

  const loaded = state.data;
  // Prefer the decision response while the reloaded detail still says Pending.
  const request: AdminLeaveRequestDetail | null =
    loaded && decided && decided.id === loaded.id && loaded.status === "PENDING"
      ? { ...loaded, ...decided }
      : loaded;

  if (state.status === "not-available") {
    return (
      <>
        <PageHeader title="Review leave request" breadcrumbs={breadcrumbs(id)} />
        <NotAvailableState feature={state.feature} card={state.card} />
      </>
    );
  }
  if (state.status === "error" && isNotFound(state.error)) return <NotFound id={id} />;
  if (state.status === "error" && !request) {
    return (
      <>
        <PageHeader title="Review leave request" breadcrumbs={breadcrumbs(id)} />
        <LoadError error={state.error} onRetry={state.reload} what="this leave request" />
      </>
    );
  }
  if (!request) return <PageSkeleton rows={8} label="Loading the leave request…" />;

  const typeName = leaveTypeName(request.leave_type, leaveTypes);
  const isPending = request.status === "PENDING";
  const year = Number(request.start_date.slice(0, 4));
  const balance =
    request.balances.find((item) => item.leave_type === request.leave_type && item.year === year) ??
    request.balances.find((item) => item.leave_type === request.leave_type) ??
    null;
  const busy = state.status === "loading";

  function openDecision(next: Decision) {
    setNotice(null);
    setDecision(next);
  }

  return (
    <>
      <PageHeader
        title={`Review ${typeName.toLowerCase()} request`}
        breadcrumbs={breadcrumbs(id)}
        description={
          <span className={styles.wrap}>
            {request.employee.full_name} · {formatDateRange(request.start_date, request.end_date)} ·{" "}
            {formatDays(request.working_days)}
          </span>
        }
        meta={
          <span data-testid="review-status" data-status={request.status}>
            <StatusBadge status={request.status} />
          </span>
        }
        actions={
          // Shown only for Pending requests. This is not security: the API
          // checks the admin role and that the request is still Pending.
          isPending && DECISIONS_AVAILABLE ? (
            <>
              <Button
                iconStart="check"
                onClick={() => openDecision("approve")}
                disabled={busy}
                data-testid="approve-button"
              >
                Approve
              </Button>
              <Button
                variant="danger"
                iconStart="x-circle"
                onClick={() => openDecision("reject")}
                disabled={busy}
                data-testid="reject-button"
              >
                Reject
              </Button>
            </>
          ) : undefined
        }
      />

      {notice && (
        <div ref={noticeRef} tabIndex={-1} className={styles.noticeTarget}>
          <Alert
            variant={notice.variant}
            live="polite"
            data-testid="decision-conflict"
            action={
              busy ? undefined : (
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

      {isPending && !DECISIONS_AVAILABLE && (
        <Alert variant="info" data-testid="decisions-not-available">
          {ENDPOINTS.adminDecisions.feature} isn&apos;t available yet ({ENDPOINTS.adminDecisions.card}).
        </Alert>
      )}

      <div className={styles.detailGrid}>
        <div className={styles.stack}>
          <div ref={summaryRef} tabIndex={-1} className={styles.noticeTarget} aria-busy={busy || undefined}>
            <RequestSummary request={request} leaveTypes={leaveTypes} showEmployee />
          </div>
          {!isPending && <DecisionSummary request={request} viewer="admin" />}
        </div>

        <div className={styles.stack}>
          <BalanceImpact balance={balance} request={request} leaveTypeName={typeName} />
          <Card title="Employee" data-testid="review-employee">
            <DescriptionList
              items={[
                { term: "Name", description: <span className={styles.wrap}>{request.employee.full_name}</span> },
                { term: "Email", description: <span className={styles.email}>{request.employee.email}</span> },
                {
                  term: "Department",
                  description: <span className={styles.wrap}>{request.employee.department || "—"}</span>,
                },
                { term: "Account", description: <StatusBadge active={request.employee.is_active} /> },
              ]}
            />
            <div className={styles.inlineActions}>
              <ButtonLink href={`/admin/employees/${request.employee.id}`} variant="secondary" size="sm">
                Employee details
              </ButtonLink>
              <ButtonLink href={`/admin/requests?employee=${request.employee.id}`} variant="ghost" size="sm">
                All their requests
              </ButtonLink>
            </div>
          </Card>
        </div>
      </div>

      {isPending && decision && (
        <DecisionDialog
          open
          decision={decision}
          request={request}
          leaveTypeName={typeName}
          onClose={() => setDecision(null)}
          onDone={(result) => {
            setDecided(result);
            setDecision(null);
            setNotice(null);
            setFocusSeq((seq) => seq + 1);
            toast({
              variant: "success",
              message: `Request ${STATUS_LABELS[result.status].toLowerCase()}: ${result.employee.full_name}, ${formatDays(result.working_days)} of ${typeName}.`,
            });
            // Fetch the new balances; the decision stays shown meanwhile.
            state.reload();
          }}
          onConflict={(message) => {
            setDecision(null);
            setDecided(null);
            setNotice({ variant: "warning", text: `${message} The request has been reloaded.` });
            setFocusSeq((seq) => seq + 1);
            state.reload();
          }}
        />
      )}
    </>
  );
}
