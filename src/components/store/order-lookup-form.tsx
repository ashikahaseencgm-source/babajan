"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestOrderLookup, type FormState } from "@/app/actions/engagement";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { Alert } from "@/components/ui/primitives";

export function OrderLookupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestOrderLookup, { status: "idle" });
  if (state.status === "success") return <Alert tone="success" live>{state.message}</Alert>;
  return (
    <form action={action} noValidate className="space-y-5">
      {state.message ? (
        <Alert tone="error" live>
          {state.message}
        </Alert>
      ) : null}
      <InputField id="orderNumber" label="Order number" placeholder="BS-2026-000000" autoCapitalize="characters" required defaultValue={state.values?.orderNumber} error={state.errors?.orderNumber} />
      <InputField id="email" type="email" label="Email used at checkout" autoComplete="email" required defaultValue={state.values?.email} error={state.errors?.email} />
      <Button type="submit" size="lg" className="w-full" pending={pending}>
        Email Me a Secure Link
      </Button>
      <p className="text-center text-sm text-slate">
        Have an account?{" "}
        <Link href="/sign-in?next=/account/orders" className="link">
          Sign in to see all orders
        </Link>
      </p>
    </form>
  );
}
