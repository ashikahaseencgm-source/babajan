import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { getCartView, toPricingLines } from "@/server/cart";
import { getSettings } from "@/server/settings";
import { getCurrentUser } from "@/server/session";
import { db, schema } from "@/server/db";
import { computeTotals } from "@/server/domain/pricing";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { CheckoutSummary } from "@/components/checkout/checkout-summary";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  const [bag, settings, user] = await Promise.all([getCartView(), getSettings(), getCurrentUser()]);
  if (bag.lines.length === 0) redirect("/bag");
  if (bag.hasBlockingIssues) redirect("/bag?notice=review_bag");

  const lines = toPricingLines(bag.lines);
  const discount = bag.discount?.ok ? bag.discount.amount : 0;
  const methods = settings.shipping.methods.map((m) => ({
    id: m.id,
    label: m.label,
    estimate: m.estimate,
    totals: computeTotals({ lines, discount, shipping: m, tax: settings.tax }),
  }));

  const [defaultAddress] = user
    ? await db
        .select()
        .from(schema.address)
        .where(and(eq(schema.address.userId, user.id)))
        .orderBy(desc(schema.address.isDefault), desc(schema.address.updatedAt))
        .limit(1)
    : [];

  return (
    <div className="container-bs py-10 lg:py-14">
      <h1 className="t-page">Checkout</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_26rem] lg:gap-14">
        <CheckoutForm
          checkoutKey={randomUUID()}
          signedIn={!!user}
          defaults={{
            email: user?.email ?? "",
            fullName: defaultAddress?.fullName ?? user?.name ?? "",
            phone: defaultAddress?.phone ?? "",
            line1: defaultAddress?.line1 ?? "",
            line2: defaultAddress?.line2 ?? "",
            city: defaultAddress?.city ?? "",
            state: defaultAddress?.state ?? "",
            postalCode: defaultAddress?.postalCode ?? "",
          }}
          methods={methods.map((m) => ({ id: m.id, label: m.label, estimate: m.estimate, fee: m.totals.shippingTotal, grandTotal: m.totals.grandTotal }))}
        />
        <CheckoutSummary bag={bag} totals={methods[0].totals} taxConfirmed={settings.tax.confirmedByOwner} />
      </div>
    </div>
  );
}
