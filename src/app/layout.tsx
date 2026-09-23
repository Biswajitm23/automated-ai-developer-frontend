import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import "@/styles/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Employee Leave Management",
    template: "%s · Employee Leave Management",
  },
  description: "Employee leave requests and approvals",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
