"use client";

import { useActionState, useTransition } from "react";
import { applyDiscountAction, removeDiscountAction } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { CartMutationResult } from "@/server/cart";

export function DiscountForm({ current }: { current: { code: string; ok: boolean; message?: string } | null }) {
  const [state, action, pending] = useActionState<CartMutationResult | null, FormData>(applyDiscountAction, null);
  const [removing, startRemove] = useTransition();

  if (current?.ok) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <p>
          Code <strong className="font-semibold tracking-wide text-navy">{current.code}</strong> applied
        </p>
        <button type="button" className="link min-h-11 text-[0.8125rem]" disabled={removing} onClick={() => startRemove(async () => void (await removeDiscountAction()))}>
          Remove
        </button>
      </div>
    );
  }

  const error = state && !state.ok ? state.message : current && !current.ok ? current.message : null;
  return (
    <form action={action} noValidate>
      <label htmlFor="discount-code" className="block text-[0.8125rem] font-semibold text-navy">
        Discount code
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="discount-code"
          name="code"
          autoComplete="off"
          autoCapitalize="characters"
          defaultValue={current?.code ?? ""}
          maxLength={32}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "discount-error" : undefined}
          className={cn(inputClass, "flex-1 uppercase")}
        />
        <Button type="submit" variant="secondary" pending={pending}>
          Apply
        </Button>
      </div>
      {error ? (
        <p id="discount-error" className="mt-1.5 text-[0.8125rem] font-medium text-error" role="alert">
          {error}
        </p>
      ) : null}
      {current && !current.ok ? (
        <button type="button" className="link mt-1 min-h-9 text-[0.8125rem]" onClick={() => startRemove(async () => void (await removeDiscountAction()))}>
          Remove code
        </button>
      ) : null}
    </form>
  );
}
