"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import type { Role } from "@/lib/auth";
import { AccountMenu } from "./account-menu";
import { NAV_ITEMS, type NavItem } from "./nav-config";
import styles from "./app-shell.module.css";

type SidebarProps = {
  role: Role;
  /** Called when a link is followed (the mobile drawer closes itself). */
  onNavigate?: () => void;
};

/** Brand, main navigation for the role, and the account block at the bottom. */
export function Sidebar({ role, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  return (
    <div className={styles.sidebarInner}>
      <Link href="/dashboard" className={styles.brand} onClick={onNavigate}>
        <span className={styles.brandMark} aria-hidden="true">
          ELM
        </span>
        <span>Leave Management</span>
      </Link>
      <nav aria-label="Main" className={styles.nav}>
        <ul role="list" className={styles.navList}>
          {NAV_ITEMS[role].map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={item.isActive(pathname)} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </nav>
      <AccountMenu />
    </div>
  );
}

export function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      className={styles.navLink}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      <Icon name={item.icon} size={20} />
      <span>{item.label}</span>
    </Link>
  );
}
