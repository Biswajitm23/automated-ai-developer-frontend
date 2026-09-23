"use client";

import Link from "next/link";
import { useEffect, useId } from "react";
import { LoadError } from "@/components/states/load-error";
import { NotAvailableState } from "@/components/states/not-available-state";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { ResponsiveTable, type TableColumn } from "@/components/ui/responsive-table";
import { Select } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchField } from "@/components/ui/text-field";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { listEmployees } from "@/lib/services/admin-employees";
import { isNotFound } from "@/lib/services/errors";
import { DEFAULT_PAGE_SIZE, type Employee, type EmployeeStatusFilter } from "@/lib/services/types";
import { useAsync } from "@/lib/use-async";
import { urlParam, useUrlState } from "@/lib/use-url-state";
import styles from "../admin.module.css";

const STATUS_VALUES: EmployeeStatusFilter[] = ["all", "active", "inactive"];

const SCHEMA = {
  q: urlParam.string(),
  status: urlParam.enum(STATUS_VALUES, "all"),
  page: urlParam.page(),
};

const STATUS_OPTIONS = [
  { value: "all", label: "All employees" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

const COLUMNS: TableColumn<Employee>[] = [
  {
    key: "name",
    header: "Name",
    primary: true,
    cell: (employee) => (
      <span className={styles.wrap}>
        <Link href={`/admin/employees/${employee.id}`} data-testid="employee-link">
          {employee.full_name}
          <VisuallyHidden>, edit employee</VisuallyHidden>
        </Link>
      </span>
    ),
  },
  {
    key: "email",
    header: "Email",
    cell: (employee) => <span className={styles.email}>{employee.email}</span>,
  },
  {
    key: "department",
    header: "Department",
    cell: (employee) => <span className={styles.wrap}>{employee.department}</span>,
  },
  {
    key: "username",
    header: "Username",
    hideOnMobile: true,
    cell: (employee) => <span className={styles.wrap}>{employee.username}</span>,
  },
  {
    key: "status",
    header: "Status",
    cell: (employee) => <StatusBadge active={employee.is_active} />,
  },
];

/** /admin/employees: search, active/inactive filter and pagination, all in the URL. */
export default function EmployeeListView() {
  const [{ q, status, page }, setUrl] = useUrlState(SCHEMA);
  const captionId = useId();

  const employees = useAsync(
    (signal) => listEmployees({ q: q || undefined, status, page, page_size: DEFAULT_PAGE_SIZE }, signal),
    [q, status, page],
  );

  // An out-of-range page is a DRF 404 "Invalid page."; go back to page 1.
  const invalidPage = employees.status === "error" && isNotFound(employees.error) && page > 1;
  useEffect(() => {
    if (invalidPage) setUrl({ page: 1 });
  }, [invalidPage, setUrl]);

  const activeCount = (q ? 1 : 0) + (status !== "all" ? 1 : 0);
  const clearFilters = () => setUrl({ q: "", status: "all" });
  const data = employees.data;

  return (
    <>
      <PageHeader
        title="Employees"
        description="Employee accounts. Deactivated employees can't sign in; their leave history is kept."
        actions={
          <ButtonLink href="/admin/employees/new" iconStart="plus" data-testid="add-employee-link">
            Add employee
          </ButtonLink>
        }
      />

      <FilterBar
        label="Filter employees"
        activeCount={activeCount}
        onClear={clearFilters}
        resultSummary={
          employees.status === "success" ? `${plural(employees.data.count, "employee")} match` : undefined
        }
        testId="employee-filters"
      >
        <SearchField
          label="Search"
          hint="Name, email, username or department."
          value={q}
          onSearch={(value) => setUrl({ q: value })}
          data-testid="employee-search"
        />
        <Select
          label="Status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(event) =>
            setUrl({ status: STATUS_VALUES.find((value) => value === event.target.value) ?? "all" })
          }
          data-testid="employee-status-filter"
        />
      </FilterBar>

      {renderResults()}
    </>
  );

  function renderResults() {
    if (employees.status === "not-available") {
      return <NotAvailableState feature={employees.feature} card={employees.card} />;
    }
    if (employees.status === "error" && !invalidPage) {
      return <LoadError error={employees.error} onRetry={employees.reload} what="the employee list" />;
    }
    if (!data) return <TableSkeleton rows={6} columns={4} label="Loading employees…" />;

    if (data.count === 0) {
      if (activeCount === 0) {
        return (
          <EmptyState
            icon="users"
            title="No employees yet"
            description="Add an employee to create their sign-in account and set their leave allowances."
            action={
              <ButtonLink href="/admin/employees/new" iconStart="plus">
                Add employee
              </ButtonLink>
            }
            data-testid="employee-list-empty"
          />
        );
      }
      return (
        <EmptyState
          icon="search"
          title="No employees match these filters"
          description={
            q ? (
              <>
                Nothing matches <span className={styles.wrap}>&ldquo;{q}&rdquo;</span>
                {status !== "all" ? ` among ${status} employees` : ""}. Check the spelling or clear the filters.
              </>
            ) : (
              `There are no ${status} employees.`
            )
          }
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          }
          data-testid="employee-list-no-results"
        />
      );
    }

    const caption = [
      status === "all" ? "Employees" : status === "active" ? "Active employees" : "Inactive employees",
      q ? `matching “${q}”` : null,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <>
        <ResponsiveTable
          caption={caption}
          captionId={captionId}
          columns={COLUMNS}
          rows={data.results}
          rowKey={(employee) => employee.id}
          loading={employees.status === "loading"}
          testId="employee-table"
        />
        <Pagination
          page={data.page}
          pageSize={data.page_size}
          total={data.count}
          onPageChange={(next) => setUrl({ page: next })}
          itemLabel="employees"
          focusTargetId={captionId}
        />
      </>
    );
  }
}
