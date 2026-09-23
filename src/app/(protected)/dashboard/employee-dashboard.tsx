"use client";

import { useId } from "react";
import { BalanceCard } from "@/components/leave/balance-card";
import { LeaveRequestTable } from "@/components/leave/leave-request-table";
import { yearSelectOptions } from "@/components/leave/year-options";
import { LoadError } from "@/components/states/load-error";
import { NotAvailableState } from "@/components/states/not-available-state";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { CardGridSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { ROLE_LABELS, displayName, type User } from "@/lib/auth";
import { currentYearInAppZone } from "@/lib/dates";
import { leaveTypeName } from "@/lib/format";
import { getMyBalances } from "@/lib/services/balances";
import { listMyRequests } from "@/lib/services/leave-requests";
import { listLeaveTypes } from "@/lib/services/leave-types";
import { LEAVE_TYPE_CODES, type Balance } from "@/lib/services/types";
import { useAsync } from "@/lib/use-async";
import { urlParam, useUrlState } from "@/lib/use-url-state";
import styles from "./dashboard.module.css";

const CURRENT_YEAR = currentYearInAppZone();
const SCHEMA = { year: urlParam.year(CURRENT_YEAR) };
const RECENT_COUNT = 5;

function byTypeOrder(a: Balance, b: Balance): number {
  return LEAVE_TYPE_CODES.indexOf(a.leave_type) - LEAVE_TYPE_CODES.indexOf(b.leave_type);
}

/** Employee landing page: balances per leave type, apply link, recent requests. */
export default function EmployeeDashboard({ user }: { user: User }) {
  const [{ year }, setUrl] = useUrlState(SCHEMA);
  const balancesHeadingId = useId();

  const types = useAsync((signal) => listLeaveTypes(signal), []);
  const balances = useAsync((signal) => getMyBalances(year, signal), [year]);
  const recent = useAsync((signal) => listMyRequests({ page_size: RECENT_COUNT }, signal), []);
  // Names fall back to the built-in ones while types load or if they fail.
  const leaveTypes = types.status === "success" ? types.data : null;

  return (
    <>
      <PageHeader
        title={`Welcome, ${displayName(user)}`}
        description="Your leave balances and latest requests."
        meta={
          <>
            <span>
              Signed in as{" "}
              <span className={styles.username} data-testid="current-user">
                {user.username}
              </span>
            </span>
            <span aria-hidden="true">·</span>
            <span className={styles.roleBadge} data-testid="current-role">
              {ROLE_LABELS[user.role]}
            </span>
          </>
        }
        actions={
          <ButtonLink href="/leave/apply" iconStart="plus" data-testid="apply-leave-link">
            Apply for leave
          </ButtonLink>
        }
      />

      <section className={styles.section} aria-labelledby={balancesHeadingId} data-testid="balances">
        <div className={styles.sectionHeader}>
          <h2 id={balancesHeadingId} className={styles.sectionTitle}>
            Leave balances for {year}
          </h2>
          <Select
            label="Year"
            value={String(year)}
            options={yearSelectOptions(year, CURRENT_YEAR)}
            onChange={(event) => setUrl({ year: Number(event.target.value) })}
            fieldClassName={styles.yearField}
            data-testid="balance-year"
          />
        </div>
        {renderBalances()}
      </section>

      <Card
        title="Recent requests"
        data-testid="recent-requests"
        actions={
          <ButtonLink href="/leave" variant="ghost" size="sm">
            View all requests
          </ButtonLink>
        }
      >
        {renderRecent()}
      </Card>
    </>
  );

  function renderBalances() {
    if (balances.status === "not-available") {
      return <NotAvailableState feature={balances.feature} card={balances.card} headingLevel={3} />;
    }
    if (balances.status === "error") {
      return <LoadError error={balances.error} onRetry={balances.reload} what="your leave balances" />;
    }
    if (!balances.data) {
      return <CardGridSkeleton columns={2} rows={4} label="Loading your leave balances…" />;
    }
    const list = [...balances.data.balances].sort(byTypeOrder);
    if (list.length === 0) {
      return (
        <EmptyState
          headingLevel={3}
          icon="inbox"
          title={`No allowances set for ${year}`}
          description="Contact your administrator to have your leave allowance set up."
          data-testid="balances-empty"
        />
      );
    }
    return (
      <div className={styles.balanceGrid} aria-busy={balances.status === "loading" || undefined}>
        {list.map((balance) => (
          <BalanceCard
            key={balance.leave_type}
            balance={balance}
            leaveTypeName={leaveTypeName(balance.leave_type, leaveTypes)}
          />
        ))}
      </div>
    );
  }

  function renderRecent() {
    if (recent.status === "not-available") {
      return <NotAvailableState feature={recent.feature} card={recent.card} headingLevel={3} />;
    }
    if (recent.status === "error") {
      return <LoadError error={recent.error} onRetry={recent.reload} what="your recent requests" />;
    }
    if (!recent.data) {
      return <TableSkeleton rows={3} columns={4} label="Loading your recent requests…" />;
    }
    return (
      <LeaveRequestTable
        requests={recent.data.results}
        caption="Your most recent leave requests"
        captionHidden
        leaveTypes={leaveTypes}
        testId="recent-requests-table"
        empty={
          <EmptyState
            headingLevel={3}
            icon="calendar"
            title="No leave requests yet"
            description="When you apply for leave, your requests and their status appear here."
            action={
              <ButtonLink href="/leave/apply" variant="secondary" iconStart="plus">
                Apply for leave
              </ButtonLink>
            }
            data-testid="recent-requests-empty"
          />
        }
      />
    );
  }
}
