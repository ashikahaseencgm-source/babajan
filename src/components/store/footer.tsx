import Link from "next/link";
import { Wordmark } from "./logo";
import { NewsletterForm } from "./newsletter-form";
import { getSettings } from "@/server/settings";
import { policyNav } from "@/lib/site";

export async function Footer() {
  const { contact } = await getSettings();
  const year = new Date().getFullYear();
  const col = "space-y-1";
  const link = "inline-flex min-h-9 items-center text-sm text-charcoal hover:text-blue";
  const heading = "mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-navy";
  const socials = [
    contact.instagramUrl ? { label: "Instagram", href: contact.instagramUrl } : null,
    contact.facebookUrl ? { label: "Facebook", href: contact.facebookUrl } : null,
  ].filter((s): s is { label: string; href: string } => !!s);

  return (
    <footer className="mt-24 border-t border-mist bg-white">
      <div className="container-bs grid gap-12 py-16 lg:grid-cols-[1.2fr_2fr] lg:gap-20">
        <div className="max-w-sm">
          <Wordmark width={200} className="w-[180px]" />
          <p className="mt-6 font-display text-2xl italic text-navy">Wear Your Story.</p>
          <p className="mt-2 text-sm text-slate">Modern tradition. Personal expression. Considered elegance.</p>
          <div className="mt-8">
            <NewsletterForm />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
          <nav aria-labelledby="f-shop">
            <h2 id="f-shop" className={heading}>
              Shop
            </h2>
            <ul className={col}>
              {[
                ["Women", "/women"],
                ["Men", "/men"],
                ["Collections", "/collections"],
                ["New Arrivals", "/new-arrivals"],
                ["Shop all", "/shop"],
              ].map(([l, h]) => (
                <li key={h}>
                  <Link href={h} className={link}>
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-labelledby="f-help">
            <h2 id="f-help" className={heading}>
              Customer care
            </h2>
            <ul className={col}>
              {[
                ["Contact our team", "/contact"],
                ["Track your order", "/order-lookup"],
                ["Size guide", "/size-guide"],
                ["Shipping", "/policies/shipping"],
                ["Returns & refunds", "/policies/returns"],
              ].map(([l, h]) => (
                <li key={h}>
                  <Link href={h} className={link}>
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className={heading}>Babajan Sumangali</h2>
            <ul className={col}>
              <li>
                <Link href="/about" className={link}>
                  About the brand
                </Link>
              </li>
              {contact.email ? (
                <li>
                  <a href={`mailto:${contact.email}`} className={link}>
                    {contact.email}
                  </a>
                </li>
              ) : null}
              {contact.phone ? (
                <li>
                  <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className={link}>
                    {contact.phone}
                  </a>
                </li>
              ) : null}
              {contact.hours ? <li className="py-1.5 text-sm text-slate">{contact.hours}</li> : null}
              {socials.map((s) => (
                <li key={s.href}>
                  <a href={s.href} className={link} rel="noopener noreferrer" target="_blank">
                    {s.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-mist">
        <div className="container-bs flex flex-col gap-3 py-6 text-[0.8125rem] text-slate md:flex-row md:items-center md:justify-between">
          <p>© {year} Babajan Sumangali. All rights reserved.</p>
          <nav aria-label="Policies">
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {policyNav.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className="inline-flex min-h-9 items-center hover:text-navy">
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
