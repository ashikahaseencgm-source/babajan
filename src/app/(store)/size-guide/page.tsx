import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Alert } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Size Guide",
  description: "How to measure yourself and choose a size at Babajan Sumangali, for women's and men's styles.",
  alternates: { canonical: "/size-guide" },
};

/*
 * Measuring guidance only. Size charts (body measurements per size) are
 * business data and must be supplied by the owner — product-specific
 * measurements appear on each product page.
 */
export default function SizeGuidePage() {
  return (
    <div className="container-bs py-10 lg:py-14">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Size guide" }]} />
      <h1 className="t-page mt-5">Find your fit</h1>
      <p className="mt-3 max-w-2xl text-slate">
        Measure over light clothing with a soft tape, keeping it snug but not tight. Where a product lists its own measurements, use those — they&rsquo;re specific to that piece.
      </p>
      <Alert tone="info" className="mt-6 max-w-3xl">
        Our full size charts are being finalised. If you&rsquo;re between sizes or unsure,{" "}
        <Link href="/contact?topic=sizing" className="link">
          contact our team
        </Link>{" "}
        and we&rsquo;ll help you choose.
      </Alert>
      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <section aria-labelledby="w-measure" className="rounded-xs border border-mist bg-white p-6">
          <h2 id="w-measure" className="t-card">
            Women
          </h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-navy">Bust</dt>
              <dd className="text-charcoal">Around the fullest part of the chest, keeping the tape level.</dd>
            </div>
            <div>
              <dt className="font-semibold text-navy">Waist</dt>
              <dd className="text-charcoal">Around the natural waistline, the narrowest part of the torso.</dd>
            </div>
            <div>
              <dt className="font-semibold text-navy">Hips</dt>
              <dd className="text-charcoal">Around the fullest part of the hips.</dd>
            </div>
            <div>
              <dt className="font-semibold text-navy">Length</dt>
              <dd className="text-charcoal">From the highest point of the shoulder down to where you&rsquo;d like the garment to fall.</dd>
            </div>
          </dl>
        </section>
        <section aria-labelledby="m-measure" className="rounded-xs border border-mist bg-white p-6">
          <h2 id="m-measure" className="t-card">
            Men
          </h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-navy">Chest</dt>
              <dd className="text-charcoal">Around the fullest part of the chest, under the arms. Tailored styles (sherwanis, bandhgalas) are sized by chest in inches.</dd>
            </div>
            <div>
              <dt className="font-semibold text-navy">Shoulder</dt>
              <dd className="text-charcoal">Across the back, from one shoulder point to the other.</dd>
            </div>
            <div>
              <dt className="font-semibold text-navy">Waist</dt>
              <dd className="text-charcoal">Around where you usually wear your trousers.</dd>
            </div>
            <div>
              <dt className="font-semibold text-navy">Sleeve</dt>
              <dd className="text-charcoal">From the shoulder point to the wrist, arm relaxed.</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
