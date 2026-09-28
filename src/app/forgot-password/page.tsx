import type { Metadata } from "next";
import ForgotPasswordFlow from "./forgot-password-flow";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordFlow />;
}
