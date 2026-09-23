"use client";

import { useMemo, useState } from "react";
import { AllowanceTable } from "@/components/admin/allowance-table";
import { EmployeeSelect, useEmployeeOptions } from "@/components/admin/employee-select";
import { yearSelectOptions } from "@/components/leave/year-options";
import { LoadError } from "@/components/states/load-error";
import { NotAvailableState } from "@/components/states/not-available-state";
import { NotFoundPanel } from "@/components/states/not-found-panel";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { currentYearInAppZone } from "@/lib/dates";
import { getAllowances } from "@/lib/services/admin-allowances";
import { isNotFound } from "@/lib/services/errors";
import { listLeaveTypes } from "@/lib/services/leave-types";
import type { Allowance, Employee, LeaveType, LeaveTypeCode } from "@/lib/services/types";
import { useAsync } from "@/lib/use-async";
import { urlParam, useUrlState } from "@/lib/use-url-state";
import styles from "../admin.module.css";

/** Built per current year, so a tab left open across New Year (IST) stays right. */
function buildSchema(currentYear: number) {
  return {
    employee: urlParam.id(),
    year: urlParam.year(currentYear),
  };
}

/**
 * /admin/allowances?employee=&year=: annual allowance per leave type for one
 * employee and year (ELM-003/004). The chosen employee and year live in the
 * URL, so the page can be linked from the employee page.
 */
export default function AllowanceManager() {
  // Computed on each render (not at module load), so it follows the IST date.
  const currentYear = currentYearInAppZone();
  const schema = useMemo(() => buildSchema(currentYear), [currentYear]);
  const [{ employee: employeeId, year }, setUrl] = useUrlState(schema);
  const employees = useEmployeeOptions();
  const types = useAsync((signal) => listLeaveTypes(signal), []);
  const leaveTypes = types.status === "success" ? types.data : null;

  const chosen = employees.data?.find((item) => item.id === employeeId) ?? null;

  return (
    <>
      <PageHeader
        title="Allowances"
        description="Annual leave allowance per employee, leave type and year, in whole working days. An allowance can't go below the days already approved or pending."
      />

      <div className={styles.selectors} data-testid="allowance-selectors">
        <EmployeeSelect
          label="Employee"
          employees={employees}
          value={employeeId}
          onChange={(id) => setUrl({ employee: id })}
          emptyLabel="Choose an employee"
          data-testid="allowance-employee"
        />
        <Select
          label="Year"
          value={String(year)}
          options={yearSelectOptions(year, currentYear)}
          onChange={(event) => setUrl({ year: Number(event.target.value) })}
          data-testid="allowance-year"
        />
      </div>

      {employees.status === "error" && (
        <LoadError error={employees.error} onRetry={employees.reload} what="the employee list" />
      )}

      {renderBody()}
    </>
  );

  function renderBody() {
    if (employees.status === "not-available") {
      return <NotAvailableState feature={employees.feature} card={employees.card} />;
    }
    if (employeeId === undefined) {
      if (employees.status === "success" && employees.data.length === 0) {
        return (
          <EmptyState
            icon="users"
            title="No employees yet"
            description="Add an employee first; then set their leave allowances here."
            action={
              <ButtonLink href="/admin/employees/new" iconStart="plus">
                Add employee
              </ButtonLink>
            }
            data-testid="allowances-no-employees"
          />
        );
      }
      return (
        <EmptyState
          icon="sliders"
          title="Choose an employee"
          description={`Pick an employee above to see and change their allowances for ${year}.`}
          data-testid="allowances-choose-employee"
        />
      );
    }
    return (
      <AllowancePanel
        // A new employee or year starts with fresh rows and row state.
        key={`${employeeId}-${year}`}
        employeeId={employeeId}
        employee={chosen}
        year={year}
        leaveTypes={leaveTypes}
      />
    );
  }
}

type PanelProps = {
  employeeId: number;
  employee: Employee | null;
  year: number;
  leaveTypes: LeaveType[] | null;
};

function AllowancePanel({ employeeId, employee, year, leaveTypes }: PanelProps) {
  const state = useAsync((signal) => getAllowances(employeeId, year, signal), [employeeId, year]);
  // Rows saved in this session replace the loaded ones, but only on top of the
  // response they were saved against: a reload brings fresh server rows, which
  // already include those saves, so the overrides are dropped then.
  const [saved, setSaved] = useState<{
    base: unknown;
    rows: Partial<Record<LeaveTypeCode, Allowance>>;
  }>({ base: null, rows: {} });

  if (state.status === "not-available") {
    return <NotAvailableState feature={state.feature} card={state.card} />;
  }
  if (state.status === "error" && isNotFound(state.error)) {
    return (
      <NotFoundPanel
        what="employee"
        backHref="/admin/allowances"
        backLabel="Choose another employee"
        description="We couldn't find this employee. Choose another employee from the list."
      />
    );
  }
  if (state.status === "error") {
    return <LoadError error={state.error} onRetry={state.reload} what="the allowances" />;
  }
  if (!state.data) return <TableSkeleton rows={2} columns={5} label="Loading allowances…" />;

  const base = state.data;
  const overrides = saved.base === base ? saved.rows : {};
  const rows = base.allowances.map((row) => overrides[row.leave_type] ?? row);
  const name = employee?.full_name ?? `Employee #${employeeId}`;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="inbox"
        title="No leave types"
        description="No leave types have been set up yet."
        action={
          <Button variant="secondary" iconStart="refresh" onClick={state.reload}>
            Try again
          </Button>
        }
      />
    );
  }

  const noneSet = rows.every((row) => row.updated_at === null);

  return (
    <div className={styles.stack} aria-busy={state.status === "loading" || undefined}>
      {employee && !employee.is_active && (
        <Alert variant="info" data-testid="allowances-inactive-employee">
          <span className={styles.wrap}>{name}</span> is inactive. Allowances can still be changed; they apply if
          the employee is reactivated.
        </Alert>
      )}
      {noneSet && (
        <Alert variant="warning" title={`No allowance set for ${year}`} data-testid="allowances-none-set">
          <span className={styles.wrap}>{name}</span> has no allowances for {year} yet, so they can&apos;t apply
          for leave in that year. Enter the days for each leave type and save.
        </Alert>
      )}
      <AllowanceTable
        employeeId={employeeId}
        employeeName={name}
        year={year}
        rows={rows}
        leaveTypes={leaveTypes}
        onSaved={(row) =>
          setSaved((current) => ({
            base,
            rows: { ...(current.base === base ? current.rows : {}), [row.leave_type]: row },
          }))
        }
        onStale={state.reload}
      />
    </div>
  );
}
