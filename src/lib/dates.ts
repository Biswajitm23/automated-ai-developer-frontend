/**
 * Calendar-date helpers and the working-day preview (docs/ui-design.md §7).
 *
 * Pure functions with no dependencies. Plain dates are "YYYY-MM-DD" strings
 * handled as UTC midnight, so the browser's time zone and DST never shift
 * them. "Today" is always the calendar date in Asia/Kolkata.
 *
 * The backend is authoritative: the preview only guides the user.
 */

import type { ISODate, ISODateTime } from "./services/types";

export const APP_TIME_ZONE = "Asia/Kolkata";
/** Asia/Kolkata has no DST: always UTC+05:30. */
const APP_ZONE_OFFSET_MINUTES = 330;
const APP_ZONE_OFFSET_LABEL = "+05:30";

const DAY_MS = 86_400_000;

const todayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's calendar date in Asia/Kolkata as "YYYY-MM-DD", regardless of the browser's zone. */
export function todayInAppZone(now: Date = new Date()): ISODate {
  // en-CA formats as YYYY-MM-DD.
  return todayFormatter.format(now);
}

/** The current year in Asia/Kolkata. */
export function currentYearInAppZone(now: Date = new Date()): number {
  return Number(todayInAppZone(now).slice(0, 4));
}

/** Strict parse of "YYYY-MM-DD" to a UTC-midnight Date (no local-zone or DST effects). */
export function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [y, mo, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  // Rejects dates such as 2026-02-30 that Date.UTC would roll over.
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d
    ? date
    : null;
}

/** UTC-midnight Date → "YYYY-MM-DD". */
export function toISODate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

/** Adds calendar days to an ISO date. Throws on an invalid date. */
export function addDays(value: ISODate, days: number): ISODate {
  const date = parseISODate(value);
  if (!date) throw new RangeError(`Invalid date: ${value}`);
  return toISODate(new Date(date.getTime() + days * DAY_MS));
}

export function isWeekend(value: ISODate | Date): boolean {
  const date = typeof value === "string" ? parseISODate(value) : value;
  if (!date) return false;
  const dow = date.getUTCDay();
  return dow === 0 || dow === 6;
}

/** The given date if it is Mon–Fri, otherwise the next Monday. */
export function nextWorkingDay(value: ISODate): ISODate {
  let current = value;
  while (isWeekend(current)) current = addDays(current, 1);
  return current;
}

/** The given date if it is Mon–Fri, otherwise the previous Friday. */
export function previousWorkingDay(value: ISODate): ISODate {
  let current = value;
  while (isWeekend(current)) current = addDays(current, -1);
  return current;
}

/**
 * Moves by `count` working days (Mon–Fri). Positive goes forward, negative
 * backward; 0 returns the nearest working day on or after `value`.
 */
export function addWorkingDays(value: ISODate, count: number): ISODate {
  let current = count >= 0 ? nextWorkingDay(value) : previousWorkingDay(value);
  const step = count >= 0 ? 1 : -1;
  for (let moved = 0; moved < Math.abs(count); ) {
    current = addDays(current, step);
    if (!isWeekend(current)) moved++;
  }
  return current;
}

/** Year of an ISO date string. */
export function yearOf(value: ISODate): number {
  return Number(value.slice(0, 4));
}

/** Mon–Fri days in [start, end], inclusive. O(1). Returns 0 if end < start. */
export function countWorkingDays(start: Date, end: Date): number {
  const total = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  if (total <= 0) return 0;
  const fullWeeks = Math.floor(total / 7);
  let count = fullWeeks * 5;
  const startDow = start.getUTCDay(); // 0 = Sun … 6 = Sat
  for (let i = 0; i < total % 7; i++) {
    const dow = (startDow + i) % 7;
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

/** Calendar days in [start, end], inclusive (0 if end < start). */
export function countCalendarDays(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1);
}

/** Do the inclusive ranges [aStart, aEnd] and [bStart, bEnd] share a day? */
export function rangesOverlap(aStart: ISODate, aEnd: ISODate, bStart: ISODate, bEnd: ISODate): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

/**
 * The current instant as ISO 8601 in Asia/Kolkata ("2026-09-23T14:32:10+05:30"),
 * or `date` if given. Used for timestamps the mock creates.
 */
export function toAppZoneDateTime(date: Date = new Date()): ISODateTime {
  const shifted = new Date(date.getTime() + APP_ZONE_OFFSET_MINUTES * 60_000);
  return `${shifted.toISOString().slice(0, 19)}${APP_ZONE_OFFSET_LABEL}`;
}

/** Builds an Asia/Kolkata datetime from a plain date and a wall-clock time. */
export function appZoneDateTime(day: ISODate, hour: number, minute = 0): ISODateTime {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${day}T${hh}:${mm}:00${APP_ZONE_OFFSET_LABEL}`;
}

// ---------------------------------------------------------------------------
// Working-day preview

export type PreviewIssue =
  | "start-missing"
  | "end-missing"
  | "start-invalid"
  | "end-invalid"
  | "start-in-past"
  | "end-before-start"
  | "spans-years"
  | "no-working-days"
  | "exceeds-balance";

export type PreviewIssueField = "start_date" | "end_date" | "form";

export type LeavePreview = {
  workingDays: number; // 0 when invalid
  calendarDays: number;
  weekendDays: number;
  issues: { field: PreviewIssueField; code: PreviewIssue; message: string }[];
  availableAfter: number | null; // available - workingDays, when a balance is known
};

export const PREVIEW_MESSAGES = {
  startMissing: "Choose a start date.",
  endMissing: "Choose an end date.",
  startInvalid: "Enter a valid start date.",
  endInvalid: "Enter a valid end date.",
  startInPast: "Start date cannot be in the past.",
  endBeforeStart: "End date must be on or after the start date.",
  spansYears: "Leave cannot span two calendar years. Submit a separate request for each year.",
  noWorkingDays: "The selected dates contain no working days (Monday to Friday).",
} as const;

export function exceedsBalanceMessage(leaveTypeName: string, requested: number, available: number): string {
  return `Not enough ${leaveTypeName}: ${requested} working ${requested === 1 ? "day" : "days"} requested, ${available} available.`;
}

/**
 * Client-side pre-check of a leave range. Stops at the first issue for each
 * field. Overlap with other requests is not checked (the server does that).
 */
export function previewLeave(input: {
  start: string;
  end: string;
  available?: number | null;
  leaveTypeName?: string;
  today?: ISODate;
}): LeavePreview {
  const today = input.today ?? todayInAppZone();
  const issues: LeavePreview["issues"] = [];
  // weekendDays is only meaningful for a valid range (0 otherwise).
  const result = (workingDays = 0, calendarDays = 0): LeavePreview => ({
    workingDays,
    calendarDays,
    weekendDays: workingDays > 0 ? calendarDays - workingDays : 0,
    issues,
    availableAfter: null,
  });

  // 1. Presence and format.
  const start = input.start ? parseISODate(input.start) : null;
  const end = input.end ? parseISODate(input.end) : null;
  if (!input.start) {
    issues.push({ field: "start_date", code: "start-missing", message: PREVIEW_MESSAGES.startMissing });
  } else if (!start) {
    issues.push({ field: "start_date", code: "start-invalid", message: PREVIEW_MESSAGES.startInvalid });
  }
  if (!input.end) {
    issues.push({ field: "end_date", code: "end-missing", message: PREVIEW_MESSAGES.endMissing });
  } else if (!end) {
    issues.push({ field: "end_date", code: "end-invalid", message: PREVIEW_MESSAGES.endInvalid });
  }

  // 2. Start in the past (ISO strings compare correctly as text).
  if (start && input.start < today) {
    issues.push({ field: "start_date", code: "start-in-past", message: PREVIEW_MESSAGES.startInPast });
  }
  if (!start || !end) return result();

  // 3. Reversed range.
  if (input.end < input.start) {
    issues.push({ field: "end_date", code: "end-before-start", message: PREVIEW_MESSAGES.endBeforeStart });
    return result();
  }

  const calendarDays = countCalendarDays(start, end);

  // 4. Across two calendar years.
  if (start.getUTCFullYear() !== end.getUTCFullYear()) {
    issues.push({ field: "form", code: "spans-years", message: PREVIEW_MESSAGES.spansYears });
    return result(0, calendarDays);
  }

  // 5. At least one working day.
  const workingDays = countWorkingDays(start, end);
  if (workingDays === 0) {
    issues.push({ field: "form", code: "no-working-days", message: PREVIEW_MESSAGES.noWorkingDays });
    return result(0, calendarDays);
  }

  // Errors on the start field (in the past) still make the preview invalid.
  if (issues.length > 0) return result(0, calendarDays);

  // 6. Balance, when known.
  const available = input.available ?? null;
  if (available !== null && workingDays > available) {
    issues.push({
      field: "form",
      code: "exceeds-balance",
      message: exceedsBalanceMessage(input.leaveTypeName ?? "leave", workingDays, available),
    });
    return { ...result(0, calendarDays), availableAfter: available - workingDays };
  }

  // 7. Valid.
  return {
    ...result(workingDays, calendarDays),
    availableAfter: available === null ? null : available - workingDays,
  };
}
