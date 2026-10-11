import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/session";
import { customerOrderByNumber } from "@/server/account";
import { OrderDetail } from "@/components/checkout/order-detail";

export const metadata: Metadata = { title: "Order Details", robots: { index: false, follow: false } };

type Props = { params: Promise<{ orderNumber: string }> };

export default async function AccountOrderPage({ params }: Props) {
  const { orderNumber } = await params;
  const user = await requireUser(`/account/orders/${orderNumber}`);
  // Scoped to the signed-in customer: other customers' order numbers return 404.
  const order = await customerOrderByNumber(user.id, decodeURIComponent(orderNumber).slice(0, 30));
  if (!order) notFound();
  return (
    <section aria-labelledby="order-title">
      <Link href="/account/orders" className="link text-sm">
        ← All orders
      </Link>
      <h2 id="order-title" className="t-card mt-4">
        Order {order.orderNumber}
      </h2>
      <div className="mt-6">
        <OrderDetail order={order} />
      </div>
    </section>
  );
}
