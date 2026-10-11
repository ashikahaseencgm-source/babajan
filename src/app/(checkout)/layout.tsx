import Link from "next/link";
import { Lock } from "lucide-react";
import { HomeLogoLink } from "@/components/store/logo";
import { PreviewBanner } from "@/components/store/preview-banner";
import { policyNav } from "@/lib/site";

/** Calm, distraction-free shell for checkout and payment. No decorative motion. */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PreviewBanner />
      <header className="border-b border-mist bg-ivory">
        <div className="container-bs grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-[76px]">
          <Link href="/bag" className="inline-flex min-h-11 items-center text-sm text-navy hover:text-blue">
            ← <span className="ml-1.5 hidden sm:inline">Back to bag</span>
            <span className="sr-only sm:hidden">Back to bag</span>
          </Link>
          <HomeLogoLink />
          <p className="flex items-center justify-end gap-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-navy">
            <Lock className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Secure checkout</span>
          </p>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="min-h-[70vh] focus:outline-none">
        {children}
      </main>
      <footer className="mt-16 border-t border-mist">
        <nav aria-label="Policies" className="container-bs flex flex-wrap gap-x-5 gap-y-1 py-6 text-[0.8125rem] text-slate">
          {policyNav.map((p) => (
            <Link key={p.href} href={p.href} className="inline-flex min-h-9 items-center hover:text-navy">
              {p.label}
            </Link>
          ))}
          <Link href="/contact" className="inline-flex min-h-9 items-center hover:text-navy">
            Contact
          </Link>
        </nav>
      </footer>
    </>
  );
}
