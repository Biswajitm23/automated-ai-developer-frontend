import type { ComponentPropsWithRef } from "react";
import { Icon, type IconName } from "./icons";
import styles from "./icon-button.module.css";

type IconButtonProps = Omit<ComponentPropsWithRef<"button">, "children" | "aria-label"> & {
  /** Accessible name (also rendered as visually hidden text). */
  label: string;
  icon: IconName;
  size?: "md" | "sm";
};

/** Square 44 px button with an icon only; `label` gives it its accessible name. */
export function IconButton({
  label,
  icon,
  size = "md",
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={[styles.iconButton, size === "sm" ? styles.sm : null, className]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon name={icon} size={size === "sm" ? 16 : 20} />
      <span className="visually-hidden">{label}</span>
    </button>
  );
}
