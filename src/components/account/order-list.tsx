import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { customerStatusLabel, type FulfillmentStatus, type OrderStatus, type PaymentStatus } from "@/server/domain/order-state";
import { Badge } from "@/components/ui/primitives";

type Row = {
  orderNumber: string;
  createdAt: Date;
  grandTotal: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  itemCount: number;
};

export function OrderList({ orders }: { orders: Row[] }) {
  return (
    <ul className="divide-y divide-mist border-y border-mist">
      {orders.map((o) => (
        <li key={o.orderNumber}>
          <Link href={`/account/orders/${o.orderNumber}`} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-white/60">
            <div>
              <p className="font-semibold text-navy">{o.orderNumber}</p>
              <p className="text-[0.8125rem] text-slate">
                {o.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })} · {o.itemCount}{" "}
                {o.itemCount === 1 ? "item" : "items"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge tone={o.status === "confirmed" ? "navy" : "muted"}>{customerStatusLabel(o)}</Badge>
              <span className="text-sm font-semibold tabular-nums text-navy">{formatMoney(o.grandTotal)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
