import { formatMoney } from "@/lib/money";
import type { Totals } from "@/server/domain/pricing";
import type { ReactNode } from "react";

export function TotalsTable({
  totals,
  discountCode,
  shippingLabel,
  shippingKnown = true,
  taxConfirmed,
  children,
}: {
  totals: Totals;
  discountCode?: string | null;
  shippingLabel?: string | null;
  shippingKnown?: boolean;
  taxConfirmed: boolean;
  children?: ReactNode;
}) {
  const row = "flex items-baseline justify-between gap-4 py-1.5";
  return (
    <dl className="text-sm tabular-nums">
      <div className={row}>
        <dt className="text-charcoal">Subtotal</dt>
        <dd className="text-charcoal">{formatMoney(totals.subtotal)}</dd>
      </div>
      {totals.discountTotal > 0 ? (
        <div className={row}>
          <dt className="text-charcoal">Discount{discountCode ? ` (${discountCode})` : ""}</dt>
          <dd className="text-success">−{formatMoney(totals.discountTotal)}</dd>
        </div>
      ) : null}
      <div className={row}>
        <dt className="text-charcoal">{shippingLabel ?? "Delivery"}</dt>
        <dd className="text-charcoal">{!shippingKnown ? "Calculated at checkout" : totals.shippingTotal === 0 ? "Complimentary" : formatMoney(totals.shippingTotal)}</dd>
      </div>
      {totals.taxTotal > 0 && !totals.taxInclusive ? (
        <div className={row}>
          <dt className="text-charcoal">Tax</dt>
          <dd className="text-charcoal">{formatMoney(totals.taxTotal)}</dd>
        </div>
      ) : null}
      {children}
      <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-mist pt-4">
        <dt className="font-semibold text-navy">Total</dt>
        <dd className="text-lg font-semibold text-navy">{formatMoney(totals.grandTotal)}</dd>
      </div>
      {totals.taxInclusive && taxConfirmed ? (
        <p className="mt-1 text-right text-[0.75rem] text-slate">
          Includes applicable taxes{totals.taxTotal > 0 ? ` (${formatMoney(totals.taxTotal)})` : ""}
        </p>
      ) : null}
    </dl>
  );
}
