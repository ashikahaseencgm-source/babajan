import type { Metadata } from "next";
import { confirmNewsletter } from "@/app/actions/engagement";
import { EmptyState } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Newsletter", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function NewsletterConfirmPage({ searchParams }: Props) {
  const { token = "" } = await searchParams;
  const ok = await confirmNewsletter(token);
  return (
    <div className="container-bs py-10">
      <EmptyState title={ok ? "You're subscribed" : "This link has expired"} actions={<LinkButton href="/new-arrivals">See New Arrivals</LinkButton>}>
        {ok ? "Thank you. We'll be in touch with new arrivals and collections — occasionally, never too often." : "Please sign up again from the footer of any page."}
      </EmptyState>
    </div>
  );
}
