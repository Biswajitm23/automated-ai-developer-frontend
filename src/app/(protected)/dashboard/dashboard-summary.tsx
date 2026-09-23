"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Card, DescriptionList } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ROLE_LABELS, displayName } from "@/lib/auth";
import styles from "./dashboard.module.css";

/**
 * Interim content of /dashboard (Phase A). Phase B replaces it with the role
 * router and the employee dashboard.
 */
export default function DashboardSummary() {
  const auth = useAuth();
  // The protected layout only renders this page for signed-in users.
  if (auth.status !== "authenticated") return null;
  const { user } = auth;

  return (
    <>
      <PageHeader
        title={`Welcome, ${displayName(user)}`}
        meta={
          <>
            <span>
              Signed in as{" "}
              <span className={styles.username} data-testid="current-user">
                {user.username}
              </span>
            </span>
            <span aria-hidden="true">·</span>
            <span className={styles.roleBadge} data-testid="current-role">
              {ROLE_LABELS[user.role]}
            </span>
          </>
        }
      />
      <Card title="Your account">
        <DescriptionList
          items={[
            { term: "Name", description: displayName(user) },
            { term: "Username", description: user.username },
            { term: "Role", description: ROLE_LABELS[user.role] },
            ...(user.email ? [{ term: "Email", description: user.email }] : []),
          ]}
        />
      </Card>
      <Alert variant="info">
        Leave features will appear here in a later release.
        {user.role === "ADMIN" && (
          <>
            {" "}
            As an administrator you can also open the <Link href="/admin">admin area</Link>.
          </>
        )}
      </Alert>
    </>
  );
}
