"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import type { Role } from "@/lib/auth";
import { AccountMenu } from "./account-menu";
import { BrandLogo } from "./brand-logo";
import { NAV_ITEMS, type NavItem } from "./nav-config";
import styles from "./app-shell.module.css";

type SidebarProps = {
  role: Role;
  /** Called when a link is followed (the mobile drawer closes itself). */
  onNavigate?: () => void;
  /** Desktop only: show icons without page titles. */
  collapsed?: boolean;
  /** Desktop only: renders the expand/collapse button when given. */
  onToggleCollapsed?: () => void;
};

/** Brand, main navigation for the role, and the account block at the bottom. */
export function Sidebar({ role, onNavigate, collapsed = false, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname();
  return (
    <div className={styles.sidebarInner} data-collapsed={collapsed || undefined}>
      {!collapsed && (
        <Link href="/dashboard" className={styles.brand} onClick={onNavigate}>
          <BrandLogo layout="stacked" />
        </Link>
      )}
      <nav aria-label="Main" className={styles.nav}>
        <ul role="list" className={styles.navList}>
          {NAV_ITEMS[role].map((item) => (
            <li key={item.href}>
              <NavLink
                item={item}
                active={item.isActive(pathname)}
                onNavigate={onNavigate}
                collapsed={collapsed}
              />
            </li>
          ))}
        </ul>
      </nav>
      <AccountMenu
        compact={collapsed}
        toggle={
          onToggleCollapsed && (
            <IconButton
              label={collapsed ? "Expand menu" : "Collapse menu"}
              icon={collapsed ? "chevron-right" : "chevron-left"}
              title={collapsed ? "Expand menu" : "Collapse menu"}
              aria-expanded={!collapsed}
              onClick={onToggleCollapsed}
              className={styles.collapseButton}
              data-testid="sidebar-toggle"
            />
          )
        }
      />
    </div>
  );
}

export function NavLink({
  item,
  active,
  onNavigate,
  collapsed = false,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={styles.navLink}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
    >
      <Icon name={item.icon} size={20} />
      <span className={collapsed ? "visually-hidden" : undefined}>{item.label}</span>
    </Link>
  );
}
