"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resolveCartId } from "@/server/cart";
import { getCurrentUser } from "@/server/session";
import { limitByIp } from "@/server/rate-limit";
import { createOrderFromCart, findOrderByAccessToken } from "@/server/orders/checkout";
import { abandonPendingOrder, confirmRazorpayCheckout, expireStaleOrders, simulateTestPayment } from "@/server/orders/service";
import { checkoutSchema, fieldErrors } from "@/lib/validation";
import { ensureCart } from "@/server/cart";

export type CheckoutState = { status: "idle" | "error"; message?: string; errors?: Record<string, string>; values?: Record<string, string> };

export async function placeOrderAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  if (!(await limitByIp("checkout", 10, 300))) return { status: "error", message: "Too many attempts. Please wait a few minutes and try again." };

  const raw = {
    email: String(formData.get("email") ?? ""),
    address: {
      fullName: String(formData.get("fullName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      line1: String(formData.get("line1") ?? ""),
      line2: String(formData.get("line2") ?? ""),
      city: String(formData.get("city") ?? ""),
      state: String(formData.get("state") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      country: "IN",
    },
    shippingMethodId: String(formData.get("shippingMethodId") ?? ""),
    customerNote: String(formData.get("customerNote") ?? ""),
    checkoutKey: String(formData.get("checkoutKey") ?? ""),
    expectedTotal: String(formData.get("expectedTotal") ?? ""),
    saveAddress: formData.get("saveAddress") === "on",
  };
  const values = { email: raw.email, customerNote: raw.customerNote, ...raw.address } as Record<string, string>;
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    // Flatten "address.city" → "city" to match form field names.
    const flat = Object.fromEntries(Object.entries(errors).map(([k, v]) => [k.replace(/^address\./, ""), v]));
    return { status: "error", errors: flat, values, message: "Please check the highlighted details and try again." };
  }

  const cartId = await resolveCartId();
  if (!cartId) redirect("/bag");
  await expireStaleOrders();
  const user = await getCurrentUser();
  const result = await createOrderFromCart({ cartId, input: parsed.data, userId: user?.id ?? null });
  if (!result.ok) {
    if (result.code === "empty" || result.code === "review_bag" || result.code === "stock") {
      revalidatePath("/", "layout");
      redirect(`/bag?notice=${result.code}`);
    }
    return { status: "error", message: result.message, values };
  }
  revalidatePath("/", "layout");
  redirect(`/checkout/pay/${result.orderId}?token=${encodeURIComponent(result.accessToken)}`);
}

const orderRef = z.object({ orderId: z.string().uuid(), token: z.string().min(10).max(100) });

async function authorisedOrder(orderId: string, token: string) {
  const p = orderRef.safeParse({ orderId, token });
  if (!p.success) return null;
  return findOrderByAccessToken(p.data.orderId, p.data.token);
}

/** TEST MODE ONLY — simulates the provider's result through the signed webhook path. */
export async function simulatePaymentAction(orderId: string, token: string, outcome: "success" | "failure") {
  const order = await authorisedOrder(orderId, token);
  if (!order) return { ok: false as const, message: "Order not found." };
  const res = await simulateTestPayment(order.id, outcome);
  if (outcome === "success" && (res.outcome === "confirmed" || res.outcome === "already_paid" || res.outcome === "late_payment_restocked")) {
    redirect(`/checkout/confirmation/${order.id}?token=${encodeURIComponent(token)}`);
  }
  return { ok: outcome === "success", message: outcome === "failure" ? "Your payment was not completed. No money has been taken. You can try again." : "We couldn't confirm this payment. Please contact us." };
}

export async function confirmRazorpayAction(orderId: string, token: string, payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
  const order = await authorisedOrder(orderId, token);
  if (!order) return { ok: false as const, message: "Order not found." };
  const res = await confirmRazorpayCheckout({
    razorpayOrderId: String(payload.razorpay_order_id).slice(0, 64),
    razorpayPaymentId: String(payload.razorpay_payment_id).slice(0, 64),
    signature: String(payload.razorpay_signature).slice(0, 256),
  });
  if (!res.ok) return res;
  // Whether confirmed now or by webhook moments later, the confirmation page reflects server state.
  redirect(`/checkout/confirmation/${order.id}?token=${encodeURIComponent(token)}`);
}

export async function abandonOrderAction(orderId: string, token: string) {
  const order = await authorisedOrder(orderId, token);
  if (!order) redirect("/bag");
  const cartId = await ensureCart();
  await abandonPendingOrder(order.id, cartId);
  revalidatePath("/", "layout");
  redirect("/bag");
}
