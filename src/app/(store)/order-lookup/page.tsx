import type { Metadata } from "next";
import { OrderLookupForm } from "@/components/store/order-lookup-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Track Your Order", robots: { index: false, follow: true } };

export default function OrderLookupPage() {
  return (
    <AuthShell
      title="Track your order"
      intro="Enter your order number and the email you used at checkout. We'll email you a secure link to view it."
      image={{ url: "/images/preview/m-kurta-lavender.jpg", alt: "" }}
    >
      <OrderLookupForm />
    </AuthShell>
  );
}
