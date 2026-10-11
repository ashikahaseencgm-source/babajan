import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Access Denied", robots: { index: false, follow: false } };

export default function AccessDeniedPage() {
  return (
    <div className="container-bs py-10">
      <EmptyState title="You don't have access to this page" actions={<LinkButton href="/">Return Home</LinkButton>}>
        If you believe this is a mistake, ask a store administrator to check your account role.
      </EmptyState>
    </div>
  );
}
