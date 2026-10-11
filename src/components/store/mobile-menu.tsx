"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { Wordmark } from "./logo";

type Cat = { slug: string; name: string };

/**
 * Mobile navigation drawer built on the native <dialog> element:
 * focus is trapped, Escape closes it, and focus returns to the trigger.
 */
export function MobileMenu({ women, men, signedIn, isStaff }: { women: Cat[]; men: Cat[]; signedIn: boolean; isStaff: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    ref.current?.close();
  }, [pathname]);

  const link = "flex min-h-11 items-center py-2 text-[0.9375rem] text-charcoal hover:text-blue";
  const heading = "font-display text-2xl text-navy";

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="inline-flex size-11 items-center justify-center rounded-sm text-navy hover:bg-soft/50 lg:hidden"
        aria-haspopup="dialog"
      >
        <Menu className="size-6" strokeWidth={1.5} aria-hidden="true" />
        <span className="sr-only">Open menu</span>
      </button>
      <dialog
        ref={ref}
        aria-label="Menu"
        className="m-0 h-dvh max-h-dvh w-[min(24rem,88vw)] max-w-none overflow-y-auto bg-ivory p-0 text-charcoal backdrop:bg-navy/40 open:animate-[drawer-in_220ms_var(--ease-quiet)]"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="flex items-center justify-between border-b border-mist px-4 py-2">
          <Wordmark width={132} />
          <button type="button" onClick={() => ref.current?.close()} className="inline-flex size-11 items-center justify-center rounded-sm text-navy hover:bg-soft/50">
            <X className="size-6" strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">Close menu</span>
          </button>
        </div>
        <nav aria-label="Mobile" className="space-y-8 px-6 py-8">
          <div className="grid grid-cols-2 gap-4">
            {[
              { title: "Women", href: "/women", cats: women },
              { title: "Men", href: "/men", cats: men },
            ].map((d) => (
              <section key={d.href} aria-labelledby={`m-${d.href}`}>
                <h2 id={`m-${d.href}`} className={heading}>
                  <Link href={d.href} className="hover:text-blue">
                    {d.title}
                  </Link>
                </h2>
                <ul className="mt-2">
                  <li>
                    <Link href={d.href} className={link}>
                      Shop all
                    </Link>
                  </li>
                  {d.cats.map((c) => (
                    <li key={c.slug}>
                      <Link href={`${d.href}/${c.slug}`} className={link}>
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <div className="thread" aria-hidden="true">
            <span />
          </div>
          <ul>
            {[
              ["Collections", "/collections"],
              ["New Arrivals", "/new-arrivals"],
              ["Search", "/search"],
              ["About", "/about"],
              ["Contact", "/contact"],
              ["Size guide", "/size-guide"],
              [signedIn ? "Your account" : "Sign in", signedIn ? "/account" : "/sign-in"],
              ["Track an order", signedIn ? "/account/orders" : "/order-lookup"],
              ...(isStaff ? [["Store admin", "/admin"]] : []),
            ].map(([label, href]) => (
              <li key={href}>
                <Link href={href} className={link}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </dialog>
    </>
  );
}
