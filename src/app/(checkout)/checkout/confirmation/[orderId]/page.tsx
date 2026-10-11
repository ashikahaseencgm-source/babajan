import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findOrderByAccessToken } from "@/server/orders/checkout";
import { OrderDetail } from "@/components/checkout/order-detail";
import { AutoRefresh } from "@/components/checkout/auto-refresh";
import { Alert } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { Emblem } from "@/components/store/logo";

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false, follow: false } };

type Props = { params: Promise<{ orderId: string }>; searchParams: Promise<{ token?: string }> };

export default async function ConfirmationPage({ params, searchParams }: Props) {
  const [{ orderId }, { token = "" }] = await Promise.all([params, searchParams]);
  const order = await findOrderByAccessToken(orderId, token);
  if (!order) notFound();

  const confirmed = order.status === "confirmed" && order.paymentStatus === "paid";
  return (
    <div className="container-bs py-12 lg:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <Emblem size={56} className="mx-auto w-14" />
        <p className="t-eyebrow mt-6">Order {order.orderNumber}</p>
        {confirmed ? (
          <>
            <h1 className="t-page mt-3">Thank you</h1>
            <p className="mt-4 text-[1.0625rem] text-charcoal">Your order is confirmed. We&rsquo;ll share updates as it moves forward.</p>
            <p className="mt-2 text-sm text-slate">A confirmation has been sent to {order.email}.</p>
          </>
        ) : order.status === "pending_payment" ? (
          <>
            <h1 className="t-page mt-3">We&rsquo;re confirming your payment</h1>
            <p className="mt-4 text-charcoal" role="status">
              This usually takes a few seconds. This page updates automatically — please don&rsquo;t pay again.
            </p>
            <AutoRefresh seconds={4} maxTries={15} />
          </>
        ) : (
          <>
            <h1 className="t-page mt-3">This order needs attention</h1>
            <Alert tone="warning" className="mt-6 text-left">
              We couldn&rsquo;t complete this order. If you were charged, a full refund is issued automatically or our team will contact you.
            </Alert>
          </>
        )}
      </div>
      <div className="mx-auto mt-12 max-w-5xl">
        <OrderDetail order={order} />
      </div>
      <div className="mt-10 flex justify-center">
        <LinkButton href="/" variant="secondary">
          Continue Shopping
        </LinkButton>
      </div>
    </div>
  );
}
