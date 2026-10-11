"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { placeOrderAction, type CheckoutState } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import { CheckboxField, InputField, SelectField, TextareaField } from "@/components/ui/field";
import { Alert } from "@/components/ui/primitives";
import { INDIAN_STATES } from "@/lib/india";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";

type Method = { id: string; label: string; estimate: string | null; fee: number; grandTotal: number };

export function CheckoutForm({
  checkoutKey,
  signedIn,
  defaults,
  methods,
}: {
  checkoutKey: string;
  signedIn: boolean;
  defaults: Record<"email" | "fullName" | "phone" | "line1" | "line2" | "city" | "state" | "postalCode", string>;
  methods: Method[];
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrderAction, { status: "idle" });
  const [methodId, setMethodId] = useState(methods[0]?.id ?? "");
  const method = methods.find((m) => m.id === methodId) ?? methods[0];
  const e = state.errors ?? {};
  const v = { ...defaults, ...(state.values ?? {}) };
  const section = "space-y-5 border-t border-mist pt-8 first:border-t-0 first:pt-0 [&>legend+*]:clear-both";
  const h = "float-left mb-1 w-full font-display text-2xl text-navy";

  return (
    <form action={action} noValidate className="space-y-8" aria-describedby={state.message ? "co-error" : undefined}>
      <input type="hidden" name="checkoutKey" value={checkoutKey} />
      <input type="hidden" name="expectedTotal" value={method?.grandTotal ?? 0} />

      {state.status === "error" && state.message ? (
        <div id="co-error">
          <Alert tone="error" live>
            {state.message}
          </Alert>
        </div>
      ) : null}

      <fieldset className={section}>
        <legend className={h}>Contact</legend>
        {!signedIn ? (
          <p className="text-sm text-slate">
            Checking out as a guest.{" "}
            <Link href="/sign-in?next=/checkout" className="link">
              Sign in
            </Link>{" "}
            to use saved addresses.
          </p>
        ) : null}
        <InputField id="email" name="email" type="email" label="Email" autoComplete="email" required defaultValue={v.email} error={e.email} hint="We'll send your order confirmation here." />
      </fieldset>

      <fieldset className={section}>
        <legend className={h}>Delivery address</legend>
        <InputField id="fullName" label="Full name" autoComplete="name" required defaultValue={v.fullName} error={e.fullName} />
        <InputField id="phone" type="tel" label="Mobile number" autoComplete="tel-national" inputMode="tel" required defaultValue={v.phone} error={e.phone} hint="For delivery updates. 10-digit Indian mobile number." />
        <InputField id="line1" label="House / flat number and street" autoComplete="address-line1" required defaultValue={v.line1} error={e.line1} />
        <InputField id="line2" label="Area, landmark" autoComplete="address-line2" optional defaultValue={v.line2} error={e.line2} />
        <div className="grid gap-5 sm:grid-cols-2">
          <InputField id="city" label="City" autoComplete="address-level2" required defaultValue={v.city} error={e.city} />
          <InputField id="postalCode" label="PIN code" autoComplete="postal-code" inputMode="numeric" maxLength={6} required defaultValue={v.postalCode} error={e.postalCode} />
        </div>
        <SelectField id="state" label="State / union territory" autoComplete="address-level1" required defaultValue={v.state} error={e.state}>
          <option value="" disabled>
            Choose a state
          </option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
        <p className="text-[0.8125rem] text-slate">We currently deliver within India.</p>
        {signedIn ? <CheckboxField id="saveAddress" label="Save this address to my account" /> : null}
      </fieldset>

      <fieldset className={section}>
        <legend className={h}>Delivery method</legend>
        <div className="space-y-2" role="radiogroup">
          {methods.map((m) => (
            <label
              key={m.id}
              className={cn(
                "flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-sm border bg-white px-4 py-3 text-sm",
                m.id === methodId ? "border-navy" : "border-mist hover:border-slate-muted",
              )}
            >
              <span className="flex items-center gap-3">
                <input type="radio" name="shippingMethodId" value={m.id} checked={m.id === methodId} onChange={() => setMethodId(m.id)} className="size-4 accent-navy" />
                <span>
                  <span className="font-medium text-charcoal">{m.label}</span>
                  {m.estimate ? <span className="block text-[0.8125rem] text-slate">{m.estimate}</span> : null}
                </span>
              </span>
              <span className="font-semibold tabular-nums text-navy">{m.fee === 0 ? "Complimentary" : formatMoney(m.fee)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={section}>
        <legend className={h}>Anything we should know?</legend>
        <TextareaField id="customerNote" defaultValue={state.values?.customerNote ?? ""} label="Order note" optional maxLength={500} rows={3} hint="For example, delivery instructions. Up to 500 characters." error={e.customerNote} className="min-h-24" />
      </fieldset>

      <div className="border-t border-mist pt-8">
        <div className="flex items-baseline justify-between text-navy">
          <span className="font-semibold">Total to pay</span>
          <span className="text-xl font-semibold tabular-nums">{method ? formatMoney(method.grandTotal) : "—"}</span>
        </div>
        <Button type="submit" size="lg" className="mt-5 w-full" pending={pending}>
          Continue to Payment
        </Button>
        <p className="mt-3 text-center text-[0.75rem] text-slate">
          By placing your order you agree to our{" "}
          <Link href="/policies/terms" className="link">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/policies/privacy" className="link">
            privacy policy
          </Link>
          . Items are held for you for a limited time while you complete payment.
        </p>
      </div>
    </form>
  );
}
