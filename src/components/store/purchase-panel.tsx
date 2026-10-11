"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { addToBagAction } from "@/app/actions/cart";
import { Button, LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";

type Variant = { id: string; size: string | null; price: number; stock: number };

const LOW_STOCK = 3;

export function PurchasePanel({ variants, basePrice, purchasable }: { variants: Variant[]; basePrice: number; purchasable: boolean }) {
  const single = variants.length === 1 && !variants[0].size;
  const onlyOne = variants.length === 1 && variants[0].stock > 0;
  const [selected, setSelected] = useState<string | null>(single || onlyOne ? variants[0].id : null);
  const [qty, setQty] = useState(1);
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [showSizeError, setShowSizeError] = useState(false);
  const [pending, start] = useTransition();
  const groupId = useId();

  const variant = variants.find((v) => v.id === selected) ?? null;
  const anyInStock = variants.some((v) => v.stock > 0);
  const maxQty = Math.min(variant?.stock ?? 10, 10);
  const priceDiffers = variants.some((v) => v.price !== basePrice);

  function add() {
    setResult(null);
    if (!variant) {
      setShowSizeError(true);
      document.getElementById(`${groupId}-legend`)?.focus();
      return;
    }
    start(async () => {
      const res = await addToBagAction(variant.id, qty);
      setResult(res);
      if (res.ok) setQty(1);
    });
  }

  if (!purchasable) {
    return (
      <Alert tone="info" title="This piece is no longer available">
        Explore similar styles below or browse the latest arrivals.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {!single ? (
        <fieldset aria-describedby={showSizeError && !variant ? `${groupId}-err` : undefined}>
          <div className="mb-3 flex items-center justify-between">
            <legend id={`${groupId}-legend`} tabIndex={-1} className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-navy focus:outline-none">
              Size{variant?.size ? <span className="ml-2 normal-case tracking-normal text-charcoal">— {variant.size}</span> : null}
            </legend>
            <Link href="/size-guide" className="link text-[0.8125rem]">
              View size guide
            </Link>
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`${groupId}-legend`}>
            {variants.map((v) => {
              const out = v.stock <= 0;
              const checked = selected === v.id;
              return (
                <label key={v.id} className={cn("relative", out && "cursor-not-allowed")}>
                  <input
                    type="radio"
                    name={`${groupId}-size`}
                    value={v.id}
                    checked={checked}
                    disabled={out}
                    onChange={() => {
                      setSelected(v.id);
                      setShowSizeError(false);
                      setResult(null);
                      setQty(1);
                    }}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "inline-flex min-h-11 min-w-12 cursor-pointer items-center justify-center rounded-sm border px-3.5 text-sm transition-colors",
                      "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue",
                      checked ? "border-navy bg-navy text-white" : "border-mist bg-white text-charcoal hover:border-navy",
                      out && "cursor-not-allowed border-dashed bg-ivory text-slate line-through decoration-slate/60 hover:border-mist",
                    )}
                  >
                    {v.size}
                    {out ? <span className="sr-only"> — this size is currently unavailable</span> : null}
                  </span>
                </label>
              );
            })}
          </div>
          {showSizeError && !variant ? (
            <p id={`${groupId}-err`} className="mt-2 text-[0.8125rem] font-medium text-error" role="alert">
              Please choose a size.
            </p>
          ) : null}
          {variant && variant.stock > 0 && variant.stock <= LOW_STOCK ? (
            <p className="mt-3 text-[0.8125rem] text-slate">
              Only {variant.stock} left in this size.
            </p>
          ) : null}
          {!anyInStock ? <p className="mt-3 text-[0.8125rem] text-slate">All sizes are currently unavailable.</p> : null}
          {priceDiffers && variant ? <p className="mt-3 text-sm font-semibold text-navy">{formatMoney(variant.price)} for this size</p> : null}
        </fieldset>
      ) : !anyInStock ? (
        <p className="text-sm text-slate">This piece is currently unavailable.</p>
      ) : null}

      <div className="flex gap-3">
        <div className="flex items-center rounded-sm border border-mist bg-white" role="group" aria-label="Quantity">
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center text-navy disabled:text-slate/50"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
          >
            <Minus className="size-4" aria-hidden="true" />
            <span className="sr-only">Decrease quantity</span>
          </button>
          <output className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
            <span className="sr-only">Quantity </span>
            {qty}
          </output>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center text-navy disabled:text-slate/50"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            disabled={qty >= maxQty}
          >
            <Plus className="size-4" aria-hidden="true" />
            <span className="sr-only">Increase quantity</span>
          </button>
        </div>
        <Button type="button" size="lg" className="flex-1" onClick={add} pending={pending} disabled={!anyInStock}>
          {anyInStock ? "Add to Bag" : "Unavailable"}
        </Button>
      </div>

      <div aria-live="polite" className="min-h-0">
        {result?.ok ? (
          <div className="flex flex-col gap-3 rounded-sm border border-success/30 bg-[#eef6f0] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm font-medium text-success">
              <Check className="size-4" aria-hidden="true" />
              {result.message ?? "Added to your bag."}
            </p>
            <LinkButton href="/bag" size="sm" variant="secondary">
              View bag
            </LinkButton>
          </div>
        ) : result && !result.ok ? (
          <Alert tone="error">{result.message}</Alert>
        ) : null}
      </div>
    </div>
  );
}
