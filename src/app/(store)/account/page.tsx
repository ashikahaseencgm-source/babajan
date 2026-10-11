import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/session";
import { customerOrders } from "@/server/account";
import { OrderList } from "@/components/account/order-list";
import { Alert, EmptyState } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Your Account", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ verified?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const user = await requireUser("/account");
  const [{ rows }, { verified }] = await Promise.all([customerOrders(user.id, { limit: 3 }), searchParams]);
  return (
    <div className="space-y-10">
      {verified ? <Alert tone="success">Thank you — your email address is verified.</Alert> : null}
      {!user.emailVerified ? (
        <Alert tone="info">Please verify your email address using the link we sent to {user.email}.</Alert>
      ) : null}
      <section aria-labelledby="recent">
        <div className="flex items-end justify-between gap-4">
          <h2 id="recent" className="t-card">
            Recent orders
          </h2>
          {rows.length ? (
            <Link href="/account/orders" className="link text-sm">
              View all orders
            </Link>
          ) : null}
        </div>
        <div className="mt-4">
          {rows.length ? (
            <OrderList orders={rows} />
          ) : (
            <EmptyState title="No orders yet" className="py-10" actions={<LinkButton href="/new-arrivals">Explore New Arrivals</LinkButton>}>
              When you place an order, it will appear here.
            </EmptyState>
          )}
        </div>
      </section>
      <section aria-labelledby="details" className="grid gap-6 sm:grid-cols-2">
        <h2 id="details" className="sr-only">
          Account details
        </h2>
        <div className="rounded-xs border border-mist bg-white p-6">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-navy">Profile</p>
          <p className="mt-2 text-sm">{user.name}</p>
          <p className="text-sm text-slate">{user.email}</p>
          <Link href="/account/profile" className="link mt-3 inline-flex min-h-9 items-center text-sm">
            Edit profile
          </Link>
        </div>
        <div className="rounded-xs border border-mist bg-white p-6">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-navy">Addresses</p>
          <p className="mt-2 text-sm text-slate">Save delivery addresses for faster checkout.</p>
          <Link href="/account/addresses" className="link mt-3 inline-flex min-h-9 items-center text-sm">
            Manage addresses
          </Link>
        </div>
      </section>
    </div>
  );
}
