import type { Metadata } from "next";
import AdminDashboard from "./admin-dashboard";

export const metadata: Metadata = {
  title: "Admin dashboard",
};

/** /admin. The role gate lives in admin/layout.tsx. */
export default function AdminPage() {
  return <AdminDashboard />;
}
