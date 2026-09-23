"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type RefObject } from "react";
import { Dialog } from "@/components/ui/dialog";
import type { Role } from "@/lib/auth";
import { Sidebar } from "./sidebar";

type MobileNavProps = {
  id: string;
  role: Role;
  open: boolean;
  onClose: () => void;
  /** The Menu button; focus returns there on close. */
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

/**
 * Left drawer (<1024 px) built on Dialog: the sidebar content, including the
 * account block and Log out. Closes on Esc, backdrop click, the close button,
 * following a link, and any route change.
 */
export function MobileNav({ id, role, open, onClose, returnFocusRef }: MobileNavProps) {
  const pathname = usePathname();
  const lastPathname = useRef(pathname);

  useEffect(() => {
    if (pathname === lastPathname.current) return;
    lastPathname.current = pathname;
    if (open) onClose();
  }, [pathname, open, onClose]);

  return (
    <Dialog
      id={id}
      variant="drawer"
      title="Main menu"
      hideTitle
      open={open}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      testId="mobile-nav"
    >
      <Sidebar role={role} onNavigate={onClose} />
    </Dialog>
  );
}
