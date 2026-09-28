import { AppShell } from "@/components/layout/app-shell";
import RequireAuth from "@/components/require-auth";

export default function ProtectedLayout({ children }: LayoutProps<"/">) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
