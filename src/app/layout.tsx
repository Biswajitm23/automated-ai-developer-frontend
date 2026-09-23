import type { Metadata } from "next";
import { Roboto, Source_Sans_3 } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import "@/styles/tokens.css";
import "./globals.css";

// Bitpastel brand fonts, self-hosted by next/font (no requests to Google at runtime).
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-source-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Employee Leave Management",
    template: "%s · Employee Leave Management",
  },
  description: "Employee leave requests and approvals",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${roboto.variable} ${sourceSans.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
