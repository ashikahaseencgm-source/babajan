import type { Metadata } from "next";
import Link from "next/link";
import { getCartView } from "@/server/cart";
import { getSettings } from "@/server/settings";
import { BagLine } from "@/components/store/bag-line";
import { DiscountForm } from "@/components/store/discount-form";
import { TotalsTable } from "@/components/store/order-summary";
import { LinkButton } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Your Bag", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ notice?: string }> };

const notices: Record<string, string> = {
  review_bag: "Availability changed for something in your bag. Please review it before checking out.",
  stock: "Part of your order sold out just before payment. We've updated your bag.",
  empty: "Your bag was empty when you tried to check out.",
};

export default async function BagPage({ searchParams }: Props) {
  const [bag, settings, { notice }] = await Promise.all([getCartView(), getSettings(), searchParams]);
  const noticeText = notice ? notices[notice] : undefined;

  if (bag.lines.length === 0) {
    return (
      <div className="container-bs py-10">
        <h1 className="sr-only">Your bag</h1>
        <EmptyState
          title="Your bag is waiting for something you love."
          actions={
            <>
              <LinkButton href="/women" variant="secondary">
                Shop Women
              </LinkButton>
              <LinkButton href="/men" variant="secondary">
                Shop Men
              </LinkButton>
            </>
          }
        >
          Explore the collections and add pieces here when you&rsquo;re ready.
        </EmptyState>
      </div>
    );
  }

  const priceChanged = bag.lines.some((l) => l.issues.includes("price_changed"));

  return (
    <div className="container-bs py-10 lg:py-14">
      <h1 className="t-page">Your bag</h1>
      {noticeText ? (
        <Alert tone="warning" className="mt-4" live>
          {noticeText}
        </Alert>
      ) : null}
      <p className="mt-2 text-slate">
        {bag.itemCount} {bag.itemCount === 1 ? "item" : "items"}
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-14">
        <section aria-labelledby="bag-items">
          <h2 id="bag-items" className="sr-only">
            Items
          </h2>
          {bag.hasBlockingIssues ? (
            <Alert tone="error" title="Some items need your attention" className="mb-2">
              Availability has changed for one or more items. Please update or remove them before checking out.
            </Alert>
          ) : priceChanged ? (
            <Alert tone="warning" className="mb-2">
              Some prices have changed since you added them. Your bag shows the current prices.
            </Alert>
          ) : null}
          <ul className="divide-y divide-mist border-y border-mist">
            {bag.lines.map((l) => (
              <BagLine key={l.variantId} line={l} />
            ))}
          </ul>
          <Link href="/shop" className="link mt-6 inline-flex min-h-11 items-center text-sm">
            Continue shopping
          </Link>
        </section>

        <aside aria-labelledby="summary-title" className="h-fit rounded-xs border border-mist bg-white p-6 lg:sticky lg:top-28">
          <h2 id="summary-title" className="t-card">
            Summary
          </h2>
          <div className="mt-5 border-b border-mist pb-5">
            <DiscountForm current={bag.discount} />
          </div>
          <div className="mt-4">
            <TotalsTable
              totals={bag.totals}
              discountCode={bag.discount?.ok ? bag.discount.code : null}
              shippingLabel={bag.shippingMethod?.label}
              taxConfirmed={settings.tax.confirmedByOwner}
            />
          </div>
          {bag.hasBlockingIssues ? (
            <p className="mt-6 text-center text-[0.8125rem] font-medium text-error">Please resolve the items above to continue.</p>
          ) : (
            <LinkButton href="/checkout" size="lg" className="mt-6 w-full">
              Proceed to Checkout
            </LinkButton>
          )}
          <p className="mt-4 text-center text-[0.75rem] text-slate">
            Payment is processed securely by our payment provider. See{" "}
            <Link href="/policies/shipping" className="link">
              shipping
            </Link>{" "}
            and{" "}
            <Link href="/policies/returns" className="link">
              returns
            </Link>
            .
          </p>
        </aside>
      </div>
    </div>
  );
}
