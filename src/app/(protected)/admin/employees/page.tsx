import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import EmployeeListView from "./employee-list-view";

export const metadata: Metadata = {
  title: "Employees",
};

export default function EmployeesPage() {
  // Search, status and page live in the URL (useSearchParams).
  return (
    <Suspense fallback={<PageSkeleton label="Loading employees…" />}>
      <EmployeeListView />
    </Suspense>
  );
}
