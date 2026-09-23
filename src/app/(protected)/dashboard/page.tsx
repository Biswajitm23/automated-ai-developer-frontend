import type { Metadata } from "next";
import DashboardSummary from "./dashboard-summary";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return <DashboardSummary />;
}
