"use client";

import { useEffect, useId, useMemo } from "react";
import { LeaveRequestTable } from "@/components/leave/leave-request-table";
import { yearSelectOptions } from "@/components/leave/year-options";
import { LoadError } from "@/components/states/load-error";
import { NotAvailableState } from "@/components/states/not-available-state";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { currentYearInAppZone } from "@/lib/dates";
import { STATUS_LABELS } from "@/lib/format";
import { isNotFound } from "@/lib/services/errors";
import { listMyRequests } from "@/lib/services/leave-requests";
import { listLeaveTypes } from "@/lib/services/leave-types";
import { DEFAULT_PAGE_SIZE, REQUEST_STATUSES } from "@/lib/services/types";
import { useAsync } from "@/lib/use-async";
import { urlParam, useUrlState, type UrlParam } from "@/lib/use-url-state";

const ALL_YEARS = "all";

/**
 * ?year=: absent → the current year, "all" → every year (undefined),
 * 2000–2100 → that year. Anything else falls back to the current year.
 */
function yearFilter(currentYear: number): UrlParam<number | undefined> {
  return {
    parse: (raw) => {
      if (raw === ALL_YEARS) return undefined;
      if (raw !== null && /^\d{4}$/.test(raw)) {
        const year = Number(raw);
        if (year >= 2000 && year <= 2100) return year;
      }
      return currentYear;
    },
    serialize: (value) => (value === undefined ? ALL_YEARS : value === currentYear ? null : String(value)),
  };
}

/** Built per current year, so a tab left open across New Year (IST) stays right. */
function buildSchema(currentYear: number) {
  return {
    year: yearFilter(currentYear),
    status: urlParam.enum(REQUEST_STATUSES),
    page: urlParam.page(),
  };
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  ...REQUEST_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
];

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** /leave: the employee's own requests with year and status filters. */
export default function LeaveHistoryView() {
  // Computed on each render (not at module load), so it follows the IST date.
  const currentYear = currentYearInAppZone();
  const schema = useMemo(() => buildSchema(currentYear), [currentYear]);
  const [{ year, status, page }, setUrl] = useUrlState(schema);
  const captionId = useId();

  const types = useAsync((signal) => listLeaveTypes(signal), []);
  const requests = useAsync(
    (signal) => listMyRequests({ year, status, page, page_size: DEFAULT_PAGE_SIZE }, signal),
    [year, status, page],
  );
  const leaveTypes = types.status === "success" ? types.data : null;

  // An out-of-range page (e.g. after a request was cancelled elsewhere) is a
  // DRF 404 "Invalid page."; go back to the first page.
  const invalidPage = requests.status === "error" && isNotFound(requests.error) && page > 1;
  useEffect(() => {
    if (invalidPage) setUrl({ page: 1 });
  }, [invalidPage, setUrl]);

  const activeCount = (year !== currentYear ? 1 : 0) + (status ? 1 : 0);
  const clearFilters = () => setUrl({ year: currentYear, status: undefined });
  const yearLabel = year === undefined ? "all years" : String(year);
  const data = requests.data;

  return (
    <>
      <PageHeader
        title="My leave"
        description="Every leave request you have made, newest first. Cancelled and rejected requests stay here."
        actions={
          <ButtonLink href="/leave/apply" iconStart="plus">
            Apply for leave
          </ButtonLink>
        }
      />

      <FilterBar
        label="Filter leave requests"
        activeCount={activeCount}
        onClear={clearFilters}
        resultSummary={
          requests.status === "success" ? `${plural(requests.data.count, "request")} match` : undefined
        }
        testId="leave-history-filters"
      >
        <Select
          label="Year"
          value={year === undefined ? ALL_YEARS : String(year)}
          options={[{ value: ALL_YEARS, label: "All years" }, ...yearSelectOptions(year, currentYear)]}
          onChange={(event) =>
            setUrl({ year: event.target.value === ALL_YEARS ? undefined : Number(event.target.value) })
          }
          data-testid="filter-year"
        />
        <Select
          label="Status"
          value={status ?? ""}
          options={STATUS_OPTIONS}
          onChange={(event) =>
            setUrl({
              status: REQUEST_STATUSES.find((value) => value === event.target.value),
            })
          }
          data-testid="filter-status"
        />
      </FilterBar>

      {renderResults()}
    </>
  );

  function renderResults() {
    if (requests.status === "not-available") {
      return <NotAvailableState feature={requests.feature} card={requests.card} />;
    }
    if (requests.status === "error" && !invalidPage) {
      return <LoadError error={requests.error} onRetry={requests.reload} what="your leave requests" />;
    }
    if (!data) {
      return <TableSkeleton rows={6} columns={5} label="Loading your leave requests…" />;
    }
    if (data.count === 0) return renderEmpty();

    const caption = [
      `Leave requests, ${yearLabel}`,
      status ? STATUS_LABELS[status].toLowerCase() : null,
    ]
      .filter(Boolean)
      .join(", ");

    return (
      <>
        <LeaveRequestTable
          requests={data.results}
          caption={caption}
          captionId={captionId}
          leaveTypes={leaveTypes}
          loading={requests.status === "loading"}
          testId="leave-history-table"
        />
        <Pagination
          page={data.page}
          pageSize={data.page_size}
          total={data.count}
          onPageChange={(next) => setUrl({ page: next })}
          itemLabel="requests"
          focusTargetId={captionId}
        />
      </>
    );
  }

  function renderEmpty() {
    // No filters at all: the employee has never applied.
    if (year === undefined && !status) {
      return (
        <EmptyState
          icon="calendar"
          title="No leave requests yet"
          description="When you apply for leave, your requests and their status appear here."
          action={
            <ButtonLink href="/leave/apply" iconStart="plus">
              Apply for leave
            </ButtonLink>
          }
          data-testid="leave-history-empty"
        />
      );
    }
    // Only the default year filter: nothing this year.
    if (year === currentYear && !status) {
      return (
        <EmptyState
          icon="calendar"
          title={`No leave requests in ${year}`}
          description="You have not applied for leave with dates in this year."
          action={
            <>
              <ButtonLink href="/leave/apply" iconStart="plus">
                Apply for leave
              </ButtonLink>
              <Button variant="secondary" onClick={() => setUrl({ year: undefined })}>
                Show all years
              </Button>
            </>
          }
          data-testid="leave-history-empty"
        />
      );
    }
    return (
      <EmptyState
        icon="search"
        title="No requests match these filters"
        description={`There are no ${status ? `${STATUS_LABELS[status].toLowerCase()} ` : ""}requests for ${yearLabel}. Try another year or status.`}
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        }
        data-testid="leave-history-no-results"
      />
    );
  }
}
