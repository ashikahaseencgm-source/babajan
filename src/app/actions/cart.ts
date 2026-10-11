"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addToCart, removeFromCart, setCartDiscountCode, setCartQuantity, type CartMutationResult } from "@/server/cart";
import { limitByIp } from "@/server/rate-limit";

const uuid = z.string().uuid();

function done(result: CartMutationResult) {
  revalidatePath("/", "layout");
  return result;
}

export async function addToBagAction(variantId: string, quantity: number): Promise<CartMutationResult> {
  if (!uuid.safeParse(variantId).success) return { ok: false, message: "Please choose a size." };
  if (!(await limitByIp("cart", 120, 60))) return { ok: false, message: "Please slow down and try again in a moment." };
  return done(await addToCart(variantId, Number(quantity)));
}

export async function updateQuantityAction(variantId: string, quantity: number): Promise<CartMutationResult> {
  if (!uuid.safeParse(variantId).success) return { ok: false, message: "Item not found." };
  return done(await setCartQuantity(variantId, Number(quantity)));
}

export async function removeItemAction(variantId: string): Promise<CartMutationResult> {
  if (!uuid.safeParse(variantId).success) return { ok: false, message: "Item not found." };
  return done(await removeFromCart(variantId));
}

export async function applyDiscountAction(_prev: CartMutationResult | null, formData: FormData): Promise<CartMutationResult> {
  if (!(await limitByIp("discount", 20, 300))) return { ok: false, message: "Too many attempts. Please try again in a few minutes." };
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { ok: false, message: "Please enter a code." };
  return done(await setCartDiscountCode(code));
}

export async function removeDiscountAction(): Promise<CartMutationResult> {
  return done(await setCartDiscountCode(null));
}
