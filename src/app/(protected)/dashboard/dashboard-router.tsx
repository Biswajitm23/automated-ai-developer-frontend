"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import EmployeeDashboard from "./employee-dashboard";
import styles from "./dashboard.module.css";

/**
 * /dashboard is the landing page after sign-in for both roles. Employees see
 * their dashboard; administrators are sent on to /admin.
 */
export default function DashboardRouter() {
  const auth = useAuth();
  const router = useRouter();
  const role = auth.status === "authenticated" ? auth.user.role : null;

  useEffect(() => {
    if (role === "ADMIN") router.replace("/admin");
  }, [role, router]);

  // The protected layout only renders pages for signed-in users.
  if (auth.status !== "authenticated") return null;

  if (auth.user.role === "ADMIN") {
    return (
      <p className={styles.redirect} role="status" data-testid="dashboard-redirect">
        Opening the admin dashboard…
      </p>
    );
  }

  return <EmployeeDashboard user={auth.user} />;
}
