import type { HTMLAttributes } from "react";

/** Text for screen readers only. Uses the global `.visually-hidden` class. */
export function VisuallyHidden({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={className ? `visually-hidden ${className}` : "visually-hidden"}
    />
  );
}
