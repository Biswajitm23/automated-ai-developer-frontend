import type { ReactNode } from "react";

/**
 * Inline SVG icon set (24×24 grid, stroke icons). Icons are always decorative:
 * the meaning is carried by a text label next to them.
 */

export type IconName =
  | "menu"
  | "close"
  | "check"
  | "check-circle"
  | "clock"
  | "x-circle"
  | "slash-circle"
  | "dot"
  | "dot-hollow"
  | "alert-triangle"
  | "alert-circle"
  | "info"
  | "lock"
  | "search"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "calendar"
  | "home"
  | "list"
  | "plus"
  | "users"
  | "sliders"
  | "inbox"
  | "log-out"
  | "file-question"
  | "filter"
  | "refresh";

const PATHS: Record<IconName, ReactNode> = {
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.8 2.8L16 10" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  "x-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  "slash-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 18.4L18.4 5.6" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="5" fill="currentColor" />,
  "dot-hollow": <circle cx="12" cy="12" r="4.5" />,
  "alert-triangle": (
    <>
      <path d="M10.3 4.2L2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4M12 17h.01" />
    </>
  ),
  "alert-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  "chevron-left": <path d="M15 6l-6 6 6 6" />,
  "chevron-right": <path d="M9 6l6 6-6 6" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  home: (
    <>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 9.5V20h12V9.5" />
    </>
  ),
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  plus: <path d="M12 5v14M5 12h14" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 13.5l2.6-7.8A2 2 0 0 1 8 4.5h8a2 2 0 0 1 1.9 1.2l2.6 7.8" />
      <path d="M3.5 13.5V18a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4.5h-5l-1.5 2.5h-4l-1.5-2.5z" />
    </>
  ),
  "log-out": (
    <>
      <path d="M14 4.5h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-4" />
      <path d="M10 16.5L5.5 12 10 7.5M5.5 12H15" />
    </>
  ),
  "file-question": (
    <>
      <path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z" />
      <path d="M14 3.5v5h5" />
      <path d="M10 12a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2M12 17.5h.01" />
    </>
  ),
  filter: <path d="M4 5h16l-6 7.5V19l-4-2v-4.5z" />,
  refresh: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5v4h-4" />
    </>
  ),
};

type IconProps = {
  name: IconName;
  size?: 16 | 20 | 24;
  className?: string;
};

export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
