import type { Metadata } from "next";
import EditEmployeeView from "./edit-employee-view";

export const metadata: Metadata = {
  title: "Employee",
};

/** Dynamic params are a Promise in this Next.js version. The view validates the id. */
export default async function EmployeePage({ params }: PageProps<"/admin/employees/[id]">) {
  const { id } = await params;
  return <EditEmployeeView id={id} />;
}
