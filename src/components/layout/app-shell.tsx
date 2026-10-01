"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "./brand-logo";
import { MobileNav } from "./mobile-nav";
import { MockBanner } from "./mock-banner";
import { Sidebar } from "./sidebar";
import { useMediaQuery } from "./use-media-query";
import styles from "./app-shell.module.css";

const MOBILE_NAV_ID = "mobile-nav";
const COLLAPSED_KEY = "elm-sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false; // storage blocked (private window etc.)
  }
}

function saveCollapsed(collapsed: boolean) {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // Not remembered; the toggle still works for this visit.
  }
}

/**
 * Signed-in page frame: skip link, desktop sidebar (≥1024 px) or mobile top
 * bar + drawer, the dev mock banner, and the single <main>. Only one copy of
 * the navigation and account block is ever in the DOM, so test IDs stay unique.
 * The desktop sidebar can be collapsed to icons; the choice is remembered in
 * this browser.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  // The shell renders only after sign-in on the client, so reading storage
  // here cannot cause a hydration mismatch.
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggleCollapsed = useCallback(() => {
    saveCollapsed(!collapsed);
    setCollapsed(!collapsed);
  }, [collapsed]);

  // RequireAuth renders the shell only for signed-in users.
  if (auth.status !== "authenticated") return null;
  const { role } = auth.user;

  return (
    <div className={styles.shell} data-sidebar={isDesktop && collapsed ? "collapsed" : undefined}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      {isDesktop ? (
        <aside className={styles.sidebar}>
          <Sidebar role={role} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        </aside>
      ) : (
        <>
          <header className={styles.topbar}>
            <Button
              ref={menuButtonRef}
              variant="ghost"
              iconStart="menu"
              className={styles.menuButton}
              aria-expanded={menuOpen}
              aria-controls={MOBILE_NAV_ID}
              aria-haspopup="dialog"
              onClick={() => setMenuOpen(true)}
              data-testid="mobile-menu-button"
            >
              Menu
            </Button>
            <Link href="/dashboard" className={styles.topbarBrand}>
              <BrandLogo size="sm" />
            </Link>
          </header>
          <MobileNav
            id={MOBILE_NAV_ID}
            role={role}
            open={menuOpen}
            onClose={closeMenu}
            returnFocusRef={menuButtonRef}
          />
        </>
      )}
      <div className={styles.content}>
        <MockBanner />
        <main id="main-content" tabIndex={-1} className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
