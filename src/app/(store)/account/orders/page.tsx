import type { Metadata } from "next";
import { requireUser } from "@/server/session";
import { customerOrders } from "@/server/account";
import { OrderList } from "@/components/account/order-list";
import { EmptyState, Pagination } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Your Orders", robots: { index: false, follow: false } };

const PAGE = 10;
type Props = { searchParams: Promise<{ page?: string }> };

export default async function OrdersPage({ searchParams }: Props) {
  const user = await requireUser("/account/orders");
  const page = Math.max(1, Math.min(500, Number((await searchParams).page) || 1));
  const { rows, total } = await customerOrders(user.id, { limit: PAGE, offset: (page - 1) * PAGE });
  return (
    <section aria-labelledby="orders-title">
      <h2 id="orders-title" className="t-card">
        Orders
      </h2>
      <div className="mt-4">
        {rows.length ? (
          <>
            <OrderList orders={rows} />
            <Pagination className="mt-8" page={page} pageCount={Math.ceil(total / PAGE)} hrefFor={(p) => `/account/orders?page=${p}`} />
          </>
        ) : (
          <EmptyState title="No orders yet" actions={<LinkButton href="/new-arrivals">Explore New Arrivals</LinkButton>} />
        )}
      </div>
    </section>
  );
}
