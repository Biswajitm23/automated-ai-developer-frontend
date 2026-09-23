import { AppShell } from "@/components/layout/app-shell";
import RequireAuth from "@/components/require-auth";
import { ToastProvider } from "@/components/ui/toast";

export default function ProtectedLayout({ children }: LayoutProps<"/">) {
  return (
    <RequireAuth>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </RequireAuth>
  );
}
