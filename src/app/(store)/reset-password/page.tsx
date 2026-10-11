import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/forms";
import { LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Choose a New Password", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ token?: string; error?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token, error } = await searchParams;
  return (
    <AuthShell title="Choose a new password">
      {!token || error ? (
        <>
          <Alert tone="error">This reset link has expired or isn&rsquo;t valid.</Alert>
          <LinkButton href="/forgot-password" className="mt-6">
            Request a New Link
          </LinkButton>
        </>
      ) : (
        <ResetPasswordForm token={token} />
      )}
    </AuthShell>
  );
}
