"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDateRange, formatDays } from "@/lib/format";
import { approveRequest, rejectRequest } from "@/lib/services/admin-requests";
import {
  NOT_AVAILABLE_ACTION_MESSAGE,
  NotAvailableError,
  firstFieldErrors,
  isConflict,
  isNotFound,
  submitErrorMessage,
} from "@/lib/services/errors";
import { REMARKS_MAX_LENGTH, type LeaveRequest } from "@/lib/services/types";
import styles from "../../admin.module.css";

export type Decision = "approve" | "reject";

export const REMARKS_REQUIRED_MESSAGE = "Enter remarks explaining why the request is rejected.";
const REMARKS_TOO_LONG_MESSAGE = `Remarks must be ${REMARKS_MAX_LENGTH} characters or fewer.`;

export type DecisionDialogProps = {
  open: boolean;
  decision: Decision;
  request: LeaveRequest;
  leaveTypeName: string;
  onClose: () => void;
  /** The server recorded the decision; `updated` is the decided request. */
  onDone: (updated: LeaveRequest) => void;
  /**
   * The request changed on the server (409: already decided, cancelled, or
   * the balance no longer allows approval; or 404). The parent closes the
   * dialog, shows `message` and reloads the request.
   */
  onConflict: (message: string) => void;
};

/**
 * ELM-007 decision confirmation. Remarks get initial focus; they are
 * required to reject and optional to approve (≤ 500 characters). The server
 * re-checks the status and balance in a transaction and records the reviewer
 * and time; this dialog is not the security boundary.
 */
export function DecisionDialog({
  open,
  decision,
  request,
  leaveTypeName,
  onClose,
  onDone,
  onConflict,
}: DecisionDialogProps) {
  const [remarks, setRemarks] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const remarksRef = useRef<HTMLTextAreaElement>(null);
  // Focus moves back to the remarks after an error, once they are enabled again.
  const [focusSeq, setFocusSeq] = useState(0);

  useEffect(() => {
    if (focusSeq > 0) remarksRef.current?.focus();
  }, [focusSeq]);

  const approving = decision === "approve";
  const formId = `decision-form-${request.id}`;

  function reset() {
    setRemarks("");
    setFieldError(null);
    setFormError(null);
  }

  function close() {
    if (pendingRef.current) return;
    reset();
    onClose();
  }

  function validate(value: string): string | null {
    if (!approving && !value.trim()) return REMARKS_REQUIRED_MESSAGE;
    if (value.trim().length > REMARKS_MAX_LENGTH) return REMARKS_TOO_LONG_MESSAGE;
    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current) return; // double click / double Enter
    const problem = validate(remarks);
    if (problem) {
      setFieldError(problem);
      setFormError(null);
      setFocusSeq((seq) => seq + 1);
      return;
    }
    pendingRef.current = true;
    setPending(true);
    setFieldError(null);
    setFormError(null);
    try {
      const trimmed = remarks.trim();
      const updated = approving ? await approveRequest(request.id, trimmed) : await rejectRequest(request.id, trimmed);
      pendingRef.current = false;
      setPending(false);
      reset();
      onDone(updated);
    } catch (error) {
      pendingRef.current = false;
      setPending(false);
      if (isConflict(error)) {
        reset();
        onConflict(error.detail ?? "This request has already been processed.");
        return;
      }
      if (isNotFound(error)) {
        reset();
        onConflict("This request could not be found any more.");
        return;
      }
      if (error instanceof NotAvailableError) {
        setFormError(NOT_AVAILABLE_ACTION_MESSAGE);
        setFocusSeq((seq) => seq + 1);
        return;
      }
      const fields = firstFieldErrors(error);
      if (fields.remarks) {
        setFieldError(fields.remarks);
        setFocusSeq((seq) => seq + 1);
        return;
      }
      setFormError(Object.values(fields)[0] ?? submitErrorMessage(error));
      setFocusSeq((seq) => seq + 1);
    }
  }

  const days = formatDays(request.working_days);

  return (
    <Dialog
      open={open}
      onClose={close}
      title={approving ? "Approve this leave request?" : "Reject this leave request?"}
      busy={pending}
      initialFocusRef={remarksRef}
      testId="decision-dialog"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            variant={approving ? "primary" : "danger"}
            loading={pending}
            loadingText={approving ? "Approving…" : "Rejecting…"}
            data-testid="decision-confirm"
          >
            {approving ? "Approve request" : "Reject request"}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className={styles.stack} aria-busy={pending || undefined}>
        <p className={styles.wrap}>
          <strong>{request.employee.full_name}</strong>: {leaveTypeName},{" "}
          {formatDateRange(request.start_date, request.end_date, { weekday: true })} ({days}).
        </p>
        <p>
          {approving
            ? `The ${days} move from Pending to Approved in the employee's balance.`
            : `The ${days} reserved for this request go back to the employee's balance.`}{" "}
          The employee sees the decision, your name, the time and your remarks.
        </p>

        {formError && (
          <Alert variant="error" data-testid="decision-error">
            {formError}
          </Alert>
        )}

        <Textarea
          ref={remarksRef}
          label="Remarks"
          required={!approving}
          showOptional={approving}
          hint={approving ? "Optional. Shown to the employee." : "Required. Tell the employee why."}
          value={remarks}
          maxLength={REMARKS_MAX_LENGTH}
          showCount
          error={fieldError}
          disabled={pending}
          onChange={(event) => {
            setRemarks(event.target.value);
            if (fieldError) setFieldError(null);
            if (formError) setFormError(null);
          }}
          data-testid="decision-remarks"
        />
      </form>
    </Dialog>
  );
}
