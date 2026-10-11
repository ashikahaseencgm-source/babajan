import Image from "next/image";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { formatMoney } from "@/lib/money";
import { customerStatusLabel } from "@/server/domain/order-state";
import { Badge } from "@/components/ui/primitives";

type Order = typeof schema.order.$inferSelect;

/** Customer-facing order detail (used by account and secure guest links). */
export async function OrderDetail({ order }: { order: Order }) {
  const [items, events] = await Promise.all([
    db.select().from(schema.orderItem).where(eq(schema.orderItem.orderId, order.id)),
    db
      .select()
      .from(schema.orderEvent)
      .where(and(eq(schema.orderEvent.orderId, order.id), eq(schema.orderEvent.customerVisible, true)))
      .orderBy(asc(schema.orderEvent.createdAt)),
  ]);
  const a = order.shippingAddress;
  const status = customerStatusLabel(order);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={order.status === "confirmed" ? "navy" : order.status === "cancelled" ? "muted" : "warning"}>{status}</Badge>
          <p className="text-sm text-slate">
            Placed{" "}
            {order.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}
          </p>
        </div>

        <ul className="mt-6 divide-y divide-mist border-y border-mist">
          {items.map((i) => (
            <li key={i.id} className="flex gap-4 py-4">
              <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-xs bg-ivory">
                {i.imageUrl ? <Image src={i.imageUrl} alt="" fill sizes="64px" className="object-cover" /> : null}
              </div>
              <div className="flex-1 text-sm">
                <Link href={`/products/${i.productSlug}`} className="font-medium text-charcoal hover:text-blue">
                  {i.productName}
                </Link>
                {i.variantLabel ? <p className="text-[0.8125rem] text-slate">{i.variantLabel}</p> : null}
                <p className="text-[0.8125rem] text-slate">
                  {formatMoney(i.unitPrice)} × {i.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-navy">{formatMoney(i.lineTotal)}</p>
            </li>
          ))}
        </ul>

        {order.trackingNumber || order.trackingCarrier ? (
          <div className="mt-6 rounded-sm border border-mist bg-white p-4 text-sm">
            <p className="font-semibold text-navy">Shipment</p>
            <p className="mt-1">
              {order.trackingCarrier}
              {order.trackingNumber ? ` · Tracking number ${order.trackingNumber}` : ""}
            </p>
            {order.trackingUrl ? (
              <a href={order.trackingUrl} className="link mt-1 inline-flex min-h-9 items-center" rel="noopener noreferrer" target="_blank">
                Track with the carrier<span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : null}
          </div>
        ) : null}

        {events.length ? (
          <section className="mt-8" aria-labelledby="timeline">
            <h2 id="timeline" className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-navy">
              Updates
            </h2>
            <ol className="mt-3 space-y-3 border-l border-gold/60 pl-5">
              {events.map((e) => (
                <li key={e.id} className="text-sm">
                  <p className="text-charcoal">{e.message}</p>
                  <p className="text-[0.75rem] text-slate">
                    {e.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>

      <aside className="h-fit space-y-6 rounded-xs border border-mist bg-white p-6 text-sm">
        <div>
          <h2 className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-navy">Delivery to</h2>
          <address className="mt-2 not-italic leading-relaxed text-charcoal">
            {a.fullName}
            <br />
            {a.line1}
            {a.line2 ? (
              <>
                <br />
                {a.line2}
              </>
            ) : null}
            <br />
            {a.city}, {a.state} {a.postalCode}
          </address>
          <p className="mt-1 text-slate">{order.shippingMethod}</p>
        </div>
        <dl className="space-y-1.5 border-t border-mist pt-4 tabular-nums">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatMoney(order.subtotal)}</dd>
          </div>
          {order.discountTotal > 0 ? (
            <div className="flex justify-between">
              <dt>Discount{order.discountCode ? ` (${order.discountCode})` : ""}</dt>
              <dd className="text-success">−{formatMoney(order.discountTotal)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{order.shippingTotal === 0 ? "Complimentary" : formatMoney(order.shippingTotal)}</dd>
          </div>
          {order.taxTotal > 0 && !order.taxInclusive ? (
            <div className="flex justify-between">
              <dt>Tax</dt>
              <dd>{formatMoney(order.taxTotal)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-mist pt-3 font-semibold text-navy">
            <dt>Total</dt>
            <dd className="text-base">{formatMoney(order.grandTotal)}</dd>
          </div>
        </dl>
        <p className="text-[0.8125rem] text-slate">
          Need help with this order?{" "}
          <Link href={`/contact?topic=order&order=${encodeURIComponent(order.orderNumber)}`} className="link">
            Contact our team
          </Link>
        </p>
      </aside>
    </div>
  );
}
