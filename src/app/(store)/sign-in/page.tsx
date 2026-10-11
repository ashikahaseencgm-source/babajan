import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/forms";
import { Alert } from "@/components/ui/primitives";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Sign In", robots: { index: false, follow: true } };

type Props = { searchParams: Promise<{ next?: string; reset?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const { next = "/account", reset } = await searchParams;
  const safe = /^\/(?!\/)/.test(next) ? next : "/account";
  if (await getCurrentUser()) redirect(safe);
  return (
    <AuthShell title="Welcome back" intro="Sign in to see your orders and saved addresses." image={{ url: "/images/preview/m-sherwani-ivory.jpg", alt: "" }}>
      {reset ? (
        <Alert tone="success" className="mb-6">
          Your password has been updated. Please sign in.
        </Alert>
      ) : null}
      <SignInForm next={safe} />
    </AuthShell>
  );
}
