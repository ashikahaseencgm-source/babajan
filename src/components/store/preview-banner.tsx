import { hasSampleProducts } from "@/server/catalog";
import { env } from "@/server/env";

/**
 * Honesty guard: whenever sample catalogue data is live, or the site is not
 * running in production, every page says so. This cannot be dismissed.
 */
export async function PreviewBanner() {
  const sample = await hasSampleProducts();
  const nonProd = env.APP_ENV !== "production";
  const testPayments = env.PAYMENT_PROVIDER === "test";
  if (!sample && !nonProd) return null;
  const parts = [
    nonProd ? `${env.APP_ENV} preview` : null,
    sample ? "sample products shown for demonstration — not real stock or prices" : null,
    testPayments ? "test payments only, no money is taken" : null,
  ].filter(Boolean);
  return (
    <div className="border-b border-gold/50 bg-warn text-charcoal">
      <p className="container-bs py-1.5 text-center text-[0.75rem] leading-snug">
        <strong className="font-semibold">Preview:</strong> {parts.join(" · ")}.
      </p>
    </div>
  );
}
