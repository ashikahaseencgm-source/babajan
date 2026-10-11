"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuth } from "@/server/auth";
import { env } from "@/server/env";
import { mergeGuestCartIntoUser } from "@/server/cart";
import { consumeRateLimit, limitByIp } from "@/server/rate-limit";
import { emailSchema, fieldErrors, passwordSchema } from "@/lib/validation";
import type { FormState } from "./engagement";

/** Only same-site relative paths are allowed as post-login destinations (no open redirects). */
function safeNext(value: FormDataEntryValue | null, fallback = "/account"): string {
  const v = typeof value === "string" ? value : "";
  return /^\/(?!\/)[^\s\\]*$/.test(v) && !v.startsWith("/api/") ? v : fallback;
}

function apiMessage(err: unknown): string {
  const e = err as { body?: { message?: string; code?: string }; message?: string };
  return e?.body?.message ?? e?.message ?? "Something went wrong.";
}

const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, "Please enter your password.").max(128) });

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error), values };
  const okIp = await limitByIp("signin", 10, 300);
  const okAcct = await consumeRateLimit(`signin-email:${parsed.data.email}`, 5, 300);
  if (!okIp || !okAcct) return { status: "error", values, message: "Too many sign-in attempts. Please wait a few minutes and try again." };

  let userId: string;
  try {
    const res = await getAuth().api.signInEmail({ body: { email: parsed.data.email, password: parsed.data.password }, headers: await headers() });
    userId = res.user.id;
  } catch (err) {
    const msg = apiMessage(err);
    if (/verif/i.test(msg)) return { status: "error", values, message: "Please verify your email first. We've sent you a new link." };
    // Generic message: never reveal whether the email exists.
    return { status: "error", values, message: "That email and password combination didn't work. Please try again." };
  }
  await mergeGuestCartIntoUser(userId);
  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  email: emailSchema,
  password: passwordSchema,
  marketing: z.boolean(),
});

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { name: String(formData.get("name") ?? ""), email: String(formData.get("email") ?? "") };
  const parsed = signUpSchema.safeParse({ ...values, password: formData.get("password"), marketing: formData.get("marketing") === "on" });
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error), values };
  if (!(await limitByIp("signup", 5, 600))) return { status: "error", values, message: "Too many attempts. Please try again later." };

  try {
    const res = await getAuth().api.signUpEmail({
      body: { name: parsed.data.name, email: parsed.data.email, password: parsed.data.password, callbackURL: "/account?verified=1" },
      headers: await headers(),
    });
    if (res.token && res.user) {
      await mergeGuestCartIntoUser(res.user.id);
      revalidatePath("/", "layout");
      redirect(safeNext(formData.get("next")));
    }
  } catch (err) {
    if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    const msg = apiMessage(err);
    if (/exist/i.test(msg)) {
      return { status: "error", values, message: "An account with this email may already exist. Try signing in or resetting your password." };
    }
    if (/password/i.test(msg)) return { status: "error", values, errors: { password: msg } };
    return { status: "error", values, message: "We couldn't create your account. Please try again." };
  }
  return { status: "success", message: "Almost there — please check your inbox to verify your email address." };
}

export async function signOutAction() {
  await getAuth().api.signOut({ headers: await headers() });
  revalidatePath("/", "layout");
  redirect("/");
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  const values = { email: String(formData.get("email") ?? "") };
  if (!parsed.success) return { status: "error", values, errors: { email: "Please enter a valid email address." } };
  if (!(await limitByIp("forgot", 5, 900)) || !(await consumeRateLimit(`forgot-email:${parsed.data}`, 3, 900))) {
    return { status: "error", values, message: "Too many requests. Please try again in 15 minutes." };
  }
  try {
    await getAuth().api.requestPasswordReset({ body: { email: parsed.data, redirectTo: `${env.APP_URL}/reset-password` }, headers: await headers() });
  } catch {
    // Swallow: the response is identical whether or not the account exists.
  }
  return { status: "success", message: "If an account exists for that email, we've sent a link to reset your password. It expires in one hour." };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const parsed = z
    .object({ password: passwordSchema, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match." })
    .safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };
  if (!token) return { status: "error", message: "This reset link is invalid. Please request a new one." };
  try {
    await getAuth().api.resetPassword({ body: { newPassword: parsed.data.password, token }, headers: await headers() });
  } catch {
    return { status: "error", message: "This reset link has expired or was already used. Please request a new one." };
  }
  redirect("/sign-in?reset=1");
}
