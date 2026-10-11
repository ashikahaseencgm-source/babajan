"use client";

import { useActionState, useState } from "react";
import { submitContact, type FormState } from "@/app/actions/engagement";
import { Button } from "@/components/ui/button";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import { Alert } from "@/components/ui/primitives";

export function ContactForm({ defaults }: { defaults: { topic?: string; orderNumber?: string; message?: string } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitContact, { status: "idle" });
  const [startedAt] = useState(() => Date.now());
  if (state.status === "success") {
    return (
      <Alert tone="success" title="Message sent" live>
        {state.message}
      </Alert>
    );
  }
  const v = state.values ?? {};
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="space-y-5">
      {state.message ? (
        <Alert tone="error" live>
          {state.message}
        </Alert>
      ) : null}
      <input type="hidden" name="startedAt" value={startedAt} />
      <div className="hidden" aria-hidden="true">
        <label>
          Company <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <InputField id="name" label="Your name" autoComplete="name" required defaultValue={v.name} error={e.name} />
        <InputField id="email" type="email" label="Email" autoComplete="email" required defaultValue={v.email} error={e.email} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField id="topic" label="Topic" required defaultValue={v.topic ?? defaults.topic ?? ""} error={e.topic}>
          <option value="" disabled>
            Choose a topic
          </option>
          <option value="order">An existing order</option>
          <option value="sizing">Sizing and fit</option>
          <option value="product">A product question</option>
          <option value="returns">Returns and refunds</option>
          <option value="other">Something else</option>
        </SelectField>
        <InputField id="orderNumber" label="Order number" optional placeholder="BS-2026-000000" defaultValue={v.orderNumber ?? defaults.orderNumber} error={e.orderNumber} />
      </div>
      <TextareaField id="message" label="Message" required maxLength={3000} rows={6} defaultValue={v.message ?? defaults.message} error={e.message} />
      <Button type="submit" size="lg" pending={pending}>
        Send Message
      </Button>
    </form>
  );
}
