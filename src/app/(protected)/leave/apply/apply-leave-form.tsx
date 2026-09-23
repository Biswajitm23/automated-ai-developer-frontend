"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { WorkingDayPreview, type BalanceLoadState } from "@/components/leave/working-day-preview";
import { NotAvailableState } from "@/components/states/not-available-state";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateField } from "@/components/ui/date-field";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { currentYearInAppZone, parseISODate, previewLeave, todayInAppZone, yearOf } from "@/lib/dates";
import { formatDate, formatDays, leaveTypeName } from "@/lib/format";
import { ENDPOINTS } from "@/lib/services/availability";
import { getMyBalances } from "@/lib/services/balances";
import {
  CHECK_FIELDS_MESSAGE,
  NotAvailableError,
  firstFieldErrors,
  submitErrorMessage,
} from "@/lib/services/errors";
import { createLeaveRequest, previewLeaveRequest } from "@/lib/services/leave-requests";
import { listLeaveTypes } from "@/lib/services/leave-types";
import { MOCK_API_ENABLED } from "@/lib/services/mock-flag";
import { LEAVE_TYPE_CODES, REASON_MAX_LENGTH, type LeaveTypeCode } from "@/lib/services/types";
import { useAsync } from "@/lib/use-async";
import styles from "./apply.module.css";

/** Submitting needs the create endpoint (or the dev mock). */
const CREATE_AVAILABLE = ENDPOINTS.myRequests.available || MOCK_API_ENABLED;

const FIELD_ORDER = ["leave_type", "start_date", "end_date", "reason"] as const;
type FieldName = (typeof FIELD_ORDER)[number];
type FieldErrors = Partial<Record<FieldName, string>>;

const FIELD_IDS: Record<FieldName, string> = {
  leave_type: "leave-type",
  start_date: "start-date",
  end_date: "end-date",
  reason: "leave-reason",
};
const FORM_ALERT_ID = "leave-apply-error";

const MESSAGES = {
  leaveType: "Choose a leave type.",
  reason: "Enter a reason for your leave.",
  reasonTooLong: `Reason must be ${REASON_MAX_LENGTH} characters or fewer.`,
};

function isFieldName(value: string): value is FieldName {
  return (FIELD_ORDER as readonly string[]).includes(value);
}

/** UUID v4 for idempotency; falls back to getRandomValues outside secure contexts. */
function newClientRequestId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function Header() {
  return (
    <PageHeader
      title="Apply for leave"
      description="Your request goes to an administrator for approval. Weekends (Saturday and Sunday) are not counted."
    />
  );
}

export default function ApplyLeaveForm() {
  if (!CREATE_AVAILABLE) {
    return (
      <>
        <Header />
        <NotAvailableState feature={ENDPOINTS.myRequests.feature} card={ENDPOINTS.myRequests.card} />
      </>
    );
  }
  return <ApplyLeaveFormBody />;
}

function ApplyLeaveFormBody() {
  const router = useRouter();
  const { toast } = useToast();
  // One id per form instance: a retried or double-sent submit creates one request.
  const [clientRequestId] = useState(newClientRequestId);

  const [leaveType, setLeaveType] = useState<LeaveTypeCode | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [focusRequest, setFocusRequest] = useState<{ target: string; seq: number } | null>(null);
  const [serverCheck, setServerCheck] = useState<{ key: string; messages: string[] } | null>(null);

  // "Today" is taken again on every render, so a form left open past midnight IST stays correct.
  const today = todayInAppZone();
  const balanceYear = parseISODate(startDate) ? yearOf(startDate) : currentYearInAppZone();

  const types = useAsync((signal) => listLeaveTypes(signal), []);
  const balances = useAsync((signal) => getMyBalances(balanceYear, signal), [balanceYear]);

  const typeList =
    types.status === "success" && types.data.length > 0
      ? types.data
      : LEAVE_TYPE_CODES.map((code) => ({ code, name: leaveTypeName(code) }));
  const typeName = leaveType ? leaveTypeName(leaveType, typeList) : null;

  const balanceData = balances.data && balances.data.year === balanceYear ? balances.data : null;
  const balance = (leaveType && balanceData?.balances.find((item) => item.leave_type === leaveType)) || null;
  let balanceState: BalanceLoadState;
  if (balanceData) balanceState = "ready";
  else if (balances.status === "error" || balances.status === "not-available") balanceState = "unavailable";
  else balanceState = "loading";

  const preview = previewLeave({
    start: startDate,
    end: endDate,
    available: balance ? balance.available : null,
    leaveTypeName: typeName ?? undefined,
    today,
  });
  const formIssues = preview.issues.filter((issue) => issue.field === "form");

  const clientErrors: FieldErrors = {
    leave_type: leaveType ? undefined : MESSAGES.leaveType,
    start_date: preview.issues.find((issue) => issue.field === "start_date")?.message,
    end_date: preview.issues.find((issue) => issue.field === "end_date")?.message,
    reason: !reason.trim()
      ? MESSAGES.reason
      : reason.length > REASON_MAX_LENGTH
        ? MESSAGES.reasonTooLong
        : undefined,
  };
  const errorFor = (field: FieldName): string | undefined =>
    serverErrors[field] ?? (submitAttempted || touched[field] ? clientErrors[field] : undefined);

  // Optional server preview (§6.4): catches overlaps before submitting. Only
  // for a range the client already accepts; failures are ignored because the
  // create response is the final word.
  const previewKey =
    leaveType && preview.issues.length === 0
      ? [leaveType, startDate, endDate, preview.workingDays].join("|")
      : null;
  useEffect(() => {
    if (!previewKey) return;
    const [type, start, end, clientDays] = previewKey.split("|");
    const controller = new AbortController();
    const timer = setTimeout(() => {
      previewLeaveRequest(
        { leave_type: type as LeaveTypeCode, start_date: start, end_date: end },
        controller.signal,
      ).then(
        (result) => {
          let messages: string[] = [];
          if (!result.valid) messages = Object.values(result.errors).flat();
          else if (String(result.working_days) !== clientDays) {
            messages = [`The server counts ${formatDays(result.working_days)} for these dates.`];
          }
          setServerCheck({ key: previewKey, messages });
        },
        () => undefined,
      );
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [previewKey]);
  const serverMessages = serverCheck && serverCheck.key === previewKey ? serverCheck.messages : [];

  useEffect(() => {
    if (focusRequest) document.getElementById(focusRequest.target)?.focus();
  }, [focusRequest]);

  function requestFocus(target: string) {
    setFocusRequest((current) => ({ target, seq: (current?.seq ?? 0) + 1 }));
  }

  function edited(field: FieldName, markTouched: boolean) {
    setServerErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
    setFormError(null);
    if (markTouched) setTouched((current) => (current[field] ? current : { ...current, [field]: true }));
  }

  function blurred(field: FieldName) {
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return; // double click / double Enter
    setSubmitAttempted(true);

    const firstInvalid = FIELD_ORDER.find((field) => clientErrors[field]);
    if (firstInvalid || formIssues.length > 0) {
      setFormError(!firstInvalid && formIssues.length > 0 ? formIssues[0].message : CHECK_FIELDS_MESSAGE);
      requestFocus(firstInvalid ? FIELD_IDS[firstInvalid] : FORM_ALERT_ID);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    setServerErrors({});
    try {
      const created = await createLeaveRequest({
        leave_type: leaveType as LeaveTypeCode,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
        client_request_id: clientRequestId,
      });
      toast({
        variant: "success",
        message: `Leave request submitted: ${formatDays(created.working_days)} of ${leaveTypeName(created.leave_type, typeList)}, waiting for approval.`,
      });
      // Stay in the submitting state until the details page replaces this form.
      router.push(`/leave/${created.id}`);
    } catch (error) {
      submittingRef.current = false;
      setSubmitting(false);
      if (error instanceof NotAvailableError) {
        setFormError(`${error.feature} isn't available yet (${error.card}). Try again once the backend is released.`);
        requestFocus(FORM_ALERT_ID);
        return;
      }
      const known: FieldErrors = {};
      const other: string[] = [];
      for (const [field, message] of Object.entries(firstFieldErrors(error))) {
        if (isFieldName(field)) known[field] = message;
        else other.push(message);
      }
      setServerErrors(known);
      const summary = submitErrorMessage(error);
      const hasKnown = Object.keys(known).length > 0;
      setFormError(
        [summary === CHECK_FIELDS_MESSAGE && !hasKnown ? null : summary, ...other].filter(Boolean).join(" ") ||
          summary,
      );
      const firstServer = FIELD_ORDER.find((field) => known[field]);
      requestFocus(firstServer ? FIELD_IDS[firstServer] : FORM_ALERT_ID);
      // The balance may have changed (e.g. another tab); refresh the preview.
      balances.reload();
    }
  }

  if (types.status === "loading" && !types.data) {
    return (
      <>
        <Header />
        <Card padding="lg" className={styles.card} aria-busy="true">
          <span className="visually-hidden" role="status">
            Loading the leave form…
          </span>
          <Skeleton variant="text" width="8rem" />
          <Skeleton variant="rect" height="2.75rem" />
          <div className={styles.dates}>
            <Skeleton variant="rect" height="2.75rem" />
            <Skeleton variant="rect" height="2.75rem" />
          </div>
          <Skeleton variant="rect" height="6rem" />
          <Skeleton variant="rect" height="7rem" />
        </Card>
      </>
    );
  }

  const endMin = parseISODate(startDate) && startDate > today ? startDate : today;
  const endMax = parseISODate(startDate) ? `${yearOf(startDate)}-12-31` : undefined;

  return (
    <>
      <Header />
      <Card padding="lg" className={styles.card}>
        <form
          className={styles.form}
          noValidate
          onSubmit={handleSubmit}
          aria-busy={submitting || undefined}
          aria-label="Apply for leave"
          data-testid="leave-apply-form"
        >
          {formError && (
            <Alert variant="error" id={FORM_ALERT_ID} tabIndex={-1} data-testid="leave-apply-error">
              {formError}
            </Alert>
          )}

          {balances.status === "error" && (
            <Alert
              variant="warning"
              title="Your leave balance couldn't be loaded"
              action={
                <Button variant="secondary" size="sm" iconStart="refresh" onClick={balances.reload}>
                  Try again
                </Button>
              }
              data-testid="leave-apply-balance-error"
            >
              You can still submit; the server checks your balance.
            </Alert>
          )}

          {balance && balance.allowance === 0 && typeName && (
            <Alert variant="warning" live="polite" data-testid="no-allowance">
              You have no {typeName} allowance for {balance.year}. Contact your administrator before applying
              for this leave type.
            </Alert>
          )}

          <Select
            id={FIELD_IDS.leave_type}
            label="Leave type"
            required
            placeholder="Choose a leave type"
            value={leaveType}
            options={typeList.map((type) => ({ value: type.code, label: type.name }))}
            hint={
              balance && typeName
                ? `${balance.available} of ${formatDays(balance.allowance)} available in ${balance.year}.`
                : undefined
            }
            error={errorFor("leave_type")}
            disabled={submitting}
            onChange={(event) => {
              setLeaveType(event.target.value as LeaveTypeCode);
              edited("leave_type", true);
            }}
            onBlur={() => blurred("leave_type")}
          />

          <div className={styles.dates}>
            <DateField
              id={FIELD_IDS.start_date}
              label="Start date"
              required
              value={startDate}
              min={today}
              hint={`Dates use India Standard Time (today is ${formatDate(today)}).`}
              error={errorFor("start_date")}
              disabled={submitting}
              onChange={(event) => {
                setStartDate(event.target.value);
                edited("start_date", event.target.value !== "");
              }}
              onBlur={() => blurred("start_date")}
            />
            <DateField
              id={FIELD_IDS.end_date}
              label="End date"
              required
              value={endDate}
              min={endMin}
              max={endMax}
              hint="Inclusive, in the same calendar year as the start date."
              error={errorFor("end_date")}
              disabled={submitting}
              onChange={(event) => {
                setEndDate(event.target.value);
                edited("end_date", event.target.value !== "");
              }}
              onBlur={() => blurred("end_date")}
            />
          </div>

          <WorkingDayPreview
            start={startDate}
            end={endDate}
            preview={preview}
            leaveTypeName={typeName}
            balance={balance}
            balanceState={balanceState}
            serverMessages={serverMessages}
          />

          <Textarea
            id={FIELD_IDS.reason}
            label="Reason"
            required
            value={reason}
            maxLength={REASON_MAX_LENGTH}
            showCount
            hint="A short explanation for the approver."
            error={errorFor("reason")}
            disabled={submitting}
            onChange={(event) => {
              setReason(event.target.value);
              edited("reason", false);
            }}
            onBlur={() => blurred("reason")}
            data-testid="leave-reason"
          />

          <div className={styles.actions}>
            <Button
              type="submit"
              loading={submitting}
              loadingText="Submitting…"
              data-testid="leave-apply-submit"
            >
              Submit request
            </Button>
            <ButtonLink href="/leave" variant="ghost">
              Cancel
            </ButtonLink>
          </div>
        </form>
      </Card>
    </>
  );
}
