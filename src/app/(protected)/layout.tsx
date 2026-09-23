import RequireAuth from "@/components/require-auth";
import SiteHeader from "@/components/site-header";
import styles from "../auth.module.css";

export default function ProtectedLayout({ children }: LayoutProps<"/">) {
  return (
    <RequireAuth>
      <SiteHeader />
      <main className={styles.page}>{children}</main>
    </RequireAuth>
  );
}
