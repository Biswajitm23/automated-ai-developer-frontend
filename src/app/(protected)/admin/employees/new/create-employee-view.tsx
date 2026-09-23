"use client";

import { useRouter } from "next/navigation";
import { EmployeeForm, type EmployeeFormValues } from "@/components/admin/employee-form";
import { useEmployeeOptions } from "@/components/admin/employee-select";
import { NotAvailableState } from "@/components/states/not-available-state";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { createEmployee } from "@/lib/services/admin-employees";
import { ENDPOINTS } from "@/lib/services/availability";
import { MOCK_API_ENABLED } from "@/lib/services/mock-flag";
import styles from "../../admin.module.css";

/** Creating needs the employees endpoint (or the dev mock). */
const EMPLOYEES_AVAILABLE = ENDPOINTS.adminEmployees.available || MOCK_API_ENABLED;

const BREADCRUMBS = [
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/employees/new", label: "Add employee" },
];

function Header() {
  return (
    <PageHeader
      title="Add employee"
      breadcrumbs={BREADCRUMBS}
      description="Creates a sign-in account with the Employee role. Set their leave allowances afterwards."
    />
  );
}

/** /admin/employees/new (ELM-003). */
export default function CreateEmployeeView() {
  if (!EMPLOYEES_AVAILABLE) {
    return (
      <>
        <Header />
        <NotAvailableState feature={ENDPOINTS.adminEmployees.feature} card={ENDPOINTS.adminEmployees.card} />
      </>
    );
  }
  return <CreateEmployeeBody />;
}

function CreateEmployeeBody() {
  const router = useRouter();
  const { toast } = useToast();
  // Existing departments for the <datalist>; failures only lose the suggestions.
  const employees = useEmployeeOptions();
  const departments = employees.data?.map((employee) => employee.department) ?? [];

  async function submit(values: EmployeeFormValues) {
    // The API enforces the admin role, unique email and Django's password
    // validators again; the form's checks are for usability only.
    const created = await createEmployee(values);
    toast({
      variant: "success",
      message: `Employee ${created.full_name} created. Next, set their leave allowances.`,
    });
    router.push(`/admin/employees/${created.id}`);
  }

  return (
    <>
      <Header />
      <Card padding="lg" className={styles.formCard}>
        <EmployeeForm
          mode="create"
          departments={departments}
          submitLabel="Create employee"
          submittingLabel="Creating…"
          cancelHref="/admin/employees"
          onSubmit={submit}
          stayBusyOnSuccess
        />
      </Card>
    </>
  );
}
