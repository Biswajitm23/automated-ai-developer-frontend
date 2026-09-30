import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import AdminRequestsView from "./admin-requests-view";

export const metadata: Metadata = {
  title: "Leave requests",
};

export default function AdminRequestsPage() {
  // Filters and the page number live in the URL (useSearchParams).
  return (
    <Suspense fallback={<PageSkeleton label="Loading leave requests…" />}>
      <AdminRequestsView />
    </Suspense>
  );
}
