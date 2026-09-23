"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { ErrorText, fieldStyles, joinIds } from "@/components/ui/form-field";
import tableStyles from "@/components/ui/responsive-table.module.css";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, formatDays, leaveTypeName } from "@/lib/format";
import { setAllowance } from "@/lib/services/admin-allowances";
import { NotAvailableError, firstFieldErrors, isNotFound, submitErrorMessage } from "@/lib/services/errors";
import { LEAVE_TYPE_CODES, type Allowance, type LeaveType } from "@/lib/services/types";
import styles from "./allowance-table.module.css";

/** Whole days per leave type and year (docs/ui-design.md §9 assumption 6). */
export const ALLOWANCE_MAX_DAYS = 366;

/**
 * Client-side check of an allowance entry. The server repeats every rule
 * (§6.2) and its message wins; this only saves a round trip.
 */
export function validateAllowance(raw: string, minimum: number): string | null {
  const value = raw.trim();
  if (value === "") return "Enter the number of days (0 or more).";
  if (value.startsWith("-")) return "Allowance cannot be negative.";
  if (!/^\d+$/.test(value)) return "Enter a whole number of days.";
  const days = Number(value);
  if (days > ALLOWANCE_MAX_DAYS) return `Enter ${ALLOWANCE_MAX_DAYS} days or fewer.`;
  if (days < minimum) {
    return `Allowance cannot be less than approved plus pending leave (${formatDays(minimum)}).`;
  }
  return null;
}

export type AllowanceTableProps = {
  employeeId: number;
  employeeName: string;
  year: number;
  rows: Allowance[];
  leaveTypes?: LeaveType[] | null;
  /** The server saved a row; the parent replaces it. */
  onSaved: (row: Allowance) => void;
  testId?: string;
};

/**
 * One row per leave type with an inline number input and a per-row Save, so
 * each save is atomic and its error belongs to one row. Stacks as cards below
 * 768 px (the ResponsiveTable styles). Rows are not in a <form> (invalid
 * inside a table): Enter in the input saves that row.
 */
export function AllowanceTable({
  employeeId,
  employeeName,
  year,
  rows,
  leaveTypes,
  onSaved,
  testId = "allowance-table",
}: AllowanceTableProps) {
  const sorted = [...rows].sort(
    (a, b) => LEAVE_TYPE_CODES.indexOf(a.leave_type) - LEAVE_TYPE_CODES.indexOf(b.leave_type),
  );
  return (
    <div className={tableStyles.wrapper}>
      <table className={tableStyles.table} data-testid={testId}>
        <caption className={tableStyles.caption}>
          Annual allowances for <span className={styles.name}>{employeeName}</span>, {year}
        </caption>
        <thead>
          <tr>
            <th scope="col">Leave type</th>
            <th scope="col">Allowance (days)</th>
            <th scope="col" className={tableStyles.end}>
              Approved (used)
            </th>
            <th scope="col" className={tableStyles.end}>
              Pending (reserved)
            </th>
            <th scope="col" className={tableStyles.end}>
              Available
            </th>
            <th scope="col">Save</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <AllowanceRow
              key={row.leave_type}
              row={row}
              typeName={leaveTypeName(row.leave_type, leaveTypes)}
              employeeId={employeeId}
              year={year}
              onSaved={onSaved}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

type RowProps = {
  row: Allowance;
  typeName: string;
  employeeId: number;
  year: number;
  onSaved: (row: Allowance) => void;
};

function AllowanceRow({ row, typeName, employeeId, year, onSaved }: RowProps) {
  const { toast } = useToast();
  const [draft, setDraft] = useState(String(row.days));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [focusSeq, setFocusSeq] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (focusSeq > 0) inputRef.current?.focus();
  }, [focusSeq]);

  const code = row.leave_type;
  const inputId = `allowance-${code}`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const notSet = row.updated_at === null;
  const dirty = draft.trim() !== String(row.days);
  const canSave = dirty || notSet;

  async function save() {
    if (savingRef.current || !canSave) return;
    const problem = validateAllowance(draft, row.minimum_allowed);
    if (problem) {
      setError(problem);
      setSavedMessage(null);
      setFocusSeq((seq) => seq + 1);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      // The server enforces the admin role and the "not below approved +
      // pending" rule again inside a transaction; this UI is not security.
      const updated = await setAllowance(employeeId, year, code, Number(draft.trim()));
      setDraft(String(updated.days));
      const message = `Saved. ${typeName} allowance for ${year} is ${formatDays(updated.days)}; ${formatDays(updated.available)} available.`;
      setSavedMessage(message);
      onSaved(updated);
      toast({ variant: "success", message });
    } catch (caught) {
      let message: string;
      if (caught instanceof NotAvailableError) {
        message = `${caught.feature} isn't available yet (${caught.card}).`;
      } else if (isNotFound(caught)) {
        message = "This employee or leave type could not be found any more. Reload the page.";
      } else {
        const fields = firstFieldErrors(caught);
        message = fields.days ?? Object.values(fields)[0] ?? submitErrorMessage(caught);
      }
      setError(message);
      setFocusSeq((seq) => seq + 1);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void save();
    }
  }

  return (
    <tr data-testid={`allowance-row-${code}`} data-days={row.days} data-available={row.available}>
      <td className={tableStyles.primary} data-label="Leave type">
        <span className={styles.typeName}>{typeName}</span>
        {notSet && (
          <span className={styles.notSet} data-testid="allowance-not-set">
            No allowance set
          </span>
        )}
        {row.updated_at && (
          <span className={styles.updated}>Updated {formatDateTime(row.updated_at)}</span>
        )}
      </td>
      <td data-label="Allowance (days)">
        <div className={styles.inputCell}>
          <label htmlFor={inputId} className="visually-hidden">
            {typeName} allowance for {year}, in days
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={`${fieldStyles.control} ${styles.input}`}
            value={draft}
            disabled={saving}
            aria-invalid={error ? true : undefined}
            aria-describedby={joinIds(hintId, error ? errorId : null)}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
              setSavedMessage(null);
            }}
            onKeyDown={handleKeyDown}
            data-testid={`allowance-input-${code}`}
          />
          <p id={hintId} className={styles.hint}>
            Whole days, {row.minimum_allowed}–{ALLOWANCE_MAX_DAYS}. Minimum = approved + pending (
            {formatDays(row.minimum_allowed)}).
          </p>
          {error && <ErrorText id={errorId}>{error}</ErrorText>}
        </div>
      </td>
      <td className={tableStyles.end} data-label="Approved (used)">
        {formatDays(row.approved)}
      </td>
      <td className={tableStyles.end} data-label="Pending (reserved)">
        {formatDays(row.pending)}
      </td>
      <td className={tableStyles.end} data-label="Available" data-testid={`allowance-available-${code}`}>
        {formatDays(row.available)}
      </td>
      <td data-label="Save">
        <div className={styles.actionCell}>
          <Button
            size="sm"
            variant={canSave ? "primary" : "secondary"}
            loading={saving}
            loadingText="Saving…"
            disabled={!canSave}
            onClick={() => void save()}
            data-testid={`allowance-save-${code}`}
          >
            Save<span className="visually-hidden"> {typeName} allowance</span>
          </Button>
          <p className={styles.saved} role="status" data-testid={`allowance-saved-${code}`}>
            {savedMessage}
          </p>
        </div>
      </td>
    </tr>
  );
}
