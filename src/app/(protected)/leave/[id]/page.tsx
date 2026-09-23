import type { Metadata } from "next";
import LeaveRequestView from "./leave-request-view";

export const metadata: Metadata = {
  title: "Leave request",
};

/** Dynamic params are a Promise in this Next.js version. The view validates the id. */
export default async function LeaveRequestPage({ params }: PageProps<"/leave/[id]">) {
  const { id } = await params;
  return <LeaveRequestView id={id} />;
}
