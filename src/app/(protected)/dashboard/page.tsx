import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import DashboardRouter from "./dashboard-router";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  // The employee dashboard keeps its year in the URL (useSearchParams).
  return (
    <Suspense fallback={<PageSkeleton label="Loading your dashboard…" />}>
      <DashboardRouter />
    </Suspense>
  );
}
