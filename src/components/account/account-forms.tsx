"use client";

import { useActionState, useTransition } from "react";
import { changePasswordAction, deleteAddressAction, saveAddressAction, setDefaultAddressAction, updateProfileAction } from "@/app/actions/account";
import type { FormState } from "@/app/actions/engagement";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/ui/field";
import { Alert } from "@/components/ui/primitives";
import { INDIAN_STATES } from "@/lib/india";

const idle: FormState = { status: "idle" };

function Feedback({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <Alert tone={state.status === "error" ? "error" : "success"} live>
      {state.message}
    </Alert>
  );
}

export function AddressForm() {
  const [state, action, pending] = useActionState(saveAddressAction, idle);
  const v = state.status === "success" ? {} : (state.values ?? {});
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="space-y-5">
      <Feedback state={state} />
      <InputField id="fullName" label="Full name" autoComplete="name" required defaultValue={v.fullName} error={e.fullName} />
      <InputField id="phone" type="tel" label="Mobile number" autoComplete="tel-national" required defaultValue={v.phone} error={e.phone} />
      <InputField id="line1" label="House / flat number and street" autoComplete="address-line1" required defaultValue={v.line1} error={e.line1} />
      <InputField id="line2" label="Area, landmark" autoComplete="address-line2" optional defaultValue={v.line2} error={e.line2} />
      <div className="grid gap-5 sm:grid-cols-2">
        <InputField id="city" label="City" autoComplete="address-level2" required defaultValue={v.city} error={e.city} />
        <InputField id="postalCode" label="PIN code" inputMode="numeric" maxLength={6} autoComplete="postal-code" required defaultValue={v.postalCode} error={e.postalCode} />
      </div>
      <SelectField id="state" label="State / union territory" required defaultValue={v.state ?? ""} error={e.state}>
        <option value="" disabled>
          Choose a state
        </option>
        {INDIAN_STATES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </SelectField>
      <Button type="submit" pending={pending}>
        Save Address
      </Button>
    </form>
  );
}

export function AddressActions({ id, isDefault }: { id: string; isDefault: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-4 text-[0.8125rem]">
      {!isDefault ? (
        <button type="button" className="link min-h-9" disabled={pending} onClick={() => start(() => setDefaultAddressAction(id))}>
          Make default
        </button>
      ) : null}
      <button
        type="button"
        className="min-h-9 text-slate underline underline-offset-4 hover:text-error"
        disabled={pending}
        onClick={() => {
          if (confirm("Remove this address?")) start(() => deleteAddressAction(id));
        }}
      >
        Remove
      </button>
    </div>
  );
}

export function ProfileForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, idle);
  return (
    <form action={action} noValidate className="space-y-5">
      <Feedback state={state} />
      <InputField id="name" label="Full name" autoComplete="name" required defaultValue={state.values?.name ?? name} error={state.errors?.name} />
      <Button type="submit" pending={pending}>
        Save Changes
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, idle);
  return (
    <form action={action} noValidate className="space-y-5">
      <Feedback state={state} />
      <InputField id="current" type="password" label="Current password" autoComplete="current-password" required error={state.errors?.current} />
      <InputField id="password" type="password" label="New password" autoComplete="new-password" required minLength={10} hint="At least 10 characters." error={state.errors?.password} />
      <Button type="submit" variant="secondary" pending={pending}>
        Change Password
      </Button>
    </form>
  );
}
