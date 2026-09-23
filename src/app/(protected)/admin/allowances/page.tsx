import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import AllowanceManager from "./allowance-manager";

export const metadata: Metadata = {
  title: "Allowances",
};

export default function AllowancesPage() {
  // The chosen employee and year live in the URL (useSearchParams).
  return (
    <Suspense fallback={<PageSkeleton label="Loading allowances…" />}>
      <AllowanceManager />
    </Suspense>
  );
}
