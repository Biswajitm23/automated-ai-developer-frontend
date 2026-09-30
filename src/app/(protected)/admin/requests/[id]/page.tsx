import type { Metadata } from "next";
import ReviewRequestView from "./review-request-view";

export const metadata: Metadata = {
  title: "Review leave request",
};

/** Dynamic params are a Promise in this Next.js version. The view validates the id. */
export default async function ReviewRequestPage({ params }: PageProps<"/admin/requests/[id]">) {
  const { id } = await params;
  return <ReviewRequestView id={id} />;
}
