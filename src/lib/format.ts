/**
 * Display formatting (docs/ui-design.md §4.3). Month and weekday names come
 * from fixed tables instead of Intl, so output is identical on the server and
 * in every browser (no hydration mismatches, no "Sept" vs "Sep").
 */

import { APP_TIME_ZONE, parseISODate } from "./dates";
import type { ISODate, ISODateTime, LeaveType, LeaveTypeCode, RequestStatus } from "./services/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const LEAVE_TYPE_FALLBACK_NAMES: Record<LeaveTypeCode, string> = {
  CASUAL: "Casual Leave",
  SICK: "Sick Leave",
};

/** "2026-10-05" → "5 Oct 2026". Invalid input is returned unchanged. */
export function formatDate(value: ISODate, options: { weekday?: boolean } = {}): string {
  const date = parseISODate(value);
  if (!date) return value;
  const text = `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  return options.weekday ? `${WEEKDAYS[date.getUTCDay()]} ${text}` : text;
}

/**
 * "5 Oct – 7 Oct 2026", "28 Dec 2026 – 2 Jan 2027", or "5 Oct 2026" when both
 * dates are the same. With `weekday`: "Mon 5 Oct – Wed 7 Oct 2026".
 */
export function formatDateRange(start: ISODate, end: ISODate, options: { weekday?: boolean } = {}): string {
  const a = parseISODate(start);
  const b = parseISODate(end);
  if (!a || !b) return `${start} – ${end}`;
  if (start === end) return formatDate(start, options);
  const prefixA = options.weekday ? `${WEEKDAYS[a.getUTCDay()]} ` : "";
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  const left = `${prefixA}${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]}${sameYear ? "" : ` ${a.getUTCFullYear()}`}`;
  return `${left} – ${formatDate(end, options)}`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

/** ISO datetime → "5 Oct 2026, 14:32 IST" (always Asia/Kolkata). */
export function formatDateTime(value: ISODateTime | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts: Record<string, string> = {};
  for (const part of dateTimeFormatter.formatToParts(date)) parts[part.type] = part.value;
  const hour = parts.hour === "24" ? "00" : parts.hour.padStart(2, "0");
  return `${Number(parts.day)} ${MONTHS[Number(parts.month) - 1]} ${parts.year}, ${hour}:${parts.minute} IST`;
}

/** 1 → "1 day", 3 → "3 days". */
export function formatDays(n: number): string {
  return `${n} ${Math.abs(n) === 1 ? "day" : "days"}`;
}

/** Leave type name from the loaded types, falling back to the built-in names. */
export function leaveTypeName(code: LeaveTypeCode, types?: LeaveType[] | null): string {
  return types?.find((type) => type.code === code)?.name ?? LEAVE_TYPE_FALLBACK_NAMES[code] ?? code;
}

/** Initials for an avatar: "Priya Nair" → "PN", "admin" → "AD". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}
