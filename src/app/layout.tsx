import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Employee Leave Management",
  description: "Employee leave requests and approvals",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
