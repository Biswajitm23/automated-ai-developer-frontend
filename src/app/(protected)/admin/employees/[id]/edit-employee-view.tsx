"use client";

import { useState } from "react";
import { EmployeeForm, type EmployeeFormValues } from "@/components/admin/employee-form";
import { useEmployeeOptions } from "@/components/admin/employee-select";
import { LoadError } from "@/components/states/load-error";
import { NotAvailableState } from "@/components/states/not-available-state";
import { NotFoundPanel } from "@/components/states/not-found-panel";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, DescriptionList } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { PageHeader, type Breadcrumb } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/format";
import {
  deactivateEmployee,
  getEmployee,
  reactivateEmployee,
  updateEmployee,
} from "@/lib/services/admin-employees";
import { listAdminRequests } from "@/lib/services/admin-requests";
import { NotAvailableError, isNotFound, submitErrorMessage } from "@/lib/services/errors";
import type { Employee } from "@/lib/services/types";
import { useAsync } from "@/lib/use-async";
import styles from "../../admin.module.css";

const ID_PATTERN = /^[1-9]\d{0,9}$/;

function breadcrumbs(id: string, name?: string): Breadcrumb[] {
  return [
    { href: "/admin/employees", label: "Employees" },
    { href: `/admin/employees/${id}`, label: name ?? (ID_PATTERN.test(id) ? `Employee #${id}` : "Employee") },
  ];
}

function NotFound({ id }: { id: string }) {
  return (
    <>
      <PageHeader title="Employee" breadcrumbs={breadcrumbs(id)} />
      <NotFoundPanel
        what="employee"
        backHref="/admin/employees"
        backLabel="Back to employees"
        description="We couldn't find this employee. They may not exist, or the account isn't an employee account."
      />
    </>
  );
}

/** /admin/employees/[id]: edit details, deactivate or reactivate (ELM-003). */
export default function EditEmployeeView({ id }: { id: string }) {
  // Anything but a positive integer is not found, without asking the server.
  if (!ID_PATTERN.test(id)) return <NotFound id={id} />;
  return <EditEmployee id={id} />;
}

function EditEmployee({ id }: { id: string }) {
  const { toast } = useToast();
  const state = useAsync((signal) => getEmployee(id, signal), [id]);
  // For the confirm text only; failures just drop the sentence.
  const pendingRequests = useAsync(
    (signal) => listAdminRequests({ employee: Number(id), status: "PENDING", page_size: 1 }, signal),
    [id],
  );
  const options = useEmployeeOptions();
  const departments = options.data?.map((employee) => employee.department) ?? [];

  // The latest server response after a save or (de)activation.
  const [updated, setUpdated] = useState<Employee | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const employee = updated ?? state.data;

  if (state.status === "not-available") {
    return (
      <>
        <PageHeader title="Employee" breadcrumbs={breadcrumbs(id)} />
        <NotAvailableState feature={state.feature} card={state.card} />
      </>
    );
  }
  if (state.status === "error" && isNotFound(state.error)) return <NotFound id={id} />;
  if (state.status === "error" && !employee) {
    return (
      <>
        <PageHeader title="Employee" breadcrumbs={breadcrumbs(id)} />
        <LoadError error={state.error} onRetry={state.reload} what="this employee" />
      </>
    );
  }
  if (!employee) return <PageSkeleton rows={8} label="Loading the employee…" />;

  const current = employee;
  const pendingCount = pendingRequests.status === "success" ? pendingRequests.data.count : null;

  async function save(values: EmployeeFormValues) {
    // The API enforces the admin role and unique email again; username,
    // password, role and is_active are read-only on this endpoint.
    const result = await updateEmployee(current.id, {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      department: values.department,
    });
    setUpdated(result);
    toast({ variant: "success", message: `Details saved for ${result.full_name}.` });
  }

  function closeDialog() {
    if (toggling) return;
    setToggleError(null);
    setDialogOpen(false);
  }

  async function toggleActive() {
    if (toggling) return;
    setToggling(true);
    setToggleError(null);
    try {
      const result = current.is_active
        ? await deactivateEmployee(current.id)
        : await reactivateEmployee(current.id);
      setUpdated(result);
      setToggling(false);
      setDialogOpen(false);
      toast({
        variant: "success",
        message: result.is_active
          ? `${result.full_name} is active again and can sign in.`
          : `${result.full_name} is deactivated. Their leave history is kept.`,
      });
      pendingRequests.reload();
    } catch (error) {
      setToggling(false);
      if (error instanceof NotAvailableError) {
        setToggleError(`${error.feature} isn't available yet (${error.card}).`);
      } else if (isNotFound(error)) {
        setToggleError("This employee could not be found any more. Go back to the employee list.");
      } else {
        setToggleError(submitErrorMessage(error));
      }
    }
  }

  const deactivating = current.is_active;

  return (
    <>
      <PageHeader
        title={current.full_name}
        breadcrumbs={breadcrumbs(id, current.full_name)}
        description={<span className={styles.email}>{current.email}</span>}
        meta={
          <span data-testid="employee-status">
            <StatusBadge active={current.is_active} />
          </span>
        }
        actions={
          // One element for both states, so focus stays on it after the change.
          // Hiding or showing it is not security: the API checks the admin role.
          <Button
            variant={deactivating ? "danger" : "secondary"}
            iconStart={deactivating ? "slash-circle" : "refresh"}
            onClick={() => {
              setToggleError(null);
              setDialogOpen(true);
            }}
            data-testid={deactivating ? "deactivate-button" : "reactivate-button"}
          >
            {deactivating ? "Deactivate" : "Reactivate"}
          </Button>
        }
      />

      {state.status === "error" && (
        <LoadError error={state.error} onRetry={state.reload} what="the latest version of this employee" />
      )}

      <div className={styles.detailGrid}>
        <Card title="Details" padding="lg">
          <EmployeeForm
            key={`${current.id}-${current.updated_at}`}
            mode="edit"
            initial={current}
            departments={departments}
            submitLabel="Save changes"
            submittingLabel="Saving…"
            cancelHref="/admin/employees"
            onSubmit={save}
          />
        </Card>

        <div className={styles.stack}>
          <Card title="Account" data-testid="employee-account">
            <DescriptionList
              items={[
                { term: "Username", description: <span className={styles.wrap}>{current.username}</span> },
                { term: "Role", description: "Employee" },
                { term: "Status", description: <StatusBadge active={current.is_active} /> },
                {
                  term: "Created",
                  description: <time dateTime={current.created_at}>{formatDateTime(current.created_at)}</time>,
                },
                {
                  term: "Last updated",
                  description: <time dateTime={current.updated_at}>{formatDateTime(current.updated_at)}</time>,
                },
              ]}
            />
            <p className={styles.muted}>
              {current.is_active
                ? "Deactivating stops the employee from signing in. Their leave history is kept."
                : "This employee can't sign in. Their leave history is kept; reactivate to restore access."}
            </p>
          </Card>

          <Card title="Leave">
            <div className={styles.inlineActions}>
              <ButtonLink
                href={`/admin/allowances?employee=${current.id}`}
                variant="secondary"
                iconStart="sliders"
                data-testid="employee-allowances-link"
              >
                Manage allowances
              </ButtonLink>
              <ButtonLink
                href={`/admin/requests?employee=${current.id}`}
                variant="secondary"
                iconStart="inbox"
                data-testid="employee-requests-link"
              >
                View leave requests
              </ButtonLink>
            </div>
            {pendingCount !== null && pendingCount > 0 && (
              <p className={styles.muted}>
                {pendingCount} pending {pendingCount === 1 ? "request is" : "requests are"} waiting for review.
              </p>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={dialogOpen}
        onClose={closeDialog}
        onConfirm={toggleActive}
        title={deactivating ? `Deactivate ${current.full_name}?` : `Reactivate ${current.full_name}?`}
        confirmLabel={deactivating ? "Deactivate employee" : "Reactivate employee"}
        cancelLabel="Cancel"
        pendingLabel={deactivating ? "Deactivating…" : "Reactivating…"}
        tone={deactivating ? "danger" : "default"}
        pending={toggling}
        error={toggleError}
        testId="confirm-dialog"
      >
        {deactivating ? (
          <>
            <p className={styles.wrap}>{current.full_name} will no longer be able to sign in.</p>
            <p>
              Their leave history is kept, and they stay in the employee list as Inactive. You can reactivate them
              at any time.
            </p>
            {pendingCount !== null && pendingCount > 0 && (
              <p data-testid="deactivate-pending-note">
                {pendingCount} pending {pendingCount === 1 ? "request" : "requests"} will stay pending until
                reviewed.
              </p>
            )}
          </>
        ) : (
          <>
            <p className={styles.wrap}>
              {current.full_name} will be able to sign in again with their existing username and password.
            </p>
            <p>Their leave history is unchanged.</p>
          </>
        )}
      </ConfirmDialog>
    </>
  );
}
