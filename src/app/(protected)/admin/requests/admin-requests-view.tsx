"use client";

import { useEffect, useId, useState } from "react";
import { AdminRequestTable } from "@/components/admin/admin-request-table";
import { EmployeeSelect, useEmployeeOptions } from "@/components/admin/employee-select";
import { StatusCounts } from "@/components/admin/status-counts";
import { LoadError } from "@/components/states/load-error";
import { NotAvailableState } from "@/components/states/not-available-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DateField, type DateFieldProps } from "@/components/ui/date-field";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { parseISODate } from "@/lib/dates";
import { STATUS_LABELS, formatDate, leaveTypeName } from "@/lib/format";
import { listAdminRequests } from "@/lib/services/admin-requests";
import { isNotFound } from "@/lib/services/errors";
import { listLeaveTypes } from "@/lib/services/leave-types";
import { DEFAULT_PAGE_SIZE, LEAVE_TYPE_CODES, REQUEST_STATUSES } from "@/lib/services/types";
import { useAsync } from "@/lib/use-async";
import { urlParam, useUrlState } from "@/lib/use-url-state";
import styles from "../admin.module.css";

const SCHEMA = {
  employee: urlParam.id(),
  status: urlParam.enum(REQUEST_STATUSES),
  leave_type: urlParam.enum(LEAVE_TYPE_CODES),
  from: urlParam.isoDate(),
  to: urlParam.isoDate(),
  page: urlParam.page(),
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  ...REQUEST_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
];

const RANGE_ORDER_MESSAGE = "End of range must be on or after the start.";

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

type RangeDateFieldProps = Omit<DateFieldProps, "value" | "onChange" | "onBlur"> & {
  /** The applied value from the URL ("" when absent). */
  value: string;
  onApply: (value: string | undefined) => void;
};

/**
 * Date filter that keeps its own draft: a complete date applies at once, and
 * an emptied field applies on blur. (A native date input reports "" while a
 * date is half typed; applying that at once would wipe the other parts.)
 */
function RangeDateField({ value, onApply, ...props }: RangeDateFieldProps) {
  const [draft, setDraft] = useState(value);
  const [applied, setApplied] = useState(value);
  if (value !== applied) {
    // Changed from outside (Clear filters, Back button): follow it.
    setApplied(value);
    setDraft(value);
  }
  return (
    <DateField
      {...props}
      value={draft}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        if (next && parseISODate(next) && next !== value) onApply(next);
      }}
      onBlur={() => {
        if (!draft && value) onApply(undefined);
      }}
    />
  );
}

/**
 * /admin/requests: every leave request, newest first (ELM-009). Filters
 * (employee, status, leave type, date range) live in the URL. A request
 * matches the range when it overlaps it. The status counts follow every
 * filter except status, so they show what the status filter chooses from.
 */
export default function AdminRequestsView() {
  const [{ employee, status, leave_type: leaveType, from, to, page }, setUrl] = useUrlState(SCHEMA);
  const captionId = useId();

  const employees = useEmployeeOptions();
  const types = useAsync((signal) => listLeaveTypes(signal), []);
  const leaveTypes = types.status === "success" ? types.data : null;

  // Invalid dates (e.g. 2026-02-30 typed into the URL) are ignored, and a
  // reversed range is not sent: the server would answer 400 anyway.
  const validFrom = from && parseISODate(from) ? from : undefined;
  const validTo = to && parseISODate(to) ? to : undefined;
  const rangeError = validFrom && validTo && validTo < validFrom ? RANGE_ORDER_MESSAGE : null;

  const requests = useAsync(
    (signal) =>
      rangeError
        ? new Promise<never>(() => undefined) // never settles; the range error is shown instead
        : listAdminRequests(
            {
              employee,
              status,
              leave_type: leaveType,
              date_from: validFrom,
              date_to: validTo,
              page,
              page_size: DEFAULT_PAGE_SIZE,
            },
            signal,
          ),
    [employee, status, leaveType, validFrom, validTo, page, rangeError],
  );

  // An out-of-range page is a DRF 404 "Invalid page."; go back to page 1.
  const invalidPage = requests.status === "error" && isNotFound(requests.error) && page > 1;
  useEffect(() => {
    if (invalidPage) setUrl({ page: 1 });
  }, [invalidPage, setUrl]);

  const activeCount =
    (employee !== undefined ? 1 : 0) + (status ? 1 : 0) + (leaveType ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);
  const clearFilters = () =>
    setUrl({ employee: undefined, status: undefined, leave_type: undefined, from: undefined, to: undefined });
  const data = rangeError ? null : requests.data;
  const typeOptions = [
    { value: "", label: "All leave types" },
    ...LEAVE_TYPE_CODES.map((code) => ({ value: code, label: leaveTypeName(code, leaveTypes) })),
  ];

  return (
    <>
      <PageHeader
        title="Leave requests"
        description="Every employee's leave requests, newest first. Open a request to review it."
      />

      <FilterBar
        label="Filter leave requests"
        activeCount={activeCount}
        onClear={clearFilters}
        resultSummary={
          requests.status === "success" && !rangeError ? `${plural(requests.data.count, "request")} match` : undefined
        }
        testId="admin-request-filters"
      >
        <EmployeeSelect
          label="Employee"
          employees={employees}
          value={employee}
          onChange={(id) => setUrl({ employee: id })}
          emptyLabel="All employees"
          allowEmpty
          data-testid="filter-employee"
        />
        <Select
          label="Status"
          value={status ?? ""}
          options={STATUS_OPTIONS}
          onChange={(event) => setUrl({ status: REQUEST_STATUSES.find((value) => value === event.target.value) })}
          data-testid="filter-status"
        />
        <Select
          label="Leave type"
          value={leaveType ?? ""}
          options={typeOptions}
          onChange={(event) =>
            setUrl({ leave_type: LEAVE_TYPE_CODES.find((value) => value === event.target.value) })
          }
          data-testid="filter-leave-type"
        />
        <RangeDateField
          label="From"
          value={from ?? ""}
          max={validTo}
          hint="Requests that end on or after this date."
          onApply={(value) => setUrl({ from: value })}
          data-testid="filter-from"
        />
        <RangeDateField
          label="To"
          value={to ?? ""}
          min={validFrom}
          hint="Requests that start on or before this date."
          error={rangeError}
          onApply={(value) => setUrl({ to: value })}
          data-testid="filter-to"
        />
      </FilterBar>

      {renderResults()}
    </>
  );

  function renderResults() {
    if (rangeError) {
      return (
        <Alert variant="warning" data-testid="date-range-error">
          The date range ends ({formatDate(validTo!)}) before it starts ({formatDate(validFrom!)}). {rangeError}
        </Alert>
      );
    }
    if (requests.status === "not-available") {
      return <NotAvailableState feature={requests.feature} card={requests.card} />;
    }
    if (requests.status === "error" && !invalidPage) {
      return <LoadError error={requests.error} onRetry={requests.reload} what="the leave requests" />;
    }
    if (!data) return <TableSkeleton rows={8} columns={5} label="Loading leave requests…" />;

    const loading = requests.status === "loading";
    const counts = (
      <StatusCounts
        counts={data.counts}
        selected={status}
        onSelect={(next) => setUrl({ status: next })}
        busy={loading}
      />
    );

    if (data.count === 0) {
      if (activeCount === 0) {
        return (
          <EmptyState
            icon="inbox"
            title="No leave requests yet"
            description="Requests appear here as soon as employees apply for leave."
            data-testid="admin-requests-empty"
          />
        );
      }
      return (
        <div className={styles.stack}>
          {data.counts.total > 0 && counts}
          <EmptyState
            icon="search"
            title="No requests match these filters"
            description={
              status && data.counts.total > 0
                ? `None of the ${plural(data.counts.total, "matching request")} is ${STATUS_LABELS[status].toLowerCase()}. Choose another status above or clear the filters.`
                : "Try a wider date range, another employee or leave type, or clear the filters."
            }
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
            data-testid="admin-requests-no-results"
          />
        </div>
      );
    }

    const caption = ["Leave requests, newest first", status ? STATUS_LABELS[status].toLowerCase() : null]
      .filter(Boolean)
      .join(", ");

    return (
      <div className={styles.stack}>
        {counts}
        <AdminRequestTable
          requests={data.results}
          caption={caption}
          captionId={captionId}
          leaveTypes={leaveTypes}
          loading={loading}
          testId="admin-request-table"
        />
        <Pagination
          page={data.page}
          pageSize={data.page_size}
          total={data.count}
          onPageChange={(next) => setUrl({ page: next })}
          itemLabel="requests"
          focusTargetId={captionId}
        />
      </div>
    );
  }
}
