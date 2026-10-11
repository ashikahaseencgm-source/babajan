import { formatMoney } from "@/lib/money";
import { isValidSale } from "@/server/domain/pricing";
import { cn } from "@/lib/cn";

/** Displays price; a sale is shown only when the previous price is genuinely higher. */
export function Price({ price, compareAtPrice, currency = "INR", className, size = "md" }: { price: number; compareAtPrice?: number | null; currency?: string; className?: string; size?: "sm" | "md" | "lg" }) {
  const sale = isValidSale(price, compareAtPrice);
  const text = { sm: "text-[0.875rem]", md: "text-[0.9375rem]", lg: "text-xl" }[size];
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2 font-sans tabular-nums", text, className)}>
      {sale ? <span className="sr-only">Sale price</span> : <span className="sr-only">Price</span>}
      <span className="font-semibold text-navy">{formatMoney(price, currency)}</span>
      {sale ? (
        <>
          <span className="sr-only">, previously</span>
          <s className="text-[0.85em] text-slate">{formatMoney(compareAtPrice, currency)}</s>
        </>
      ) : null}
    </p>
  );
}
