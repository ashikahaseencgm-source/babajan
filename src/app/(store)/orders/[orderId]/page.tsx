import type { Metadata } from "next";
import { findOrderByAccessToken } from "@/server/orders/checkout";
import { OrderDetail } from "@/components/checkout/order-detail";
import { EmptyState } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

type Props = { params: Promise<{ orderId: string }>; searchParams: Promise<{ token?: string }> };

/** Secure guest order view: requires the current HMAC access token from the emailed link. */
export default async function GuestOrderPage({ params, searchParams }: Props) {
  const [{ orderId }, { token = "" }] = await Promise.all([params, searchParams]);
  const order = await findOrderByAccessToken(orderId, token);
  if (!order) {
    return (
      <div className="container-bs py-10">
        <EmptyState title="This link has expired or isn't valid" actions={<LinkButton href="/order-lookup">Request a new link</LinkButton>}>
          For your security, order links stop working when a newer link is requested.
        </EmptyState>
      </div>
    );
  }
  return (
    <div className="container-bs py-10 lg:py-14">
      <p className="t-eyebrow">Order {order.orderNumber}</p>
      <h1 className="t-page mt-3">Your order</h1>
      <div className="mt-8">
        <OrderDetail order={order} />
      </div>
    </div>
  );
}
