/**
 * Public site configuration that is safe for both server and client code.
 * Reads only non-secret environment values.
 */
export function siteUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Only the production environment may be indexed by search engines. */
export function isIndexable(): boolean {
  return process.env.APP_ENV === "production";
}

export const departments = [
  { slug: "women", label: "Women", href: "/women" },
  { slug: "men", label: "Men", href: "/men" },
] as const;

export const primaryNav = [
  { label: "Women", href: "/women" },
  { label: "Men", href: "/men" },
  { label: "Collections", href: "/collections" },
  { label: "New Arrivals", href: "/new-arrivals" },
] as const;

export const secondaryNav = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const policyNav = [
  { label: "Shipping", href: "/policies/shipping" },
  { label: "Returns & refunds", href: "/policies/returns" },
  { label: "Privacy", href: "/policies/privacy" },
  { label: "Terms", href: "/policies/terms" },
  { label: "Cookies", href: "/policies/cookies" },
] as const;
