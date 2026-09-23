import type { Metadata } from "next";
import ApplyLeaveForm from "./apply-leave-form";

export const metadata: Metadata = {
  title: "Apply for leave",
};

export default function ApplyLeavePage() {
  return <ApplyLeaveForm />;
}
