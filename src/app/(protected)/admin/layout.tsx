import { RequireRole } from "@/components/require-auth";

/**
 * Every /admin/** page is for administrators only. Employees see the
 * access-denied panel (data-testid="access-denied") and the page is never
 * rendered. This gate is for usability only: the Django API enforces the
 * administrator role on every /api/admin/* request (403 otherwise).
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <RequireRole role="ADMIN">{children}</RequireRole>;
}
