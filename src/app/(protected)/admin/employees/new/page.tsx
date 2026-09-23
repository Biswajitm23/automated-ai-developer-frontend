import type { Metadata } from "next";
import CreateEmployeeView from "./create-employee-view";

export const metadata: Metadata = {
  title: "Add employee",
};

/** Static segment: takes precedence over /admin/employees/[id]. */
export default function NewEmployeePage() {
  return <CreateEmployeeView />;
}
