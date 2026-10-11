"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, resetPasswordAction, signInAction, signUpAction } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/engagement";
import { Button } from "@/components/ui/button";
import { CheckboxField, InputField } from "@/components/ui/field";
import { Alert } from "@/components/ui/primitives";

const idle: FormState = { status: "idle" };

function Feedback({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <Alert tone={state.status === "error" ? "error" : "success"} live className="mb-6">
      {state.message}
    </Alert>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInAction, idle);
  return (
    <form action={action} noValidate className="space-y-5">
      <Feedback state={state} />
      <input type="hidden" name="next" value={next} />
      <InputField id="email" type="email" label="Email" autoComplete="email" required defaultValue={state.values?.email} error={state.errors?.email} />
      <InputField id="password" type="password" label="Password" autoComplete="current-password" required error={state.errors?.password} />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="link text-[0.8125rem]">
          Forgot your password?
        </Link>
      </div>
      <Button type="submit" size="lg" className="w-full" pending={pending}>
        Sign In
      </Button>
      <p className="text-center text-sm text-slate">
        New to Babajan Sumangali?{" "}
        <Link href={`/sign-up${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`} className="link">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signUpAction, idle);
  if (state.status === "success") return <Alert tone="success" title="Check your inbox">{state.message}</Alert>;
  return (
    <form action={action} noValidate className="space-y-5">
      <Feedback state={state} />
      <input type="hidden" name="next" value={next} />
      <InputField id="name" label="Full name" autoComplete="name" required defaultValue={state.values?.name} error={state.errors?.name} />
      <InputField id="email" type="email" label="Email" autoComplete="email" required defaultValue={state.values?.email} error={state.errors?.email} />
      <InputField id="password" type="password" label="Password" autoComplete="new-password" required minLength={10} error={state.errors?.password} hint="At least 10 characters. A short phrase works well." />
      <CheckboxField id="marketing" label="Send me occasional emails about new arrivals." hint="Optional. You can unsubscribe at any time." />
      <Button type="submit" size="lg" className="w-full" pending={pending}>
        Create Account
      </Button>
      <p className="text-center text-[0.8125rem] text-slate">
        By creating an account you agree to our{" "}
        <Link href="/policies/terms" className="link">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/policies/privacy" className="link">
          privacy policy
        </Link>
        .
      </p>
      <p className="text-center text-sm text-slate">
        Already have an account?{" "}
        <Link href="/sign-in" className="link">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, idle);
  if (state.status === "success") return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} noValidate className="space-y-5">
      <Feedback state={state} />
      <InputField id="email" type="email" label="Email" autoComplete="email" required defaultValue={state.values?.email} error={state.errors?.email} />
      <Button type="submit" size="lg" className="w-full" pending={pending}>
        Send Reset Link
      </Button>
      <Link href="/sign-in" className="link block text-center text-sm">
        Back to sign in
      </Link>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, idle);
  return (
    <form action={action} noValidate className="space-y-5">
      <Feedback state={state} />
      <input type="hidden" name="token" value={token} />
      <InputField id="password" type="password" label="New password" autoComplete="new-password" required minLength={10} error={state.errors?.password} hint="At least 10 characters." />
      <InputField id="confirm" type="password" label="Confirm new password" autoComplete="new-password" required error={state.errors?.confirm} />
      <Button type="submit" size="lg" className="w-full" pending={pending}>
        Set New Password
      </Button>
    </form>
  );
}
