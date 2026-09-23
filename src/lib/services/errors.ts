import { ApiError, NETWORK_ERROR_MESSAGE } from "@/lib/api";

/** The endpoint group is not implemented by the backend yet and the mock is off. */
export class NotAvailableError extends Error {
  readonly feature: string;
  readonly card: string;

  constructor(feature: string, card: string) {
    super(`${feature} is not available yet.`);
    this.name = "NotAvailableError";
    this.feature = feature;
    this.card = card;
  }
}

export const CSRF_REJECTED_MESSAGE =
  "Your request was rejected for security reasons. Reload the page and try again.";
export const TOO_MANY_REQUESTS_MESSAGE = "Too many requests. Wait a minute and try again.";
export const CHECK_FIELDS_MESSAGE = "Check the highlighted fields.";

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.isForbidden && !isCsrfFailure(error);
}

export function isConflict(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 409;
}

export function isCsrfFailure(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    typeof error.detail === "string" &&
    error.detail.startsWith("CSRF Failed")
  );
}

/**
 * Message for a failed *load* (GET) — see docs/ui-design.md §5.3.
 * `what` is a noun phrase such as "your leave requests".
 */
export function loadErrorMessage(error: unknown, what: string): string {
  if (!(error instanceof ApiError)) return `Could not load ${what}. Try again.`;
  if (error.isNetworkError) return NETWORK_ERROR_MESSAGE;
  if (error.status === 429) return TOO_MANY_REQUESTS_MESSAGE;
  if (error.status >= 500) return `Could not load ${what} (error ${error.status}).`;
  return error.detail ?? `Could not load ${what} (error ${error.status}).`;
}

/**
 * Form-level message for a failed *change* (POST/PUT/PATCH). Field errors are
 * shown under their fields; this returns the summary for the form Alert.
 */
export function submitErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Try again.";
  if (error.isNetworkError) return NETWORK_ERROR_MESSAGE;
  if (isCsrfFailure(error)) return CSRF_REJECTED_MESSAGE;
  if (error.status === 429) return TOO_MANY_REQUESTS_MESSAGE;
  if (error.status >= 500) return `Something went wrong on the server (error ${error.status}). Try again.`;
  if (error.status === 400) {
    if (error.detail) return error.detail;
    if (Object.keys(error.fieldErrors).length > 0) return CHECK_FIELDS_MESSAGE;
  }
  return error.detail ?? `The request failed (error ${error.status}). Try again.`;
}

/** First message per field, for forms: `{ start_date: "Start date cannot be in the past." }`. */
export function firstFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    if (messages[0]) result[field] = messages[0];
  }
  return result;
}
