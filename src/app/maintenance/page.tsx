import type { Metadata } from "next";
import { Wordmark } from "@/components/store/logo";
import { ArchMark } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "We'll Be Back Soon", robots: { index: false, follow: false } };

export default function MaintenancePage() {
  return (
    <main id="main" className="container-bs flex min-h-dvh flex-col items-center justify-center text-center">
      <Wordmark width={220} className="w-[200px]" priority />
      <ArchMark className="mt-12 h-20 w-14 text-gold" />
      <h1 className="t-page mt-8">We&rsquo;ll be back soon</h1>
      <p className="mt-4 max-w-md text-slate">We&rsquo;re making a few improvements to the store. Please check back shortly.</p>
    </main>
  );
}
