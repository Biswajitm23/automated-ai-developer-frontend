import { STATUS_LABELS } from "@/lib/format";
import type { RequestStatus } from "@/lib/services/types";
import { Icon, type IconName } from "./icons";
import styles from "./status-badge.module.css";

export type StatusTone = "pending" | "approved" | "rejected" | "cancelled" | "active" | "inactive";

export const STATUS_TONES: Record<RequestStatus, StatusTone> = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

const ICONS: Record<StatusTone, IconName> = {
  pending: "clock",
  approved: "check",
  rejected: "x-circle",
  cancelled: "slash-circle",
  active: "dot",
  inactive: "dot-hollow",
};

type StatusBadgeProps = ({ status: RequestStatus } | { active: boolean }) & { className?: string };

/** Pill with an icon and a text label, so the status never relies on colour alone. */
export function StatusBadge(props: StatusBadgeProps) {
  let tone: StatusTone;
  let label: string;
  let dataStatus: string;
  if ("status" in props) {
    tone = STATUS_TONES[props.status];
    label = STATUS_LABELS[props.status];
    dataStatus = props.status;
  } else {
    tone = props.active ? "active" : "inactive";
    label = props.active ? "Active" : "Inactive";
    dataStatus = props.active ? "ACTIVE" : "INACTIVE";
  }
  return (
    <span
      className={[styles.badge, styles[tone], props.className].filter(Boolean).join(" ")}
      data-testid="status-badge"
      data-status={dataStatus}
    >
      <Icon name={ICONS[tone]} size={16} />
      {label}
    </span>
  );
}
