"use client";

import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/dialog";
import { formatDateRange, formatDays } from "@/lib/format";
import {
  NOT_AVAILABLE_ACTION_MESSAGE,
  NotAvailableError,
  isConflict,
  isNotFound,
  submitErrorMessage,
} from "@/lib/services/errors";
import { cancelLeaveRequest } from "@/lib/services/leave-requests";
import type { LeaveRequest } from "@/lib/services/types";

export type CancelRequestDialogProps = {
  open: boolean;
  request: LeaveRequest;
  leaveTypeName: string;
  onClose: () => void;
  /** The server cancelled it; `updated` has status CANCELLED. */
  onCancelled: (updated: LeaveRequest) => void;
  /**
   * The request changed on the server (409: no longer pending, or 404). The
   * dialog is closed by the parent, which shows `message` and reloads.
   */
  onConflict: (message: string) => void;
};

/** ELM-008: confirm before cancelling a pending request. Focus starts on "Keep request". */
export function CancelRequestDialog({
  open,
  request,
  leaveTypeName,
  onClose,
  onCancelled,
  onConflict,
}: CancelRequestDialogProps) {
  const [pending, setPending] = useState(false);
  // Synchronous double-submit guard, as in DecisionDialog (state lands a render later).
  const pendingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (pendingRef.current) return;
    setError(null);
    onClose();
  }

  async function confirm() {
    if (pendingRef.current) return; // double click / double Enter
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const updated = await cancelLeaveRequest(request.id);
      pendingRef.current = false;
      setPending(false);
      onCancelled(updated);
    } catch (caught) {
      pendingRef.current = false;
      setPending(false);
      if (isConflict(caught)) {
        onConflict(caught.detail ?? "This request can no longer be cancelled.");
        return;
      }
      if (isNotFound(caught)) {
        onConflict("This request could not be found any more.");
        return;
      }
      if (caught instanceof NotAvailableError) {
        setError(NOT_AVAILABLE_ACTION_MESSAGE);
        return;
      }
      setError(submitErrorMessage(caught));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={close}
      onConfirm={confirm}
      title="Cancel this leave request?"
      confirmLabel="Cancel request"
      cancelLabel="Keep request"
      pendingLabel="Cancelling…"
      tone="danger"
      pending={pending}
      error={error}
      testId="confirm-dialog"
    >
      <p>
        {leaveTypeName}, {formatDateRange(request.start_date, request.end_date, { weekday: true })} (
        {formatDays(request.working_days)}).
      </p>
      <p>
        The {formatDays(request.working_days)} reserved for this request go back to your balance. The request
        stays in your history as Cancelled. This cannot be undone.
      </p>
    </ConfirmDialog>
  );
}
