import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Reset Your Password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" intro="Enter your email and we'll send you a secure link.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
