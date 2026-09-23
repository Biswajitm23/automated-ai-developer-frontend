import { RequireRole } from "@/components/require-auth";

/**
 * Every /leave/** page is for employees only. Administrators do not take leave
 * in Phase 1 (docs/ui-design.md §2.3, §9) and see the access-denied panel.
 * The API enforces the same rule with 403.
 */
export default function LeaveLayout({ children }: LayoutProps<"/leave">) {
  return <RequireRole role="EMPLOYEE">{children}</RequireRole>;
}
