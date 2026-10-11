"use server";

import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { getAuth } from "@/server/auth";
import { getCurrentUser } from "@/server/session";
import { addressSchema, fieldErrors, passwordSchema } from "@/lib/validation";
import { normaliseIndianMobile } from "@/lib/india";
import type { FormState } from "./engagement";

async function me() {
  const u = await getCurrentUser();
  if (!u) throw new Error("Not signed in");
  return u;
}

export async function saveAddressAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await me();
  const values = Object.fromEntries(["fullName", "phone", "line1", "line2", "city", "state", "postalCode"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = addressSchema.safeParse({ ...values, country: "IN" });
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error), values };
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.address).where(eq(schema.address.userId, user.id));
  if (n >= 10) return { status: "error", values, message: "You can save up to 10 addresses." };
  await db.insert(schema.address).values({ ...parsed.data, phone: normaliseIndianMobile(parsed.data.phone), userId: user.id, isDefault: n === 0 });
  revalidatePath("/account/addresses");
  return { status: "success", message: "Address saved." };
}

export async function deleteAddressAction(id: string) {
  const user = await me();
  if (!z.string().uuid().safeParse(id).success) return;
  // Ownership enforced in the WHERE clause.
  await db.delete(schema.address).where(and(eq(schema.address.id, id), eq(schema.address.userId, user.id)));
  revalidatePath("/account/addresses");
}

export async function setDefaultAddressAction(id: string) {
  const user = await me();
  if (!z.string().uuid().safeParse(id).success) return;
  await db.transaction(async (tx) => {
    const [owned] = await tx.select({ id: schema.address.id }).from(schema.address).where(and(eq(schema.address.id, id), eq(schema.address.userId, user.id)));
    if (!owned) return;
    await tx.update(schema.address).set({ isDefault: false }).where(eq(schema.address.userId, user.id));
    await tx.update(schema.address).set({ isDefault: true }).where(eq(schema.address.id, id));
  });
  revalidatePath("/account/addresses");
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await me();
  const values = { name: String(formData.get("name") ?? "") };
  const parsed = z.object({ name: z.string().trim().min(2, "Please enter your name.").max(100) }).safeParse(values);
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error), values };
  await getAuth().api.updateUser({ body: { name: parsed.data.name }, headers: await headers() });
  revalidatePath("/account", "layout");
  return { status: "success", message: "Profile updated.", values };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await me();
  const parsed = z
    .object({ current: z.string().min(1, "Please enter your current password."), password: passwordSchema })
    .safeParse({ current: formData.get("current"), password: formData.get("password") });
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };
  try {
    await getAuth().api.changePassword({
      body: { currentPassword: parsed.data.current, newPassword: parsed.data.password, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch {
    return { status: "error", errors: { current: "That password isn't correct." } };
  }
  return { status: "success", message: "Password changed. You've been signed out of other devices." };
}
