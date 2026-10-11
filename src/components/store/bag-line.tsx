"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { removeItemAction, updateQuantityAction } from "@/app/actions/cart";
import { PlaceholderArt } from "./product-media";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { CartLine } from "@/server/cart";

const MAX = 10;

export function BagLine({ line }: { line: CartLine }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      setError(null);
      setNote(null);
      const r = await fn();
      if (!r.ok) setError(r.message ?? "Something went wrong. Please try again.");
      else if (r.message) setNote(r.message);
    });

  const unavailable = line.issues.includes("unavailable") || line.issues.includes("out_of_stock");
  const maxQty = Math.min(MAX, Math.max(line.stockOnHand, 1));

  return (
    <li className={cn("grid grid-cols-[6rem_1fr] gap-4 py-6 sm:grid-cols-[7.5rem_1fr] sm:gap-6", pending && "opacity-60")} aria-busy={pending || undefined}>
      <Link href={`/products/${line.productSlug}`} className="relative block aspect-[3/4] overflow-hidden rounded-xs bg-white" tabIndex={-1} aria-hidden="true">
        {line.image ? (
          <Image src={line.image.url} alt="" fill sizes="120px" className="object-cover" />
        ) : (
          <PlaceholderArt name={line.productName} colourHex={line.colourHex} compact />
        )}
      </Link>
      <div className="flex min-w-0 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[0.9375rem] font-medium text-charcoal">
              <Link href={`/products/${line.productSlug}`} className="hover:text-blue">
                {line.productName}
              </Link>
            </h3>
            <p className="mt-1 text-[0.8125rem] text-slate">
              {[line.colourName, line.size ? `Size ${line.size}` : null].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-1 text-[0.8125rem] text-slate tabular-nums">{formatMoney(line.unitPrice)} each</p>
          </div>
          <p className="shrink-0 text-[0.9375rem] font-semibold tabular-nums text-navy">
            <span className="sr-only">Line total </span>
            {formatMoney(line.unitPrice * (unavailable ? line.quantity : line.purchasableQuantity))}
          </p>
        </div>

        {line.issues.length ? (
          <ul className="mt-3 space-y-1 text-[0.8125rem]">
            {line.issues.includes("unavailable") ? <li className="font-medium text-error">This item is no longer available. Please remove it to continue.</li> : null}
            {line.issues.includes("out_of_stock") ? <li className="font-medium text-error">This size is currently unavailable. Please remove it to continue.</li> : null}
            {line.issues.includes("quantity_reduced") ? (
              <li className="font-medium text-error">Only {line.stockOnHand} available — please update the quantity.</li>
            ) : null}
            {line.issues.includes("price_changed") ? (
              <li className="text-charcoal">
                The price has changed from {formatMoney(line.previousUnitPrice)} to {formatMoney(line.unitPrice)} since you added this.
              </li>
            ) : null}
          </ul>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
          {!unavailable ? (
            <div className="flex items-center rounded-sm border border-mist bg-white" role="group" aria-label={`Quantity for ${line.productName}`}>
              <button
                type="button"
                disabled={pending || line.quantity <= 1}
                onClick={() => run(() => updateQuantityAction(line.variantId, line.quantity - 1))}
                className="inline-flex size-11 items-center justify-center text-navy disabled:text-slate/40"
              >
                <Minus className="size-4" aria-hidden="true" />
                <span className="sr-only">Decrease quantity</span>
              </button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                <span className="sr-only">Quantity </span>
                {line.quantity}
              </span>
              <button
                type="button"
                disabled={pending || line.quantity >= maxQty}
                onClick={() => run(() => updateQuantityAction(line.variantId, line.quantity + 1))}
                className="inline-flex size-11 items-center justify-center text-navy disabled:text-slate/40"
              >
                <Plus className="size-4" aria-hidden="true" />
                <span className="sr-only">Increase quantity</span>
              </button>
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-4">
            {line.issues.includes("quantity_reduced") ? (
              <button type="button" className="link min-h-11 text-[0.8125rem]" disabled={pending} onClick={() => run(() => updateQuantityAction(line.variantId, line.stockOnHand))}>
                Update to {line.stockOnHand}
              </button>
            ) : null}
            <button type="button" className="min-h-11 text-[0.8125rem] text-slate underline underline-offset-4 hover:text-error" disabled={pending} onClick={() => run(() => removeItemAction(line.variantId))}>
              Remove<span className="sr-only"> {line.productName}</span>
            </button>
          </div>
        </div>
        <div aria-live="polite">
          {error ? <p className="mt-2 text-[0.8125rem] font-medium text-error">{error}</p> : null}
          {note ? <p className="mt-2 text-[0.8125rem] text-charcoal">{note}</p> : null}
        </div>
      </div>
    </li>
  );
}
