"use client";

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Alert } from "./alert";
import { Button } from "./button";
import { IconButton } from "./icon-button";
import styles from "./dialog.module.css";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function focusableIn(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.getClientRects().length > 0,
  );
}

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Keep the title for screen readers only (the drawer uses this). */
  hideTitle?: boolean;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  variant?: "modal" | "drawer";
  /** Receives focus on open. Default: the first focusable element in the body. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Receives focus on close. Default: the element that had focus when it opened. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  closeOnBackdrop?: boolean;
  /** Extra element id(s) that describe the dialog, added to aria-describedby. */
  describedBy?: string;
  /** While true (a request is in flight) Esc, backdrop and the close button do nothing. */
  busy?: boolean;
  id?: string;
  testId?: string;
};

/**
 * Native <dialog> opened with showModal(): top layer, the rest of the page is
 * inert, and Tab is additionally wrapped inside the dialog. Esc and the close
 * button call onClose; focus returns to the trigger on close.
 */
export function Dialog({
  open,
  onClose,
  title,
  hideTitle = false,
  description,
  children,
  footer,
  variant = "modal",
  initialFocusRef,
  returnFocusRef,
  closeOnBackdrop = true,
  busy = false,
  describedBy,
  id,
  testId,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pointerDownOnBackdrop = useRef(false);
  const latest = useRef({ open, busy, onClose });
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    latest.current = { open, busy, onClose };
  }, [open, busy, onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Read at close time on purpose: the return target may mount after opening.
    const returnTarget = () => returnFocusRef?.current ?? trigger;
    const target =
      initialFocusRef?.current ?? focusableIn(bodyRef.current)[0] ?? focusableIn(dialog)[0];
    target?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      const back = returnTarget();
      if (back && back.isConnected) back.focus();
    };
  }, [open, initialFocusRef, returnFocusRef]);

  function requestClose() {
    if (!latest.current.busy) latest.current.onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape") {
      // Handle Esc ourselves so the parent state stays the source of truth.
      event.preventDefault();
      event.stopPropagation();
      requestClose();
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusableIn(dialogRef.current);
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      id={id}
      className={[styles.dialog, variant === "drawer" ? styles.drawer : styles.modal].join(" ")}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={[description ? descriptionId : null, describedBy].filter(Boolean).join(" ") || undefined}
      aria-busy={busy || undefined}
      data-testid={testId}
      onKeyDown={handleKeyDown}
      onCancel={(event) => {
        // Other close requests (e.g. the Android back gesture).
        event.preventDefault();
        requestClose();
      }}
      onClose={() => {
        // The browser closed it anyway: keep the parent's state in sync.
        if (latest.current.open) latest.current.onClose();
      }}
      onMouseDown={(event) => {
        pointerDownOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (closeOnBackdrop && pointerDownOnBackdrop.current && event.target === event.currentTarget) {
          requestClose();
        }
        pointerDownOnBackdrop.current = false;
      }}
    >
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <h2 id={titleId} className={hideTitle ? "visually-hidden" : styles.title}>
              {title}
            </h2>
            <IconButton
              icon="close"
              label="Close"
              className={styles.close}
              onClick={requestClose}
              disabled={busy}
            />
          </div>
          <div ref={bodyRef} className={styles.body}>
            {description && (
              <div id={descriptionId} className={styles.description}>
                {description}
              </div>
            )}
            {children}
          </div>
          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Text on the confirm button while pending (defaults to confirmLabel). */
  pendingLabel?: string;
  /** "danger": red confirm button and initial focus on Cancel. */
  tone?: "default" | "danger";
  pending?: boolean;
  /** Shown in an error Alert inside the dialog, which stays open. */
  error?: string | null;
  testId?: string;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  pendingLabel,
  tone = "default",
  pending = false,
  error = null,
  testId = "confirm-dialog",
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const contentId = useId();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      busy={pending}
      initialFocusRef={tone === "danger" ? cancelRef : undefined}
      describedBy={children ? contentId : undefined}
      testId={testId}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            loading={pending}
            loadingText={pendingLabel ?? confirmLabel}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {error && <Alert variant="error">{error}</Alert>}
      {children && (
        // The body text is the dialog's description for screen readers.
        <div id={contentId} className={styles.content}>
          {children}
        </div>
      )}
    </Dialog>
  );
}
