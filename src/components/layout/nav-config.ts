import type { IconName } from "@/components/ui/icons";
import type { Role } from "@/lib/auth";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  /** Is this item the current page? */
  isActive: (pathname: string) => boolean;
};

const equals = (href: string) => (pathname: string) => pathname === href;
const prefix = (href: string) => (pathname: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

/**
 * Navigation per role (docs/ui-design.md §4.1). Only the current role's items
 * are shown; this is cosmetic — the API enforces roles.
 *
 * Phase A note: the /leave/** and /admin/{requests,employees,allowances}
 * routes are built in Phases B and C; until then those links reach the
 * not-found page.
 */
export const NAV_ITEMS: Record<Role, NavItem[]> = {
  EMPLOYEE: [
    { label: "Dashboard", href: "/dashboard", icon: "home", isActive: equals("/dashboard") },
    { label: "Apply for leave", href: "/leave/apply", icon: "plus", isActive: equals("/leave/apply") },
    {
      label: "My leave",
      href: "/leave",
      icon: "list",
      isActive: (pathname) =>
        pathname === "/leave" || (pathname.startsWith("/leave/") && pathname !== "/leave/apply"),
    },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/admin", icon: "home", isActive: equals("/admin") },
    { label: "Leave requests", href: "/admin/requests", icon: "inbox", isActive: prefix("/admin/requests") },
    { label: "Employees", href: "/admin/employees", icon: "users", isActive: prefix("/admin/employees") },
    { label: "Allowances", href: "/admin/allowances", icon: "sliders", isActive: prefix("/admin/allowances") },
  ],
};
