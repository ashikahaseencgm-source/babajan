"use client";

import { useActionState, useId } from "react";
import { subscribeNewsletter, type FormState } from "@/app/actions/engagement";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export function NewsletterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribeNewsletter, { status: "idle" });
  const id = useId();
  return (
    <form action={action} noValidate aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-navy">
        New arrivals, first
      </h2>
      <p id={`${id}-desc`} className="mt-2 text-sm text-slate">
        Occasional emails about new pieces and collections. Unsubscribe at any time.
      </p>
      <div className="mt-4 flex gap-2">
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="Email address"
          aria-describedby={`${id}-desc ${id}-msg`}
          aria-invalid={state.errors?.email ? true : undefined}
          className={cn(inputClass, "flex-1")}
        />
        <div className="hidden" aria-hidden="true">
          <label>
            Company <input name="company" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <Button type="submit" pending={pending} size="md">
          Subscribe
        </Button>
      </div>
      <p id={`${id}-msg`} role="status" className={cn("mt-2 min-h-5 text-[0.8125rem]", state.status === "error" ? "text-error" : "text-success")}>
        {state.errors?.email ?? state.message ?? ""}
      </p>
    </form>
  );
}
