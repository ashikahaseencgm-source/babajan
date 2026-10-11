/** Money helpers. All amounts are integer minor units (paise). */

const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(minor: number, currency = "INR"): string {
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    formatters.set(currency, f);
  }
  // Show paise only when present (₹4,950 vs ₹4,950.50).
  const value = minor / 100;
  return Number.isInteger(value) ? f.format(value) : f.format(value).replace(/(\.\d)$/, "$10");
}

/** Parse a rupee amount typed by staff ("4950", "4,950.50") into paise. Returns null if invalid. */
export function parseRupeesToPaise(input: string): number | null {
  const cleaned = input.replace(/[,\s₹]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export function paiseToRupeesInput(minor: number | null | undefined): string {
  if (minor == null) return "";
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}
