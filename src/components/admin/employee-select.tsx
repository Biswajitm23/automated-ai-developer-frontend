"use client";

import { Select, type SelectProps } from "@/components/ui/select";
import { listEmployeeOptions } from "@/lib/services/admin-employees";
import type { Employee } from "@/lib/services/types";
import { useAsync, type AsyncResult } from "@/lib/use-async";

/** Loads every employee (active and inactive) once, for employee selects. */
export function useEmployeeOptions(): AsyncResult<Employee[]> {
  return useAsync((signal) => listEmployeeOptions(signal), []);
}

/** "Priya Nair (inactive)"; the suffix is text, not colour. */
export function employeeOptionLabel(employee: Pick<Employee, "full_name" | "is_active">): string {
  return employee.is_active ? employee.full_name : `${employee.full_name} (inactive)`;
}

export type EmployeeSelectProps = Omit<SelectProps, "options" | "value" | "onChange" | "placeholder"> & {
  /** Result of useEmployeeOptions(), owned by the page so it can use the list too. */
  employees: AsyncResult<Employee[]>;
  value: number | undefined;
  onChange: (id: number | undefined) => void;
  /** Label of the empty option, e.g. "All employees" (selectable) or "Choose an employee". */
  emptyLabel: string;
  /** When true the empty option can be chosen again (filters); otherwise it is a placeholder. */
  allowEmpty?: boolean;
};

/**
 * Native select of employees, sorted by name, with "(inactive)" after
 * inactive ones. While loading, or if the list fails, the select still shows
 * the chosen id so the URL state is never lost.
 */
export function EmployeeSelect({
  employees,
  value,
  onChange,
  emptyLabel,
  allowEmpty = false,
  hint,
  error,
  disabled,
  ...props
}: EmployeeSelectProps) {
  const list = employees.data ?? [];
  const options = [...list]
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "en", { sensitivity: "base" }) || a.id - b.id)
    .map((employee) => ({ value: String(employee.id), label: employeeOptionLabel(employee) }));

  if (value !== undefined && !options.some((option) => option.value === String(value))) {
    options.unshift({
      value: String(value),
      label: employees.status === "loading" ? `Employee #${value} (loading…)` : `Employee #${value}`,
    });
  }

  let statusHint = hint;
  let statusError = error;
  if (employees.status === "loading" && list.length === 0) statusHint = "Loading employees…";
  else if (employees.status === "error") statusError = error ?? "Could not load the employee list.";
  else if (employees.status === "not-available") statusHint = `${employees.feature} isn't available yet.`;

  return (
    <Select
      {...props}
      hint={statusHint}
      error={statusError}
      disabled={disabled}
      value={value === undefined ? "" : String(value)}
      options={allowEmpty ? [{ value: "", label: emptyLabel }, ...options] : options}
      placeholder={allowEmpty ? undefined : emptyLabel}
      onChange={(event) => {
        const raw = event.target.value;
        onChange(/^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : undefined);
      }}
    />
  );
}
