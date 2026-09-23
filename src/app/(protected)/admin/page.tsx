import type { Metadata } from "next";
import { RequireRole } from "@/components/require-auth";
import AdminPanel from "./admin-panel";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminPage() {
  return (
    <RequireRole role="ADMIN">
      <AdminPanel />
    </RequireRole>
  );
}
