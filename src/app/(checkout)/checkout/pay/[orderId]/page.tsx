import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { env } from "@/server/env";
import { findOrderByAccessToken, getOrCreatePayment } from "@/server/orders/checkout";
import { expireStaleOrders } from "@/server/orders/service";
import { formatMoney } from "@/lib/money";
import { Alert } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { PaymentPanel } from "@/components/checkout/payment-panel";

export const metadata: Metadata = { title: "Payment", robots: { index: false, follow: false } };

type Props = { params: Promise<{ orderId: string }>; searchParams: Promise<{ token?: string }> };

export default async function PayPage({ params, searchParams }: Props) {
  const [{ orderId }, { token = "" }] = await Promise.all([params, searchParams]);
  await expireStaleOrders();
  const order = await findOrderByAccessToken(orderId, token);
  if (!order) notFound();
  if (order.status === "confirmed") redirect(`/checkout/confirmation/${order.id}?token=${encodeURIComponent(token)}`);

  if (order.status !== "pending_payment") {
    return (
      <div className="container-bs max-w-2xl py-16">
        <h1 className="t-page">This order can no longer be paid</h1>
        <Alert tone="info" className="mt-6">
          {order.status === "expired"
            ? "The time to complete payment has passed and the items were released. No money has been taken for this order."
            : "This order was cancelled. No money has been taken for it unless you were told otherwise."}
        </Alert>
        <LinkButton href="/bag" className="mt-8">
          Return to your bag
        </LinkButton>
      </div>
    );
  }

  const items = await db.select().from(schema.orderItem).where(eq(schema.orderItem.orderId, order.id));
  let client: Awaited<ReturnType<typeof getOrCreatePayment>> = null;
  let providerError = false;
  try {
    client = await getOrCreatePayment(order.id);
  } catch (e) {
    console.error("[pay] could not create provider payment", e instanceof Error ? e.message : e);
    providerError = true;
  }
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <div className="container-bs grid gap-10 py-10 lg:grid-cols-[1fr_24rem] lg:gap-14 lg:py-14">
      <div>
        <p className="t-eyebrow">Order {order.orderNumber}</p>
        <h1 className="t-page mt-3">Complete your payment</h1>
        <p className="mt-3 text-slate">
          Your items are held until{" "}
          <time dateTime={order.reservedUntil?.toISOString()}>
            {order.reservedUntil?.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST
          </time>
          . Your order is confirmed only after we receive verification from the payment provider.
        </p>
        {order.paymentStatus === "failed" ? (
          <Alert tone="warning" className="mt-6" title="Your last payment attempt was not completed">
            No money has been taken. You can try again below.
          </Alert>
        ) : null}
        <div className="mt-8">
          {providerError || !client ? (
            <Alert tone="error" title="Payment is temporarily unavailable">
              We couldn&rsquo;t start a secure payment session. Please try again in a moment, or contact us.
            </Alert>
          ) : (
            <PaymentPanel
              orderId={order.id}
              token={token}
              amountLabel={formatMoney(order.grandTotal)}
              config={client.client}
              prefill={{ email: order.email, contact: order.phone, name: order.shippingAddress.fullName }}
              nonce={nonce}
              testMode={env.PAYMENT_PROVIDER === "test"}
            />
          )}
        </div>
      </div>
      <aside className="h-fit rounded-xs border border-mist bg-white p-6" aria-labelledby="pay-summary">
        <h2 id="pay-summary" className="t-card">
          Summary
        </h2>
        <ul className="mt-4 space-y-2 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span>
                {i.productName} <span className="text-slate">× {i.quantity}</span>
              </span>
              <span className="tabular-nums">{formatMoney(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-mist pt-4 text-sm tabular-nums">
          {order.discountTotal > 0 ? (
            <div className="flex justify-between">
              <dt>Discount</dt>
              <dd className="text-success">−{formatMoney(order.discountTotal)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{order.shippingTotal === 0 ? "Complimentary" : formatMoney(order.shippingTotal)}</dd>
          </div>
          <div className="flex justify-between border-t border-mist pt-3 font-semibold text-navy">
            <dt>Total</dt>
            <dd className="text-lg">{formatMoney(order.grandTotal)}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
