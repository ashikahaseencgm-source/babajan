import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/forms";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Create an Account", robots: { index: false, follow: true } };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function SignUpPage({ searchParams }: Props) {
  const { next = "/account" } = await searchParams;
  const safe = /^\/(?!\/)/.test(next) ? next : "/account";
  if (await getCurrentUser()) redirect(safe);
  return (
    <AuthShell title="Create your account" intro="Track orders, save addresses, and check out faster." image={{ url: "/images/preview/w-bridal-maroon.jpg", alt: "" }}>
      <SignUpForm next={safe} />
    </AuthShell>
  );
}
