"use client";

import Link from "next/link";
import { useId } from "react";
import { AdminRequestTable } from "@/components/admin/admin-request-table";
import { useAuth } from "@/components/auth-provider";
import { LoadError } from "@/components/states/load-error";
import { NotAvailableState } from "@/components/states/not-available-state";
import { ButtonLink } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon, type IconName } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { CardGridSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { STATUS_TONES } from "@/components/ui/status-badge";
import { ROLE_LABELS } from "@/lib/auth";
import { STATUS_LABELS } from "@/lib/format";
import { getAdminSummary } from "@/lib/services/admin-summary";
import { listLeaveTypes } from "@/lib/services/leave-types";
import { REQUEST_STATUSES } from "@/lib/services/types";
import { useAsync } from "@/lib/use-async";
import { AdminAccessCheck } from "./admin-access-check";
import styles from "./admin.module.css";

const QUICK_LINKS: { href: string; label: string; description: string; icon: IconName }[] = [
  {
    href: "/admin/requests?status=PENDING",
    label: "Review pending requests",
    description: "Approve or reject requests waiting for a decision.",
    icon: "inbox",
  },
  {
    href: "/admin/employees/new",
    label: "Add an employee",
    description: "Create a sign-in account for a new employee.",
    icon: "plus",
  },
  {
    href: "/admin/employees",
    label: "Manage employees",
    description: "Search, edit, deactivate or reactivate employees.",
    icon: "users",
  },
  {
    href: "/admin/allowances",
    label: "Set annual allowances",
    description: "Casual and sick leave days per employee and year.",
    icon: "sliders",
  },
];

/**
 * /admin: request counts by status, recent requests, quick links and the
 * server-side access check. Hiding admin UI from employees is cosmetic; the
 * Django API enforces the administrator role on every admin endpoint.
 */
export default function AdminDashboard() {
  const auth = useAuth();
  const statsHeadingId = useId();
  const summary = useAsync((signal) => getAdminSummary(signal), []);
  const types = useAsync((signal) => listLeaveTypes(signal), []);
  const leaveTypes = types.status === "success" ? types.data : null;
  const user = auth.status === "authenticated" ? auth.user : null;

  return (
    <>
      <PageHeader
        title="Admin dashboard"
        description="Leave requests across the organisation and shortcuts to employee management."
        meta={
          user ? (
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
          ) : undefined
        }
        actions={
          <ButtonLink href="/admin/requests?status=PENDING" iconStart="inbox" data-testid="review-pending-link">
            Review pending requests
          </ButtonLink>
        }
      />

      <AdminAccessCheck />

      <section className={styles.section} aria-labelledby={statsHeadingId} data-testid="admin-stats">
        <h2 id={statsHeadingId} className={styles.sectionTitle}>
          Leave requests by status
        </h2>
        {renderStats()}
      </section>

      <Card
        title="Recent requests"
        data-testid="recent-requests"
        actions={
          <ButtonLink href="/admin/requests" variant="ghost" size="sm">
            View all requests
          </ButtonLink>
        }
      >
        {renderRecent()}
      </Card>

      <Card title="Quick links" data-testid="quick-links">
        <ul className={styles.quickLinks} role="list">
          {QUICK_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={styles.quickLink}>
                <span className={styles.quickIcon}>
                  <Icon name={link.icon} size={20} />
                </span>
                <span className={styles.quickText}>
                  <span className={styles.quickLabel}>{link.label}</span>
                  <span className={styles.quickDescription}>{link.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );

  function renderStats() {
    if (summary.status === "not-available") {
      return <NotAvailableState feature={summary.feature} card={summary.card} headingLevel={3} />;
    }
    if (summary.status === "error") {
      return <LoadError error={summary.error} onRetry={summary.reload} what="the request counts" />;
    }
    if (!summary.data) {
      return <CardGridSkeleton columns={5} rows={0} label="Loading request counts…" />;
    }
    const { counts, active_employee_count: activeEmployees } = summary.data;
    return (
      <div className={styles.statGrid} aria-busy={summary.status === "loading" || undefined}>
        {REQUEST_STATUSES.map((status) => (
          <StatCard
            key={status}
            label={STATUS_LABELS[status]}
            value={counts[status]}
            unit={counts[status] === 1 ? "request" : "requests"}
            tone={STATUS_TONES[status]}
            href={`/admin/requests?status=${status}`}
            testId={`stat-${status}`}
          />
        ))}
        <StatCard
          label="Active employees"
          value={activeEmployees}
          tone="active"
          href="/admin/employees?status=active"
          testId="stat-employees"
        />
      </div>
    );
  }

  function renderRecent() {
    if (summary.status === "not-available") {
      return <NotAvailableState feature={summary.feature} card={summary.card} headingLevel={3} />;
    }
    if (summary.status === "error") {
      return <LoadError error={summary.error} onRetry={summary.reload} what="the recent requests" />;
    }
    if (!summary.data) {
      return <TableSkeleton rows={4} columns={5} label="Loading recent requests…" />;
    }
    return (
      <AdminRequestTable
        requests={summary.data.recent_requests}
        caption="Most recently submitted leave requests"
        captionHidden
        leaveTypes={leaveTypes}
        testId="recent-requests-table"
        empty={
          <EmptyState
            headingLevel={3}
            icon="inbox"
            title="No leave requests yet"
            description="Requests appear here as soon as employees apply for leave."
            data-testid="recent-requests-empty"
          />
        }
      />
    );
  }
}
