import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import LeaveHistoryView from "./leave-history-view";

export const metadata: Metadata = {
  title: "My leave",
};

export default function LeaveHistoryPage() {
  // Filters and the page number live in the URL (useSearchParams).
  return (
    <Suspense fallback={<PageSkeleton label="Loading your leave history…" />}>
      <LeaveHistoryView />
    </Suspense>
  );
}
