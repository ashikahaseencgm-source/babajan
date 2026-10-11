import Image from "next/image";
import { TotalsTable } from "@/components/store/order-summary";
import { PlaceholderArt } from "@/components/store/product-media";
import { formatMoney } from "@/lib/money";
import type { CartView } from "@/server/cart";
import type { Totals } from "@/server/domain/pricing";

export function CheckoutSummary({ bag, totals, taxConfirmed }: { bag: CartView; totals: Totals; taxConfirmed: boolean }) {
  return (
    <aside aria-labelledby="co-summary" className="h-fit rounded-xs border border-mist bg-white p-6 lg:sticky lg:top-8">
      <h2 id="co-summary" className="t-card">
        Order summary
      </h2>
      <ul className="mt-5 divide-y divide-mist">
        {bag.lines.map((l) => (
          <li key={l.variantId} className="flex gap-4 py-4">
            <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-xs bg-ivory">
              {l.image ? <Image src={l.image.url} alt="" fill sizes="64px" className="object-cover" /> : <PlaceholderArt name={l.productName} colourHex={l.colourHex} compact />}
              <span className="absolute -right-0 -top-0 inline-flex min-w-5 items-center justify-center rounded-bl-xs bg-navy px-1 text-[0.6875rem] font-semibold text-white">
                <span className="sr-only">Quantity </span>
                {l.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-charcoal">{l.productName}</p>
              <p className="text-[0.8125rem] text-slate">{[l.colourName, l.size ? `Size ${l.size}` : null].filter(Boolean).join(" · ")}</p>
            </div>
            <p className="text-sm font-semibold tabular-nums text-navy">{formatMoney(l.lineTotal)}</p>
          </li>
        ))}
      </ul>
      <div className="mt-2 border-t border-mist pt-4" id="co-totals">
        <TotalsTable totals={totals} discountCode={bag.discount?.ok ? bag.discount.code : null} shippingLabel="Delivery" taxConfirmed={taxConfirmed} />
      </div>
    </aside>
  );
}
